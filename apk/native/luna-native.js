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

  // Tanı kaydı: Ayarlar → Tanılama → Hata günlüğünde görünür (jeton, kod gibi gizli bilgiler yazılmaz)
  const note = (msg) => {
    console.info('Luna APK: ' + msg);
    try {
      if (window.ErrLog) { ErrLog.add('Uygulama: ' + msg, 'luna-native.js'); return; }
      // Luna'nın günlüğü henüz yüklenmediyse aynı yere aynı biçimde yazılır (sayfa hemen yeniden açılsa da kaybolmaz)
      const l = JSON.parse(localStorage.getItem('luna-errors') || '[]');
      const liste = Array.isArray(l) ? l : [];
      liste.push({ t: Date.now(), m: ('Uygulama: ' + msg).slice(0, 300), s: 'luna-native.js' });
      localStorage.setItem('luna-errors', JSON.stringify(liste.slice(-20)));
    } catch (e) { /* yok say */ }
  };

  // Giriş sayfaları (Spotify) uygulama içi Chrome sekmesinde açılır; giriş bitince sekme kapanıp Luna'ya dönülür.
  // show_dialog: Spotify izin sayfasını her seferinde gösterir. Hazal "Kabul et"e basınca Luna'ya dönüş bir dokunuşla olur;
  // izin sayfası atlanınca Chrome, kendiliğinden uygulamaya geçişi engelleyip sekmeyi boş bırakabiliyor.
  window.LunaApk = {
    open(url) {
      if (/^https:\/\/accounts\.spotify\.com\/authorize\?/.test(url) && !/[?&]show_dialog=/.test(url)) url += '&show_dialog=true';
      note('Spotify girişi açılıyor');
      if (P.Browser && P.Browser.open) {
        P.Browser.open({ url }).catch((e) => { note('Spotify giriş sekmesi açılamadı: ' + ((e && e.message) || e)); location.href = url; });
      } else { note('Spotify giriş sekmesi yok, Luna içinde açılıyor'); location.href = url; }
    },
  };

  // Spotify girişinden dönüş: tarayıcı com.hazal.luna://spotify-callback?code=… adresini uygulamaya verir.
  // Luna'nın kendi dönüş işleyicisi (?code=… okuyan) çalışsın diye sayfa bu bilgiyle bir kez yeniden açılır.
  const finishSpotify = (url) => {
    if (!url || !/^com\.hazal\.luna:\/\/spotify-callback\?/i.test(url)) return;
    try { if (sessionStorage.getItem('luna-apk-donus') === url) return; sessionStorage.setItem('luna-apk-donus', url); } catch (e) { /* yok say */ }
    const q = new URLSearchParams(url.slice(url.indexOf('?') + 1));
    note('Spotify dönüşü geldi: ' + (q.get('code') ? 'giriş kodu var' : 'hata=' + (q.get('error') || 'bilinmiyor')));
    location.replace(location.origin + '/' + url.slice(url.indexOf('?')));
  };
  // Spotify jeton alışverişinin sonucu: başarısızsa Spotify'ın verdiği sebep (ör. invalid_grant, Invalid redirect URI) günlüğe düşer
  if (window.fetch) {
    const fetch0 = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const u = typeof input === 'string' ? input : (input && input.url) || '';
      const p = fetch0(input, init);
      if (u.indexOf('https://accounts.spotify.com/api/token') !== 0) return p;
      const kind = /grant_type=authorization_code/.test(String(init && init.body)) ? 'giriş' : 'yenileme';
      return p.then((r) => {
        if (r.ok) { if (kind === 'giriş') note('Spotify giriş jetonu alındı'); return r; }
        r.clone().json().catch(() => ({})).then((j) => note(`Spotify ${kind} jetonu alınamadı (${r.status}): ${j.error || ''} ${j.error_description || ''}`.trim()));
        return r;
      }, (e) => { note(`Spotify ${kind} jetonu için bağlantı kurulamadı: ${(e && e.message) || e}`); throw e; });
    };
  }
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
  // Deneme kanalı (Çağan'ın telefonu): kartta sürüm yazısına 5 kez dokununca açılır; GitHub'daki en yeni derleme teklif edilir.
  // Ayar yalnızca o cihazda durur (Luna verisine, yedeğe girmez); Hazal'ın tabletinde kapalı kalır.
  const Gn = P.LunaGuncelle;
  if (Gn && P.App && P.App.getInfo) {
    const KAYNAK = 'https://cagansezerkaraman00-byte.github.io/Hazal-cal-sma-/apk/guncel.json';
    const SON_DERLEME = 'https://api.github.com/repos/cagansezerkaraman00-byte/Hazal-cal-sma-/releases/latest';
    const DENEME = 'luna-apk-deneme';
    // Denetimli kopya (luna-deneme.apk: bilgisayardaki sanal telefonda Chrome'un chrome://inspect sayfasından incelenebilen sürüm):
    // başka anahtarla imzalı olduğu için yalnızca kendi türüyle güncellenir; her zaman en yeni derlemeyi alır.
    const denetimli = !!cap.DEBUG;
    const APK_ADI = denetimli ? 'luna-deneme.apk' : 'luna.apk';
    const deneme = () => { if (denetimli) return true; try { return localStorage.getItem(DENEME) === '1'; } catch (e) { return false; } };
    const g = { kod: 0, surum: '', yeni: null, durum: 'bekle', yuzde: -1, izin: false, hata: '', bakildi: 0, haber: 0 };
    let dokunus = [];
    // GitHub'daki derleme → guncel.json biçimi (kod, sürüm, apk, yenilikler)
    const derleme = (r) => {
      const kod = +String(r.tag_name || '').replace(/^apk-/, '');
      const a = (r.assets || []).find((x) => x.name === APK_ADI && x.state === 'uploaded' && x.size > 0);
      if (!(kod > 0) || !a) return null;
      const ust = String(r.body || '').split(/\n---\n/)[0];
      return {
        kod, surum: (String(r.name || '').match(/Luna APK ([\d.]+)/) || [])[1] || '', apk: a.browser_download_url, boyut: a.size,
        yenilikler: ust.split('\n').filter((s) => /^- /.test(s)).map((s) => s.slice(2).trim()),
      };
    };
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
        <div class="upd-row"><img src="icons/icon-192.png" alt="" class="ub-icon"><div class="ub-text"><b>Luna uygulaması</b><small data-ag="surum">Sürüm ${esc(g.surum || '?')} · derleme ${esc(g.kod || '?')}${denetimli ? ' · 🔍 denetimli kopya' : deneme() ? ' · 🧪 deneme kanalı' : ''}</small></div>
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
      g.durum = 'bakiliyor'; g.hata = ''; g.bakildi = Date.now(); ciz();
      try {
        let j = null;
        if (deneme()) {
          try {
            const r = await fetch(SON_DERLEME, { cache: 'no-store', headers: { Accept: 'application/vnd.github+json' } });
            if (r.ok) j = derleme(await r.json());
          } catch (e) { /* aşağıda onaylı sürüme bakılır */ }
        }
        if (!j && !denetimli) { // onaylı sürüm (guncel.json) kalıcı anahtarlıdır; denetimli kopyaya kurulamaz
          const r = await fetch(KAYNAK + '?t=' + Date.now(), { cache: 'no-store' });
          if (!r.ok) throw new Error('HTTP ' + r.status);
          j = await r.json();
        }
        if (!j) throw new Error('derleme bulunamadı');
        g.yeni = +j.kod > +g.kod && /^https:\/\//.test(j.apk || '') ? j : null;
        g.durum = 'tamam';
        // aynı sürüm için tek haber (Luna'ya her dönüşte yeniden çıkmasın)
        if (g.yeni && sessiz && g.haber !== +g.yeni.kod) { g.haber = +g.yeni.kod; toast('✨', 'Yeni Luna hazır', "Ayarlar → Uygulama güncellemesi'nden güncelleyebilirsin", 8000); }
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
      if (!g.izin) {
        // Luna uzun süre arkadaysa dönüşte bir kez daha sessizce bakılır (deneme kanalında 10 dakikada bir, normalde 6 saatte bir)
        if (g.kod && Date.now() - g.bakildi > (deneme() ? 10 * 60000 : 6 * 3600000)) denetle(true);
        return;
      }
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
          if (!b) return;
          if (b.dataset.ag === 'surum' && !denetimli) {
            // sürüm yazısına 3 saniye içinde 5 dokunuş: deneme kanalı açılır / kapanır
            const simdi = Date.now();
            dokunus = dokunus.filter((t) => simdi - t < 3000).concat(simdi);
            if (dokunus.length < 5) return;
            dokunus = [];
            const ac = !deneme();
            try { if (ac) localStorage.setItem(DENEME, '1'); else localStorage.removeItem(DENEME); } catch (err) { return; }
            toast('🧪', ac ? 'Deneme kanalı açık' : 'Deneme kanalı kapalı', ac ? 'Her yeni derleme burada çıkar' : 'Yalnızca onaylı sürümler gelir');
            g.haber = 0; denetle(false);
          } else if (b.dataset.ag === 'kur') kur();
          else denetle(false);
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
    html.luna-pip #luna-pip-view { display: flex; position: fixed; inset: 0; z-index: 2147483647; align-items: center; justify-content: center; overflow: hidden; }
    #luna-pip-view canvas { display: block; width: 100%; height: 100%; object-fit: contain; }`;
  document.head.appendChild(css);

  const state = () => { try { return Timer.state(); } catch (e) { return null; } };
  const acik = () => pipOn || document.documentElement.classList.contains('luna-pip'); // pencerede ya da açılmak üzere
  // Chrome'daki mini pencerenin kendisi: aynı çizim (MiniTimer.render), aynı renk teması, aynı aile resmi
  const draw = () => {
    if (!view || !window.MiniTimer) return;
    try {
      window.LUNA_PIP = acik();
      MiniTimer.render(view.firstChild);
      view.style.background = MiniTimer.palette().bg;
    } catch (e) { note('mini pencere çizilemedi: ' + ((e && e.message) || e)); }
  };
  const sync = () => {
    const s = state(), run = !!(s && s.running);
    if (run !== last) { last = run; Pip.setState({ running: run }).catch(() => {}); }
  };
  // saniye değişim anına denk çizim (Chrome'daki mini pencereyle aynı zamanlama)
  const msToNext = (s) => {
    if (!s || !s.running) return 1000 - (Date.now() % 1000) + 20;
    const v = s.countdown ? s.remaining : s.elapsed, f = v - Math.floor(v);
    return Math.max(40, Math.round((s.countdown ? f : 1 - f) * 1000) + 25);
  };
  const loop = () => {
    sync();
    if (acik()) draw();
    clearTimeout(tick);
    tick = setTimeout(loop, acik() ? msToNext(state()) : 1000);
  };
  Pip.addListener('toggle', () => {
    try { App.miniToggle(); } catch (e) { note('mini pencere tuşu çalışmadı: ' + ((e && e.message) || e)); }
    last = null; sync(); draw();
  });
  // Mini pencere açılmadan hemen önce görüntüsü tam ekranda hazırlanır (Chrome'daki video gibi):
  // Android pencereyi bu görüntüden küçültür. Açılamazsa ya da Luna'ya dönülünce Luna ve kaydırma yeri geri gelir.
  let kaydirma = 0;
  const hazirla = () => {
    if (!document.documentElement.classList.contains('luna-pip')) kaydirma = window.scrollY || 0;
    document.documentElement.classList.add('luna-pip');
    draw();
    loop(); // saniyeler pencere açılırken de aksın
  };
  const geriAl = () => {
    if (pipOn || !document.documentElement.classList.contains('luna-pip')) return;
    document.documentElement.classList.remove('luna-pip');
    window.LUNA_PIP = false;
    window.scrollTo(0, kaydirma);
    loop();
  };
  Pip.addListener('pip', (e) => {
    const on = !!(e && e.inPip);
    if (on === pipOn) return;
    if (on) { try { App.allowExit('miniTimer'); } catch (err) { /* yok say */ } }
    pipOn = on;
    if (on) document.documentElement.classList.add('luna-pip'); else geriAl();
    draw();
    document.dispatchEvent(new Event('visibilitychange')); // Luna: mini pencereye geçildi / mini pencereden dönüldü
    loop();
  });
  window.addEventListener('load', () => {
    Pip.isSupported().then((r) => {
      if (!r || !r.supported) return;
      view = document.createElement('div');
      view.id = 'luna-pip-view';
      view.innerHTML = '<canvas width="1280" height="536"></canvas>';
      document.body.appendChild(view);
      draw(); // aile resmi şimdiden yüklensin: pencere açılınca ilk anda da kediler görünsün
      if (window.MiniTimer) {
        const isOpen = MiniTimer.isOpen; MiniTimer.isOpen = () => pipOn || isOpen(); // Tam odak: izinli çıkış
        const refresh = MiniTimer.refreshTheme; MiniTimer.refreshTheme = () => { refresh(); draw(); }; // renk değişince pencere de hemen değişsin
      }
      const picker = document.querySelector('.mini-theme-picker');
      if (picker) picker.hidden = false; // mini pencere renkleri (Ayarlar), Chrome'daki gibi
      const btn = document.getElementById('mini-timer-open');
      if (btn) {
        btn.hidden = false;
        btn.textContent = '🐾 Mini pencere';
        btn.title = 'Başka uygulamaya geçmeden önce aç; Luna\'ya dönünce kapanır.';
        btn.addEventListener('click', () => {
          if (pipOn) return;
          const s = state();
          hazirla();
          // görüntü ekrana çizildikten sonra (iki kare) pencere istenir; görüntünün yeri Android'e verilir
          requestAnimationFrame(() => requestAnimationFrame(() => {
            const c = view.firstChild, r = c.getBoundingClientRect(), k = window.devicePixelRatio || 1;
            let w = r.width, h = r.height; // tuval kutusunun içinde çizimin gerçekten durduğu yer (object-fit: contain)
            if (w / h > c.width / c.height) w = h * c.width / c.height; else h = w * c.height / c.width;
            const x = r.left + (r.width - w) / 2, y = r.top + (r.height - h) / 2;
            Pip.enter({ running: !!(s && s.running), x: Math.round(x * k), y: Math.round(y * k), w: Math.round(w * k), h: Math.round(h * k) })
              .then((res) => { if (!res || !res.ok) geriAl(); })
              .catch(() => {
                geriAl();
                try { App.toast('🐾', 'Mini pencere açılamadı', 'Ayarlar → Uygulamalar → Luna → Resim içinde resim iznini aç', 8000); } catch (e) { /* yok say */ }
              });
          }));
        });
      }
      loop();
    }).catch(() => {});
  });
})();
