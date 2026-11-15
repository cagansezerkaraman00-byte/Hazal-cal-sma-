// YKS konularının arayüz testi (telefon boyutu): yeni tuş katmanı, eşitsizlik (işaret tablosu), denklem sistemi,
// trigonometrik denklemin genel çözümü, Σ toplam, kombinasyon, karmaşık sayı, çarpanlara ayırma. Her ekranın görüntüsü kaydedilir.
// node hesap/test/yks-ui-test.cjs [ekran klasörü]   (yerelde: YEREL_NM=<node_modules> ile CDN'e çıkmadan)
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const { sun, cdnYerel } = require('./sunucu.cjs');
const out = process.argv[2] || path.join(__dirname, 'ekran-yks');
fs.mkdirSync(out, { recursive: true });
let hata = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) hata++; };
(async () => {
  const sunucu = await sun();
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await cdnYerel(ctx);
  const page = await ctx.newPage(); const err = [];
  page.on('pageerror', (e) => err.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') err.push(m.text()); });
  await page.goto(sunucu.adres + '?guncel');
  await page.waitForFunction(() => window.hesap && customElements.get('math-field'));
  await page.waitForTimeout(600);
  const tus = async (...adlar) => {
    if (await page.locator('.hm.tuslar-kapali').count()) { await page.click('.hm-tus-ac'); await page.waitForTimeout(80); }
    for (const a of adlar) {
      const t = page.locator('.hm-tus').filter({ hasText: new RegExp('^\\s*' + a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$') }).first();
      if (await t.count()) await t.click(); else await page.locator(`.hm-tus[aria-label="${a}"]`).first().click();
      await page.waitForTimeout(40);
    }
  };
  const deger = () => page.evaluate(() => window.hesap.mf.value);
  const sonucYazi = () => page.evaluate(() => { const s = document.querySelector('.hm-sonuc'); return [...s.querySelectorAll('math-field')].map((m) => m.value).join(' | ') + ' || ' + s.innerText; });
  const coz = async (latex, ad) => {
    await page.evaluate((l) => { window.hesap.mf.value = l; window.hesap.coz(); }, latex);
    await page.waitForTimeout(450);
    await page.screenshot({ path: path.join(out, 'yks-' + ad + '.png') });
    return (await sonucYazi()).replace(/\s+/g, ' ');
  };
  // yeni tuş katmanı: ⇄ → < ≤ > ≥, Σ, C(n,r), sistem
  await tus('AC', 'x', 'x²', '−', '4', '⇄', 'küçük eşit', '0');
  ok(/\\le/.test(await deger()), 'tuşlarla eşitsizlik: ' + await deger());
  await tus('Çöz'); await page.waitForTimeout(400);
  let y = (await sonucYazi()).replace(/\s+/g, ' ');
  ok(/\\left\[-2,\\ 2\\right\]/.test(y) && /İşaret tablosu|f\(x\)/.test(y), 'x² − 4 ≤ 0 → [−2, 2]: ' + y.slice(0, 160));
  await page.screenshot({ path: path.join(out, 'yks-1-esitsizlik-tus.png') });
  await tus('AC', '⇄', 'kombinasyon', '5', '▶', '2'); ok(/\\binom\{?5\}?\{?2\}?/.test(await deger()), 'C(n,r) tuşu: ' + await deger());
  await tus('Çöz'); await page.waitForTimeout(300); ok(/=10\b/.test(await sonucYazi()), 'C(5,2) = 10');
  await tus('AC', '⇄', 'denklem sistemi'); ok(/\\begin\{cases\}/.test(await deger()), 'sistem tuşu: ' + await deger());
  await tus('AC', '⇄', 'toplam sembolü'); ok(/\\sum_\{k=/.test(await deger()), 'Σ tuşu: ' + await deger());

  y = await coz('\\frac{x-1}{x+2}\\geq0', '2-esitsizlik-kesirli');
  ok(/\\left\(-\\infty,\\ -2\\right\)\\cup ?\\left\[1,\\ \\infty\\right\)/.test(y) && /∄/.test(y), '(x−1)/(x+2) ≥ 0 → (−∞, −2) ∪ [1, ∞), tabloda ∄: ' + y.slice(0, 140));
  y = await coz('-3<2x+1\\le5', '3-cift-esitsizlik');
  ok(/\\left\(-2,\\ 2\\right\]/.test(y), '−3 < 2x + 1 ≤ 5 → (−2, 2]');
  y = await coz('\\left|2x-1\\right|\\le5', '4-mutlak');
  ok(/\\left\[-2,\\ 3\\right\]/.test(y), '|2x − 1| ≤ 5 → [−2, 3]');
  y = await coz('x^2-2x-1<0', '5-koklu-sinir');
  ok(/1-\\sqrt\{2\}/.test(y) && /1\+\\sqrt\{2\}/.test(y), 'x² − 2x − 1 < 0 → (1 − √2, 1 + √2)');
  y = await coz('\\begin{cases}2x+3y=12\\\\x-y=1\\end{cases}', '6-sistem');
  ok(/x=3,\\ y=2/.test(y) && /çarpılıp|toplanır|çıkarılır/.test(y), '2x + 3y = 12, x − y = 1 → (3, 2) yok etme adımlarıyla: ' + y.slice(0, 120));
  y = await coz('\\begin{cases}x^2+y^2=25\\\\x-y=1\\end{cases}', '7-sistem-cember');
  ok(/x=-3,\\ y=-4/.test(y) && /x=4,\\ y=3/.test(y), 'x² + y² = 25, x − y = 1 → (−3, −4), (4, 3)');
  y = await coz('\\begin{cases}x+y=2\\\\x+y=3\\end{cases}', '8-sistem-yok');
  ok(/Çözüm yok/.test(y), 'çelişen sistem: çözüm yok');
  y = await coz('\\sin x=\\frac{1}{2}', '9-trig');
  ok(/\\frac\{\\pi\}\{6\}\+2k\\pi/.test(y) && /\\frac\{5\\pi\}\{6\}\+2k\\pi/.test(y) && /30°/.test(y), 'sin x = 1/2 → π/6 + 2kπ, 5π/6 + 2kπ (30°): ' + y.slice(0, 120));
  y = await coz('\\cos 2x=0', '10-trig-cos2x');
  ok(/\\frac\{\\pi\}\{4\}\+\\frac\{k\\pi\}\{2\}/.test(y), 'cos 2x = 0 → π/4 + kπ/2');
  y = await coz('\\sum_{k=1}^{10}(2k+1)', '11-toplam');
  ok(/=120/.test(y) && /3\+5\+7\+\\cdots\+21=120/.test(y), 'Σ(2k+1), k=1..10 = 120 terimleriyle');
  y = await coz('\\sum_{k=1}^{n}k^2', '12-toplam-n');
  ok(/\\frac\{n\\left\(n\+1\\right\)\\left\(2n\+1\\right\)\}\{6\}/.test(y), 'Σk² = n(n+1)(2n+1)/6');
  y = await coz('(2+3i)(1-i)', '13-karmasik');
  ok(/=5\+i/.test(y) && /Karmaşık/.test(y), '(2 + 3i)(1 − i) = 5 + i');
  y = await coz('x^3-6x^2+11x-6=0', '14-carpan');
  ok(/\\left\(x-1\\right\)\\left\(x-2\\right\)\\left\(x-3\\right\)=0/.test(y), 'x³ − 6x² + 11x − 6 = 0 çarpanlarıyla');
  y = await coz('|x-1|+|x+2|=3', '15-aralik-kok');
  ok(/\\left\[-2,\\ 1\\right\]/.test(y), '|x − 1| + |x + 2| = 3 → [−2, 1]');
  y = await coz('\\operatorname{EBOB}\\left(12,18\\right)+\\operatorname{EKOK}\\left(4,6\\right)', '16-ebob');
  ok(/=18\b/.test(y), 'EBOB(12, 18) + EKOK(4, 6) = 18');
  y = await coz('\\sqrt{12}+\\sqrt{27}', '17-koklu');
  ok(/5\\sqrt\{3\}/.test(y), '√12 + √27 = 5√3');
  // tuş katmanı ekran görüntüsü
  await page.click('.hm-tus-ac').catch(() => {});
  await tus('AC', '⇄');
  await page.screenshot({ path: path.join(out, 'yks-0-tuslar.png') });
  const tasma = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  ok(!tasma, 'sayfa yana taşmıyor');
  ok(!err.length, 'sayfa hatası yok' + (err.length ? ': ' + err.slice(0, 3).join(' | ') : ''));
  await b.close(); sunucu.kapat();
  process.exitCode = hata ? 1 : 0;
  console.log(hata ? `\n${hata} SORUN` : '\nhepsi tamam');
})();
