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
  yaz('Luna: ' + String(await device.shell('dumpsys package com.hazal.luna | grep -m1 -o "versionCode=[0-9]*"')).trim());
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
  // 5) Spotify girişinden dönüş yolu (donus-sunucu.cjs taklit eder): uygulama içi Chrome sekmesi com.hazal.luna://spotify-callback'e
  //    yönlenince Luna öne gelip "Spotify dönüşü geldi" yazmalı. İki durum: (a) Spotify izin sayfasını atlayıp hemen yönlendirir,
  //    (b) Hazal izin sayfasında "Kabul et"e basar (uygulama izin sayfasını her seferinde gösterir: show_dialog).
  const SUNUCU = process.env.DONUS_SUNUCU || 'http://10.0.2.2:8089';
  const donusSay = () => page.evaluate(() => (window.ErrLog ? ErrLog.list() : []).filter((x) => /Spotify dönüşü geldi/.test(x.m)).map((x) => x.m)).catch(() => []);
  const onde = async () => String(await device.shell('dumpsys activity activities | grep -m1 -E "topResumedActivity"')).trim().replace(/^.*ActivityRecord\{\S+ \S+ /, '').replace(/ t\d+\}$/, '');
  const dene = async (ad, url, dokun) => {
    await device.shell('am start -n com.hazal.luna/.MainActivity');
    await bekle(2500);
    try { await page.waitForFunction(HAZIR, null, { timeout: 30000 }); } catch (e) { /* aşağıda yazılır */ }
    const once = (await donusSay()).length;
    await page.evaluate((u) => Capacitor.Plugins.Browser.open({ url: u }), url).catch((e) => yaz(ad + ': sekme açılamadı ' + e.message));
    await bekle(5000);
    if (dokun) {
      const m = String(await device.shell('wm size')).match(/(\d+)x(\d+)/);
      await device.shell(`input tap ${Math.round(+m[1] / 2)} ${Math.round(+m[2] / 2)}`);
    }
    await bekle(7000);
    await shot('06-spotify-donus-' + ad);
    const on = await onde();
    let gelen = [];
    try { await page.waitForFunction(HAZIR, null, { timeout: 15000 }); gelen = (await donusSay()).slice(once); } catch (e) { /* Luna öne gelmedi */ }
    yaz(`Spotify dönüşü (${ad}): ${gelen.length ? 'LUNA ALDI ✓ ' + gelen.join(' | ') : 'LUNA ALMADI ✗'} · öndeki ekran: ${on}`);
  };
  await dene('izin-sayfasi-atlaninca', SUNUCU + '/r?k=OTO', false);
  await dene('kabul-et-dokununca', SUNUCU + '/dokun', true);
  await device.shell('am start -n com.hazal.luna/.MainActivity');
  await bekle(3000);
  try { await page.waitForFunction(HAZIR, null, { timeout: 30000 }); } catch (e) { yaz('dönüşten sonra Luna hazır değil: ' + e.message); }
  // 6) Luna'nın kendi güncellemesi (web paketi), gerçek Android koduyla: bu derlemenin GitHub'daki paketi indirilir,
  //    özetiyle doğrulanır, açılır, Luna ondan yeniden yüklenir ve açılınca onaylanır (LunaWebPlugin).
  try {
    const pk = await page.evaluate(() => fetch('native/paket.json', { cache: 'no-store' }).then((r) => r.json()));
    yaz('paket: ' + JSON.stringify(pk));
    const rel = await fetch('https://api.github.com/repos/' + (process.env.GITHUB_REPOSITORY || 'cagansezerkaraman00-byte/Hazal-cal-sma-') + '/releases/tags/apk-' + pk.kod, { headers: { Accept: 'application/vnd.github+json', ...(process.env.GH_TOKEN ? { Authorization: 'Bearer ' + process.env.GH_TOKEN } : {}) } }).then((r) => r.json());
    const as = (rel.assets || []).find((a) => a.name === 'luna-web-' + pk.yerli + '.zip');
    if (!as) throw new Error('sürüm sayfasında luna-web-' + pk.yerli + '.zip yok');
    const sha = String(as.digest || '').replace(/^sha256:/, '');
    const DENEME_KOD = 900000 + (pk.kod % 100000); // bu derlemenin aynısı, deneme numarasıyla
    const t0 = Date.now();
    const ind = await page.evaluate(([u, k, h]) => Capacitor.Plugins.LunaWeb.indir({ url: u, kod: k, sha256: h }).then((r) => 'tamam ' + r.yol, (e) => 'HATA ' + e.message), [as.browser_download_url, DENEME_KOD, sha]);
    yaz(`web paketi indir (${Math.round((Date.now() - t0) / 1000)} sn, ${Math.round(as.size / 1e5) / 10} MB): ${ind}`);
    const yanlis = await page.evaluate(([u]) => Capacitor.Plugins.LunaWeb.indir({ url: u, kod: 900001, sha256: '00'.repeat(32) }).then(() => 'KABUL ETTİ ✗', (e) => 'reddetti ✓ ' + e.message), [as.browser_download_url]);
    yaz('yanlış özetli paket: ' + yanlis);
    await page.evaluate((k) => Capacitor.Plugins.LunaWeb.uygula({ kod: k }), DENEME_KOD);
    await bekle(4000);
    await page.waitForFunction(HAZIR, null, { timeout: 60000 });
    await bekle(4000); // açılışta 2,5 sn sonra onay
    const bilgi = await page.evaluate(() => Capacitor.Plugins.LunaWeb.bilgi());
    yaz('web paketiyle açıldı: ' + JSON.stringify(bilgi) + (String(bilgi.yol).endsWith('/' + DENEME_KOD) && !bilgi.bekleyen ? ' ✓ onaylandı' : ' ✗'));
    await shot('07-web-paketiyle');
    await bekle(25000); // 25 sn bekçisi onaylı pakette geri döndürmemeli
    const bilgi2 = await page.evaluate(() => Capacitor.Plugins.LunaWeb.bilgi()).catch((e) => ({ hata: e.message }));
    yaz('25 sn sonra: ' + JSON.stringify(bilgi2) + (String(bilgi2.yol).endsWith('/' + DENEME_KOD) ? ' ✓ yerinde' : ' ✗ geri döndü'));
    // uygulama kapatılıp açılınca da indirilmiş paketle açılır
    await device.shell('am force-stop com.hazal.luna');
    await device.shell('am start -W -n com.hazal.luna/.MainActivity');
    const wv2 = await device.webView({ pkg: 'com.hazal.luna' }, { timeout: 60000 });
    const p2 = await wv2.page();
    await p2.waitForFunction(HAZIR, null, { timeout: 60000 });
    const bilgi3 = await p2.evaluate(() => Capacitor.Plugins.LunaWeb.bilgi());
    yaz('kapatıp açınca: ' + JSON.stringify(bilgi3) + (String(bilgi3.yol).endsWith('/' + DENEME_KOD) ? ' ✓ indirilmiş paketle' : ' ✗'));
    const veri = await p2.evaluate(() => !!localStorage.getItem('luna-siir-okundu'));
    yaz('veriler yerinde: ' + (veri ? '✓' : '✗'));
  } catch (e) { yaz('web paketi denemesi yarıda kaldı: ' + e.message); }
  // Tanılama günlüğü (Luna'nın kendi hata günlüğü)
  let gunluk = [];
  try {
    const sayfa = (await (await device.webView({ pkg: 'com.hazal.luna' }, { timeout: 20000 })).page());
    gunluk = await sayfa.evaluate(() => (window.ErrLog ? ErrLog.list() : []).map((x) => x.m));
  } catch (e) { yaz('Tanılama okunamadı: ' + e.message); }
  gunluk.forEach((m) => yaz('Tanılama: ' + m));
  fs.writeFileSync(path.join(out, 'rapor.txt'), rapor.join('\n') + '\n');
  await device.close();
})().catch((e) => { yaz('DENEME DURDU: ' + (e && e.stack || e)); fs.writeFileSync(path.join(out, 'rapor.txt'), rapor.join('\n') + '\n'); process.exit(1); });
