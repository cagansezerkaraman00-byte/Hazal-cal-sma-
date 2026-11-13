/* Luna hesap makinesi — motor.
   Tuşlarla yazılan ya da fotoğraftan okunan matematik (LaTeX) burada hesaplanır; yapay zekâ yalnızca okur, çözüm buradadır.
   - latexCevir: LaTeX → math.js ifadesi (\frac, \sqrt, üsler, sin x gibi parantezsiz fonksiyonlar, |x|, d/dx, f'(x)…)
   - coz: ne yazıldığını anlar (işlem, fonksiyon, türev, denklem) ve sonucu üretir
   - turev: türevi adım adım (hangi kural nerede uygulandı) bulur
   - analiz: köklerin, tepe noktalarının ve y eksenini kestiği yerin sayısal olarak bulunması
   math.js (Apache-2.0) kullanır: tarayıcıda genel `math`, Node'da require('mathjs'). */
(function (kok) {
  const math = kok.math || (typeof require === 'function' ? require('mathjs') : null);
  if (!math) throw new Error('math.js bulunamadı');
  const kesirli = math.create(math.all, { number: 'Fraction' });

  // ---------------------------------------------------------------- LaTeX → math.js
  const FONK = {
    sin: 'sin', cos: 'cos', tan: 'tan', cot: 'cot', sec: 'sec', csc: 'csc', cosec: 'csc', tg: 'tan', ctg: 'cot', cotg: 'cot',
    arcsin: 'asin', arccos: 'acos', arctan: 'atan', arccot: 'acot', sinh: 'sinh', cosh: 'cosh', tanh: 'tanh',
    ln: 'log', log: 'log', lg: 'log10', exp: 'exp', abs: 'abs', sgn: 'sign', sign: 'sign',
  };
  const ATLA = new Set(['left', 'right', 'big', 'Big', 'bigg', 'Bigg', 'bigl', 'bigr', 'Bigl', 'Bigr', 'displaystyle', 'textstyle',
    'scriptstyle', ',', ';', ':', '!', ' ', 'quad', 'qquad', 'limits', 'nolimits', 'mathstrut', 'phantom']);

  function parcala(s) {
    const t = [];
    // LaTeX'te \frac13 = \frac{1}{3} (MathLive tek haneli kesirleri böyle kısaltır): tek karakterli argümanları süslü paranteze al
    const tekArg = '(?:\\d|[A-Za-z])';
    s = String(s)
      .replace(new RegExp('\\\\([dt]?frac)\\s*(' + tekArg + ')\\s*(' + tekArg + ')', 'g'), '\\$1{$2}{$3}')
      .replace(new RegExp('\\\\([dt]?frac)\\s*(' + tekArg + ')\\s*\\{', 'g'), '\\$1{$2}{')
      .replace(new RegExp('\\\\([dt]?frac)\\s*(\\{[^{}]*\\})\\s*(' + tekArg + ')', 'g'), '\\$1$2{$3}')
      .replace(new RegExp('\\\\sqrt\\s*(\\d)(?![\\d.])', 'g'), '\\sqrt{$1}')
      // okuyucu d/dx'i süslü paranteze sarabiliyor: { \frac { d } { d x } } ( … )
      .replace(/\{\s*(\\[dt]?frac\s*\{\s*d\s*\}\s*\{\s*d\s*[a-z]\s*\})\s*\}/g, '$1')
      // kalın / eğik yazı biçimleri yalnızca görünüş: içerik olduğu gibi kalır
      .replace(/\\(?:boldsymbol|mathbf|bm|mathit|mathnormal|pmb)\s*(?=\{)/g, '');
    s = s.replace(/[−–]/g, '-').replace(/·|×/g, '\\cdot ').replace(/÷/g, '\\div ').replace(/π/g, '\\pi ').replace(/√/g, '\\sqrt ')
      .replace(/\{,\}/g, '.').replace(/²/g, '^2').replace(/³/g, '^3')
      .replace(/\^\s*\{\s*\\circ\s*\}|\^\s*\\circ|\\degree|°/g, '\\derece ');
    for (let i = 0; i < s.length;) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === '\\') {
        const m = s.slice(i + 1).match(/^([A-Za-z]+|.)/);
        const ad = m ? m[1] : '';
        i += 1 + ad.length;
        if (ATLA.has(ad)) continue;
        t.push({ k: 'cmd', v: ad });
        continue;
      }
      if (/[0-9.]/.test(c)) {
        // LaTeX'te boşluk yok sayılır: fotoğraftan okunan "1 6" = 16
        let j = i, sayi = '';
        for (;;) {
          while (j < s.length && /[0-9.]/.test(s[j])) sayi += s[j++];
          let k = j; while (k < s.length && /\s/.test(s[k])) k++;
          if (k > j && /[0-9]/.test(s[k] || '') && /[0-9]$/.test(sayi)) { j = k; continue; }
          break;
        }
        // "3,5" ondalık (Türkçe): virgülden sonra rakam ve öncesi sayı ise
        if (s[j] === ',' && /[0-9]/.test(s[j + 1] || '') && !/[0-9]/.test(s[j + 4] || '')) { j++; while (j < s.length && /[0-9]/.test(s[j])) j++; }
        if (s[j - 1] === ',' || /,/.test(s.slice(i, j))) sayi = s.slice(i, j).replace(/\s+/g, '').replace(',', '.');
        t.push({ k: 'sayi', v: sayi });
        i = j; continue;
      }
      if (/[A-Za-z]/.test(c)) { t.push({ k: 'harf', v: c }); i++; continue; }
      t.push({ k: 'is', v: c }); i++;
    }
    // \mathrm{s i n}, \operatorname{sin}, \text{...}: harfleri tek ad yap
    const o = [];
    for (let i = 0; i < t.length; i++) {
      const x = t[i];
      if (x.k === 'cmd' && /^(mathrm|operatorname|text|textrm|mathit|mathbf|rm|mathsf)$/.test(x.v) && t[i + 1] && t[i + 1].v === '{') {
        let j = i + 2, ad = '';
        while (j < t.length && t[j].v !== '}') { ad += t[j].v; j++; }
        i = j;
        if (/^[A-Za-z]+$/.test(ad) && (FONK[ad] || ad === 'e' || ad === 'd')) o.push(ad === 'e' ? { k: 'harf', v: 'e' } : ad === 'd' ? { k: 'harf', v: 'd' } : { k: 'cmd', v: ad });
        else if (/^[A-Za-z]$/.test(ad)) o.push({ k: 'harf', v: ad });
        else if (/^[0-9.]+$/.test(ad)) o.push({ k: 'sayi', v: ad });
        continue;
      }
      if (x.k === 'cmd' && (x.v === 'exponentialE')) { o.push({ k: 'harf', v: 'e' }); continue; }
      o.push(x);
    }
    // "s i n" gibi harf harf okunan fonksiyon adlarını birleştir (fotoğraftan okumada sık)
    const b = [];
    for (let i = 0; i < o.length; i++) {
      let eslesti = false;
      for (const ad of ['arcsin', 'arccos', 'arctan', 'arccot', 'cosec', 'sinh', 'cosh', 'tanh', 'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'log', 'ln', 'exp']) {
        const dilim = o.slice(i, i + ad.length);
        if (dilim.length === ad.length && dilim.every((x, j) => x.k === 'harf' && x.v === ad[j])) { b.push({ k: 'cmd', v: ad }); i += ad.length - 1; eslesti = true; break; }
      }
      if (!eslesti) b.push(o[i]);
    }
    return b;
  }

  // Özyinelemeli iniş: tokenlardan parantezi açık math.js metni
  function cevirTokenlar(t) {
    let i = 0;
    const bak = (k = 0) => t[i + k];
    const v = (x) => x && x.v;
    const al = () => t[i++];
    const bekle = (c) => { if (v(bak()) === c) { i++; return true; } return false; };
    const bitti = () => i >= t.length;

    function grup() { // {...} ya da tek token
      if (v(bak()) === '{') { i++; const e = toplam(); bekle('}'); return e; }
      return atom(true);
    }
    function toplam() {
      let s = '';
      if (v(bak()) === '+' ) i++;
      else if (v(bak()) === '-') { i++; s = '-'; }
      s += carpim();
      while (!bitti() && (v(bak()) === '+' || v(bak()) === '-' || (bak().k === 'cmd' && bak().v === 'pm'))) {
        const op = al().v === '-' ? '-' : '+';
        s += ' ' + op + ' ' + carpim();
      }
      return s;
    }
    const carpanBaslar = (x) => x && ((x.k === 'sayi') || (x.k === 'harf') || (x.k === 'cmd' && !['cdot', 'times', 'div', 'pm', 'mp', 'neq', 'leq', 'geq', 'lt', 'gt', 'le', 'ge', 'to', 'rightarrow', 'derece', '%'].includes(x.v)) || ['(', '[', '{', '|'].includes(x.v));
    function carpim() {
      let s = kuvvet();
      for (;;) {
        const x = bak();
        if (!x) break;
        if (x.v === '*' || (x.k === 'cmd' && (x.v === 'cdot' || x.v === 'times'))) { i++; s = s + ' * ' + kuvvet(); continue; }
        if (x.v === '/' || x.v === ':' || (x.k === 'cmd' && x.v === 'div')) { i++; s = s + ' / ' + kuvvet(); continue; }
        if (x.v === '|' && mutlakKapanisMi()) break;
        if (carpanBaslar(x)) { s = s + ' * ' + kuvvet(); continue; } // örtük çarpım: 2x, x y, 3(x+1)
        break;
      }
      return s;
    }
    let mutlakDerinlik = 0;
    const mutlakKapanisMi = () => mutlakDerinlik > 0;
    function kuvvet() {
      let b = sonek(atom(false));
      if (v(bak()) === '^') { i++; const us = v(bak()) === '{' ? grup() : isaretliTek(); b = '(' + b + ')^(' + us + ')'; }
      return sonek(b);
    }
    function isaretliTek() { if (v(bak()) === '-') { i++; return '-' + atom(true); } return atom(true); }
    function sonek(s) {
      while (!bitti()) {
        if (v(bak()) === '!') { i++; s = 'factorial(' + s + ')'; continue; }
        if (v(bak()) === "'" || (bak().k === 'cmd' && bak().v === 'prime')) { i++; s = 'TUREV(' + s + ')'; continue; }
        if (bak().k === 'cmd' && bak().v === '%') { i++; s = '(' + s + ' / 100)'; continue; }
        if (bak().k === 'cmd' && bak().v === 'derece') { i++; s = '(' + s + ' * DEGISARET)'; continue; } // 30° (derece modunda 1, radyanda π/180)
        break;
      }
      return s;
    }
    function fonksiyonArg() { // sin x, sin 2x, sin(x+1), sin^2 x
      if (v(bak()) === '(' || v(bak()) === '[') { const ac = al().v; const e = toplam(); bekle(ac === '(' ? ')' : ']'); return e; }
      if (v(bak()) === '{') return grup();
      // parantezsiz: sayı/harf dizisi (bir sonraki fonksiyona ya da işlemciye kadar)
      let s = kuvvetBasit();
      while (bak() && (bak().k === 'sayi' || bak().k === 'harf' || (bak().k === 'cmd' && bak().v === 'pi'))) s += ' * ' + kuvvetBasit();
      return s;
    }
    function kuvvetBasit() {
      let b = atom(false);
      if (v(bak()) === '^') { i++; b = '(' + b + ')^(' + (v(bak()) === '{' ? grup() : atom(true)) + ')'; }
      if (bak() && bak().k === 'cmd' && bak().v === 'derece') { i++; b = '(' + b + ' * DEGISARET)'; } // sin 30°: derece açıya ait
      return b;
    }
    function atom(tek) {
      const x = al();
      if (!x) throw new Error('eksik ifade');
      if (x.k === 'sayi') return x.v;
      if (x.k === 'harf') {
        if (x.v === 'd' && v(bak()) === '/' ) return 'd'; // d/dx bloğu üstte ele alınır
        return x.v;
      }
      if (x.v === '(' || x.v === '[') { const e = toplam(); bekle(x.v === '(' ? ')' : ']'); return '(' + e + ')'; }
      if (x.v === '{') { const e = toplam(); bekle('}'); return '(' + e + ')'; }
      if (x.v === '|') { mutlakDerinlik++; const e = toplam(); mutlakDerinlik--; bekle('|'); return 'abs(' + e + ')'; }
      if (x.v === '-' && tek) return '-' + atom(true);
      if (x.k === 'cmd') {
        const c = x.v;
        if (c === 'frac' || c === 'dfrac' || c === 'tfrac') {
          // d/dx türev işareti
          const kaydet = i;
          const pay = grup(), payda = grup();
          if (/^d$/.test(pay.replace(/[()\s]/g, '')) && /^d\s*\*?\s*[a-z]$/.test(payda.replace(/[()\s]/g, '').replace('*', ''))) {
            const degisken = payda.replace(/[()\s*d]/g, '') || 'x';
            const ic = bitti() ? '' : (v(bak()) === '(' || v(bak()) === '[' ? (() => { const ac = al().v; const e = toplam(); bekle(ac === '(' ? ')' : ']'); return e; })() : toplam());
            return 'TUREV(' + ic + (degisken !== 'x' ? ', ' + degisken : '') + ')';
          }
          if (/^d\s*\*?\s*y$/.test(pay.replace(/[()\s]/g, '')) && /^d\s*\*?\s*x$/.test(payda.replace(/[()\s]/g, ''))) return 'TUREV(y)';
          void kaydet;
          return '((' + pay + ') / (' + payda + '))';
        }
        if (c === 'sqrt') {
          if (v(bak()) === '[') { i++; const n = toplam(); bekle(']'); return 'nthRoot(' + grup() + ', ' + n + ')'; }
          return 'sqrt(' + grup() + ')';
        }
        if (c === 'pi') return 'pi';
        if (c === 'infty') return 'Infinity';
        if (c === 'cdot' || c === 'times') return atom(tek);
        if (c === 'lvert' || c === 'vert') { mutlakDerinlik++; const e = toplam(); mutlakDerinlik--; if (bak() && bak().k === 'cmd' && /vert/.test(bak().v)) i++; else bekle('|'); return 'abs(' + e + ')'; }
        if (FONK[c]) {
          let tab = null, us = null;
          if (c === 'log' && v(bak()) === '_') { i++; tab = grup(); }
          if (v(bak()) === '^') { i++; us = grup(); if (us === '(-1)' || us === '-1') { us = null; const ters = { sin: 'asin', cos: 'acos', tan: 'atan', cot: 'acot' }[c]; if (ters) return ters + '(' + fonksiyonArg() + ')'; } }
          if (c === 'log' && v(bak()) === '_') { i++; tab = grup(); }
          const arg = fonksiyonArg();
          let s;
          if (c === 'log') s = tab ? 'log(' + arg + ', ' + tab + ')' : 'log10(' + arg + ')'; // Türkiye: log = 10 tabanı, ln = e tabanı
          else s = FONK[c] + '(' + arg + ')';
          return us ? '(' + s + ')^(' + us + ')' : s;
        }
        if (c === 'mathrm' || c === 'operatorname') return atom(tek);
        if (c === '%') return '0.01';
        throw new Error('tanınmayan işaret: \\' + c);
      }
      throw new Error('beklenmeyen: ' + x.v);
    }
    const sonuc = toplam();
    if (!bitti()) throw new Error('fazladan: ' + t.slice(i).map((x) => x.v).join(''));
    return sonuc;
  }

  function latexCevir(latex) {
    const t = parcala(latex);
    if (!t.length) throw new Error('boş');
    return cevirTokenlar(t);
  }

  // ---------------------------------------------------------------- ne yazıldı?
  // Dönüş: { tur: 'islem'|'fonksiyon'|'turev'|'denklem', ifade (math.js), ad?, sol?, sag? }
  function anla(latex) {
    let s = String(latex || '').trim().replace(/\\(?:,|;|!|quad)/g, ' ');
    s = s.replace(/\\(?:neq|leq|geq|le|ge|lt|gt)\b.*$/, ''); // eşitsizlikler: şimdilik sol tarafı
    const parca = s.split(/=(?![^{]*})/); // süslü parantez içindeki = değil
    if (parca.length >= 2) {
      const solL = parca[0].trim(), sagL = parca.slice(1).join('=').trim();
      const solSik = solL.replace(/\\left|\\right|\s+|[{}]/g, ''); // "f ( x )", "{ f } ( x )", "f\left(x\right)" → "f(x)"
      // f(x) = …, y = …, g(x) = …
      const fm = solSik.match(/^([a-zA-Z])\(([a-z])\)$/);
      if ((fm || /^y$/.test(solSik)) && sagL) {
        const ifade = latexCevir(sagL);
        if (/TUREV\(/.test(ifade)) return { tur: 'turev', ifade: ifade.replace(/^TUREV\((.*)\)$/, '$1'), ad: fm ? fm[1] : 'y' };
        return { tur: 'fonksiyon', ifade, ad: fm ? fm[1] : 'y', degisken: fm ? fm[2] : 'x' };
      }
      // f'(x) = ? ya da y' = ? (türevi istenen)
      if (/^[a-zA-Z]('|\^\\prime)\(/.test(solSik) || /^y('|\^\\prime)$/.test(solSik) || /\\prime/.test(solL)) {
        if (sagL && !/^\?*$/.test(sagL)) return { tur: 'turev', ifade: latexCevir(sagL) };
      }
      if (!sagL || /^\?+$/.test(sagL)) return anla(solL); // "3+4 = ?" → işlem
      const sol = latexCevir(solL), sag = latexCevir(sagL);
      const ifade = '(' + sol + ') - (' + sag + ')';
      if (degiskenler(ifade).length) return { tur: 'denklem', ifade, sol, sag, degisken: degiskenler(ifade)[0] };
      return { tur: 'islem', ifade: sol };
    }
    const ifade = latexCevir(s);
    const tm = ifade.match(/^TUREV\((.*)\)$/);
    if (tm) return { tur: 'turev', ifade: tm[1] };
    if (/TUREV\(/.test(ifade)) return { tur: 'turev', ifade: ifade.replace(/TUREV\(([^()]*(?:\([^()]*\)[^()]*)*)\)/, '$1') };
    if (degiskenler(ifade).includes('x')) return { tur: 'fonksiyon', ifade, ad: 'f', degisken: 'x' };
    return { tur: 'islem', ifade };
  }
  function degiskenler(ifade) {
    const set = new Set();
    try {
      math.parse(ifade).traverse((n, yol, ust) => {
        if (n.isSymbolNode && !(ust && ust.isFunctionNode && ust.fn === n) && !['pi', 'e', 'Infinity', 'i', 'DEGISARET'].includes(n.name)) set.add(n.name);
      });
    } catch (e) { /* çözülemeyen ifade */ }
    return [...set].sort((a, b) => (a === 'x' ? -1 : b === 'x' ? 1 : a.localeCompare(b)));
  }

  // ---------------------------------------------------------------- işlem
  const DERECE = Math.PI / 180;
  function trigKapsam(derece) {
    if (!derece) return { DEGISARET: DERECE };
    const d = (f) => (x) => f(x * DERECE);
    const r = (f) => (x) => f(x) / DERECE;
    return {
      DEGISARET: 1,
      sin: d(Math.sin), cos: d(Math.cos), tan: d((a) => (Math.abs(Math.cos(a)) < 1e-15 ? Infinity : Math.tan(a))), cot: d((a) => 1 / Math.tan(a)),
      sec: d((a) => 1 / Math.cos(a)), csc: d((a) => 1 / Math.sin(a)),
      asin: r(Math.asin), acos: r(Math.acos), atan: r(Math.atan), acot: r((x) => Math.atan(1 / x)),
    };
  }
  const yuvarla = (x) => (Math.abs(x) < 1e-12 ? 0 : +x.toPrecision(12));
  function kesirBul(x, maxPayda = 1000) { // sürekli kesir: 0.333333 → 1/3
    if (!isFinite(x)) return null;
    let h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = x;
    for (let n = 0; n < 30; n++) {
      const a = Math.floor(b);
      [h1, h0] = [a * h1 + h0, h1]; [k1, k0] = [a * k1 + k0, k1];
      if (k1 > maxPayda) return null;
      if (Math.abs(x - h1 / k1) < 1e-10 * Math.max(1, Math.abs(x))) return { p: h1, q: k1 };
      b = 1 / (b - a);
      if (!isFinite(b)) break;
    }
    return Math.abs(x - h1 / k1) < 1e-10 * Math.max(1, Math.abs(x)) && k1 <= maxPayda ? { p: h1, q: k1 } : null;
  }
  // 2√3, √2/2, 3π/4 gibi "tam" biçim (YKS'de cevaplar böyle)
  function tamBicim(x) {
    if (!isFinite(x) || Number.isInteger(yuvarla(x))) return null;
    const k = kesirBul(x, 100);
    if (k && k.q > 1) return { tex: (k.p < 0 ? '-' : '') + '\\frac{' + Math.abs(k.p) + '}{' + k.q + '}', metin: k.p + '/' + k.q };
    for (const r of [2, 3, 5, 6, 7, 10, 11, 13, 14, 15]) {
      const k2 = kesirBul(x / Math.sqrt(r), 60);
      if (k2 && Math.abs(k2.p) < 200) {
        const ust = (Math.abs(k2.p) === 1 ? '' : Math.abs(k2.p)) + '\\sqrt{' + r + '}', isaret = k2.p < 0 ? '-' : '';
        return { tex: isaret + (k2.q === 1 ? ust : '\\frac{' + ust + '}{' + k2.q + '}'), metin: isaret + (Math.abs(k2.p) === 1 ? '' : Math.abs(k2.p)) + '√' + r + (k2.q === 1 ? '' : '/' + k2.q) };
      }
    }
    const k3 = kesirBul(x / Math.PI, 24);
    if (k3 && Math.abs(k3.p) < 100) {
      const ust = (Math.abs(k3.p) === 1 ? '' : Math.abs(k3.p)) + '\\pi', isaret = k3.p < 0 ? '-' : '';
      return { tex: isaret + (k3.q === 1 ? ust : '\\frac{' + ust + '}{' + k3.q + '}'), metin: isaret + (Math.abs(k3.p) === 1 ? '' : Math.abs(k3.p)) + 'π' + (k3.q === 1 ? '' : '/' + k3.q) };
    }
    return null;
  }
  const sayiMetin = (x) => {
    if (!isFinite(x)) return x > 0 ? '∞' : x < 0 ? '−∞' : 'tanımsız';
    const y = yuvarla(x);
    if (Math.abs(y) >= 1e12 || (Math.abs(y) < 1e-6 && y !== 0)) return y.toExponential(6).replace(/\.?0+e/, 'e').replace('e+', ' × 10^').replace('e', ' × 10^');
    return String(+y.toPrecision(10)).replace('.', ',');
  };
  function islem(ifade, ayar = {}) {
    const node = math.parse(ifade);
    let deger;
    try { deger = node.evaluate(trigKapsam(ayar.derece)); } catch (e) { throw new Error('hesaplanamadı: ' + e.message); }
    if (math.isComplex && math.isComplex(deger)) {
      if (Math.abs(deger.im) < 1e-12) deger = deger.re; else return { deger: NaN, metin: 'gerçek sayı değil', tex: '\\text{gerçek sayı değil}' };
    }
    if (typeof deger !== 'number') deger = +deger;
    let kesir = null;
    // yalnızca + − × ÷ ve tam sayı üsleri varsa tam kesir (1/3 + 1/6 = 1/2)
    if (/^[\d\s.+\-*/()^]+$/.test(ifade)) {
      try {
        const f = kesirli.evaluate(ifade);
        if (f && f.d !== undefined && Number(f.d) !== 1) kesir = { tex: (Number(f.s) < 0 ? '-' : '') + '\\frac{' + f.n + '}{' + f.d + '}', metin: (Number(f.s) < 0 ? '-' : '') + f.n + '/' + f.d };
      } catch (e) { /* kesirle hesaplanamadı */ }
    }
    const tam = kesir || tamBicim(deger);
    return { deger, metin: sayiMetin(deger), tam, tex: node.toTex({ parenthesis: 'auto', implicit: 'hide' }) };
  }

  // ---------------------------------------------------------------- türev (adım adım)
  const P = (s) => math.parse(s);
  const N = (n) => new math.ConstantNode(n);
  const sade = (n) => { try { return math.simplify(n); } catch (e) { return n; } };
  function guzel(n, o) {
    if (n.isOperatorNode && n.fn === 'multiply' && n.args.length === 2) {
      const [a, b] = n.args, ta = a.toTex(o), tb = b.toTex(o);
      const sayiBasliyor = /^[\d.{]*\d/.test(tb.replace(/^\{+/, '')) || b.isConstantNode || (b.isOperatorNode && b.fn === 'unaryMinus');
      const solSayi = a.isConstantNode || (a.isOperatorNode && a.fn === 'unaryMinus' && a.args[0].isConstantNode);
      const sagHarf = b.isSymbolNode || b.isFunctionNode || (b.isOperatorNode && b.fn === 'pow' && (b.args[0].isSymbolNode || b.args[0].isFunctionNode)) || b.isParenthesisNode;
      if (!sayiBasliyor && (solSayi || a.isSymbolNode || (a.isOperatorNode && (a.fn === 'pow' || a.fn === 'multiply'))) && sagHarf) {
        const sol = a.isOperatorNode && a.fn === 'add' ? '\\left(' + ta + '\\right)' : ta;
        return sol + (/[a-zA-Z}]$/.test(sol) && /^[a-zA-Z]/.test(tb) ? '\\,' : '') + tb;
      }
    }
    return undefined;
  }
  const tex = (n) => n.toTex({ parenthesis: 'auto', implicit: 'hide', handler: guzel });
  const sabitMi = (n, x) => !n.filter((c) => c.isSymbolNode && c.name === x).length;
  const op = (o, f, a) => new math.OperatorNode(o, f, a);
  const fn = (ad, a) => new math.FunctionNode(new math.SymbolNode(ad), a);
  const paren = (n) => (n.isOperatorNode || n.isFunctionNode && false ? new math.ParenthesisNode(n) : n);
  function turev(ifade, x = 'x') {
    const adimlar = [];
    const kayit = (kural, n, sonuc) => adimlar.push({ kural, tex: '\\frac{d}{d' + x + '}\\left[' + tex(n) + '\\right] = ' + tex(sonuc) });
    function d(n) {
      if (n.isParenthesisNode) return d(n.content);
      if (sabitMi(n, x)) return N(0);
      if (n.isSymbolNode) return N(1);
      if (n.isOperatorNode) {
        const [a, b] = n.args;
        switch (n.fn) {
          case 'unaryMinus': return op('-', 'unaryMinus', [paren(d(a))]);
          case 'unaryPlus': return d(a);
          case 'add': case 'subtract': {
            const r = op(n.op, n.fn, [d(a), d(b)]);
            const s = sade(r); kayit('Toplam kuralı: terimlerin türevi ayrı ayrı alınır', n, s); return s;
          }
          case 'multiply': {
            if (sabitMi(a, x)) { const s = sade(op('*', 'multiply', [a, paren(d(b))])); kayit('Sabitle çarpım: sabit dışarıda kalır', n, s); return s; }
            if (sabitMi(b, x)) { const s = sade(op('*', 'multiply', [paren(d(a)), b])); kayit('Sabitle çarpım: sabit dışarıda kalır', n, s); return s; }
            const r = op('+', 'add', [op('*', 'multiply', [paren(d(a)), paren(b)]), op('*', 'multiply', [paren(a), paren(d(b))])]);
            const s = sade(r); kayit("Çarpım kuralı: (u·v)' = u'·v + u·v'", n, s); return s;
          }
          case 'divide': {
            if (sabitMi(b, x)) { const s = sade(op('/', 'divide', [paren(d(a)), paren(b)])); kayit('Sabite bölüm: payda sabit kalır', n, s); return s; }
            const r = op('/', 'divide', [op('-', 'subtract', [op('*', 'multiply', [paren(d(a)), paren(b)]), op('*', 'multiply', [paren(a), paren(d(b))])]), op('^', 'pow', [paren(b), N(2)])]);
            const s = sade(r); kayit("Bölüm kuralı: (u/v)' = (u'·v − u·v') / v²", n, s); return s;
          }
          case 'pow': {
            if (sabitMi(b, x)) { // u^n
              const r = op('*', 'multiply', [op('*', 'multiply', [b, op('^', 'pow', [paren(a), sade(op('-', 'subtract', [b, N(1)]))])]), paren(d(a))]);
              const s = sade(r);
              kayit(a.isSymbolNode ? "Kuvvet kuralı: (xⁿ)' = n·xⁿ⁻¹" : "Kuvvet ve zincir kuralı: (uⁿ)' = n·uⁿ⁻¹·u'", n, s); return s;
            }
            if (sabitMi(a, x)) { // a^u
              const lnA = a.isSymbolNode && a.name === 'e' ? null : fn('log', [a]);
              const r = op('*', 'multiply', lnA ? [op('*', 'multiply', [n, lnA]), paren(d(b))] : [n, paren(d(b))]);
              const s = sade(r); kayit(lnA ? "Üstel fonksiyon: (aᵘ)' = aᵘ·ln a·u'" : "Üstel fonksiyon: (eᵘ)' = eᵘ·u'", n, s); return s;
            }
            const r = op('*', 'multiply', [n, paren(op('+', 'add', [op('*', 'multiply', [paren(d(b)), fn('log', [a])]), op('/', 'divide', [op('*', 'multiply', [paren(b), paren(d(a))]), paren(a)])]))]);
            const s = sade(r); kayit("Üs da tabanda da x var: (uᵛ)' = uᵛ·(v'·ln u + v·u'/u)", n, s); return s;
          }
        }
      }
      if (n.isFunctionNode) {
        const ad = n.fn.name, u = n.args[0], du = d(u), zincir = !(u.isSymbolNode && u.name === x);
        const z = (dis) => (zincir ? op('*', 'multiply', [dis, paren(du)]) : dis);
        const kurallar = {
          sin: () => [fn('cos', [u]), "(sin u)' = cos u · u'"],
          cos: () => [op('-', 'unaryMinus', [fn('sin', [u])]), "(cos u)' = −sin u · u'"],
          tan: () => [op('+', 'add', [N(1), op('^', 'pow', [fn('tan', [u]), N(2)])]), "(tan u)' = (1 + tan²u) · u'"],
          cot: () => [op('-', 'unaryMinus', [op('+', 'add', [N(1), op('^', 'pow', [fn('cot', [u]), N(2)])])]), "(cot u)' = −(1 + cot²u) · u'"],
          sec: () => [op('*', 'multiply', [fn('sec', [u]), fn('tan', [u])]), "(sec u)' = sec u · tan u · u'"],
          csc: () => [op('-', 'unaryMinus', [op('*', 'multiply', [fn('csc', [u]), fn('cot', [u])])]), "(csc u)' = −csc u · cot u · u'"],
          exp: () => [fn('exp', [u]), "(eᵘ)' = eᵘ · u'"],
          sqrt: () => [op('/', 'divide', [N(1), op('*', 'multiply', [N(2), fn('sqrt', [u])])]), "(√u)' = u' / (2√u)"],
          asin: () => [op('/', 'divide', [N(1), fn('sqrt', [op('-', 'subtract', [N(1), op('^', 'pow', [paren(u), N(2)])])])]), "(arcsin u)' = u' / √(1 − u²)"],
          acos: () => [op('-', 'unaryMinus', [op('/', 'divide', [N(1), fn('sqrt', [op('-', 'subtract', [N(1), op('^', 'pow', [paren(u), N(2)])])])])]), "(arccos u)' = −u' / √(1 − u²)"],
          atan: () => [op('/', 'divide', [N(1), op('+', 'add', [N(1), op('^', 'pow', [paren(u), N(2)])])]), "(arctan u)' = u' / (1 + u²)"],
          abs: () => [op('/', 'divide', [u, fn('abs', [u])]), "(|u|)' = (u / |u|) · u'"],
        };
        if (ad === 'log') {
          const taban = n.args[1];
          const dis = taban ? op('/', 'divide', [N(1), op('*', 'multiply', [paren(u), fn('log', [taban])])]) : op('/', 'divide', [N(1), paren(u)]);
          const s = sade(z(dis)); kayit(taban ? "(logₐ u)' = u' / (u · ln a)" : "(ln u)' = u' / u", n, s); return s;
        }
        if (ad === 'log10') { const s = sade(z(op('/', 'divide', [N(1), op('*', 'multiply', [paren(u), fn('log', [N(10)])])]))); kayit("(log u)' = u' / (u · ln 10)", n, s); return s; }
        if (ad === 'nthRoot') { const k = n.args[1] || N(2); return d(op('^', 'pow', [paren(u), op('/', 'divide', [N(1), k])])); }
        if (kurallar[ad]) { const [dis, kural] = kurallar[ad](); const s = sade(z(dis)); kayit(zincir ? kural.replace(/ · u'$/, " · u'  (zincir kuralı)") : kural.replace(/ · u'$/, ''), n, s); return s; }
        throw new Error(ad + ' fonksiyonunun türevi bilinmiyor');
      }
      throw new Error('türevi alınamadı');
    }
    const n = math.parse(ifade);
    const sonuc = sade(d(n));
    return { ifade: sonuc.toString(), tex: tex(sonuc), adimlar: adimlar.slice(-12), girdiTex: tex(n) };
  }

  // ---------------------------------------------------------------- fonksiyon analizi
  function derle(ifade, x = 'x') {
    const c = math.compile(ifade);
    return (v) => { try { const r = c.evaluate({ [x]: v, DEGISARET: DERECE }); const n = typeof r === 'number' ? r : (r && r.re !== undefined && Math.abs(r.im) < 1e-12 ? r.re : NaN); return n; } catch (e) { return NaN; } };
  }
  function ikiyeBol(f, a, b, fa) {
    for (let k = 0; k < 80; k++) { const m = (a + b) / 2, fm = f(m); if (!isFinite(fm)) return null; if ((fm < 0) === (fa < 0)) { a = m; fa = fm; } else b = m; if (b - a < 1e-12) break; }
    return (a + b) / 2;
  }
  const temizle = (liste, tol) => liste.sort((p, q) => p - q).filter((v, k, d) => !k || Math.abs(v - d[k - 1]) > tol);
  function kokler(f, a, b, n = 2000) {
    const out = []; let x0 = a, y0 = f(a);
    for (let k = 1; k <= n; k++) {
      const x1 = a + (b - a) * k / n, y1 = f(x1);
      if (isFinite(y0) && isFinite(y1)) {
        if (y0 === 0) out.push(x0);
        else if ((y0 < 0) !== (y1 < 0)) {
          const r = ikiyeBol(f, x0, x1, y0);
          if (r !== null && Math.abs(f(r)) < 1e-6 * Math.max(1, Math.abs(y0), Math.abs(y1))) out.push(r); // atlama (1/x) değil
        }
      }
      x0 = x1; y0 = y1;
    }
    return temizle(out.map((r) => (Math.abs(r) < 1e-10 ? 0 : r)), (b - a) / n);
  }
  function analiz(ifade, a = -10, b = 10) {
    const f = derle(ifade);
    let df = null, tt = null;
    try { tt = turev(ifade); df = derle(tt.ifade); } catch (e) { /* türevi olmayan */ }
    const k = kokler(f, a, b);
    const tepeler = [];
    if (df) {
      const kd = kokler(df, a, b);
      for (const x of kd) {
        const y = f(x), sol = f(x - 1e-4), sag = f(x + 1e-4);
        if (!isFinite(y)) continue;
        if (sol > y && sag > y) tepeler.push({ x, y, tur: 'yerel en küçük' });
        else if (sol < y && sag < y) tepeler.push({ x, y, tur: 'yerel en büyük' });
        else tepeler.push({ x, y, tur: 'dönüm' });
      }
    }
    const y0 = f(0);
    return { kokler: k, tepeler: tepeler.filter((t) => t.tur !== 'dönüm'), yKesen: isFinite(y0) ? y0 : null, turev: tt };
  }
  // denklem: f(x) = 0 köklerinin hepsi; 2. dereceye kadar kesin yol (Δ)
  function denklem(ifade, x = 'x') {
    let polinom = null;
    try {
      const r = math.rationalize(ifade, {}, true);
      if (r.variables && r.variables.length === 1 && r.coefficients && r.coefficients.length <= 3 && r.denominator === null) polinom = r.coefficients.map(Number);
    } catch (e) { /* polinom değil */ }
    if (polinom && polinom.length === 3 && polinom[2] !== 0) {
      const [c, b, a] = polinom, D = b * b - 4 * a * c;
      const kokS = D < 0 ? [] : D === 0 ? [-b / (2 * a)] : [(-b - Math.sqrt(D)) / (2 * a), (-b + Math.sqrt(D)) / (2 * a)].sort((p, q) => p - q);
      return { yol: 'delta', a, b, c, delta: D, kokler: kokS };
    }
    if (polinom && polinom.length === 2 && polinom[1] !== 0) return { yol: 'dogrusal', kokler: [-polinom[0] / polinom[1]] };
    const f = derle(ifade, x);
    return { yol: 'sayisal', kokler: kokler(f, -100, 100, 20000) };
  }

  // ---------------------------------------------------------------- hepsi bir arada
  function coz(latex, ayar = {}) {
    const a = anla(latex);
    const s = { ...a, sayi: sayiMetin, tamBicim };
    if (a.tur === 'islem') s.islem = islem(a.ifade, ayar);
    else if (a.tur === 'turev') { s.turev = turev(a.ifade); s.fonksiyonTex = tex(math.parse(a.ifade)); }
    else if (a.tur === 'fonksiyon') { s.fonksiyonTex = tex(math.parse(a.ifade)); s.analiz = analiz(a.ifade); }
    else if (a.tur === 'denklem') s.denklem = denklem(a.ifade, a.degisken);
    return s;
  }

  const HesapMotor = { latexCevir, anla, islem, turev, analiz, denklem, coz, derle, kokler, sayiMetin, tamBicim, kesirBul, degiskenler, tex: (s) => tex(math.parse(s)) };
  if (typeof module !== 'undefined' && module.exports) module.exports = HesapMotor;
  kok.HesapMotor = HesapMotor;
})(typeof window !== 'undefined' ? window : globalThis);
