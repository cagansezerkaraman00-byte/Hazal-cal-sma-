// Rastgele YKS soruları (türev/limit/integral dışındaki konular): eşitsizlik, mutlak değer, üstel-logaritma, trigonometri,
// Σ toplam, kombinasyon, denklem sistemi, üslü-köklü sayılar, karmaşık sayılar × kolay / orta / zor.
// Cevaplar motordan bağımsız bilinir: kökler ve çözümler baştan seçilir; eşitsizlikte kritik noktalar bilinir, işaret
// math.js ile tek tek hesaplanır; işlemlerin değeri doğrudan JavaScript'le hesaplanır. Aynı tohumla hep aynı sorular çıkar.
// uret(tohum, kategoriBasinaAdet) → [{ no, kategori, seviye, latex, bek }]
const math = require('mathjs');

function rastgele(tohum) { // mulberry32
  let a = tohum >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const KATEGORILER = ['eşitsizlik', 'mutlak değer', 'üstel-log', 'trigonometri', 'toplam', 'kombinasyon', 'sistem', 'üslü-köklü', 'karmaşık'];
const ISARET_L = { '<': '<', '≤': '\\le ', '>': '>', '≥': '\\ge ' };
const faktoriyel = (n) => (n <= 1 ? 1 : n * faktoriyel(n - 1));
const kombinasyon = (n, r) => faktoriyel(n) / (faktoriyel(r) * faktoriyel(n - r));
const permutasyon = (n, r) => faktoriyel(n) / faktoriyel(n - r);
const ebob = (a, b) => (b ? ebob(b, a % b) : Math.abs(a));
const ekok = (a, b) => Math.abs(a * b) / ebob(a, b);

// Bilinen kritik noktalarla çözüm kümesi (motordan bağımsız): [{ a, b, aDahil, bDahil }]
function referansKume(kosullar, kritik) {
  const B = [...new Set(kritik.map((v) => +v.toFixed(12)))].sort((p, q) => p - q);
  const deg = (ifade, x) => { try { const v = math.evaluate(ifade, { x }); return typeof v === 'number' ? v : NaN; } catch (e) { return NaN; } };
  const sagla = (x) => kosullar.every(({ ifade, op }) => {
    const v = deg(ifade, x);
    if (!isFinite(v)) return false;
    const z = Math.abs(v) < 1e-9;
    return op === '<' ? v < 0 && !z : op === '≤' ? v < 0 || z : op === '>' ? v > 0 && !z : op === '≥' ? v > 0 || z : op === '=' ? z : !z;
  });
  const dizi = [];
  for (let i = 0; i <= B.length; i++) {
    const a = i === 0 ? -Infinity : B[i - 1], b = i === B.length ? Infinity : B[i];
    const t = !isFinite(a) && !isFinite(b) ? 0.5 : !isFinite(a) ? b - 1 : !isFinite(b) ? a + 1 : (a + b) / 2;
    dizi.push({ a, b, ok: sagla(t) });
    if (i < B.length) dizi.push({ a: B[i], b: B[i], nokta: true, ok: sagla(B[i]) });
  }
  const out = []; let cur = null;
  for (const s of dizi) { if (s.ok) { if (!cur) cur = { a: s.a, aDahil: !!s.nokta }; cur.b = s.b; cur.bDahil = !!s.nokta; } else if (cur) { out.push(cur); cur = null; } }
  if (cur) out.push(cur);
  return out;
}
// [0, 2π) aralığında sin/cos/tan(k·x) = v kökleri
function trigKokler(fn, k, v) {
  const t = [];
  if (fn === 'sin') { if (Math.abs(v) <= 1) { const a = Math.asin(v); t.push(a, Math.PI - a); } }
  else if (fn === 'cos') { if (Math.abs(v) <= 1) { const a = Math.acos(v); t.push(a, -a); } }
  else { t.push(Math.atan(v)); }
  const per = fn === 'tan' ? Math.PI : 2 * Math.PI, out = [];
  for (const a of t) for (let j = -2 * k - 2; j <= 2 * k + 2; j++) { const x = (a + j * per) / k; if (x > -1e-9 && x < 2 * Math.PI - 1e-9) out.push(Math.abs(x) < 1e-9 ? 0 : x); }
  return [...new Set(out.map((x) => +x.toFixed(10)))].sort((p, q) => p - q);
}

function uret(tohum = 2027, adet = 100) {
  const r = rastgele(tohum);
  const tam = (a, b) => a + Math.floor(r() * (b - a + 1));
  const sifirsiz = (a, b) => { let v = 0; while (!v) v = tam(a, b); return v; };
  const sec = (dizi) => dizi[Math.floor(r() * dizi.length)];
  const farkli = (a, b, n, haric = []) => { const o = []; while (o.length < n) { const v = tam(a, b); if (!o.includes(v) && !haric.includes(v)) o.push(v); } return o; };
  const kat = (a, govde, ilk = false) => { if (a === 0) return ''; const isaret = a < 0 ? '-' : ilk ? '' : '+'; const m = Math.abs(a); return isaret + (m === 1 && govde ? '' : m) + govde; };
  const polL = (k) => { let s = ''; for (let i = k.length - 1; i >= 0; i--) { if (!k[i]) continue; s += kat(k[i], i === 0 ? '' : i === 1 ? 'x' : 'x^{' + i + '}', s === ''); } return s || '0'; };
  const polM = (k) => k.map((a, i) => `(${a})*x^${i}`).join('+') || '0';
  const carp = (p, q) => { const o = new Array(p.length + q.length - 1).fill(0); p.forEach((a, i) => q.forEach((b, j) => { o[i + j] += a * b; })); return o; };
  const kokten = (kokler, k = 1) => kokler.reduce((p, rr) => carp(p, [-rr, 1]), [k]);
  const icL = (a, b) => (b === 0 ? kat(a, 'x', true) : kat(a, 'x', true) + (b > 0 ? '+' : '-') + Math.abs(b)); // ax+b
  const sayiL = (v) => String(v);
  const seviyeler = (n) => { const k = Math.ceil(n / 3), o = Math.ceil((n - k) / 2); return [...Array(k).fill('kolay'), ...Array(o).fill('orta'), ...Array(n - k - o).fill('zor')]; };
  const sorular = [];
  const ekle = (kategori, seviye, latex, bek) => sorular.push({ kategori, seviye, latex, bek });
  const esitBek = (kosullar, kritik) => ({ tur: 'esitsizlik', parcalar: referansKume(kosullar, kritik) });

  // ---------------------------------------------------------------- eşitsizlik
  for (const sev of seviyeler(adet)) {
    const op = sec(['<', '≤', '>', '≥']);
    if (sev === 'kolay') {
      const a = sifirsiz(-6, 6), b = tam(-9, 9), c = tam(-9, 9), d = sifirsiz(-4, 4);
      if (r() < 0.5) ekle('eşitsizlik', sev, icL(a, b) + ISARET_L[op] + c, esitBek([{ ifade: `${a}*x+${b}-(${c})`, op }], [(c - b) / a]));
      else { const e = a !== d ? a : a + 1 === 0 ? a + 2 : a + 1; ekle('eşitsizlik', sev, icL(e, b) + ISARET_L[op] + icL(d, c), esitBek([{ ifade: `${e}*x+${b}-(${d}*x+${c})`, op }], [(c - b) / (e - d)])); }
    } else if (sev === 'orta') {
      const t = tam(0, 2);
      if (t === 0) { const [r1, r2] = farkli(-6, 6, 2), k = sec([1, 1, -1, 2]), p = kokten([r1, r2], k); ekle('eşitsizlik', sev, polL(p) + ISARET_L[op] + '0', esitBek([{ ifade: polM(p), op }], [r1, r2])); }
      else if (t === 1) { const a = sifirsiz(1, 4), b = tam(-6, 6), c = tam(1, 9); ekle('eşitsizlik', sev, '\\left|' + icL(a, b) + '\\right|' + ISARET_L[op] + c, esitBek([{ ifade: `abs(${a}*x+${b})-${c}`, op }], [(c - b) / a, (-c - b) / a])); }
      else { const a = sifirsiz(1, 3), b = tam(-5, 5), lo = tam(-9, 0), hi = lo + tam(2, 12), o1 = sec(['<', '≤']), o2 = sec(['<', '≤']); ekle('eşitsizlik', sev, lo + ISARET_L[o1] + icL(a, b) + ISARET_L[o2] + hi, esitBek([{ ifade: `${lo}-(${a}*x+${b})`, op: o1 }, { ifade: `${a}*x+${b}-(${hi})`, op: o2 }], [(lo - b) / a, (hi - b) / a])); }
    } else {
      const t = tam(0, 3);
      if (t === 0) { const [a, b] = farkli(-6, 6, 2); ekle('eşitsizlik', sev, '\\frac{' + icL(1, -a) + '}{' + icL(1, -b) + '}' + ISARET_L[op] + '0', esitBek([{ ifade: `(x-(${a}))/(x-(${b}))`, op }], [a, b])); }
      else if (t === 1) { const [a, b, c] = farkli(-5, 5, 3), p = kokten([a, b]); ekle('eşitsizlik', sev, '\\frac{' + polL(p) + '}{' + icL(1, -c) + '}' + ISARET_L[op] + '0', esitBek([{ ifade: `(${polM(p)})/(x-(${c}))`, op }], [a, b, c])); }
      else if (t === 2) { const [a, b, c] = farkli(-5, 5, 3), p = kokten([a, b, c]); ekle('eşitsizlik', sev, polL(p) + ISARET_L[op] + '0', esitBek([{ ifade: polM(p), op }], [a, b, c])); }
      else { const [a, b] = farkli(-5, 5, 2), p = kokten([a, a, b]); ekle('eşitsizlik', sev, '\\left(' + icL(1, -a) + '\\right)^{2}\\left(' + icL(1, -b) + '\\right)' + ISARET_L[op] + '0', esitBek([{ ifade: polM(p), op }], [a, b])); }
    }
  }

  // ---------------------------------------------------------------- mutlak değer (denklem ve eşitsizlik)
  for (const sev of seviyeler(adet)) {
    if (sev === 'kolay') {
      const a = sifirsiz(1, 5) * sec([1, -1]), b = tam(-9, 9), c = tam(1, 12);
      ekle('mutlak değer', sev, '\\left|' + icL(a, b) + '\\right|=' + c, { tur: 'denklem', kokler: [(c - b) / a, (-c - b) / a].sort((p, q) => p - q) });
    } else if (sev === 'orta') {
      if (r() < 0.5) { const a = tam(-6, 6), b = tam(-5, 5), c = b + tam(1, 8); ekle('mutlak değer', sev, '\\left|' + icL(1, -a) + '\\right|' + (b < 0 ? '-' + -b : b > 0 ? '+' + b : '') + '=' + c, { tur: 'denklem', kokler: [a - (c - b), a + (c - b)] }); }
      else { const a = tam(-6, 6), c = tam(1, 7), op = sec(['<', '≤', '>', '≥']); ekle('mutlak değer', sev, '\\left|' + icL(1, -a) + '\\right|' + ISARET_L[op] + c, esitBek([{ ifade: `abs(x-(${a}))-${c}`, op }], [a - c, a + c])); }
    } else {
      if (r() < 0.5) {
        let a, b, c, d; do { a = sifirsiz(1, 4); b = tam(-6, 6); c = sifirsiz(1, 4); d = tam(-6, 6); } while (a === c || (b === d));
        const kok = [...new Set([(d - b) / (a - c), (-d - b) / (a + c)].map((v) => +v.toFixed(12)))].sort((p, q) => p - q);
        ekle('mutlak değer', sev, '\\left|' + icL(a, b) + '\\right|=\\left|' + icL(c, d) + '\\right|', { tur: 'denklem', kokler: kok });
      } else {
        const [a, b] = farkli(-5, 5, 2).sort((p, q) => p - q), c = (b - a) + 2 * tam(1, 3);
        ekle('mutlak değer', sev, '\\left|' + icL(1, -a) + '\\right|+\\left|' + icL(1, -b) + '\\right|=' + c, { tur: 'denklem', kokler: [(a + b - c) / 2, (a + b + c) / 2] });
      }
    }
  }

  // ---------------------------------------------------------------- üstel ve logaritma
  for (const sev of seviyeler(adet)) {
    if (sev === 'kolay') {
      const t = tam(0, 3), a = sec([2, 3, 5, 10]), n = tam(-3, 5);
      if (t === 0) ekle('üstel-log', sev, '\\log_{' + a + '}' + Math.pow(a, Math.abs(n) || 1), { tur: 'islem', deger: Math.abs(n) || 1 });
      else if (t === 1) ekle('üstel-log', sev, '\\ln e^{' + n + '}', { tur: 'islem', deger: n });
      else if (t === 2) ekle('üstel-log', sev, a + '^{' + n + '}', { tur: 'islem', deger: Math.pow(a, n) });
      else { const m = tam(1, 4); ekle('üstel-log', sev, '\\log ' + Math.pow(10, m), { tur: 'islem', deger: m }); }
    } else if (sev === 'orta') {
      const a = sec([2, 3, 5]), b = tam(-4, 4), n = tam(1, a === 2 ? 6 : 3);
      if (r() < 0.5) ekle('üstel-log', sev, a + '^{' + icL(1, b) + '}=' + Math.pow(a, n), { tur: 'denklem', kokler: [n - b] });
      else ekle('üstel-log', sev, '\\log_{' + a + '}\\left(' + icL(1, b) + '\\right)=' + n, { tur: 'denklem', kokler: [Math.pow(a, n) - b] });
    } else {
      if (r() < 0.5) { const [m, n] = farkli(0, 4, 2).sort((p, q) => p - q), p = 2 ** m, q = 2 ** n; ekle('üstel-log', sev, '4^{x}-' + (p + q) + '\\cdot2^{x}+' + p * q + '=0', { tur: 'denklem', kokler: [m, n] }); }
      else { const [rk, b, n] = sec([[1, 1, 1], [2, 2, 3], [4, 4, 5], [1, 3, 2], [2, 6, 4], [1, 7, 3], [4, 12, 6], [8, 8, 7], [1, 15, 4], [2, 14, 5]]); ekle('üstel-log', sev, '\\log_{2}x+\\log_{2}\\left(x+' + b + '\\right)=' + n, { tur: 'denklem', kokler: [rk] }); }
    }
  }

  // ---------------------------------------------------------------- trigonometri
  const ACILAR = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
  const DEGERLER = { sin: [-1, -0.5, 0, 0.5, 1, Math.SQRT1_2, -Math.SQRT1_2, Math.sqrt(3) / 2, -Math.sqrt(3) / 2], tan: [0, 1, -1, Math.sqrt(3), -Math.sqrt(3), 1 / Math.sqrt(3)] };
  const degL = (v) => ({ '-1': '-1', '-0.5': '-\\frac{1}{2}', 0: '0', 0.5: '\\frac{1}{2}', 1: '1' }[v] ?? (Math.abs(Math.abs(v) - Math.SQRT1_2) < 1e-12 ? (v < 0 ? '-' : '') + '\\frac{\\sqrt{2}}{2}' : Math.abs(Math.abs(v) - Math.sqrt(3) / 2) < 1e-12 ? (v < 0 ? '-' : '') + '\\frac{\\sqrt{3}}{2}' : Math.abs(Math.abs(v) - Math.sqrt(3)) < 1e-12 ? (v < 0 ? '-' : '') + '\\sqrt{3}' : '\\frac{\\sqrt{3}}{3}'));
  for (const sev of seviyeler(adet)) {
    if (sev === 'kolay') {
      const fn = sec(['sin', 'cos', 'tan']); let a = sec(ACILAR);
      if (fn === 'tan') while (a % 180 === 90) a = sec(ACILAR);
      const deg = Math[fn](a * Math.PI / 180);
      ekle('trigonometri', sev, '\\' + fn + ' ' + a + '^{\\circ}', { tur: 'islem', deger: deg });
    } else if (sev === 'orta') {
      const fn = sec(['sin', 'cos', 'tan']), v = sec(fn === 'tan' ? DEGERLER.tan : DEGERLER.sin);
      ekle('trigonometri', sev, '\\' + fn + ' x=' + degL(v), { tur: 'denklem', trig: true, ikiPi: trigKokler(fn, 1, v) });
    } else {
      const t = tam(0, 2);
      if (t === 0) { const fn = sec(['sin', 'cos']), k = sec([2, 3]), v = sec([0, 0.5, -0.5, 1]); ekle('trigonometri', sev, '\\' + fn + ' ' + k + 'x=' + degL(v), { tur: 'denklem', trig: true, ikiPi: trigKokler(fn, k, v) }); }
      else if (t === 1) {
        const fn = sec(['sin', 'cos']), [u, w] = farkli(0, 4, 2).map((i) => [-1, -0.5, 0, 0.5, 1][i]), a = 2;
        // 2(t − u)(t − w) = 2t² − 2(u + w)t + 2uw
        const b = -2 * (u + w), c = 2 * u * w;
        const L = a + '\\' + fn + '^{2}x' + (b ? (b > 0 ? '+' : '-') + (Math.abs(b) === 1 ? '' : Math.abs(b)) + '\\' + fn + ' x' : '') + (c ? (c > 0 ? '+' : '-') + Math.abs(c) : '') + '=0';
        ekle('trigonometri', sev, L, { tur: 'denklem', trig: true, ikiPi: [...new Set([...trigKokler(fn, 1, u), ...trigKokler(fn, 1, w)])].sort((p, q) => p - q) });
      } else ekle('trigonometri', sev, '\\sin x=\\cos x', { tur: 'denklem', trig: true, ikiPi: [Math.PI / 4, 5 * Math.PI / 4].map((x) => +x.toFixed(10)) });
    }
  }

  // ---------------------------------------------------------------- Σ ve ∏
  const toplamDeg = (f, a, b) => { let s = 0; for (let k = a; k <= b; k++) s += f(k); return s; };
  for (const sev of seviyeler(adet)) {
    if (sev === 'kolay') {
      const a = sifirsiz(-4, 5), b = tam(-6, 6), n = tam(4, 20);
      ekle('toplam', sev, '\\sum_{k=1}^{' + n + '}\\left(' + kat(a, 'k', true) + (b ? (b > 0 ? '+' : '-') + Math.abs(b) : '') + '\\right)', { tur: 'islem', deger: toplamDeg((k) => a * k + b, 1, n) });
    } else if (sev === 'orta') {
      const t = tam(0, 3), a = tam(1, 4), b = a + tam(3, 9);
      if (t === 0) ekle('toplam', sev, '\\sum_{k=' + a + '}^{' + b + '}k^{2}', { tur: 'islem', deger: toplamDeg((k) => k * k, a, b) });
      else if (t === 1) { const c = sifirsiz(-3, 3); ekle('toplam', sev, '\\sum_{k=1}^{' + b + '}\\left(k^{2}' + (c > 0 ? '+' : '-') + (Math.abs(c) === 1 ? '' : Math.abs(c)) + 'k\\right)', { tur: 'islem', deger: toplamDeg((k) => k * k + c * k, 1, b) }); }
      else if (t === 2) { const n = tam(3, 7); ekle('toplam', sev, '\\prod_{k=1}^{' + n + '}k', { tur: 'islem', deger: faktoriyel(n) }); }
      else { const n = tam(3, 10); ekle('toplam', sev, '\\sum_{k=0}^{' + n + '}2^{k}', { tur: 'islem', deger: 2 ** (n + 1) - 1 }); }
    } else {
      const t = tam(0, 2), a = sifirsiz(-3, 4), b = tam(-5, 5);
      if (t === 0) ekle('toplam', sev, '\\sum_{k=1}^{n}\\left(' + kat(a, 'k', true) + (b ? (b > 0 ? '+' : '-') + Math.abs(b) : '') + '\\right)', { tur: 'toplamN', f: (k) => a * k + b });
      else if (t === 1) ekle('toplam', sev, '\\sum_{k=1}^{n}k^{2}', { tur: 'toplamN', f: (k) => k * k });
      else { const c = sifirsiz(1, 3); ekle('toplam', sev, '\\sum_{k=1}^{n}k\\left(k+' + c + '\\right)', { tur: 'toplamN', f: (k) => k * (k + c) }); }
    }
  }

  // ---------------------------------------------------------------- kombinasyon, permütasyon, faktöriyel, EBOB-EKOK
  for (const sev of seviyeler(adet)) {
    if (sev === 'kolay') {
      const t = tam(0, 2), n = tam(4, 10), k = tam(1, n - 1);
      if (t === 0) ekle('kombinasyon', sev, '\\binom{' + n + '}{' + k + '}', { tur: 'islem', deger: kombinasyon(n, k) });
      else if (t === 1) ekle('kombinasyon', sev, 'P\\left(' + n + ',' + k + '\\right)', { tur: 'islem', deger: permutasyon(n, k) });
      else { const m = tam(3, 8); ekle('kombinasyon', sev, m + '!', { tur: 'islem', deger: faktoriyel(m) }); }
    } else if (sev === 'orta') {
      const t = tam(0, 2), n = tam(5, 10), k = tam(1, n - 2);
      if (t === 0) ekle('kombinasyon', sev, '\\binom{' + n + '}{' + k + '}+\\binom{' + n + '}{' + (k + 1) + '}', { tur: 'islem', deger: kombinasyon(n, k) + kombinasyon(n, k + 1) });
      else if (t === 1) ekle('kombinasyon', sev, '\\frac{' + n + '!}{' + (n - 2) + '!}', { tur: 'islem', deger: n * (n - 1) });
      else { const m = tam(4, 7), j = tam(1, m - 1); ekle('kombinasyon', sev, '\\binom{' + n + '}{' + k + '}\\cdot\\binom{' + m + '}{' + j + '}', { tur: 'islem', deger: kombinasyon(n, k) * kombinasyon(m, j) }); }
    } else {
      const t = tam(0, 2);
      if (t === 0) { const a = tam(2, 9) * tam(2, 6), b = tam(2, 9) * tam(2, 6); ekle('kombinasyon', sev, '\\operatorname{EBOB}\\left(' + a + ',' + b + '\\right)', { tur: 'islem', deger: ebob(a, b) }); }
      else if (t === 1) { const a = tam(2, 15), b = tam(2, 15); ekle('kombinasyon', sev, '\\operatorname{EKOK}\\left(' + a + ',' + b + '\\right)', { tur: 'islem', deger: ekok(a, b) }); }
      else { const n = tam(4, 9), k = tam(2, 4); ekle('kombinasyon', sev, '\\frac{P\\left(' + n + ',' + k + '\\right)}{' + k + '!}', { tur: 'islem', deger: kombinasyon(n, k) }); }
    }
  }

  // ---------------------------------------------------------------- denklem sistemi
  const satir2 = (a, b, c, d1 = 'x', d2 = 'y') => kat(a, d1, true) + kat(b, d2) + '=' + c;
  for (const sev of seviyeler(adet)) {
    if (sev === 'kolay' || sev === 'orta' && r() < 0.5) {
      const x0 = tam(-6, 6), y0 = tam(-6, 6);
      let a, b, c, d; do { a = sifirsiz(-4, 4); b = sifirsiz(-4, 4); c = sifirsiz(-4, 4); d = sifirsiz(-4, 4); } while (a * d - b * c === 0);
      ekle('sistem', sev, '\\begin{cases}' + satir2(a, b, a * x0 + b * y0) + '\\\\' + satir2(c, d, c * x0 + d * y0) + '\\end{cases}', { tur: 'sistem', cozumler: [[x0, y0]] });
    } else if (sev === 'orta') {
      const v = [tam(-4, 4), tam(-4, 4), tam(-4, 4)];
      let A; do { A = [0, 1, 2].map(() => [0, 1, 2].map(() => tam(-3, 3))); } while (Math.abs(math.det(A)) < 0.5);
      const satir = (k) => { let s = ''; ['x', 'y', 'z'].forEach((d, i) => { s += kat(A[k][i], d, s === ''); }); return (s || '0') + '=' + (A[k][0] * v[0] + A[k][1] * v[1] + A[k][2] * v[2]); };
      ekle('sistem', sev, '\\begin{cases}' + [0, 1, 2].map(satir).join('\\\\') + '\\end{cases}', { tur: 'sistem', cozumler: [v] });
    } else {
      if (r() < 0.5) { const [p, q] = farkli(-6, 6, 2); ekle('sistem', sev, '\\begin{cases}x+y=' + (p + q) + '\\\\xy=' + p * q + '\\end{cases}', { tur: 'sistem', cozumler: [[p, q], [q, p]].sort((m, n) => m[0] - n[0]) }); }
      else {
        const [x0, y0, R] = sec([[4, 3, 5], [3, 4, 5], [8, 6, 10], [6, 8, 10], [12, 5, 13], [5, 12, 13], [-3, 4, 5], [4, -3, 5]]), d = x0 - y0;
        // y = x − d yerine konunca 2x² − 2dx + d² − R² = 0: köklerin toplamı d, öbür çözüm (d − x0, −x0)
        const cozumler = [[x0, y0], [d - x0, -x0]];
        ekle('sistem', sev, '\\begin{cases}x^{2}+y^{2}=' + R * R + '\\\\x-y=' + d + '\\end{cases}', { tur: 'sistem', cozumler: cozumler.sort((m, n) => m[0] - n[0]) });
      }
    }
  }

  // ---------------------------------------------------------------- üslü ve köklü sayılar
  for (const sev of seviyeler(adet)) {
    if (sev === 'kolay') {
      const t = tam(0, 2), a = tam(2, 6), b = sec([2, 3, 5, 6, 7]);
      if (t === 0) ekle('üslü-köklü', sev, '\\sqrt{' + a * a * b + '}', { tur: 'islem', deger: a * Math.sqrt(b) });
      else if (t === 1) { const m = tam(1, 5), n = tam(-3, 5); ekle('üslü-köklü', sev, b + '^{' + m + '}\\cdot' + b + '^{' + n + '}', { tur: 'islem', deger: Math.pow(b, m + n) }); }
      else { const m = tam(3, 7), n = tam(1, 3); ekle('üslü-köklü', sev, '\\frac{' + a + '^{' + m + '}}{' + a + '^{' + n + '}}', { tur: 'islem', deger: Math.pow(a, m - n) }); }
    } else if (sev === 'orta') {
      const t = tam(0, 2), rr = sec([2, 3, 5]), m = tam(1, 5), n = tam(1, 5);
      if (t === 0) ekle('üslü-köklü', sev, '\\sqrt{' + m * m * rr + '}+\\sqrt{' + n * n * rr + '}', { tur: 'islem', deger: (m + n) * Math.sqrt(rr) });
      else if (t === 1) { const c = tam(2, 4); ekle('üslü-köklü', sev, '\\sqrt[3]{' + c * c * c * rr + '}', { tur: 'islem', deger: c * Math.cbrt(rr) }); }
      else ekle('üslü-köklü', sev, '\\sqrt{' + m * rr + '}\\cdot\\sqrt{' + n * rr + '}', { tur: 'islem', deger: Math.sqrt(m * rr * n * rr) });
    } else {
      const t = tam(0, 2);
      if (t === 0) { const a = sec([2, 3, 5, 6]), k = tam(1, 6); ekle('üslü-köklü', sev, '\\frac{' + k + '}{\\sqrt{' + a + '}}', { tur: 'islem', deger: k / Math.sqrt(a) }); }
      else if (t === 1) { const [b, p, q] = sec([[8, 2, 3], [27, 2, 3], [16, 3, 4], [32, 2, 5], [4, 3, 2], [9, 3, 2], [64, 5, 6]]); ekle('üslü-köklü', sev, b + '^{\\frac{' + p + '}{' + q + '}}', { tur: 'islem', deger: Math.pow(b, p / q) }); }
      else { const b = sec([4, 9, 16, 25]); ekle('üslü-köklü', sev, '\\left(\\frac{1}{' + b + '}\\right)^{-\\frac{1}{2}}', { tur: 'islem', deger: Math.sqrt(b) }); }
    }
  }

  // ---------------------------------------------------------------- karmaşık sayılar
  const zL = (a, b) => (a ? String(a) : '') + (b ? (b < 0 ? '-' : a ? '+' : '') + (Math.abs(b) === 1 ? '' : Math.abs(b)) + 'i' : a ? '' : '0');
  for (const sev of seviyeler(adet)) {
    const [a, b, c, d] = [sifirsiz(-6, 6), sifirsiz(-6, 6), sifirsiz(-5, 5), sifirsiz(-5, 5)];
    if (sev === 'kolay') {
      if (r() < 0.5) ekle('karmaşık', sev, '\\left(' + zL(a, b) + '\\right)+\\left(' + zL(c, d) + '\\right)', { tur: 'islem', re: a + c, im: b + d });
      else ekle('karmaşık', sev, '\\left(' + zL(a, b) + '\\right)\\left(' + zL(c, d) + '\\right)', { tur: 'islem', re: a * c - b * d, im: a * d + b * c });
    } else if (sev === 'orta') {
      if (r() < 0.5) { const n = tam(2, 30); ekle('karmaşık', sev, 'i^{' + n + '}', [{ tur: 'islem', re: 1, im: 0 }, { tur: 'islem', re: 0, im: 1 }, { tur: 'islem', re: -1, im: 0 }, { tur: 'islem', re: 0, im: -1 }][n % 4]); }
      else { // (a+bi)(c+di)/(c+di) = a+bi : bölüm tam çıkar
        const pr = a * c - b * d, pi = a * d + b * c;
        ekle('karmaşık', sev, '\\frac{' + zL(pr, pi) + '}{' + zL(c, d) + '}', { tur: 'islem', re: a, im: b });
      }
    } else {
      if (r() < 0.5) { const [p, q] = sec([[3, 4], [6, 8], [5, 12], [8, 6], [4, 3], [12, 5]]); ekle('karmaşık', sev, '\\left|' + zL(p * sec([1, -1]), q * sec([1, -1])) + '\\right|', { tur: 'islem', deger: Math.hypot(p, q) }); }
      else ekle('karmaşık', sev, '\\left(' + zL(a, b) + '\\right)^{2}', { tur: 'islem', re: a * a - b * b, im: 2 * a * b });
    }
  }
  return sorular.map((s, i) => ({ no: i + 1, ...s }));
}

// motorun sonucunu beklenenle karşılaştır: { tamam, aciklama }
function denetle(M, soru, sonuc) {
  const b = soru.bek, yakin = (a, c, t = 1e-6) => Math.abs(a - c) <= t * Math.max(1, Math.abs(c));
  if (!sonuc) return { tamam: false, aciklama: 'sonuç yok' };
  if (sonuc.tur !== b.tur) return { tamam: false, aciklama: 'tür ' + sonuc.tur + ' (beklenen ' + b.tur + ')' };
  if (b.tur === 'esitsizlik') {
    const p = sonuc.esitsizlik.parcalar, q = b.parcalar;
    const ayni = p.length === q.length && p.every((x, i) => (x.a === q[i].a || yakin(x.a, q[i].a)) && (x.b === q[i].b || yakin(x.b, q[i].b)) && x.aDahil === q[i].aDahil && x.bDahil === q[i].bDahil);
    const yaz = (l) => l.map((x) => (x.a === x.b ? '{' + x.a + '}' : (x.aDahil ? '[' : '(') + x.a + ', ' + x.b + (x.bDahil ? ']' : ')'))).join(' ∪ ') || '∅';
    return { tamam: ayni, aciklama: 'küme ' + yaz(p) + ' (beklenen ' + yaz(q) + ')' };
  }
  if (b.tur === 'denklem') {
    if (b.trig) {
      const k = (sonuc.denklem.ikiPi || []).map((v) => +v.toFixed(10));
      const ok = sonuc.denklem.yol === 'trig' && k.length === b.ikiPi.length && b.ikiPi.every((v, i) => yakin(k[i], v, 1e-8));
      return { tamam: ok, aciklama: '[0, 2π) kökleri ' + JSON.stringify(k) + ' (beklenen ' + JSON.stringify(b.ikiPi) + ')' + (sonuc.denklem.yol !== 'trig' ? ' yol ' + sonuc.denklem.yol : '') };
    }
    const k = sonuc.denklem.kokler;
    if (k.length !== b.kokler.length || !b.kokler.every((v, i) => yakin(k[i], v, 1e-6))) return { tamam: false, aciklama: 'kökler ' + JSON.stringify(k) + ' (beklenen ' + JSON.stringify(b.kokler) + ')' };
    return { tamam: true };
  }
  if (b.tur === 'islem') {
    const s = sonuc.islem;
    if (b.re !== undefined) {
      const re = s.karmasik ? s.karmasik.re : s.deger, im = s.karmasik ? s.karmasik.im : 0;
      return { tamam: yakin(re, b.re, 1e-9) && yakin(im, b.im, 1e-9), aciklama: 'sonuç ' + s.metin + ' (beklenen ' + b.re + (b.im < 0 ? '' : '+') + b.im + 'i)' };
    }
    return { tamam: !s.karmasik && yakin(s.deger, b.deger, 1e-9), aciklama: 'sonuç ' + s.metin + ' (beklenen ' + b.deger + ')' };
  }
  if (b.tur === 'sistem') {
    const c = sonuc.sistem.cozumler || [];
    const ok = c.length === b.cozumler.length && b.cozumler.every((v, i) => v.every((t, j) => yakin(c[i][j], t, 1e-7)));
    return { tamam: ok, aciklama: 'çözümler ' + JSON.stringify(c) + ' (beklenen ' + JSON.stringify(b.cozumler) + ')' };
  }
  if (b.tur === 'toplamN') {
    const T = sonuc.toplamN;
    if (!T) return { tamam: false, aciklama: 'kapalı biçim yok' };
    for (const n of [1, 3, 7, 12, 20]) {
      let s = 0; for (let k = 1; k <= n; k++) s += b.f(k);
      const v = T.katsayilar.reduce((t, a, i) => t + a * Math.pow(n, i), 0);
      if (!yakin(v, s, 1e-9)) return { tamam: false, aciklama: `n=${n}: ${v} ≠ ${s}` };
    }
    return { tamam: true };
  }
  return { tamam: false, aciklama: 'bilinmeyen tür' };
}

module.exports = { uret, denetle, KATEGORILER };
