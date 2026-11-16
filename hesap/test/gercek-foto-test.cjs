// Gerçek kullanım gibi fotoğraflar: uygulamanın 📷 düğmesinden geçer (kendiliğinden konan çerçeve → okuyucu → motor).
//  • el yazısı: gri, gölgeli defter/kitap kâğıdı; üstte basılı yazı ve çizgi, arka sayfadan geçen ters yazı, ortada kurşun kalemle işlem
//  • ekran görüntüsü: sohbet uygulaması gibi beyaz sayfa; başlık, paragraflar, iki ayırıcı çizgi arasında formül
// Kullanıcı fotoğrafı kullanılmaz; sahneler burada çizilir. SAHTE=1: okuyucu yerine çerçevenin işlemi doğru yakalayıp yakalamadığı denetlenir.
// node hesap/test/gercek-foto-test.cjs [çıktı klasörü]
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const { sun, cdnYerel } = require('./sunucu.cjs');
const M = require('../hesap-motor.js');
const math = require('mathjs');
const out = process.argv[2] || path.join(__dirname, 'ekran');
const sahte = process.env.SAHTE === '1';
fs.mkdirSync(path.join(out, 'gercek-foto'), { recursive: true });
let hata = 0, elDogru = 0, elSayi = 0; const satirlar = [];
// El yazısında okuyucunun doğruluğu ölçülür (yazı tiplerinin bazı rakamları okuyucuya harf gibi gelir); bu düzeyin altı hatadır.
const EL_EN_AZ = 6;
const ok = (c, m) => { const s = (c ? '✓ ' : '✗ ') + m; console.log(s); satirlar.push(s); if (!c) hata++; };

const EL_YAZISI = [['2+4', 6], ['7-3', 4], ['15+8', 23], ['9×3', 27], ['12÷4', 3], ['3+5', 8], ['20-6', 14], ['8×7', 56]];
const YAZI_TIPLERI = ['Caveat', 'Kalam', 'Patrick Hand', 'Gochi Hand'];
const KULLANICI = 'f(x)=\\frac{e^{x^2}\\cdot\\ln\\left(x^2+1\\right)\\cdot\\sin^3\\left(2x\\right)}{\\sqrt{x^4+3x^2+1}}';
const EKRAN = [
  [KULLANICI, { tur: 'fonksiyon', turev: 'exp(x^2)*log(x^2+1)*sin(2x)^3/sqrt(x^4+3x^2+1)' }],
  ['\\int_{0}^{2}x^{2}\\,dx', { tur: 'integral', deger: 8 / 3 }],
  ['\\lim_{x\\to2}\\frac{x^{2}-4}{x-2}', { tur: 'limit', deger: 4 }],
  ['2x+5=11', { tur: 'denklem', kokler: [3] }],
  ['f(x)=\\frac{x^{2}-1}{x+1}', { tur: 'fonksiyon', turev: '(x^2-1)/(x+1)' }],
];
const PARAGRAF = 'Her brother came back to the village and he could not believe his eyes. They had to leave a couple of days later because the river was rising.';

(async () => {
  const sunucu = await sun();
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await cdnYerel(ctx);
  const page = await ctx.newPage();
  const sayfaHatasi = []; page.on('pageerror', (e) => sayfaHatasi.push(e.message));
  // sahneler ayrı bir sayfada çizilir (yazı tipleri Google Fonts'tan)
  const sahne = await ctx.newPage();
  await sahne.setViewportSize({ width: 600, height: 1100 });
  await sahne.goto(sunucu.adres + '?guncel');
  await sahne.waitForFunction(() => customElements.get('math-field'));
  await sahne.addStyleTag({ url: 'https://fonts.googleapis.com/css2?family=Caveat:wght@500&family=Kalam&family=Patrick+Hand&family=Gochi+Hand&family=Merriweather&display=block' }).catch(() => {});
  await page.goto(sunucu.adres + '?guncel');
  await page.waitForFunction(() => window.hesap && customElements.get('math-field') && window.HesapGoruntu);
  if (sahte) await page.evaluate(() => { window.hesap.durum.okuyucu = { oku: async () => window.__sahteOkunan || '' }; });

  const kapsar = (c, k) => c.x <= k.x0 + 0.012 && c.y <= k.y0 + 0.012 && c.x + c.w >= k.x1 - 0.012 && c.y + c.h >= k.y1 - 0.012;
  const alanOrani = (c, k) => (c.w * c.h) / Math.max(1e-6, (k.x1 - k.x0) * (k.y1 - k.y0));
  async function ciz(html) {
    await sahne.evaluate((h) => { document.body.innerHTML = h; document.body.style.margin = '0'; }, html);
    await sahne.evaluate(() => document.fonts.ready);
    await sahne.waitForTimeout(250);
    const resim = await sahne.locator('#sahne').screenshot({ type: 'jpeg', quality: 72 });
    // işlemin gerçek mürekkep sınırı: sahnede yalnızca işlem görünür bırakılıp koyu piksellerin kutusu bulunur
    await sahne.evaluate(() => { const s = document.querySelector('#sahne'); s.style.background = '#fff'; s.querySelectorAll('*').forEach((e) => { e.style.visibility = 'hidden'; }); const h = document.querySelector('#hedef'); h.style.visibility = 'visible'; h.style.filter = 'none'; h.style.opacity = '1'; });
    const yalniz = await sahne.locator('#sahne').screenshot({ type: 'png' });
    const kutu = await sahne.evaluate(async (b64) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const i = (y * c.width + x) * 4; if (d[i] + d[i + 1] + d[i + 2] < 3 * 170) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
      return { x0: x0 / c.width, y0: y0 / c.height, x1: x1 / c.width, y1: y1 / c.height };
    }, yalniz.toString('base64'));
    return { resim, kutu };
  }
  const cerceveOku = () => page.evaluate(() => { const c = document.querySelector('.hm-cerceve').style; return { x: parseFloat(c.left) / 100, y: parseFloat(c.top) / 100, w: parseFloat(c.width) / 100, h: parseFloat(c.height) / 100 }; });
  async function fotografla(resim, ad, beklenenLatex, kutu) {
    if (sahte) await page.evaluate((l) => { window.__sahteOkunan = l; }, beklenenLatex);
    await page.setInputFiles('.hm-dosya', { name: ad + '.jpg', mimeType: 'image/jpeg', buffer: resim });
    await page.waitForSelector('.hm-kirp-kart');
    await page.waitForTimeout(700);
    let cerceve = await cerceveOku(), yol = 'kendiliğinden';
    if (!(kapsar(cerceve, kutu) && alanOrani(cerceve, kutu) < 6)) {
      // çerçeve tutmadıysa kullanıcının yapacağı gibi işlemin üstüne dokunulur
      const a = await page.locator('.hm-kirp-alan').boundingBox();
      await page.locator('.hm-kirp-alan').click({ position: { x: a.width * (kutu.x0 + kutu.x1) / 2, y: a.height * (kutu.y0 + kutu.y1) / 2 } });
      await page.waitForTimeout(300);
      cerceve = await cerceveOku(); yol = 'dokununca';
    }
    await page.screenshot({ path: path.join(out, 'gercek-foto', ad + '-cerceve.png') });
    await page.click('[data-k="oku"]');
    await page.waitForFunction(() => !document.querySelector('.hm-kirp-katman') || /Okuyamadım/.test(document.querySelector('.hm-kirp-durum').textContent), null, { timeout: 180000 });
    const okunan = await page.evaluate(() => window.hesap.durum.sonOkunan || '');
    if (await page.locator('.hm-kirp-katman').count()) await page.click('[data-k="vazgec"]');
    return { cerceve, okunan, yol };
  }

  // ---------------------------------------------------------------- el yazısı
  let n = 0;
  for (const [ifade, deger] of EL_YAZISI) {
    const yazi = YAZI_TIPLERI[n++ % YAZI_TIPLERI.length], aci = ((n * 7) % 9) - 4;
    const ters = Array.from({ length: 4 }, () => '<p>exercises on Although go to the final page</p>').join('');
    const html = `<div id="sahne" style="position:relative;width:600px;height:1100px;overflow:hidden;font-family:Merriweather,serif;
        background:radial-gradient(120% 90% at 60% 40%, #d9d4cb 0%, #cbc6bd 55%, #b3aea5 100%);">
      <div style="padding:28px 30px 0;color:#24221f;font-size:26px;line-height:1.55;filter:blur(.4px)">${PARAGRAF}</div>
      <div style="position:absolute;left:0;right:0;top:300px;height:3px;background:#2a2826"></div>
      <div style="position:absolute;left:30px;right:0;top:330px;transform:scaleX(-1);color:rgba(40,36,30,.13);font-size:28px;line-height:2.4;filter:blur(1px)">${ters}</div>
      <div style="position:absolute;left:0;right:0;top:520px;height:1px;background:rgba(80,70,60,.18)"></div>
      <div style="position:absolute;left:0;right:0;top:720px;height:1px;background:rgba(80,70,60,.18)"></div>
      <span id="hedef" style="position:absolute;left:150px;top:560px;font-family:'${yazi}',cursive;font-size:86px;color:#4b4945;opacity:.88;transform:rotate(${aci}deg);filter:blur(.5px)">${ifade}</span>
    </div>`;
    const { resim, kutu } = await ciz(html);
    const ad = 'el-' + n;
    fs.writeFileSync(path.join(out, 'gercek-foto', ad + '.jpg'), resim);
    const latex = ifade.replace('×', '\\times ').replace('÷', '\\div ');
    const { cerceve, okunan, yol } = await fotografla(resim, ad, latex, kutu);
    const cer = kapsar(cerceve, kutu) && alanOrani(cerceve, kutu) < 6;
    let sonuc = '';
    try { sonuc = await page.evaluate(() => window.hesap.mf.value); } catch (e) { /* yok */ }
    const dogru = Number(String(sonuc).replace('{,}', '.')) === deger;
    elSayi++; if (sahte || dogru) elDogru++;
    const satir = `el yazısı "${ifade}" (${yazi}): çerçeve ${cer ? 'işlemi ' + yol + ' aldı' : 'KAÇIRDI ' + JSON.stringify(cerceve) + ' ' + JSON.stringify(kutu)} · okunan ${okunan} → ${sonuc} (beklenen ${deger})`;
    if (!cer) ok(false, satir); else { const s = (sahte || dogru ? '✓ ' : '· okunamadı: ') + satir; console.log(s); satirlar.push(s); }
    await page.evaluate(() => { window.hesap.mf.value = ''; });
  }
  ok(elDogru >= EL_EN_AZ, `el yazısı okuma: ${elDogru}/${elSayi} doğru (en az ${EL_EN_AZ})`);

  // ---------------------------------------------------------------- ekran görüntüsü
  n = 0;
  for (const [latex, bek] of EKRAN) {
    const html = `<div id="sahne" style="width:600px;height:1100px;background:#fff;color:#111;font-family:system-ui,sans-serif;padding:40px 26px;box-sizing:border-box">
      <div style="margin-left:140px;background:#eef1f8;border-radius:22px;padding:14px 18px;font-size:20px;color:#555">Bana zor bir türev sorusu yaz</div>
      <h2 style="font-size:28px;margin:34px 0 14px">Zor Seviye Soru</h2>
      <p style="font-size:21px;line-height:1.5;margin:0 0 30px">Aşağıdaki işlemi çözünüz ve mümkün olduğunca sadeleştiriniz.</p>
      <div style="border-top:2px solid #111;border-bottom:2px solid #111;padding:14px 0;text-align:center">
        <math-field id="hedef" read-only style="font-size:30px;border:0;background:transparent;color:#111;display:inline-block">${latex.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</math-field></div>
      <p style="font-size:21px;margin:30px 0 8px"><b>Zorluk:</b> 9/10</p>
      <p style="font-size:21px;line-height:1.5;margin:0">Bu soruyu çözmek için çarpım, bölüm ve zincir kurallarını birlikte kullanman gerekiyor.</p></div>`;
    const { resim, kutu } = await ciz(html);
    const ad = 'ekran-' + (++n);
    fs.writeFileSync(path.join(out, 'gercek-foto', ad + '.jpg'), resim);
    const { cerceve, okunan, yol } = await fotografla(resim, ad, latex, kutu);
    const cer = kapsar(cerceve, kutu) && alanOrani(cerceve, kutu) < 6;
    let dogru = sahte, aciklama = '';
    if (!sahte) {
      try {
        const r = M.coz(okunan, { derece: false });
        aciklama = r.tur;
        if (r.tur !== bek.tur) dogru = false;
        else if (bek.turev) { const t = M.turev(r.ifade), ref = math.derivative(bek.turev, 'x'); dogru = [0.37, 0.81].every((x) => Math.abs(M.derle(t.ifade)(x) - ref.evaluate({ x })) < 1e-6 * Math.max(1, Math.abs(ref.evaluate({ x })))); aciklama += dogru ? ', türevi doğru' : ', türevi yanlış'; }
        else if (bek.kokler) { dogru = JSON.stringify(r.denklem.kokler.map((v) => +v.toFixed(6))) === JSON.stringify(bek.kokler); aciklama += ' ' + JSON.stringify(r.denklem.kokler); }
        else { const v = r.limit ? r.limit.deger : r.belirli ? r.belirli.deger : NaN; dogru = Math.abs(v - bek.deger) < 1e-6; aciklama += ' ' + v; }
      } catch (e) { dogru = false; aciklama = 'çözülemedi: ' + e.message; }
    }
    ok(cer && dogru, `ekran görüntüsü ${ad}: çerçeve ${cer ? 'formülü ' + yol + ' aldı' : 'KAÇIRDI ' + JSON.stringify(cerceve) + ' ' + JSON.stringify(kutu)} · okunan ${okunan} → ${aciklama}`);
    await page.evaluate(() => { window.hesap.mf.value = ''; });
  }
  ok(!sayfaHatasi.length, 'sayfa hatası yok' + (sayfaHatasi.length ? ': ' + sayfaHatasi.slice(0, 3).join(' | ') : ''));
  fs.writeFileSync(path.join(out, 'gercek-foto-rapor.txt'), satirlar.join('\n') + `\n\n${hata ? hata + ' SORUN' : 'hepsi tamam'}${sahte ? ' (SAHTE okuyucu: yalnızca çerçeve)' : ''}\n`);
  await b.close(); sunucu.kapat();
  console.log(hata ? `\n${hata} SORUN` : '\nhepsi tamam');
  process.exitCode = hata ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
