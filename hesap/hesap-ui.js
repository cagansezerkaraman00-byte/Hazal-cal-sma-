/* Luna hesap makinesi — ekran.
   Giriş: MathLive (ders kitabındaki gibi görünen matematik kutusu) + kendi tuş takımımız (yazmak gerekmez).
   "Çöz": motor ne yazıldığını anlar (işlem, fonksiyon, türev, denklem) ve uygun sonucu gösterir.
   📷: fotoğraftaki işlemi cihazın içindeki okuyucu okur, kutuya yazar, motor çözer. */
(function (kok) {
  const M = () => kok.HesapMotor;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const sayiTex = (x) => {
    const m = M().sayiMetin(x);
    return m.replace(/−/g, '-').replace(/,/g, '{,}').replace(/ × 10\^(-?\d+)/, '\\times10^{$1}').replace('∞', '\\infty');
  };
  const sayi = (x) => M().sayiMetin(x).replace(/^-/, '−');
  const sayiGuzel = (x) => { const t = M().tamBicim(x); return t ? t.metin.replace(/^-/, '−') : sayi(x); }; // −√3, π/6, 2/3
  // Ekrandaki matematik piksel yazıyla: MathLive'ın harf ve rakam sınıflarının yazı tipi (gölge ağacının içinde) değiştirilir.
  // Parantezler, kök işareti ve kesir çizgisi MathLive'ın kendi çizimiyle kalır; yazı tipi ekranın --hm-piksel-yazi değişkeninden gelir.
  const PIKSEL_CSS = '.ML__cmr, .ML__mathit, .ML__mathbf, .ML__mathbfit, .ML__text, .ML__placeholder { font-family: var(--hm-piksel-yazi), KaTeX_Main, monospace !important; font-style: normal !important; font-weight: var(--hm-piksel-kalinlik, 400) !important; }';
  let pikselSayfa = null;
  function pikselYap(alan) {
    const k = alan && alan.shadowRoot;
    if (!k || k.__piksel) return;
    try {
      if (!pikselSayfa) { pikselSayfa = new CSSStyleSheet(); pikselSayfa.replaceSync(PIKSEL_CSS); }
      k.adoptedStyleSheets = [...k.adoptedStyleSheets, pikselSayfa];
    } catch (e) { const st = document.createElement('style'); st.textContent = PIKSEL_CSS; k.appendChild(st); }
    k.__piksel = true;
  }
  // geçmiş bu cihazda saklanır (yalnızca kolaylık; okunamazsa boş başlar)
  const GECMIS_ANAHTARI = 'luna-hesap-gecmis';
  const gecmisOku = () => { try { const g = JSON.parse(localStorage.getItem(GECMIS_ANAHTARI) || '[]'); return Array.isArray(g) ? g.filter((x) => x && typeof x.l === 'string' && typeof x.tex === 'string').slice(0, 30) : []; } catch (e) { return []; } };

  // Tuşlar: [etiket (HTML), eylem, sınıf, erişilebilir ad]. Eylem: { ekle: LaTeX } | { komut } | özel ad
  // Üstte sekmeye göre değişen 5×3 işlev tuşu, altta hep duran 4×5 sayı tuşu.
  const SEKMELER = {
    bilimsel: { ad: 'Bilimsel', tuslar: [
      ['sin', { ekle: '\\sin\\left(#0\\right)' }], ['cos', { ekle: '\\cos\\left(#0\\right)' }], ['tan', { ekle: '\\tan\\left(#0\\right)' }], ['(', { ekle: '(' }], [')', { ekle: ')' }],
      ['log', { ekle: '\\log\\left(#0\\right)' }], ['ln', { ekle: '\\ln\\left(#0\\right)' }], ['√', { ekle: '\\sqrt{#0}' }], ['x²', { ekle: '#@^{2}' }], ['x<sup>y</sup>', { ekle: '#@^{#?}' }, '', 'üs'],
      ['π', { ekle: '\\pi' }], ['e', { ekle: 'e' }], ['n!', { ekle: '!' }], ['1/x', { ekle: '\\frac{1}{#@}' }, '', 'çarpmaya göre ters'], ['%', { ekle: '\\%' }],
    ] },
    cebir: { ad: 'Cebir', tuslar: [
      ['x', { ekle: 'x' }, 'x'], ['y', { ekle: 'y' }, 'x'], ['=', { ekle: '=' }, '', 'eşittir işareti'], ['&lt;', { ekle: '<' }, '', 'küçüktür'], ['&gt;', { ekle: '>' }, '', 'büyüktür'],
      ['≤', { ekle: '\\le ' }, '', 'küçük eşit'], ['≥', { ekle: '\\ge ' }, '', 'büyük eşit'], ['|x|', { ekle: '\\left|#0\\right|' }, '', 'mutlak değer'], ['<span class="hm-kesir"><i>a</i><i>b</i></span>', { ekle: '\\frac{#@}{#?}' }, '', 'kesir'], ['<sup>n</sup>√', { ekle: '\\sqrt[#?]{#?}' }, '', 'n. dereceden kök'],
      ['f(x)=', { ekle: 'f(x)=' }, 'kucuk'], ['k', { ekle: 'k' }, 'x'], ['i', { ekle: 'i' }, 'x', 'sanal birim i'], ['ANS', 'ans', 'kucuk', 'son sonuç'], ['cot', { ekle: '\\cot\\left(#0\\right)' }],
    ] },
    analiz: { ad: 'Analiz', tuslar: [
      ['d/dx', { ekle: '\\frac{d}{dx}\\left(#0\\right)' }, 'kucuk', 'türev'], ['lim', { ekle: '\\lim_{x\\to#?}#?' }, '', 'limit'], ['∫', { ekle: '\\int#?\\,dx' }, '', 'integral'], ['∫<sub>a</sub><sup>b</sup>', { ekle: '\\int_{#?}^{#?}#?\\,dx' }, '', 'belirli integral'], ['∞', { ekle: '\\infty' }, '', 'sonsuz'],
      ['Σ', { ekle: '\\sum_{k=#?}^{#?}#?' }, '', 'toplam sembolü'], ['C(n,r)', { ekle: '\\binom{#?}{#?}' }, 'kucuk', 'kombinasyon'], ['P(n,r)', { ekle: 'P\\left(#?,#?\\right)' }, 'kucuk', 'permütasyon'], ['EBOB', { ekle: '\\operatorname{EBOB}\\left(#?,#?\\right)' }, 'kucuk'], ['EKOK', { ekle: '\\operatorname{EKOK}\\left(#?,#?\\right)' }, 'kucuk'],
      ['sin⁻¹', { ekle: '\\arcsin\\left(#0\\right)' }, 'kucuk'], ['cos⁻¹', { ekle: '\\arccos\\left(#0\\right)' }, 'kucuk'], ['tan⁻¹', { ekle: '\\arctan\\left(#0\\right)' }, 'kucuk'], ['log<sub>a</sub>', { ekle: '\\log_{#?}\\left(#?\\right)' }], ['{ ⋮', { ekle: '\\begin{cases}#?\\\\#?\\end{cases}' }, 'kucuk', 'denklem sistemi'],
    ] },
    gecmis: { ad: 'Geçmiş' },
  };
  const SAYI_TUSLARI = [
    ['AC', 'temizle', 'pembe', 'hepsini sil'], ['<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-10L3 12z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="m11 9.5 5 5m0-5-5 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>', { komut: 'deleteBackward' }, 'pembe sil', 'sil'], ['±', { ekle: '\\left(-#0\\right)' }, 'pembe', 'eksi sayı'], ['÷', { ekle: '\\div ' }, 'seftali'],
    ['7', { ekle: '7' }, 'sayi'], ['8', { ekle: '8' }, 'sayi'], ['9', { ekle: '9' }, 'sayi'], ['×', { ekle: '\\times ' }, 'islem'],
    ['4', { ekle: '4' }, 'sayi'], ['5', { ekle: '5' }, 'sayi'], ['6', { ekle: '6' }, 'sayi'], ['−', { ekle: '-' }, 'islem'],
    ['1', { ekle: '1' }, 'sayi'], ['2', { ekle: '2' }, 'sayi'], ['3', { ekle: '3' }, 'sayi'], ['+', { ekle: '+' }, 'islem'],
    ['0', { ekle: '0' }, 'sayi'], [',', { ekle: '{,}' }, 'sayi', 'virgül'], ['=', 'coz', 'esit', 'Çöz'],
  ];
  const IKON = {
    ay: '<svg class="hm-ay" viewBox="0 0 64 64" aria-hidden="true"><defs><radialGradient id="hm-ay-r" cx="40%" cy="38%" r="70%"><stop offset="0" stop-color="#fff6ea"/><stop offset=".55" stop-color="#ffd9e8"/><stop offset="1" stop-color="#f3a9cf"/></radialGradient></defs><path d="M38 6a26 26 0 1 0 20 39A21 21 0 0 1 38 6z" fill="url(#hm-ay-r)"/><path d="M52 10l1.6 4.4L58 16l-4.4 1.6L52 22l-1.6-4.4L46 16l4.4-1.6z" fill="#ffd67a"/></svg>',
    foto: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.7l1.3-2h5l1.3 2h1.7A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><circle cx="12" cy="12.5" r="3.6" fill="none" stroke="currentColor" stroke-width="1.9"/></svg>',
    gecmis: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 4.5v3.8h3.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 8v4.3l2.8 1.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    cicek: '<svg viewBox="0 0 60 90" aria-hidden="true"><path d="M30 88C30 70 26 58 18 46M30 70c8-6 16-6 22-2" fill="none" stroke="#5a8a6a" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="44" cy="64" rx="7" ry="3.4" transform="rotate(-20 44 64)" fill="#6fa47e"/><g transform="translate(18 34)"><g fill="#c7a6ff">' +
      [0, 72, 144, 216, 288].map((a) => `<ellipse rx="6.5" ry="10" cy="-9" transform="rotate(${a})"/>`).join('') + '</g><circle r="4.6" fill="#ffe08a"/></g></svg>',
  };

  function baslat(kap, ayar = {}) {
    const durum = { derece: ayar.derece !== false, sekme: 'bilimsel', ans: null, gecmis: gecmisOku(), okuyucu: null, okumaNo: 0 };
    kap.classList.add('hm');
    kap.innerHTML = `
      <div class="hm-gok" aria-hidden="true"><div class="hm-yildizlar"></div><i class="hm-kayan"></i>
        <span class="hm-cicek c1">${IKON.cicek}</span><span class="hm-cicek c2">${IKON.cicek}</span><span class="hm-cicek c3">${IKON.cicek}</span><span class="hm-cicek c4">${IKON.cicek}</span></div>
      <header class="hm-ust">
        <div class="hm-logo">${IKON.ay}<div class="hm-ad"><b>Luna</b><span>Ay Işığı</span></div></div>
        <div class="hm-ust-tuslar">
          <button class="hm-aci-btn" type="button"></button>
          <button class="hm-yuvarlak hm-foto-btn" type="button" aria-label="Fotoğraftan oku" title="Fotoğraftan oku">${IKON.foto}</button>
          <button class="hm-yuvarlak hm-gecmis-btn" type="button" aria-label="Geçmiş" title="Geçmiş">${IKON.gecmis}</button>
        </div>
      </header>
      <div class="hm-ekran">
        <i class="hm-parilti p1"></i><i class="hm-parilti p2"></i>
        <math-field class="hm-alan" aria-label="İşlem" placeholder="\\text{Yaz ya da fotoğrafını çek}"></math-field>
        <div class="hm-ekran-alt">
          <div class="hm-imlec"><button type="button" data-komut="moveToPreviousChar" aria-label="İmleci sola al">‹</button><button type="button" data-komut="moveToNextChar" aria-label="İmleci sağa al">›</button></div>
          <div class="hm-onizleme" aria-live="polite"></div>
        </div>
      </div>
      <div class="hm-govde">
        <div class="hm-sekmeler" role="tablist" aria-label="Tuş takımı">${Object.entries(SEKMELER).map(([k, s]) => `<button type="button" role="tab" class="hm-sekme" data-sekme="${k}">${s.ad}</button>`).join('')}</div>
        <div class="hm-tuslar" role="group" aria-label="Hesap makinesi tuşları"></div>
      </div>
      <div class="hm-sonuc" aria-live="polite"></div>
      <button class="hm-tus-ac" type="button" aria-label="Tuşları aç">⌨ Tuşlar</button>
      <footer class="hm-alt"><span aria-hidden="true">🌸</span> Hazal’ın küçük dünyası <span aria-hidden="true">🌸</span></footer>
      <input class="hm-dosya" type="file" accept="image/*" hidden>`;
    const $ = (s) => kap.querySelector(s);
    const kutu = (latex, sinif = '') => `<math-field read-only class="hm-statik ${sinif}">${esc(latex)}</math-field>`;
    const mf = $('.hm-alan'), sonuc = $('.hm-sonuc'), onizleme = $('.hm-onizleme'), tuslar = $('.hm-tuslar'), ekran = $('.hm-ekran');
    // gökyüzü: yıldızlar (bir kez, rastgele ama sabit yerlerde)
    const yildiz = $('.hm-yildizlar');
    let tohum = 7;
    const r = () => { tohum = (tohum * 16807) % 2147483647; return tohum / 2147483647; };
    yildiz.innerHTML = Array.from({ length: 46 }, (_, i) => `<i style="left:${(r() * 100).toFixed(1)}%;top:${(r() * 100).toFixed(1)}%;--b:${(1 + r() * 2.2).toFixed(1)}px;--g:${(r() * 6).toFixed(1)}s;${i % 7 === 0 ? '--p:1;' : ''}"></i>`).join('');
    if (kok.HesapKediler) kok.HesapKediler.yerlestir(ekran);
    // dar dikey ekranda (telefon) çözümden sonra sonuç tuşların yerini alır; "⌨ Tuşlar" ya da kutuya dokunmak geri getirir
    const dar = () => typeof matchMedia === 'function' && matchMedia('(max-width: 859px) and (orientation: portrait)').matches;
    const tuslarAcik = (acik) => kap.classList.toggle('tuslar-kapali', !acik);
    $('.hm-tus-ac').addEventListener('click', () => { tuslarAcik(true); mf.focus(); });
    mf.addEventListener('pointerdown', () => tuslarAcik(true));
    mf.mathVirtualKeyboardPolicy = 'manual';
    mf.smartFence = true;
    mf.smartSuperscript = true;
    mf.inlineShortcuts = { ...(mf.inlineShortcuts || {}), x: 'x' };
    mf.addEventListener('focusin', () => { try { kok.mathVirtualKeyboard && kok.mathVirtualKeyboard.hide(); } catch (e) { /* yok */ } });
    // telefonun kendi klavyesi açılmasın: tuşlar bizim
    const klavyesiz = () => { const ta = mf.shadowRoot && mf.shadowRoot.querySelector('textarea'); if (ta) { ta.setAttribute('inputmode', 'none'); ta.setAttribute('virtualkeyboardpolicy', 'manual'); } };
    klavyesiz(); setTimeout(klavyesiz, 300);
    pikselYap(mf); setTimeout(() => pikselYap(mf), 300);
    mf.addEventListener('mount', () => pikselYap(mf));

    // ------------------------------------------------ üst düğmeler
    const aciBtn = $('.hm-aci-btn');
    const aciYaz = () => { aciBtn.textContent = durum.derece ? 'DEG' : 'RAD'; aciBtn.setAttribute('aria-label', 'Açı birimi: ' + (durum.derece ? 'derece' : 'radyan') + ' (değiştir)'); };
    aciYaz();
    aciBtn.addEventListener('click', () => { durum.derece = !durum.derece; aciYaz(); canliOnizleme(); });
    $('.hm-gecmis-btn').addEventListener('click', () => { tuslarAcik(true); sekmeSec(durum.sekme === 'gecmis' ? 'bilimsel' : 'gecmis'); });
    ekran.querySelectorAll('[data-komut]').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); odakla(); mf.executeCommand(b.dataset.komut); onizlemeSonra(); }));

    // ------------------------------------------------ tuş takımı
    const tusHtml = ([etiket, eylem, sinif, ad], ek = '') => `<button type="button" class="hm-tus ${sinif || ''} ${ek}" data-e="${JSON.stringify(eylem).replace(/"/g, '&quot;')}" aria-label="${esc(ad || etiket.replace(/<[^>]+>/g, ''))}"><span>${etiket}</span></button>`;
    function islevCiz() {
      const yer = tuslar.querySelector('.hm-islevler');
      if (durum.sekme === 'gecmis') {
        yer.className = 'hm-islevler gecmis';
        yer.innerHTML = durum.gecmis.length
          ? durum.gecmis.map((g, k) => `<button type="button" class="hm-gecmis-satir" data-g="${k}">${kutu(g.l, 'kucuk')}<span>${kutu(g.tex, 'kucuk')}</span></button>`).join('')
          : '<p class="hm-bos">Henüz bir şey çözmedin. Çözdüklerin burada kalır; dokununca geri gelir.</p>';
        yer.querySelectorAll('.hm-gecmis-satir').forEach((b) => b.addEventListener('click', () => { mf.value = durum.gecmis[+b.dataset.g].l; sekmeSec('bilimsel'); coz(); }));
        return;
      }
      yer.className = 'hm-islevler';
      yer.innerHTML = SEKMELER[durum.sekme].tuslar.map((t, i) => tusHtml(t, 'fn s' + (i % 5))).join('');
    }
    function sekmeSec(ad) {
      durum.sekme = ad;
      kap.querySelectorAll('.hm-sekme').forEach((b) => { const s = b.dataset.sekme === ad; b.classList.toggle('etkin', s); b.setAttribute('aria-selected', s); });
      islevCiz();
    }
    tuslar.innerHTML = '<div class="hm-islevler"></div>' + SAYI_TUSLARI.map((t) => tusHtml(t)).join('');
    kap.querySelector('.hm-sekmeler').addEventListener('click', (e) => { const b = e.target.closest('.hm-sekme'); if (b) sekmeSec(b.dataset.sekme); });
    sekmeSec('bilimsel');
    // geniş ekranda sonucun yeri baştan görünür: ne yapılabileceğini söyler
    sonuc.innerHTML = '<div class="hm-kart hm-hosgeldin"><b>✨ Yaz ya da fotoğrafını çek</b><p class="hm-mini">İşlem, denklem, eşitsizlik, fonksiyon, türev, limit, integral, Σ, denklem sistemi… Sonuç, grafik ve adım adım çözüm burada görünür.</p>' +
      '<p class="hm-mini hm-pc-ipucu">⌨ Klavyeden de yazabilirsin: <b>/</b> kesir, <b>^</b> üs, <b>Enter</b> çözer, <b>Esc</b> siler, <b>←</b> <b>→</b> imleci gezdirir.</p></div>';
    // Tuş dokunulduğu anda çalışır (parmağın kalkması beklenmez; telefonlar "click"i geciktirebiliyor).
    // ⌫ basılı tutulursa art arda siler. Klavyeyle (Tab + Enter) basılan tuş "click" ile gelir.
    let tekrar = 0, tekrarBasla = 0;
    const birak = () => { clearTimeout(tekrarBasla); clearInterval(tekrar); tuslar.querySelectorAll('.basili').forEach((x) => x.classList.remove('basili')); };
    tuslar.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.hm-tus');
      if (!b) return;
      e.preventDefault(); // kutudan odak kaçmasın, sayfa kaymasın
      if (e.button > 0) return;
      birak();
      b.classList.add('basili');
      bas(b);
      if (b.classList.contains('sil') && /deleteBackward/.test(b.dataset.e)) {
        tekrarBasla = setTimeout(() => { tekrar = setInterval(() => bas(b), 70); }, 420);
      }
    });
    for (const t of ['pointerup', 'pointercancel', 'pointerleave']) tuslar.addEventListener(t, birak);
    tuslar.addEventListener('click', (e) => { const b = e.target.closest('.hm-tus'); if (b && e.detail === 0) bas(b); });
    function bas(b) {
      const eylem = JSON.parse(b.dataset.e);
      if (navigator.vibrate) try { navigator.vibrate(6); } catch (err) { /* yok */ }
      if (eylem === 'coz') return coz();
      if (eylem === 'temizle') { durum.yukarida = null; mf.value = ''; canliOnizleme(); odakla(); return; }
      if (eylem === 'ans') { if (durum.ans) ekle(durum.ans); return; }
      if (eylem.komut) { durum.yukarida = null; odakla(); mf.executeCommand(eylem.komut); onizlemeSonra(); return; }
      if (eylem.ekle) ekle(eylem.ekle);
    }
    const odakla = () => { if (document.activeElement !== mf) mf.focus(); };
    // "=" ile sonuç üst satıra çıkmışsa: işlem tuşu (+ − × ÷ ^ x² ! % 1/x) sonuçtan devam eder; sin, √, |x| sonucu içine alır;
    // rakam, harf, sabit ya da açılan parantez yeni işleme başlar.
    const DEVAM = /^(?:\+|-|\\times|\\div|\\cdot|\*|\/|\^|!|\\%|%|=|#@|\\frac\{1\}\{#@\})/;
    function sonuctanDevam(latex) {
      const r = durum.yukarida;
      if (!r) return;
      durum.yukarida = null;
      if (mf.value !== r.tex) return; // kullanıcı üst satırı değiştirmiş
      if (DEVAM.test(latex)) {
        // bileşik sonuç (5 + i, −3) üstüne üs/çarpım gelirse parantez: (5 + i)·2, (−3)²
        if (/[+-]/.test(r.tex.replace(/^-/, '')) || (/^-/.test(r.tex) && /^(?:\^|#@|!)/.test(latex))) mf.value = '\\left(' + r.tex + '\\right)';
        mf.executeCommand('moveToMathfieldEnd');
      } else if (/#0/.test(latex)) mf.executeCommand('selectAll'); // √, sin, |x|: sonuç içine girer
      else mf.value = '';
    }
    function ekle(latex) {
      odakla();
      sonuctanDevam(latex);
      mf.executeCommand(['insert', latex, { selectionMode: 'placeholder', format: 'latex', mode: 'math' }]);
      onizlemeSonra();
    }
    // canlı önizleme ekran güncellendikten sonra hesaplanır: tuşa basış hiç beklemez
    let onizlemeBekliyor = false;
    const onizlemeSonra = () => {
      if (onizlemeBekliyor) return;
      onizlemeBekliyor = true;
      requestAnimationFrame(() => setTimeout(() => { onizlemeBekliyor = false; canliOnizleme(); }, 0));
    };
    mf.addEventListener('input', onizlemeSonra);
    mf.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); coz(); }
      else if (e.key === 'Escape') { e.preventDefault(); durum.yukarida = null; mf.value = ''; canliOnizleme(); }
      else if (durum.yukarida && e.key.length === 1 && !e.ctrlKey && !e.metaKey) sonuctanDevam(e.key); // klavyeyle de sonuçtan devam
      else if (durum.yukarida && e.key === 'Backspace') durum.yukarida = null;
    });
    // Bilgisayarda kutuya tıklamadan da yazılır: sayfada basılan tuş kutuya gider (başka bir yazı alanı ya da fotoğraf penceresi açıkken değil)
    const belge = kap.ownerDocument || document;
    belge.addEventListener('keydown', (e) => {
      if (!kap.isConnected || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      const yol = e.composedPath ? e.composedPath() : [e.target];
      if (yol.includes(mf) || kap.querySelector('.hm-kirp-katman')) return;
      if (yol.some((n) => n && n.matches && n.matches('input, textarea, select, [contenteditable="true"], math-field'))) return;
      if (e.key === 'Enter') { e.preventDefault(); coz(); return; }
      if (e.key === 'Escape') { durum.yukarida = null; mf.value = ''; canliOnizleme(); return; }
      if (e.key === 'Backspace') { e.preventDefault(); durum.yukarida = null; odakla(); mf.executeCommand('deleteBackward'); onizlemeSonra(); return; }
      if (e.key.length === 1 && e.key !== ' ') { e.preventDefault(); tuslarAcik(true); odakla(); sonuctanDevam(e.key); mf.executeCommand(['typedText', e.key]); onizlemeSonra(); }
    });
    if (typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches) setTimeout(() => { if (!belge.activeElement || belge.activeElement === belge.body) mf.focus(); }, 350);

    // Ekranın sağ altı: yazarken sonucun önizlemesi (sade yazı, hızlı), çözünce kesin sonuç (matematik yazısı)
    const IPUCU = { fonksiyon: '📈 grafiği ve kökleri', turev: '📐 türevi adım adım', denklem: '🔎 denklemin kökleri', limit: '➡️ limiti adım adım', integral: '∫ integrali adım adım',
      esitsizlik: '📏 çözüm kümesi', sistem: '🔗 ortak çözüm', toplamN: 'Σ kapalı biçim' };
    function canliOnizleme() {
      const l = mf.value;
      if (durum.yukarida && l === durum.yukarida.tex) return; // sonuç az önce üste çıktı: alttaki "9 + 1 =" kalsın
      onizleme.className = 'hm-onizleme';
      if (!l.trim()) { onizleme.textContent = ''; return; }
      try {
        const a = M().anla(l);
        if (a.tur === 'islem') {
          const s = M().islem(a.ifade, { derece: durum.derece });
          const yazi = s.karmasik ? s.metin : isFinite(s.deger) || !isNaN(s.deger) ? (s.tam ? s.tam.metin.replace('-', '−') : sayi(s.deger)) : '';
          onizleme.textContent = yazi;
          onizleme.classList.add(yazi.length > 12 ? 'orta' : 'buyuk');
        } else { onizleme.textContent = IPUCU[a.tur] ? '= ' + IPUCU[a.tur] : ''; onizleme.classList.add('ipucu'); }
      } catch (e) { onizleme.textContent = ''; }
    }
    function ekranSonuc(tex, yaklasik) {
      const yalin = /^-?[\d{},.]+$/.test(tex); // düz sayı: Luna'nın yazısıyla, büyük
      const uzun = tex.replace(/\\[a-zA-Z]+|[{}]/g, '').length;
      const boy = yalin ? (uzun > 12 ? 'orta' : 'buyuk') : uzun > 14 ? 'kucuk' : uzun > 7 || /\\frac|\\sqrt|\^|_/.test(tex) ? 'orta' : 'buyuk';
      onizleme.className = 'hm-onizleme kesin ' + boy;
      onizleme.innerHTML = (yaklasik ? `<span class="hm-yaklasik">≈ ${esc(yaklasik)}</span>` : '') +
        (yalin ? `<span class="hm-sayi-sonuc">${esc(tex.replace(/\{,\}/g, ',').replace(/^-/, '−'))}</span>` : `<math-field read-only class="hm-statik">${esc(tex)}</math-field>`);
      pikselYap(onizleme.querySelector('math-field'));
    }
    // ekrandaki kısa cevap
    function ozet(r) {
      const sy = (v) => M().sayiYaz(v);
      try {
        if (r.tur === 'fonksiyon') return r.analiz.kokler.length ? r.analiz.kokler.slice(0, 3).map((x, i) => 'x_{' + (i + 1) + '}=' + sy(x)).join(',\\ ') : '\\text{📈 grafik}';
        if (r.tur === 'turev') return (r.ad && r.ad !== 'y' ? r.ad : 'f') + "'(x)=" + r.turev.tex;
        if (r.tur === 'denklem') {
          const d = r.denklem, x = r.degisken || 'x';
          if (d.yol === 'ozdeslik') return '\\text{Her }' + x + '\\text{ için doğru}';
          if (d.yol === 'trig') return d.kokler.length ? d.aileler.map((a) => x + '=' + (Math.abs(a.r) < 1e-12 ? '' : sy(a.r) + '+') + piKat(a.adim)).join(',\\ ') : '\\text{Çözüm yok}';
          if (d.kumeTex) return '\\text{Ç.K.}=' + d.kumeTex;
          if (!d.kokler.length) return '\\text{Çözüm yok}';
          return d.kokler.slice(0, 3).map((k, n) => (d.kokler.length > 1 ? x + '_{' + (n + 1) + '}' : x) + '=' + sayiYaz(k, d.kokTex)).join(',\\ ') + (d.kokler.length > 3 ? ',\\ \\dots' : '');
        }
        if (r.tur === 'esitsizlik') return r.esitsizlik.karsilastirma ? '\\text{' + (r.esitsizlik.dogru ? 'Doğru' : 'Yanlış') + '}' : '\\text{Ç.K.}=' + r.esitsizlik.tex;
        if (r.tur === 'sistem') { const S = r.sistem; return S.tur === 'tek' ? S.cozumler.slice(0, 2).map((c) => '\\left(' + c.map((t) => sy(t)).join(',') + '\\right)').join(',\\ ') : '\\text{' + (S.tur === 'sonsuz' ? 'Sonsuz çözüm' : 'Çözüm yok') + '}'; }
        if (r.tur === 'limit') return r.limit.yok ? '\\text{Limit yok}' : limTex(r.limit.deger);
        if (r.tur === 'integral') return r.belirli ? (r.belirli.tam ? r.belirli.tam.tex : sayiTex(r.belirli.deger)) : r.integral.tex;
        if (r.tur === 'toplamN') return r.toplamN.tex;
      } catch (e) { /* özet yok */ }
      return '';
    }

    // ------------------------------------------------ çözüm ve gösterim
    function coz() {
      durum.yukarida = null;
      const l = mf.value.trim();
      if (!l) { sonuc.innerHTML = `<p class="hm-not">Önce bir işlem yaz ya da 📷 ile fotoğrafını çek.</p>`; if (dar()) tuslarAcik(false); return; }
      let r;
      try { r = M().coz(l, { derece: durum.derece }); } catch (e) {
        onizleme.className = 'hm-onizleme ipucu hata'; onizleme.textContent = 'Bunu çözemedim';
        sonuc.innerHTML = `<div class="hm-kart hm-hata"><b>Bunu çözemedim</b><p>${esc(hataMetni(e))}</p></div>`;
        if (dar()) tuslarAcik(false);
        return;
      }
      if (r.tur === 'islem') islemGoster(l, r);
      else if (r.tur === 'fonksiyon') fonksiyonGoster(r);
      else if (r.tur === 'turev') turevGoster(r);
      else if (r.tur === 'denklem') denklemGoster(r);
      else if (r.tur === 'limit') limitGoster(r);
      else if (r.tur === 'integral') integralGoster(r);
      else if (r.tur === 'esitsizlik') esitsizlikGoster(r, l);
      else if (r.tur === 'sistem') sistemGoster(r, l);
      else if (r.tur === 'toplamN') toplamNGoster(r, l);
      if (r.tur !== 'islem') {
        const o = ozet(r);
        if (o) ekranSonuc(o);
        gecmiseEkle(l, o);
      }
      sonuc.scrollTop = 0;
      // işlemde sonuç ekranda, tuşlar kalır (adım adım varsa sonuç bölümü açılır); öbürlerinde grafik ve adımlara yer açılır
      if (dar() && (r.tur !== 'islem' || (r.islem && r.islem.adimlar))) tuslarAcik(false);
      if (ayar.cozuldu) ayar.cozuldu(r);
    }
    const hataMetni = (e) => {
      const m = String((e && e.message) || e);
      if (/eksik|beklenmeyen|fazladan/.test(m)) return 'İşlemde eksik ya da fazla bir parça var gibi. Parantezleri ve boş kutucukları kontrol et.';
      if (/tanınmayan/.test(m)) return 'Tanımadığım bir işaret var: ' + m.split(':').pop() + '. Tuşlardan yazmayı dene.';
      if (/tek bilinmeyen|bilinmeyen yok|en fazla|kapalı biçim|Σ|iki bilinmeyen/.test(m)) return m.charAt(0).toUpperCase() + m.slice(1) + '.';
      return 'Hesaplanamadı (' + m + ').';
    };
    function gecmiseEkle(l, tex) {
      if (!tex) return;
      durum.gecmis = [{ l, tex }, ...durum.gecmis.filter((g) => g.l !== l)].slice(0, 30);
      try { localStorage.setItem(GECMIS_ANAHTARI, JSON.stringify(durum.gecmis)); } catch (e) { /* saklanamadı */ }
      if (durum.sekme === 'gecmis') islevCiz();
    }

    function islemGoster(l, r) {
      const s = r.islem;
      const anaTex = s.tam ? s.tam.tex : sayiTex(s.deger);
      durum.ans = anaTex;
      gecmiseEkle(l, anaTex);
      if (isFinite(s.deger) || s.karmasik) {
        // hesap makinesi gibi: sonuç üst satıra çıkar, işlem oradan sürer; altta küçükçe ne hesaplandığı (9 + 1 =) kalır
        durum.yukarida = { tex: anaTex, onceki: l };
        mf.value = anaTex;
        mf.executeCommand('moveToMathfieldEnd');
        onizleme.className = 'hm-onizleme kesin onceki';
        onizleme.innerHTML = `<math-field read-only class="hm-statik hm-onceki-ifade">${esc(l + '=')}</math-field>` + (s.tam && isFinite(s.deger) ? `<span class="hm-yaklasik">≈ ${esc(sayi(s.deger))}</span>` : '');
        pikselYap(onizleme.querySelector('math-field'));
      } else ekranSonuc(anaTex, '');
      sonuc.innerHTML = `
        <div class="hm-kart hm-islem">
          <div class="hm-baslik">${kutu(l)}</div>
          <div class="hm-esittir">${kutu('=' + anaTex, 'buyuk vurgu')}</div>
          ${s.tam && isFinite(s.deger) ? `<div class="hm-yaklasik">≈ ${esc(sayi(s.deger))}</div>` : ''}
          ${s.karmasik ? '<div class="hm-mini">Karmaşık sayı (i² = −1)</div>' : ''}
          ${r.okumaDuzeltme ? `<div class="hm-mini">📷 ${esc(r.okumaDuzeltme)}</div>` : ''}
          ${s.adimlar ? adimListe(s.adimlar) : ''}
          ${/sin|cos|tan|cot/.test(r.ifade) ? `<div class="hm-mini">${durum.derece ? 'Açılar derece cinsinden' : 'Açılar radyan cinsinden'} · üstteki DEG/RAD düğmesiyle değiştir</div>` : ''}
        </div>`;
    }

    const RENK = (n) => getComputedStyle(kap).getPropertyValue('--hm-egri-' + n).trim() || ['#7b5cd6', '#e0558a', '#2f9e7e'][n - 1];
    const adimListe = (adimlar) => `<details class="hm-adimlar" open><summary>Adım adım</summary><ol>${adimlar.map((a) => `<li><span class="hm-kural">${esc(a.kural)}</span>${kutu(a.tex)}</li>`).join('')}</ol></details>`;
    const limTex = (v) => (!isFinite(v) ? (v > 0 ? '\\infty' : '-\\infty') : (M().tamBicimE(v) ? M().tamBicimE(v).tex : sayiTex(v)));
    function limitGoster(r) {
      const L = r.limit, a = r.nokta, f = M().derle(r.ifade, r.degisken);
      const aTex = !isFinite(a) ? (a > 0 ? '\\infty' : '-\\infty') : (M().tamBicimE(a) ? M().tamBicimE(a).tex : sayiTex(a));
      const bas = '\\lim_{' + (r.degisken || 'x') + '\\to ' + aTex + (r.yon > 0 ? '^{+}' : r.yon < 0 ? '^{-}' : '') + '}' + r.fonksiyonTex;
      sonuc.innerHTML = `
        <div class="hm-kart">
          <div class="hm-baslik">${kutu(bas)}</div>
          <div class="hm-esittir">${L.yok ? '<p class="hm-buyuk-yazi">Limit yoktur</p>' : kutu('=' + limTex(L.deger), 'buyuk vurgu')}</div>
          ${L.yok ? `<p class="hm-mini">Sağdan ${esc(isFinite(L.sag) ? sayi(L.sag) : (L.sag > 0 ? '∞' : '−∞'))}, soldan ${esc(isFinite(L.sol) ? sayi(L.sol) : (L.sol > 0 ? '∞' : '−∞'))}: iki yandan farklı değerlere gidiyor.</p>` : (L.tam && isFinite(L.deger) && !Number.isInteger(L.deger) ? `<div class="hm-yaklasik">≈ ${esc(sayi(L.deger))}</div>` : '')}
          ${adimListe(L.adimlar)}
          <div class="hm-grafik-yer"></div>
          <p class="hm-mini">${isFinite(a) ? 'Grafikte x = ' + esc(sayi(a)) + ' noktasına iki yandan yaklaşıldığında değerin nereye gittiği görülür.' : 'x büyüdükçe grafiğin yaklaştığı değer.'}</p>
        </div>`;
      const noktalar = isFinite(a) && isFinite(L.deger) ? [{ x: a, y: L.deger, renk: RENK(2), bos: true, etiket: 'limit ' + sayi(L.deger) }] : [];
      const odak = isFinite(a) ? [{ x: a - 3, y: f(a - 3) }, { x: a + 3, y: f(a + 3) }, ...noktalar] : [{ x: 0, y: f(0.5) }, { x: 12, y: f(12) }];
      const dogrular = isFinite(L.deger) && !isFinite(a) ? [{ f: () => L.deger, renk: RENK(2), kesikli: true }] : [];
      grafikKur(sonuc.querySelector('.hm-grafik-yer'), [{ f, renk: RENK(1) }], noktalar, dogrular, odak);
    }
    function integralGoster(r) {
      const f = M().derle(r.ifade, r.degisken);
      if (r.belirli) {
        const B = r.belirli, a = r.alt, b = r.ust;
        const deg = B.tam ? B.tam.tex : sayiTex(B.deger);
        let alan = null;
        try { alan = M().alan(r.ifade, a, b, r.degisken); } catch (e) { /* alan hesaplanamadı */ }
        sonuc.innerHTML = `
          <div class="hm-kart">
            <div class="hm-baslik">${kutu('\\int_{' + sayiTex(a) + '}^{' + sayiTex(b) + '}' + r.fonksiyonTex + '\\,d' + (r.degisken || 'x'))}</div>
            <div class="hm-esittir">${kutu('=' + deg, 'buyuk vurgu')}</div>
            ${B.tam && !Number.isInteger(B.deger) ? `<div class="hm-yaklasik">≈ ${esc(sayi(B.deger))}</div>` : ''}
            ${adimListe(B.adimlar)}
            <div class="hm-grafik-yer"></div>
            ${alan !== null && Math.abs(alan - Math.abs(B.deger)) > 1e-9 ? `<p class="hm-mini">Eğri ile x ekseni arasındaki toplam alan ≈ <b>${esc(sayi(alan))}</b> (x ekseninin altında kalan kısım integralde eksi sayılır).</p>` : '<p class="hm-mini">Taralı bölge: eğri ile x ekseni arasında kalan alan.</p>'}
          </div>`;
        const ornek = Array.from({ length: 9 }, (_, i) => a + (b - a) * i / 8).map((x) => ({ x, y: f(x) }));
        const g = grafikKur(sonuc.querySelector('.hm-grafik-yer'), [{ f, renk: RENK(1) }], [], [], [...ornek, { x: a, y: 0 }], { dar: true });
        g.ayarla({ alanlar: [{ f, a, b, renk: RENK(1) }] });
        return;
      }
      const I = r.integral, F = M().derle(I.ifade, r.degisken);
      sonuc.innerHTML = `
        <div class="hm-kart">
          <div class="hm-baslik">${kutu('\\int ' + r.fonksiyonTex + '\\,d' + (r.degisken || 'x'))}</div>
          <div class="hm-esittir">${kutu('=' + I.tex, 'buyuk vurgu')}</div>
          ${adimListe(I.adimlar)}
          <div class="hm-lejant"><span style="--r:var(--hm-egri-1)">f(x)</span><span style="--r:var(--hm-egri-2)">F(x) (C = 0)</span></div>
          <div class="hm-grafik-yer"></div>
          <p class="hm-mini">C sabittir: F(x) + C'nin her biri aynı f(x)'in integralidir (grafikte yukarı-aşağı kaydırılmış hâlleri).</p>
        </div>`;
      grafikKur(sonuc.querySelector('.hm-grafik-yer'), [{ f, renk: RENK(1) }, { f: F, renk: RENK(2) }], [], [], [{ x: -3, y: f(-3) }, { x: 3, y: f(3) }]);
    }
    function grafikKur(yer, egriler, noktalar, dogrular, odak, secenek) {
      yer.innerHTML = `<div class="hm-grafik"><canvas aria-label="Grafik"></canvas><div class="hm-grafik-tuslar"><button type="button" data-z="0.7" aria-label="Yakınlaştır">＋</button><button type="button" data-z="1.43" aria-label="Uzaklaştır">－</button><button type="button" data-z="0" aria-label="Sığdır">⤢</button></div><div class="hm-iz"></div></div>`;
      const izYer = yer.querySelector('.hm-iz');
      const tuval = yer.querySelector('canvas');
      const g = new kok.HesapGrafik(tuval, {
        izlendi: (n) => { izYer.textContent = n ? `x = ${sayi(n.x)}   y = ${sayi(n.y)}` : ''; },
        ciftDokunus: () => g.sigdir(odak, secenek),
      });
      g.ayarla({ egriler, noktalar, dogrular });
      tuval._grafik = g;
      requestAnimationFrame(() => { g._boyut(); g.sigdir(odak, secenek); });
      yer.querySelectorAll('[data-z]').forEach((b) => b.addEventListener('click', () => { const z = +b.dataset.z; if (z) g.yakinlastir(z); else g.sigdir(odak, secenek); }));
      return g;
    }
    const nokta = (x, y) => `(${sayi(x)} ; ${sayi(y)})`;

    function fonksiyonGoster(r) {
      const a = r.analiz, ad = r.ad && r.ad !== 'y' ? r.ad + '(x)' : 'y';
      const f = M().derle(r.ifade);
      const noktalar = [
        ...a.kokler.map((x) => ({ x, y: 0, renk: RENK(3), etiket: 'x = ' + sayiGuzel(x) })),
        ...a.tepeler.map((t) => ({ x: t.x, y: t.y, renk: RENK(2), etiket: nokta(t.x, t.y) })),
      ];
      if (a.yKesen !== null && !a.kokler.some((x) => Math.abs(x) < 1e-9)) noktalar.push({ x: 0, y: a.yKesen, renk: RENK(1), etiket: '(0 ; ' + sayi(a.yKesen) + ')' });
      sonuc.innerHTML = `
        <div class="hm-kart">
          <div class="hm-baslik">${kutu(ad + '=' + r.fonksiyonTex)}</div>
          <div class="hm-grafik-yer"></div>
          <ul class="hm-bilgi">
            ${a.carpanlar ? `<li><b>Çarpanlarına ayrılmış hâli</b> ${kutu(ad + '=' + a.carpanlar)}</li>` : ''}
            <li><b>Kökleri</b> ${a.kokler.length ? a.kokler.slice(0, 8).map((x) => 'x = ' + esc(sayiGuzel(x))).join(' · ') + (a.kokler.length > 8 ? ' …' : '') : 'gösterilen aralıkta yok'}</li>
            ${a.tepeler.length ? `<li><b>Tepe noktaları</b> ${a.tepeler.slice(0, 6).map((t) => esc(nokta(t.x, t.y)) + ' <small>' + t.tur + '</small>').join(' · ')}</li>` : ''}
            <li><b>y eksenini kestiği yer</b> ${a.yKesen === null ? 'tanımsız (x = 0 tanım kümesinde değil)' : esc('(0 ; ' + sayi(a.yKesen) + ')')}</li>
          </ul>
          <div class="hm-eylemler">
            <button type="button" class="hm-btn" data-ac="turev">📐 Türevini al</button>
            <label class="hm-deger">x = <input type="text" inputmode="decimal" placeholder="2"> <button type="button" class="hm-btn ince" data-ac="deger">${esc(ad.replace('y', 'y'))} hesapla</button></label>
          </div>
          <p class="hm-deger-sonuc"></p>
          <p class="hm-mini">Grafik: parmakla kaydır, iki parmakla yaklaştır, dokunduğun noktanın değerini görürsün; çift dokun: sığdır.</p>
        </div>`;
      grafikKur(sonuc.querySelector('.hm-grafik-yer'), [{ f, renk: RENK(1), ad }], noktalar, [], [...noktalar]);
      sonuc.querySelector('[data-ac="turev"]').addEventListener('click', () => turevGoster({ tur: 'turev', ifade: r.ifade, turev: M().turev(r.ifade), fonksiyonTex: r.fonksiyonTex, ad: r.ad }));
      const giris = sonuc.querySelector('.hm-deger input'), cikis = sonuc.querySelector('.hm-deger-sonuc');
      const hesapla = () => {
        try {
          const xv = M().islem(M().latexCevir(giris.value.replace(/π/g, '\\pi')), {}).deger;
          cikis.innerHTML = `${esc(ad.replace('(x)', '(' + sayi(xv) + ')'))} = <b>${esc(sayi(f(xv)))}</b>`;
        } catch (e) { cikis.textContent = 'Geçerli bir x değeri yaz (ör. 2, −1,5, π/2).'; }
      };
      sonuc.querySelector('[data-ac="deger"]').addEventListener('click', hesapla);
      giris.addEventListener('keydown', (e) => { if (e.key === 'Enter') hesapla(); });
    }

    function turevGoster(r) {
      const t = r.turev, f = M().derle(r.ifade), df = M().derle(t.ifade), ad = r.ad && r.ad !== 'y' ? r.ad : 'f';
      sonuc.innerHTML = `
        <div class="hm-kart">
          <div class="hm-baslik">${kutu(ad + '(x)=' + (r.fonksiyonTex || t.girdiTex))}</div>
          <div class="hm-esittir">${kutu(ad + "'(x)=" + t.tex, 'buyuk vurgu')}</div>
          <details class="hm-adimlar" open><summary>Adım adım</summary>
            <ol>${t.adimlar.map((a) => `<li><span class="hm-kural">${esc(a.kural)}</span>${kutu(a.tex)}</li>`).join('') || '<li>Sabit sayının türevi 0\'dır.</li>'}</ol>
          </details>
          <div class="hm-lejant"><span style="--r:var(--hm-egri-1)">${ad}(x)</span><span style="--r:var(--hm-egri-2)">${ad}′(x)</span><span style="--r:var(--hm-egri-3)" class="kesik">teğet</span></div>
          <div class="hm-grafik-yer"></div>
          <div class="hm-eylemler">
            <label class="hm-deger">x = <input type="text" inputmode="decimal" placeholder="1"> <button type="button" class="hm-btn ince" data-ac="teget">Bu noktada türev ve teğet</button></label>
          </div>
          <p class="hm-deger-sonuc"></p>
        </div>`;
      const yer = sonuc.querySelector('.hm-grafik-yer');
      let odak = [];
      try { const a = M().analiz(r.ifade); odak = [...a.kokler.map((x) => ({ x, y: 0 })), ...a.tepeler.map((t) => ({ x: t.x, y: t.y }))]; } catch (e) { /* sığdırma için yalnızca */ }
      let g = grafikKur(yer, [{ f, renk: RENK(1) }, { f: df, renk: RENK(2) }], [], [], odak);
      const giris = sonuc.querySelector('.hm-deger input'), cikis = sonuc.querySelector('.hm-deger-sonuc');
      const teget = () => {
        try {
          const a = M().islem(M().latexCevir(giris.value.replace(/π/g, '\\pi')), {}).deger, fa = f(a), m = df(a);
          if (!isFinite(fa) || !isFinite(m)) { cikis.textContent = 'Bu noktada fonksiyon ya da türevi tanımsız.'; return; }
          const b = fa - m * a;
          cikis.innerHTML = `${ad}(${esc(sayi(a))}) = <b>${esc(sayi(fa))}</b> · ${ad}′(${esc(sayi(a))}) = <b>${esc(sayi(m))}</b> (teğetin eğimi)<br>Teğet doğrusu: <b>y = ${esc(sayi(m))}x ${b < 0 ? '−' : '+'} ${esc(sayi(Math.abs(b)))}</b>`;
          g.ayarla({ noktalar: [{ x: a, y: fa, renk: RENK(3) }], dogrular: [{ f: (x) => m * x + b, renk: RENK(3), kesikli: true }] });
        } catch (e) { cikis.textContent = 'Geçerli bir x değeri yaz (ör. 1, −2, π/4).'; }
      };
      sonuc.querySelector('[data-ac="teget"]').addEventListener('click', teget);
      giris.addEventListener('keydown', (e) => { if (e.key === 'Enter') teget(); });
    }

    const sayiYaz = (v, ipucu) => { for (const p of ipucu || []) if (Math.abs(p.x - v) < 1e-9 * Math.max(1, Math.abs(v))) return p.tex; return M().sayiYaz(v); };
    const piKat = (adim) => { // k·adım: 2kπ, kπ, kπ/2
      const k = M().kesirBul(adim / Math.PI, 24);
      if (!k) return sayiTex(adim) + 'k';
      return k.q === 1 ? (k.p === 1 ? '' : k.p) + 'k\\pi' : '\\frac{' + (k.p === 1 ? '' : k.p) + 'k\\pi}{' + k.q + '}';
    };
    const derece = (v) => { const d = v * 180 / Math.PI; return Math.abs(d - Math.round(d)) < 1e-7 ? String(Math.round(d)) : sayiTex(d); };
    function denklemGoster(r) {
      const d = r.denklem, x = r.degisken || 'x';
      const f = M().derle(r.ifade, x);
      const baslik = `<div class="hm-baslik">${kutu(M().tex(r.sol) + '=' + M().tex(r.sag))}</div>`;
      let yol = '', govde = '', noktalar = [], odak = [];
      if (d.yol === 'delta') {
        const { a, b, c, delta } = d;
        yol = `<ol class="hm-yol">
          <li>Denklem <b>ax² + bx + c = 0</b> biçiminde: a = ${esc(sayi(a))}, b = ${esc(sayi(b))}, c = ${esc(sayi(c))}</li>
          <li>${kutu('\\Delta=b^2-4ac=' + (b < 0 ? '(' + sayiTex(b) + ')' : sayiTex(b)) + '^2-4\\cdot' + (a < 0 ? '(' + sayiTex(a) + ')' : sayiTex(a)) + '\\cdot' + (c < 0 ? '(' + sayiTex(c) + ')' : sayiTex(c)) + '=' + sayiTex(delta))}</li>
          <li>${delta > 0 ? 'Δ > 0 olduğu için iki farklı gerçek kök var:' : delta === 0 ? 'Δ = 0 olduğu için iki kat kök (tek kök) var:' : 'Δ < 0 olduğu için gerçek kök yok.'}</li>
          ${delta >= 0 ? `<li>${kutu('x_{1,2}=\\frac{-b\\mp\\sqrt{\\Delta}}{2a}')}</li>` : ''}
        </ol>`;
      } else if (d.yol === 'dogrusal') yol = '<p class="hm-mini">Birinci dereceden denklem: x yalnız bırakıldı.</p>';
      else if (d.yol === 'carpan') yol = `<ol class="hm-yol"><li>Çarpanlarına ayrılır: ${kutu(d.carpanlar + '=0')}</li><li>Çarpımın sıfır olması için çarpanlardan biri sıfır olmalı:</li></ol>`;
      else if (d.yol === 'ozdeslik') yol = '';
      else if (d.yol === 'trig') yol = `<p class="hm-mini">Trigonometrik denklem: bir periyottaki (${esc(M().tamBicim(d.periyot) ? M().tamBicim(d.periyot).metin : sayi(d.periyot))}) kökler bulunur, sonra periyot eklenerek bütün kökler yazılır.</p>`;
      else yol = '<p class="hm-mini">Kökler sayısal olarak bulundu.</p>';

      if (d.yol === 'ozdeslik') {
        govde = '<p class="hm-buyuk-yazi">Her x için doğru</p><p class="hm-mini">Bu bir özdeşlik: iki taraf her zaman eşit. Çözüm kümesi tanımlı olduğu bütün gerçek sayılar.</p>';
      } else if (d.yol === 'trig') {
        if (!d.kokler.length) govde = '<p><b>Gerçek sayılarda çözümü yok.</b></p>';
        else {
          const aile = d.aileler.map((a) => kutu(x + '=' + (Math.abs(a.r) < 1e-12 ? '' : sayiYaz(a.r) + '+') + piKat(a.adim), 'buyuk vurgu')).join('');
          govde = `<div class="hm-kokler">${aile}</div><p class="hm-mini">k ∈ ℤ (k herhangi bir tam sayı) · Derece: ${d.aileler.map((a) => esc(derece(a.r).replace('{,}', ',')) + '° + k·' + esc(derece(a.adim).replace('{,}', ',')) + '°').join(' ; ')}</p>
            <p class="hm-mini"><b>[0, 2π) aralığındaki kökler:</b> ${d.ikiPi.map((v) => esc(M().tamBicim(v) ? M().tamBicim(v).metin : sayi(v)) + ' (' + esc(derece(v).replace('{,}', ',')) + '°)').join(' · ')}</p>`;
        }
        noktalar = d.ikiPi.map((v) => ({ x: v, y: 0, renk: RENK(3), etiket: M().tamBicim(v) ? M().tamBicim(v).metin : sayi(v) }));
        odak = [{ x: 0, y: 0 }, { x: 2 * Math.PI, y: 0 }];
      } else {
        const ipucu = d.kokTex || [];
        const gos = d.kokler.slice(0, 10);
        govde = `<div class="hm-kokler">${gos.length ? gos.map((k, n) => kutu((d.kokler.length > 1 ? x + '_{' + (n + 1) + '}' : x) + '=' + sayiYaz(k, ipucu), 'buyuk vurgu')).join('') : d.araliklar && d.araliklar.length ? '' : '<p><b>Gerçek sayılarda çözümü yok.</b></p>'}</div>
          ${d.kokler.length > 10 ? `<p class="hm-mini">… toplam ${d.kokler.length} kök (ilk 10'u gösterildi)</p>` : ''}
          ${d.kumeTex ? `<p class="hm-mini">Çözüm kümesi:</p>${kutu('\\text{Ç.K.}=' + d.kumeTex, 'vurgu')}` : d.kokler.length ? `<p class="hm-mini">Çözüm kümesi: {${d.kokler.slice(0, 10).map((k) => esc(sayi(k))).join(' ; ')}}</p>` : ''}`;
        noktalar = gos.map((k) => ({ x: k, y: 0, renk: RENK(3), etiket: x + ' = ' + sayi(k) }));
        odak = noktalar.map((n) => ({ x: n.x, y: 0 }));
      }
      sonuc.innerHTML = `
        <div class="hm-kart">
          ${baslik}
          ${yol}
          ${govde}
          <div class="hm-grafik-yer"></div>
          <p class="hm-mini">Grafik: sol taraf − sağ taraf. Köklerde x eksenini keser.</p>
        </div>`;
      const g = grafikKur(sonuc.querySelector('.hm-grafik-yer'), [{ f, renk: RENK(1) }], noktalar, [], odak);
      if (d.araliklar && d.araliklar.length) g.ayarla({ araliklar: d.araliklar.map((a) => ({ ...a, renk: RENK(3) })) });
    }

    // eşitsizlik: çözüm kümesi, işaret tablosu, grafikte aralıklar
    function esitsizlikGoster(r, l) {
      const E = r.esitsizlik;
      if (E.karsilastirma) {
        sonuc.innerHTML = `<div class="hm-kart"><div class="hm-baslik">${kutu(l)}</div><p class="hm-buyuk-yazi">${E.dogru ? 'Doğru ✓' : 'Yanlış ✗'}</p></div>`;
        return;
      }
      const x = r.degisken;
      const T = E.tablo;
      let tablo = '';
      if (T) {
        const hucre = (icerik, sinif) => `<td class="${sinif || ''}">${icerik}</td>`;
        let ust = hucre('−∞', 'uc'), alt = hucre('');
        T.isaretler.forEach((isr, i) => {
          ust += hucre(''); alt += hucre(isr === '+' ? '+' : isr === '−' ? '−' : isr, 'isaret ' + (isr === '+' ? 'arti' : isr === '−' ? 'eksi' : 'yok'));
          if (i < T.noktalar.length) { ust += hucre(kutu(T.noktalar[i].tex, 'kucuk'), 'nokta'); alt += hucre(T.noktalar[i].isaret, 'nokta-isaret'); }
        });
        ust += hucre('+∞', 'uc'); alt += hucre('');
        tablo = `<div class="hm-tablo-kap"><table class="hm-tablo" aria-label="İşaret tablosu"><tr><th>${esc(x)}</th>${ust}</tr><tr><th>f(${esc(x)})</th>${alt}</tr></table></div>
          <p class="hm-mini">f(${esc(x)}) = sol taraf − sağ taraf. 0: kök, ∄: tanımsız.</p>
          ${T.carpanlar ? `<div class="hm-mini">Çarpanlarına ayrılmış hâli:</div>${kutu('f(' + x + ')=' + T.carpanlar.tex)}` : ''}`;
      }
      sonuc.innerHTML = `
        <div class="hm-kart">
          <div class="hm-baslik">${kutu(l)}</div>
          <div class="hm-esittir">${kutu('\\text{Ç.K.}=' + E.tex, (E.tex.length > 46 ? 'orta' : 'buyuk') + ' vurgu')}</div>
          ${tablo}
          <div class="hm-grafik-yer"></div>
          <p class="hm-mini">Grafikte koyu bant: eşitsizliği sağlayan ${esc(x)} değerleri (dolu yuvarlak: dahil, boş yuvarlak: dahil değil).</p>
        </div>`;
      // her zincirin sabit olmayan parçaları eğri, sabit olanları kesikli doğru
      const egriler = [], dogrular = [];
      let renkNo = 1;
      for (const z of (M().anla(l).zincirler || [])) for (const p of z.parcalar) {
        const fp = M().derle(p, x);
        if (M().degiskenler(p).length) { if (renkNo <= 3) egriler.push({ f: fp, renk: RENK(renkNo++) }); }
        else { const c = fp(0); if (isFinite(c) && c !== 0) dogrular.push({ f: () => c, renk: RENK(2), kesikli: true }); }
      }
      const sinir = E.sinirlar.filter((s) => Math.abs(s.x) < 1e5).map((s) => ({ x: s.x, y: 0 }));
      const g = grafikKur(sonuc.querySelector('.hm-grafik-yer'), egriler, [], dogrular, sinir.length ? sinir : [{ x: -3, y: 0 }, { x: 3, y: 0 }]);
      g.ayarla({ araliklar: E.parcalar.map((p) => ({ ...p, renk: RENK(3) })) });
    }

    // denklem sistemi
    function sistemGoster(r, l) {
      const S = r.sistem, v = S.degiskenler;
      const ikili = (c) => '\\left(' + c.map((t) => sayiYaz(t)).join(',\\ ') + '\\right)';
      let cozum;
      if (S.tur === 'tek') cozum = S.cozumler.map((c) => kutu(c.map((t, i) => v[i] + '=' + sayiYaz(t)).join(',\\ '), 'buyuk vurgu')).join('') + kutu('\\text{Ç.K.}=\\left\\{' + S.cozumler.map(ikili).join(',\\ ') + '\\right\\}');
      else if (S.tur === 'sonsuz') cozum = '<p class="hm-buyuk-yazi">Sonsuz çözüm var</p><p class="hm-mini">Denklemler birbirinin katı: aynı doğruyu (düzlemi) belirtiyorlar.</p>';
      else cozum = '<p class="hm-buyuk-yazi">Çözüm yok</p><p class="hm-mini">' + (S.dogrusal ? 'Denklemler çelişiyor: doğrular paralel, kesişmiyorlar.' : 'Ortak çözüm bulunamadı.') + '</p>';
      sonuc.innerHTML = `
        <div class="hm-kart">
          <div class="hm-baslik">${kutu(l)}</div>
          <div class="hm-kokler">${cozum}</div>
          ${S.adimlar ? adimListe(S.adimlar) : ''}
          ${v.length === 2 ? '<div class="hm-grafik-yer"></div><p class="hm-mini">Her denklemin grafiği; ortak çözümler kesişim noktalarıdır.</p>' : ''}
        </div>`;
      const yer = sonuc.querySelector('.hm-grafik-yer');
      if (!yer) return;
      const egriler = S.egriler.map((e, i) => (e ? { f: M().derle(e, v[0]), renk: RENK(i + 1) } : null)).filter(Boolean);
      const kapali = S.ifadeler.map((e, i) => (S.egriler[i] ? null : { F: M().derle2(e, v[0], v[1]), renk: RENK(i + 1) })).filter(Boolean);
      const noktalar = S.cozumler.map((c) => ({ x: c[0], y: c[1], renk: RENK(3), etiket: '(' + sayi(c[0]) + ' ; ' + sayi(c[1]) + ')' }));
      const g = grafikKur(yer, egriler, noktalar, [], noktalar.length ? noktalar : [{ x: -4, y: 0 }, { x: 4, y: 0 }]);
      if (kapali.length) g.ayarla({ kapali });
    }

    // Σ'nın n'ye bağlı kapalı biçimi
    function toplamNGoster(r, l) {
      const T = r.toplamN, n = r.degisken;
      sonuc.innerHTML = `
        <div class="hm-kart">
          <div class="hm-baslik">${kutu(r.fonksiyonTex)}</div>
          <div class="hm-esittir">${kutu('=' + T.tex, 'buyuk vurgu')}</div>
          ${T.acik !== T.tex ? `<p class="hm-mini">Açılmış hâli:</p>${kutu('=' + T.acik)}` : ''}
          <ul class="hm-bilgi"><li><b>İlk değerler</b> ${T.ornek.map((o) => esc(n + ' = ' + o.n + ' → ' + sayi(o.deger))).join(' · ')}</li></ul>
          <p class="hm-mini">Kapalı biçim ilk değerlerden bulunan polinomdur; ${esc(n)}'nin her değeri için toplamla aynı sonucu verir.</p>
        </div>`;
    }

    // ------------------------------------------------ fotoğraf
    const dosya = $('.hm-dosya');
    $('.hm-foto-btn').addEventListener('click', () => { dosya.value = ''; dosya.click(); });
    dosya.addEventListener('change', () => { if (dosya.files && dosya.files[0]) kirpmaAc(dosya.files[0]); });

    // fotoğraftaki işlemi bul (hesap-goruntu.js): çerçeve açılırken onun üstüne konur
    function otomatikCerceve(img, odak) {
      const G = kok.HesapGoruntu;
      if (!G || !img.naturalWidth) return null;
      try {
        const olcek = Math.min(1, 900 / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * olcek)), h = Math.max(1, Math.round(img.naturalHeight * olcek));
        const tv = document.createElement('canvas'); tv.width = w; tv.height = h;
        const g = tv.getContext('2d', { willReadFrequently: true });
        g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h);
        const v = g.getImageData(0, 0, w, h).data, gri = new Uint8ClampedArray(w * h);
        for (let i = 0, j = 0; i < v.length; i += 4, j++) gri[j] = Math.round(0.2126 * v[i] + 0.7152 * v[i + 1] + 0.0722 * v[i + 2]);
        const t = G.temizle({ w, h, d: gri }, odak ? { odak: { x: odak.x * w, y: odak.y * h } } : {});
        if (!t) return null;
        const k = t.kutu, py = (t.harf || 10) * 0.8, px = (t.harf || 10) * 1.2;
        const x0 = Math.max(0, k.x0 - px), y0 = Math.max(0, k.y0 - py), x1 = Math.min(w, k.x1 + px), y1 = Math.min(h, k.y1 + py);
        if ((x1 - x0) < w * 0.04 || (y1 - y0) < h * 0.02) return null;
        return { x: x0 / w, y: y0 / h, w: (x1 - x0) / w, h: (y1 - y0) / h };
      } catch (e) { return null; }
    }
    function kirpmaAc(file, oncekiCerceve) {
      durum.sonFoto = file;
      const url = URL.createObjectURL(file);
      const katman = document.createElement('div');
      katman.className = 'hm-kirp-katman';
      katman.innerHTML = `
        <div class="hm-kirp-kart" role="dialog" aria-label="Fotoğrafta işlemi seç">
          <h3>İşlemi çerçevenin içine al</h3>
          <p class="hm-mini">Çerçeve işlemi kendisi bulur. Yanlış yerdeyse fotoğrafta işlemin üstüne <b>dokun</b>, ya da çerçeveyi sürükle, köşesinden büyüt.</p>
          <div class="hm-kirp-alan"><img alt="Seçilen fotoğraf"><div class="hm-cerceve"><i data-k="sol-ust"></i><i data-k="sag-ust"></i><i data-k="sol-alt"></i><i data-k="sag-alt"></i></div></div>
          <div class="hm-kirp-durum" aria-live="polite"></div>
          <div class="hm-kirp-tuslar"><button type="button" class="hm-btn ince" data-k="vazgec">Vazgeç</button><button type="button" class="hm-btn" data-k="oku">Oku ve çöz</button></div>
        </div>`;
      kap.appendChild(katman);
      const img = katman.querySelector('img'), cer = katman.querySelector('.hm-cerceve'), alan = katman.querySelector('.hm-kirp-alan');
      const kapat = () => { URL.revokeObjectURL(url); katman.remove(); };
      let c = { x: 0.06, y: 0.3, w: 0.88, h: 0.4 }; // görüntüye oranla
      const yerlestir = () => { Object.assign(cer.style, { left: c.x * 100 + '%', top: c.y * 100 + '%', width: c.w * 100 + '%', height: c.h * 100 + '%' }); };
      img.onload = () => {
        if (oncekiCerceve) c = { ...oncekiCerceve };
        else if (img.naturalHeight < img.naturalWidth * 0.35) c = { x: 0.02, y: 0.04, w: 0.96, h: 0.92 };
        yerlestir();
        // işlemi kendisi bulur: çerçeve onun üstüne geçer (bulamazsa ortada kalır)
        if (!oncekiCerceve) setTimeout(() => { const o = otomatikCerceve(img); if (o && !tut) { c = o; yerlestir(); } }, 30);
      };
      img.src = url;
      let tut = null;
      alan.addEventListener('pointerdown', (e) => {
        const r = alan.getBoundingClientRect(), kose = e.target.dataset && e.target.dataset.k;
        // çerçevenin dışına dokunuş: oradaki işlemi bul, çerçeve onu sarsın
        if (!cer.contains(e.target)) {
          const o = otomatikCerceve(img, { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
          if (o) { c = o; yerlestir(); }
          e.preventDefault();
          return;
        }
        tut = { kose, x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, c: { ...c } };
        alan.setPointerCapture(e.pointerId); e.preventDefault();
      });
      alan.addEventListener('pointermove', (e) => {
        if (!tut) return;
        const r = alan.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height, dx = x - tut.x, dy = y - tut.y, o = tut.c;
        const kis = (v, a, b) => Math.max(a, Math.min(b, v)), en = 0.05;
        if (!tut.kose) c = { ...o, x: kis(o.x + dx, 0, 1 - o.w), y: kis(o.y + dy, 0, 1 - o.h) };
        else {
          let { x: x0, y: y0 } = o, x1 = o.x + o.w, y1 = o.y + o.h;
          if (/sol/.test(tut.kose)) x0 = kis(o.x + dx, 0, x1 - en); else x1 = kis(x1 + dx, x0 + en, 1);
          if (/ust/.test(tut.kose)) y0 = kis(o.y + dy, 0, y1 - en); else y1 = kis(y1 + dy, y0 + en, 1);
          c = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
        }
        yerlestir();
      });
      alan.addEventListener('pointerup', () => { tut = null; });
      katman.addEventListener('click', async (e) => {
        const k = e.target.dataset && e.target.dataset.k;
        if (k === 'vazgec' || e.target === katman) { kapat(); return; }
        if (k !== 'oku') return;
        const tusOku = e.target; tusOku.disabled = true;
        const durumYer = katman.querySelector('.hm-kirp-durum');
        try {
          const parca = await kirpilmis(img, c);
          const latex = await okut(parca, (m) => { durumYer.innerHTML = m; });
          durum.sonCerceve = { ...c }; durum.sonOkunan = latex;
          kapat();
          mf.value = latex;
          canliOnizleme();
          coz();
          const hata = !!sonuc.querySelector('.hm-hata');
          const not = document.createElement('div'); not.className = 'hm-not hm-okundu';
          not.innerHTML = (hata ? '📷 Fotoğraftan okuduğum işlem eksik ya da yanlış görünüyor. Çerçeve işlemin tamamını almamış olabilir.'
            : '📷 Fotoğraftan okundu. Yanlış okuduysam yukarıda düzelt ve <b>=</b> tuşuna bas.') +
            ' <button type="button" class="hm-btn ince" data-ac="cerceve">✂️ Çerçeveyi düzelt</button>';
          not.querySelector('[data-ac="cerceve"]').addEventListener('click', () => { if (durum.sonFoto) kirpmaAc(durum.sonFoto, durum.sonCerceve); });
          sonuc.prepend(not);
        } catch (err) {
          tusOku.disabled = false;
          durumYer.innerHTML = '<span class="hm-hata-yazi">Okuyamadım: ' + esc(String((err && err.message) || err)) + '</span>';
        }
      });
    }
    function kirpilmis(img, c) {
      const sx = Math.round(c.x * img.naturalWidth), sy = Math.round(c.y * img.naturalHeight);
      const sw = Math.max(8, Math.round(c.w * img.naturalWidth)), sh = Math.max(8, Math.round(c.h * img.naturalHeight));
      const olcek = Math.min(1, 1600 / Math.max(sw, sh)); // okuyucu zaten 384'e indirir; büyük fotoğraf boşuna taşınmasın
      const tv = document.createElement('canvas');
      tv.width = Math.round(sw * olcek); tv.height = Math.round(sh * olcek);
      const g = tv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, tv.width, tv.height);
      g.drawImage(img, sx, sy, sw, sh, 0, 0, tv.width, tv.height);
      return new Promise((res) => tv.toBlob(res, 'image/png'));
    }
    function okuyucu() {
      if (durum.okuyucu) return durum.okuyucu;
      const o = ayar.okuyucu || {};
      const isci = new Worker(o.isci, { type: 'module' });
      const bekleyen = new Map();
      let ilerlemeFn = null;
      const dosyalar = {};
      isci.onmessage = (e) => {
        const m = e.data;
        if (m.tur === 'ilerleme' && ilerlemeFn) {
          dosyalar[m.dosya] = m;
          const yuk = Object.values(dosyalar).reduce((s, d) => s + d.yuklendi, 0), top = Object.values(dosyalar).reduce((s, d) => s + d.toplam, 0);
          ilerlemeFn(`Okuyucu iniyor (yalnızca ilk sefer): <b>${Math.round(yuk / 1e6)} / ${Math.round(Math.max(top, 76e6) / 1e6)} MB</b><div class="hm-cubuk"><i style="width:${Math.min(100, yuk / Math.max(top, 76e6) * 100)}%"></i></div>`);
        }
        if ((m.tur === 'sonuc' || m.tur === 'hata') && bekleyen.has(m.no)) { const b = bekleyen.get(m.no); bekleyen.delete(m.no); m.tur === 'sonuc' ? b.res(m.latex) : b.rej(new Error(m.hata)); }
      };
      isci.onerror = (e) => { for (const b of bekleyen.values()) b.rej(new Error(e.message || 'okuyucu başlatılamadı')); bekleyen.clear(); durum.okuyucu = null; };
      durum.okuyucu = {
        oku(gorsel, ilerle) {
          ilerlemeFn = ilerle;
          const no = ++durum.okumaNo;
          return new Promise((res, rej) => { bekleyen.set(no, { res, rej }); isci.postMessage({ tur: 'oku', no, gorsel, ayar: { kutuphane: o.kutuphane, model: o.model || 'alephpi/FormulaNet', uzak: o.uzak, yerel: o.yerel, wasm: o.wasm } }); });
        },
      };
      return durum.okuyucu;
    }
    async function okut(gorsel, ilerle) {
      if (ayar.okuyucuSahte) return ayar.okuyucuSahte(gorsel); // denemeler için
      ilerle('Okuyorum… <span class="hm-mini">(ilk seferde okuyucu iner, biraz sürer)</span>');
      const t0 = Date.now();
      const latex = await okuyucu().oku(gorsel, ilerle);
      if (!String(latex || '').trim()) throw new Error('fotoğrafta işlem bulamadım; çerçeveyi işlemin üstüne daralt');
      if (ayar.okundu) ayar.okundu(latex, Date.now() - t0);
      return latex;
    }

    return { mf, coz, ekle, durum, kirpmaAc, otomatikCerceve, fotoOku: (gorsel) => okut(gorsel, () => {}) };
  }
  kok.HesapUI = { baslat };
})(typeof window !== 'undefined' ? window : globalThis);
