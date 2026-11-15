// 500 rastgele YKS tarzı sorunun (toplu-test.cjs ile aynı sorular) resimli denemesi: her soru iki biçimde resme çevrilir
//   baskı:  ders kitabı gibi temiz
//   foto:   telefonla çekilmiş gibi (hafif eğik, kâğıt rengi, biraz bulanık, JPEG sıkıştırmalı)
// Gerçek okuyucu (Texo) resmi okur, Luna'nın motoru çözer, cevap bağımsız yoldan denetlenir.
// İnternet gerekir (model ~76 MB). SAHTE=1 ile okuyucu yerine resmin LaTeX'i verilir (yalnızca deneme düzeneğini sınar).
// node hesap/test/toplu-foto-test.cjs [çıktı klasörü] [kategori başına adet]
// URETICI=yks ile öbür YKS konuları (eşitsizlik, mutlak değer, üstel-log, trigonometri, Σ, kombinasyon, sistem, üslü-köklü, karmaşık)
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const { sun, cdnYerel } = require('./sunucu.cjs');
const M = require('../hesap-motor.js');
const yks = process.env.URETICI === 'yks';
const { uret, denetle } = require(yks ? './yks-uretici.cjs' : './soru-uretici.cjs');
const ek = yks ? '-yks' : '';
const out = process.argv[2] || path.join(__dirname, 'ekran');
const adet = +(process.argv[3] || 100);
const sahte = process.env.SAHTE === '1';
fs.mkdirSync(path.join(out, 'okunamayan' + ek), { recursive: true });
const BICIMLER = ['baski', 'foto'];

(async () => {
  const sorular = uret(yks ? 2027 : 2026, adet);
  const kategoriler = [...new Set(sorular.map((s) => s.kategori))];
  const sunucu = await sun();
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
  await cdnYerel(ctx);
  const page = await ctx.newPage();
  const sayfaHatasi = []; page.on('pageerror', (e) => sayfaHatasi.push(e.message));
  await page.goto(sunucu.adres + '?guncel');
  await page.waitForFunction(() => window.hesap && window.HesapMotor && customElements.get('math-field'));
  await page.addStyleTag({ content: `
    #sahne { position: fixed; left: 0; top: 0; z-index: 99; padding: 18px; background: #fff; }
    .orn { display: inline-block; padding: 26px 34px; font-size: 40px; color: #111; background: #fff; }
    .orn math-field { font-size: 40px; border: 0; background: transparent; color: inherit; }
    .orn.foto { background: #efeadd; color: #262a33; transform: rotate(-1.6deg); filter: blur(.55px) contrast(.92); }` });
  const tablo = {}, hatalar = {}, basla = Date.now();
  let okumaSuresi = 0, okumaSayisi = 0;
  const kayitli = {};
  for (const s of sorular) {
    for (const bicim of BICIMLER) {
      await page.evaluate(([latex, bicim]) => {
        let el = document.getElementById('sahne'); if (el) el.remove();
        el = document.createElement('div'); el.id = 'sahne';
        el.innerHTML = `<div class="orn ${bicim}"><math-field read-only></math-field></div>`;
        document.body.appendChild(el);
        el.querySelector('math-field').value = latex;
      }, [s.latex, bicim]);
      await page.waitForTimeout(60);
      const resim = await page.locator('#sahne .orn').screenshot(bicim === 'foto' ? { type: 'jpeg', quality: 62 } : { type: 'png' });
      let latex = s.latex, not = '';
      const t0 = Date.now();
      if (!sahte) {
        try {
          latex = await page.evaluate(async ([b64, tur]) => {
            const bayt = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
            return window.hesap.fotoOku(new Blob([bayt], { type: tur }));
          }, [resim.toString('base64'), bicim === 'foto' ? 'image/jpeg' : 'image/png']);
        } catch (e) { latex = ''; not = 'okunamadı: ' + String(e.message || e).split('\n')[0]; }
        okumaSuresi += Date.now() - t0; okumaSayisi++;
      }
      let d;
      try { d = latex ? denetle(M, s, M.coz(latex, { derece: false })) : { tamam: false, aciklama: not }; } catch (e) { d = { tamam: false, aciklama: 'çözülemedi: ' + e.message }; }
      const anahtar = s.kategori + '|' + bicim;
      const k = (tablo[anahtar] = tablo[anahtar] || { kolay: [0, 0], orta: [0, 0], zor: [0, 0] });
      k[s.seviye][1]++; if (d.tamam) k[s.seviye][0]++;
      else {
        (hatalar[anahtar] = hatalar[anahtar] || []).push(`#${s.no} ${s.kategori}/${s.seviye} [${bicim}]  soru: ${s.latex}  okunan: ${latex}  →  ${d.aciklama}`);
        if ((kayitli[anahtar] = (kayitli[anahtar] || 0) + 1) <= 6) fs.writeFileSync(path.join(out, 'okunamayan' + ek, `${s.kategori.replace(/\s+/g, '-')}-${s.no}-${bicim}.${bicim === 'foto' ? 'jpg' : 'png'}`), resim);
      }
    }
  }
  const satirlar = [];
  for (const bicim of BICIMLER) {
    satirlar.push(`\n${bicim === 'baski' ? 'TEMİZ BASKI' : 'TELEFON FOTOĞRAFI GİBİ'}\nkategori       kolay     orta      zor       toplam`);
    let d = 0, n = 0;
    for (const kat of kategoriler) {
      const v = tablo[kat + '|' + bicim]; if (!v) continue;
      const dd = v.kolay[0] + v.orta[0] + v.zor[0], nn = v.kolay[1] + v.orta[1] + v.zor[1]; d += dd; n += nn;
      satirlar.push(kat.padEnd(14) + ' ' + ['kolay', 'orta', 'zor'].map((sv) => `${v[sv][0]}/${v[sv][1]}`.padEnd(9)).join(' ') + ' ' + `${dd}/${nn}`);
    }
    satirlar.push(`toplam ${d}/${n} (%${(100 * d / n).toFixed(1)})`);
  }
  satirlar.push(`\n${sahte ? 'SAHTE OKUYUCU (yalnızca düzenek denemesi)' : 'okuma başına ortalama ' + Math.round(okumaSuresi / Math.max(1, okumaSayisi)) + ' ms'} · toplam ${Math.round((Date.now() - basla) / 1000)} sn`);
  if (sayfaHatasi.length) satirlar.push('sayfa hataları: ' + sayfaHatasi.slice(0, 5).join(' | '));
  for (const [anahtar, liste] of Object.entries(hatalar)) satirlar.push(`\nÇözülemeyenler: ${anahtar.replace('|', ' · ')} (${liste.length}; ilk 12)`, ...liste.slice(0, 12).map((h) => '  ' + h));
  console.log(satirlar.join('\n'));
  fs.writeFileSync(path.join(out, 'toplu-foto-rapor' + ek + '.txt'), satirlar.join('\n') + '\n');
  await b.close(); sunucu.kapat();
})().catch((e) => { console.error(e); process.exit(1); });
