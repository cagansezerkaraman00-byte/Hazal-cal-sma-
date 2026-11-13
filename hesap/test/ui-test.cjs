// Hesap makinesi arayüz testi (telefon boyutu): tuşlarla işlem, kesir, kök, sin 30°, fonksiyon grafiği ve analizi,
// adım adım türev ve teğet, Δ ile denklem, fotoğraftan okuma (okuyucu sahte; gerçek model okuyucu-test.cjs'te), tablet düzeni.
// node hesap/test/ui-test.cjs [ekran klasörü]   (yerelde: YEREL_NM=<node_modules> ile CDN'e çıkmadan)
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const { sun, cdnYerel } = require('./sunucu.cjs');
const out = process.argv[2] || path.join(__dirname, 'ekran');
fs.mkdirSync(out, { recursive: true });
let hata = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) hata++; };
(async () => {
  const sunucu = await sun();
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await cdnYerel(ctx);
  const page = await ctx.newPage(); const err = []; page.on('pageerror', (e) => err.push(e.message + ' @ ' + String(e.stack).split('\n').slice(1, 4).join(' <- '))); page.on('console', (m) => { if (m.type() === 'error') err.push(m.text()); });
  await page.goto(sunucu.adres + '?guncel');
  await page.waitForFunction(() => window.hesap && customElements.get('math-field'));
  await page.waitForTimeout(600);
  const tus = async (...adlar) => { if (await page.locator('.hm.tuslar-kapali').count()) { await page.click('.hm-tus-ac'); await page.waitForTimeout(80); } for (const a of adlar) { const t = page.locator('.hm-tus', { hasText: a }).filter({ hasText: new RegExp('^\\s*' + a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$') }).first(); if (!(await t.count())) { const t2 = page.locator(`.hm-tus[aria-label="${a}"]`).first(); await t2.click(); } else await t.click(); await page.waitForTimeout(40); } };
  const deger = () => page.evaluate(() => window.hesap.mf.value);
  const sonucYazi = () => page.evaluate(() => { const s = document.querySelector('.hm-sonuc'); return [...s.querySelectorAll('math-field')].map((m) => m.value).join(' | ') + ' || ' + s.innerText; });
  const temizle = () => tus('AC');
  // 1) işlem
  await tus('2', '+', '3', '×', '4');
  ok(/14/.test(await page.locator('.hm-onizleme').innerText()), 'canlı önizleme = 14: ' + await page.locator('.hm-onizleme').innerText());
  await tus('Çöz');
  ok(/=14/.test(await sonucYazi()), 'işlem sonucu 14: ' + (await sonucYazi()).slice(0, 80));
  await page.screenshot({ path: path.join(out, '1-islem.png') });
  // 2) kesir: 1/3 + 1/6 = 1/2
  await temizle();
  await tus('kesir', '1', '▶', '3', '▶', '+', 'kesir', '1', '▶', '6');
  console.log('  kutu: ' + await deger());
  await tus('Çöz');
  ok(/\\frac\{1\}\{2\}/.test(await sonucYazi()), 'kesir 1/3 + 1/6 = 1/2: ' + (await sonucYazi()).slice(0, 90));
  // 3) kök: √12 = 2√3
  await temizle(); await tus('√', '1', '2'); await tus('Çöz');
  ok(/2\\sqrt\{3\}/.test(await sonucYazi()), '√12 = 2√3: ' + (await sonucYazi()).slice(0, 80));
  // 4) sin 30 (DEG)
  await temizle(); await tus('sin', '3', '0'); await tus('Çöz');
  ok(/\\frac\{1\}\{2\}/.test(await sonucYazi()), 'sin 30° = 1/2: ' + (await sonucYazi()).slice(0, 80));
  await page.screenshot({ path: path.join(out, '2-sin30.png') });
  // 5) fonksiyon: f(x)=x²−4
  await temizle(); await tus('f(x)=', 'x', 'x²', '−', '4'); await tus('Çöz');
  await page.waitForTimeout(400);
  const fy = await sonucYazi();
  ok(/x = −2/.test(fy) && /x = 2/.test(fy) && /yerel en küçük/.test(fy), 'f(x)=x²−4: kökler ve tepe: ' + fy.replace(/\s+/g, ' ').slice(0, 160));
  ok(await page.locator('.hm-grafik canvas').count() === 1, 'grafik çizildi');
  await page.screenshot({ path: path.join(out, '3-fonksiyon.png') });
  // değer hesapla
  await page.fill('.hm-deger input', '3'); await page.click('[data-ac="deger"]');
  ok(/= 5/.test(await page.locator('.hm-deger-sonuc').innerText()), 'f(3) = 5: ' + await page.locator('.hm-deger-sonuc').innerText());
  // grafikte dokun → iz
  const cb = await page.locator('.hm-grafik canvas').boundingBox();
  const nk = await page.evaluate(() => { const g = document.querySelector('.hm-grafik canvas')._grafik; return { x: g.px(1), y: g.py(-3) }; });
  await page.mouse.click(cb.x + nk.x, cb.y + nk.y);
  ok((await page.locator('.hm-iz').innerText()).length > 0, 'grafikte dokununca değer: ' + await page.locator('.hm-iz').innerText());
  // türevini al
  await page.click('[data-ac="turev"]');
  ok(/f(\^\{\\prime\}|')\(x\)=2x/.test((await sonucYazi()).replace(/\s/g, '')), "türev f'(x) = 2x: " + (await sonucYazi()).slice(0, 80));
  // 6) türev: d/dx (x² sin x)
  await temizle(); await tus('⇄', 'd/dx', 'x', 'x²', 'sin', 'x'); console.log('  kutu: ' + await deger()); await tus('Çöz');
  await page.waitForTimeout(300);
  const ty = await sonucYazi();
  ok(/Çarpım kuralı/.test(ty), 'x² sin x: çarpım kuralı adımı: ' + ty.replace(/\s+/g, ' ').slice(0, 200));
  await page.fill('.hm-deger input', '1'); await page.click('[data-ac="teget"]');
  ok(/Teğet doğrusu/.test(await page.locator('.hm-deger-sonuc').innerText()), 'teğet: ' + await page.locator('.hm-deger-sonuc').innerText());
  await page.screenshot({ path: path.join(out, '4-turev.png'), fullPage: false });
  await page.locator('.hm-sonuc').evaluate((e) => { e.scrollTop = 0; });
  // 7) denklem x²−5x+6=0
  await temizle(); await tus('x', 'x²', '−', '5', 'x', '+', '6', '=', '0'); await tus('Çöz');
  const dy = await sonucYazi();
  ok(/x_\{?1\}?=2/.test(dy.replace(/\s/g, '')) && /x_\{?2\}?=3/.test(dy.replace(/\s/g, '')) && /Δ > 0/.test(dy), 'x²−5x+6=0 → 2 ve 3, Δ adımı: ' + dy.replace(/\s+/g, ' ').slice(0, 160));
  await page.screenshot({ path: path.join(out, '5-denklem.png') });
  // 8) fotoğraf (okuyucu sahte: gerçek model burada inemiyor)
  await page.evaluate(() => {
    window.hesap.durum.okuyucu = { oku: async () => '\\frac { d } { d x } \\left( x ^ { 3 } - 3 x \\right)' };
  });
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await page.setInputFiles('.hm-dosya', { name: 'soru.png', mimeType: 'image/png', buffer: png });
  await page.waitForSelector('.hm-kirp-kart');
  await page.screenshot({ path: path.join(out, '6-kirp.png') });
  await page.click('[data-k="oku"]');
  await page.waitForTimeout(800);
  const fo = await sonucYazi();
  ok(/Fotoğraftan okundu/.test(fo) && /3x\^\{?2\}?-3/.test(fo.replace(/[\s{}]/g, '').replace(/x\^2/g, 'x^2')), 'fotoğraf → d/dx(x³−3x) = 3x²−3: ' + fo.replace(/\s+/g, ' ').slice(0, 160));
  await page.screenshot({ path: path.join(out, '7-foto.png') });
  // 9) tablet yatay düzen
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '8-tablet.png') });
  ok(!err.length, 'sayfa hatası yok' + (err.length ? ': ' + err.slice(0, 3).join(' | ') : ''));
  await b.close(); sunucu.kapat();
  process.exitCode = hata ? 1 : 0;
  console.log(hata ? `\n${hata} SORUN` : '\nhepsi tamam');
})();
