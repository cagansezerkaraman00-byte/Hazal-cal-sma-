// Gerçek fotoğraf okuyucu (Texo, alephpi/FormulaNet) denemesi: YKS tarzı işlemler önce matbaa yazısıyla, sonra el yazısına
// benzeyen bir yazı tipiyle (Caveat), hafif eğik ve kâğıt renginde resme çevrilir; okuyucu okur, Luna'nın motoru çözer.
// İnternet gerekir (model ilk okumada ~76 MB Hugging Face'ten iner). Sonuç: <çıktı>/okuyucu-rapor.txt ve örnek resimler.
// node hesap/test/okuyucu-test.cjs [çıktı klasörü]
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const { sun } = require('./sunucu.cjs');
const out = process.argv[2] || path.join(__dirname, 'ekran');
fs.mkdirSync(out, { recursive: true });

// [ad, biçim ('baski': LaTeX, 'el': el yazısı HTML), içerik, beklenen]
const ORNEKLER = [
  ['kesir', 'baski', '\\frac{3}{4}+\\frac{1}{2}', { tur: 'islem', deger: 1.25 }],
  ['us-kok', 'baski', '2^{5}-\\sqrt{16}', { tur: 'islem', deger: 28 }],
  ['parantez', 'baski', '3\\cdot(4+5)-6', { tur: 'islem', deger: 21 }],
  ['log', 'baski', '\\log_{2}32+\\ln e', { tur: 'islem', deger: 6 }],
  ['trig', 'baski', '\\sin30^{\\circ}+\\cos60^{\\circ}', { tur: 'islem', deger: 1 }],
  ['denklem-2', 'baski', 'x^{2}-5x+6=0', { tur: 'denklem', kokler: [2, 3] }],
  ['denklem-1', 'baski', '3x-7=11', { tur: 'denklem', kokler: [6] }],
  ['fonksiyon', 'baski', 'f(x)=x^{2}-4x+3', { tur: 'fonksiyon', kokler: [1, 3] }],
  ['turev', 'baski', '\\frac{d}{dx}\\left(x^{3}+2x^{2}\\right)', { tur: 'turev', x: 1, deger: 7 }],
  ['bolum', 'baski', 'f(x)=\\frac{2x+1}{x-3}', { tur: 'fonksiyon', kokler: [-0.5] }],
  ['el-islem', 'el', '12 + 7 × 3', { tur: 'islem', deger: 33 }],
  ['el-kesir', 'el', '<span class="k"><i>5</i><i>8</i></span> − <span class="k"><i>1</i><i>4</i></span>', { tur: 'islem', deger: 0.375 }],
  ['el-denklem', 'el', 'x<sup>2</sup> − 9 = 0', { tur: 'denklem', kokler: [-3, 3] }],
  ['el-fonksiyon', 'el', 'f(x) = 3x<sup>2</sup> + 2x', { tur: 'fonksiyon', kokler: [-2 / 3, 0] }],
  ['el-us', 'el', '2<sup>3</sup> + 4<sup>2</sup>', { tur: 'islem', deger: 24 }],
];
const yakin = (a, b) => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b));

(async () => {
  const sunucu = await sun();
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 900, height: 900 } });
  let inen = 0;
  ctx.on('response', async (r) => { if (/huggingface|hf\.co|jsdelivr/.test(r.url())) { const l = +(r.headers()['content-length'] || 0); inen += l; } });
  const page = await ctx.newPage();
  const hata = []; page.on('pageerror', (e) => hata.push(e.message));
  await page.goto(sunucu.adres + '?guncel');
  await page.waitForFunction(() => window.hesap && window.HesapMotor && customElements.get('math-field'));
  await page.addStyleTag({ url: 'https://fonts.googleapis.com/css2?family=Caveat:wght@500&display=swap' }).catch(() => {});
  await page.addStyleTag({ content: `
    #sahne { position: fixed; left: 0; top: 0; z-index: 99; background: #fff; }
    .orn { display: inline-block; padding: 28px 36px; background: #fff; font-size: 44px; color: #111; }
    .orn math-field { font-size: 44px; border: 0; background: transparent; }
    .orn.el { background: #f3efe4; color: #1d2340; font: 500 64px Caveat, cursive; transform: rotate(-1.5deg); }
    .orn.el sup { font-size: .6em; } .orn .k { display: inline-flex; flex-direction: column; vertical-align: middle; text-align: center; font-size: .8em; line-height: 1; }
    .orn .k i { font-style: normal; } .orn .k i:first-child { border-bottom: 3px solid currentColor; padding: 0 6px 2px; }` });
  await page.evaluate(() => document.fonts.load('500 64px Caveat').catch(() => {}));
  const satirlar = [], basla = Date.now();
  let dogru = 0;
  for (const [ad, bicim, icerik, bek] of ORNEKLER) {
    await page.evaluate(([bicim, icerik]) => {
      let s = document.getElementById('sahne'); if (s) s.remove();
      s = document.createElement('div'); s.id = 'sahne';
      s.innerHTML = bicim === 'baski' ? `<div class="orn"><math-field read-only></math-field></div>` : `<div class="orn el">${icerik}</div>`;
      document.body.appendChild(s);
      if (bicim === 'baski') s.querySelector('math-field').value = icerik;
    }, [bicim, icerik]);
    await page.waitForTimeout(bicim === 'baski' ? 500 : 300);
    const png = await page.locator('#sahne .orn').screenshot();
    fs.writeFileSync(path.join(out, 'okuyucu-' + ad + '.png'), png);
    const t0 = Date.now();
    let latex = '', sonuc = null, not = '';
    try {
      latex = await page.evaluate(async (b64) => {
        const bayt = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        return window.hesap.fotoOku(new Blob([bayt], { type: 'image/png' }));
      }, png.toString('base64'));
      sonuc = await page.evaluate(([l, bek]) => {
        const r = HesapMotor.coz(l, { derece: true });
        const o = { tur: r.tur };
        if (r.islem) o.deger = r.islem.deger;
        if (r.denklem) o.kokler = r.denklem.kokler;
        if (r.analiz) o.kokler = r.analiz.kokler;
        if (r.turev && bek.x !== undefined) o.deger = HesapMotor.derle(r.turev.ifade)(bek.x);
        return o;
      }, [latex, bek]);
    } catch (e) { not = String(e.message || e).split('\n')[0]; }
    const sure = Date.now() - t0;
    let tamam = !!sonuc && sonuc.tur === bek.tur;
    if (tamam && bek.deger !== undefined) tamam = yakin(sonuc.deger, bek.deger);
    if (tamam && bek.kokler) tamam = sonuc.kokler.length === bek.kokler.length && bek.kokler.every((k, i) => yakin(sonuc.kokler[i], k));
    if (tamam) dogru++;
    const satir = `${tamam ? '✓' : '✗'} ${ad.padEnd(13)} ${bicim.padEnd(5)} ${String(sure).padStart(6)} ms  okunan: ${latex || '-'}  →  ${sonuc ? JSON.stringify(sonuc) : not}`;
    console.log(satir); satirlar.push(satir);
  }
  const ozet = `\n${dogru}/${ORNEKLER.length} doğru · baskı ${ORNEKLER.filter((o, i) => o[1] === 'baski' && satirlar[i].startsWith('✓')).length}/${ORNEKLER.filter((o) => o[1] === 'baski').length} · el yazısı benzeri ${ORNEKLER.filter((o, i) => o[1] === 'el' && satirlar[i].startsWith('✓')).length}/${ORNEKLER.filter((o) => o[1] === 'el').length}\ntoplam süre ${Math.round((Date.now() - basla) / 1000)} sn (ilk okuma modelin inişini de içerir) · inen ~${Math.round(inen / 1e6)} MB${hata.length ? '\nsayfa hataları: ' + hata.join(' | ') : ''}`;
  console.log(ozet);
  fs.writeFileSync(path.join(out, 'okuyucu-rapor.txt'), satirlar.join('\n') + '\n' + ozet + '\n');
  await b.close(); sunucu.kapat();
})().catch((e) => { console.error(e); process.exit(1); });
