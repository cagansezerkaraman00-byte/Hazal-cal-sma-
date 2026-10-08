// Run before pushing: NODE_PATH=$(npm root -g) node scripts/smoke.cjs   (needs Playwright + Chromium; never "playwright install" here)
// Luna'yı gerçek bir tarayıcıda, ana ekrandan açılmış gibi başlatır: sayfa hatası yok, onarım ekranı yok, gökyüzü çiziliyor
// ve hareket ediyor, hiçbir parça açılışta hata vermiyor, her sekme açılıyor, servis çalışanı bu sürümü doğrulayıp
// önbelleğe alabiliyor; tarayıcı sekmesinde kurulum sayfası açılış ekranı olmadan görünüyor.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { console.log('Playwright yok: tarayıcı denemesi atlandı (node tests/*.cjs yine de çalıştırılmalı)'); process.exit(0); }
const root = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const file = path.join(root, path.normalize(p));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const version = JSON.parse(fs.readFileSync(path.join(root, 'js/surum.js'), 'utf8').match(/\/\*SURUMLER\*\/([\s\S]*?)\/\*SURUMLER\*\//)[1])[0].surum;
  const browser = await chromium.launch();
  const fails = [];
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1024, height: 1366 }]) {
      const context = await browser.newContext({ viewport });
      await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort()); // yazı tipi, hava durumu, Spotify: internetsiz de açılmalı
      await context.addInitScript(() => Object.defineProperty(navigator, 'standalone', { get: () => true }));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message.split('\n')[0]));
      page.on('console', (m) => { if (m.type() === 'error' && /^Luna /.test(m.text())) errors.push(m.text().split('\n')[0]); }); // safe() ile yutulan parça hataları
      await page.goto(base + '?source=homescreen');
      await page.waitForTimeout(2500);
      const s = await page.evaluate(async () => {
        const c = document.querySelector('#sky'), g = c && c.getContext('2d');
        const snap = () => { const d = g.getImageData(0, 0, c.width, c.height).data, set = new Set(); let h = 0; for (let i = 0; i < d.length; i += 4) { set.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]); h = (h * 31 + d[i] + 3 * d[i + 1] + 7 * d[i + 2]) >>> 0; } return [set.size, h]; };
        const a = snap(); await new Promise((r) => setTimeout(r, 1200)); const b = snap();
        return { app: typeof window.App, repair: !!document.getElementById('luna-boot-repair'), clock: document.getElementById('hud-time').textContent, colours: a[0], moving: a[1] !== b[1] };
      });
      const tag = `${viewport.width}px`;
      if (s.app !== 'object') fails.push(`${tag}: uygulama başlamadı (App yok)`);
      if (s.repair) fails.push(`${tag}: "Luna biraz uykulu" açılış ekranı göründü`);
      if (!/^\d\d:\d\d$/.test(s.clock)) fails.push(`${tag}: saat çalışmıyor (${s.clock})`);
      if (s.colours < 50) fails.push(`${tag}: gökyüzü çizilmedi (${s.colours} renk)`);
      if (!s.moving) fails.push(`${tag}: gökyüzü hareket etmiyor`);
      if (s.app !== 'object' || s.repair) { for (const e of [...new Set(errors)]) fails.push(`${tag}: sayfa hatası: ${e}`); await context.close(); continue; }
      for (const tab of await page.$$eval('#tabs button', (bs) => bs.map((b) => b.dataset.tab))) {
        await page.keyboard.press('Escape');
        await page.click(`#tabs button[data-tab="${tab}"]`, { timeout: 3000 }).catch((e) => fails.push(`${tag}: ${tab} sekmesine dokunulamadı (${e.message.split('\n')[0]})`));
        await page.waitForTimeout(250);
      }
      const sw = await page.evaluate(async (v) => { try { await Promise.race([navigator.serviceWorker.ready, new Promise((_, j) => setTimeout(() => j(new Error('zaman aşımı')), 15000))]); return (await caches.keys()).includes('luna-' + v) ? '' : 'önbellek yok'; } catch (e) { return e.message; } }, version);
      if (sw) fails.push(`${tag}: servis çalışanı ${version} sürümünü kuramadı (${sw}); release-manifest.json güncel mi?`);
      for (const e of [...new Set(errors)]) fails.push(`${tag}: sayfa hatası: ${e}`);
      await context.close();
    }
    // tarayıcı sekmesi: lila kurulum sayfası, üstünde açılış ekranı yok
    const tab = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await tab.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
    const gp = await tab.newPage();
    const gateErrors = [];
    gp.on('pageerror', (e) => gateErrors.push(e.message.split('\n')[0]));
    await gp.goto(base);
    await gp.waitForTimeout(1500);
    const g = await gp.evaluate(() => ({ gate: !!document.querySelector('.kr-btn'), repair: !!document.getElementById('luna-boot-repair') }));
    if (!g.gate) fails.push('tarayıcı sekmesi: kurulum sayfası (Luna\'yı yükle) görünmedi');
    if (g.repair) fails.push('tarayıcı sekmesi: kurulum sayfasının üstünde açılış ekranı göründü');
    for (const e of [...new Set(gateErrors)]) fails.push(`tarayıcı sekmesi: sayfa hatası: ${e}`);
    await tab.close();
  } finally { await browser.close(); server.close(); }
  if (fails.length) { console.error('Duman testi BAŞARISIZ:\n - ' + fails.join('\n - ')); process.exitCode = 1; }
  else console.log(`Duman testi tamam: Luna ${version} telefonda ve tablette açıldı, gökyüzü çiziliyor, sekmeler hatasız, çevrimdışı kurulum doğrulandı, kurulum sayfası temiz`);
})();
