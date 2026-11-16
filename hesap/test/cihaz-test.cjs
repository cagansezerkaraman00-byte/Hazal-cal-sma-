// Telefon ve tablet düzeni: her cihaz boyutunda yana taşma yok, tuşların hepsi ekranda ve parmakla basılacak kadar büyük,
// telefonda Çöz'den sonra tuşlar kapanıp sonuca yer açıyor ve geri açılıyor. Her cihazın ekran görüntüsü çıkar.
// node hesap/test/cihaz-test.cjs [çıktı klasörü]   (yerelde: YEREL_NM=<node_modules>)
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const { sun, cdnYerel } = require('./sunucu.cjs');
const out = process.argv[2] || path.join(__dirname, 'ekran');
fs.mkdirSync(out, { recursive: true });
const CIHAZLAR = [
  ['telefon', 390, 844, true], ['kucuk-telefon', 375, 667, true], ['telefon-yatay', 844, 390, true],
  ['tablet-dikey', 820, 1180, true], ['tablet-yatay', 1180, 820, true],
  ['bilgisayar', 1366, 768, false], ['genis-ekran', 1920, 1080, false],
];
let hata = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) hata++; };
(async () => {
  const sunucu = await sun();
  const b = await chromium.launch();
  for (const [ad, w, h, dokunmatik] of CIHAZLAR) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: dokunmatik && w < 1000, hasTouch: dokunmatik });
    await cdnYerel(ctx);
    const page = await ctx.newPage(); const err = []; page.on('pageerror', (e) => err.push(e.message));
    await page.goto(sunucu.adres + '?guncel');
    await page.waitForFunction(() => window.hesap && customElements.get('math-field'));
    await page.waitForTimeout(500);
    const olc = () => page.evaluate(() => {
      const t = [...document.querySelectorAll('.hm-tus')].map((x) => x.getBoundingClientRect()).filter((r) => r.width);
      return {
        yanaTasma: document.documentElement.scrollWidth - innerWidth,
        tusAlt: Math.max(...t.map((r) => r.bottom)), tusSag: Math.max(...t.map((r) => r.right)),
        enKucuk: Math.min(...t.map((r) => Math.min(r.width, r.height))), tusSayisi: t.length,
        kapali: document.querySelector('.hm').classList.contains('tuslar-kapali'),
        acDugmesi: getComputedStyle(document.querySelector('.hm-tus-ac')).display !== 'none',
        sonucYuk: document.querySelector('.hm-sonuc').getBoundingClientRect().height,
      };
    });
    let o = await olc();
    ok(o.yanaTasma <= 0, `${ad}: yana taşma yok (${o.yanaTasma})`);
    ok(o.tusAlt <= h + 0.5 && o.tusSag <= w + 0.5, `${ad}: bütün tuşlar ekranda (alt ${Math.round(o.tusAlt)}/${h}, sağ ${Math.round(o.tusSag)}/${w})`);
    ok(o.enKucuk >= 32, `${ad}: tuşlar parmakla basılacak kadar büyük (en küçük kenar ${Math.round(o.enKucuk)} px)`);
    await page.screenshot({ path: path.join(out, `cihaz-${ad}-1-tuslar.png`) });
    // fonksiyon çöz
    await page.evaluate(() => { window.hesap.mf.value = 'f(x)=x^{3}-3x'; window.hesap.coz(); });
    await page.waitForTimeout(700);
    o = await olc();
    const telefonDikey = w < 860 && h > w;
    if (telefonDikey) {
      ok(o.kapali && o.acDugmesi, `${ad}: Çöz'den sonra tuşlar kapandı, "⌨ Tuşlar" düğmesi göründü`);
      ok(o.sonucYuk > h * 0.6, `${ad}: sonuç ekranın çoğunu kullanıyor (${Math.round(o.sonucYuk)}/${h})`);
    } else ok(!o.kapali || !o.acDugmesi, `${ad}: yan yana düzende tuşlar açık kalıyor`);
    const g = await page.evaluate(() => { const c = document.querySelector('.hm-grafik canvas'); const r = c.getBoundingClientRect(); return { w: r.width, h: r.height, sag: r.right }; });
    ok(g.h >= 160 && g.sag <= w + 0.5, `${ad}: grafik görünür ve sığıyor (${Math.round(g.w)}×${Math.round(g.h)})`);
    await page.screenshot({ path: path.join(out, `cihaz-${ad}-2-grafik.png`) });
    if (telefonDikey) {
      await page.click('.hm-tus-ac');
      await page.waitForTimeout(300);
      o = await olc();
      ok(!o.kapali && o.tusAlt <= h + 0.5, `${ad}: "⌨ Tuşlar" ile tuşlar geri geldi`);
    }
    if (!dokunmatik) {
      // bilgisayar: hesap makinesi ortada toplu durur; kutuya tıklamadan klavyeyle yazılır, Enter çözer
      const g = await page.evaluate(() => { const e = document.querySelector('.hm-ekran').getBoundingClientRect(), t = document.querySelector('.hm-tuslar').getBoundingClientRect(); return { sol: e.left, sag: t.right, genislik: t.right - e.left }; });
      ok(g.genislik <= 460 && g.sol > 50, `${ad}: hesap makinesi toplu (genişlik ${Math.round(g.genislik)} px, soldan ${Math.round(g.sol)} px)`);
      await page.mouse.click(w - 20, h / 2); // boş bir yere tıkla: odak kutuda değil
      await page.evaluate(() => { window.hesap.mf.value = ''; });
      await page.keyboard.type('7*6'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
      const yaz = await page.evaluate(() => window.hesap.mf.value);
      ok(yaz === '42', `${ad}: klavyeyle yazılıyor, Enter çözüyor, sonuç üste çıkıyor (7*6 → ${yaz})`);
      await page.keyboard.type('+8'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
      ok(await page.evaluate(() => window.hesap.mf.value) === '50', `${ad}: klavyeyle sonuçtan devam: 42+8 = 50`);
      await page.keyboard.press('Escape'); await page.waitForTimeout(100);
      ok(await page.evaluate(() => window.hesap.mf.value === ''), `${ad}: Esc siliyor`);
    }
    ok(!err.length, `${ad}: sayfa hatası yok` + (err.length ? ': ' + err.join(' | ') : ''));
    await ctx.close();
  }
  await b.close(); sunucu.kapat();
  console.log(hata ? `\n${hata} SORUN` : '\nhepsi tamam');
  process.exitCode = hata ? 1 : 0;
})();
