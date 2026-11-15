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
  // süslü parantez eşi
  function grupSonu(s, i) { let d = 0; for (let j = i; j < s.length; j++) { if (s[j] === '\\') { j++; continue; } if (s[j] === '{') d++; else if (s[j] === '}' && --d === 0) return j; } return -1; }
  function grupOku(s, i) { // i'deki {…} ya da tek işaret; [içerik, sonraki konum]
    while (s[i] === ' ') i++;
    if (s[i] === '{') { const j = grupSonu(s, i); return [s.slice(i + 1, j), j + 1]; }
    if (s[i] === '\\') { const m = s.slice(i).match(/^\\[A-Za-z]+/); return [m[0], i + m[0].length]; }
    if (s[i] === '-' || s[i] === '+') { const [g, j] = grupOku(s, i + 1); return [s[i] + g, j]; }
    return [s[i], i + 1];
  }
  function limitAyikla(s) {
    const m = s.match(/^\\lim(?:\\limits)?\s*_\s*/);
    if (!m) return null;
    const [alt, i] = grupOku(s, m[0].length);
    const ok = alt.split(/\\to|\\rightarrow|\\longrightarrow|→/);
    if (ok.length !== 2) return null;
    const degisken = ok[0].replace(/[\s{}]/g, '') || 'x';
    let hedef = ok[1].trim(), yon = 0;
    const ym = hedef.match(/\^\s*\{?\s*([+-])\s*\}?\s*$/);
    if (ym) { yon = ym[1] === '+' ? 1 : -1; hedef = hedef.slice(0, ym.index); }
    return { degisken, nokta: sayiDegeri(hedef), yon, govde: s.slice(i).trim() };
  }
  function integralAyikla(s) {
    const m = s.match(/^\\int(?:\\limits)?\s*/);
    if (!m) return null;
    let i = m[0].length, alt = null, ust = null;
    for (let k = 0; k < 2; k++) {
      while (s[i] === ' ') i++;
      if (s[i] === '_') [alt, i] = grupOku(s, i + 1);
      else if (s[i] === '^') [ust, i] = grupOku(s, i + 1);
    }
    let govde = s.slice(i);
    const dm = govde.match(/(?:\\[,;!: ]|\s)*(?:\\mathrm\s*\{\s*d\s*\}|\\operatorname\s*\{\s*d\s*\}|\\differentialD|\\mathrm\s*d|d)\s*\{?\s*([a-z])\s*\}?\s*$/);
    if (!dm) return null;
    govde = govde.slice(0, dm.index).trim().replace(/^\\left\s*\(([\s\S]*)\\right\s*\)$/, '$1');
    return { degisken: dm[1], alt: alt === null ? null : sayiDegeri(alt), ust: ust === null ? null : sayiDegeri(ust), govde };
  }
  function anla(latex) {
    let s = String(latex || '').trim().replace(/\\(?:,|;|!|quad)/g, ' ');
    const lim = limitAyikla(s);
    if (lim) return { tur: 'limit', ifade: latexCevir(lim.govde), degisken: lim.degisken, nokta: lim.nokta, yon: lim.yon };
    const int = integralAyikla(s);
    if (int) return { tur: 'integral', ifade: latexCevir(int.govde), degisken: int.degisken, alt: int.alt, ust: int.ust };
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
      const ac = (k) => (k.isParenthesisNode ? ac(k.content) : k);
      const a = ac(n.args[0]), b = ac(n.args[1]), ta = a.toTex(o), tb = b.toTex(o);
      // eksi sayıyla çarpım hiçbir zaman yan yana yazılmaz (x³·(−640) "x³−640" gibi çıkarma sanılmasın)
      const eksiSayi = (k) => (k.isConstantNode && typeof k.value === 'number' && k.value < 0) || (k.isOperatorNode && k.fn === 'unaryMinus' && ac(k.args[0]).isConstantNode);
      const toplamMi = (k) => k.isOperatorNode && (k.fn === 'add' || k.fn === 'subtract');
      if (eksiSayi(b) && !eksiSayi(a) && !a.isConstantNode && !(a.isOperatorNode && (toplamMi(a) || a.fn === 'divide'))) {
        const mutlak = b.isConstantNode ? String(-b.value) : ac(b.args[0]).toTex(o);
        return '-' + (mutlak === '1' ? '' : mutlak) + ta;
      }
      if (/^-/.test(tb)) return (toplamMi(a) ? '\\left(' + ta + '\\right)' : ta) + '\\cdot\\left(' + tb + '\\right)';
      const eksiBir = (k) => (k.isConstantNode && k.value === -1) || (k.isOperatorNode && k.fn === 'unaryMinus' && k.args[0].isConstantNode && k.args[0].value === 1);
      if (eksiBir(b)) return '-' + (a.isOperatorNode && (a.fn === 'add' || a.fn === 'subtract') ? '\\left(' + ta + '\\right)' : ta);
      if (eksiBir(a)) return '-' + (b.isOperatorNode && (b.fn === 'add' || b.fn === 'subtract') ? '\\left(' + tb + '\\right)' : tb);
      if (b.isConstantNode && !a.isConstantNode && !(a.isOperatorNode && (a.fn === 'add' || a.fn === 'subtract' || a.fn === 'divide'))) return tb + (/^[0-9.]+$/.test(tb) && /^[0-9]/.test(ta) ? '\\cdot ' : '') + ta;
      if (b.isOperatorNode && b.fn === 'unaryMinus' && b.args[0].isConstantNode && !a.isConstantNode && !(a.isOperatorNode && (a.fn === 'add' || a.fn === 'subtract' || a.fn === 'divide'))) return '-' + b.args[0].toTex(o) + ta; // x³·(−640) → −640x³
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
  // x'e göre polinomsa katsayılar [a0, a1, …] (en yüksek derecedeki sıfırlar atılır); değilse null.
  // math.rationalize kullanılmaz: üs büyüdükçe katlanarak yavaşlıyor ((x−4)⁵ 20 saniyeden uzun sürdü).
  function polinomAc(dugum, x = 'x') {
    const topla = (p, q) => { const o = new Array(Math.max(p.length, q.length)).fill(0); p.forEach((v, i) => { o[i] += v; }); q.forEach((v, i) => { o[i] += v; }); return o; };
    const carp = (p, q) => { const o = new Array(p.length + q.length - 1).fill(0); p.forEach((u, i) => q.forEach((v, j) => { o[i + j] += u * v; })); return o; };
    const ac = (n) => {
      if (n.isParenthesisNode) return ac(n.content);
      if (n.isConstantNode) return typeof n.value === 'number' ? [n.value] : null;
      if (n.isSymbolNode) return n.name === x ? [0, 1] : n.name === 'pi' ? [Math.PI] : n.name === 'e' ? [Math.E] : null;
      if (n.isFunctionNode) { if (!n.filter((c) => c.isSymbolNode && c.name === x).length) { const v = sabitDeger(n); return isFinite(v) ? [v] : null; } return null; }
      if (!n.isOperatorNode) return null;
      const a = n.args[0] && ac(n.args[0]);
      if (!a) return null;
      if (n.fn === 'unaryMinus') return a.map((v) => -v);
      if (n.fn === 'unaryPlus') return a;
      const b = ac(n.args[1]);
      if (!b) return null;
      if (n.fn === 'add') return topla(a, b);
      if (n.fn === 'subtract') return topla(a, b.map((v) => -v));
      if (n.fn === 'multiply') return carp(a, b);
      if (n.fn === 'divide') return b.length === 1 && b[0] !== 0 ? a.map((v) => v / b[0]) : null;
      if (n.fn === 'pow') {
        if (b.length !== 1 || !Number.isInteger(b[0]) || b[0] < 0 || b[0] * (a.length - 1) > 40) return null;
        let o = [1];
        for (let k = 0; k < b[0]; k++) o = carp(o, a);
        return o;
      }
      return null;
    };
    try {
      const k = ac(typeof dugum === 'string' ? math.parse(dugum) : dugum);
      if (!k) return null;
      while (k.length > 1 && Math.abs(k[k.length - 1]) < 1e-12) k.pop();
      return k.map((v) => (Math.abs(v) < 1e-12 ? 0 : v));
    } catch (e) { return null; }
  }
  // denklem: f(x) = 0 köklerinin hepsi; 2. dereceye kadar kesin yol (Δ)
  function denklem(ifade, x = 'x') {
    let polinom = polinomAc(ifade, x);
    if (polinom && polinom.length > 3) polinom = null;
    if (polinom && polinom.length === 3 && polinom[2] !== 0) {
      const [c, b, a] = polinom, D = b * b - 4 * a * c;
      const kokS = D < 0 ? [] : D === 0 ? [-b / (2 * a)] : [(-b - Math.sqrt(D)) / (2 * a), (-b + Math.sqrt(D)) / (2 * a)].sort((p, q) => p - q);
      return { yol: 'delta', a, b, c, delta: D, kokler: kokS };
    }
    if (polinom && polinom.length === 2 && polinom[1] !== 0) return { yol: 'dogrusal', kokler: [-polinom[0] / polinom[1]] };
    const f = derle(ifade, x);
    return { yol: 'sayisal', kokler: kokler(f, -100, 100, 20000) };
  }

  // ---------------------------------------------------------------- limit
  const sembol = (ad) => new math.SymbolNode(ad);
  function sayiDegeri(latexParca) { // limitin gittiği nokta, integral sınırları: 2, -1, \frac{\pi}{2}, \infty
    const t = String(latexParca).replace(/\s+/g, '');
    if (/^\+?\\infty$/.test(t) || t === '∞' || t === '+∞') return Infinity;
    if (/^-\\infty$/.test(t) || t === '-∞') return -Infinity;
    return islem(latexCevir(latexParca), { derece: false }).deger;
  }
  // limit: önce yerine koyma; 0/0 ya da ∞/∞ belirsizliğinde L'Hôpital; sonsuzda pay/payda derecesi; kalan durumlarda sayısal
  function limit(ifade, x = 'x', a = 0, yon = 0) {
    const adimlar = [];
    const f = derle(ifade, x);
    const nTex = tex(math.parse(ifade));
    const aTex = !isFinite(a) ? (a > 0 ? '\\infty' : '-\\infty') : (tamBicim(a) ? tamBicim(a).tex : sayiTex(a));
    const sonuc = (deger, ek = {}) => ({ deger, tam: isFinite(deger) ? tamBicimE(deger) : null, adimlar, ...ek });
    // 1) sonsuzda polinom bölümü: derece karşılaştırması
    if (!isFinite(a)) {
      try {
        let kok = math.parse(ifade);
        while (kok.isParenthesisNode) kok = kok.content;
        const bolum = kok.isOperatorNode && kok.fn === 'divide';
        const pay = polinomAc(bolum ? kok.args[0] : kok, x), payda = bolum ? polinomAc(kok.args[1], x) : [1];
        if (pay && payda && (pay.length > 1 || payda.length > 1)) {
          const dp = pay.length - 1, dq = payda.length - 1, ap = pay[dp], aq = payda[dq];
          let deger;
          if (dp < dq) deger = 0;
          else if (dp === dq) deger = ap / aq;
          else deger = Math.sign(ap / aq) * (a > 0 || (dp - dq) % 2 === 0 ? 1 : -1) * Infinity;
          adimlar.push({ kural: 'Sonsuzda limit: pay ve paydanın en büyük dereceli terimlerine bakılır (pay ' + dp + '. derece, payda ' + dq + '. derece)', tex: '\\lim_{' + x + '\\to ' + aTex + '}' + nTex + '=' + (isFinite(deger) ? (tamBicimE(deger) ? tamBicimE(deger).tex : sayiTex(deger)) : (deger > 0 ? '\\infty' : '-\\infty')) });
          return sonuc(deger);
        }
      } catch (e) { /* polinom bölümü değil */ }
    }
    // 2) yerine koyma (sürekli noktada)
    if (isFinite(a) && yon === 0) {
      const v = f(a);
      if (isFinite(v) && Math.abs(f(a + 1e-7) - v) < 1e-4 * Math.max(1, Math.abs(v)) && Math.abs(f(a - 1e-7) - v) < 1e-4 * Math.max(1, Math.abs(v))) {
        adimlar.push({ kural: 'Yerine koyma: fonksiyon bu noktada tanımlı ve sürekli', tex: '\\lim_{' + x + '\\to ' + aTex + '}' + nTex + '=' + (tamBicimE(v) ? tamBicimE(v).tex : sayiTex(v)) });
        return sonuc(v);
      }
    }
    // 3) 0/0 belirsizliği: L'Hôpital (pay ve paydanın türevi)
    let n = math.parse(ifade);
    while (n.isParenthesisNode) n = n.content;
    if (isFinite(a) && n.isOperatorNode && n.fn === 'divide') {
      let pay = n.args[0], payda = n.args[1];
      for (let k = 0; k < 4; k++) {
        const pv = derle(pay.toString(), x)(a), qv = derle(payda.toString(), x)(a);
        if (Math.abs(pv) < 1e-10 && Math.abs(qv) < 1e-10) {
          const p2 = math.parse(turev(pay.toString(), x).ifade), q2 = math.parse(turev(payda.toString(), x).ifade);
          adimlar.push({ kural: (k ? 'Hâlâ ' : '') + "0/0 belirsizliği: L'Hôpital kuralı — pay ve paydanın ayrı ayrı türevi alınır", tex: '\\lim_{' + x + '\\to ' + aTex + '}\\frac{' + tex(pay) + '}{' + tex(payda) + '}=\\lim_{' + x + '\\to ' + aTex + '}\\frac{' + tex(p2) + '}{' + tex(q2) + '}' });
          pay = p2; payda = q2; continue;
        }
        if (k > 0 && isFinite(pv) && isFinite(qv) && Math.abs(qv) > 1e-10) {
          const v = pv / qv;
          adimlar.push({ kural: 'Belirsizlik kalktı: yerine koyma', tex: '=\\frac{' + sayiTex(pv) + '}{' + sayiTex(qv) + '}=' + (tamBicimE(v) ? tamBicimE(v).tex : sayiTex(v)) });
          if (yon === 0 || true) return sonuc(v);
        }
        break;
      }
    }
    // 4) sayısal: noktaya iki yandan yaklaşılır (Richardson ile hızlandırılır); sonsuzda x = 1/t
    const g = isFinite(a) ? f : (t) => f(1 / t);
    const nokta = isFinite(a) ? a : 0;
    const taraf = (s) => {
      const d = (h) => g(nokta + s * h);
      const h0 = isFinite(a) ? 1e-3 : 1e-4;
      const v1 = d(h0), v2 = d(h0 / 2), v3 = d(h0 / 4);
      // sonsuza gidiş: h her 100 kat küçüldüğünde değer de belirgin büyüyor ve işareti aynı kalıyor
      const dizi = [1e-2, 1e-4, 1e-6, 1e-8].map(d);
      if (dizi.every(isFinite) || !isFinite(dizi[3])) {
        const buyuyor = dizi.slice(1).every((v, k) => !isFinite(v) || (Math.abs(v) > Math.abs(dizi[k]) * 5 && Math.sign(v) === Math.sign(dizi[0])));
        if (buyuyor && (Math.abs(dizi[3]) > 1e6 || !isFinite(dizi[3]))) return Math.sign(dizi[2] || dizi[3]) * Infinity;
      }
      const R1 = 2 * v2 - v1, R2 = 2 * v3 - v2, L = (4 * R2 - R1) / 3;
      return Math.abs(L) < 1e-9 ? 0 : L;
    };
    const sag = (yon >= 0 || !isFinite(a)) ? taraf(isFinite(a) ? 1 : (a > 0 ? 1 : -1)) : null;
    const sol = (yon <= 0 && isFinite(a)) ? taraf(-1) : null;
    const yakinMi = (p, q) => p === q || Math.abs(p - q) < 1e-5 * Math.max(1, Math.abs(p), Math.abs(q));
    if (sag !== null && sol !== null && !yakinMi(sag, sol)) {
      adimlar.push({ kural: 'Sağdan ve soldan limitler farklı: limit yoktur', tex: '\\lim_{' + x + '\\to ' + aTex + '^{+}}=' + limTex(sag) + ',\\quad\\lim_{' + x + '\\to ' + aTex + '^{-}}=' + limTex(sol) });
      return sonuc(NaN, { yok: true, sag, sol });
    }
    const v = sag !== null ? sag : sol;
    adimlar.push({ kural: (isFinite(a) ? 'Sağdan ve soldan yaklaşıldı' : 'x büyüdükçe değerlere bakıldı') + ' (sayısal yaklaşım)', tex: '\\lim_{' + x + '\\to ' + aTex + (yon > 0 ? '^{+}' : yon < 0 ? '^{-}' : '') + '}' + nTex + '=' + limTex(v) });
    return sonuc(v);
  }
  const limTex = (v) => (!isFinite(v) ? (v > 0 ? '\\infty' : '-\\infty') : (tamBicimE(v) ? tamBicimE(v).tex : sayiTex(v)));
  function sayiTex(x) { return sayiMetin(x).replace(/−/g, '-').replace(/,/g, '{,}').replace(/ × 10\^(-?\d+)/, '\\times10^{$1}'); }
  // tam biçim, e (Euler sayısı) katlarıyla birlikte
  function tamBicimE(x) {
    if (!isFinite(x)) return null;
    if (Number.isInteger(yuvarla(x))) return { tex: String(yuvarla(x)), metin: String(yuvarla(x)) };
    const t = tamBicim(x);
    if (t) return t;
    for (const [ad, deger] of [['e', Math.E], ['e^{2}', Math.E * Math.E], ['\\ln 2', Math.LN2], ['\\ln 3', Math.log(3)], ['\\sqrt{e}', Math.sqrt(Math.E)]]) {
      const k = kesirBul(x / deger, 24);
      if (k && Math.abs(k.p) < 50) {
        const isaret = k.p < 0 ? '-' : '', ust = (Math.abs(k.p) === 1 ? '' : Math.abs(k.p)) + ad;
        return { tex: isaret + (k.q === 1 ? ust : '\\frac{' + ust + '}{' + k.q + '}'), metin: isaret + ust + (k.q === 1 ? '' : '/' + k.q) };
      }
      const k2 = kesirBul(x * deger, 24); // 1/e gibi
      if (ad === 'e' && k2 && Math.abs(k2.p) < 50) return { tex: (k2.p < 0 ? '-' : '') + '\\frac{' + Math.abs(k2.p) + '}{' + (k2.q === 1 ? '' : k2.q) + 'e}', metin: k2.p + '/' + (k2.q === 1 ? '' : k2.q) + 'e' };
    }
    return null;
  }

  // ---------------------------------------------------------------- integral
  const sayiN = (v) => (v < 0 ? op('-', 'unaryMinus', [N(-v)]) : N(v));
  const polinomKatsayi = (u, x) => polinomAc(u, x); // u x'e göre polinomsa katsayılar [a0, a1, …]
  function polinomDugum(k, x) { // [a0, a1, …] → a_n x^n + … + a0
    let n = null;
    for (let i = k.length - 1; i >= 0; i--) {
      const a = yuvarla(k[i]); if (!a) continue;
      const kuvvet = i === 0 ? null : i === 1 ? sembol(x) : op('^', 'pow', [sembol(x), N(i)]);
      const terim = kuvvet ? (Math.abs(a) === 1 ? kuvvet : op('*', 'multiply', [N(Math.abs(a)), kuvvet])) : N(Math.abs(a));
      n = n === null ? (a < 0 ? op('-', 'unaryMinus', [terim]) : terim) : op(a < 0 ? '-' : '+', a < 0 ? 'subtract' : 'add', [n, terim]);
    }
    return n || N(0);
  }
  function polinomBol(p, q) { // katsayılar küçükten büyüğe; [bölüm, kalan]
    const r = p.slice(), d = q.length - 1, out = new Array(Math.max(1, p.length - d)).fill(0);
    for (let i = p.length - 1; i >= d; i--) { const c = r[i] / q[d]; out[i - d] = c; for (let j = 0; j <= d; j++) r[i - d + j] -= c * q[j]; }
    return [out, r.slice(0, d)];
  }
  const lineerMi = (u, x) => { const k = polinomKatsayi(u, x); return k && k.length === 2 && k[1] !== 0 ? { a: k[1], b: k[0] } : null; };
  const sabitDeger = (n) => { try { return n.evaluate({}); } catch (e) { return NaN; } };
  function integral(ifade, x = 'x') {
    const adimlar = [];
    const kayit = (kural, n, sonuc) => adimlar.push({ kural, tex: '\\int ' + tex(n) + '\\,d' + x + '=' + tex(sade(sonuc)) });
    const X = sembol(x);
    function I(n, derin = 0) {
      if (derin > 12) throw new Error('çok derin');
      if (n.isParenthesisNode) return I(n.content, derin);
      if (sabitMi(n, x)) { const s = op('*', 'multiply', [paren(n), X]); kayit('Sabitin integrali: ∫c dx = c·x', n, s); return s; }
      if (n.isSymbolNode) { const s = op('/', 'divide', [op('^', 'pow', [X, N(2)]), N(2)]); kayit('Kuvvet kuralı: ∫xⁿ dx = xⁿ⁺¹/(n+1)', n, s); return s; }
      // çarpım ya da bölümde önce değişken değiştirme dene: ∫x(x²+1)³ = (x²+1)⁴/8 (açmaktan kısa, YKS'nin beklediği)
      if (n.isOperatorNode && (n.fn === 'multiply' || n.fn === 'divide') && !sabitMi(n.args[0], x) && !sabitMi(n.args[1], x)) {
        const d0 = degisken(n, derin);
        if (d0) return d0;
      }
      // polinom (çarpım ve üsler açılır): terim terim
      const pk = polinomKatsayi(n, x);
      const dogrusalKuvvet = n.isOperatorNode && n.fn === 'pow' && sabitMi(n.args[1], x) && lineerMi(n.args[0].isParenthesisNode ? n.args[0].content : n.args[0], x); // (x−4)⁵: açmadan kuvvet kuralı
      if (pk && pk.length > 1 && !dogrusalKuvvet && !(n.isOperatorNode && (n.fn === 'add' || n.fn === 'subtract'))) {
        const acik = polinomDugum(pk, x);
        if (acik.toString() !== n.toString()) { adimlar.push({ kural: 'Polinom açılır, sonra terim terim integral alınır', tex: tex(n) + '=' + tex(acik) }); return I(acik, derin + 1); }
      }
      if (n.isOperatorNode) {
        const [a, b] = n.args;
        switch (n.fn) {
          case 'unaryMinus': return op('-', 'unaryMinus', [paren(I(a, derin + 1))]);
          case 'unaryPlus': return I(a, derin + 1);
          case 'add': case 'subtract': { const s = op(n.op, n.fn, [I(a, derin + 1), I(b, derin + 1)]); kayit('Toplamın integrali: terimlerin integrali ayrı ayrı alınır', n, s); return s; }
          case 'multiply': {
            if (sabitMi(a, x)) { const s = op('*', 'multiply', [a, paren(I(b, derin + 1))]); kayit('Sabit çarpan integralin dışına çıkar', n, s); return s; }
            if (sabitMi(b, x)) { const s = op('*', 'multiply', [b, paren(I(a, derin + 1))]); kayit('Sabit çarpan integralin dışına çıkar', n, s); return s; }
            const d1 = degisken(n, derin); if (d1) return d1;
            const k1 = kismi(n, a, b, derin) || kismi(n, b, a, derin); if (k1) return k1;
            break;
          }
          case 'divide': {
            if (sabitMi(b, x)) { const s = op('/', 'divide', [paren(I(a, derin + 1)), b]); kayit('Sabit payda integralin dışına çıkar', n, s); return s; }
            const d1 = degisken(n, derin); if (d1) return d1;
            if (sabitMi(a, x)) {
              const c = a, u = b.isParenthesisNode ? b.content : b;
              const L = lineerMi(u, x);
              if (L) { const s = op('*', 'multiply', [c, op('/', 'divide', [fn('log', [fn('abs', [u])]), N(L.a)])]); kayit('∫ 1/(ax+b) dx = ln|ax+b| / a', n, s); return s; }
              if (u.isOperatorNode && u.fn === 'pow' && sabitMi(u.args[1], x)) return I(op('*', 'multiply', [c, op('^', 'pow', [u.args[0], op('-', 'unaryMinus', [u.args[1]])])]), derin + 1);
              if (u.isFunctionNode && u.fn.name === 'sqrt') return I(op('*', 'multiply', [c, op('^', 'pow', [u.args[0], N(-0.5)])]), derin + 1);
              const pk2 = polinomKatsayi(u, x);
              if (pk2 && pk2.length === 3 && pk2[1] === 0 && pk2[0] > 0 && pk2[2] > 0) { // c/(p x² + q) → arctan
                const p = pk2[2], q = pk2[0], s = op('*', 'multiply', [op('/', 'divide', [c, fn('sqrt', [N(p * q)])]), fn('atan', [op('*', 'multiply', [fn('sqrt', [N(p / q)]), X])])]);
                kayit('∫ 1/(1+x²) dx = arctan x', n, s); return s;
              }
              if (u.isFunctionNode && u.fn.name === 'cos' && false) break;
            }
            const pp = polinomKatsayi(a, x), pq = polinomKatsayi(b, x);
            if (pp && pq && pq.length >= 2 && pp.length >= pq.length) { // polinom bölmesi: bölüm + kalan/bölen
              const [bolum, kalan] = polinomBol(pp, pq);
              const kalanVar = kalan.some((c) => Math.abs(c) > 1e-12);
              const tekTerim = pq.slice(0, -1).every((c) => c === 0); // bölen c·xᵏ: her terim ayrı bölünür
              let yeni;
              if (tekTerim) {
                const k = pq.length - 1, c = pq[k];
                const terimler = pp.map((ai, i) => [ai / c, i - k]).filter(([ai]) => Math.abs(ai) > 1e-12);
                yeni = terimler.map(([ai, us]) => op('*', 'multiply', [N(ai), us === 0 ? N(1) : op('^', 'pow', [X, N(us)])])).reduce((t, u) => op('+', 'add', [t, u]));
              } else {
                yeni = polinomDugum(bolum, x);
                if (kalanVar) yeni = op('+', 'add', [yeni, op('/', 'divide', [polinomDugum(kalan, x), paren(polinomDugum(pq, x))])]);
              }
              adimlar.push({ kural: tekTerim ? 'Her terim paydaya ayrı ayrı bölünür' : 'Polinom bölmesi: bölüm + kalan / bölen', tex: tex(n) + '=' + tex(sade(yeni)) });
              return I(sade(yeni), derin + 1);
            }
            break;
          }
          case 'pow': {
            const taban = a.isParenthesisNode ? a.content : a, us = b.isParenthesisNode ? b.content : b;
            if (sabitMi(us, x)) {
              const L = taban.isSymbolNode && taban.name === x ? { a: 1, b: 0 } : lineerMi(taban, x);
              const nv = sabitDeger(us);
              if (L) {
                if (Math.abs(nv + 1) < 1e-12) { const s = op('/', 'divide', [fn('log', [fn('abs', [taban])]), N(L.a)]); kayit(L.a === 1 && L.b === 0 ? '∫ 1/x dx = ln|x|' : '∫ 1/(ax+b) dx = ln|ax+b| / a', n, s); return s; }
                const yeniUs = sade(op('+', 'add', [us, N(1)]));
                const s = op('/', 'divide', [op('^', 'pow', [paren(taban), yeniUs]), op('*', 'multiply', [N(L.a), paren(yeniUs)])]);
                kayit(L.a === 1 && L.b === 0 ? 'Kuvvet kuralı: ∫xⁿ dx = xⁿ⁺¹/(n+1)' : 'Kuvvet kuralı (doğrusal iç fonksiyon): ∫(ax+b)ⁿ dx = (ax+b)ⁿ⁺¹ / (a(n+1))', n, s); return s;
              }
              // sin²x, cos²x: yarım açı
              if (nv === 2 && taban.isFunctionNode && (taban.fn.name === 'sin' || taban.fn.name === 'cos') && lineerMi(taban.args[0], x)) {
                const u = taban.args[0], iki = op('*', 'multiply', [N(2), paren(u)]);
                const yeni = op('/', 'divide', [op(taban.fn.name === 'sin' ? '-' : '+', taban.fn.name === 'sin' ? 'subtract' : 'add', [N(1), fn('cos', [iki])]), N(2)]);
                adimlar.push({ kural: taban.fn.name === 'sin' ? 'Yarım açı: sin²u = (1 − cos 2u)/2' : 'Yarım açı: cos²u = (1 + cos 2u)/2', tex: tex(n) + '=' + tex(yeni) });
                return I(yeni, derin + 1);
              }
            }
            if (sabitMi(taban, x)) {
              const L = lineerMi(us, x);
              if (L) {
                const e = taban.isSymbolNode && taban.name === 'e';
                const s = e ? op('/', 'divide', [n, N(L.a)]) : op('/', 'divide', [n, op('*', 'multiply', [N(L.a), fn('log', [taban])])]);
                kayit(e ? '∫ eᵃˣ⁺ᵇ dx = eᵃˣ⁺ᵇ / a' : '∫ cᵃˣ dx = cᵃˣ / (a·ln c)', n, s); return s;
              }
            }
            const d1 = degisken(n, derin); if (d1) return d1;
            break;
          }
        }
      }
      if (n.isFunctionNode) {
        const ad = n.fn.name, u = n.args[0], L = u && (u.isSymbolNode && u.name === x ? { a: 1, b: 0 } : lineerMi(u, x));
        if (L) {
          const bol = (d) => (L.a === 1 ? d : op('/', 'divide', [d, N(L.a)]));
          const tablo = {
            sin: () => [op('-', 'unaryMinus', [bol(fn('cos', [u]))]), '∫ sin u du = −cos u'],
            cos: () => [bol(fn('sin', [u])), '∫ cos u du = sin u'],
            exp: () => [bol(fn('exp', [u])), '∫ eᵘ du = eᵘ'],
            tan: () => [op('-', 'unaryMinus', [bol(fn('log', [fn('abs', [fn('cos', [u])])]))]), '∫ tan u du = −ln|cos u|'],
            cot: () => [bol(fn('log', [fn('abs', [fn('sin', [u])])])), '∫ cot u du = ln|sin u|'],
            sqrt: () => [op('/', 'divide', [op('*', 'multiply', [N(2), op('^', 'pow', [paren(u), op('/', 'divide', [N(3), N(2)])])]), N(3 * L.a)]), '∫ √u du = (2/3)·u^{3/2}'],
            log: () => n.args[1] ? null : [op('/', 'divide', [op('-', 'subtract', [op('*', 'multiply', [paren(u), fn('log', [u])]), paren(u)]), N(L.a)]), "∫ ln u du = u·ln u − u (kısmi integral)"],
          };
          const t = tablo[ad] && tablo[ad]();
          if (t) { kayit(L.a === 1 && L.b === 0 ? t[1] : t[1] + ' (doğrusal iç fonksiyon: a\'ya bölünür)', n, t[0]); return t[0]; }
        }
        if (ad === 'sqrt') return I(op('^', 'pow', [paren(u), N(0.5)]), derin + 1);
        if (ad === 'nthRoot') return I(op('^', 'pow', [paren(u), op('/', 'divide', [N(1), n.args[1] || N(2)])]), derin + 1);
        const d1 = degisken(n, derin); if (d1) return d1;
      }
      throw new Error('Bu integrali henüz adım adım çözemiyorum');
    }
    // değişken değiştirme: integrand = k · h(g(x)) · g'(x) ise ∫ = k · H(g(x))
    function degisken(n, derin) {
      const adaylar = [];
      n.traverse((c) => {
        if (c === n || sabitMi(c, x) || c.isSymbolNode) return;
        if (c.isFunctionNode && c.args[0] && !lineerMi(c.args[0], x) && !(c.args[0].isSymbolNode)) adaylar.push(c.args[0].isParenthesisNode ? c.args[0].content : c.args[0]);
        if (c.isOperatorNode && c.fn === 'pow' && !sabitMi(c.args[0], x) && sabitMi(c.args[1], x) && !lineerMi(c.args[0], x)) adaylar.push(c.args[0].isParenthesisNode ? c.args[0].content : c.args[0]);
        if (c.isOperatorNode && c.fn === 'pow' && sabitMi(c.args[0], x) && !lineerMi(c.args[1], x)) adaylar.push(c.args[1].isParenthesisNode ? c.args[1].content : c.args[1]);
        if (c.isFunctionNode && c.args[0] && !c.args[0].isSymbolNode && !lineerMi(c.args[0], x)) adaylar.push(c);
      });
      if (n.isOperatorNode && n.fn === 'divide' && !sabitMi(n.args[1], x)) adaylar.push(n.args[1].isParenthesisNode ? n.args[1].content : n.args[1]);
      if (n.isOperatorNode && n.fn === 'divide') { const pd = n.args[1].isParenthesisNode ? n.args[1].content : n.args[1]; if (pd.isOperatorNode && pd.fn === 'pow') adaylar.push(pd.args[0].isParenthesisNode ? pd.args[0].content : pd.args[0]); if (pd.isFunctionNode) adaylar.push(pd.args[0]); }
      n.traverse((c) => { if (c.isFunctionNode && ['sin', 'cos', 'log', 'exp', 'sqrt'].includes(c.fn.name) && c !== n) adaylar.push(c); });
      const fx = derle(n.toString(), x);
      const noktalar = [0.37, 0.83, 1.21, 1.67, 2.3];
      for (const g of adaylar) {
        let dg;
        try { dg = math.parse(turev(g.toString(), x).ifade); } catch (e) { continue; }
        const dgf = derle(dg.toString(), x), gf = derle(g.toString(), x);
        // n = h(g) · g' → h(u) = n / g' ; u yerine koyunca x kalmamalı: h(u) değerleri g'ye göre tutarlı mı
        const U = sembol('u');
        const hIfade = math.simplify(op('/', 'divide', [paren(n), paren(dg)]));
        // h(u): hIfade içinde g'yi u ile değiştir
        const gStr = math.simplify(g).toString();
        const hU = hIfade.transform((c) => (c.isNode && !c.isSymbolNode && math.simplify(c).toString() === gStr ? U : c));
        if (!sabitMi(hU, x)) {
          // g = x'in kuvveti gibi durumlar: x yerine u'dan çözülebilir mi? (yalnızca h(u) sabit ya da u'nun fonksiyonu olmalı)
          // sayısal denetim: n(x) / g'(x) değeri yalnızca g(x)'e bağlı mı (aynı g değerinde aynı mı) — basit tutulur
          continue;
        }
        // doğrulama: h(g(x))·g'(x) = n(x)
        const hf = (v) => { try { return math.evaluate(hU.toString(), { u: v }); } catch (e) { return NaN; } };
        if (!noktalar.every((t) => { const a = fx(t), b = hf(gf(t)) * dgf(t); return isFinite(a) && isFinite(b) && Math.abs(a - b) < 1e-7 * Math.max(1, Math.abs(a)); })) continue;
        let H;
        try { H = integral(hU.toString(), 'u'); } catch (e) { continue; }
        const sonucU = math.parse(H.ifade);
        const s = sonucU.transform((c) => (c.isSymbolNode && c.name === 'u' ? paren(g) : c));
        adimlar.push({ kural: 'Değişken değiştirme: u = ' + g.toString().replace(/\*/g, '·') + ', du = (' + dg.toString().replace(/\*/g, '·') + ') dx', tex: '\\int ' + tex(n) + '\\,d' + x + '=\\int ' + tex(hU) + '\\,du=' + tex(sonucU) });
        return s;
      }
      return null;
    }
    // kısmi integral: ∫u dv = u·v − ∫v du (u: polinom ya da ln; dv: üstel, sin, cos ya da polinom)
    function kismi(n, u, dv, derin) {
      const uPolinom = polinomKatsayi(u, x), uLn = u.isFunctionNode && u.fn.name === 'log' && !u.args[1];
      const dvPolinom = polinomKatsayi(dv, x);
      if (!(uPolinom && uPolinom.length > 1) && !uLn) return null;
      if (uLn && !dvPolinom) return null;
      if (uPolinom && !(dv.isFunctionNode && ['sin', 'cos', 'exp'].includes(dv.fn.name) && lineerMi(dv.args[0], x)) && !(dv.isOperatorNode && dv.fn === 'pow' && sabitMi(dv.args[0], x) && lineerMi(dv.args[1], x))) return null;
      let v;
      try { v = math.parse(integral(dv.toString(), x).ifade); } catch (e) { return null; }
      const du = math.parse(turev(u.toString(), x).ifade);
      const kalan = math.simplify(op('*', 'multiply', [paren(v), paren(du)]));
      let ikinci;
      try { ikinci = I(kalan, derin + 1); } catch (e) { return null; }
      const s = op('-', 'subtract', [op('*', 'multiply', [paren(u), paren(v)]), paren(ikinci)]);
      adimlar.push({ kural: "Kısmi integral: ∫u dv = u·v − ∫v du  (u = " + u.toString().replace(/\*/g, '·') + ', dv = ' + dv.toString().replace(/\*/g, '·') + ' dx)', tex: '\\int ' + tex(n) + '\\,d' + x + '=' + tex(sade(s)) });
      return s;
    }
    const n = math.parse(ifade);
    const F = sade(I(n));
    // doğrulama: F'(x) = f(x) (birkaç noktada)
    const f = derle(ifade, x);
    let dF;
    try { dF = derle(turev(F.toString(), x).ifade, x); } catch (e) { dF = null; }
    const dogru = dF && [0.31, 0.77, 1.43, 2.11, 2.9, -0.6].filter((t) => isFinite(f(t))).every((t) => Math.abs(dF(t) - f(t)) < 1e-6 * Math.max(1, Math.abs(f(t))));
    if (!dogru) throw new Error('Bu integrali adım adım çözemiyorum');
    return { ifade: F.toString(), tex: tex(F) + '+C', adimlar: adimlar.slice(-14), girdiTex: tex(n) };
  }
  // belirli integral: önce F(b) − F(a), olmazsa sayısal (uyarlamalı Simpson)
  // uyarlamalı Simpson: hata payı göreli ve her bölmede ikiye ayrılır; derinlik sınırlı (büyük değerlerde donmasın)
  function simpson(f, a, b, gorece = 1e-11) {
    const c = (a + b) / 2, fa = f(a), fb = f(b), fc = f(c);
    const S = (b - a) / 6 * (fa + 4 * fc + fb);
    let olcek = Math.max(1, Math.abs(S));
    for (let i = 1; i < 16; i++) { const v = f(a + (b - a) * i / 16); if (isFinite(v)) olcek = Math.max(olcek, Math.abs(v) * Math.abs(b - a)); }
    const ic = (a0, b0, fa0, fb0, fm0, S0, eps, d) => {
      const m = (a0 + b0) / 2, l = (a0 + m) / 2, r = (m + b0) / 2, fl = f(l), fr = f(r);
      const Sl = (m - a0) / 6 * (fa0 + 4 * fl + fm0), Sr = (b0 - m) / 6 * (fm0 + 4 * fr + fb0);
      if (d >= 18 || Math.abs(Sl + Sr - S0) < 15 * eps) return Sl + Sr + (Sl + Sr - S0) / 15;
      return ic(a0, m, fa0, fm0, fl, Sl, eps / 2, d + 1) + ic(m, b0, fm0, fb0, fr, Sr, eps / 2, d + 1);
    };
    return ic(a, b, fa, fb, fc, S, gorece * olcek, 0);
  }
  // eğri ile x ekseni arasındaki toplam alan (x ekseninin altı da artı sayılır)
  function alan(ifade, a, b, x = 'x') { const f = derle(ifade, x); return Math.abs(simpson((t) => Math.abs(f(t)), a, b)); }
  function belirliIntegral(ifade, a, b, x = 'x') {
    const f = derle(ifade, x);
    const sayisal = simpson(f, a, b);
    let bel = null, adimlar = [];
    try {
      bel = integral(ifade, x);
      adimlar = bel.adimlar;
      const F = derle(bel.ifade, x), deger = F(b) - F(a);
      if (isFinite(deger) && Math.abs(deger - sayisal) < 1e-6 * Math.max(1, Math.abs(deger))) {
        adimlar.push({ kural: 'Belirli integral: üst sınırdaki değerden alt sınırdaki değer çıkarılır', tex: '\\left[' + bel.tex.replace(/\+C$/, '') + '\\right]_{' + sayiTex(a) + '}^{' + sayiTex(b) + '}=' + (tamBicimE(deger) ? tamBicimE(deger).tex : sayiTex(deger)) });
        return { deger, tam: tamBicimE(deger), adimlar, belirsiz: bel };
      }
    } catch (e) { /* sayısal */ }
    adimlar.push({ kural: 'Belirli integral sayısal olarak hesaplandı (Simpson yöntemi)', tex: '\\int_{' + sayiTex(a) + '}^{' + sayiTex(b) + '}' + tex(math.parse(ifade)) + '\\,d' + x + '\\approx ' + sayiTex(sayisal) });
    return { deger: sayisal, tam: tamBicimE(sayisal), adimlar, sayisal: true };
  }

  // ---------------------------------------------------------------- hepsi bir arada
  function coz(latex, ayar = {}) {
    const a = anla(latex);
    const s = { ...a, sayi: sayiMetin, tamBicim };
    if (a.tur === 'islem') s.islem = islem(a.ifade, ayar);
    else if (a.tur === 'turev') { s.turev = turev(a.ifade); s.fonksiyonTex = tex(math.parse(a.ifade)); }
    else if (a.tur === 'fonksiyon') { s.fonksiyonTex = tex(math.parse(a.ifade)); s.analiz = analiz(a.ifade); }
    else if (a.tur === 'denklem') s.denklem = denklem(a.ifade, a.degisken);
    else if (a.tur === 'limit') { s.fonksiyonTex = tex(math.parse(a.ifade)); s.limit = limit(a.ifade, a.degisken, a.nokta, a.yon); }
    else if (a.tur === 'integral') {
      s.fonksiyonTex = tex(math.parse(a.ifade));
      if (a.alt !== null && a.ust !== null) s.belirli = belirliIntegral(a.ifade, a.alt, a.ust, a.degisken);
      else s.integral = integral(a.ifade, a.degisken);
    }
    return s;
  }

  const HesapMotor = { latexCevir, anla, islem, turev, analiz, denklem, limit, integral, belirliIntegral, alan, coz, derle, kokler, sayiMetin, tamBicim, kesirBul, tamBicimE, degiskenler, tex: (s) => tex(math.parse(s)) };
  if (typeof module !== 'undefined' && module.exports) module.exports = HesapMotor;
  kok.HesapMotor = HesapMotor;
})(typeof window !== 'undefined' ? window : globalThis);
