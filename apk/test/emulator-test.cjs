// Android emülatöründe Luna uygulamasının gerçek denemesi (GitHub Actions: .github/workflows/emulator.yml).
// Kullanım: node apk/test/emulator-test.cjs <çıktı klasörü>   (adb ile bağlı tek cihaz, Luna'nın deneme APK'sı kurulu)
// Deneme APK'sında uygulama içi tarayıcı (WebView) incelenebilir; Playwright ona adb üzerinden bağlanır.
const { _android } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const out = process.argv[2] || 'cikti';
fs.mkdirSync(out, { recursive: true });
const rapor = [];
const yaz = (s) => { console.log(s); rapor.push(s); };
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
// Luna'nın modülleri sayfanın genel kapsamında (const): window üzerinde değil, adıyla sorulur
const HAZIR = 'typeof App !== "undefined" && typeof Timer !== "undefined" && typeof MiniTimer !== "undefined" && !!document.getElementById("btn-toggle")';

(async () => {
  const [device] = await _android.devices();
  if (!device) throw new Error('cihaz yok');
  yaz(`cihaz: ${device.model()} · ${device.serial()}`);
  const shot = async (ad) => { await device.screenshot({ path: path.join(out, ad + '.png') }); yaz('ekran: ' + ad + '.png'); };

  await device.shell('am force-stop com.hazal.luna');
  await device.shell('am start -W -n com.hazal.luna/.MainActivity');
  const webview = await device.webView({ pkg: 'com.hazal.luna' }, { timeout: 90000 });
  const page = await webview.page();
  page.on('console', (m) => { if (/Luna APK|Error|error/.test(m.text())) yaz('konsol: ' + m.text().slice(0, 300)); });
  page.on('pageerror', (e) => yaz('SAYFA HATASI: ' + e.message));
  await page.waitForFunction(HAZIR, null, { timeout: 90000 });
  // ilk açılış kartları (şiir, mektup) denemeyi kapatmasın
  await page.evaluate(() => { ['luna-siir-okundu', 'luna-siir-gosterildi', 'luna-mektup-okundu'].forEach((k) => localStorage.setItem(k, '1')); });
  await page.reload();
  await page.waitForFunction(HAZIR, null, { timeout: 90000 });
  await bekle(6000);
  for (let i = 0; i < 4; i++) { await page.evaluate(() => { try { App.closeModal(); } catch (e) {} }); await bekle(300); }
  await shot('01-acilis');

  // 1) Spotify'ın korumalı müzik ihtiyacı: uygulama içi tarayıcı Widevine veriyor mu
  const drm = await page.evaluate(async () => {
    const dene = async (ad, cfg) => {
      try { const a = await navigator.requestMediaKeySystemAccess('com.widevine.alpha', [cfg]); await a.createMediaKeys(); return ad + ': VAR'; }
      catch (e) { return ad + ': YOK (' + (e && (e.name + ' ' + e.message)) + ')'; }
    };
    const ses = [{ contentType: 'audio/mp4; codecs="mp4a.40.2"' }];
    return [
      await dene('en basit', { initDataTypes: ['cenc'], audioCapabilities: ses }),
      await dene('yazılım güvenliği', { initDataTypes: ['cenc'], audioCapabilities: [{ contentType: 'audio/mp4; codecs="mp4a.40.2"', robustness: 'SW_SECURE_CRYPTO' }] }),
      await dene('kalıcı durum', { initDataTypes: ['cenc'], audioCapabilities: ses, persistentState: 'required' }),
      await dene('ayırt edici kimlik', { initDataTypes: ['cenc'], audioCapabilities: ses, distinctiveIdentifier: 'required' }),
    ];
  });
  drm.forEach((s) => yaz('Widevine ' + s));

  // 2) Spotify oynatıcısı (Web Playback SDK) bu tarayıcıda başlayabiliyor mu: sahte anahtarla bağlanılır.
  //    "authentication_error" gelirse oynatıcı kurulmuş, yalnızca anahtar reddedilmiştir (yani gerçek girişle çalışır);
  //    "initialization_error" gelirse oynatıcı bu tarayıcıda hiç kurulamıyor demektir.
  const sdk = await page.evaluate(() => new Promise((done) => {
    const olay = [];
    const bitir = () => done(olay.length ? olay : ['30 sn içinde hiçbir olay gelmedi']);
    setTimeout(bitir, 30000);
    const kur = () => {
      try {
        const p = new window.Spotify.Player({ name: 'Luna deneme', getOAuthToken: (cb) => cb('sahte-anahtar'), volume: 0.1 });
        ['ready', 'not_ready', 'initialization_error', 'authentication_error', 'account_error', 'playback_error'].forEach((ad) =>
          p.addListener(ad, (e) => { olay.push(ad + (e && e.message ? ': ' + e.message : '')); if (/error|ready/.test(ad)) setTimeout(bitir, 1500); }));
        p.connect().then((ok) => olay.push('connect() → ' + ok));
      } catch (e) { olay.push('kurulamadı: ' + e.message); bitir(); }
    };
    if (window.Spotify && window.Spotify.Player) { kur(); return; }
    const once = window.onSpotifyWebPlaybackSDKReady;
    window.onSpotifyWebPlaybackSDKReady = () => { if (typeof once === 'function') try { once(); } catch (e) {} kur(); };
    const s = document.createElement('script'); s.src = 'https://sdk.scdn.co/spotify-player.js';
    s.onerror = () => { olay.push('Spotify betiği inemedi'); bitir(); };
    document.head.appendChild(s);
  }));
  sdk.forEach((s) => yaz('Spotify oynatıcı: ' + s));

  // 3) Mini pencere: sayaç başlar, Mini pencere düğmesine basılır
  await page.evaluate(() => { const b = document.getElementById('btn-toggle'); if (!Timer.state().running) b.click(); });
  await bekle(1500);
  const dugme = await page.evaluate(() => { const b = document.getElementById('mini-timer-open'); return b ? { gorunur: !b.hidden, yazi: b.textContent } : null; });
  yaz('mini pencere düğmesi: ' + JSON.stringify(dugme));
  await shot('02-sayac');
  await page.evaluate(() => document.getElementById('mini-timer-open').click());
  await bekle(4000);
  const pip = async () => page.evaluate(() => {
    const v = document.getElementById('luna-pip-view'), c = v && v.querySelector('canvas'), r = c && c.getBoundingClientRect();
    return { pipSinifi: document.documentElement.classList.contains('luna-pip'), pencere: innerWidth + '×' + innerHeight, tuval: r ? Math.round(r.width) + '×' + Math.round(r.height) : 'yok', gizli: document.hidden, sayac: Timer.state().running };
  });
  yaz('mini pencerede: ' + JSON.stringify(await pip()));
  yaz(await device.shell('dumpsys activity activities | grep -iE "pinned|windowingMode=pinned|mode=pinned" | head -5').then(String));
  await shot('03-mini-pencere');
  await bekle(3000);
  await shot('04-mini-pencere-3sn-sonra');
  // 4) Luna'ya dönüş
  await device.shell('am start -n com.hazal.luna/.MainActivity');
  await bekle(3000);
  yaz('dönünce: ' + JSON.stringify(await pip()));
  await shot('05-donus');
  // 5) Spotify girişinden dönüş yolu: uygulama içi Chrome sekmesi açılır, sunucu hemen com.hazal.luna://spotify-callback'e yönlendirir
  //    (Spotify izin sayfası atlandığında olan budur). Luna bu adresi alırsa Tanılama'ya "Spotify dönüşü geldi" yazar.
  await page.evaluate(() => Capacitor.Plugins.Browser.open({ url: 'https://httpbin.org/redirect-to?url=' + encodeURIComponent('com.hazal.luna://spotify-callback?code=DENEME&state=emu') }).catch((e) => console.info('Luna APK: deneme sekmesi açılamadı ' + e.message)));
  await bekle(9000);
  await shot('06-spotify-donus-sekme');
  yaz('ön plandaki: ' + String(await device.shell('dumpsys activity activities | grep -E "topResumedActivity|mResumedActivity" | head -3')).trim());
  await device.shell('am start -n com.hazal.luna/.MainActivity');
  await bekle(4000);
  try { await page.waitForFunction(HAZIR, null, { timeout: 30000 }); } catch (e) { yaz('dönüşten sonra Luna hazır değil: ' + e.message); }
  // Tanılama günlüğü (Luna'nın kendi hata günlüğü)
  const gunluk = await page.evaluate(() => (window.ErrLog ? ErrLog.list() : []).map((x) => x.m));
  gunluk.forEach((m) => yaz('Tanılama: ' + m));
  fs.writeFileSync(path.join(out, 'rapor.txt'), rapor.join('\n') + '\n');
  await device.close();
})().catch((e) => { yaz('DENEME DURDU: ' + (e && e.stack || e)); fs.writeFileSync(path.join(out, 'rapor.txt'), rapor.join('\n') + '\n'); process.exit(1); });
