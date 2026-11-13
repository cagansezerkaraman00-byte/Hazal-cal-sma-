const M = require('../hesap-motor.js');
const math = require('mathjs');
let hata = 0, gecen = 0;
const ok = (c, m) => { if (c) gecen++; else { hata++; console.log('✗ ' + m); } };
const yakin = (a, b, t = 1e-9) => Math.abs(a - b) <= t * Math.max(1, Math.abs(b));
// 1) işlemler: [latex, beklenen değer, beklenen tam biçim metni (varsa)]
const islemler = [
  ['2+3\\cdot4', 14], ['\\frac{1}{3}+\\frac{1}{6}', 0.5, '1/2'], ['\\frac{2}{3}\\cdot\\frac{9}{4}', 1.5, '3/2'], ['2^{10}', 1024],
  ['\\sqrt{12}', Math.sqrt(12), '2√3'], ['\\sqrt[3]{27}', 3], ['\\sqrt{2}\\cdot\\sqrt{8}', 4], ['(-3)^2', 9], ['-3^2', -9],
  ['5!', 120], ['\\left|-7\\right|', 7], ['|3-10|', 7], ['\\log_{2}8', 3], ['\\log 1000', 3], ['\\ln e', 1], ['\\ln\\left(e^{2}\\right)', 2],
  ['\\pi', Math.PI], ['2\\pi', 2 * Math.PI], ['\\frac{\\pi}{4}', Math.PI / 4, 'π/4'], ['3,5+1,5', 5], ['3{,}5\\cdot2', 7],
  ['12\\div4', 3], ['12:4', 3], ['2(3+4)', 14], ['\\frac{2}{3}\\div\\frac{4}{9}', 1.5, '3/2'], ['10\\%\\cdot200', 20],
  ['\\left(\\frac{1}{2}\\right)^{-2}', 4], ['4^{\\frac{1}{2}}', 2], ['0.1+0.2', 0.3, '3/10'], ['\\frac{1}{0}', Infinity],
  // fotoğraftan okunmuş biçim (boşluklu, \operatorname, harf harf)
  ['\\frac { 1 } { 2 } + \\frac { 1 } { 4 }', 0.75, '3/4'], ['{ 2 } ^ { 5 }', 32], ['\\sqrt { 1 6 }', 4], ['\\operatorname { s i n } 3 0', 0.5],
  ['s i n 9 0', 1], ['2 \\times 3', 6], ['\\mathrm { l n } \\, e', 1],
];
for (const [l, v, t] of islemler) {
  try {
    const r = M.coz(l, { derece: true });
    ok(r.tur === 'islem', l + ': tür ' + r.tur);
    ok(yakin(r.islem.deger, v) || (v === Infinity && !isFinite(r.islem.deger)), l + ' = ' + r.islem.deger + ' (beklenen ' + v + ')');
    if (t) ok(r.islem.tam && r.islem.tam.metin === t, l + ': tam biçim ' + JSON.stringify(r.islem.tam) + ' (beklenen ' + t + ')');
  } catch (e) { ok(false, l + ': ' + e.message); }
}
// derece/radyan
ok(yakin(M.coz('\\sin 30', { derece: true }).islem.deger, 0.5), 'sin 30° = 1/2');
ok(yakin(M.coz('\\cos 60', { derece: true }).islem.deger, 0.5), 'cos 60° = 1/2');
ok(M.coz('\\sin 60', { derece: true }).islem.tam.metin === '√3/2', 'sin 60° = √3/2: ' + JSON.stringify(M.coz('\\sin 60', { derece: true }).islem.tam));
ok(yakin(M.coz('\\tan 45', { derece: true }).islem.deger, 1), 'tan 45° = 1');
ok(yakin(M.coz('\\sin\\frac{\\pi}{2}', { derece: false }).islem.deger, 1), 'sin(π/2) radyan = 1');
ok(yakin(M.coz('\\arcsin\\left(1\\right)', { derece: true }).islem.deger, 90), 'arcsin 1 = 90°');
ok(yakin(M.coz('\\sin^{-1}\\left(\\frac{1}{2}\\right)', { derece: true }).islem.deger, 30), 'sin⁻¹(1/2) = 30°');
ok(yakin(M.coz('\\sin^{2}30+\\cos^{2}30', { derece: true }).islem.deger, 1), 'sin²30+cos²30 = 1');

// derece işareti
ok(yakin(M.coz('\\sin30^{\\circ}', { derece: true }).islem.deger, 0.5), 'sin 30° (derece modu)');
ok(yakin(M.coz('\\sin30^{\\circ}', { derece: false }).islem.deger, 0.5), 'sin 30° (radyan modunda da 30°)');
ok(yakin(M.coz('\\cos 6 0 ^ { \\circ }', { derece: false }).islem.deger, 0.5), 'cos 60° fotoğraf biçimi');
ok(yakin(M.coz('180°', { derece: false }).islem.deger, Math.PI), '180° = π (radyan)');
// 2) türev: [latex, test noktası]; adımlı türev math.derivative ile sayısal olarak aynı olmalı
const turevler = [
  'x^2', 'x^{3}+2x^{2}-5x+7', '\\frac{1}{x}', '\\sqrt{x}', '3\\sqrt{x}+\\frac{2}{x^{2}}', 'x\\sin x', '\\sin\\left(2x\\right)', '\\cos^{2}x',
  '\\frac{x^{2}+1}{x-1}', 'e^{x}', 'e^{2x+1}', '2^{x}', '\\ln x', '\\ln\\left(x^{2}+1\\right)', '\\log_{2}x', '\\tan x', 'x^{x}',
  '\\left(2x+1\\right)^{5}', '\\sqrt{x^{2}+9}', 'x^{2}e^{x}', '\\frac{\\sin x}{x}', '\\arctan x', '\\sqrt[3]{x}', '\\log x',
];
for (const l of turevler) {
  try {
    const ifade = M.latexCevir(l);
    const t = M.turev(ifade);
    const ref = math.derivative(ifade, 'x');
    for (const xv of [0.7, 1.3, 2.9]) {
      const a = math.evaluate(t.ifade, { x: xv }), b = ref.evaluate({ x: xv });
      ok(yakin(+a, +b, 1e-7), `(${l})' x=${xv}: ${t.ifade} → ${a} ≠ ${b}`);
    }
    ok(t.adimlar.length >= 1 || /^x$/.test(ifade), l + ': adım yok');
  } catch (e) { ok(false, l + ': ' + e.message); }
}
// türev gösterimleri tanınıyor mu
for (const l of ['\\frac{d}{dx}\\left(x^{3}\\right)', "f'(x)=x^{3}", "y'=x^{3}", '\\frac { d } { d x } ( x ^ { 3 } )', "f\\left(x\\right)=\\frac{d}{dx}x^{3}"]) {
  try { const r = M.coz(l); ok(r.tur === 'turev' && yakin(math.evaluate(r.turev.ifade, { x: 2 }), 12), l + ' → ' + r.tur + ' ' + (r.turev && r.turev.ifade)); } catch (e) { ok(false, l + ': ' + e.message); }
}
// 3) fonksiyon analizi
{
  const r = M.coz('f(x)=x^{2}-4');
  ok(r.tur === 'fonksiyon' && r.analiz.kokler.length === 2 && yakin(r.analiz.kokler[0], -2, 1e-6) && yakin(r.analiz.kokler[1], 2, 1e-6), 'x²−4 kökleri ' + JSON.stringify(r.analiz.kokler));
  ok(r.analiz.tepeler.length === 1 && r.analiz.tepeler[0].tur === 'yerel en küçük' && yakin(r.analiz.tepeler[0].y, -4, 1e-6), 'x²−4 tepe ' + JSON.stringify(r.analiz.tepeler));
  ok(yakin(r.analiz.yKesen, -4), 'x²−4 y kesen');
  const r2 = M.coz('y=x^{3}-3x');
  ok(r2.analiz.kokler.length === 3 && r2.analiz.tepeler.length === 2, 'x³−3x: 3 kök, 2 tepe ' + JSON.stringify(r2.analiz));
  const r3 = M.coz('\\frac{1}{x}');
  ok(r3.tur === 'fonksiyon' && r3.analiz.kokler.length === 0, '1/x: kök yok (atlama kök sayılmaz) ' + JSON.stringify(r3.analiz.kokler));
  const r4 = M.coz('\\sin x');
  ok(r4.tur === 'fonksiyon' && r4.analiz.kokler.length === 7, 'sin x [-10,10] 7 kök ' + r4.analiz.kokler.length);
}
// 4) denklem
{
  const r = M.coz('x^{2}-5x+6=0');
  ok(r.tur === 'denklem' && r.denklem.yol === 'delta' && r.denklem.delta === 1 && yakin(r.denklem.kokler[0], 2) && yakin(r.denklem.kokler[1], 3), 'x²−5x+6=0 ' + JSON.stringify(r.denklem));
  const r2 = M.coz('2x+3=11');
  ok(r2.tur === 'denklem' && yakin(r2.denklem.kokler[0], 4), '2x+3=11 ' + JSON.stringify(r2.denklem));
  const r3 = M.coz('x^{2}+1=0');
  ok(r3.denklem.kokler.length === 0 && r3.denklem.delta < 0, 'x²+1=0 gerçek kök yok');
  const r4 = M.coz('2^{x}=8');
  ok(r4.denklem.yol === 'sayisal' && r4.denklem.kokler.length === 1 && yakin(r4.denklem.kokler[0], 3, 1e-6), '2^x=8 ' + JSON.stringify(r4.denklem));
  const r5 = M.coz('3+4=?');
  ok(r5.tur === 'islem' && r5.islem.deger === 7, '3+4=? işlem');
}
console.log(`\n${gecen} geçti, ${hata} hata`);
process.exit(hata ? 1 : 0);
