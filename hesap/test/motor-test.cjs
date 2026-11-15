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
// yazım: eksi sayıyla çarpım çıkarma gibi görünmemeli
for (const [e, istenmeyen, beklenen] of [['x^3*(-640)', /x\}\^\{3\}-640/, /-640\{ ?x\}\^\{3\}/], ['x^3*-640/3', /\}\^\{3\}\\cdot-/, /-640/], ['(x+1)*(-2)', /x\+1\\right\)-2|1-2/, /-2|\\cdot\\left\(-2/]]) {
  const t = M.tex(e);
  ok(!istenmeyen.test(t) && beklenen.test(t), 'yazım ' + e + ' → ' + t);
}
// 5) gerçek okuyucunun (Texo) çıktıları: GitHub'daki okuyucu denemesinden birebir
const okunan = [
  ['{ \\frac { 3 } { 4 } } + { \\frac { 1 } { 2 } }', 'islem', 1.25],
  ['2 ^ { 5 } - { \\sqrt { 1 6 } }', 'islem', 28],
  ['\\mathbf { 3 } \\cdot ( 4 + 5 ) - 6', 'islem', 21],
  ['\\log _ { 2 } \\mathbf { 3 2 } + \\ln e', 'islem', 6],
  ['\\sin 3 0 ^ { \\circ } + \\cos 6 0 ^ { \\circ }', 'islem', 1],
  ['{ \\boldsymbol { x } } ^ { 2 } - 5 { \\boldsymbol { x } } + { \\boldsymbol { 6 } } = 0', 'denklem', [2, 3]],
  ['3 x - 7 = 1 1', 'denklem', [6]],
  ['f ( x ) = x ^ { 2 } - 4 x + 3', 'fonksiyon', [1, 3]],
  ['{ \\frac { d } { d x } } \\left ( x ^ { 3 } + 2 x ^ { 2 } \\right )', 'turev', 7],
  ['f ( x ) = { \\frac { 2 x + 1 } { x - 3 } }', 'fonksiyon', [-0.5]],
  ['1 2 + 7 \\times 3', 'islem', 33],
  ['\\frac { 5 } { 8 } - \\frac { 1 } { 4 }', 'islem', 0.375],
  ['f ( x ) = 3 x ^ { 2 } + 2 x', 'fonksiyon', [-2 / 3, 0]],
  ['2 ^ { 3 } + 4 ^ { 2 }', 'islem', 24],
];
// toplu resim denemesinden (GitHub, 1000 resim): okuyucunun limit, türev ve integral yazımları
okunan.push(
  ['\\frac { d } { d x } \\left ( 6 ~ \\sqrt { x } \\right )', 'turev', 3],
  ['{ \\frac { d } { d x } } ~ \\left ( { \\frac { 2 } { x } } \\right )', 'turev', -2],
  ['\\operatorname* { l i m } _ { x \\rarr 2 } { \\frac { - 4 x + 1 } { - x + 5 } }', 'limit', -7 / 3],
  ['\\operatorname* { l i m } _ { x \\rarr - 2 } \\left ( 2 x ^ { 2 } - 1 \\right )', 'limit', 7],
  ['\\operatorname* { l i m } _ { x \\rarr 0 } { \\frac { \\sin \\left ( 3 x \\right ) } { x } }', 'limit', 3],
  ['\\operatorname* { l i m } _ { x \\rarr \\infty } { \\frac { 2 x ^ { 2 } } { x ^ { 2 } + 1 } }', 'limit', 2],
  ['\\int _ { 1 } ^ { 3 } \\ln x \\, d x', 'integral', 3 * Math.log(3) - 2],
  ['{ \\int _ { 0 } ^ { 2 } } \\left ( 3 x ^ { 2 } + 1 \\right ) \\, d x', 'integral', 10],
  ['\\displaystyle \\int \\limits _ { 0 } ^ { 1 } x ^ { 2 } \\mathrm { d } x', 'integral', 1 / 3],
  ['\\int _ { 0 } ^ { \\pi } \\sin x ~ d x', 'integral', 2],
  // ikinci toplu deneme: \infin ve süslü parantezli büyük parantezler
  ['\\operatorname* { l i m } _ { x \\rarr \\infin } { \\frac { 5 x ^ { 2 } + x - 2 } { 3 x ^ { 2 } + 2 x + 3 } }', 'limit', 5 / 3],
  ['\\operatorname* { l i m } _ { x \\rarr \\infin } \\left ( 1 + { \\frac { 4 } { x } } \\right ) ^ { x }', 'limit', Math.exp(4)],
  ['\\int _ { - 1 } ^ { 1 } { \\big ( } 3 x ^ { 2 } + 4 x + 4 { \\big ) } ~ d x', 'integral', 10],
  ['\\int _ { 1 } ^ { 3 } { \\Big ( } \\left ( x - 4 \\right ) ^ { 5 } { \\Big ) } ~ d x', 'integral', -364 / 3],
  ['\\int _ { 0 } ^ { 2 } { \\big ( } \\sin ( 2 x + 3 { \\big ) } { \\big ) } ~ d x', 'integral', (Math.cos(3) - Math.cos(7)) / 2],
);
for (const [l, tur, bek] of okunan) {
  try {
    const r = M.coz(l, { derece: true });
    let iyi = r.tur === tur;
    if (iyi && tur === 'islem') iyi = yakin(r.islem.deger, bek);
    if (iyi && tur === 'denklem') iyi = r.denklem.kokler.length === bek.length && bek.every((k, i) => yakin(r.denklem.kokler[i], k));
    if (iyi && tur === 'fonksiyon') iyi = r.analiz.kokler.length === bek.length && bek.every((k, i) => yakin(r.analiz.kokler[i], k, 1e-6));
    if (iyi && tur === 'turev') iyi = yakin(M.derle(r.turev.ifade)(1), bek);
    if (iyi && tur === 'limit') iyi = yakin(r.limit.deger, bek);
    if (iyi && tur === 'integral') iyi = yakin((r.belirli || {}).deger, bek);
    ok(iyi, 'okuyucu çıktısı: ' + l + ' → ' + r.tur + ' ' + JSON.stringify(r.islem ? r.islem.deger : r.denklem ? r.denklem.kokler : r.analiz ? r.analiz.kokler : r.limit ? r.limit.deger : r.belirli ? r.belirli.deger : r.turev && r.turev.ifade));
  } catch (e) { ok(false, 'okuyucu çıktısı: ' + l + ': ' + e.message); }
}
// ---------------------------------------------------------------- YKS konuları: yazım ve biçim (doğruluk toplu testlerde)
const tx = (r) => JSON.stringify(r);
const esit = (l) => M.coz(l).esitsizlik;
ok(esit('x^2-5x+6<0').tex === '\\left(2,\\ 3\\right)', 'x² − 5x + 6 < 0 → (2, 3): ' + esit('x^2-5x+6<0').tex);
ok(esit('x^2-2x-1<0').tex === '\\left(1-\\sqrt{2},\\ 1+\\sqrt{2}\\right)', 'kesin kökler: ' + esit('x^2-2x-1<0').tex);
ok(esit('\\frac{1}{x^2}>0').tex === '\\mathbb{R}-\\left\\{0\\right\\}', '1/x² > 0 → ℝ − {0}: ' + esit('\\frac{1}{x^2}>0').tex);
ok(esit('e^{-x}>0').tex === '\\mathbb{R}', 'e^(−x) > 0 → ℝ (çok küçük ama sıfır değil): ' + esit('e^{-x}>0').tex);
ok(esit('(x-2)^2\\le0').tex === '\\left\\{2\\right\\}', '(x − 2)² ≤ 0 → {2}');
ok(esit('x^2+1<0').tex === '\\varnothing', 'x² + 1 < 0 → ∅');
ok(tx(esit('\\frac{x-1}{x+2}\\geq0').tablo.noktalar.map((n) => n.isaret)) === '["∄","0"]', 'işaret tablosunda ∄ ve 0');
ok(esit('3 < 5').karsilastirma && esit('3 < 5').dogru && !esit('3 > 5').dogru, 'sayı karşılaştırma');
ok(esit('x \\leqslant 3').tex === '\\left(-\\infty,\\ 3\\right]' && esit('x<=3').tex === esit('x\\le3').tex, '\\leqslant ve <= yazımları');
ok(M.coz('\\left\\{ \\begin{array} { l } { x > 2 } \\\\ { x \\leq 5 } \\end{array} \\right.').esitsizlik.tex === '\\left(2,\\ 5\\right]', 'eşitsizlik sistemi');
const d = (l) => M.coz(l).denklem;
ok(tx(d('x^2-2x-1=0').kokTex.map((k) => k.tex)) === '["1-\\\\sqrt{2}","1+\\\\sqrt{2}"]', 'Δ kökleri kesin: ' + tx(d('x^2-2x-1=0').kokTex));
ok(d('x^3-6x^2+11x-6=0').carpanlar === '\\left(x-1\\right)\\left(x-2\\right)\\left(x-3\\right)', 'çarpanlara ayırma: ' + d('x^3-6x^2+11x-6=0').carpanlar);
ok(d('\\sin^2x+\\cos^2x=1').yol === 'ozdeslik', 'özdeşlik');
ok(d('|x-1|+|x+2|=3').kumeTex === '\\left[-2,\\ 1\\right]', 'aralık çözüm: ' + d('|x-1|+|x+2|=3').kumeTex);
ok(tx(d('|x-3|=0').kokler) === '[3]', 'dokunan kök |x − 3| = 0');
ok(d('\\sin x=0').aileler.length === 1 && yakin(d('\\sin x=0').aileler[0].adim, Math.PI), 'sin x = 0 → x = kπ');
ok(d('\\cos x = -\\frac{1}{2}').ikiPi.length === 2, 'cos x = −1/2 → iki kök (periyodik test noktası tuzağı)');
ok(M.coz('\\sum_{k=1}^{n}k^2').toplamN.tex === '\\frac{n\\left(n+1\\right)\\left(2n+1\\right)}{6}', 'Σk² kapalı biçim: ' + M.coz('\\sum_{k=1}^{n}k^2').toplamN.tex);
ok(M.coz('\\sum _ { k = 1 } ^ { 1 0 } ( 2 k + 1 )').islem.deger === 120, 'Σ okuyucu yazımı');
ok(M.coz('\\sum_{i=1}^{3}i').islem.deger === 6, 'Σ değişkeni i (sanal birim değil)');
ok(M.coz('\\binom52').islem.deger === 10 && M.coz('{ 5 \\choose 2 }').islem.deger === 10 && M.coz('\\left( \\begin{array} { c } { 5 } \\\\ { 2 } \\end{array} \\right)').islem.deger === 10, 'kombinasyon yazımları');
ok(M.coz('C ( 6 , 3 )').islem.deger === 20 && M.coz('P\\left(5,2\\right)').islem.deger === 20, 'C(n, r) ve P(n, r)');
ok(M.coz('\\mathrm { E B O B } ( 1 2 , 1 8 )').islem.deger === 6 && M.coz('\\operatorname{EKOK}\\left(4,6,10\\right)').islem.deger === 60 && M.coz('\\gcd(8,12)').islem.deger === 4, 'EBOB / EKOK');
ok(M.coz('\\log_2 8').islem.deger === 3, '\\log_2 8: taban 2, sayı 8 (28 değil)');
ok(M.coz('(2+3i)(1-i)').islem.metin === '5 + i' && M.coz('\\sqrt{-4}').islem.metin === '2i', 'karmaşık: ' + M.coz('(2+3i)(1-i)').islem.metin);
ok(M.coz('\\sqrt[3]{54}').islem.tam.tex === '3\\sqrt[3]{2}', 'küp kök tam biçim');
const sis = (l) => M.coz(l).sistem;
ok(tx(sis('\\begin{cases}2x+3y=12\\\\x-y=1\\end{cases}').cozumler) === '[[3,2]]', 'doğrusal sistem');
ok(sis('\\begin{cases}2x+3y=12\\\\x-y=1\\end{cases}').adimlar[1].kural === '2. denklem 3 ile çarpılır, denklemler taraf tarafa toplanır (y\'ler sadeleşir)', 'yok etme cümlesi: ' + sis('\\begin{cases}2x+3y=12\\\\x-y=1\\end{cases}').adimlar[1].kural);
ok(sis('\\begin{cases}x^2+y^2=25\\\\x-y=1\\end{cases}').egriler[0] === null, 'çember doğrusal sanılmıyor (örtük çizilir)');
ok(sis('\\begin{cases}x+y=2\\\\x+y=3\\end{cases}').tur === 'yok' && sis('\\begin{cases}x+y=2\\\\2x+2y=4\\end{cases}').tur === 'sonsuz', 'çözümsüz ve sonsuz çözümlü sistem');

console.log(`\n${gecen} geçti, ${hata} hata`);
process.exit(hata ? 1 : 0);
