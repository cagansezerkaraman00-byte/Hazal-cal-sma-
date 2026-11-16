// Rastgele YKS tarzı soru üretici: türev, denklem, fonksiyon, limit, integral × kolay / orta / zor.
// Her sorunun cevabı motordan bağımsız bilinir (kökler baştan seçilir, limit formülden gelir, türev math.js ile karşılaştırılır,
// integral sonucu türevlenip fonksiyona eşit mi diye bakılır). Aynı tohumla hep aynı sorular çıkar (resimli test aynısını kullanır).
// uret(tohum, kategoriBasinaAdet) → [{ no, kategori, seviye, latex, bek }]
const math = require('mathjs');

function rastgele(tohum) { // mulberry32
  let a = tohum >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function uret(tohum = 2026, adet = 100) {
  const r = rastgele(tohum);
  const tam = (a, b) => a + Math.floor(r() * (b - a + 1));
  const sifirsiz = (a, b) => { let v = 0; while (!v) v = tam(a, b); return v; };
  const sec = (dizi) => dizi[Math.floor(r() * dizi.length)];
  // LaTeX yardımcıları: katsayılı terimler ders kitabı gibi (1x → x, +−3 → −3)
  const kat = (a, govde, ilk = false) => {
    if (a === 0) return '';
    const isaret = a < 0 ? '-' : ilk ? '' : '+';
    const m = Math.abs(a);
    return isaret + (m === 1 && govde ? '' : m) + govde;
  };
  const polL = (k) => { // [a0, a1, a2, …] → LaTeX
    let s = '';
    for (let i = k.length - 1; i >= 0; i--) { if (!k[i]) continue; s += kat(k[i], i === 0 ? '' : i === 1 ? 'x' : 'x^{' + i + '}', s === ''); }
    return s || '0';
  };
  const polM = (k) => k.map((a, i) => `(${a})*x^${i}`).join('+') || '0';
  const carp = (p, q) => { const o = new Array(p.length + q.length - 1).fill(0); p.forEach((a, i) => q.forEach((b, j) => { o[i + j] += a * b; })); return o; };
  const kokten = (kokler, k = 1) => kokler.reduce((p, rr) => carp(p, [-rr, 1]), [k]);
  const sayiL = (v) => (v < 0 ? '-' + Math.abs(v) : String(v));
  const icL = (a, b) => (b === 0 ? kat(a, 'x', true) : kat(a, 'x', true) + (b > 0 ? '+' : '-') + Math.abs(b)); // ax+b

  const sorular = [];
  const seviyeler = (n) => { const k = Math.ceil(n / 3), o = Math.ceil((n - k) / 2); return [...Array(k).fill('kolay'), ...Array(o).fill('orta'), ...Array(n - k - o).fill('zor')]; };

  // ---------------------------------------------------------------- türev: d/dx( … )
  for (const sev of seviyeler(adet)) {
    let L, M;
    if (sev === 'kolay') {
      const t = tam(0, 3);
      if (t === 0) { const a = sifirsiz(-6, 6), n = tam(2, 5), b = sifirsiz(-9, 9), c = tam(-9, 9); L = kat(a, 'x^{' + n + '}', true) + kat(b, 'x') + (c ? (c > 0 ? '+' : '-') + Math.abs(c) : ''); M = `${a}*x^${n}+${b}*x+${c}`; }
      else if (t === 1) { const a = sifirsiz(-5, 5); L = '\\frac{' + a + '}{x}'; M = `${a}/x`; }
      else if (t === 2) { const a = sifirsiz(2, 9); L = a + '\\sqrt{x}'; M = `${a}*sqrt(x)`; }
      else { const a = sifirsiz(-4, 4), b = sifirsiz(-4, 4); L = kat(a, 'x^{3}', true) + kat(b, 'x^{2}'); M = `${a}*x^3+${b}*x^2`; }
    } else if (sev === 'orta') {
      const t = tam(0, 7), a = sifirsiz(-5, 5), b = sifirsiz(-6, 6), c = sifirsiz(-4, 4), d = sifirsiz(-5, 5), n = tam(2, 5);
      if (t === 0) { L = '\\left(' + icL(a, b) + '\\right)\\left(' + kat(c, 'x^{2}', true) + (d > 0 ? '+' : '-') + Math.abs(d) + '\\right)'; M = `(${a}*x+${b})*(${c}*x^2+${d})`; }
      else if (t === 1) { L = '\\frac{' + icL(a, b) + '}{' + icL(c, d) + '}'; M = `(${a}*x+${b})/(${c}*x+${d})`; }
      else if (t === 2) { L = 'x^{' + n + '}e^{x}'; M = `x^${n}*e^x`; }
      else if (t === 3) { L = '\\sin\\left(' + icL(Math.abs(a) || 2, 0) + '\\right)'; M = `sin(${Math.abs(a)}*x)`; }
      else if (t === 4) { L = '\\cos\\left(' + icL(a, b) + '\\right)'; M = `cos(${a}*x+${b})`; }
      else if (t === 5) { const aa = Math.abs(a); L = '\\ln\\left(' + icL(aa, Math.abs(b)) + '\\right)'; M = `log(${aa}*x+${Math.abs(b)})`; }
      else if (t === 6) { L = '\\left(' + icL(a, b) + '\\right)^{' + n + '}'; M = `(${a}*x+${b})^${n}`; }
      else { L = kat(a, 'e^{' + kat(c, 'x', true) + '}', true); M = `${a}*e^(${c}*x)`; }
    } else {
      const t = tam(0, 7), a = sifirsiz(1, 5), b = sifirsiz(1, 4), n = tam(2, 4);
      if (t === 0) { L = '\\sin^{2}\\left(' + a + 'x\\right)'; M = `sin(${a}*x)^2`; }
      else if (t === 1) { L = 'e^{' + a + 'x^{2}}\\cos\\left(' + b + 'x\\right)'; M = `e^(${a}*x^2)*cos(${b}*x)`; }
      else if (t === 2) { L = '\\ln\\left(x^{2}+' + a + '\\right)'; M = `log(x^2+${a})`; }
      else if (t === 3) { L = '\\frac{\\left(x^{2}+' + a + '\\right)^{' + n + '}}{x+' + b + '}'; M = `(x^2+${a})^${n}/(x+${b})`; }
      else if (t === 4) { L = 'x\\sqrt{x^{2}+' + a + '}'; M = `x*sqrt(x^2+${a})`; }
      else if (t === 5) { L = 'x^{2}\\tan\\left(' + a + 'x\\right)'; M = `x^2*tan(${a}*x)`; }
      else if (t === 6) { L = 'x^{' + n + '}\\ln x'; M = `x^${n}*log(x)`; }
      else { L = 'e^{\\sin x}'; M = 'e^sin(x)'; }
    }
    sorular.push({ kategori: 'türev', seviye: sev, latex: '\\frac{d}{dx}\\left(' + L + '\\right)', bek: { tur: 'turev', f: M } });
  }

  // ---------------------------------------------------------------- denklem
  for (const sev of seviyeler(adet)) {
    let L, kokler;
    if (sev === 'kolay') {
      const x0 = tam(-9, 9), a = sifirsiz(-7, 7), b = tam(-12, 12), c = a * x0 + b;
      if (r() < 0.7) { L = icL(a, b) + '=' + sayiL(c); kokler = [x0]; }
      else { const p = tam(-6, 6); L = a + '\\left(x' + (p > 0 ? '-' + p : p < 0 ? '+' + -p : '') + '\\right)=' + sayiL(a * (x0 - p)); kokler = [x0]; }
    } else if (sev === 'orta') {
      const t = tam(0, 3);
      if (t < 2) { let r1 = tam(-8, 8), r2 = tam(-8, 8); const k = sifirsiz(-3, 3); const p = kokten([r1, r2], k); L = polL(p) + '=0'; kokler = [...new Set([r1, r2])].sort((u, v) => u - v); }
      else if (t === 2) { const r1 = tam(-6, 6), r2 = tam(-6, 6), p = kokten([r1, r2]); const sag = p[0]; L = polL([0, p[1], p[2]]) + '=' + sayiL(-sag); kokler = [...new Set([r1, r2])].sort((u, v) => u - v); }
      else { const p = sifirsiz(1, 6); L = 'x^{2}+' + p * p + '=0'; kokler = []; }
    } else {
      const t = tam(0, 4);
      if (t === 0) { const ks = [tam(-5, -1), tam(0, 2), tam(3, 6)]; L = polL(kokten(ks)) + '=0'; kokler = ks; }
      else if (t === 1) { const a = sec([2, 3, 5]), b = tam(-3, 3), c = tam(1, 4); L = a + '^{x' + (b > 0 ? '+' + b : b < 0 ? b : '') + '}=' + Math.pow(a, c); kokler = [c - b]; }
      else if (t === 2) { const a = sec([2, 3]), b = tam(-4, 6), c = tam(1, 3); L = '\\log_{' + a + '}\\left(x' + (b > 0 ? '+' + b : b < 0 ? b : '') + '\\right)=' + c; kokler = [Math.pow(a, c) - b]; }
      else if (t === 3) { const a = tam(0, 5), b = sifirsiz(1, 6); L = '\\left|x' + (a ? '-' + a : '') + '\\right|=' + b; kokler = [a - b, a + b]; }
      else { // √(x+a) = x + b, kökü baştan seç; uymayan (yabancı) kök elenir
        const x0 = tam(1, 6), b = tam(-1, 2), a = (x0 + b) * (x0 + b) - x0;
        const aday = math.polynomialRoot ? null : null; void aday;
        // x + a = (x+b)² → x² + (2b−1)x + b² − a = 0
        const B = 2 * b - 1, C = b * b - a, D = B * B - 4 * C;
        kokler = [(-B - Math.sqrt(D)) / 2, (-B + Math.sqrt(D)) / 2].filter((k) => k + b >= -1e-9 && Math.abs(Math.sqrt(k + a) - (k + b)) < 1e-9);
        kokler = [...new Set(kokler.map((k) => Math.round(k * 1e9) / 1e9))].sort((u, v) => u - v);
        L = '\\sqrt{x' + (a > 0 ? '+' + a : a < 0 ? a : '') + '}=x' + (b > 0 ? '+' + b : b < 0 ? b : '');
      }
    }
    sorular.push({ kategori: 'denklem', seviye: sev, latex: L, bek: { tur: 'denklem', kokler } });
  }

  // ---------------------------------------------------------------- fonksiyon (grafik, kökler, tepe noktaları)
  for (const sev of seviyeler(adet)) {
    let L, kokler, tepeSayisi = null;
    if (sev === 'kolay') {
      if (r() < 0.5) { const x0 = tam(-6, 6), a = sifirsiz(-4, 4); L = 'f(x)=' + icL(a, -a * x0); kokler = [x0]; tepeSayisi = 0; }
      else { const r1 = tam(-7, 3), r2 = tam(r1 + 1, 8), a = sec([1, -1, 2]); L = 'f(x)=' + polL(kokten([r1, r2], a)); kokler = [r1, r2]; tepeSayisi = 1; }
    } else if (sev === 'orta') {
      const r1 = tam(-6, -2), r2 = tam(r1 + 1, 1), r3 = tam(r2 + 1, 6), a = sec([1, -1]);
      L = 'f(x)=' + polL(kokten([r1, r2, r3], a)); kokler = [r1, r2, r3]; tepeSayisi = 2;
    } else {
      const t = tam(0, 3);
      if (t === 0) { const a = tam(1, 4), b = tam(5, 7) * sec([1, -1]); L = 'f(x)=\\frac{x^{2}-' + a * a + '}{x' + (b > 0 ? '+' + b : b) + '}'; kokler = [-a, a]; }
      else if (t === 1) { const a = sec([1, 2]); L = 'f(x)=\\sin\\left(' + (a === 1 ? '' : a) + 'x\\right)'; kokler = []; for (let k = -10; k <= 10; k++) { const v = k * Math.PI / a; if (v >= -10 && v <= 10) kokler.push(v); } }
      else if (t === 2) { L = 'f(x)=xe^{-x}'; kokler = [0]; tepeSayisi = 1; }
      else { const a = tam(1, 3); L = 'f(x)=x^{2}e^{-' + a + 'x}'; kokler = [0]; tepeSayisi = 2; }
    }
    sorular.push({ kategori: 'fonksiyon', seviye: sev, latex: L, bek: { tur: 'fonksiyon', kokler, tepeSayisi } });
  }

  // ---------------------------------------------------------------- limit
  for (const sev of seviyeler(adet)) {
    let L, deger;
    if (sev === 'kolay') {
      const a = tam(-4, 4), p = [tam(-6, 6), tam(-5, 5), sifirsiz(-3, 3)];
      if (r() < 0.6) { L = '\\lim_{x\\to ' + sayiL(a) + '}\\left(' + polL(p) + '\\right)'; deger = p[0] + p[1] * a + p[2] * a * a; }
      else { const c = sifirsiz(-4, 4), d = tam(-6, 6); const pay = [tam(-5, 5), sifirsiz(-4, 4)]; if (c * a + d === 0) { L = '\\lim_{x\\to ' + sayiL(a) + '}\\left(' + polL(p) + '\\right)'; deger = p[0] + p[1] * a + p[2] * a * a; } else { L = '\\lim_{x\\to ' + sayiL(a) + '}\\frac{' + polL(pay) + '}{' + icL(c, d) + '}'; deger = (pay[0] + pay[1] * a) / (c * a + d); } }
    } else if (sev === 'orta') {
      const t = tam(0, 4), a = sifirsiz(-5, 5), k = sifirsiz(-6, 6);
      if (t === 0) { L = '\\lim_{x\\to ' + sayiL(a) + '}\\frac{x^{2}-' + a * a + '}{x' + (a > 0 ? '-' + a : '+' + -a) + '}'; deger = 2 * a; }
      else if (t === 1) { const p = kokten([a, k]); L = '\\lim_{x\\to ' + sayiL(a) + '}\\frac{' + polL(p) + '}{x' + (a > 0 ? '-' + a : '+' + -a) + '}'; deger = a - k; }
      else if (t === 2) { const m = sifirsiz(1, 6), n = sifirsiz(1, 5); L = '\\lim_{x\\to0}\\frac{\\sin\\left(' + m + 'x\\right)}{' + (n === 1 ? '' : n) + 'x}'; deger = m / n; }
      else if (t === 3) { L = '\\lim_{x\\to ' + sayiL(a) + '}\\frac{x^{3}' + (a > 0 ? '-' : '+') + Math.abs(a * a * a) + '}{x' + (a > 0 ? '-' + a : '+' + -a) + '}'; deger = 3 * a * a; }
      else { const p = [tam(-5, 5), tam(-5, 5), sifirsiz(1, 6)], q = [tam(-5, 5), tam(-5, 5), sifirsiz(1, 6)]; const ust = r() < 0.5; L = '\\lim_{x\\to\\infty}\\frac{' + polL(p) + '}{' + polL(ust ? q : [q[0], q[1], q[2], sifirsiz(1, 3)]) + '}'; deger = ust ? p[2] / q[2] : 0; }
    } else {
      const t = tam(0, 6), a = tam(1, 5);
      if (t === 0) { L = '\\lim_{x\\to0}\\frac{\\sqrt{x+' + a * a + '}-' + a + '}{x}'; deger = 1 / (2 * a); }
      else if (t === 1) { L = '\\lim_{x\\to0}\\frac{1-\\cos\\left(' + (a === 1 ? '' : a) + 'x\\right)}{x^{2}}'; deger = a * a / 2; }
      else if (t === 2) { L = '\\lim_{x\\to0}\\frac{e^{' + (a === 1 ? '' : a) + 'x}-1}{x}'; deger = a; }
      else if (t === 3) { L = '\\lim_{x\\to0}\\frac{\\tan\\left(' + (a === 1 ? '' : a) + 'x\\right)}{x}'; deger = a; }
      else if (t === 4) { L = '\\lim_{x\\to\\infty}\\left(1+\\frac{' + a + '}{x}\\right)^{x}'; deger = Math.exp(a); }
      else if (t === 5) { L = '\\lim_{x\\to' + a + '^{+}}\\frac{1}{x-' + a + '}'; deger = Infinity; }
      else { L = '\\lim_{x\\to' + a + '}\\frac{\\left|x-' + a + '\\right|}{x-' + a + '}'; deger = 'yok'; }
    }
    sorular.push({ kategori: 'limit', seviye: sev, latex: L, bek: { tur: 'limit', deger } });
  }

  // ---------------------------------------------------------------- integral
  for (const sev of seviyeler(adet)) {
    let L, M, belirli = null;
    const sinir = r() < 0.4;
    if (sev === 'kolay') {
      const p = [tam(-6, 6), tam(-6, 6), sifirsiz(-3, 3) * 3, r() < 0.4 ? sifirsiz(-2, 2) * 4 : 0];
      L = polL(p); M = polM(p);
      if (sinir) { const a = tam(-2, 1), b = tam(a + 1, 3); belirli = [a, b]; }
    } else if (sev === 'orta') {
      const t = tam(0, 5), a = sifirsiz(1, 5), b = tam(-4, 4), n = tam(2, 5);
      if (t === 0) { L = 'e^{' + (a === 1 ? '' : a) + 'x}'; M = `e^(${a}*x)`; }
      else if (t === 1) { L = '\\sin\\left(' + icL(a, b) + '\\right)'; M = `sin(${a}*x+${b})`; }
      else if (t === 2) { L = '\\cos\\left(' + (a === 1 ? '' : a) + 'x\\right)'; M = `cos(${a}*x)`; }
      else if (t === 3) { L = '\\frac{1}{' + icL(a, Math.abs(b) + 1) + '}'; M = `1/(${a}*x+${Math.abs(b) + 1})`; }
      else if (t === 4) { L = '\\left(' + icL(a, b) + '\\right)^{' + n + '}'; M = `(${a}*x+${b})^${n}`; }
      else { L = (a === 1 ? '' : a) + '\\sqrt{x}'; M = `${a}*sqrt(x)`; }
      if (sinir) { const lo = tam(0, 1), hi = tam(lo + 1, 3); belirli = [lo, hi]; }
    } else {
      const t = tam(0, 7), a = tam(1, 4), n = tam(2, 4);
      if (t === 0) { L = (2 * a) + 'xe^{' + (a === 1 ? '' : a) + 'x^{2}}'; M = `${2 * a}*x*e^(${a}*x^2)`; }
      else if (t === 1) { L = 'x\\left(x^{2}+' + a + '\\right)^{' + n + '}'; M = `x*(x^2+${a})^${n}`; }
      else if (t === 2) { L = '\\cos x\\sin^{' + n + '}x'; M = `cos(x)*sin(x)^${n}`; }
      else if (t === 3) { L = '\\frac{2x+' + a + '}{x^{2}+' + a + 'x+' + (a + 1) + '}'; M = `(2*x+${a})/(x^2+${a}*x+${a + 1})`; }
      else if (t === 4) { L = 'xe^{' + (a === 1 ? '' : a) + 'x}'; M = `x*e^(${a}*x)`; }
      else if (t === 5) { L = 'x\\sin\\left(' + (a === 1 ? '' : a) + 'x\\right)'; M = `x*sin(${a}*x)`; }
      else if (t === 6) { L = '\\ln x'; M = 'log(x)'; }
      else { L = 'x\\ln x'; M = 'x*log(x)'; }
      if (sinir) { belirli = t === 6 || t === 7 ? [1, 3] : [0, 2]; }
    }
    const govde = belirli ? '\\int_{' + belirli[0] + '}^{' + belirli[1] + '}' : '\\int ';
    const parantez = /[+-]/.test(L.replace(/^-/, '').replace(/\{[^}]*\}/g, '')) && !/^\\frac/.test(L) ? '\\left(' + L + '\\right)' : L;
    sorular.push({ kategori: 'integral', seviye: sev, latex: govde + parantez + '\\,dx', bek: { tur: 'integral', f: M, belirli } });
  }
  return sorular.map((s, i) => ({ no: i + 1, ...s }));
}

// motorun sonucunu beklenenle karşılaştır: { tamam, aciklama }
function denetle(M, soru, sonuc) {
  const b = soru.bek, yakin = (a, c, t = 1e-6) => Math.abs(a - c) <= t * Math.max(1, Math.abs(c));
  if (!sonuc) return { tamam: false, aciklama: 'sonuç yok' };
  if (sonuc.tur !== b.tur) return { tamam: false, aciklama: 'tür ' + sonuc.tur + ' (beklenen ' + b.tur + ')' };
  if (b.tur === 'turev') {
    const ref = math.derivative(b.f, 'x'), bizim = M.derle(sonuc.turev.ifade);
    for (const x of [0.37, 0.91, 1.53]) {
      const a = bizim(x), c = ref.evaluate({ x });
      if (isFinite(c) && !yakin(a, c, 1e-7)) return { tamam: false, aciklama: `x=${x}: ${a} ≠ ${c}` };
    }
    return { tamam: true };
  }
  if (b.tur === 'denklem') {
    const k = sonuc.denklem.kokler;
    if (k.length !== b.kokler.length || !b.kokler.every((v, i) => yakin(k[i], v, 1e-6))) return { tamam: false, aciklama: 'kökler ' + JSON.stringify(k) + ' (beklenen ' + JSON.stringify(b.kokler) + ')' };
    return { tamam: true };
  }
  if (b.tur === 'fonksiyon') {
    const k = sonuc.analiz.kokler;
    if (k.length !== b.kokler.length || !b.kokler.every((v, i) => yakin(k[i], v, 1e-6))) return { tamam: false, aciklama: 'kökler ' + JSON.stringify(k.map((v) => +v.toFixed(6))) + ' (beklenen ' + JSON.stringify(b.kokler.map((v) => +v.toFixed(6))) + ')' };
    if (b.tepeSayisi !== null && sonuc.analiz.tepeler.length !== b.tepeSayisi) return { tamam: false, aciklama: 'tepe sayısı ' + sonuc.analiz.tepeler.length + ' (beklenen ' + b.tepeSayisi + ')' };
    return { tamam: true };
  }
  if (b.tur === 'limit') {
    const L = sonuc.limit;
    if (b.deger === 'yok') return { tamam: !!L.yok, aciklama: L.yok ? '' : 'limit ' + L.deger + ' (beklenen: yok)' };
    if (!isFinite(b.deger)) return { tamam: L.deger === b.deger, aciklama: 'limit ' + L.deger + ' (beklenen ' + b.deger + ')' };
    return { tamam: !L.yok && yakin(L.deger, b.deger, 1e-6), aciklama: 'limit ' + L.deger + ' (beklenen ' + b.deger + ')' };
  }
  if (b.tur === 'integral') {
    const f = (x) => math.evaluate(b.f, { x });
    if (b.belirli) {
      if (!sonuc.belirli) return { tamam: false, aciklama: 'belirli integral beklenirdi' };
      // bağımsız sayısal değer (çok ince Simpson)
      const [a, c] = b.belirli, n = 20000, h = (c - a) / n;
      let s = f(a) + f(c);
      for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
      const ref = s * h / 3;
      return { tamam: yakin(sonuc.belirli.deger, ref, 1e-6), aciklama: 'değer ' + sonuc.belirli.deger + ' (beklenen ' + ref + ')' + (sonuc.belirli.sayisal ? ' [sayısal]' : '') };
    }
    if (!sonuc.integral) return { tamam: false, aciklama: 'belirsiz integral beklenirdi' };
    const F = M.derle(sonuc.integral.ifade), h = 1e-5;
    for (const x of [0.43, 1.17, 2.05]) {
      const turevF = (F(x + h) - F(x - h)) / (2 * h);
      if (!yakin(turevF, f(x), 1e-5)) return { tamam: false, aciklama: `F'(${x}) = ${turevF} ≠ f = ${f(x)}` };
    }
    return { tamam: true };
  }
  return { tamam: false, aciklama: 'bilinmeyen tür' };
}

module.exports = { uret, denetle };
