/* Luna — arayüz ve her şeyi birbirine bağlayan kod. */

(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const D = () => Store.data;
  const save = () => Store.save();

  let progressDays = 7;
  let focusDismissed = false; // odak ekranından geçici çıkış
  let lastMsgAt = Date.now();
  let wakeLock = null;
  let currentTab = 'home';
  let spotifyLoaded = false;

  // Rozetler: badges.js (her rozetin bir sevgi notu var)
  function checkBadges() {
    if (!window.Badges) return;
    if (Badges.check().length && currentTab === 'progress') renderBadges();
  }

  // ======================================================================
  // Genel yardımcılar
  // ======================================================================
  function toast(icon, title, sub = '', ms = 4200) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span class="e">${icon}</span><div>${U.esc(title)}${sub ? `<small>${U.esc(sub)}</small>` : ''}</div>`;
    $('#toasts').appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, ms);
  }

  function say(kind, opts) {
    const shown = Scene.say(Messages.get(kind), { ...Messages.delivery(kind), ...opts });
    if (shown !== false) lastMsgAt = Date.now();
    return shown !== false;
  }
  function sayLove() {
    const n = Messages.love();
    if (!n) return false;
    const p = D().settings.partner;
    Scene.say(p ? `${n} — ${p}` : n, { love: true });
    lastMsgAt = Date.now();
    return true;
  }

  async function notify(title, body) {
    if (!document.hidden) return;
    await LunaNotify.send(title,body,{tag:'luna-session'});
  }

  async function lockScreen(on) {
    try {
      if (on && 'wakeLock' in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      } else if (!on && wakeLock) {
        await wakeLock.release();
        wakeLock = null;
      }
    } catch (e) { wakeLock = null; }
  }

  const fmtDayMin = (m) => `${U.pad(Math.floor(((m % 1440) + 1440) % 1440 / 60))}:${U.pad(Math.floor(((m % 60) + 60) % 60))}`;

  function subjectOptions(sel) {
    return D().subjects.map((s) => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${U.esc(s.name)}</option>`).join('')
      + `<option value="" ${!sel ? 'selected' : ''}>Genel</option>`;
  }

  function ratingColor(r) {
    if (!r) return 'var(--unrated)';
    const i = U.clamp(Math.round(r), 1, 5);
    return `var(--r${i})`;
  }

  // ======================================================================
  // HUD (saat, tarih, güneş)
  // ======================================================================
  // Saat: her saniye çağrılır ama DOM'a sadece dakika değişince yazar
  let lastClock = '';
  function renderClock() {
    const now = new Date();
    const hm = U.hm(now);
    if (hm === lastClock) return;
    lastClock = hm;
    $('#hud-time').textContent = hm;
    renderHUD();
  }
  function renderHUD() {
    const now = new Date();
    $('#hud-date').textContent = `${now.getDate()} ${U.MONTHS[now.getMonth()]} ${U.DAYS[now.getDay()]}`;
    $('#hud-greet').textContent = Messages.greeting(now);
    const sun = Scene.sunInfo();
    const m = now.getHours() * 60 + now.getMinutes();
    $('#hud-sun').textContent = m >= sun.sunrise && m < sun.sunset
      ? `🌇 Gün batımı ${fmtDayMin(sun.sunset)}`
      : `🌅 Gün doğumu ${fmtDayMin(sun.sunrise)}`;
    // hava durumu görünüyorsa güneş bilgisi açılır pencerede
    $('#hud-sun').classList.toggle('hidden', !!weatherNow && D().settings.weather);
    $('#fish-count').textContent = D().fish;
    const sk = Stats.streak();
    $('#hud-streak').textContent = `🔥 ${sk} gün`;
    $('#hud-streak').classList.toggle('hidden', sk < 1);
    applyTheme();
  }

  // ======================================================================
  // Tema (açık / koyu / gün batımında otomatik)
  // ======================================================================
  function applyTheme() {
    const t = D().settings.theme;
    const dark = t === 'dark' || (t === 'auto' && Scene.sunInfo().elev < -4);
    const v = dark ? 'dark' : 'light';
    if (document.documentElement.dataset.theme === v) return;
    document.documentElement.dataset.theme = v;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#0d1236' : '#f6f1ff';
  }

  // ======================================================================
  // Hava durumu
  // ======================================================================
  let weatherNow = null;
  async function refreshWeather(force) {
    const chip = $('#hud-weather');
    if (!window.Weather || !D().settings.weather) {
      weatherNow = null;
      chip.classList.add('hidden');
      $('#weather-pop').classList.add('hidden');
      Scene.setWeather && Scene.setWeather(null);
      renderHUD();
      return;
    }
    const w = await Weather.load({ force });
    if (!w || !D().settings.weather) return;
    weatherNow = w;
    chip.textContent = `${w.icon} ${w.temp}°`;
    chip.title = `${w.text} · ${D().settings.city || ''}`;
    chip.classList.remove('hidden');
    Scene.setWeather && Scene.setWeather(Weather.sceneParams(w));
    if (!$('#weather-pop').classList.contains('hidden')) renderWeatherPop();
    renderHUD();
    // günde bir kez Luna hava durumunu söyler (odaklanırken değil)
    const today = U.dateKey(new Date());
    if (D().lastWeatherMsg !== today && !w.stale) {
      D().lastWeatherMsg = today;
      save();
      setTimeout(() => {
        const s = Timer.state();
        if (!(s.running && s.phase === 'focus')) { Scene.say(Weather.message(w)); lastMsgAt = Date.now(); }
      }, 9000);
    }
  }
  function renderWeatherPop() {
    const w = weatherNow;
    if (!w) return;
    const sun = Scene.sunInfo();
    const row = (ic, l, v) => `<div class="wp-row"><span>${ic}</span><span>${U.esc(l)}</span><b>${U.esc(v)}</b></div>`;
    const day = (d) => (d ? `${d.icon} ${d.max}° / ${d.min}°${d.rainChance != null ? ` · ☔ %${d.rainChance}` : ''}` : '—');
    $('#weather-pop').innerHTML = `
      ${row(w.icon, `${D().settings.city || 'Şu an'}`, `${w.temp}° · ${w.text}`)}
      ${row('🌡️', 'Hissedilen', `${w.feels}°`)}
      ${row('📅', 'Bugün', day(w.today))}
      ${row('🌙', 'Yarın', day(w.tomorrow))}
      ${row('🌅', 'Gün doğumu / batımı', `${fmtDayMin(sun.sunrise)} · ${fmtDayMin(sun.sunset)}`)}
      ${moonRow(row)}
      <div class="wp-note">${w.stale ? 'Son bilinen hava durumu (çevrimdışı)' : 'Güncellendi ' + U.hm(w.updatedAt)} · Open-Meteo</div>`;
  }
  // gerçek ay: evre, aydınlık oranı ve sıradaki doğuş/batış
  function moonRow(row) {
    if (!Scene.moonInfo) return '';
    const m = Scene.moonInfo();
    const next = m.up ? (m.set ? `batış ${U.hm(m.set)}` : 'gece boyunca gökte') : (m.rise ? `doğuş ${U.hm(m.rise)}` : '');
    return row(m.emoji, `Ay · ${m.name}`, `%${Math.round(m.fraction * 100)}${next ? ' · ' + next : ''}`);
  }
  function bindWeather() {
    const chip = $('#hud-weather'), pop = $('#weather-pop');
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = pop.classList.contains('hidden');
      if (open) renderWeatherPop();
      pop.classList.toggle('hidden', !open);
      chip.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', (e) => {
      if (!pop.classList.contains('hidden') && !pop.contains(e.target)) {
        pop.classList.add('hidden');
        chip.setAttribute('aria-expanded', 'false');
      }
    });
  }


  // ======================================================================
  // Sekmeler
  // ======================================================================
  const programMode = () => !!(window.Uni && window.UniUI) && Uni.isProgramMode();
  // Plan sekmesi: YKS'de konu programı, üniversite / KPSS / yüksek lisansta Dönem ekranı
  function renderPlanTab() {
    if (programMode()) UniUI.render();
    else if (window.PlanUI) PlanUI.render();
    renderTasks(); renderReview();
  }
  // eğitim moduna göre sekmeler (YKS verisi silinmez, yalnızca gizlenir)
  function applyMode() {
    const lvl = D().settings.profile.level || 'yks', prog = programMode();
    document.body.dataset.level = lvl;
    $('#plan-root').classList.toggle('hidden', prog);
    $('#uni-root').classList.toggle('hidden', !prog);
    $('#tabs [data-tab="deneme"]').classList.toggle('hidden', prog);
    $('#tabs [data-tab="plan"] b').textContent = lvl === 'uni' || lvl === 'yl' ? 'Dönem' : 'Plan';
    if (prog && currentTab === 'deneme') showTab('plan');
  }
  // "Anatomi vizesine 3 gün kaldı" / "Anatomi vizesi yarın"
  function examClause(e) {
    const n = Uni.daysLeft(e.date);
    return n >= 2 ? `${Uni.evLeft(e, n)} kaldı` : Uni.evLeft(e, n);
  }

  function showTab(name) {
    currentTab = name;
    $$('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    $$('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + name));
    if (name === 'progress') renderProgress();
    if (name === 'plan') renderPlanTab();
    if (name === 'deneme' && window.DenemeUI) DenemeUI.render();
    if (name === 'notes' && window.NotesUI) NotesUI.render();
    if (name === 'settings') renderSettings();
    if (name === 'home') renderHome();
    try { localStorage.setItem('luna-tab', name); } catch (e) { /* yok say */ }
  }

  // ======================================================================
  // Zamanlayıcı arayüzü
  // ======================================================================
  const PHASE_NAME = { focus: 'ODAK', short: 'KISA MOLA', long: 'UZUN MOLA' };
  // Molada sayacın altında: her molada farklı, küçük bir iyilik
  const BREAK_TIPS = [
    '💧 Bir bardak su iç',
    '👀 20 saniye uzağa bak, gözlerin dinlensin',
    '🧘 Omuzlarını gevşet, boynunu yavaşça çevir',
    '🚶 Kalk, biraz yürü; Luna da esniyor',
    '🌬️ 4 saniye nefes al, 4 saniye ver',
    '🪟 Pencereyi aç, temiz hava al',
    '🍎 Hafif bir atıştırmalık iyi gelir',
  ];

  // ======================================================================
  // Tam odak: izinli uygulamalar (ChatGPT, Gemini, YouTube, Spotify)
  // ======================================================================
  // Web uygulaması hangi uygulamaya geçildiğini göremez: odak ekranındaki düğmeden açılan uygulama
  // doğrudan "izinli" sayılır; başka yoldan geçildiyse dönüşte "Neredeydin?" diye sorulur.
  // (from: "-dan/-den" eki, was: "-daydım/-deydim")
  const AWAY_GRACE = 15000; // kısa bakışlar sayılmaz
  const APPS = {
    chatgpt: { e: '🤖', n: 'ChatGPT', url: 'https://chatgpt.com/', from: "ChatGPT'den", was: "ChatGPT'deydim" },
    gemini: { e: '✨', n: 'Gemini', url: 'https://gemini.google.com/app', from: "Gemini'den", was: "Gemini'deydim" },
    youtube: { e: '▶️', n: 'YouTube', url: 'https://www.youtube.com/', from: "YouTube'dan", was: "YouTube'daydım" },
    spotify: { e: '🎧', n: 'Spotify', url: 'https://open.spotify.com/', from: "Spotify'dan", was: "Spotify'daydım" },
  };
  let allowExit = null; // {app, at}: izinli düğmeye dokunulduğu an
  // uygulamanın kendi yönlendirmeleri (Google Drive, Spotify girişi) de sayacı durdurmaz
  const EXITS = { miniTimer: { e: '🐾', n: 'Mini sayaç', from: 'Mini sayaçtan' }, google: { e: '☁️', n: 'Google', from: "Google'dan" }, spotifyLogin: { e: '🎧', n: 'Spotify', from: "Spotify'dan" }, guncelleme: { e: '✨', n: 'Güncelleme', from: 'Güncellemeden' } };
  const exitInfo = (k) => APPS[k] || EXITS[k] || { e: '🐾', n: 'Uygulama', from: 'Geri' };
  const allowedApps = () => (D().settings.allowedApps || []).filter((k) => APPS[k]);
  function appWebUrl(k) {
    if (!APPS[k]) return '';
    if (k === 'spotify') { const p = spotifyParts(D().settings.spotify); if (p) return `https://open.spotify.com/${p.type}/${p.id}`; }
    return APPS[k].url;
  }
  function appUrl(k) {
    const web = appWebUrl(k);
    if (!web) return '';
    // Android Chrome: hedef uygulama bu bağlantıyı destekliyorsa aç; yoksa güvenli web adresi.
    // iOS/iPadOS: HTTPS Universal Link kararı işletim sistemine aittir.
    const packages = { chatgpt: 'com.openai.chatgpt', gemini: 'com.google.android.apps.bard',
      youtube: 'com.google.android.youtube', spotify: 'com.spotify.music' };
    if (/Android/i.test(navigator.userAgent) && /Chrome\//i.test(navigator.userAgent)) {
      return 'intent://' + web.slice('https://'.length) + '#Intent;scheme=https;package=' +
        packages[k] + ';S.browser_fallback_url=' + encodeURIComponent(web) + ';end';
    }
    return web;
  }
  function renderAllowApps() {
    const list = allowedApps();
    $('#allow-apps').innerHTML = list.length ? `<span class="allow-lbl">Sayaç durmadan aç:</span>${list.map((k) => `<a class="allow-app" href="${appUrl(k)}" target="_blank" rel="noopener" data-app="${k}">${APPS[k].e} ${APPS[k].n}</a>`).join('')}` : '';
    $('#allow-chips').innerHTML = Object.keys(APPS).map((k) => `<button class="chip ${list.includes(k) ? 'active' : ''}" type="button" data-app="${k}" aria-pressed="${list.includes(k)}">${APPS[k].e} ${APPS[k].n}</button>`).join('');
    $('#allow-set').classList.toggle('hidden', !D().settings.pauseOnLeave);
  }
  // uygulama dışındaki süreyi değerlendir: tam odakta izinsiz çıkış 15 sn'yi geçtiyse sayaç o anda durur
  function checkLunaAway() {
    const away = D().timer && D().timer.away;
    const nudge = Messages.departure(away);
    if (away && away.lunaCounted) save();
    if (nudge) notify('Luna dersine çağırıyor 🐾', Messages.get('focusNudge'));
  }

  function checkAway() {
    checkLunaAway();
    const x = D().timer, a = x && x.away;
    if (!a || a.app || a.paused || !D().settings.pauseOnLeave) return false;
    const s = Timer.state();
    if (!(s.running && s.phase === 'focus') || Date.now() - a.at <= AWAY_GRACE) return false;
    if (!Timer.pauseAt(a.at + AWAY_GRACE)) return false;
    a.paused = true;
    save();
    return true;
  }
  // geri dönüş: duruma göre tek bir nazik cümle; izinli uygulama varsa "Neredeydin?" diye sorar.
  // Bir şey söylediyse true döner (açılış selamı bunun üstüne konuşmasın).
  function welcomeBack() {
    const x = D().timer, a = x && x.away;
    if (!a) return false;
    checkAway();
    delete x.away;
    save();
    const m = Math.round((Date.now() - a.at) / 60000);
    if (a.paused && allowedApps().length) { askWhere(m, !!a.lunaNudge); return true; }
    let text = '';
    if (a.paused) text = `Hoş geldin! Uygulamadan çıkınca sayaç durdu ⏸ Hazır olduğunda "Devam"a bas, kaldığımız yerden sürdürelim 🐾`;
    else if (a.app && m >= 1) text = `${exitInfo(a.app).from} hoş geldin ${exitInfo(a.app).e} Sayaç hiç durmadı; ${m} dakika geçti, devam ediyoruz.`;
    else if (!a.app && m >= 1 && !D().settings.pauseOnLeave) text = `Hoş geldin! ${m} dakika uzaktaydın, şimdi kaldığımız yerden devam 🐾`;
    if (a.lunaNudge && !a.app) text = Messages.get('focusNudge') + (a.paused ? ' Sayaç durdu; hazır olduğunda Devam’a bas.' : '');
    if (text) { Scene.say(text, { emotion: a.lunaNudge ? 'angry' : 'neutral' }); lastMsgAt = Date.now(); }
    return !!text;
  }
  // tam odakta dışarıda kalınca sayaç durdu: izinli bir uygulamadaysa o süre de çalışmaya sayılır
  function askWhere(m, nudge = false) {
    const list = allowedApps();
    const ask = () => openModal(`<h3>🐾 Neredeydin?</h3>
      <p class="muted">${m >= 1 ? `${m} dakika` : 'Bir süre'} uygulamanın dışındaydın, sayaç durdu. İzinli uygulamalardan birinde çalıştıysan söyle; o süre de çalışmana sayılsın, sayaç hiç durmamış gibi devam etsin.</p>
      <div class="where-apps">${list.map((k) => `<button class="btn soft" type="button" data-where="${k}">${APPS[k].e} ${APPS[k].was}</button>`).join('')}</div>
      <div class="modal-actions"><button class="btn soft" type="button" data-where="">Başka bir yerdeydim</button></div>`, (card) => {
      card.addEventListener('click', (e) => {
        const b = e.target.closest('[data-where]');
        if (!b) return;
        const k = b.dataset.where;
        closeModal();
        if (k && Timer.resumeFrom(Timer.state().pausedAt)) {
          lockScreen(true);
          Scene.say(`${APPS[k].from} hoş geldin ${APPS[k].e} Sayaç hiç durmamış gibi devam ediyor; o süre de çalışmana sayıldı.`);
        } else {
          Scene.say(nudge ? Messages.get('focusNudge') + ' Hazır olduğunda Devam’a bas 🐾' : 'Sorun değil, hazır olduğunda Devam’a bas, kaldığımız yerden sürdürelim 🐾');
        }
        lastMsgAt = Date.now();
      });
    });
    if ($('#modal').classList.contains('hidden')) ask();
    else pendingWhere = ask; // başka bir pencere açıksa o kapanınca sorulur
  }

  let timerKey = '';
  function renderTimer(s) {
    // sayaç saniyede 4 kez sorar; ekran yalnızca görünen bir şey değişince güncellenir
    const key = [Math.floor(s.countdown ? s.remaining : s.elapsed), s.running, s.phase, s.kind, s.fresh, s.cycle, s.subjectId, s.intent, focusDismissed, D().settings.focusMode, D().settings.pauseOnLeave, (D().settings.allowedApps || []).length, D().settings.longEvery].join('|');
    if (key === timerKey) return;
    timerKey = key;
    $$('#kind-seg button').forEach((b) => b.classList.toggle('active', b.dataset.kind === s.kind));
    const isBreak = s.phase !== 'focus';
    const label = s.kind === 'free' && !isBreak ? 'SERBEST ODAK' : PHASE_NAME[s.phase];
    $('#phase-label').textContent = label;
    $('#phase-label').classList.toggle('break', isBreak);
    const shown = s.countdown ? s.remaining : s.elapsed;
    $('#timer-time').textContent = U.fmtClock(shown);
    const subj = Store.subject(s.subjectId).name;
    $('#timer-sub').textContent = s.running
      ? (isBreak ? BREAK_TIPS[s.cycle % BREAK_TIPS.length] : `${subj} çalışılıyor…`)
      : s.fresh ? (isBreak ? 'Mola hazır' : 'Hazır olduğunda başla ✨') : 'Duraklatıldı';
    const fg = $('#ring-fg');
    fg.style.strokeDashoffset = 553 * (1 - s.progress);
    fg.classList.toggle('break', isBreak);
    // pomodoro noktaları
    const every = D().settings.longEvery;
    const done = s.phase === 'long' ? every : s.cycle % every;
    $('#cycle-dots').innerHTML = s.kind === 'pomodoro' ? Array.from({ length: every }, (_, i) => `<i class="${i < done ? 'on' : ''}"></i>`).join('') : '';
    $('#btn-toggle').textContent = s.running ? 'Duraklat' : s.fresh ? (isBreak ? 'Molayı başlat' : 'Başla') : 'Devam';
    $('#btn-finish').title = isBreak ? 'Molayı bitir' : 'Bitir ve kaydet';
    $('#btn-finish').disabled = s.fresh && !isBreak;
    $('#btn-finish').style.opacity = s.fresh && !isBreak ? 0.4 : 1;
    if ($('#subject-select').value !== s.subjectId) $('#subject-select').value = s.subjectId;
    // sade odak ekranı
    const focusing = s.running && !isBreak && D().settings.focusMode && !focusDismissed;
    if (focusing !== document.body.classList.contains('focusing')) {
      document.body.classList.toggle('focusing', focusing);
      if (focusing) window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    $('#focus-intent').textContent = !isBreak && s.intent ? '🎯 ' + s.intent : '';
    const showApps = s.running && !isBreak && D().settings.pauseOnLeave && allowedApps().length > 0;
    if (showApps !== !$('#allow-apps').classList.contains('hidden')) $('#allow-apps').classList.toggle('hidden', !showApps);
    const ii = $('#intent-input');
    if (document.activeElement !== ii && ii.value !== (s.intent || '')) ii.value = s.intent || '';
    // mini sayaç ve sekme başlığı
    const mini = $('#mini-timer');
    if (!s.fresh) {
      mini.classList.remove('hidden');
      mini.textContent = `${isBreak ? '☕' : '📖'} ${U.fmtClock(shown)}${s.running ? '' : ' ⏸'}`;
      document.title = `${U.fmtClock(shown)} · ${isBreak ? 'Mola' : subj} — Luna`;
    } else {
      mini.classList.add('hidden');
      document.title = 'Luna';
    }
  }

  function syncSceneMode() {
    const s = Timer.state();
    Scene.setMode(s.running ? (s.phase === 'focus' ? 'focus' : 'break') : 'idle');
    // ders kutucuklarındaki "şu an" işareti
    const live = s.running && s.phase === 'focus' ? s.subjectId : null;
    $$('#subject-tiles .subj-tile').forEach((t) => {
      t.classList.toggle('active', t.dataset.id === live);
      t.querySelector('.st-play').textContent = t.dataset.id === live ? '●' : '▶';
    });
  }

  const timerHandlers = {
    onTick: renderTimer,
    onStart(phase, resumed) {
      if (!resumed) focusDismissed = false;
      syncSceneMode();
      if (phase === 'focus') {
        lockScreen(true);
        if (!resumed) { say('start'); Sound.soft(); }
      } else if (!resumed) say('breakStart');
    },
    onPause() { syncSceneMode(); lockScreen(false); },
    onReset() { syncSceneMode(); lockScreen(false); },
    onTooShort() { toast('⏱️', '1 dakikadan kısa oturumlar kaydedilmez'); },
    beforeFinish: () => checkAway(),
    onFocusDone(session) {
      lockScreen(false);
      Sound.chime();
      session.id = U.uid();
      session.note = session.intent || ''; session.hard = ''; session.rating = null; session.mood = '';
      D().sessions.push(session);
      if (session.minutes >= 10) D().fish++;
      save();
      if (window.PlanUI) PlanUI.onSession(session);
      if (window.UniUI) UniUI.onSession(session);
      notify('Oturum tamamlandı! 🎉', `${U.fmtMin(session.minutes)} ${Store.subject(session.subjectId).name} çalıştın. Mola zamanı!`);
      say('done');
      // başka bir pencere açıksa (yarım not, kart, deneme…) üstüne yazma: kapanınca göster
      if ($('#modal').classList.contains('hidden')) openSessionModal(session, { justDone: true });
      else { pendingDone = session; toast('🎉', 'Oturum kaydedildi', U.fmtMin(session.minutes)); }
      afterDataChange();
      syncSceneMode();
    },
    onBreakStart(running) {
      syncSceneMode();
      if (running) setTimeout(() => say('breakStart'), 7000);
    },
    onBreakDone(running) {
      Sound.chime();
      notify('Mola bitti 🐾', 'Hazırsan yeni bir odak oturumuna başlayalım!');
      say('breakEnd');
      syncSceneMode();
      if (running) lockScreen(true);
    },
  };

  function bindTimer() {
    $('#btn-toggle').addEventListener('click', () => Timer.toggle());
    $('#btn-finish').addEventListener('click', () => Timer.finish());
    $('#btn-reset').addEventListener('click', () => {
      const s = Timer.state();
      if (s.fresh) return;
      if (s.phase === 'focus' && s.elapsed > 120 && !confirm('Bu oturum kaydedilmeden sıfırlansın mı?')) return;
      Timer.reset();
    });
    $$('#kind-seg button').forEach((b) => b.addEventListener('click', () => {
      const s = Timer.state();
      if (s.kind === b.dataset.kind) return;
      if (!s.fresh && !confirm('Mevcut sayaç sıfırlanacak. Devam edilsin mi?')) return;
      Timer.setKind(b.dataset.kind);
      syncSceneMode();
    }));
    $('#subject-select').addEventListener('change', (e) => Timer.setSubject(e.target.value));
    $('#intent-input').addEventListener('input', (e) => Timer.setIntent(e.target.value));
    $('#intent-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); if (!Timer.state().running) Timer.toggle(); } });
    // "Aklına başka bir şey mi geldi?" → görevlere ekle, odağı bozma
    $('#park-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const inp = $('#park-input');
      const text = inp.value.trim();
      if (!text) return;
      D().tasks.push({ id: U.uid(), text: '💭 ' + text, subjectId: '', due: '', done: false, created: Date.now() });
      save();
      inp.value = '';
      inp.placeholder = '✓ Eklendi, derse dön 🐾';
      setTimeout(() => { inp.placeholder = '💭 Aklına gelen?'; }, 3500);
      renderHome();
    });
    $('#focus-exit').addEventListener('click', () => {
      focusDismissed = true;
      renderTimer(Timer.state());
    });
    // sahnedeki mini sayaç: dokununca sayaca (odaktaysa sade odak ekranına) geri dön
    const backToTimer = () => {
      focusDismissed = false;
      showTab('home');
      renderTimer(Timer.state());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    $('#mini-timer').addEventListener('click', backToTimer);
    $('#mini-timer').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); backToTimer(); } });
    $('#add-subject-quick').addEventListener('click', () => {
      const name = prompt('Yeni ders adı:');
      if (!name || !name.trim()) return;
      const colors = ['#f7c948', '#7ad3ff', '#b48bff', '#7ee0a1', '#ff9eb5', '#ffab6b', '#6fe3d6'];
      const s = { id: U.uid(), name: name.trim().slice(0, 30), color: colors[D().subjects.length % colors.length] };
      D().subjects.push(s);
      save();
      renderSubjectSelects();
      Timer.setSubject(s.id);
      $('#subject-select').value = s.id;
    });
    // klavye: boşluk = başlat/duraklat
    document.addEventListener('keydown', (e) => {
      if (e.code !== 'Space' || currentTab !== 'home' || !$('#modal').classList.contains('hidden')) return;
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(document.activeElement.tagName)) return;
      e.preventDefault();
      Timer.toggle();
    });
  }

  function renderSubjectSelects() {
    const cur = (D().timer && D().timer.subjectId) || '';
    $('#subject-select').innerHTML = subjectOptions(cur);
    $('#task-subject').innerHTML = subjectOptions('');
  }

  // ======================================================================
  // Oturum penceresi (bitince not + verim, ya da elle ekleme / düzenleme)
  // ======================================================================
  function openSessionModal(session, opts = {}) {
    const manual = !session;
    const now = new Date();
    const s = session || { start: now.getTime() - 3600000, minutes: 60, subjectId: Timer.state().subjectId, note: '', hard: '', rating: null, mood: '' };
    const startD = new Date(s.start);
    const title = opts.justDone ? '🎉 Oturum tamamlandı!' : manual ? '✍️ Çalışmamı ekle' : '✏️ Oturumu düzenle';
    const sub = opts.justDone
      ? `${U.fmtMin(s.minutes)} çalıştın, harikasın ${U.esc(D().settings.name)}! ${s.minutes >= 10 ? 'Luna sana bir balık verdi 🐟' : ''}`
      : manual ? 'Uygulama dışında çalıştıysan buraya ekleyebilirsin.' : `${startD.toLocaleDateString('tr-TR')} ${U.hm(startD)}`;
    let rating = s.rating || 0, mood = s.mood || '';

    // temiz kutu: önceki pencerelerin dinleyicileri bu pencereye taşınmasın
    const oldCard = $('#modal-card');
    oldCard.replaceWith(oldCard.cloneNode(false));
    $('#modal-card').innerHTML = `
      <h3>${title}</h3>
      <p class="sub">${sub}</p>
      <label>Ders</label>
      <select id="m-subject">${subjectOptions(s.subjectId)}</select>
      ${manual || !opts.justDone ? `
        <div class="two">
          <div><label>Tarih</label><input type="date" id="m-date" value="${U.dateKey(startD)}"></div>
          <div><label>Başlangıç</label><input type="time" id="m-time" value="${U.hm(startD)}"></div>
        </div>` : ''}
      <label>Süre (dakika)</label>
      <input type="number" id="m-min" min="1" max="720" value="${s.minutes}">
      <label>Neler çalıştın? Önemli noktalar</label>
      <textarea id="m-note" rows="3" placeholder="Örn: Türev kuralları, zincir kuralı, 30 soru çözdüm">${U.esc(s.note)}</textarea>
      <label for="m-q">Kaç soru çözdün? <span class="muted small">(isteğe bağlı)</span></label>
      <div class="q-step"><button type="button" class="btn soft" data-q="-5" aria-label="5 azalt">−5</button><input type="number" id="m-q" min="0" max="999" inputmode="numeric" placeholder="0" value="${s.questions || ''}"><button type="button" class="btn soft" data-q="5" aria-label="5 artır">+5</button><button type="button" class="btn soft" data-q="10" aria-label="10 artır">+10</button></div>
      <label>Zorlandığın / tekrar etmen gereken yer <span class="muted small">(tekrar listesine eklenir)</span></label>
      <input id="m-hard" placeholder="Örn: Trigonometrik türevler" value="${U.esc(s.hard)}">
      <label>Verimin nasıldı?</label>
      <div class="stars" id="m-stars">${[1, 2, 3, 4, 5].map((i) => `<button type="button" data-v="${i}">⭐</button>`).join('')}</div>
      <label>Nasıl hissediyorsun?</label>
      <div class="moods" id="m-moods">${['🤩', '🙂', '😐', '😴', '😣'].map((m) => `<button type="button" data-v="${m}">${m}</button>`).join('')}</div>
      <div class="modal-actions">
        ${!manual && !opts.justDone ? '<button class="btn danger" id="m-del">Sil</button><span style="flex:1"></span>' : ''}
        <button class="btn soft" id="m-cancel">${opts.justDone ? 'Sonra' : 'Vazgeç'}</button>
        <button class="btn primary" id="m-save">Kaydet</button>
      </div>`;
    modalDirty = false;
    $('#modal-card').addEventListener('input', () => { modalDirty = true; });
    const paint = () => {
      $$('#m-stars button').forEach((b) => b.classList.toggle('on', +b.dataset.v <= rating));
      $$('#m-moods button').forEach((b) => b.classList.toggle('on', b.dataset.v === mood));
    };
    paint();
    $$('#m-stars button').forEach((b) => b.addEventListener('click', () => { rating = +b.dataset.v; paint(); }));
    $$('#m-moods button').forEach((b) => b.addEventListener('click', () => { mood = mood === b.dataset.v ? '' : b.dataset.v; paint(); }));
    $$('.q-step [data-q]').forEach((b) => b.addEventListener('click', () => {
      const q = $('#m-q');
      q.value = U.clamp((parseInt(q.value, 10) || 0) + +b.dataset.q, 0, 999) || '';
      modalDirty = true;
    }));
    $('#m-cancel').addEventListener('click', closeModal);
    $('#m-del') && $('#m-del').addEventListener('click', () => {
      if (!confirm('Bu oturum silinsin mi?')) return;
      D().sessions = D().sessions.filter((x) => x.id !== s.id);
      save(); closeModal(); afterDataChange();
    });
    $('#m-save').addEventListener('click', () => {
      const minutes = U.clamp(parseInt($('#m-min').value, 10) || s.minutes, 1, 720);
      let start = s.start;
      if ($('#m-date')) {
        const [y, mo, d] = $('#m-date').value.split('-').map(Number);
        const [hh, mm] = ($('#m-time').value || '00:00').split(':').map(Number);
        if (y) start = new Date(y, mo - 1, d, hh, mm).getTime();
      }
      const hardBefore = s.hard;
      const target = manual ? { id: U.uid(), kind: 'manual' } : D().sessions.find((x) => x.id === s.id) || s;
      Object.assign(target, {
        subjectId: $('#m-subject').value,
        start,
        end: opts.justDone ? s.end : start + minutes * 60000,
        minutes,
        note: $('#m-note').value.trim(),
        hard: $('#m-hard').value.trim(),
        rating: rating || null,
        mood,
        questions: U.clamp(parseInt($('#m-q').value, 10) || 0, 0, 999),
      });
      if (manual) D().sessions.push(target);
      D().sessions.sort((a, b) => a.start - b.start);
      if (target.hard && target.hard !== hardBefore) {
        D().review.unshift({ id: U.uid(), text: target.hard, subjectId: target.subjectId, created: Date.now(), done: false });
      }
      save();
      closeModal();
      if (opts.justDone && rating) {
        if (rating >= 4) Scene.say(rating === 5 ? 'Beş yıldız! Muhteşemsin ✨' : 'Çok verimli bir oturumdu, bravo! ⭐');
        else if (rating <= 2) Scene.say('Bazı oturumlar zor geçer, sorun değil. Kısa bir mola ver, sonra daha iyi olacak 💛');
      } else if (manual) toast('📝', 'Çalışman eklendi', `${U.fmtMin(minutes)} · ${Store.subject(target.subjectId).name}`);
      afterDataChange();
    });
    $('#modal').classList.remove('hidden');
  }

  let pendingDone = null; // açık bir pencere yüzünden bekleyen "oturum tamamlandı" penceresi
  let pendingWhere = null; // bekleyen "Neredeydin?" sorusu
  function closeModal() {
    $('#modal').classList.add('hidden'); $('#modal-card').innerHTML = '';
    if (pendingWhere) { const f = pendingWhere; pendingWhere = null; setTimeout(() => { if ($('#modal').classList.contains('hidden')) f(); else pendingWhere = f; }, 300); return; }
    if (pendingDone) {
      const s = pendingDone;
      pendingDone = null;
      setTimeout(() => { if ($('#modal').classList.contains('hidden')) openSessionModal(s, { justDone: true }); else pendingDone = s; }, 300);
    }
  }
  // Plan'daki "Başla ▶": dersi ve hedefi seçip sayacı başlatır
  function startStudy({ subjectId, intent, kind } = {}) {
    const s = Timer.state();
    if (s.running && s.phase === 'focus') { toast('⏱️', 'Zaten bir oturum sürüyor', 'Önce onu bitir ya da duraklat'); return false; }
    if (!s.fresh || s.phase !== 'focus') {
      if (s.phase === 'focus' && s.elapsed > 120 && !confirm('Duraklatılmış oturum kaydedilmeden sıfırlansın mı?')) return false;
      Timer.reset();
    }
    if (kind && kind !== Timer.state().kind) Timer.setKind(kind);
    if (subjectId != null && (subjectId === '' || D().subjects.some((x) => x.id === subjectId))) Timer.setSubject(subjectId);
    if (intent) Timer.setIntent(intent);
    showTab('home');
    Timer.toggle();
    return true;
  }
  // YKS dersi (örn. 'ayt_kim') → sayaçtaki ders
  function subjectFor(yksKey) {
    const list = D().subjects;
    const hit = list.find((x) => Array.isArray(x.yks) && x.yks.includes(yksKey));
    if (hit) return hit.id;
    const name = window.YKS && YKS.SUBJECTS[yksKey] ? YKS.SUBJECTS[yksKey].short.toLocaleLowerCase('tr-TR') : '';
    const byName = name && list.find((x) => x.name.toLocaleLowerCase('tr-TR') === name);
    return byName ? byName.id : '';
  }
  // Alan seçilince sayaçtaki dersleri YKS derslerine göre düzenler (veri kaybetmeden)
  function applyFieldSubjects(field) {
    if (!window.YKS) return;
    const target = YKS.studySubjects(field);
    const used = new Set([...D().sessions, ...D().tasks, ...D().notes, ...D().cards, ...D().review].map((x) => x.subjectId));
    // dokunulmamış varsayılan dersleri (s1..s5) kullanılmıyorsa kaldır
    let list = D().subjects.filter((x) => !(/^s[1-5]$/.test(x.id) && !used.has(x.id)));
    const lower = (t) => t.toLocaleLowerCase('tr-TR');
    for (const t of target) {
      const same = list.find((x) => x.id === t.id || lower(x.name) === lower(t.name));
      if (same) same.yks = t.yks.slice();
      else list.push({ id: t.id, name: t.name, color: t.color, yks: t.yks.slice() });
    }
    D().subjects = list;
    if (!list.some((x) => x.id === Timer.state().subjectId)) Timer.setSubject(list[0] ? list[0].id : '');
    save();
    renderSubjectSelects();
    if (currentTab === 'settings') renderSubjectEdit();
  }
  // Son 30 günde en verimli saatler (plan önerileri için), en iyiden kötüye
  function bestHours() {
    return Stats.byHour(Stats.inRange(30))
      .filter((h) => h.rating && h.count >= 2 && h.minutes >= 30)
      .sort((a, b) => b.rating - a.rating)
      .map((h) => h.hour);
  }

  // Modüller (Plan, Deneme) için genel pencere
  function openModal(html, mount) {
    // her açılışta yeni bir kutu: önceki pencerenin dinleyicileri taşınmasın
    const old = $('#modal-card');
    const card = old.cloneNode(false);
    card.innerHTML = html;
    old.replaceWith(card);
    modalDirty = false;
    card.addEventListener('input', () => { modalDirty = true; }); // yazılan bir şey var: yanlışlıkla kapanmasın
    $('#modal').classList.remove('hidden');
    if (mount) mount(card);
    return card;
  }
  let modalDirty = false;
  // boşluğa dokunma / Esc: yazılanlar kaydedilmediyse önce sor ("Vazgeç" ve "Kaydet" doğrudan kapatır)
  function dismissModal() {
    if ($('#modal').classList.contains('hidden')) return;
    if (modalDirty && !confirm('Yazdıkların kaydedilmedi. Pencere kapatılsın mı?')) return;
    closeModal();
  }

  // ======================================================================
  // Veri değişince
  // ======================================================================
  function checkGoal() {
    const today = U.dateKey(new Date());
    if (D().lastGoalDay === today) return;
    if (Stats.minutesOn(new Date()) >= D().settings.dailyGoal) {
      D().lastGoalDay = today;
      save();
      setTimeout(() => {
        say('goal', { ms: 8000 });
        Scene.celebrate();
        Sound.chime();
        toast('💌', 'Günün gizli notu açıldı!', 'Çalış sekmesinde seni bekliyor');
      }, 2500);
    }
  }

  function afterDataChange() {
    checkGoal();
    checkBadges();
    repaint();
  }
  function repaint() {
    renderHUD();
    renderHome();
    if (currentTab === 'progress') renderProgress();
    if (currentTab === 'plan') renderPlanTab();
    if (currentTab === 'deneme' && window.DenemeUI) DenemeUI.render();
    if (currentTab === 'notes' && window.NotesUI) NotesUI.render();
  }

  // ======================================================================
  // Ana sayfa
  // ======================================================================
  function sessionItem(s, withDate) {
    const sub = Store.subject(s.subjectId);
    const st = new Date(s.start), en = new Date(s.end || s.start + s.minutes * 60000);
    return `<li data-id="${s.id}" style="cursor:pointer">
      <span class="dot" style="background:${sub.color}"></span>
      <div>
        <div><b>${U.esc(sub.name)}</b> <span class="meta">${withDate ? `${st.getDate()} ${U.MONTHS[st.getMonth()].slice(0, 3)} · ` : ''}${U.hm(st)}–${U.hm(en)}</span></div>
        ${s.note ? `<div class="note">${U.esc(s.note)}</div>` : ''}
        ${s.hard ? `<div class="note hard">⚠️ ${U.esc(s.hard)}</div>` : ''}
      </div>
      <div class="right">${U.fmtMin(s.minutes)}<div class="meta">${+s.questions ? `${+s.questions} soru · ` : ''}${s.rating ? '⭐'.repeat(Math.min(5, +s.rating || 0)) : ''} ${U.esc(s.mood || '')}</div></div>
    </li>`;
  }

  function loveNoteOfDay() {
    const notes = D().loveNotes.filter((x) => x.trim());
    if (!notes.length) return null;
    const dayNum = Math.floor(U.dayStart(new Date()).getTime() / 864e5);
    return notes[dayNum % notes.length];
  }

  function renderHome() {
    const goal = D().settings.dailyGoal;
    const mins = Stats.minutesOn(new Date());
    const pct = Math.min(100, Math.floor((mins / goal) * 100)); // %100 ancak hedef gerçekten dolunca
    $('#goal-ring').style.setProperty('--p', pct);
    $('#goal-ring').classList.toggle('done', pct >= 100);
    $('#goal-pct').textContent = pct >= 100 ? '★' : pct + '%';
    $('#today-min').textContent = U.fmtMin(mins);
    $('#goal-text').textContent = pct >= 100 ? `Hedef (${U.fmtMin(goal)}) tamam! 🎉` : `Hedefe ${U.fmtMin(goal - mins)} kaldı`;
    const todayKey = U.dateKey(new Date());
    const today = D().sessions.filter((s) => U.dateKey(s.start) === todayKey).sort((a, b) => b.start - a.start);
    const qToday = today.reduce((n, s) => n + (+s.questions || 0), 0);
    $('#today-sessions-count').textContent = today.length ? `${today.length} oturum${qToday ? ` · ${qToday} soru ✍️` : ''}` : '';
    $('#today-sessions-label').textContent = today.length ? `Bugünün oturumları (${today.length})` : 'Bugünün oturumları';
    $('#today-list').innerHTML = today.length ? today.map((s) => sessionItem(s)).join('') : '<li class="empty" style="display:block">Bugün henüz oturum yok. Luna seni bekliyor 🐾</li>';
    $('#day-timeline').innerHTML = timelineHtml(new Date(), true);
    renderSubjectTiles(today);

    // Gizli not
    const note = loveNoteOfDay();
    const partner = D().settings.partner;
    const from = partner ? `${U.esc(partner)} sana` : 'Sevgilin sana';
    if (!note) {
      $('#love-card').innerHTML = `<h2>💌 Günün notu</h2><p class="muted">Ayarlar → Sevgilinden notlar kısmına not eklenince burada görünecek.</p>`;
    } else if (pct >= 100) {
      $('#love-card').innerHTML = `<h2>💌 Günün notu${partner ? ' · ' + U.esc(partner) : ''}</h2><div class="note-box">${U.esc(note)}</div>
        <button class="btn soft small-btn" id="love-more">Bir not daha 💗</button>`;
      $('#love-more').addEventListener('click', sayLove);
    } else {
      $('#love-card').innerHTML = `<h2>💌 Günün gizli notu</h2>
        <div class="lock"><span>🔒</span><div><b>${from} bir not bıraktı!</b><div class="muted small">Günlük hedefine ulaşınca açılacak.</div></div></div>
        <div class="progress"><i style="width:${pct}%"></i></div>`;
    }

    renderWelcome(mins, pct);
    const tp = $('#today-plan');
    if (programMode()) { tp.classList.remove('hidden'); UniUI.renderToday(tp); }
    else if (window.PlanUI) { tp.classList.remove('hidden'); PlanUI.renderToday(tp); } else tp.classList.add('hidden');
  }

  // 24 saatlik zaman çizelgesi (YPT tarzı): oturumlar gerçek saatlerinde renkli bloklar
  function timelineHtml(date, withNow) {
    const start = U.dayStart(date).getTime(), span = 864e5, end = start + span;
    let blocks = '';
    for (const s of D().sessions) {
      const e = s.end || s.start + s.minutes * 60000;
      if (e <= start || s.start >= end) continue;
      const a = Math.max(s.start, start), b = Math.min(e, end);
      const sub = Store.subject(s.subjectId);
      blocks += `<i style="left:${((a - start) / span) * 100}%;width:${Math.max(0.5, ((b - a) / span) * 100)}%;background:${sub.color}" title="${U.esc(sub.name)} · ${U.hm(a)}–${U.hm(b)}"></i>`;
    }
    const now = Date.now();
    const marker = withNow && now >= start && now < end ? `<b class="tl-now" style="left:${((now - start) / span) * 100}%"></b>` : '';
    return `<div class="tl-track">${blocks}${marker}</div><div class="tl-ticks"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>`;
  }
  function renderSubjectTiles(today) {
    const per = {};
    for (const s of today) per[s.subjectId] = (per[s.subjectId] || 0) + s.minutes;
    const st = Timer.state();
    const live = st.running && st.phase === 'focus' ? st.subjectId : null;
    if (!D().subjects.length) {
      $('#subject-tiles').innerHTML = `<p class="muted small">Derslerini ${programMode() ? 'Plan sekmesinden' : 'Ayarlar → Dersler bölümünden'} ekleyince burada görünür; dokununca sayaç o dersle başlar.</p>`;
      return;
    }
    $('#subject-tiles').innerHTML = D().subjects.map((x) => `<button class="subj-tile ${live === x.id ? 'active' : ''}" data-id="${x.id}" type="button" style="--c:${x.color}">
      <span class="st-name">${U.esc(x.name)}</span><b class="st-min">${per[x.id] ? U.fmtMin(per[x.id]) : '—'}</b><span class="st-play" aria-hidden="true">${live === x.id ? '●' : '▶'}</span></button>`).join('');
  }

  // Açılışta başarıyı gösteren, hep olumlu karşılama kartı
  function weekMinutes() {
    const today = U.dayStart(new Date());
    const from = U.addDays(today, -((today.getDay() + 6) % 7)).getTime(); // Pazartesi
    let m = 0;
    for (const x of D().sessions) if (x.start >= from) m += x.minutes;
    return m;
  }
  function renderWelcome(todayMin, pct) {
    const chips = [];
    const days = window.YKS ? YKS.daysLeft() : null;
    const yksMode = (D().settings.profile.level || 'yks') === 'yks';
    const prog = programMode();
    if (yksMode && days != null && days >= 0) chips.push(['⏳', days === 0 ? 'Bugün!' : `${days} gün`, "YKS'ye", 'gold', 'plan']);
    // dönem modunda: sıradaki sınav, bugünkü dersler, dönem haftası
    const nextEx = prog ? Uni.upcoming(100000).find((e) => Uni.EXAM.has(e.kind)) || Uni.upcoming(14)[0] : null;
    if (nextEx) {
      const n = Uni.daysLeft(nextEx.date), w = Uni.evName(nextEx);
      chips.push([Uni.EVENT_KINDS[nextEx.kind][0], n === 0 ? 'Bugün!' : n === 1 ? 'Yarın' : `${n} gün`, n <= 1 ? w.nom : w.dat, n <= 7 ? 'gold' : '', 'plan']);
    }
    if (prog) {
      const cls = Uni.classesOn(new Date()).length;
      if (cls) chips.push(['🏫', `${cls} ders`, 'bugün', '', 'plan']);
      const wk = Uni.weekOfTerm();
      if (wk && wk <= (+D().uni.weeks || 14)) chips.push(['📆', `${wk}. hafta`, 'dönem', '']);
      const g = Uni.isSchool() ? Uni.gpa() : null;
      if (g && g.overall != null) chips.push(['🎯', U.dec(g.overall, 2), 'ortalama', '', 'plan']);
    }
    if (todayMin > 0) chips.push(['⏱️', U.fmtMin(todayMin), 'bugün', pct >= 100 ? 'up' : '']);
    const wm = weekMinutes();
    if (wm > 0) chips.push(['📅', U.fmtMin(wm), 'bu hafta', '']);
    const sk = Stats.streak();
    if (sk >= 2) chips.push(['🔥', `${sk} gün`, 'seri', 'up']);
    const done = window.YKS && yksMode ? YKS.doneCount() : 0;
    if (done) chips.push(['✅', String(done), 'konu tamam', '', 'plan']);
    const dueCards = window.NotesUI ? NotesUI.dueCount() : 0;
    if (dueCards) chips.push(['🃏', String(dueCards), 'kart seni bekliyor', '', 'notes:cards']);
    const dueHata = window.HataUI ? HataUI.dueCount() : 0;
    if (dueHata) chips.push(['❌', String(dueHata), 'hata sorusu bugün', '', 'notes:hata']);
    const last = window.Deneme && !prog ? Deneme.lastSummary() : null;
    if (last) chips.push(['📈', `${last.net} net`, `son ${last.type}${last.delta > 0 ? ' · +' + Deneme.fmt(last.delta) : ''}`, last.delta > 0 ? 'up' : '', 'deneme']);
    const msg = pct >= 100 ? 'Bugünkü hedefini tamamladın! Kendinle gurur duy 🎉'
      : sk >= 3 ? `${sk} gündür buradasın, bu istikrar harika 🌟`
      : yksMode && days != null && days >= 0 ? Messages.daily('yks', { days })
      : nextEx && Uni.daysLeft(nextEx.date) <= 7 ? Messages.daily('exam', { what: examClause(nextEx) })
      : prog ? Messages.daily('uni')
      : Messages.daily(Messages.timeOfDay());
    const conv = Messages.companionState(), hNow = new Date().getHours();
    const askFeel = conv.checkedIn && !conv.feeling && hNow >= 5 && hNow < 23;
    $('#welcome').innerHTML = `<div class="welcome-title">${U.esc(Messages.greeting())}</div>
      <div class="welcome-msg">${U.esc(msg)}</div>
      ${askFeel ? `<div class="feel-row" role="group" aria-label="Luna soruyor: bugün nasılsın?"><span class="feel-q">🐾 Luna soruyor: bugün nasılsın?</span><span class="feel-chips"><button type="button" class="chip" data-feel="Good">😊 İyiyim</button><button type="button" class="chip" data-feel="Tired">😴 Yorgunum</button><button type="button" class="chip" data-feel="Hard">😣 Zor bir gün</button></span></div>` : ''}
      ${chips.length ? `<div class="stat-chips">${chips.map(([ic, v, l, cls, tab]) => {
        const inner = `<span class="ic">${ic}</span><b class="v">${U.esc(v)}</b><small class="l">${U.esc(l)}</small>`;
        return tab ? `<button class="stat-chip ${cls}" data-tab="${tab}" type="button">${inner}</button>` : `<div class="stat-chip ${cls}">${inner}</div>`;
      }).join('')}</div>` : ''}`;
  }

  // ======================================================================
  // İstatistik
  // ======================================================================
  // ======================================================================
  // İlerleme: Luna'nın raporu + grafikler
  // ======================================================================
  function renderProgress() {
    renderReport();
    renderCharts();
    renderBadges();
  }

  function renderCharts() {
    const sm = Stats.summary(progressDays);
    // günlük çubuklar
    const n = progressDays === 7 ? 7 : 30;
    const days = Stats.byDay(n);
    const goal = D().settings.dailyGoal;
    const max = Math.max(goal, ...days.map((d) => d.minutes), 1);
    $('#day-bars').innerHTML = days.map((d, i) => {
      const lbl = n === 7 ? U.DAYS_SHORT[d.date.getDay()] : (i % 5 === 0 || i === n - 1 ? d.date.getDate() : '');
      return `<div class="b" title="${d.date.toLocaleDateString('tr-TR')} · ${U.fmtMin(d.minutes)}">
        ${d.minutes && n === 7 ? `<em>${U.fmtMin(d.minutes)}</em>` : ''}
        <i class="${d.minutes >= goal ? 'goal-hit' : ''}" style="height:${(d.minutes / max) * 100}%"></i><span>${lbl}</span></div>`;
    }).join('');

    // saatler
    const hours = Stats.byHour(sm.list);
    const hmax = Math.max(...hours.map((h) => h.minutes), 1);
    $('#hour-chart').innerHTML = hours.map((h) => `<div class="h" title="${U.pad(h.hour)}:00 · ${U.fmtMin(h.minutes)}${h.rating ? ' · ' + U.dec(h.rating) + '⭐' : ''}">
      <i style="height:${(h.minutes / hmax) * 100}%;background:${h.minutes ? ratingColor(h.rating) : '#ffffff10'}"></i>
      <span>${h.hour % 3 === 0 ? h.hour : ''}</span></div>`).join('');

    // dersler
    const subs = Stats.bySubject(sm.list);
    const smax = Math.max(...subs.map((s) => s.minutes), 1);
    $('#subject-bars').innerHTML = subs.length ? subs.map((s) => `<div class="sbar">
      <div class="top"><span>${U.esc(s.subject.name)}</span><span>${U.fmtMin(s.minutes)}${s.rating ? ' · ' + U.dec(s.rating) + '⭐' : ''}</span></div>
      <div class="track"><i style="width:${(s.minutes / smax) * 100}%;background:${s.subject.color}"></i></div></div>`).join('') : '<p class="empty">Henüz veri yok</p>';

    // haftanın günleri (Pzt'den başla)
    const wd = Stats.byWeekday(sm.list);
    const order = [1, 2, 3, 4, 5, 6, 0];
    const wmax = Math.max(...wd.map((w) => w.avg), 1);
    $('#weekday-bars').innerHTML = order.map((i) => {
      const w = wd[i];
      return `<div class="b" title="${U.DAYS[i]} · ortalama ${U.fmtMin(w.avg)}"><i style="height:${(w.avg / wmax) * 100}%;${w.rating ? 'background:' + ratingColor(w.rating) : ''}"></i><span>${U.DAYS_SHORT[i]}</span></div>`;
    }).join('');

    renderCalendar();
    $('#week-timeline').innerHTML = Array.from({ length: 7 }, (_, i) => {
      const d = U.addDays(U.dayStart(new Date()), i - 6);
      return `<div class="wt-row"><span class="wt-day">${U.DAYS_SHORT[d.getDay()]}</span><div class="timeline">${timelineHtml(d, i === 6)}</div></div>`;
    }).join('');

    const hist = sm.list.slice().sort((a, b) => b.start - a.start).slice(0, 200);
    $('#history').innerHTML = hist.length ? hist.map((s) => sessionItem(s, true)).join('') : '<li class="empty" style="display:block">Bu dönemde oturum yok. Oturum sonunda yazdığın notlar burada birikir.</li>';
  }

  function renderCalendar() {
    const goal = D().settings.dailyGoal;
    const map = {};
    for (const s of D().sessions) { const k = U.dateKey(s.start); map[k] = (map[k] || 0) + s.minutes; }
    const today = U.dayStart(new Date());
    const dow = (today.getDay() + 6) % 7; // Pzt = 0
    const start = U.addDays(today, -dow - 15 * 7);
    let html = '';
    for (let i = 0; i < 16 * 7; i++) {
      const d = U.addDays(start, i);
      const k = U.dateKey(d);
      const m = map[k] || 0;
      const r = m / goal;
      const lv = !m ? '' : r < 0.25 ? 'l1' : r < 0.6 ? 'l2' : r < 1 ? 'l3' : 'l4';
      const cls = [lv, k === U.dateKey(today) ? 'today' : '', d > today ? 'future' : ''].join(' ');
      html += `<div class="c ${cls}" title="${d.toLocaleDateString('tr-TR')} · ${U.fmtMin(m)}"></div>`;
    }
    $('#calendar').innerHTML = html;
  }

  function renderReport() {
    const r = Stats.report(progressDays);
    const name = D().settings.name || 'canım';
    const period = progressDays === 7 ? 'bu haftaki' : progressDays === 30 ? 'son 30 günlük' : 'tüm';
    $('#report-intro').textContent = `${name}, ${period} çalışmalarını inceledim. İşte gözlemlerim 🐾`;
    const sk = Stats.streak();
    const tiles = r.highlights.concat(sk ? [{ icon: '🔥', label: 'Seri', value: `${sk} gün` }] : []);
    $('#report-highlights').innerHTML = tiles.map((h) => `<div class="tile"><div class="ic">${h.icon}</div><div class="v">${U.esc(h.value)}</div><div class="l">${U.esc(h.label)}</div></div>`).join('');
    const li = (arr) => arr.map((x) => `<li>${U.esc(x)}</li>`).join('') || '<li class="muted">—</li>';
    $('#rep-strengths').innerHTML = li(r.strengths);
    $('#rep-improve').innerHTML = li(r.improve);
    $('#rep-tips').innerHTML = li(r.tips);
  }

  function renderReview() {
    const list = D().review.slice().sort((a, b) => a.done - b.done || b.created - a.created);
    $('#review-list').innerHTML = list.length ? list.map((r) => {
      const sub = Store.subject(r.subjectId);
      return `<li class="${r.done ? 'done' : ''}" data-id="${r.id}">
        <input type="checkbox" class="check" ${r.done ? 'checked' : ''}>
        <span class="t">${U.esc(r.text)}</span>
        ${r.subjectId ? `<span class="tag" style="background:${sub.color}">${U.esc(sub.name)}</span>` : ''}
        <button class="x" title="Sil">✕</button></li>`;
    }).join('') : '<li class="empty" style="display:block">Tekrar listesi boş ✨</li>';
  }

  function renderBadges() {
    if (window.Badges) Badges.render($('#badges'));
  }


  // ======================================================================
  // Görevler & sınavlar
  // ======================================================================
  function taskSort(a, b) {
    if (a.done !== b.done) return a.done - b.done;
    if (a.due && b.due) return a.due.localeCompare(b.due);
    if (a.due) return -1;
    if (b.due) return 1;
    return b.created - a.created;
  }
  function taskItem(t) {
    const sub = Store.subject(t.subjectId);
    const late = !t.done && t.due && t.due < U.dateKey(new Date());
    const dueTxt = t.due ? (t.due === U.dateKey(new Date()) ? 'Bugün' : new Date(t.due + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })) : '';
    return `<li class="${t.done ? 'done' : ''}" data-id="${t.id}">
      <input type="checkbox" class="check" ${t.done ? 'checked' : ''}>
      <span class="t">${U.esc(t.text)}</span>
      ${t.subjectId ? `<span class="tag" style="background:${sub.color}">${U.esc(sub.name)}</span>` : ''}
      ${dueTxt ? `<span class="due ${late ? 'late' : ''}">${dueTxt}</span>` : ''}
      <button class="x" title="Sil">✕</button></li>`;
  }

  function renderTasks() {
    const list = D().tasks.slice().sort(taskSort);
    $('#task-list').innerHTML = list.length ? list.map(taskItem).join('') : '<li class="empty" style="display:block">Henüz görev yok. Küçük ve net görevler yaz: "10 paragraf sorusu" gibi.</li>';
  }

  function bindTasks() {
    $('#task-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const text = $('#task-input').value.trim();
      if (!text) return;
      D().tasks.push({ id: U.uid(), text, subjectId: $('#task-subject').value, due: $('#task-due').value || '', done: false, created: Date.now() });
      save();
      $('#task-input').value = '';
      renderTasks(); renderHome();
    });
    const onTaskClick = (e) => {
      const li = e.target.closest('li[data-id]');
      if (!li) return;
      const t = D().tasks.find((x) => x.id === li.dataset.id);
      if (!t) return;
      if (e.target.classList.contains('x')) {
        D().tasks = D().tasks.filter((x) => x.id !== t.id);
      } else if (e.target.classList.contains('check')) {
        t.done = e.target.checked;
        t.doneAt = t.done ? Date.now() : null;
        D().tasksDone = Math.max(0, (D().tasksDone || 0) + (t.done ? 1 : -1));
        if (t.done) { Sound.soft(); Scene.say(U.pick(['Bir görev daha bitti! ✅', 'Tik! Harikasın 🐾', 'Listeden bir tane eksildi, süper!'])); }
      } else return;
      save(); renderTasks(); renderHome(); checkBadges();
    };
    $('#task-list').addEventListener('click', onTaskClick);
    $('#clear-done').addEventListener('click', () => {
      D().tasks = D().tasks.filter((t) => !t.done);
      save(); renderTasks(); renderHome();
    });
    // tekrar listesi
    $('#review-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const text = $('#review-input').value.trim();
      if (!text) return;
      D().review.unshift({ id: U.uid(), text, subjectId: '', created: Date.now(), done: false });
      save(); $('#review-input').value = ''; renderReview();
    });
    $('#review-list').addEventListener('click', (e) => {
      const li = e.target.closest('li[data-id]');
      if (!li) return;
      const r = D().review.find((x) => x.id === li.dataset.id);
      if (!r) return;
      if (e.target.classList.contains('x')) D().review = D().review.filter((x) => x.id !== r.id);
      else if (e.target.classList.contains('check')) {
        r.done = e.target.checked;
        D().reviewDone = Math.max(0, (D().reviewDone || 0) + (r.done ? 1 : -1));
        if (r.done) Scene.say('Bir eksik daha kapandı! 📌✨');
      } else return;
      save(); renderReview(); checkBadges();
    });
  }

  // ======================================================================
  // Müzik
  // ======================================================================
  const PRESETS = [
    ['☕ Lofi', 'https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn'],
    ['🎹 Sakin Piyano', 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO'],
    ['🧠 Derin Odak', 'https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ'],
  ];
  // open.spotify.com/(intl-tr/)(embed/)(user/x/)playlist/ID?si=… ve spotify:playlist:ID biçimleri
  function spotifyParts(url) {
    const m = String(url || '').trim().match(/(?:open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(?:user\/[^/]+\/)?|spotify:(?:user:[^:]+:)?)(playlist|album|track|artist|episode|show)[/:]([A-Za-z0-9]{10,40})/i);
    return m ? { type: m[1].toLowerCase(), id: m[2] } : null;
  }
  function spotifyEmbed(url) {
    const p = spotifyParts(url);
    return p ? `https://open.spotify.com/embed/${p.type}/${p.id}?utm_source=generator&theme=0` : null;
  }
  function loadSpotify() {
    const p = spotifyParts(D().settings.spotify);
    const src = spotifyEmbed(D().settings.spotify);
    // "Spotify'da aç": telefonda uygulama yüklüyse doğrudan uygulamada açılır (önizleme yerine tam şarkılar)
    $('#spotify-frame').innerHTML = src
      ? `<a class="btn primary sp-open" href="${U.esc(appUrl('spotify'))}" target="_blank" rel="noopener" data-app="spotify">Spotify'da dinle ↗</a>
        <p class="hint">Liste ayrı açılır; cihazın destekliyorsa yüklü Spotify uygulamasına geçersin.</p>`
      : '<p class="empty">Geçerli bir Spotify bağlantısı yapıştır.</p>';
    $$('#spotify-presets .chip').forEach((c) => c.classList.toggle('active', c.dataset.url === D().settings.spotify));
    const preset = PRESETS.find(([, u]) => u === D().settings.spotify);
    $('#music-now').textContent = src ? (preset ? preset[0] : 'Kendi listen') : '';
    spotifyLoaded = true;
  }
  function renderMusic() {
    if (!$('#spotify-presets').children.length) {
      $('#spotify-presets').innerHTML = PRESETS.map(([n, u]) => `<button class="chip" data-url="${u}">${n}</button>`).join('');
      $('#mixer').innerHTML = [
        ['yagmur', '🌧️', 'Yağmur'], ['dalga', '🌊', 'Dalgalar'], ['somine', '🔥', 'Şömine'],
        ['kutuphane', '📚', 'Kütüphane'], ['kahverengi', '🟤', 'Kahverengi gürültü'], ['beyaz', '⚪', 'Beyaz gürültü'],
      ].map(([k, e, n]) => `<div class="mix"><span class="e">${e}</span><div><div class="n">${n}</div><input type="range" min="0" max="100" value="0" data-kind="${k}" aria-label="${n}"></div></div>`).join('');
    }
    $('#spotify-input').value = D().settings.spotify;
    if (!spotifyLoaded) loadSpotify();
  }
  function bindMusic() {
    $('#spotify-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const v = $('#spotify-input').value.trim();
      if (!spotifyEmbed(v)) {
        if (/spotify\.link|spotify\.app\.link/i.test(v)) toast('🎧', 'Kısa bağlantı açılamıyor', 'Bağlantıyı tarayıcıda açıp adres çubuğundaki open.spotify.com/… adresini yapıştır');
        else toast('🎧', 'Bu bir Spotify bağlantısına benzemiyor', 'open.spotify.com/… ile başlayan bağlantıyı yapıştır');
        return;
      }
      D().settings.spotify = v; save(); loadSpotify();
    });
    $('#spotify-presets').addEventListener('click', (e) => {
      const c = e.target.closest('.chip');
      if (!c) return;
      D().settings.spotify = c.dataset.url; save();
      $('#spotify-input').value = c.dataset.url;
      loadSpotify();
    });
    $('#spotify-frame').addEventListener('click', (e) => {
      const link = e.target.closest('a[data-app="spotify"]');
      if (!link) return;
      link.href = appUrl('spotify');
      allowExit = { app: 'spotify', at: Date.now() }; // Luna'nın kendi müzik düğmesi: Tam odakta sayacı durdurmaz
    });
    // müzik paneli ilk açıldığında yüklenir (sayfa açılışını yavaşlatmasın)
    $('#music-card').addEventListener('toggle', () => { if ($('#music-card').open) renderMusic(); });
    $('#mixer').addEventListener('input', (e) => {
      if (e.target.dataset.kind) Sound.setAmbient(e.target.dataset.kind, e.target.value / 100);
    });
  }

  // ======================================================================
  // Ayarlar
  // ======================================================================
  const CITIES = [
    ['İstanbul', 41.01, 28.97], ['Ankara', 39.93, 32.86], ['İzmir', 38.42, 27.14], ['Bursa', 40.19, 29.06],
    ['Antalya', 36.9, 30.7], ['Eskişehir', 39.78, 30.52], ['Konya', 37.87, 32.48], ['Trabzon', 41.0, 39.72],
  ];

  function renderSettings() {
    const s = D().settings;
    $('#set-name').value = s.name;
    $('#set-partner').value = s.partner;
    renderEdu();
    $('#set-goal').value = s.dailyGoal;
    $('#set-msg').value = s.msgInterval;
    $('#set-focus').value = s.focus;
    $('#set-short').value = s.short;
    $('#set-long').value = s.long;
    $('#set-every').value = s.longEvery;
    $('#set-autobreak').checked = s.autoBreak;
    $('#set-autofocus').checked = s.autoFocus;
    $('#set-sound').checked = s.sound;
    document.querySelectorAll('input[name="mini-theme"]').forEach(el => { el.checked = el.value === (s.miniTheme || 'cream'); });
    $('#set-reminders').checked = !!s.studyReminders;
    $('#set-notify').checked = s.notify && 'Notification' in window && Notification.permission === 'granted';
    $('#set-love').value = D().loveNotes.join('\n');
    $('#set-focusmode').checked = s.focusMode;
    $('#set-quiet').checked = s.quietFocus;
    $('#set-pauseleave').checked = s.pauseOnLeave;
    $('#set-weather').checked = s.weather;
    $$('#theme-seg button').forEach((b) => b.classList.toggle('active', b.dataset.theme === s.theme));
    $('#city-chips').innerHTML = CITIES.map(([n, la, lo]) => `<button class="chip ${Math.abs(la - s.lat) < 0.05 && Math.abs(lo - s.lon) < 0.05 ? 'active' : ''}" data-lat="${la}" data-lon="${lo}" data-name="${n}">${n}</button>`).join('');
    const sun = Scene.sunInfo();
    $('#loc-text').textContent = `Şu an: ${s.lat.toFixed(2)}, ${s.lon.toFixed(2)} · Gün doğumu ${fmtDayMin(sun.sunrise)} · Gün batımı ${fmtDayMin(sun.sunset)}`;
    renderSubjectEdit();
    renderBackupInfo();
    renderAllowApps();
  }

  const LEVEL_HINT = {
    yks: 'Plan sekmesinde YKS konuların, Deneme sekmesinde netlerin. Üniversiteye başlayınca "Üniversite"ye dokun: YKS verilerin silinmez, istediğin an geri dönebilirsin.',
    uni: 'Plan sekmesi artık Dönem: dersler, ders programı, sınav takvimi, devamsızlık, not ortalaması ve derslere göre günlük çalışma planı.',
    yl: 'Dönem ekranında derslerin, seminer ve tez teslim tarihlerin; Notlar → Kaynaklar\'da makalelerin ve kaynakçan.',
    kpss: 'Plan sekmesinde KPSS derslerin ve konuların; sınav tarihini girince geri sayım ve tekrar planı oluşur.',
    diger: 'Plan sekmesinde kendi derslerin ve sınav tarihlerin.',
  };
  function renderEdu() {
    const s = D().settings, x = D().uni, lvl = s.profile.level || 'yks';
    $$('#level-seg button').forEach((b) => b.classList.toggle('active', b.dataset.level === lvl));
    $('#level-hint').textContent = LEVEL_HINT[lvl] || LEVEL_HINT.diger;
    $('#set-dept').value = s.profile.dept || '';
    $('#set-year').value = s.profile.year || '';
    $('#uni-fields').classList.toggle('hidden', lvl === 'yks');
    $('#edu-card').classList.toggle('is-school', lvl === 'uni' || lvl === 'yl');
    $('#set-school').value = x.school || '';
    $('#set-faculty').value = x.faculty || '';
    $('#set-term').value = x.term || '';
    $('#set-weeks').value = x.weeks || 14;
    $('#set-termstart').value = x.termStart || '';
    $('#set-termend').value = x.termEnd || '';
    $('#set-abs').value = x.absPct ?? 30;
  }
  function changeLevel(lvl) {
    const old = D().settings.profile.level || 'yks';
    if (lvl === old) return;
    const msg = lvl === 'yks' ? 'YKS moduna dönülsün mü? Dönem verilerin silinmez, saklanır.'
      : old === 'yks' ? `${({ uni: 'Üniversite', kpss: 'KPSS', yl: 'Yüksek lisans' })[lvl] || 'Yeni'} moduna geçilsin mi? YKS konuların, denemelerin ve oturumların silinmez; istediğin an geri dönebilirsin.` : null;
    if (msg && !confirm(msg)) { renderEdu(); return; }
    Uni.setMode(lvl);
    // sayaçtaki ders eski modun listesinde kaldıysa yeni listenin ilk dersine geç
    if (!D().subjects.some((x) => x.id === Timer.state().subjectId)) Timer.setSubject(D().subjects[0] ? D().subjects[0].id : '');
    applyMode(); renderEdu(); renderSubjectEdit(); renderSubjectSelects(); renderHome();
    if (lvl !== 'yks' && old === 'yks') {
      toast('🎓', lvl === 'kpss' ? 'KPSS modu açık' : 'Yeni dönem, yeni sayfa!', lvl === 'kpss' ? 'Plan sekmesinden derslerini ekleyebilirsin' : 'Okulunu ve dönem tarihlerini yaz, sonra Dönem sekmesinden derslerini ekle', 7000);
      App.sayText(U.pick(['Yeni bir sayfa açıyoruz! Ben yine yanındayım 🐾', 'Kocaman bir adım daha! Seninle gurur duyuyorum 💛']));
    }
  }

  // son yedek ne zaman alındı (yedek, verinin tek güvencesi)
  function markBackup() { D().lastBackup = Date.now(); save(); renderBackupInfo(); }
  function renderBackupInfo() {
    const el = $('#backup-info');
    if (!el) return;
    $('#rescue-info').classList.toggle('hidden', !Store.rescueCopy());
    const t = D().lastBackup;
    if (!t) { el.textContent = '🌱 Henüz yedek almadın.'; return; }
    const days = Math.round((U.dayStart(new Date()) - U.dayStart(t)) / 864e5); // takvim günü (23:30'daki yedek ertesi gün "dün")
    el.textContent = `✅ Son yedek: ${days < 1 ? 'bugün' : days === 1 ? 'dün' : days + ' gün önce'} (${new Date(t).toLocaleDateString('tr-TR')})`;
  }

  function renderSubjectEdit() {
    $('#subject-edit').innerHTML = D().subjects.map((s) => `<li data-id="${s.id}">
      <input type="color" value="${s.color}" data-f="color">
      <input value="${U.esc(s.name)}" data-f="name" maxlength="30">
      <button class="icon-btn" data-f="del" title="Sil">🗑️</button></li>`).join('');
  }

  function bindSettings() {
    const num = (id, key, min, max) => $(id).addEventListener('change', (e) => {
      const n = parseInt(e.target.value, 10); // 0 geçerli bir değer olabilir (ör. Luna'nın mesajları: 0 = hiç)
      const v = U.clamp(Number.isNaN(n) ? D().settings[key] : n, min, max);
      D().settings[key] = v; e.target.value = v; save();
      renderHome(); Timer.state(); // sayaç yeni süreyi bir sonraki tick'te gösterir
    });
    num('#set-goal', 'dailyGoal', 10, 900);
    num('#set-msg', 'msgInterval', 0, 240);
    num('#set-focus', 'focus', 1, 180);
    num('#set-short', 'short', 1, 60);
    num('#set-long', 'long', 1, 90);
    num('#set-every', 'longEvery', 2, 10);
    $('#set-name').addEventListener('change', (e) => { D().settings.name = e.target.value.trim() || 'Hazal'; save(); renderHUD(); renderFooter(); });
    $('#set-partner').addEventListener('change', (e) => { D().settings.partner = e.target.value.trim(); save(); renderHome(); });
    const prof = (id, key, max) => $(id).addEventListener('change', (e) => { D().settings.profile[key] = e.target.value.trim().slice(0, max); save(); });
    prof('#set-dept', 'dept', 60);
    prof('#set-year', 'year', 20);
    $('#level-seg').addEventListener('click', (e) => { const b = e.target.closest('[data-level]'); if (b) changeLevel(b.dataset.level); });
    const uniText = (id, key, max) => $(id).addEventListener('change', (e) => { D().uni[key] = e.target.value.trim().slice(0, max); save(); });
    uniText('#set-school', 'school', 80);
    uniText('#set-faculty', 'faculty', 80);
    uniText('#set-term', 'term', 30);
    const uniDate = (id, key) => $(id).addEventListener('change', (e) => { D().uni[key] = Uni.validDate(e.target.value) ? e.target.value : ''; save(); });
    uniDate('#set-termstart', 'termStart');
    uniDate('#set-termend', 'termEnd');
    const uniNum = (id, key, a, b) => $(id).addEventListener('change', (e) => { const v = U.clamp(Math.round(+e.target.value || 0), a, b); D().uni[key] = v; e.target.value = v; save(); });
    uniNum('#set-weeks', 'weeks', 6, 22);
    uniNum('#set-abs', 'absPct', 0, 100);
    const bool = (id, key) => $(id).addEventListener('change', (e) => { D().settings[key] = e.target.checked; save(); });
    bool('#set-autobreak', 'autoBreak');
    bool('#set-autofocus', 'autoFocus');
    bool('#set-sound', 'sound');
    bool('#set-quiet', 'quietFocus');
    $('#set-pauseleave').addEventListener('change', (e) => {
      D().settings.pauseOnLeave = e.target.checked; save();
      renderAllowApps(); renderTimer(Timer.state());
    });
    $('#allow-chips').addEventListener('click', (e) => {
      const b = e.target.closest('[data-app]');
      if (!b) return;
      const set = new Set(allowedApps());
      set.has(b.dataset.app) ? set.delete(b.dataset.app) : set.add(b.dataset.app);
      D().settings.allowedApps = Object.keys(APPS).filter((k) => set.has(k)); // sabit sıra
      save(); renderAllowApps(); renderTimer(Timer.state());
    });
    // izinli uygulama düğmesi: bu çıkış sayacı durdurmaz (bağlantı o anki Spotify listesine güncellenir)
    $('#allow-apps').addEventListener('click', (e) => {
      const a = e.target.closest('a[data-app]');
      if (!a) return;
      a.href = appUrl(a.dataset.app);
      allowExit = { app: a.dataset.app, at: Date.now() };
    });
    $('#call-cats').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-visit]');
      if (!b) return;
      if (App.isFocusing()) { toast('🐾', 'Odaklanırken kediler seni rahatsız etmez', 'Molada çağırabilirsin'); return; }
      const k = b.dataset.visit;
      if (k === 'vesper' && Scene.isVesperTime && !Scene.isVesperTime()) { toast('🌙', 'Vesper akşam gelir', 'Hava kararınca uğrar; şimdilik Güçlü\'yü çağırabilirsin'); return; }
      const came = Scene.visit(k);
      showTab('home');
      if (came === false) toast('🐾', 'Kediler şu an meşgul', 'Biraz sonra yine dene');
    });
    $('#set-focusmode').addEventListener('change', (e) => { D().settings.focusMode = e.target.checked; save(); renderTimer(Timer.state()); });
    document.querySelectorAll('input[name="mini-theme"]').forEach(el => el.addEventListener('change', () => {
      if (!el.checked) return;
      D().settings.miniTheme = el.value; save(); MiniTimer.refreshTheme();
    }));
    $('#set-reminders').addEventListener('change',e=>{D().settings.studyReminders=e.target.checked;save();});
    $('#set-notify').addEventListener('change', async (e) => {
      if (e.target.checked) {
        if (!('Notification' in window)) { toast('🔕', 'Bu tarayıcı bildirimleri desteklemiyor'); e.target.checked = false; return; }
        const p = await Notification.requestPermission();
        if (p !== 'granted') { toast('🔕', 'Bildirim izni verilmedi'); e.target.checked = false; D().settings.notify = false; save(); return; }
      }
      D().settings.notify = e.target.checked; save();
    });
    $('#theme-seg').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-theme]');
      if (!b) return;
      D().settings.theme = b.dataset.theme; save();
      applyTheme(); renderSettings();
    });
    $('#set-weather').addEventListener('change', (e) => { D().settings.weather = e.target.checked; save(); refreshWeather(); });
    $('#city-chips').addEventListener('click', (e) => {
      const c = e.target.closest('.chip');
      if (!c) return;
      D().settings.lat = +c.dataset.lat; D().settings.lon = +c.dataset.lon; D().settings.city = c.dataset.name; save();
      renderSettings(); renderHUD(); refreshWeather(true);
    });
    $('#use-location').addEventListener('click', () => {
      if (!navigator.geolocation) { toast('📍', 'Konum desteklenmiyor'); return; }
      navigator.geolocation.getCurrentPosition((p) => {
        D().settings.lat = +p.coords.latitude.toFixed(3); D().settings.lon = +p.coords.longitude.toFixed(3); D().settings.city = 'Konumun'; save();
        renderSettings(); renderHUD(); refreshWeather(true); toast('📍', 'Konum güncellendi');
      }, () => toast('📍', 'Konum alınamadı'));
    });
    // dersler
    $('#subject-edit').addEventListener('change', (e) => {
      const li = e.target.closest('li'); if (!li) return;
      const s = D().subjects.find((x) => x.id === li.dataset.id); if (!s) return;
      if (e.target.dataset.f === 'name') {
        if (e.target.value.trim()) s.name = e.target.value.trim();
        else { e.target.value = s.name; toast('📚', 'Ders adı boş olamaz', 'Önceki adı geri koydum'); } // boş bırakılırsa eski ad görünsün
      }
      if (e.target.dataset.f === 'color') s.color = e.target.value;
      save(); renderSubjectSelects();
    });
    $('#subject-edit').addEventListener('click', (e) => {
      if (e.target.dataset.f !== 'del') return;
      const li = e.target.closest('li');
      const s = D().subjects.find((x) => x.id === li.dataset.id);
      if (!s || !confirm(`"${s.name}" dersi silinsin mi? (Geçmiş oturumlar "Genel" olarak kalır)`)) return;
      D().subjects = D().subjects.filter((x) => x.id !== s.id);
      if (Timer.state().subjectId === s.id) Timer.setSubject(D().subjects[0] ? D().subjects[0].id : '');
      save(); renderSubjectEdit(); renderSubjectSelects();
    });
    $('#subject-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#subject-name').value.trim();
      if (!name) return;
      D().subjects.push({ id: U.uid(), name, color: $('#subject-color').value });
      save(); $('#subject-name').value = '';
      renderSubjectEdit(); renderSubjectSelects();
    });
    // notlar yazarken kendiliğinden kaydedilir (sekme değişince kaybolmasın); düğme yalnızca onay verir
    const saveLove = () => { D().loveNotes = $('#set-love').value.split('\n').map((x) => x.trim()).filter(Boolean); save(); };
    let loveT = 0;
    $('#set-love').addEventListener('input', () => { clearTimeout(loveT); loveT = setTimeout(saveLove, 500); });
    $('#set-love').addEventListener('blur', () => { clearTimeout(loveT); saveLove(); });
    $('#save-love').addEventListener('click', () => {
      clearTimeout(loveT); saveLove(); renderHome(); toast('💌', 'Notlar kaydedildi');
    });
    // veri
    $('#export').addEventListener('click', async () => {
      const name = `luna-yedek-${U.dateKey(new Date())}.json`;
      const blob = new Blob([JSON.stringify(D(), null, 2)], { type: 'application/json' });
      // telefonda/tablette paylaşım menüsü: Dosyalar'a kaydet, AirDrop, Drive…
      if (matchMedia('(pointer: coarse)').matches && navigator.canShare && window.File) {
        const file = new File([blob], name, { type: 'application/json' });
        if (navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], title: 'Luna yedeği' }); markBackup(); return; } catch (err) {
            if (err && err.name === 'AbortError') return; // kullanıcı vazgeçti
          }
        }
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      markBackup();
    });
    $('#rescue-dl').addEventListener('click', () => {
      const raw = Store.rescueCopy();
      if (!raw) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
      a.download = `luna-kurtarma-${U.dateKey(new Date())}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    $('#rescue-del').addEventListener('click', () => {
      if (!confirm('Kurtarma kopyası silinsin mi? Önce indirmeni öneririm.')) return;
      Store.dropRescue(); renderBackupInfo();
    });
    $('#import').addEventListener('change', (e) => {
      const f = e.target.files[0]; if (!f) return;
      e.target.value = '';
      const r = new FileReader();
      r.onload = () => {
        let obj;
        try {
          obj = JSON.parse(r.result);
          if (!obj || typeof obj !== 'object' || !Array.isArray(obj.sessions)) throw new Error('format');
        } catch (err) { toast('⚠️', 'Dosya okunamadı', 'Luna yedeği olduğundan emin ol'); return; }
        const n = (k) => (Array.isArray(obj[k]) ? obj[k].length : 0);
        openModal(`<h3>📥 Yedeği yükle</h3>
          <p class="muted">Bu yedekte <b>${n('sessions')}</b> oturum, <b>${n('denemeler')}</b> deneme, <b>${n('notes')}</b> not ve <b>${n('cards')}</b> kart var.</p>
          <div class="import-choices">
            <button class="btn primary" data-imp="merge">🤝 Birleştir <small>Şimdiki verilerin kalır, yedekteki eksikler eklenir</small></button>
            <button class="btn soft" data-imp="replace">♻️ Tamamen değiştir <small>Bu cihazdaki veriler yedektekiyle değişir</small></button>
          </div>
          <div class="modal-actions"><button class="btn soft" data-imp="cancel">Vazgeç</button></div>`, (card) => {
          card.addEventListener('click', (ev) => {
            const b = ev.target.closest('[data-imp]');
            if (!b) return;
            if (b.dataset.imp === 'cancel') { closeModal(); return; }
            if (b.dataset.imp === 'replace') {
              if (!confirm('Bu cihazdaki bütün veriler yedektekiyle değişecek. Emin misin?')) return;
              if (!Store.importJSON(obj)) { toast('⚠️', 'Yedek bu cihaza yazılamadı', 'Depolama dolu olabilir; Notlar → Kütüphane’den yer açıp tekrar dene', 8000); return; }
              location.reload();
              return;
            }
            const added = Store.mergeJSON(obj);
            closeModal();
            // yeni dersler/alan gelmiş olabilir: her şeyi baştan çiz
            renderSubjectSelects(); renderSettings(); applyTheme();
            afterDataChange();
            toast('🤝', added ? `${added} yeni kayıt eklendi` : 'Yedekteki her şey zaten burada', 'Hiçbir verin silinmedi');
          });
        });
      };
      r.readAsText(f);
    });
    $('#reset').addEventListener('click', () => {
      if (!confirm('Bütün oturumlar, denemeler, notlar ve ayarlar silinecek. Önce "Yedek al" ile bir kopya saklamanı öneririm. Devam edilsin mi?')) return;
      if (!confirm('Gerçekten emin misin? Bu geri alınamaz.')) return;
      Store.reset(); location.reload();
    });
  }

  function renderFooter() {
    $('.footer').textContent = `${D().settings.name || 'Sana'} için sevgiyle yapıldı ✨🐾`;
  }

  // ======================================================================
  // Luna etkileşimleri ve periyodik mesajlar
  // ======================================================================
  // dokunmatik ekranda grafiklerin "üzerine gelince" değerleri: dokununca küçük bir balonda görünür
  function bindTapTips() {
    if (!matchMedia('(pointer: coarse)').matches) return;
    let tip = null, hideT = 0;
    const drop = () => { if (tip) { tip.remove(); tip = null; } };
    document.addEventListener('click', (e) => {
      drop();
      const el = e.target.closest('[title]');
      if (!el || el.closest('button, a, input, select, textarea, label, .modal') || !el.closest('#tab-progress, .tl-track, .week-grid')) return;
      const r = el.getBoundingClientRect();
      tip = document.createElement('div');
      tip.className = 'tap-tip';
      tip.textContent = el.getAttribute('title');
      document.body.appendChild(tip);
      const w = tip.offsetWidth, h = tip.offsetHeight;
      tip.style.left = Math.round(Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2))) + 'px';
      tip.style.top = Math.round(r.top > h + 16 ? r.top - h - 8 : r.bottom + 8) + 'px';
      clearTimeout(hideT); hideT = setTimeout(drop, 2600);
    });
    window.addEventListener('scroll', drop, { passive: true });
  }

  function bindLuna() {
    $('#feed-btn').addEventListener('click', () => {
      if (D().fish <= 0) { say('noFish'); return; }
      D().fish--; D().fed++; save();
      Scene.feed();
      renderHUD();
      setTimeout(() => { say('fed'); Sound.meow(); }, 1800);
      checkBadges();
    });
  }

  // Vesper ve Güçlü'nün sözü: gece uykulu; Güçlü "özledim"i yalnızca uzun aradan sonra, çalışılan günde mutlu
  function friendLine(kind) {
    const h = new Date().getHours(), night = h >= 23 || h < 5 || Messages.companionState().bedtime;
    if (kind === 'vesper') return night ? 'vesperSleepy' : 'vesper';
    if (night) return 'kittenSleepy';
    const ss = D().sessions, last = ss.length ? ss[ss.length - 1].start : 0;
    if (!last || Date.now() - last > 3 * 864e5) return 'kittenMiss';
    return Stats.minutesOn(new Date()) > 0 ? 'kittenHappy' : 'kitten';
  }
  function sayCompanion(kind) {
    const c = Messages.companionState();
    if (kind === 'checkIn') c.checkedIn = true;
    if (kind === 'bedtime') c.bedtime = true;
    if (kind === 'lowStudy') c.lowStudySaid = true;
    save();
    // öğleden önce "günün nasıl geçti" yerine sabah sorusu
    say(kind === 'checkIn' && new Date().getHours() < 12 ? 'checkInMorning' : kind, { ms: 9000 });
    if (kind === 'checkIn') renderHome(); // karşılama kartında cevap düğmeleri çıksın
  }

  function dailyCheckIn() {
    if (document.hidden || !$('#modal').classList.contains('hidden')) return false;
    const s = Timer.state(), c = Messages.companionState();
    const hh = new Date().getHours(); // gece 23–05 arası "nasılsın, başlayalım" sorulmaz (uyku saati)
    if (s.running || c.checkedIn || hh >= 23 || hh < 5 || Date.now() - lastMsgAt < 12000) return false;
    sayCompanion('checkIn');
    return true;
  }

  function periodic() {
    if (dailyCheckIn()) return;
    const iv = D().settings.msgInterval;
    if (!iv || document.hidden || !$('#modal').classList.contains('hidden')) return;
    if (Date.now() - lastMsgAt < iv * 60000) return;
    const s = Timer.state();
    const focusing = s.running && s.phase === 'focus';
    if (focusing && D().settings.quietFocus) return; // odaklanırken rahatsız etme
    if (!s.running && Messages.mood() === 'bedtime') { sayCompanion('bedtime'); return; }
    if (!focusing && Math.random() < 0.35 && sayLove()) return;
    if (focusing) say('during');
    else if (s.running) say('breakStart');
    else sayCompanion(Messages.mood());
  }

  let welcomedBack = false;
  function greetOnOpen() {
    const ss = D().sessions;
    setTimeout(dailyCheckIn, 15000);
    if (welcomedBack) return; // dönüş mesajı (ya da "Neredeydin?") zaten konuştu
    const conversation = Messages.companionState();
    // 2.1'den gelen (oturumu olan) kullanıcı Luna'yı zaten tanıyor: "ilk oturumu başlatalım" denmesin
    if (!conversation.introduced && ss.length) { conversation.introduced = true; save(); }
    if (!conversation.introduced) {
      setTimeout(() => {
        if (document.hidden) return;
        conversation.introduced = true; save();
        say('welcome', { ms: 9000 });
      }, 1200);
      return;
    }
    // özel günlerde günde bir kez tebrik
    const evs = Scene.today ? Scene.today().events.map((e) => e.key) : [];
    const special = evs.includes('yilbasi') ? 'yilbasi' : evs.includes('ramazan') || evs.includes('kurban') ? 'bayram' : evs.includes('ulusal') ? 'ulusal' : evs.includes('sevgililer') ? 'love' : null;
    const today = U.dateKey(new Date());
    if (special && D().lastSpecialGreet !== today) {
      D().lastSpecialGreet = today;
      save();
      setTimeout(() => { if (special === 'love') sayLove(); else say(special, { ms: 9000 }); }, 1200);
      return;
    }
    // dolunay gecesi ve ay gökteyse günde bir kez buna dair küçük bir söz
    const h = new Date().getHours();
    const moon = Scene.moonInfo && (h >= 18 || h < 4) ? Scene.moonInfo() : null;
    const fullMoon = moon && moon.up && moon.fraction > 0.97 && D().lastMoonGreet !== today;
    // sınav 3 gün içindeyse günde bir kez cesaret veren hatırlatma
    const exam = programMode() ? Uni.upcoming(3).find((e) => Uni.EXAM.has(e.kind)) : null;
    setTimeout(() => {
      if (exam && D().lastExamGreet !== today) { D().lastExamGreet = today; save(); App.sayText(Messages.get('exam', { what: examClause(exam) })); return; }
      if (document.hidden) return;
      if (Messages.mood() === 'bedtime') sayCompanion('bedtime');
      else if (!Messages.companionState().checkedIn && h >= 5 && h < 23) sayCompanion('checkIn');
      else if (ss.length && Date.now() - ss[ss.length - 1].start > 3 * 864e5) say('comeback');
      else if (fullMoon) { D().lastMoonGreet = today; save(); say('dolunay', { ms: 8000 }); }
      else { const m = Messages.mood(); sayCompanion(m === 'lowStudy' ? 'companion' : m); } // açılışta hep sıcak karşılama
    }, 1200);
    // emek birikti ama bir aydır yedek yok: iki haftada en fazla bir kez nazik hatırlatma
    const month = 30 * 864e5, now = Date.now();
    if (ss.length >= 20 && now - (D().lastBackup || ss[0].start) > month && now - (D().lastBackupNudge || 0) > 14 * 864e5) {
      setTimeout(() => {
        if (App.isFocusing()) return;
        D().lastBackupNudge = Date.now(); save();
        say('backup', { ms: 9000 });
      }, 20000);
    }
  }

  // ======================================================================
  // Başlat
  // ======================================================================
  // Plan ve Deneme modüllerinin kullandığı küçük arayüz
  const App = {
    data: D,
    save,
    toast,
    esc: U.esc,
    say(kind, vars) { if (Scene.say(Messages.get(kind, vars), Messages.delivery(kind)) !== false) lastMsgAt = Date.now(); },
    sayText(text, opts) { if (Scene.say(text, opts) !== false) lastMsgAt = Date.now(); },
    // Luna son ms içinde konuştu mu (hatırlatmalar onun sözünü ezmesin)
    quietFor(ms) { return Date.now() - lastMsgAt < ms; },
    openModal,
    closeModal,
    startStudy,
    subjectFor,
    applyFieldSubjects,
    bestHours,
    refresh: afterDataChange,
    refreshWeather,
    checkBadges,
    allowExit(key) { allowExit = { app: key, at: Date.now() }; },
    dismissFocus() { focusDismissed = true; renderTimer(Timer.state()); }, // odak sürerken diğer ekranı göster
    refreshHome() { renderHome(); renderHUD(); checkBadges(); },
    refreshSubjects() { renderSubjectSelects(); },
    showTab,
    celebrate() { Scene.celebrate(); Sound.chime(); },
    isFocusing() { const s = Timer.state(); return s.running && s.phase === 'focus'; },
    // kullanıcı bir işin ortasında mı (sayaç, açık pencere, görüntüleyici): sessiz güncelleme beklesin
    isBusy() { return Timer.state().running || !$('#modal').classList.contains('hidden') || !$('#viewer').classList.contains('hidden'); },
    playSpotify(url) {
      D().settings.spotify = url;
      save();
      if (!$('#spotify-presets').children.length) renderMusic(); else loadSpotify();
      $('#spotify-input').value = url;
    },
  };
  window.App = App;

  function init() {
    if (window.GAuth) GAuth.handleRedirect(); // Google dönüşü: modüller sonucu GAuth.lastReturn() ile okur
    // kaldırılan hesap eşitlemesinden kalmış olabilecek boş kayıtları bir kez temizle
    try { if (!localStorage.getItem('luna-temizlik-1')) { localStorage.removeItem('luna-sync-on'); if (window.indexedDB) indexedDB.deleteDatabase('luna-sync'); localStorage.setItem('luna-temizlik-1', '1'); } } catch (e) { /* yok say */ }
    Scene.init($('#sky'), $('#bubble'), {
      onPoke() { Sound.meow(); say('poke'); },
      onFriend(kind) { Sound.meow(); say(friendLine(kind)); },
      onFriendArrival(kind) {
        // gelişte konuşma: Luna'nın konuşma sıklığı 0 ise hiç, değilse her kedi gecede bir kez
        if (!D().settings.msgInterval) return;
        const c = Messages.companionState();
        if (!c.friendSaid || typeof c.friendSaid !== 'object') c.friendSaid = {};
        if (c.friendSaid[kind]) return;
        let tries = 0;
        const speak = () => {
          if (App.isFocusing()) return;
          if (Date.now() - lastMsgAt < 10000 || !$('#modal').classList.contains('hidden')) {
            if (++tries < 7) setTimeout(speak, 1500);
            return;
          }
          if (say(friendLine(kind))) { c.friendSaid[kind] = true; save(); }
        };
        speak();
      },
      // ilk karşılaşma: tanıştırma + iki kediyle de tanışınca rozet
      onFriendSeen(kind) {
        const st = D().stats;
        if (st.seen[kind]) return;
        st.seen[kind] = Date.now();
        if (st.seen.vesper && st.seen.kitten) st.friendsMet = true;
        save();

        checkBadges();
      },
    });
    Scene.portrait($('#report-luna'));
    // modüller sayaçtan önce: sayfa kapalıyken biten bir oturum açılışta işlenirken hazır olsunlar
    if (window.PlanUI) PlanUI.init(App);
    if (window.UniUI) UniUI.init(App);
    if (window.DenemeUI) DenemeUI.init(App);
    if (window.NotesUI) NotesUI.init(App);
    if (window.DepoUI) DepoUI.init(App);
    if (window.HataUI) HataUI.init(App);
    if (window.KaynakUI) KaynakUI.init(App);
    if (window.Badges) Badges.init(App);
    if (window.SpotifyLink) SpotifyLink.init(App);
    if (window.Diag) Diag.init(App);
    renderSubjectSelects();
    Timer.init(timerHandlers);
    renderAllowApps();
    welcomedBack = welcomeBack(); // uygulama dışındayken sayfa kapanmışsa (iOS) dönüşte değerlendir
    syncSceneMode();
    if (Timer.state().running && Timer.state().phase === 'focus') lockScreen(true);

    $$('#tabs button').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
    $('#period-seg').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      $$('#period-seg button').forEach((x) => x.classList.toggle('active', x === b));
      progressDays = +b.dataset.days;
      renderProgress();
    });
    // yalnızca boşlukta başlayan dokunuş kapatır: kartta metin seçip dışarıda bırakmak yazılanı silmesin
    const modalEl = $('#modal');
    let downInCard = false;
    modalEl.addEventListener('pointerdown', (e) => { downInCard = e.target !== modalEl; });
    modalEl.addEventListener('click', (e) => { if (e.target === modalEl && !downInCard) dismissModal(); downInCard = false; });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') dismissModal(); });
    const openSession = (e) => {
      const li = e.target.closest('li[data-id]');
      if (!li) return;
      const s = D().sessions.find((x) => x.id === li.dataset.id);
      if (s) openSessionModal(s);
    };
    $('#badges').addEventListener('click', (e) => {
      const b = e.target.closest('.badge[data-id]');
      if (b && window.Badges) Badges.openDetail(b.dataset.id);
    });
    $('#welcome').addEventListener('click', (e) => {
      const f = e.target.closest('[data-feel]');
      if (f) {
        const c = Messages.companionState();
        c.feeling = f.dataset.feel; save();
        say('feel' + f.dataset.feel, { ms: 9000 });
        renderHome();
        return;
      }
      const b = e.target.closest('[data-tab]');
      if (!b) return;
      const [tab, view] = b.dataset.tab.split(':'); // ör. notes:hata → Notlar'ın Hatalar bölümü
      if (view && window.NotesUI) NotesUI.setView(view);
      showTab(tab);
    });
    $('#subject-tiles').addEventListener('click', (e) => {
      const t = e.target.closest('.subj-tile');
      if (!t) return;
      const s = Timer.state();
      if (s.running && s.phase === 'focus') {
        if (s.subjectId !== t.dataset.id) toast('⏱️', 'Bir oturum zaten sürüyor', 'Ders değiştirmek için önce bitir ya da duraklat');
        return;
      }
      startStudy({ subjectId: t.dataset.id });
    });
    $('#today-list').addEventListener('click', openSession);
    $('#history').addEventListener('click', openSession);
    $('#btn-manual').addEventListener('click', () => openSessionModal(null));

    bindTimer();
    bindTasks();
    bindMusic();
    bindSettings();
    bindLuna();
    bindWeather();
    bindTapTips();

    applyTheme();
    applyMode();
    renderClock();
    renderHome();
    renderFooter();
    // uygulama kapanırken / arka plana geçerken her şey bir kez daha cihaza yazılır (iOS arka planda kapatabilir)
    window.addEventListener('pagehide', () => save());
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
    window.addEventListener('luna-save-failed', () => toast('⚠️', 'Değişiklikler kaydedilemiyor', 'Cihazın depolama alanı dolmuş olabilir. Hemen Ayarlar → "Yedek al" ile bir kopya sakla', 12000));
    window.addEventListener('luna-data-changed', () => { renderSubjectSelects(); repaint(); }); // başka sekmede kaydedildi
    setInterval(renderClock, 1000);
    refreshWeather();
    setInterval(() => { if (!document.hidden) refreshWeather(); }, 10 * 60000); // önbellek 30 dk, istek seyrek
    setInterval(periodic, 30000);
    let lastDay = U.dateKey(new Date());
    setInterval(() => { // gece yarısı geçince günü yenile
      const k = U.dateKey(new Date());
      if (k !== lastDay) { lastDay = k; renderHome(); if (currentTab === 'plan') renderPlanTab(); }
    }, 60000);
    // Uygulamadan çıkış: tam odakta izinli uygulamalar dışında sayaç durur, değilse nazik "hoş geldin"
    let awayTimer = 0;
    document.addEventListener('visibilitychange', () => {
      const s = Timer.state();
      const focusing = s.running && s.phase === 'focus';
      if (document.hidden) {
        if (!focusing) return;
        const app = window.MiniTimer && MiniTimer.isOpen() ? 'miniTimer' : allowExit && Date.now() - allowExit.at < 15000 ? allowExit.app : null;
        allowExit = null;
        D().timer.away = { at: Date.now(), app }; // sayfa arka planda kapatılsa da açılışta değerlendirilir
        save();
        // arka planda kod çalışmaya devam ediyorsa (bilgisayar sekmesi) süre dolunca hemen durdur
        clearTimeout(awayTimer);
        if (!app) awayTimer = setTimeout(checkAway, AWAY_GRACE + 500);
        return;
      }
      clearTimeout(awayTimer);
      welcomeBack();
      if (Timer.state().running && Timer.state().phase === 'focus') lockScreen(true);
    });

    let saved = 'home';
    try { saved = localStorage.getItem('luna-tab') || 'home'; } catch (e) { /* yok say */ }
    if ($('#tab-' + saved)) showTab(saved);
    greetOnOpen();
    checkBadges();
    if (Store.loadError) setTimeout(() => toast('🛟', 'Verilerin okunamadı', 'Bozulmasın diye kopyası alındı: Ayarlar → Veriler', 9000), 1500);

    LunaNotify.init(App);
    MiniTimer.init(App,()=>weatherNow);
    if (window.Guncelleme) Guncelleme.init(App); // güncellemeler, yenilikler ve ana ekrana ekleme
    // ana ekrana eklenmiş uygulamada tarayıcıdan verilerin kalıcı saklanmasını iste (izin penceresi çıkmaz)
    if (navigator.storage && navigator.storage.persist && (matchMedia('(display-mode: standalone)').matches || navigator.standalone)) {
      navigator.storage.persisted().then((p) => p || navigator.storage.persist()).catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();