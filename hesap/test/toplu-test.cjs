// 500 rastgele YKS tarzı soru (türev, denklem, fonksiyon, limit, integral × kolay / orta / zor): motor doğru çözüyor mu?
// node hesap/test/toplu-test.cjs [tohum] [kategori başına adet]   — çıktı: kategori × seviye tablosu ve çözemedikleri
const M = require('../hesap-motor.js');
const { uret, denetle } = require('./soru-uretici.cjs');
const tohum = +(process.argv[2] || 2026), adet = +(process.argv[3] || 100);
const sorular = uret(tohum, adet);
const tablo = {}, hatalar = [];
const t0 = Date.now();
for (const s of sorular) {
  let sonuc = null, d;
  try { sonuc = M.coz(s.latex, { derece: false }); d = denetle(M, s, sonuc); } catch (e) { d = { tamam: false, aciklama: 'HATA: ' + e.message }; }
  const k = (tablo[s.kategori] = tablo[s.kategori] || { kolay: [0, 0], orta: [0, 0], zor: [0, 0] });
  k[s.seviye][1]++; if (d.tamam) k[s.seviye][0]++; else hatalar.push(`#${s.no} ${s.kategori}/${s.seviye}: ${s.latex}  →  ${d.aciklama}`);
}
let top = 0, dogru = 0;
console.log('kategori     kolay     orta      zor       toplam');
for (const [kat, v] of Object.entries(tablo)) {
  const d = v.kolay[0] + v.orta[0] + v.zor[0], n = v.kolay[1] + v.orta[1] + v.zor[1]; top += n; dogru += d;
  console.log(kat.padEnd(12), ...['kolay', 'orta', 'zor'].map((s) => `${v[s][0]}/${v[s][1]}`.padEnd(9)), `${d}/${n}`);
}
console.log(`\nTOPLAM ${dogru}/${top} doğru (%${(100 * dogru / top).toFixed(1)}) · ${((Date.now() - t0) / 1000).toFixed(1)} sn`);
if (hatalar.length) { console.log('\nÇözemedikleri:'); hatalar.slice(0, 60).forEach((h) => console.log('  ' + h)); }
process.exitCode = dogru === top ? 0 : 1;
