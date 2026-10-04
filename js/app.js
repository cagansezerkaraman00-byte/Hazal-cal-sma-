/* Luna ile Çalış — arayüz ve her şeyi birbirine bağlayan kod. */

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
    Scene.say(Messages.get(kind), opts);
    lastMsgAt = Date.now();
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
    if (!D().settings.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
    if (!document.hidden) return;
    try {
      const reg = navigator.serviceWorker && (await navigator.serviceWorker.getRegistration());
      if (reg) reg.showNotification(title, { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' });
      else new Notification(title, { body, icon: 'icons/icon-192.png' });
    } catch (e) { /* bazı tarayıcılar desteklemez */ }
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
      <div class="wp-note">${w.stale ? 'Son bilinen hava durumu (çevrimdışı)' : 'Güncellendi ' + U.hm(w.updatedAt)} · Open-Meteo</div>`;
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
  function showTab(name) {
    currentTab = name;
    $$('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    $$('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + name));
    if (name === 'progress') renderProgress();
    if (name === 'plan') { if (window.PlanUI) PlanUI.render(); renderTasks(); renderReview(); }
    if (name === 'deneme' && window.DenemeUI) DenemeUI.render();
    if (name === 'notes' && window.NotesUI) NotesUI.render();
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

  function renderTimer(s) {
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
      document.title = 'Luna ile Çalış';
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
    onFocusDone(session) {
      lockScreen(false);
      Sound.chime();
      session.id = U.uid();
      session.note = session.intent || ''; session.hard = ''; session.rating = null; session.mood = '';
      D().sessions.push(session);
      if (session.minutes >= 10) D().fish++;
      save();
      if (window.PlanUI) PlanUI.onSession(session);
      notify('Oturum tamamlandı! 🎉', `${U.fmtMin(session.minutes)} ${Store.subject(session.subjectId).name} çalıştın. Mola zamanı!`);
      say('done');
      openSessionModal(session, { justDone: true });
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
      inp.placeholder = '✓ Plan sekmesine kaydedildi, şimdi derse dön 🐾';
      setTimeout(() => { inp.placeholder = '💭 Aklına başka bir şey mi geldi? Yaz, sonraya bırak'; }, 3500);
      renderHome();
    });
    $('#focus-exit').addEventListener('click', () => {
      focusDismissed = true;
      renderTimer(Timer.state());
    });
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
    const paint = () => {
      $$('#m-stars button').forEach((b) => b.classList.toggle('on', +b.dataset.v <= rating));
      $$('#m-moods button').forEach((b) => b.classList.toggle('on', b.dataset.v === mood));
    };
    paint();
    $$('#m-stars button').forEach((b) => b.addEventListener('click', () => { rating = +b.dataset.v; paint(); }));
    $$('#m-moods button').forEach((b) => b.addEventListener('click', () => { mood = mood === b.dataset.v ? '' : b.dataset.v; paint(); }));
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

  function closeModal() { $('#modal').classList.add('hidden'); $('#modal-card').innerHTML = ''; }
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
    const used = new Set(D().sessions.map((x) => x.subjectId).concat(D().tasks.map((t) => t.subjectId)));
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
    $('#modal').classList.remove('hidden');
    if (mount) mount(card);
    return card;
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
    renderHUD();
    renderHome();
    if (currentTab === 'progress') renderProgress();
    if (currentTab === 'plan') { if (window.PlanUI) PlanUI.render(); renderTasks(); renderReview(); }
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
      <div class="right">${U.fmtMin(s.minutes)}<div class="meta">${s.rating ? '⭐'.repeat(s.rating) : ''} ${s.mood || ''}</div></div>
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
    const pct = Math.min(100, Math.round((mins / goal) * 100));
    $('#goal-ring').style.setProperty('--p', pct);
    $('#goal-ring').classList.toggle('done', pct >= 100);
    $('#goal-pct').textContent = pct >= 100 ? '★' : pct + '%';
    $('#today-min').textContent = U.fmtMin(mins);
    $('#goal-text').textContent = pct >= 100 ? `Hedef (${U.fmtMin(goal)}) tamam! 🎉` : `Hedefe ${U.fmtMin(goal - mins)} kaldı`;
    const todayKey = U.dateKey(new Date());
    const today = D().sessions.filter((s) => U.dateKey(s.start) === todayKey).sort((a, b) => b.start - a.start);
    $('#today-sessions-count').textContent = today.length ? `${today.length} oturum` : '';
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
    if (window.PlanUI) { tp.classList.remove('hidden'); PlanUI.renderToday(tp); } else tp.classList.add('hidden');
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
    if (days != null && days >= 0) chips.push(['⏳', days === 0 ? 'Bugün!' : `${days} gün`, "YKS'ye", 'gold', 'plan']);
    if (todayMin > 0) chips.push(['⏱️', U.fmtMin(todayMin), 'bugün', pct >= 100 ? 'up' : '']);
    const wm = weekMinutes();
    if (wm > 0) chips.push(['📅', U.fmtMin(wm), 'bu hafta', '']);
    const sk = Stats.streak();
    if (sk >= 2) chips.push(['🔥', `${sk} gün`, 'seri', 'up']);
    const done = window.YKS ? YKS.doneCount() : 0;
    if (done) chips.push(['✅', String(done), 'konu tamam', '', 'plan']);
    const dueCards = window.NotesUI ? NotesUI.dueCount() : 0;
    if (dueCards) chips.push(['🃏', String(dueCards), 'kart seni bekliyor', '', 'notes']);
    const last = window.Deneme ? Deneme.lastSummary() : null;
    if (last) chips.push(['📈', `${last.net} net`, `son ${last.type}${last.delta > 0 ? ' · +' + last.delta : ''}`, last.delta > 0 ? 'up' : '', 'deneme']);
    const msg = pct >= 100 ? 'Bugünkü hedefini tamamladın! Kendinle gurur duy 🎉'
      : sk >= 3 ? `${sk} gündür buradasın, bu istikrar harika 🌟`
      : days != null && days >= 0 ? Messages.daily('yks', { days })
      : Messages.daily(Messages.timeOfDay());
    $('#welcome').innerHTML = `<div class="welcome-title">${U.esc(Messages.greeting())}</div>
      <div class="welcome-msg">${U.esc(msg)}</div>
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
    $('#hour-chart').innerHTML = hours.map((h) => `<div class="h" title="${U.pad(h.hour)}:00 · ${U.fmtMin(h.minutes)}${h.rating ? ' · ' + h.rating.toFixed(1) + '⭐' : ''}">
      <i style="height:${(h.minutes / hmax) * 100}%;background:${h.minutes ? ratingColor(h.rating) : '#ffffff10'}"></i>
      <span>${h.hour % 3 === 0 ? h.hour : ''}</span></div>`).join('');

    // dersler
    const subs = Stats.bySubject(sm.list);
    const smax = Math.max(...subs.map((s) => s.minutes), 1);
    $('#subject-bars').innerHTML = subs.length ? subs.map((s) => `<div class="sbar">
      <div class="top"><span>${U.esc(s.subject.name)}</span><span>${U.fmtMin(s.minutes)}${s.rating ? ' · ' + s.rating.toFixed(1) + '⭐' : ''}</span></div>
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
  function spotifyEmbed(url) {
    const m = String(url).match(/(?:open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?|spotify:)(playlist|album|track|artist|episode|show)[/:]([A-Za-z0-9]+)/);
    return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator&theme=0` : null;
  }
  function loadSpotify() {
    const src = spotifyEmbed(D().settings.spotify);
    $('#spotify-frame').innerHTML = src
      ? `<iframe src="${src}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Spotify"></iframe>`
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
      if (!spotifyEmbed(v)) { toast('🎧', 'Bu bir Spotify bağlantısına benzemiyor', 'open.spotify.com/… ile başlayan bağlantıyı yapıştır'); return; }
      D().settings.spotify = v; save(); loadSpotify();
    });
    $('#spotify-presets').addEventListener('click', (e) => {
      const c = e.target.closest('.chip');
      if (!c) return;
      D().settings.spotify = c.dataset.url; save();
      $('#spotify-input').value = c.dataset.url;
      loadSpotify();
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
    $('#set-goal').value = s.dailyGoal;
    $('#set-msg').value = s.msgInterval;
    $('#set-focus').value = s.focus;
    $('#set-short').value = s.short;
    $('#set-long').value = s.long;
    $('#set-every').value = s.longEvery;
    $('#set-autobreak').checked = s.autoBreak;
    $('#set-autofocus').checked = s.autoFocus;
    $('#set-sound').checked = s.sound;
    $('#set-notify').checked = s.notify && 'Notification' in window && Notification.permission === 'granted';
    $('#set-love').value = D().loveNotes.join('\n');
    $('#set-focusmode').checked = s.focusMode;
    $('#set-quiet').checked = s.quietFocus;
    $('#set-pauseleave').checked = s.pauseOnLeave;
    $('#set-kitten').value = s.kittenName || 'Sarman';
    $('#set-weather').checked = s.weather;
    $$('#theme-seg button').forEach((b) => b.classList.toggle('active', b.dataset.theme === s.theme));
    $('#city-chips').innerHTML = CITIES.map(([n, la, lo]) => `<button class="chip ${Math.abs(la - s.lat) < 0.05 && Math.abs(lo - s.lon) < 0.05 ? 'active' : ''}" data-lat="${la}" data-lon="${lo}" data-name="${n}">${n}</button>`).join('');
    const sun = Scene.sunInfo();
    $('#loc-text').textContent = `Şu an: ${s.lat.toFixed(2)}, ${s.lon.toFixed(2)} · Gün doğumu ${fmtDayMin(sun.sunrise)} · Gün batımı ${fmtDayMin(sun.sunset)}`;
    renderSubjectEdit();
  }

  function renderSubjectEdit() {
    $('#subject-edit').innerHTML = D().subjects.map((s) => `<li data-id="${s.id}">
      <input type="color" value="${s.color}" data-f="color">
      <input value="${U.esc(s.name)}" data-f="name" maxlength="30">
      <button class="icon-btn" data-f="del" title="Sil">🗑️</button></li>`).join('');
  }

  function bindSettings() {
    const num = (id, key, min, max) => $(id).addEventListener('change', (e) => {
      const v = U.clamp(parseInt(e.target.value, 10) || D().settings[key], min, max);
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
    const bool = (id, key) => $(id).addEventListener('change', (e) => { D().settings[key] = e.target.checked; save(); });
    bool('#set-autobreak', 'autoBreak');
    bool('#set-autofocus', 'autoFocus');
    bool('#set-sound', 'sound');
    bool('#set-quiet', 'quietFocus');
    bool('#set-pauseleave', 'pauseOnLeave');
    $('#set-kitten').addEventListener('change', (e) => { D().settings.kittenName = e.target.value.trim().slice(0, 20) || 'Sarman'; e.target.value = D().settings.kittenName; save(); });
    $('#call-cats').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-visit]');
      if (!b) return;
      if (App.isFocusing()) { toast('🐾', 'Odaklanırken kediler seni rahatsız etmez', 'Molada çağırabilirsin'); return; }
      Scene.visit(b.dataset.visit);
      showTab('home');
    });
    $('#set-focusmode').addEventListener('change', (e) => { D().settings.focusMode = e.target.checked; save(); renderTimer(Timer.state()); });
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
      if (e.target.dataset.f === 'name' && e.target.value.trim()) s.name = e.target.value.trim();
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
    $('#save-love').addEventListener('click', () => {
      D().loveNotes = $('#set-love').value.split('\n').map((x) => x.trim()).filter(Boolean);
      save(); renderHome(); toast('💌', 'Notlar kaydedildi');
    });
    // veri
    $('#export').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(D(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `luna-yedek-${U.dateKey(new Date())}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    $('#import').addEventListener('change', (e) => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const obj = JSON.parse(r.result);
          if (!obj || !Array.isArray(obj.sessions)) throw new Error('format');
          if (!confirm(`${obj.sessions.length} oturumluk yedek yüklensin mi? Mevcut veriler değişecek.`)) return;
          Store.importJSON(obj);
          location.reload();
        } catch (err) { toast('⚠️', 'Dosya okunamadı', 'Luna yedeği olduğundan emin ol'); }
      };
      r.readAsText(f);
      e.target.value = '';
    });
    $('#reset').addEventListener('click', () => {
      if (!confirm('Bütün oturumlar, görevler ve ayarlar silinecek. Emin misin?')) return;
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

  function periodic() {
    const iv = D().settings.msgInterval;
    if (!iv || document.hidden || !$('#modal').classList.contains('hidden')) return;
    if (Date.now() - lastMsgAt < iv * 60000) return;
    const s = Timer.state();
    const focusing = s.running && s.phase === 'focus';
    if (focusing && D().settings.quietFocus) return; // odaklanırken rahatsız etme
    if (!focusing && Math.random() < 0.35 && sayLove()) return;
    if (focusing) say('during');
    else if (s.running) say('breakStart');
    else say(Messages.timeOfDay());
  }

  function greetOnOpen() {
    const ss = D().sessions;
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
    setTimeout(() => {
      if (!ss.length) say('welcome', { ms: 9000 });
      else if (Date.now() - ss[ss.length - 1].start > 3 * 864e5) say('comeback');
      else say(Messages.timeOfDay());
    }, 1200);
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
    say(kind, vars) { Scene.say(Messages.get(kind, vars)); lastMsgAt = Date.now(); },
    sayText(text, opts) { Scene.say(text, opts); lastMsgAt = Date.now(); },
    openModal,
    closeModal,
    startStudy,
    subjectFor,
    applyFieldSubjects,
    bestHours,
    refresh: afterDataChange,
    refreshHome() { renderHome(); renderHUD(); checkBadges(); },
    showTab,
    celebrate() { Scene.celebrate(); Sound.chime(); },
    isFocusing() { const s = Timer.state(); return s.running && s.phase === 'focus'; },
    playSpotify(url) {
      D().settings.spotify = url;
      save();
      if (!$('#spotify-presets').children.length) renderMusic(); else loadSpotify();
      $('#spotify-input').value = url;
    },
  };
  window.App = App;

  function init() {
    Scene.init($('#sky'), $('#bubble'), {
      onPoke() { Sound.meow(); say('poke'); },
      onFriend(kind) { Sound.meow(); say(kind === 'vesper' ? 'vesper' : 'kitten'); },
      // ilk karşılaşma: tanıştırma + iki kediyle de tanışınca rozet
      onFriendSeen(kind) {
        const st = D().stats;
        if (st.seen[kind]) return;
        st.seen[kind] = Date.now();
        if (st.seen.vesper && st.seen.kitten) st.friendsMet = true;
        save();
        setTimeout(() => { if (!App.isFocusing()) say(kind === 'vesper' ? 'meetVesper' : 'meetKitten'); }, 2500);
        checkBadges();
      },
    });
    Scene.portrait($('#report-luna'));
    // modüller sayaçtan önce: sayfa kapalıyken biten bir oturum açılışta işlenirken hazır olsunlar
    if (window.PlanUI) PlanUI.init(App);
    if (window.DenemeUI) DenemeUI.init(App);
    if (window.NotesUI) NotesUI.init(App);
    if (window.Badges) Badges.init(App);
    if (window.SpotifyLink) SpotifyLink.init(App);
    renderSubjectSelects();
    Timer.init(timerHandlers);
    syncSceneMode();
    if (Timer.state().running && Timer.state().phase === 'focus') lockScreen(true);

    $$('#tabs button').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
    $('#period-seg').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      $$('#period-seg button').forEach((x) => x.classList.toggle('active', x === b));
      progressDays = +b.dataset.days;
      renderProgress();
    });
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
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
      const b = e.target.closest('[data-tab]');
      if (b) showTab(b.dataset.tab);
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

    applyTheme();
    renderClock();
    renderHome();
    renderFooter();
    setInterval(renderClock, 1000);
    refreshWeather();
    setInterval(() => { if (!document.hidden) refreshWeather(); }, 10 * 60000); // önbellek 30 dk, istek seyrek
    setInterval(periodic, 30000);
    let lastDay = U.dateKey(new Date());
    setInterval(() => { // gece yarısı geçince günü yenile
      const k = U.dateKey(new Date());
      if (k !== lastDay) { lastDay = k; renderHome(); if (currentTab === 'plan' && window.PlanUI) PlanUI.render(); }
    }, 60000);
    // Uygulamadan çıkış: varsayılan nazik "hoş geldin", sıkı modda sayaç duraklar (YPT gibi)
    let hiddenAt = 0;
    document.addEventListener('visibilitychange', () => {
      const s = Timer.state();
      const focusing = s.running && s.phase === 'focus';
      if (document.hidden) {
        if (focusing) {
          hiddenAt = Date.now();
          if (D().settings.pauseOnLeave) Timer.toggle();
        }
        return;
      }
      if (focusing) lockScreen(true);
      if (hiddenAt) {
        const away = Date.now() - hiddenAt;
        hiddenAt = 0;
        if (away > 60000) {
          const m = Math.round(away / 60000);
          Scene.say(D().settings.pauseOnLeave
            ? `Hoş geldin! Sayaç seni bekledi ⏸ Hazır olunca "Devam"a bas, kaldığımız yerden sürdürelim.`
            : `Hoş geldin! ${m} dakika uzaktaydın, şimdi kaldığımız yerden devam 🐾`);
          lastMsgAt = Date.now();
        }
      }
    });

    let saved = 'home';
    try { saved = localStorage.getItem('luna-tab') || 'home'; } catch (e) { /* yok say */ }
    if ($('#tab-' + saved)) showTab(saved);
    greetOnOpen();
    checkBadges();

    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
