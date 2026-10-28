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
  let pickedAt = 0; // kamera / dosya seçicinin en son açıldığı an
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
        const lock = await navigator.wakeLock.request('screen');
        wakeLock = lock;
        lock.addEventListener('release', () => { if (wakeLock === lock) wakeLock = null; });
        if (!App.isFocusing()) { wakeLock = null; await lock.release(); }
      } else if (!on && wakeLock) {
        await wakeLock.release();
        wakeLock = null;
      }
    } catch (e) { wakeLock = null; }
  }
  const fmtDayMin = (m) => `${U.pad(Math.floor(((m % 1440) + 1440) % 1440 / 60))}:${U.pad(Math.floor(((m % 60) + 60) % 60))}`;
  function subjectOptions(sel) {
    const gone = sel && !D().subjects.some((s) => s.id === sel) ? `<option value="${U.esc(sel)}" selected>${U.esc(Store.subject(sel).name)}</option>` : '';
    return gone + D().subjects.map((s) => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${U.esc(s.name)}</option>`).join('')
      + `<option value="" ${!sel ? 'selected' : ''}>Genel</option>`;
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
    const t = D().settings.theme, root = document.documentElement;
    const zambak = t === 'zambak'; // şiirdeki gece: koyu temanın üstüne kendi renkleri
    const dark = zambak || t === 'dark' || (t === 'auto' && Scene.sunInfo().elev < -4);
    const v = dark ? 'dark' : 'light', tema = zambak ? 'zambak' : '';
    // durum çubuğu rengi: sayfa açılış ekranının koyu rengiyle başlar, ilk çağrıda temaya geçer
    const meta = document.querySelector('meta[name="theme-color"]'), bar = zambak ? '#050d24' : dark ? '#21182f' : '#f3ecfb';
    if (meta && meta.content !== bar) meta.content = bar;
    if (root.dataset.theme === v && (root.dataset.tema || '') === tema) return;
    root.dataset.theme = v;
    if (tema) root.dataset.tema = tema; else delete root.dataset.tema;
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
    // Planlarım her modda en üstte; bir hata sekmenin geri kalanını (ve açılışı) asla bozmasın
    if (window.PlanlarUI) { try { PlanlarUI.render(); } catch (e) { ErrLog.add('Planlar: ' + ((e && e.message) || e), 'planlar-ui.js'); } }
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
    if (name === 'progress') { logCount = 14; weekOff = 0; openDay = ''; chartDay = ''; renderProgress(); }
    if (name === 'plan') renderPlanTab();
    if (name === 'deneme' && window.DenemeUI) DenemeUI.render();
    if (name === 'notes' && window.NotesUI) NotesUI.render();
    if (name === 'settings') renderSettings();
    if (name === 'home') renderHome();
    if (name === 'takvim') renderTakvim();
    try { localStorage.setItem('luna-tab', name); } catch (e) { /* yok say */ }
    Geri.sync();
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
    if (text && Scene.say(text, a.lunaNudge ? Messages.delivery('focusNudge') : { emotion: 'neutral' }) !== false) lastMsgAt = Date.now();
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
          if (App.isFocusing()) {
            lockScreen(true);
            Scene.say(`${APPS[k].from} hoş geldin ${APPS[k].e} Sayaç hiç durmamış gibi devam ediyor; o süre de çalışmana sayıldı.`);
          }
        } else {
          Scene.say(nudge ? Messages.get('focusNudge') + ' Hazır olduğunda Devam’a bas 🐾' : 'Sorun değil, hazır olduğunda Devam’a bas, kaldığımız yerden sürdürelim 🐾');
        }
        lastMsgAt = Date.now();
      });
    });
    if ($('#modal').classList.contains('hidden')) ask();
    else pendingWhere = ask; // başka bir pencere açıksa o kapanınca sorulur
  }
  let timerKey = '', continuousHour = -1, lastLiveMin = -1;
  function renderTimer(s) {
    // sayaç saniyede 4 kez sorar; ekran yalnızca görünen bir şey değişince güncellenir
    const shown = Math.max(0, s.countdown ? Math.ceil(s.remaining) : Math.floor(s.elapsed));
    const key = [shown, s.running, s.phase, s.kind, s.exam, s.fresh, s.cycle, s.subjectId, s.intent, focusDismissed, D().settings.focusMode, D().settings.pauseOnLeave, (D().settings.allowedApps || []).length, D().settings.longEvery].join('|');
    if (key === timerKey) return;
    timerKey = key;
    $$('#kind-seg button').forEach((b) => {
      const selected = b.dataset.kind === s.kind && (b.dataset.exam || null) === (s.exam || null);
      b.classList.toggle('active', selected); b.setAttribute('aria-pressed', String(selected));
    });
    const isBreak = s.phase !== 'focus';
    const label = !isBreak && s.exam ? s.exam.toUpperCase() + ' GERİ SAYIM' : s.kind === 'free' && !isBreak ? 'SERBEST ODAK' : PHASE_NAME[s.phase];
    $('#phase-label').textContent = label;
    $('#phase-label').classList.toggle('break', isBreak);
    $('#timer-time').textContent = U.fmtClock(shown);
    $('#timer-time').classList.toggle('has-hours', shown >= 3600);
    $('#timer-duration-label').textContent = shown >= 3600 ? `${Math.floor(shown / 3600)} saat ${U.pad(Math.floor(shown / 60) % 60)} dk ${U.pad(Math.floor(shown) % 60)} sn` : '';
    $('#countdown-setup').hidden = s.kind !== 'countdown' || !!s.exam;
    if ($('#countdown-setup').hidden) $('#countdown-error').hidden = true;
    const configured = Number.isInteger(D().settings.countdownSeconds) && D().settings.countdownSeconds > 0 ? D().settings.countdownSeconds : D().settings.focus * 60;
    const timeParts = [Math.floor(configured / 3600), Math.floor(configured / 60) % 60, configured % 60];
    ['hours', 'minutes', 'seconds'].forEach((part, i) => {
      const input = $('#countdown-' + part); input.disabled = !s.fresh;
      // Bir kutuda yazarken diğer kutulara dokunma: henüz tamamlanmamış giriş korunur.
      if (!$('#countdown-setup').contains(document.activeElement)) input.value = U.pad(timeParts[i]);
    });
    const liveMin = s.phase === 'focus' && !s.fresh ? Math.floor(s.elapsed / 60) : -1;
    if (liveMin !== lastLiveMin) { lastLiveMin = liveMin; refreshLive(); } else if (currentTab === 'progress' && liveMin >= 0) refreshProgressLive();
    const completedHour = Math.floor((s.continuousSeconds || 0) / 3600);
    if (completedHour !== continuousHour) {continuousHour = completedHour;if (completedHour > 0) checkBadges();}
    const subj = Store.subject(s.subjectId).name;
    $('#timer-sub').textContent = s.running
      ? (isBreak ? BREAK_TIPS[s.cycle % BREAK_TIPS.length] : 'Odaklanıyorsun…')
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
    // sade odak ekranı
    const focusing = s.running && !isBreak && D().settings.focusMode && !focusDismissed;
    if (focusing !== document.body.classList.contains('focusing')) {
      document.body.classList.toggle('focusing', focusing);
      if (focusing) window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    const showApps = s.running && !isBreak && D().settings.pauseOnLeave && allowedApps().length > 0;
    if (showApps !== !$('#allow-apps').classList.contains('hidden')) $('#allow-apps').classList.toggle('hidden', !showApps);
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
    markLivePlan(s);
  }
  // Bugün kartındaki programda seçili madde (sayaç ona sayar); sayaç çalışırken "şimdi" diye nabız atar
  function markLivePlan(s = Timer.state()) {
    const run = s.running && s.phase === 'focus';
    $$('#today-program [data-tp-id]').forEach((r) => {
      const on = !!s.planId && r.dataset.tpId === s.planId;
      r.classList.toggle('sel', on); r.classList.toggle('live', on && run);
      r.querySelector('.tp-go').setAttribute('aria-pressed', String(on));
    });
  }
  // Bugün kartında maddeye dokunma: sayaç bu maddeye saysın (sayaç sıfırlanmaz, ekranda bir şey yazmaz). Aynı maddeye
  // yeniden dokununca seçim kalkar. Sayaç durmuşsa Başla'ya basınca bu maddeye sayar.
  function pickPlanItem(id) {
    const f = Planlar.find(id);
    if (!f || f.item.done || f.item.moved) return;
    // durmuş sayaç konuya dokununca kronometre olarak başlar: kendiliğinden durmaz, Hazal bitirene kadar sayar
    const s0 = Timer.state();
    if (s0.phase === 'focus' && s0.fresh && s0.kind !== 'free') Timer.setKind('free');
    const s = Timer.state();
    if (s.planId !== id) Timer.setPlan(id, f.item.subjectId || ''); // sayaç çalışıyorsa o ana kadarki süre önceki konuda kalır
    // durmuşsa bu konu için hemen başlar (sayaçta konu yazmaz); çalışıyorsa sayaç hiç durmadan bu konuya saymaya devam eder
    if (s.phase === 'focus' && !s.running) $('#btn-toggle').click();
    markLivePlan();
    refreshLive();
  }
  // Sürmekte olan odak oturumu: önceki konuların parçaları ve şimdiki konu. Henüz kaydedilmedikleri için Bugün kartında
  // canlı görünsünler diye oturum gibi verilir (kayda geçmez).
  function liveRun() {
    const s = Timer.state();
    if (s.phase !== 'focus' || s.fresh) return [];
    const out = (Array.isArray(s.segs) ? s.segs : []).filter((p) => p && p.sec >= 1)
      .map((p) => ({ start: p.start, minutes: p.sec / 60, seconds: p.sec, subjectId: p.subjectId, planId: p.planId }));
    const sec = Math.max(0, Math.floor(s.elapsed) - (s.segAt || 0));
    out.push({ start: s.segStart || s.firstStart || Date.now(), minutes: sec / 60, seconds: sec, subjectId: s.subjectId, planId: s.planId });
    return out;
  }
  // bugün çalışılan toplam (kaydedilenler + sürmekte olan oturum)
  function todayMinutes() {
    const k = U.dateKey(new Date());
    return Stats.minutesOn(new Date()) + liveRun().filter((x) => U.dateKey(x.start) === k).reduce((n, x) => n + x.minutes, 0);
  }
  // dakika değiştikçe Bugün kartındaki süreler ve toplam canlı güncellenir (kartın geri kalanı yeniden çizilmez)
  function refreshLive() {
    const el = $('#today-program');
    if (el && !el.classList.contains('hidden') && window.PlanlarUI) { try { PlanlarUI.renderProgram(el); markLivePlan(); } catch (e) { /* bir sonraki çizimde */ } }
    $('#today-min').textContent = U.fmtMin(todayMinutes());
    if (currentTab === 'progress') refreshProgressLive();
  }
  // İlerleme açıkken sayaç çalışıyorsa bu haftanın grafiği ve bugünün satırı saniye saniye ilerler
  // (yalnızca düğmesiz kısımlar yeniden çizilir: dokunuşlar kaybolmaz)
  function refreshProgressLive() {
    renderWeek();
    const today = U.dateKey(new Date());
    if (!patchDay(today, today)) renderDaySummary();
  }
  // Başla'ya basıldığında bir madde seçili değilse bugünün ilk bitmemiş maddesi seçilir; başka bir şeye çalışıyorsa
  // dokunup değiştirir (ilk dakikada değiştirirse süre bölünmez, hepsi doğru maddeye yazılır)
  function autoPickPlan() {
    if (programMode() || !window.PlanlarUI) return;
    const s = Timer.state(), open = Planlar.list('day', U.dateKey(new Date())).filter((x) => !x.done && !x.moved);
    if (!open.length || open.some((x) => x.id === s.planId)) return;
    Timer.setPlan(open[0].id, open[0].subjectId || '');
    markLivePlan();
  }
  // Seçili madde işaretlenince: sayaç ona sayıyorsa oturum biter ve kaydedilir, seçim kalkar
  function finishPlanItem(id) {
    const s = Timer.state();
    if (!id || s.planId !== id) return false;
    if (s.phase === 'focus' && !s.fresh) Timer.finish();
    Timer.setPlan('');
    markLivePlan();
    return true;
  }
  const timerHandlers = {
    onTick: renderTimer,
    onStart(phase, resumed) {
      dismissTimerAlarm();
      Sound.unlock();
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
    // oturum sürerken başka maddeye geçildi: önceki maddenin süresi sessizce kaydedilir (pencere açılmaz)
    onFocusPart(session) {
      runParts.push(session);
      session.id = U.uid();
      session.note = ''; session.hard = ''; session.rating = null; session.mood = '';
      D().sessions.push(session);
      if (session.minutes >= 10) D().fish++;
      save();
    },
    onFocusDone(session) {
      if (session.endReason !== 'split') lockScreen(false); // bölünen oturumun devamı hemen başlar; ekran kilidi bırakılmaz
      session.id = U.uid();
      session.note = session.intent || ''; session.hard = ''; session.rating = null; session.mood = '';
      D().sessions.push(session);
      if (session.minutes >= 10) D().fish++;
      save();
      // bu oturumda konu değiştiyse: toplam ve ders ders süreler ("Toplam 1 sa: Matematik 40 dk · Fizik 20 dk")
      const run = runParts.splice(0).concat([session]), total = run.reduce((n, x) => n + x.minutes, 0);
      if (run.length > 1) runSummary[session.id] = runSummaryText(run);
      if (session.endReason === 'split') {
        const day = new Date(session.start).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
        toast('📅', `${day} günkü çalışman o güne yazıldı`, `${U.fmtMin(session.minutes)} · bugünkü kısım yeni oturum olarak sürüyor`, 6000);
        afterDataChange();
        return;
      }
      if (session.endReason === 'elapsed') {
        Sound.timerEnd();
        $('#timer-end-message').textContent = `${session.exam ? session.exam.toUpperCase() : 'Geri sayım'} bitti! ${U.fmtMin(session.minutes)} tamamlandı 🐾`;
        $('#timer-end-alert').hidden = false;
      } else Sound.chime();
      if (window.PlanlarUI) { try { PlanlarUI.onSession(session); } catch (e) { ErrLog.add('Planlar: ' + ((e && e.message) || e), 'planlar-ui.js'); } }
      if (window.UniUI) UniUI.onSession(session);
      notify(session.exam && session.endReason === 'elapsed' ? `${session.exam.toUpperCase()} süresi doldu! 🐈` : 'Oturum tamamlandı! 🎉', `${runSummary[session.id] || `${U.fmtMin(session.minutes)} ${Store.subject(session.subjectId).name}`} çalıştın. Mola zamanı!`);
      say('done');
      // başka bir pencere açıksa (yarım not, kart, deneme…) üstüne yazma: kapanınca göster
      if ($('#modal').classList.contains('hidden')) openSessionModal(session, { justDone: true });
      else { pendingDone = session; toast('🎉', 'Oturum kaydedildi', runSummary[session.id] || U.fmtMin(total)); }
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
  function dismissTimerAlarm() {
    Sound.stopTimerAlarm();
    $('#timer-end-alert').hidden = true;
  }
  function bindTimer() {
    const timeInputs = ['hours', 'minutes', 'seconds'].map(part => $('#countdown-' + part));
    function saveDuration(showError = false) {
      const ok = Timer.setCountdownTime(...timeInputs.map(input => input.value));
      $('#countdown-error').hidden = ok || !showError;
      $('#countdown-error').textContent = ok ? '' : 'Saat 0–23, dakika ve saniye 0–59 olmalı. En az 1 saniye seç.';
      return ok;
    }
    timeInputs.forEach(input => {
      input.addEventListener('input', () => saveDuration(true));
      input.addEventListener('change', () => saveDuration(true));
    });
    $('#dismiss-timer-alarm').addEventListener('click', dismissTimerAlarm);
    $('#btn-toggle').addEventListener('click', () => {
      const s = Timer.state();
      if (s.fresh && s.kind === 'countdown' && !s.exam && !saveDuration(true)) return;
      if (s.fresh && s.phase === 'focus') autoPickPlan();
      Timer.toggle();
    });
    $('#btn-finish').addEventListener('click', () => Timer.finish());
    $('#btn-reset').addEventListener('click', () => {
      const s = Timer.state();
      if (s.fresh) return;
      if (s.phase === 'focus' && s.elapsed > 120 && !confirm('Bu oturum kaydedilmeden sıfırlansın mı?')) return;
      Timer.reset();
    });
    $$('#kind-seg button').forEach((b) => b.addEventListener('click', () => {
      const s = Timer.state();
      const exam = b.dataset.exam || null;
      if (s.kind === b.dataset.kind && (s.exam || null) === exam) return;
      if (!s.fresh && !confirm('Mevcut sayaç sıfırlanacak. Devam edilsin mi?')) return;
      dismissTimerAlarm();
      Timer.setKind(b.dataset.kind, exam);
      syncSceneMode();
    }));
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
    // klavye: boşluk = başlat/duraklat
    document.addEventListener('keydown', (e) => {
      if (e.code !== 'Space' || siirEl || currentTab !== 'home' || !$('#modal').classList.contains('hidden')) return;
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(document.activeElement.tagName)) return;
      e.preventDefault();
      $('#btn-toggle').click();
    });
  }
  function renderSubjectSelects() {
    if ($('#task-subject')) $('#task-subject').innerHTML = subjectOptions('');
  }
  // ======================================================================
  // Oturum penceresi (bitince not + verim, ya da elle ekleme / düzenleme)
  // ======================================================================
  function openSessionModal(session, opts = {}) {
    const manual = !session;
    const now = new Date();
    // takvimden açılınca o günün akşamı önerilir (saat değiştirilebilir)
    const s = session || { start: opts.date ? new Date(opts.date + 'T19:00:00').getTime() : now.getTime() - 3600000, minutes: 60, subjectId: Timer.state().subjectId, note: '', hard: '', rating: null, mood: '' };
    const preciseShort = !manual && s.minutes > 0 && s.minutes < 1;
    const startD = new Date(s.start);
    const title = opts.justDone ? '🎉 Oturum tamamlandı!' : manual ? '✍️ Çalışmamı ekle' : '✏️ Oturumu düzenle';
    const ozet = opts.justDone ? runSummary[s.id] : '';
    const sub = opts.justDone
      ? `${ozet ? U.esc(ozet) + ' çalıştın' : `${U.fmtMin(s.minutes)} çalıştın`}, harikasın ${U.esc(D().settings.name)}! ${s.minutes >= 10 ? 'Luna sana bir balık verdi 🐟' : ''}`
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
      ${preciseShort ? `<p>Süre: <b>${U.fmtMin(s.minutes)}</b></p><input type="hidden" id="m-min" value="${s.minutes}">` : `<label>Süre (dakika)</label><input type="number" id="m-min" min="1" max="720" value="${s.minutes}">`}
      <label>Neler çalıştın? Önemli noktalar</label>
      <textarea id="m-note" rows="3" placeholder="Örn: Türev kuralları, zincir kuralı, 30 soru çözdüm">${U.esc(s.note)}</textarea>
      <label for="m-q">Kaç soru çözdün? <span class="muted small">(isteğe bağlı)</span></label>
      <div class="q-step"><button type="button" class="btn soft" data-q="-5" aria-label="5 azalt">−5</button><input type="number" id="m-q" min="0" max="999" inputmode="numeric" placeholder="0" value="${s.questions || ''}"><button type="button" class="btn soft" data-q="5" aria-label="5 artır">+5</button><button type="button" class="btn soft" data-q="10" aria-label="10 artır">+10</button></div>
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
      D().sessions = D().sessions.filter((x) => x.id !== s.id); Store.forget(s.id);
      save(); closeModal(); afterDataChange();
    });
    $('#m-save').addEventListener('click', () => {
      const minutes = preciseShort ? s.minutes : U.clamp(parseInt($('#m-min').value, 10) || s.minutes, 1, 720);
      let start = s.start;
      if ($('#m-date')) {
        const [y, mo, d] = $('#m-date').value.split('-').map(Number);
        const [hh, mm] = ($('#m-time').value || '00:00').split(':').map(Number);
        if (y) start = new Date(y, mo - 1, d, hh, mm).getTime();
      }
      const hardBefore = s.hard, subjectBefore = s.subjectId;
      const target = manual ? { id: U.uid(), kind: 'manual' } : D().sessions.find((x) => x.id === s.id) || s;
      Object.assign(target, {
        subjectId: $('#m-subject').value,
        start,
        end: opts.justDone ? s.end : start + minutes * 60000,
        minutes,
        note: $('#m-note').value.trim(),
        hard: s.hard || '', // "zorlandığın yer" kutusu 2.10'da kalktı; eski oturumlardaki yazı korunur
        rating: rating || null,
        mood,
        questions: U.clamp(parseInt($('#m-q').value, 10) || 0, 0, 999),
        updated: Date.now(),
      });
      if (target.planId && target.subjectId !== subjectBefore) delete target.planId; // ders değiştiyse süre o plan maddesine yazılmasın
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
  const runParts = [], runSummary = {}; // bir oturumda konu değiştikçe kaydedilen parçalar; biten oturumun özeti (yalnızca bellekte)
  // "Toplam 1 sa: Matematik 40 dk · Fizik 20 dk" (çok çalışılan ders önce)
  function runSummaryText(run) {
    const per = new Map();
    for (const x of run) { const n = Store.subject(x.subjectId).name; per.set(n, (per.get(n) || 0) + x.minutes); }
    const total = run.reduce((n, x) => n + x.minutes, 0);
    return `Toplam ${U.fmtMin(Math.round(total))}: ` + [...per].sort((a, b) => b[1] - a[1]).map(([n, m]) => `${n} ${U.fmtMin(Math.round(m))}`).join(' · ');
  }
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
  // Plan'daki "Başla ▶": dersi ve hedefi seçip sayacı başlatır.
  // planId: Bugün kartındaki maddeden başlatıldı; süre o maddeye yazılır, sayaç kronometredir (kendiliğinden durmaz).
  function startStudy({ subjectId, intent, kind, planId } = {}) {
    const s = Timer.state();
    if (s.running && s.phase === 'focus') { toast('⏱️', 'Zaten bir oturum sürüyor', 'Önce onu bitir ya da duraklat'); return false; }
    if (!s.fresh || s.phase !== 'focus') {
      if (s.phase === 'focus' && s.elapsed > 120 && !confirm('Duraklatılmış oturum kaydedilmeden sıfırlansın mı?')) return false;
      Timer.reset();
    }
    if (kind && kind !== Timer.state().kind) Timer.setKind(kind);
    if (subjectId != null && (subjectId === '' || D().subjects.some((x) => x.id === subjectId))) Timer.setSubject(subjectId);
    Timer.setIntent(intent || '');
    Timer.setPlan(planId || '');
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
    const plans = D().plans || {};
    const planItems = ['day', 'week', 'month'].flatMap((k) => Object.values(plans[k] || {}).flatMap((v) => (Array.isArray(v) ? v : [])));
    const used = new Set([...D().sessions, ...D().tasks, ...D().notes, ...D().cards, ...D().review, ...(D().questionLogs || []), ...(D().mistakes || []), ...(D().files || []), ...(D().refs || []), ...planItems].map((x) => x && x.subjectId));
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
  // Geri tuşu (Android; iPhone'da kenardan kaydırma): uygulamadan çıkmadan önce açık defteri, şiiri, pencereyi ya da
  // dosyayı kapatır; başka sekmedeysen Çalış'a döner. Bir şey açıkken geçmişte tek bir koruma adımı durur.
  // ======================================================================
  const Geri = (() => {
    let on = false, guard = false, skip = 0, queued = false, leaving = false;
    const shown = (sel) => { const el = $(sel); return el && !el.classList.contains('hidden') ? el : null; };
    const press = (sel) => { const b = $(sel); return b && (() => b.click()); };
    // en üstteki önce
    const layers = [
      () => press('body > .df-sahne:not(.kapaniyor) [data-df="close"]'),
      () => siirEl && (() => { const tam = siirEl.querySelector('.sg-tam'); if (tam) tam.remove(); else closeSiir(); }),
      () => shown('#modal') && dismissModal,
      () => press('body > .dn-sahne:not(.kapaniyor) .dn-perde:not([hidden]) [data-dn="mektup-kapat"]'), // Küçük Dünya: mektup, yer seçimi, oda
      () => press('body > .dn-sahne:not(.kapaniyor) .dn-yerbar:not([hidden]) [data-vazgec]'),
      () => press('body > .dn-sahne:not(.kapaniyor) [data-dn="kapat"]'),
      () => shown('#viewer') && press('#viewer [data-vw="close"]'),
    ];
    function top() {
      for (const l of layers) { const f = l(); if (f) return f; }
      return currentTab !== 'home' ? () => showTab('home') : null;
    }
    function sync() {
      queued = false;
      if (!on || leaving) return;
      const want = !!top();
      if (want && !guard) { try { history.pushState({ lunaGeri: 1 }, ''); guard = true; } catch (e) { /* yok say */ } }
      else if (!want && guard) { guard = false; skip++; history.back(); }
    }
    const later = () => { if (!queued) { queued = true; Promise.resolve().then(sync); } };
    function start() {
      if (typeof history === 'undefined' || !history.pushState || typeof MutationObserver === 'undefined') return; // çok eski tarayıcı
      on = true;
      if (history.state && history.state.lunaGeri) try { history.replaceState(null, ''); } catch (e) { /* yok say */ }
      window.addEventListener('popstate', () => {
        if (leaving) return;
        if (skip) { skip--; return; }
        guard = false;
        const f = top();
        if (f) f();
        later();
      });
      const mo = new MutationObserver(later);
      mo.observe(document.body, { childList: true });
      ['#modal', '#viewer'].forEach((sel) => { if ($(sel)) mo.observe($(sel), { attributes: true, attributeFilter: ['class'] }); });
      later();
    }
    // yenilemeden önce koruma adımı geri alınır: sonra geri tuşu uygulamayı yeniden açmasın, kapatsın
    function reload() {
      leaving = true;
      if (!guard) { location.reload(); return; }
      guard = false;
      window.addEventListener('popstate', () => location.reload(), { once: true });
      history.back();
      setTimeout(() => location.reload(), 600);
    }
    return { start, sync: later, reload };
  })();
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
        if (loveNoteOfDay()) toast('💌', 'Günün gizli notu açıldı!', 'Çalış sekmesinde seni bekliyor');
        else toast('🎉', 'Günlük hedefin tamam!', 'Harikasın, böyle devam 💜');
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
    if (currentTab === 'takvim') renderTakvim();
  }
  // takvimdeki bir hata öbür sekmeleri bozmasın: hata Tanılama'ya yazılır, notlar yerinde kalır
  function renderTakvim() {
    if (!window.TakvimUI) return;
    try { TakvimUI.render(); } catch (e) { ErrLog.add('Takvim: ' + ((e && e.message) || e), 'takvim-ui.js'); }
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
  const MEKTUP_KEY = 'luna-mektup-okundu';
  function mektupOkundu() { try { return localStorage.getItem(MEKTUP_KEY) === '1'; } catch (e) { return false; } }
  function renderMektup() {
    const el = $('#mektup-card');
    if (!el || typeof Messages === 'undefined' || !Messages.mektup) { if (el) el.hidden = true; return; }
    el.hidden = false;
    const partner = D().settings.partner;
    const okundu = mektupOkundu();
    const alt = okundu ? 'İstediğin zaman tekrar okuyabilirsin.'
      : `${partner ? U.esc(partner) + ' senin' : 'Senin'} için bıraktı. Hazır olduğunda aç.`;
    el.classList.toggle('yeni', !okundu);
    el.innerHTML = `<h2>💜 ${okundu ? 'Mektubun' : 'Sana bir mektup var'}</h2>
      <p class="muted small">${alt}</p>
      <button class="btn soft" type="button" id="mektup-ac">Mektubu aç 💜</button>`;
    $('#mektup-ac').addEventListener('click', openMektup);
  }
  function openMektup() {
    const m = Messages.mektup;
    const partner = D().settings.partner;
    const govde = m.paragraflar.map((p) => `<p>${U.esc(p)}</p>`).join('');
    openModal(`<div class="mektup">
        <h3 class="mektup-baslik">${U.esc(m.baslik)}</h3>
        <div class="mektup-govde">${govde}</div>
        <p class="mektup-imza">${partner ? '— ' + U.esc(partner) + ' 💜' : '💜'}</p>
      </div>
      <div class="modal-actions"><button class="btn primary" type="button" data-act="ok">Kapat</button></div>`);
    $('#modal-card [data-act="ok"]').addEventListener('click', closeModal);
    try { localStorage.setItem(MEKTUP_KEY, '1'); } catch (e) { /* özel sekme */ }
    renderMektup();
  }
  // ======================================================================
  // Eşeğin'den şiir: gökkuşağı zambak + gece gökyüzünde kelime kelime açılan şiir
  // ======================================================================
  const SIIR_KEY = 'luna-siir-okundu', SIIR_SURPRIZ = 'luna-siir-gosterildi';
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* özel sekme */ } };
  let siirEl = null, siirOnceki = null, siirIlk = false;
  function renderSiir() {
    const el = $('#siir-card'), m = typeof Messages !== 'undefined' && Messages.siir;
    if (!el) return;
    if (!m) { el.hidden = true; return; }
    el.hidden = false;
    const okundu = lsGet(SIIR_KEY) === '1';
    el.classList.toggle('yeni', !okundu);
    el.innerHTML = `<div class="siir-kart-ic">
        <div class="siir-kart-yazi">
          <h2>🌸 ${okundu ? 'Şiirin' : 'Sana bir şiir var'}</h2>
          <p class="small">${okundu ? 'Geceleri sahnenin gökyüzünde parlayan altın yıldıza dokunursan da açılır.' : `${U.esc(m.imza)} bıraktı, yalnızca sana. Hazır olduğunda aç.`}</p>
          <button class="btn primary siir-ac" type="button" id="siir-ac">Şiiri aç ✨</button>
        </div>
        <img class="siir-kart-resim" src="${m.kucuk}" alt="" width="108" height="105" decoding="async">
      </div>`;
    $('#siir-ac').addEventListener('click', () => openSiir());
  }
  function siirTus(e) {
    if (!siirEl) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); const tam = siirEl.querySelector('.sg-tam'); if (tam) tam.remove(); else closeSiir(); }
  }
  function openSiir() {
    const m = typeof Messages !== 'undefined' && Messages.siir;
    if (!m) return;
    if (!siirEl) siirOnceki = document.activeElement; // "Baştan" önceki odağı silmesin
    if (siirEl) closeSiir(true);
    const cols = ['#ffe27a', '#ffd06b', '#ff9bd8', '#9fe8ff', '#c9a6ff', '#ffffff'];
    let gok = '';
    for (let i = 0; i < 48; i++) {
      gok += `<i class="sg-yildiz${i % 5 === 0 ? ' iri' : ''}" style="left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 100).toFixed(1)}%;--c:${cols[i % cols.length]};--g:${(Math.random() * 3).toFixed(2)}s;--s:${(2.2 + Math.random() * 2.8).toFixed(2)}s"></i>`;
    }
    // her kelime sırayla belirir; satır sonlarında kısa bir nefes
    let d = 1.8;
    const satirlar = m.satirlar.map((line) => {
      const ws = line.split(' ').map((w) => { const h = `<span style="--d:${d.toFixed(2)}s">${U.esc(w)}</span>`; d += 0.2; return h; });
      d += 0.6;
      return `<p class="sg-satir">${ws.join(' ')}</p>`;
    }).join('');
    const imzaD = d + 0.2, altD = imzaD + 1.1;
    siirEl = document.createElement('div');
    siirEl.className = 'siir-gece';
    siirEl.setAttribute('role', 'dialog');
    siirEl.setAttribute('aria-modal', 'true');
    siirEl.setAttribute('aria-label', `${m.imza}'den şiir`);
    siirEl.tabIndex = -1;
    siirEl.innerHTML = `<div class="sg-gok" aria-hidden="true">${gok}</div>
      <button class="sg-x" type="button" data-act="kapat" aria-label="Kapat">✕</button>
      <div class="sg-sahne">
        <div class="sg-siir">${satirlar}<p class="sg-imza" style="--d:${imzaD.toFixed(2)}s">-${U.esc(m.imza)}</p></div>
        <div class="sg-cicek-kutu"><img class="sg-cicek" src="${m.cicek}" alt="Gökkuşağı renklerinde açmış bir zambak"></div>
      </div>
      <div class="sg-alt" style="--d:${altD.toFixed(2)}s">
        <button class="btn soft" type="button" data-act="tam">🖼️ Resmin tamamı</button>
        <button class="btn soft" type="button" data-act="tekrar">✨ Baştan</button>
        <button class="btn primary" type="button" data-act="kapat">Kapat</button>
      </div>`;
    siirEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || !siirEl) return;
      const act = b.dataset.act;
      if (act === 'kapat') closeSiir();
      else if (act === 'tekrar') openSiir();
      else if (act === 'geri') { const tam = siirEl.querySelector('.sg-tam'); if (tam) tam.remove(); }
      else if (act === 'tam' && !siirEl.querySelector('.sg-tam')) {
        const tam = document.createElement('div');
        tam.className = 'sg-tam';
        tam.innerHTML = `<img src="${m.resim}" alt="Şiir ve gökkuşağı zambak">
          <div class="sg-tam-alt">
            <a class="btn soft" href="${m.resim}" download="zambak-siir.webp">⬇️ Telefona kaydet</a>
            <button class="btn primary" type="button" data-act="geri">Geri</button>
          </div>`;
        siirEl.appendChild(tam);
      }
    });
    document.body.appendChild(siirEl);
    document.body.classList.add('siir-acik');
    window.addEventListener('keydown', siirTus, true);
    try { siirEl.focus({ preventScroll: true }); } catch (e) { /* eski tarayıcı */ }
    siirIlk = siirIlk || lsGet(SIIR_KEY) !== '1'; // ilk okumada "Baştan" denirse Luna'nın sözü kaybolmasın
    lsSet(SIIR_KEY, '1');
    renderSiir();
  }
  function closeSiir(hemen) {
    if (!siirEl) return;
    const el = siirEl;
    siirEl = null;
    window.removeEventListener('keydown', siirTus, true);
    document.body.classList.remove('siir-acik');
    if (hemen) el.remove();
    else { el.classList.add('kapaniyor'); setTimeout(() => el.remove(), 360); }
    if (!hemen && siirOnceki) {
      const geri = siirOnceki.isConnected ? siirOnceki : siirOnceki.id ? document.getElementById(siirOnceki.id) : null;
      siirOnceki = null;
      if (geri && geri.focus) { try { geri.focus({ preventScroll: true }); } catch (e) { /* yok say */ } }
    }
    // ilk okumadan sonra Luna da bir şey söyler
    if (!hemen && siirIlk) {
      siirIlk = false;
      setTimeout(() => {
        if (App.isFocusing() || siirEl) return;
        Scene.say('Bu şiiri sana Eşeğin yazdı anneciğim 💜 Geceleri gökyüzündeki o altın yıldız da artık sizin.', { emotion: 'tender', ms: 9000 });
        lastMsgAt = Date.now();
      }, 900);
    }
  }
  // İlk açılışta bir kez kendiliğinden açılır (hediye gibi); o an ders sürüyorsa ya da bir pencere açıksa bekler
  let siirDeneme = 0;
  function siirSurpriz() {
    if (!(typeof Messages !== 'undefined' && Messages.siir) || lsGet(SIIR_KEY) === '1' || lsGet(SIIR_SURPRIZ) === '1') return;
    const viewer = $('#viewer');
    const mesgul = App.isFocusing() || !$('#modal').classList.contains('hidden') || (viewer && !viewer.classList.contains('hidden')) || siirEl || document.hidden;
    if (mesgul) { if (++siirDeneme < 2400) setTimeout(siirSurpriz, 1500); return; } // "Luna güncellendi" kapanınca hemen gelsin; uzun bir odak oturumunda da vazgeçmesin
    lsSet(SIIR_SURPRIZ, '1');
    openSiir();
  }
  function renderHome() {
    const goal = D().settings.dailyGoal;
    const mins = Stats.minutesOn(new Date());
    const pct = Math.min(100, Math.floor((mins / goal) * 100)); // %100 ancak hedef gerçekten dolunca
    const todayKey = U.dateKey(new Date());
    // YKS modunda Bugün kartı günün programıdır (Plan'da o güne yazılan dersler ve konular); halka da planın yüzdesini
    // gösterir. Bugün için plan yoksa halka boş kalır ve süre yazmaz (süre yalnızca sayaçta); dönem modunda halka günlük süre hedefidir.
    const program = !programMode() && !!window.PlanlarUI;
    const plan = program ? Planlar.stats(Planlar.list('day', todayKey)) : null;
    const byPlan = !!(plan && plan.total);
    const ring = byPlan ? plan.pct : program ? 0 : pct;
    $('#goal-ring').style.setProperty('--p', ring);
    $('#goal-ring').classList.toggle('done', ring >= 100);
    $('#goal-pct').textContent = ring >= 100 ? '★' : ring + '%';
    $('#today-min').textContent = U.fmtMin(todayMinutes());
    $('#goal-text').textContent = byPlan ? (plan.done === plan.total ? 'Bugünün planı tamam! 🎉' : `Planın: ${plan.done}/${plan.total} madde tamam`)
      : program ? 'Bugün için henüz plan yok'
      : pct >= 100 ? `Hedef (${U.fmtMin(goal)}) tamam! 🎉` : `Hedefe ${U.fmtMin(goal - mins)} kaldı`;
    const today = D().sessions.filter((s) => U.dateKey(s.start) === todayKey).sort((a, b) => b.start - a.start);
    const qToday = today.reduce((n, s) => n + (+s.questions || 0), 0) + Planlar.questionEntries('day', U.dateKey(new Date())).reduce((n, x) => n + x.questions, 0);
    $('#today-sessions-count').textContent = !program && (today.length || qToday) ? `${today.length} oturum${qToday ? ` · ${qToday} soru ✍️` : ''}` : '';
    $('#day-timeline').innerHTML = timelineHtml(new Date(), true);
    // YKS modunda Çalış ekranında süre yalnızca sayaçta: toplam ve saat şeridi İlerleme'deki gün gün kayıtta
    $('#today-min').classList.toggle('hidden', program);
    $('#day-timeline').classList.toggle('hidden', program);
    $('#today-legacy').classList.toggle('hidden', program);
    $('#today-program').classList.toggle('hidden', !program);
    if (program) {
      // durmuş sayaçtaki seçim bitmiş, silinmiş ya da başka güne ait bir maddeyi gösteriyorsa sessizce kalkar
      const ts = Timer.state();
      if (ts.planId && ts.fresh && !Planlar.list('day', todayKey).some((x) => x.id === ts.planId && !x.done && !x.moved)) Timer.setPlan('');
      const el = $('#today-program');
      try { PlanlarUI.renderProgram(el); } catch (e) { ErrLog.add('Bugünün programı: ' + ((e && e.message) || e), 'planlar-ui.js'); el.innerHTML = '<p class="muted small">Program şu an gösterilemedi; kayıtların güvende.</p>'; el.__mpHtml = ''; }
      markLivePlan();
    } else {
      $('#today-sessions-label').textContent = today.length ? `Bugünün oturumları (${today.length})` : 'Bugünün oturumları';
      $('#today-list').innerHTML = today.length ? today.map((s) => sessionItem(s)).join('') : '<li class="empty" style="display:block">Bugün henüz oturum yok. Luna seni bekliyor 🐾</li>';
      renderSubjectTiles(today);
    }
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
    renderMektup();
    if (window.DunyaUI) { try { DunyaUI.kart(); } catch (e) { ErrLog.add('Küçük Dünya: ' + ((e && e.message) || e), 'dunya-ui.js'); } }
    renderSiir();
    renderWelcome(mins, pct);
    const tp = $('#today-plan');
    // plan kartındaki bir hata ana sayfayı (ve açılışı) bozmasın: kart sade bir notla kalır, kayıtlar yerinde
    const safePlan = (f) => { try { f(); } catch (e) { ErrLog.add('Bugünün planı: ' + ((e && e.message) || e), 'planlar-ui.js'); tp.innerHTML = '<h2>🗓️ Bugünün planı</h2><p class="muted small">Plan şu an gösterilemedi; kayıtların güvende.</p>'; } };
    // YKS modunda günün planı artık Bugün kartında (yukarıda); bu kart yalnızca dönem modunda kullanılır
    if (programMode()) { tp.classList.remove('hidden'); UniUI.renderToday(tp); if (window.PlanlarUI) safePlan(() => PlanlarUI.appendToday(tp)); }
    else tp.classList.add('hidden');
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
      : yksMode && days === 0 ? 'Bugün o gün! 💛 Derin bir nefes al, sen bu yola uzun zamandır hazırlanıyorsun. Luna yanında 🐾'
      : yksMode && days != null && days > 0 ? Messages.daily('yks', { days })
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
  // ---------- İlerleme: gün gün çalışmaların ----------
  // ---------- İlerleme: haftanın grafiği ve gün gün çalışmalar ----------
  // Dik sütunlar: üstte o gün ne kadar çalışıldığı, altta gün; sütun o gün çalışılan derslerin renkleriyle bölünür.
  // Altında gün gün dersler. Bir güne (sütuna ya da satırına) dokununca altında o günün pastası ve ayrıntısı açılır:
  // ders ders, konu konu saat, dakika, saniye. Sayaç çalışırken bugünün süreleri saniye saniye ilerler; bunun için
  // düğmeler hiç yeniden yaratılmaz, yalnızca içleri güncellenir (dokunuşlar kaybolmaz).
  let weekOff = 0, openDay = '', chartDay = '', logCount = 14; // chartDay: grafikte dokunulan gün (pastası grafiğin altında)
  const weekKey = () => Planlar.shift('week', Planlar.keyOf('week', new Date()), weekOff);
  const subjKey = (x) => Store.subject(x.subjectId).id; // silinmiş dersler tek "Genel"de toplanır
  const subjName = (id) => (id ? Store.subject(id).name : 'Genel');
  const BAR_H = 150, PLOT_H = 168; // y ekseninin boyu ve sütunun üstündeki harfle birlikte çizim alanı (px)
  // y ekseni: 15 dk, 30 dk, 1 sa, 2 sa … aralıklarla en çok 4-5 çizgi
  function weekAxis(maxSec) {
    const step = [900, 1800, 3600, 7200, 10800, 14400].find((x) => maxSec / x <= 4) || 21600;
    const top = Math.max(step, Math.ceil(maxSec / step) * step), ticks = [];
    for (let t = 0; t <= top; t += step) ticks.push(t);
    return { top, ticks };
  }
  const tickLabel = (t) => (t === 0 ? '0' : t < 3600 ? `${t / 60} dk` : `${U.num(t / 3600)} sa`);
  const axisY = (ax) => ax.ticks.map((t) => `<span style="bottom:${((t / ax.top) * BAR_H).toFixed(1)}px">${tickLabel(t)}</span>`).join('');
  const axisGrid = (ax) => ax.ticks.map((t) => `<i${t === 0 ? ' class="base"' : ''} style="bottom:${((t / ax.top) * BAR_H).toFixed(1)}px"></i>`).join('');
  // sütunların üstündeki kısaltma: M, F, T … (Türkçe ile Tarih gibi aynı harfle başlayanlar Tü, Ta)
  function shortNames(ids) {
    const up = ids.map((id) => subjName(id).toLocaleUpperCase('tr-TR'));
    return new Map(ids.map((id, i) => {
      let n = 1;
      while (n < up[i].length && up.some((o, j) => j !== i && o.startsWith(up[i].slice(0, n)))) n++;
      const raw = subjName(id).slice(0, n);
      return [id, raw.charAt(0).toLocaleUpperCase('tr-TR') + raw.slice(1).toLocaleLowerCase('tr-TR')];
    }));
  }
  function weekData() {
    const wk = weekKey(), { from, to } = Planlar.range('week', wk), today = U.dateKey(new Date());
    const days = Planlar.daysOf('week', wk).map((k) => ({ k, d: new Date(k + 'T12:00:00'), per: new Map(), sec: 0 }));
    const bySub = new Map();
    for (const x of D().sessions.concat(liveRun())) {
      if (!x || !(x.start >= from && x.start < to)) continue;
      const day = days.find((y) => y.k === U.dateKey(x.start));
      if (!day) continue;
      const sec = Planlar.secOf(x), id = subjKey(x);
      day.per.set(id, (day.per.get(id) || 0) + sec); day.sec += sec;
      bySub.set(id, (bySub.get(id) || 0) + sec);
    }
    // dersler her gün ve her an aynı sırada (ders listesindeki sıra): sütunlar çalışırken yer değiştirmez
    const order = (id) => { const i = D().subjects.findIndex((x) => x.id === id); return i < 0 ? 999 : i; };
    const subs = [...bySub.entries()].filter(([, v]) => v >= 1).sort((a, b) => order(a[0]) - order(b[0])).map(([id, sec]) => ({ id, sec }));
    const total = days.reduce((n, d) => n + d.sec, 0), maxBar = Math.max(60, ...days.flatMap((d) => [...d.per.values()]));
    return { wk, days, today, total, subs, short: shortNames(subs.map((x) => x.id)), active: days.filter((d) => d.sec >= 1).length, ax: weekAxis(maxBar) };
  }
  const barsOf = (d, w) => w.subs.filter((x) => (d.per.get(x.id) || 0) >= 1).length;
  // sütun kalınlığı: haftanın bütün sütunları ekrana sığsın diye ders sayısına göre (5–14 px); yine de sığmazsa yana kayar
  function fitBars(el, w) {
    const sc = el.querySelector('.hg-scroll'), avail = sc && sc.clientWidth ? sc.clientWidth : Math.max(220, (el.clientWidth || 360) - 64);
    for (w.bw = 14; w.bw > 5; w.bw--) if (w.days.reduce((n, d) => n + colWidth(d, w), 0) <= avail) break;
  }
  function colInner(d, w) {
    const bars = w.subs.filter((x) => (d.per.get(x.id) || 0) >= 1).map((x) => {
      const v = d.per.get(x.id), h = Math.max(4, Math.round((v / w.ax.top) * BAR_H));
      return `<span class="hg-b" style="height:${h}px;--c:${U.esc(Store.subject(x.id).color)}"><em>${U.esc(w.short.get(x.id))}</em></span>`;
    }).join('');
    return `<span class="hg-plot" style="height:${PLOT_H}px">${bars}</span>
      <span class="hg-day">${d.k === w.today ? 'Bugün' : U.DAYS_SHORT[d.d.getDay()]}</span><small>${d.d.getDate()}</small>`;
  }
  const colLabel = (d) => `${d.d.getDate()} ${U.MONTHS[d.d.getMonth()]} ${U.DAYS[d.d.getDay()]}: ${d.sec >= 1 ? U.fmtSec(d.sec) : 'çalışma yok'}`;
  const colWidth = (d, w) => Math.max(32, barsOf(d, w) * (w.bw + 3) + 5);
  const weekTotal = (w) => (w.total >= 1
    ? `<b>${U.fmtSec(w.total)}</b><span>${weekOff === 0 ? 'bu hafta toplam' : 'o hafta toplam'} · ${w.active} gün çalıştın</span>`
    : `<b>—</b><span>${weekOff === 0 ? 'Bu hafta henüz çalışma yok. Sayacı başlattığında burada belirir 🐾' : 'O hafta çalışma kaydı yok.'}</span>`);
  const weekLegend = (w) => w.subs.map((x) => `<li style="--c:${U.esc(Store.subject(x.id).color)}"><i>${U.esc(w.short.get(x.id))}</i><span>${U.esc(subjName(x.id))}</span><b>${U.fmtSec(x.sec)}</b></li>`).join('');
  function renderWeek(full = false) {
    const el = $('#hafta-ozet');
    if (!el || !window.Planlar) return;
    const w = weekData(), cols = el.querySelectorAll('.hg-col');
    fitBars(el, w);
    if (!full && el.dataset.wk === w.wk && cols.length === w.days.length) {
      const box = el.querySelector('.hg-cols');
      box.style.setProperty('--bw', w.bw + 'px'); box.classList.toggle('narrow', w.bw < 9);
      // yerinde güncelle: düğmeler kalır, kaydırma yeri bozulmaz (sayaç çalışırken her saniye)
      w.days.forEach((d, i) => {
        cols[i].innerHTML = colInner(d, w); cols[i].style.minWidth = colWidth(d, w) + 'px';
        cols[i].setAttribute('aria-label', colLabel(d)); cols[i].classList.toggle('sel', d.k === chartDay);
      });
      patchChartDay();
      el.querySelector('.hg-total').innerHTML = weekTotal(w);
      el.querySelector('.hg-y').innerHTML = axisY(w.ax);
      el.querySelector('.hg-grid').innerHTML = axisGrid(w.ax);
      el.querySelector('.hg-legend').innerHTML = weekLegend(w);
      return;
    }
    el.dataset.wk = w.wk;
    const lab = Planlar.label('week', w.wk);
    el.innerHTML = `<div class="hg-head"><div><h2>📊 ${lab.rel || 'Hafta'}</h2><small>${U.esc(lab.title)}</small></div>
      <div class="hg-nav"><button type="button" class="icon-btn" data-hg="-1" aria-label="Önceki hafta">‹</button><button type="button" class="icon-btn" data-hg="1" aria-label="Sonraki hafta"${weekOff >= 0 ? ' disabled' : ''}>›</button></div></div>
      <p class="hg-total">${weekTotal(w)}</p>
      <div class="hg-chart"><div class="hg-y" style="height:${PLOT_H}px" aria-hidden="true">${axisY(w.ax)}</div>
      <div class="hg-scroll"><div class="hg-cols${w.bw < 9 ? ' narrow' : ''}" style="--bw:${w.bw}px"><div class="hg-grid" style="height:${PLOT_H}px" aria-hidden="true">${axisGrid(w.ax)}</div>${w.days.map((d) => `<button type="button" class="hg-col${d.k === w.today ? ' today' : ''}${d.k === chartDay ? ' sel' : ''}" data-hg-day="${d.k}" style="min-width:${colWidth(d, w)}px" aria-label="${colLabel(d)}"${d.k > w.today ? ' disabled' : ''}>${colInner(d, w)}</button>`).join('')}</div></div></div>
      <div class="hg-detail"${chartDay ? '' : ' hidden'}>${chartDayHtml()}</div>
      <ul class="hg-legend">${weekLegend(w)}</ul>`;
    // ilk çizimde genişlik tahmindi: sığmadıysa gerçek genişliğe göre sütunları incelt
    const sc = el.querySelector('.hg-scroll'), t = el.querySelector('.hg-col.today');
    if (sc && sc.scrollWidth > sc.clientWidth + 1 && w.bw > 5) renderWeek();
    // yine de sığmazsa (çok ders) bugünün olduğu yere kaydır
    if (sc && t && sc.scrollWidth > sc.clientWidth) sc.scrollLeft = Math.max(0, t.offsetLeft - sc.clientWidth + t.offsetWidth + 8);
  }

  // Bir günün bilgisi: ders ders saniye, plan maddeleri ve maddelere düşen süre
  function dayInfo(k, today) {
    const { from, to } = Planlar.range('day', k), inDay = (x) => x && x.start >= from && x.start < to;
    const saved = D().sessions.filter(inDay), live = (k === today ? liveRun() : []).filter(inDay);
    const per = new Map();
    for (const x of saved.concat(live)) { const id = subjKey(x); per.set(id, (per.get(id) || 0) + Planlar.secOf(x)); }
    const items = Planlar.list('day', k), byId = new Map(items.map((x) => [x.id, x]));
    const ids = new Set([...per.keys(), ...items.map((x) => Store.subject(x.subjectId).id)]);
    const rows = [...ids].map((id) => ({ id, sec: per.get(id) || 0, items: items.filter((x) => Store.subject(x.subjectId).id === id) }))
      .filter((r) => r.sec >= 1 || r.items.length).sort((a, b) => b.sec - a.sec);
    const q = saved.reduce((n, x) => n + (+x.questions || 0), 0) + Planlar.questionEntries('day', k).reduce((n, x) => n + x.questions, 0);
    return { saved, live, rows, items, byId, q, total: [...per.values()].reduce((a, b) => a + b, 0), work: Planlar.dayWork(k, live, true), pst: Planlar.stats(items) };
  }
  function dayHead(k, today, f) {
    const d = new Date(k + 'T12:00:00'), yday = U.dateKey(U.addDays(U.dayStart(new Date()), -1));
    const studied = f.rows.filter((r) => r.sec >= 1);
    return `<span class="go-dtitle"><b>${d.getDate()} ${U.MONTHS[d.getMonth()]} ${U.DAYS[d.getDay()]}</b>${k === today ? '<small>bugün</small>' : k === yday ? '<small>dün</small>' : ''}</span>
      <span class="go-dtotal">${f.total >= 1 ? U.fmtSec(f.total) : '—'}</span><span class="go-chev" aria-hidden="true">▾</span>
      <span class="go-subs">${studied.length ? studied.map((r) => `<span style="--c:${U.esc(Store.subject(r.id).color)}"><i></i>${U.esc(subjName(r.id))}</span>`).join('')
        : `<span class="go-none">${k === today ? 'Henüz çalışma yok' : 'Çalışma yok'}</span>`}</span>`;
  }
  function dayDetail(k, today, f) {
    const studied = f.rows.filter((r) => r.sec >= 1);
    let acc = 0;
    const arcs = studied.map((r) => {
      const p = (r.sec / f.total) * 100, c = `<circle cx="21" cy="21" r="15.9155" stroke="${U.esc(Store.subject(r.id).color)}" stroke-dasharray="${p.toFixed(3)} ${(100 - p).toFixed(3)}" stroke-dashoffset="${(25 - acc).toFixed(3)}"></circle>`;
      acc += p;
      return c;
    }).join('');
    const mm = Math.round(f.total / 60), center = mm >= 60 ? [`${Math.floor(mm / 60)} sa`, mm % 60 ? `${mm % 60} dk` : ''] : [mm ? `${mm} dk` : `${Math.round(f.total)} sn`, ''];
    const topic = (it) => {
      const m = f.work.items[it.id] || 0;
      const tag = it.moved ? '<em class="go-eksik">eksik kaldı → ertesi güne</em>' : it.done ? '<em class="go-tamam">✓ bitti</em>' : '';
      return `<li><span>${U.esc(it.title)}</span><b>${m >= 1 ? U.fmtSec(m) : '—'}</b>${tag}</li>`;
    };
    const facts = [];
    if (f.saved.length || f.live.length) facts.push(`${f.saved.length + (f.live.length ? 1 : 0)} oturum`);
    if (f.q) facts.push(`${f.q} soru`);
    if (f.pst.total || f.pst.moved) facts.push(`plan ${f.pst.done}/${f.pst.total} tamam${f.pst.moved ? ` · ${f.pst.moved} eksik kaldı` : ''}`);
    if (!f.rows.length) return `<p class="muted small">${k === today ? 'Bugün henüz çalışma yok. Sayacı başlattığında buraya yazılır 🐾' : 'O gün çalışma kaydı yok.'}</p>`;
    return `<div class="go-pie">${studied.length ? `<svg class="hg-donut" viewBox="0 0 42 42" role="img" aria-label="O günün ders dağılımı"><circle class="hg-ring" cx="21" cy="21" r="15.9155"></circle>${arcs}
        <text class="go-pie-t" x="21" y="${center[1] ? 20 : 22.6}">${center[0]}</text>${center[1] ? `<text class="go-pie-t" x="21" y="26">${center[1]}</text>` : ''}</svg>` : ''}
      <ul class="go-legend">${f.rows.map((r) => `<li style="--c:${U.esc(Store.subject(r.id).color)}"><div class="go-lrow"><i></i><span>${U.esc(subjName(r.id))}</span><em class="go-tv"><b>${r.sec >= 1 ? U.fmtSec(r.sec) : '—'}</b><small>${r.sec >= 1 && f.total >= 1 ? `%${Math.round((r.sec / f.total) * 100)}` : ''}</small></em></div>
        ${r.items.length ? `<ul class="go-topics">${r.items.map(topic).join('')}</ul>` : ''}</li>`).join('')}</ul></div>
      ${facts.length ? `<p class="go-facts">${facts.join(' · ')}</p>` : ''}`;
  }
  function dayBlock(k, today) {
    const f = dayInfo(k, today), open = k === openDay;
    return `<section class="go-day${k === today ? ' today' : ''}${open ? ' open' : ''}" data-day="${k}">
      <button type="button" class="go-dhead" data-go-day="${k}" aria-expanded="${open}">${dayHead(k, today, f)}</button>
      ${open ? `<div class="go-detail">${dayDetail(k, today, f)}</div>` : ''}</section>`;
  }
  // bir günün satırını yerinde günceller (düğme kalır); gün listede yoksa false
  function patchDay(k, today) {
    const sec = $(`#gun-ozet .go-day[data-day="${k}"]`);
    if (!sec) return false;
    const f = dayInfo(k, today);
    sec.querySelector('.go-dhead').innerHTML = dayHead(k, today, f);
    const det = sec.querySelector('.go-detail');
    if (det) det.innerHTML = dayDetail(k, today, f);
    return true;
  }
  function renderDaySummary() {
    const el = $('#gun-ozet');
    if (!el || !window.Planlar) return;
    const today = U.dateKey(new Date());
    // çalışma ya da plan maddesi olan günler (bugün her zaman en üstte; grafikte dokunulan gün de)
    const keys = new Set([today]);
    for (const x of D().sessions) if (x && x.start) keys.add(U.dateKey(x.start));
    const pd = (D().plans && D().plans.day) || {};
    for (const k of Object.keys(pd)) if (Planlar.list('day', k).length) keys.add(k);
    const days = [...keys].filter((k) => Planlar.isKey('day', k) && k <= today).sort().reverse();
    if (openDay) logCount = Math.max(logCount, Math.ceil((days.indexOf(openDay) + 1) / 14) * 14);
    const shown = days.slice(0, logCount);
    el.innerHTML = `<h2>📋 Gün gün çalışmaların</h2><p class="muted small go-hint">Bir güne dokun, o günün ayrıntısı açılsın.</p>
      <div class="go-days">${shown.map((k) => dayBlock(k, today)).join('')}</div>
      ${days.length > shown.length ? `<button type="button" class="btn soft wide" data-go="more">Daha eski günler (${days.length - shown.length})</button>` : ''}`;
  }
  // listede bir güne dokununca o gün yerinde açılır (bir anda tek gün)
  function openDayDetail(k) {
    openDay = openDay === k ? '' : k;
    renderDaySummary();
    const sec = openDay && $(`#gun-ozet .go-day[data-day="${openDay}"]`);
    if (sec) sec.scrollIntoView({ block: 'nearest' });
  }
  // grafikte bir güne dokununca hemen altında o günün pastası ve ayrıntısı açılır; aynı güne ya da ×'e dokununca kapanır
  function chartDayTitle(k) {
    const d = new Date(k + 'T12:00:00'), today = U.dateKey(new Date());
    return `${d.getDate()} ${U.MONTHS[d.getMonth()]} ${U.DAYS[d.getDay()]}${k === today ? ' · bugün' : ''}`;
  }
  function chartDayHtml() {
    if (!chartDay) return '';
    const today = U.dateKey(new Date()), f = dayInfo(chartDay, today);
    return `<div class="hg-dhead"><div><b>${chartDayTitle(chartDay)}</b><span class="hg-dtotal">${f.total >= 1 ? U.fmtSec(f.total) : '—'}</span></div>
      <button type="button" class="icon-btn" data-hg-close aria-label="Kapat">×</button></div>
      <div class="hg-dbody">${dayDetail(chartDay, today, f)}</div>`;
  }
  // saniye saniye: başlık ve kapatma düğmesi kalır, yalnızca süre ve ayrıntı yenilenir
  function patchChartDay() {
    const box = $('#hafta-ozet .hg-detail');
    if (!box || !chartDay) return;
    const t = box.querySelector('.hg-dtotal'), b = box.querySelector('.hg-dbody');
    if (!t || !b) { box.innerHTML = chartDayHtml(); return; }
    const today = U.dateKey(new Date()), f = dayInfo(chartDay, today);
    t.textContent = f.total >= 1 ? U.fmtSec(f.total) : '—';
    b.innerHTML = dayDetail(chartDay, today, f);
  }
  function toggleChartDay(k) {
    chartDay = chartDay === k ? '' : k;
    const box = $('#hafta-ozet .hg-detail');
    $$('#hafta-ozet .hg-col').forEach((c) => c.classList.toggle('sel', c.dataset.hgDay === chartDay));
    if (!box) return;
    box.hidden = !chartDay;
    box.innerHTML = chartDayHtml();
    if (chartDay) box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function renderProgress() {
    renderWeek(true);
    renderDaySummary();
    renderReport();
    renderCharts();
    renderBadges();
  }
  // 2.13.2'de Günlük çalışma, Saatlere göre verim, Dersler, Haftanın günleri ve haftalık zaman çizelgesi kartları kalktı
  function renderCharts() {
    const sm = Stats.summary(progressDays);
    renderCalendar();
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
  }
  // Tekrar listesi 2.10'da Plan sekmesinden kalktı (kayıtlar D().review'da silinmeden durur)
  function renderReview() {
    if (!$('#review-list')) return;
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
  // Görevler kartı 2.13.1'de Plan'dan kalktı; kayıtlı görevler silinmez, yalnızca gösterilmez
  function renderTasks() {
    if (!$('#task-list')) return;
    const list = D().tasks.slice().sort(taskSort);
    $('#task-list').innerHTML = list.length ? list.map(taskItem).join('') : '<li class="empty" style="display:block">Henüz görev yok. Küçük ve net görevler yaz: "10 paragraf sorusu" gibi.</li>';
  }
  function bindTasks() {
    if ($('#task-form')) $('#task-form').addEventListener('submit', (e) => {
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
        D().tasks = D().tasks.filter((x) => x.id !== t.id); Store.forget(t.id);
      } else if (e.target.classList.contains('check')) {
        t.done = e.target.checked;
        t.doneAt = t.done ? Date.now() : null;
        D().tasksDone = Math.max(0, (D().tasksDone || 0) + (t.done ? 1 : -1));
        if (t.done) { Sound.soft(); Scene.say(U.pick(['Bir görev daha bitti! ✅', 'Tik! Harikasın 🐾', 'Listeden bir tane eksildi, süper!'])); }
      } else return;
      save(); renderTasks(); renderHome(); checkBadges();
    };
    if ($('#task-list')) $('#task-list').addEventListener('click', onTaskClick);
    if ($('#clear-done')) $('#clear-done').addEventListener('click', () => {
      D().tasks = D().tasks.filter((t) => !t.done);
      save(); renderTasks(); renderHome();
    });
    // tekrar listesi (yalnızca eski işaretleme varsa)
    if ($('#review-form')) $('#review-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const text = $('#review-input').value.trim();
      if (!text) return;
      D().review.unshift({ id: U.uid(), text, subjectId: '', created: Date.now(), done: false });
      save(); $('#review-input').value = ''; renderReview();
    });
    if ($('#review-list')) $('#review-list').addEventListener('click', (e) => {
      const li = e.target.closest('li[data-id]');
      if (!li) return;
      const r = D().review.find((x) => x.id === li.dataset.id);
      if (!r) return;
      if (e.target.classList.contains('x')) { D().review = D().review.filter((x) => x.id !== r.id); Store.forget(r.id); }
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
    return p ? `https://open.spotify.com/embed/${p.type}/${p.id}?utm_source=generator` : null;
  }
  function loadSpotify() {
    const p = spotifyParts(D().settings.spotify);
    const src = spotifyEmbed(D().settings.spotify);
    if (window.SpotifyLink) SpotifyLink.showSongs(D().settings.spotify);
    if (window.SpotifyPlayback?.prepare()) {
      spotifyLoaded = true;
      $('#music-now').textContent = 'Şarkını seç';
      return;
    }
    // "Spotify'da aç": telefonda uygulama yüklüyse doğrudan uygulamada açılır (önizleme yerine tam şarkılar)
    $('#spotify-frame').innerHTML = src
      ? `<iframe title="Spotify oynatıcı" src="${U.esc(src)}" width="100%" height="900" style="border:0;border-radius:12px" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
        <a class="btn soft sp-open" href="${U.esc(appUrl('spotify'))}" target="_blank" rel="noopener" data-app="spotify">Spotify'da dinle ↗</a>
        <p class="hint">Burada oynatmak için ▶ düğmesine dokun. Spotify, hesabına ve tarayıcıya göre önizleme sunabilir. Tam dinleme için Spotify’da dinle seçeneğini kullanabilirsin.</p>`
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
    $('#set-focus').value = Math.round((Number.isInteger(s.countdownSeconds) && s.countdownSeconds > 0 ? s.countdownSeconds : s.focus * 60) / 60);
    $('#set-short').value = s.short;
    $('#set-long').value = s.long;
    $('#set-every').value = s.longEvery;
    $('#set-autobreak').checked = s.autoBreak;
    $('#set-autofocus').checked = s.autoFocus;
    $('#set-sound').checked = s.sound;
    $('#set-timer-meow').innerHTML = Sound.meows.map(m => `<option value="${m.id}">${U.esc(m.label)}</option>`).join('');
    $('#set-timer-meow').value = Sound.meows.some(m => m.id === s.timerMeow) ? s.timerMeow : 'luna';
    $('#set-timer-vibrate').checked = s.timerVibrate !== false;
    $('#set-timer-vibration').innerHTML = Sound.vibrations.map(v => `<option value="${v.id}">${U.esc(v.label)}</option>`).join('');
    $('#set-timer-vibration').value = Sound.vibrations.some(v => v.id === s.timerVibration) ? s.timerVibration : 'double';
    $('#timer-vibration-support').textContent = Sound.vibrationSupported() ? 'Tarayıcın titreşim isteğini destekliyor; cihazın gerçekten titrediğini ölçemeyiz. Aşağıdaki ayrı düğmeyle sesi açmadan dene.' : 'Bu cihaz veya tarayıcı titreşimi desteklemiyor. iPhone ve iPad’de miyav sesi ve ekrandaki bitiş uyarısı kullanılabilir.';
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
      D().settings[key] = v; if (key === 'focus') D().settings.countdownSeconds = v * 60; e.target.value = v; save(); // geri sayımla tutarlı kalsın (saat:dk:sn seçimini sessizce silme)
      renderHome(); Timer.state(); // sayaç yeni süreyi bir sonraki tick'te gösterir
    });
    num('#set-goal', 'dailyGoal', 10, 900);
    num('#set-msg', 'msgInterval', 0, 240);
    num('#set-focus', 'focus', 1, 900);
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
    $('#set-sound').addEventListener('change', e => { D().settings.sound = e.target.checked; save(); Sound.stopTimerAlarm(); if (e.target.checked) Sound.unlock(); });
    $('#set-timer-vibrate').addEventListener('change', e => { D().settings.timerVibrate = e.target.checked; save(); Sound.stopTimerAlarm(); });
    for (const [id, key, choices] of [['#set-timer-meow', 'timerMeow', Sound.meows], ['#set-timer-vibration', 'timerVibration', Sound.vibrations]]) {
      $(id).addEventListener('change', e => { if (!choices.some(c => c.id === e.target.value)) return; D().settings[key] = e.target.value; save(); Sound.stopTimerAlarm(); $('#timer-alarm-test-result').textContent = 'Seçimin kaydedildi. Dinlemek için “Uyarıyı dene”ye dokun.'; });
    }
    $('#test-timer-alarm').addEventListener('click', async () => {
      $('#timer-alarm-test-result').textContent = 'Gerçek kedi kaydı hazırlanıyor…';
      const result = await Sound.timerEnd();
      if (result.cancelled) return;
      const sound = !D().settings.sound ? 'Sesler kapalı.' : result.sound ? 'Seçtiğin gerçek kedi kaydı çalıyor.' : 'Kayıt çalınamadı; yeniden dene, cihaz sesini ve tarayıcı iznini kontrol et.';
      const vibration = D().settings.timerVibrate === false ? 'Titreşim kapalı.' : !result.vibrationSupported ? 'Bu cihazda titreşim desteklenmiyor.' : result.vibration ? 'Titreşim isteği gönderildi; hissetmediysen aşağıdaki yardım adımlarına bak.' : 'Cihaz titreşime izin vermedi.';
      $('#timer-alarm-test-result').textContent = sound + ' ' + vibration;
    });
    $('#test-timer-vibration').addEventListener('click', () => {
      const r = Sound.testVibration();
      $('#timer-alarm-test-result').textContent = !r.vibrationSupported ? 'Bu tarayıcıda titreşim desteklenmiyor. Miyav ve ekrandaki bitiş uyarısını kullanabilirsin.' : r.vibration ? 'Seçtiğin titreşim ritmi istendi. Hissetmediysen “Titreşimi hissetmedim” adımlarını kontrol et. Bu deneme ses çalmaz ve ayarını değiştirmez.' : 'Titreşim isteği kabul edilmedi. Uygulamayı açık tutup yardım adımlarından sonra tekrar dene.';
    });
    $('#stop-timer-alarm').addEventListener('click', () => { Sound.stopTimerAlarm(); $('#timer-alarm-test-result').textContent = 'Deneme durduruldu.'; });
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
      if (k === 'vesper' && Scene.isVesperTime && !Scene.isVesperTime()) { toast('🌙', 'Vesper akşam gelir', 'Akşam 18:00\'den sonra, hava kararınca uğrar; şimdilik Güçlü\'yü çağırabilirsin'); return; }
      const came = Scene.visit(k);
      showTab('home');
      if (came === false) {
        const here = Scene.friendsHere ? Scene.friendsHere() : [];
        if (here.length && (k === 'family' || here.includes(k))) toast('🐾', 'Zaten burada', 'Ana sayfada Luna\'nın yanında');
        else toast('🐾', 'Kediler şu an meşgul', 'Biraz sonra yine dene');
      }
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
              Geri.reload();
              return;
            }
            const added = Store.mergeJSON(obj);
            if (added === false) { toast('⚠️', 'Yedek birleştirilemedi', 'Dosya bozuk olabilir ya da depolama dolu; verilerin olduğu gibi kaldı', 8000); return; }
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
      Store.reset(); Geri.reload();
    });
  }
  function renderFooter() {
    $('.footer').textContent = `${D().settings.name ? D().settings.name + ' için' : 'Senin için'} sevgiyle yapıldı ✨🐾`;
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
      const recipient = Scene.feed(kind => {
        say(kind === 'vesper' ? 'vesperFed' : kind === 'kitten' ? 'kittenFed' : 'fed');
        Sound.meow();
      });
      if (!recipient) return; // yemek sürerken ikinci balığı harcama
      D().fish--; D().fed++; save();
      renderHUD();
      checkBadges();
    });
  }
  // Vesper ve Güçlü'nün sözü: gece uykulu; Güçlü "özledim"i yalnızca uzun aradan sonra, çalışılan günde mutlu
  function friendLine(kind) {
    const h = new Date().getHours(), night = h >= 23 || h < 5 || Messages.companionState().bedtime;
    if (kind === 'vesper') return night ? 'vesperSleepy' : 'vesper';
    if (night) return 'kittenSleepy';
    const ss = D().sessions, last = ss.length ? ss[ss.length - 1].start : 0;
    if (last && Date.now() - last > 3 * 864e5) return 'kittenMiss';
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
    // gün sonu: akşam 20:00'den sonra (ya da ertesi gün ilk açılışta) Luna planın nasıl geçtiğini söyler, günde bir kez
    if (window.PlanlarUI) { try { if (PlanlarUI.maybeComment()) return; } catch (e) { ErrLog.add('Gün sonu: ' + ((e && e.message) || e), 'planlar-ui.js'); } }
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
      else if (h >= 5 && h < 23 && ss.length && Date.now() - ss[ss.length - 1].start > 3 * 864e5) say('comeback');
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
    sayText(text, opts) { const ok = Scene.say(text, opts) !== false; if (ok) lastMsgAt = Date.now(); return ok; },
    // Luna son ms içinde konuştu mu (hatırlatmalar onun sözünü ezmesin)
    quietFor(ms) { return Date.now() - lastMsgAt < ms; },
    openModal,
    closeModal,
    startStudy,
    pickPlanItem,
    finishPlanItem,
    liveRun,
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
    addSession(dateKey) { openSessionModal(null, { date: dateKey }); },
    showTab,
    reload: () => Geri.reload(),
    celebrate() { Scene.celebrate(); Sound.chime(); },
    isFocusing() { const s = Timer.state(); return s.running && s.phase === 'focus'; },
    // kullanıcı bir işin ortasında mı (sayaç, açık pencere, görüntüleyici): sessiz güncelleme beklesin
    // meşgulken güncelleme sayfayı kendiliğinden yenilemez: sayaç, açık pencere, yükleme, yazılmakta olan bir metin,
    // ya da az önce açılan kamera / dosya seçici (onlar da sayfayı arka plana atar; dönünce sayfa yerinde olmalı)
    isBusy() {
      const a = document.activeElement, typing = a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA') && a.type !== 'file' && !!a.value;
      return Timer.state().running || !$('#modal').classList.contains('hidden') || !$('#viewer').classList.contains('hidden')
        || (window.DepoUI && DepoUI.busy && DepoUI.busy()) || typing || Date.now() - pickedAt < 120000;
    },
    playSpotify(url) {
      D().settings.spotify = url;
      save();
      if (!$('#spotify-presets').children.length) renderMusic(); else loadSpotify();
      $('#spotify-input').value = url;
    },
  };
  window.App = App;
  // Ana akış dışındaki bir parça (sahne, mini sayaç, bildirimler…) hata verse de uygulamanın kalanı açılır; hata Tanılama'ya yazılır
  function safe(name, fn) {
    try { return fn(); } catch (e) {
      console.error('Luna ' + name + ':', e);
      try { ErrLog.add(name + ': ' + ((e && e.message) || e), 'app.js'); } catch (x) { /* yok say */ }
    }
  }
  function init() {
    if (window.LunaKurulum && LunaKurulum.active) return; // tarayıcıda yalnızca kurulum sayfası (uygulama sürpriz kalsın)
    if (window.GAuth) GAuth.handleRedirect(); // Google dönüşü: modüller sonucu GAuth.lastReturn() ile okur
    // kaldırılan hesap eşitlemesinden kalmış olabilecek boş kayıtları bir kez temizle
    try { if (!localStorage.getItem('luna-temizlik-1')) { localStorage.removeItem('luna-sync-on'); if (window.indexedDB) indexedDB.deleteDatabase('luna-sync'); localStorage.setItem('luna-temizlik-1', '1'); } } catch (e) { /* yok say */ }
    safe('Sahne', () => Scene.init($('#sky'), $('#bubble'), {
      onPoke() { Sound.meow(); say('poke'); },
      onStar() { if (!App.isFocusing()) openSiir(); },
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
    }));
    safe('Rapor portresi', () => Scene.portrait($('#report-luna')));
    // modüller sayaçtan önce: sayfa kapalıyken biten bir oturum açılışta işlenirken hazır olsunlar
    if (window.PlanUI) safe('Plan', () => PlanUI.init(App));
    if (window.PlanlarUI) safe('Planlar', () => PlanlarUI.init(App));
    if (window.TakvimUI) safe('Takvim', () => TakvimUI.init(App));
    if (window.UniUI) safe('Dönem', () => UniUI.init(App));
    if (window.DenemeUI) safe('Deneme', () => DenemeUI.init(App));
    if (window.NotesUI) safe('Notlar', () => NotesUI.init(App));
    if (window.DepoUI) safe('Kütüphane', () => DepoUI.init(App));
    if (window.HataUI) safe('Hata defteri', () => HataUI.init(App));
    if (window.KaynakUI) safe('Kaynaklar', () => KaynakUI.init(App));
    if (window.Badges) safe('Rozetler', () => Badges.init(App));
    if (window.DunyaUI) safe('Küçük Dünya', () => DunyaUI.init(App));
    if (window.SpotifyLink) safe('Spotify', () => SpotifyLink.init(App));
    if (window.Diag) safe('Tanılama', () => Diag.init(App));
    renderSubjectSelects();
    Timer.init(timerHandlers);
    renderAllowApps();
    welcomedBack = welcomeBack(); // uygulama dışındayken sayfa kapanmışsa (iOS) dönüşte değerlendir
    syncSceneMode();
    if (Timer.state().running && Timer.state().phase === 'focus') {
      lockScreen(true);
      const wake = () => { Sound.unlock(); ['pointerdown', 'touchend', 'keydown'].forEach((t) => document.removeEventListener(t, wake, true)); };
      ['pointerdown', 'touchend', 'keydown'].forEach((t) => document.addEventListener(t, wake, true));
    }
    // dosya seçici ya da kamera açılınca (programla açılsa da tıklama olayı gelir) bir süre "meşgul" sayılır
    document.addEventListener('click', (e) => { if (e.target && e.target.matches && e.target.matches('input[type="file"]')) pickedAt = Date.now(); }, true);
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
    $('#hafta-ozet').addEventListener('click', (e) => {
      const day = e.target.closest('[data-hg-day]');
      if (day && !day.disabled) { toggleChartDay(day.dataset.hgDay); return; }
      if (e.target.closest('[data-hg-close]')) { toggleChartDay(chartDay); return; }
      const b = e.target.closest('[data-hg]');
      if (!b || b.disabled) return;
      weekOff = Math.min(0, weekOff + Number(b.dataset.hg));
      chartDay = '';
      renderWeek(true);
    });
    $('#gun-ozet').addEventListener('click', (e) => {
      const day = e.target.closest('[data-go-day]');
      if (day) { openDayDetail(day.dataset.goDay); return; }
      if (!e.target.closest('[data-go="more"]')) return;
      logCount += 14;
      renderDaySummary();
    });
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
    Geri.start();
    greetOnOpen();
    (window.requestIdleCallback || ((f) => setTimeout(f, 1200)))(checkBadges, { timeout: 3000 }); // açılışı bekletmesin
    if (Store.loadError) setTimeout(() => toast('🛟', 'Verilerin okunamadı', 'Bozulmasın diye kopyası alındı: Ayarlar → Veriler', 9000), 1500);
    safe('Bildirimler', () => LunaNotify.init(App));
    safe('Mini sayaç', () => MiniTimer.init(App,()=>weatherNow));
    if (window.Guncelleme) safe('Güncelleme', () => Guncelleme.init(App)); // güncellemeler, yenilikler ve ana ekrana ekleme
    setTimeout(siirSurpriz, 2400); // şiir: ilk açılışta bir kez kendiliğinden
    // ana ekrana eklenmiş uygulamada tarayıcıdan verilerin kalıcı saklanmasını iste (izin penceresi çıkmaz)
    if (navigator.storage && navigator.storage.persist && (matchMedia('(display-mode: standalone)').matches || navigator.standalone)) {
      navigator.storage.persisted().then((p) => p || navigator.storage.persist()).catch(() => {});
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    try { init(); if (window.LunaBoot) LunaBoot.ready(); }
    catch (error) { console.error('Luna startup:', error); if (window.LunaBoot) LunaBoot.fail(error); }
  });
})();
