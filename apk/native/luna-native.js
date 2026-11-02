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
  // Tanı satırı (yalnızca cihaz günlüğüne yazılır): Spotify oynatıcısının ihtiyaç duyduğu korumalı müzik desteği var mı
  try {
    navigator.requestMediaKeySystemAccess('com.widevine.alpha', [{ initDataTypes: ['cenc'], audioCapabilities: [{ contentType: 'audio/mp4; codecs="mp4a.40.2"' }] }])
      .then(() => console.info('Luna APK: korumalı müzik (Widevine) var'), (e) => console.warn('Luna APK: korumalı müzik (Widevine) yok: ' + ((e && e.name) || e)));
  } catch (e) { console.warn('Luna APK: korumalı müzik denetlenemedi'); }

  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseMusic(); });
  document.addEventListener('pause', pauseMusic); // Capacitor: uygulama arkaya geçti
  if (P.App) P.App.addListener('pause', pauseMusic);
})();
