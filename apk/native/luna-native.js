/* Yalnızca Android uygulamasında (APK) yüklenir; tarayıcıdaki Luna bu dosyayı hiç görmez.
   Luna'nın kendi kodu değişmez: burada yalnızca uygulamanın içinde farklı çalışan birkaç tarayıcı özelliği ayarlanır. */
(() => {
  const cap = window.Capacitor;
  if (!cap || typeof cap.isNativePlatform !== 'function' || !cap.isNativePlatform()) return;
  const P = cap.Plugins || {};
  window.LUNA_APK = true;

  // Ana ekran uygulaması sayılsın: "Luna'yı yükle" kartı çıkmaz, kalıcı depolama istenir
  try { Object.defineProperty(navigator, 'standalone', { value: true, configurable: true }); } catch (e) { /* yok say */ }

  // Servis çalışanı yok: dosyalar zaten uygulamanın içinde. Yeni APK kurulunca eski önbellek yeni sürümü gölgelemesin.
  try {
    const sw = navigator.serviceWorker;
    if (sw && sw.getRegistrations) sw.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
    delete Navigator.prototype.serviceWorker;
  } catch (e) { /* yok say */ }

  // Paylaşım menüsü (Yedek al, Depo ve Üni dosyaları): uygulama içindeki tarayıcıda yok; Android'in kendisi açılır
  if (P.Share && P.Filesystem) {
    const base64 = (blob) => new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(',')[1] || '');
      r.onerror = () => rej(r.error);
      r.readAsDataURL(blob);
    });
    navigator.canShare = (d) => !!(d && ((d.files && d.files.length) || d.url || d.text));
    navigator.share = async (d = {}) => {
      const files = [];
      for (const f of d.files || []) {
        const name = String(f.name || 'luna-dosya').replace(/[\\/:*?"<>|]+/g, '-');
        const w = await P.Filesystem.writeFile({ path: name, data: await base64(f), directory: 'CACHE' });
        files.push(w.uri);
      }
      try {
        await P.Share.share({ title: d.title, text: d.text, url: d.url, files: files.length ? files : undefined, dialogTitle: d.title });
      } catch (e) {
        if (/cancel/i.test(String((e && e.message) || e))) throw new DOMException('Paylaşım iptal edildi', 'AbortError');
        throw e;
      }
    };
  }

  // Giriş sayfaları (Spotify) uygulama içi Chrome sekmesinde açılır; giriş bitince sekme kapanıp Luna'ya dönülür
  window.LunaApk = {
    open(url) {
      if (P.Browser && P.Browser.open) P.Browser.open({ url }).catch(() => { location.href = url; });
      else location.href = url;
    },
  };

  // Spotify girişinden dönüş: tarayıcı com.hazal.luna://spotify-callback?code=… adresini uygulamaya verir.
  // Luna'nın kendi dönüş işleyicisi (?code=… okuyan) çalışsın diye sayfa bu bilgiyle bir kez yeniden açılır.
  const finishSpotify = (url) => {
    if (!url || !/^com\.hazal\.luna:\/\/spotify-callback\?/i.test(url)) return;
    try { if (sessionStorage.getItem('luna-apk-donus') === url) return; sessionStorage.setItem('luna-apk-donus', url); } catch (e) { /* yok say */ }
    location.replace(location.origin + '/' + url.slice(url.indexOf('?')));
  };
  if (P.App) {
    P.App.addListener('appUrlOpen', (e) => finishSpotify(e && e.url));
    if (P.App.getLaunchUrl) P.App.getLaunchUrl().then((r) => finishSpotify(r && r.url)).catch(() => {});
  }

  // Hazal Luna'dan çıkınca (YouTube'a geçince) müzik durur: aynı anda iki ses olmasın.
  // Luna'ya dönünce kendiliğinden başlamaz; Hazal oynat'a basar.
  const embeds = new Set();
  let ready = null;
  Object.defineProperty(window, 'onSpotifyIframeApiReady', {
    configurable: true,
    get() { return ready; },
    set(fn) {
      ready = typeof fn !== 'function' ? fn : (api) => {
        const make = api && api.createController && api.createController.bind(api);
        if (make) api.createController = (el, opts, cb) => make(el, opts, (c) => { embeds.add(c); if (cb) cb(c); });
        return fn(api);
      };
    },
  });
  const pauseMusic = () => {
    console.info('Luna APK: arkaya geçti, müzik duraklatılıyor');
    try { if (typeof SpotifyPlayback !== 'undefined' && SpotifyPlayback.pauseForEmbed) SpotifyPlayback.pauseForEmbed(); } catch (e) { /* yok say */ }
    embeds.forEach((c) => { try { Promise.resolve(c.pause && c.pause()).catch(() => {}); } catch (e) { /* yok say */ } });
  };
  // Tanı: Spotify oynatıcısının ihtiyaç duyduğu korumalı müzik desteği var mı. Sonuç Ayarlar → Tanılama → Hata günlüğünde görünür.
  const note = (msg) => { console.info('Luna APK: ' + msg); try { if (window.ErrLog) ErrLog.add('Uygulama: ' + msg, 'luna-native.js'); } catch (e) { /* yok say */ } };
  window.addEventListener('load', () => {
    try {
      navigator.requestMediaKeySystemAccess('com.widevine.alpha', [{ initDataTypes: ['cenc'], audioCapabilities: [{ contentType: 'audio/mp4; codecs="mp4a.40.2"' }] }])
        .then(() => note('korumalı müzik (Widevine) var'), (e) => note('korumalı müzik (Widevine) YOK: ' + ((e && (e.name + ' ' + e.message)) || e)));
    } catch (e) { note('korumalı müzik denetlenemedi: ' + ((e && e.message) || e)); }
    // Spotify oynatıcısının kendi hataları da günlüğe düşsün (Luna'nın gösterdiği mesajın yanında asıl sebep)
    const watch = () => {
      const Sp = window.Spotify;
      if (!Sp || !Sp.Player || Sp.Player.__luna) return !!(Sp && Sp.Player && Sp.Player.__luna);
      const Orig = Sp.Player;
      Sp.Player = function (opts) {
        const p = new Orig(opts);
        ['initialization_error', 'authentication_error', 'account_error', 'playback_error'].forEach((ev) => p.addListener(ev, (e) => note('Spotify ' + ev + ': ' + ((e && e.message) || ''))));
        p.addListener('not_ready', () => note('Spotify oynatıcısı hazır değil (not_ready)'));
        return p;
      };
      Sp.Player.prototype = Orig.prototype; Sp.Player.__luna = true;
      return true;
    };
    const iv = setInterval(() => { if (watch()) clearInterval(iv); }, 500);
    setTimeout(() => clearInterval(iv), 10 * 60000);
  });

  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseMusic(); });
  document.addEventListener('pause', pauseMusic); // Capacitor: uygulama arkaya geçti
  if (P.App) P.App.addListener('pause', pauseMusic);

  // Uygulama güncellemesi (Ayarlar'da kendi kartı): Luna yeni APK'yı indirir, Android'in "Güncelle" penceresini açar.
  // Yalnızca Çağan'ın onayladığı sürüm teklif edilir: depodaki apk/guncel.json (GitHub'daki her deneme derlemesi değil).
  const Gn = P.LunaGuncelle;
  if (Gn && P.App && P.App.getInfo) {
    const KAYNAK = 'https://cagansezerkaraman00-byte.github.io/Hazal-cal-sma-/apk/guncel.json';
    const g = { kod: 0, surum: '', yeni: null, durum: 'bekle', yuzde: -1, izin: false, hata: '' };
    let kart = null;
    const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const toast = (...a) => { try { App.toast(...a); } catch (e) { /* yok say */ } };
    const st = document.createElement('style');
    st.textContent = `
      #apk-update-card .ag-liste { margin: 8px 0 12px; padding-left: 20px; color: var(--muted); }
      #apk-update-card .ag-liste li { margin: 3px 0; }
      #apk-update-card .ag-cubuk { height: 10px; border-radius: 99px; background: var(--track); overflow: hidden; margin: 6px 0; }
      #apk-update-card .ag-cubuk > div { height: 100%; border-radius: 99px; background: var(--accent-grad); transition: width .25s; }
      #apk-update-card .ag-not { margin: 10px 0 0; padding: 10px 12px; border-radius: 12px; background: var(--lav-soft); color: var(--text); font-size: .9rem; }`;
    document.head.appendChild(st);
    const ciz = () => {
      if (!kart) return;
      const y = g.yeni, mesgul = g.durum === 'bakiliyor' || g.durum === 'indiriliyor';
      const durum = g.durum === 'bakiliyor' ? 'Bakılıyor…' : g.durum === 'indiriliyor' ? 'İndiriliyor…' : y ? 'Yeni sürüm hazır' : g.durum === 'hata' ? 'Bakılamadı' : 'Güncel ✓';
      kart.innerHTML = `<h2>📲 Uygulama güncellemesi</h2>
        <div class="upd-row"><img src="icons/icon-192.png" alt="" class="ub-icon"><div class="ub-text"><b>Luna uygulaması</b><small>Sürüm ${esc(g.surum || '?')} · derleme ${esc(g.kod || '?')}</small></div>
          <span class="upd-state ${y ? 'new' : ''}">${durum}</span></div>
        ${y ? `<div class="upd-new">${Array.isArray(y.yenilikler) && y.yenilikler.length ? `<ul class="ag-liste">${y.yenilikler.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
          ${g.durum === 'indiriliyor'
            ? `<div class="ag-cubuk"><div style="width:${Math.max(3, g.yuzde)}%"></div></div><p class="muted small">Yeni Luna iniyor${g.yuzde >= 0 ? ' · %' + g.yuzde : '…'}</p>`
            : `<button class="btn primary" type="button" data-ag="kur">Güncelle · sürüm ${esc(y.surum)}</button>`}</div>` : ''}
        ${g.izin ? `<p class="ag-not">Android "Bu kaynaktan yüklemeye izin ver" ekranını açtı. İzni aç ve Luna'ya dön; kurulum kendiliğinden devam eder.</p>` : ''}
        ${g.hata ? `<p class="ag-not">${esc(g.hata)}</p>` : ''}
        <div class="row upd-acts"><button class="btn soft" type="button" data-ag="denetle" ${mesgul ? 'disabled' : ''}>Güncellemeleri denetle</button></div>
        <p class="muted small">Güncelleme verilerine dokunmaz: yeni Luna eskisinin üstüne kurulur, çalışmaların, notların ve rozetlerin olduğu gibi kalır.</p>`;
    };
    const denetle = async (sessiz) => {
      if (g.durum === 'indiriliyor') return;
      g.durum = 'bakiliyor'; g.hata = ''; ciz();
      try {
        const r = await fetch(KAYNAK + '?t=' + Date.now(), { cache: 'no-store' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        g.yeni = +j.kod > +g.kod && /^https:\/\//.test(j.apk || '') ? j : null;
        g.durum = 'tamam';
        if (g.yeni && sessiz) toast('✨', 'Yeni Luna hazır', "Ayarlar → Uygulama güncellemesi'nden güncelleyebilirsin", 8000);
      } catch (e) {
        g.durum = 'hata';
        if (!sessiz) g.hata = 'Bakamadım; internet bağlantını kontrol edip yeniden dene.';
      }
      ciz();
    };
    const kur = async () => {
      if (!g.yeni || g.durum === 'indiriliyor') return;
      g.durum = 'indiriliyor'; g.yuzde = 0; g.izin = false; g.hata = ''; ciz();
      try {
        const r = await Gn.indirVeKur({ url: g.yeni.apk });
        g.izin = !(r && r.izin);
      } catch (e) {
        g.hata = 'Yeni Luna inemedi; internet bağlantını kontrol edip yeniden dene.';
        note('güncelleme inemedi: ' + ((e && e.message) || e));
      }
      g.durum = 'tamam'; ciz();
    };
    Gn.addListener('ilerleme', (e) => { g.yuzde = e && e.yuzde != null ? e.yuzde : -1; ciz(); });
    // izin ekranından dönünce: inen dosya yeniden indirilmeden kurulsun
    P.App.addListener('resume', () => {
      if (!g.izin) return;
      Gn.kur().then((r) => { g.izin = !(r && r.izin); ciz(); }).catch(() => { g.izin = false; ciz(); });
    });
    window.addEventListener('load', () => {
      const eski = document.getElementById('update-card'); // tarayıcıdaki Luna'nın güncelleme kartı uygulamada işe yaramaz
      if (eski) {
        eski.style.display = 'none';
        kart = document.createElement('div');
        kart.className = 'card update-card';
        kart.id = 'apk-update-card';
        eski.after(kart);
        kart.addEventListener('click', (e) => {
          const b = e.target.closest('[data-ag]');
          if (b) { if (b.dataset.ag === 'kur') kur(); else denetle(false); }
        });
      }
      P.App.getInfo().then((i) => { g.kod = +i.build || 0; g.surum = i.version || ''; }).catch(() => {}).then(() => {
        ciz();
        setTimeout(() => denetle(true), 4000); // açılışta bir kez sessizce bak; yeni sürüm varsa küçük bir haber
      });
    });
  }

  // Mini pencere: Android'in kendi "resim içinde resim" penceresi (Chrome'daki video penceresinin yerine).
  // Luna köşeye küçülür ve yalnızca sayacı gösterir; penceredeki tuş Luna'daki Başla / Duraklat ile aynı işi yapar.
  // Pencere açıkken Luna "arkada" sayılır: Chrome'daki mini pencereyle aynı kurallar (ses çıkmaz, Tam odak izinli çıkış sayar).
  const Pip = P.LunaPip;
  if (!Pip) return;
  let pipOn = false, last = null, tick = 0, view = null;
  const hd = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
  const vd = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');
  if (hd && hd.get && vd && vd.get) {
    Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get() { return pipOn || hd.get.call(this); } });
    Object.defineProperty(Document.prototype, 'visibilityState', { configurable: true, get() { return pipOn ? 'hidden' : vd.get.call(this); } });
  }
  const css = document.createElement('style');
  css.textContent = `
    html.luna-pip body > *:not(#luna-pip-view) { display: none !important; }
    #luna-pip-view { display: none; }
    html.luna-pip #luna-pip-view {
      display: flex; position: fixed; inset: 0; z-index: 2147483647; flex-direction: column; align-items: center; justify-content: center; gap: 3vh;
      color: #fff; font-family: Nunito, system-ui, sans-serif; text-align: center; overflow: hidden;
      background: radial-gradient(circle at 25% 15%, #6b4fa8 0%, #3a2c66 55%, #241c3d 100%);
    }
    html.luna-pip #luna-pip-view[data-faz="mola"] { background: radial-gradient(circle at 25% 15%, #3f8f7a 0%, #2a5a55 55%, #1b2f33 100%); }
    html.luna-pip #luna-pip-view[data-faz="dur"] { background: radial-gradient(circle at 25% 15%, #5d5675 0%, #3a3550 55%, #24202f 100%); }
    #luna-pip-view .lp-ust { font-size: 12vh; font-weight: 700; opacity: .9; letter-spacing: .02em; white-space: nowrap; }
    #luna-pip-view .lp-saat { font-size: 46vh; font-weight: 800; line-height: .95; font-variant-numeric: tabular-nums; letter-spacing: .01em; }
    #luna-pip-view .lp-alt { font-size: 10vh; opacity: .75; white-space: nowrap; max-width: 92vw; overflow: hidden; text-overflow: ellipsis; }`;
  document.head.appendChild(css);

  const state = () => { try { return Timer.state(); } catch (e) { return null; } };
  const draw = () => {
    const s = state();
    if (!view || !s) return;
    const sec = Math.max(0, s.countdown ? Math.ceil(s.remaining) : Math.floor(s.elapsed));
    const label = s.fresh ? 'Hazır' : !s.running ? 'Duraklatıldı' : s.phase === 'focus' ? 'Odak zamanı' : 'Mola zamanı';
    let sub = '';
    try { if (s.phase === 'focus') sub = Store.subject((Store.data.timer || {}).subjectId || '').name; } catch (e) { /* yok say */ }
    view.dataset.faz = !s.running ? 'dur' : s.phase === 'focus' ? 'odak' : 'mola';
    view.querySelector('.lp-ust').textContent = label;
    view.querySelector('.lp-saat').textContent = U.fmtClock(sec);
    view.querySelector('.lp-alt').textContent = sub;
  };
  const sync = () => {
    const s = state(), run = !!(s && s.running);
    if (run !== last) { last = run; Pip.setState({ running: run }).catch(() => {}); }
  };
  const loop = () => {
    sync();
    if (pipOn) draw();
    clearTimeout(tick);
    tick = setTimeout(loop, pipOn ? 1000 - (Date.now() % 1000) + 20 : 1000);
  };
  Pip.addListener('toggle', () => {
    try { App.miniToggle(); } catch (e) { note('mini pencere tuşu çalışmadı: ' + ((e && e.message) || e)); }
    last = null; sync(); draw();
  });
  Pip.addListener('pip', (e) => {
    const on = !!(e && e.inPip);
    if (on === pipOn) return;
    if (on) { try { App.allowExit('miniTimer'); } catch (err) { /* yok say */ } }
    pipOn = on;
    document.documentElement.classList.toggle('luna-pip', on);
    draw();
    document.dispatchEvent(new Event('visibilitychange')); // Luna: mini pencereye geçildi / mini pencereden dönüldü
    loop();
  });
  window.addEventListener('load', () => {
    Pip.isSupported().then((r) => {
      if (!r || !r.supported) return;
      view = document.createElement('div');
      view.id = 'luna-pip-view';
      view.innerHTML = '<div class="lp-ust"></div><div class="lp-saat"></div><div class="lp-alt"></div>';
      document.body.appendChild(view);
      if (window.MiniTimer) { const isOpen = MiniTimer.isOpen; MiniTimer.isOpen = () => pipOn || isOpen(); } // Tam odak: izinli çıkış
      const btn = document.getElementById('mini-timer-open');
      if (btn) {
        btn.hidden = false;
        btn.textContent = '🐾 Mini pencere';
        btn.title = 'Luna köşeye küçülür; sayaç orada sayar, tuşuyla durdurup başlatırsın.';
        btn.addEventListener('click', () => {
          const s = state();
          Pip.enter({ running: !!(s && s.running) }).catch(() => {
            try { App.toast('🐾', 'Mini pencere açılamadı', 'Ayarlar → Uygulamalar → Luna → Resim içinde resim iznini aç', 8000); } catch (e) { /* yok say */ }
          });
        });
      }
      loop();
    }).catch(() => {});
  });
})();
