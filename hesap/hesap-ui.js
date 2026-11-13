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

  // Tuş takımı: [etiket (HTML), eylem]. Eylem: { ekle: LaTeX } | { komut } | özel ad
  const TUSLAR = {
    temel: [
      [['◀', { komut: 'moveToPreviousChar' }, 'k'], ['▶', { komut: 'moveToNextChar' }, 'k'], ['DEG', 'aci', 'k aci'], ['ANS', 'ans', 'k'], ['⇄', 'katman', 'k'], ['⌫', { komut: 'deleteBackward' }, 'k sil']],
      [['sin', { ekle: '\\sin\\left(#0\\right)' }, 'f'], ['cos', { ekle: '\\cos\\left(#0\\right)' }, 'f'], ['tan', { ekle: '\\tan\\left(#0\\right)' }, 'f'], ['ln', { ekle: '\\ln\\left(#0\\right)' }, 'f'], ['log', { ekle: '\\log\\left(#0\\right)' }, 'f'], ['π', { ekle: '\\pi' }, 'f']],
      [['x', { ekle: 'x' }, 'f x'], ['x<sup>n</sup>', { ekle: '#@^{#?}', ad: 'üs' }, 'f'], ['x²', { ekle: '#@^{2}' }, 'f'], ['√', { ekle: '\\sqrt{#0}' }, 'f'], ['<span class="hm-kesir"><i>a</i><i>b</i></span>', { ekle: '\\frac{#@}{#?}', ad: 'kesir' }, 'f'], ['e', { ekle: 'e' }, 'f']],
      [['7', { ekle: '7' }], ['8', { ekle: '8' }], ['9', { ekle: '9' }], ['÷', { ekle: '\\div ' }, 'i'], ['(', { ekle: '(' }, 'i'], [')', { ekle: ')' }, 'i']],
      [['4', { ekle: '4' }], ['5', { ekle: '5' }], ['6', { ekle: '6' }], ['×', { ekle: '\\times ' }, 'i'], ['|x|', { ekle: '\\left|#0\\right|' }, 'i'], ['n!', { ekle: '!' }, 'i']],
      [['1', { ekle: '1' }], ['2', { ekle: '2' }], ['3', { ekle: '3' }], ['−', { ekle: '-' }, 'i'], ['=', { ekle: '=' }, 'i'], ['AC', 'temizle', 'i sil']],
      [['0', { ekle: '0' }], [',', { ekle: '{,}' }], ['f(x)=', { ekle: 'f(x)=' }, 'i kucuk'], ['+', { ekle: '+' }, 'i'], ['Çöz', 'coz', 'coz g2']],
    ],
    diger: [
      [['◀', { komut: 'moveToPreviousChar' }, 'k'], ['▶', { komut: 'moveToNextChar' }, 'k'], ['DEG', 'aci', 'k aci'], ['ANS', 'ans', 'k'], ['⇄', 'katman', 'k etkin'], ['⌫', { komut: 'deleteBackward' }, 'k sil']],
      [['sin⁻¹', { ekle: '\\arcsin\\left(#0\\right)' }, 'f kucuk'], ['cos⁻¹', { ekle: '\\arccos\\left(#0\\right)' }, 'f kucuk'], ['tan⁻¹', { ekle: '\\arctan\\left(#0\\right)' }, 'f kucuk'], ['cot', { ekle: '\\cot\\left(#0\\right)' }, 'f'], ['log<sub>a</sub>', { ekle: '\\log_{#?}\\left(#?\\right)' }, 'f'], ['°', { ekle: '^{\\circ}' }, 'f']],
      [['d/dx', { ekle: '\\frac{d}{dx}\\left(#0\\right)' }, 'f kucuk'], ['y=', { ekle: 'y=' }, 'f'], ['e<sup>x</sup>', { ekle: 'e^{#?}' }, 'f'], ['<sup>n</sup>√', { ekle: '\\sqrt[#?]{#?}' }, 'f'], ['10<sup>x</sup>', { ekle: '10^{#?}' }, 'f'], ['%', { ekle: '\\%' }, 'f']],
    ],
  };

  function baslat(kap, ayar = {}) {
    const durum = { derece: ayar.derece !== false, katman: 'temel', ans: null, gecmis: [], okuyucu: null, okumaNo: 0 };
    kap.classList.add('hm');
    kap.innerHTML = `
      <div class="hm-ust">
        <div class="hm-giris">
          <math-field class="hm-alan" aria-label="İşlem" placeholder="\\text{Yaz ya da 📷}"></math-field>
          <button class="hm-foto-btn" type="button" aria-label="Fotoğraftan oku" title="Fotoğraftan oku">📷</button>
        </div>
        <div class="hm-onizleme" aria-live="polite"></div>
      </div>
      <div class="hm-sonuc" aria-live="polite"></div>
      <div class="hm-tuslar" role="group" aria-label="Hesap makinesi tuşları"></div>
      <button class="hm-tus-ac" type="button" aria-label="Tuşları aç">⌨ Tuşlar</button>
      <input class="hm-dosya" type="file" accept="image/*" capture="environment" hidden>`;
    const $ = (s) => kap.querySelector(s);
    const mf = $('.hm-alan'), sonuc = $('.hm-sonuc'), onizleme = $('.hm-onizleme'), tuslar = $('.hm-tuslar');
    // dar dikey ekranda (telefon) Çöz'den sonra tuşlar kapanır, sonuç bütün ekranı kullanır; kutuya dokununca geri gelir
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

    // ------------------------------------------------ tuş takımı
    function tuslariCiz() {
      const satirlar = TUSLAR[durum.katman];
      const tamSatirlar = durum.katman === 'diger' ? [...satirlar, ...TUSLAR.temel.slice(3)] : satirlar;
      tuslar.innerHTML = tamSatirlar.map((s) => s.map(([etiket, eylem, sinif]) => {
        const i = JSON.stringify(eylem).replace(/"/g, '&quot;');
        const lbl = eylem === 'aci' ? (durum.derece ? 'DEG' : 'RAD') : etiket;
        return `<button type="button" class="hm-tus ${sinif || 's'}" data-e="${i}" aria-label="${esc(eylem && eylem.ad ? eylem.ad : lbl.replace(/<[^>]+>/g, ''))}"><span>${lbl}</span></button>`;
      }).join('')).join('');
    }
    tuslariCiz();
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
      if (eylem === 'temizle') { mf.value = ''; onizleme.textContent = ''; odakla(); return; }
      if (eylem === 'katman') { durum.katman = durum.katman === 'temel' ? 'diger' : 'temel'; tuslariCiz(); return; }
      if (eylem === 'aci') { durum.derece = !durum.derece; tuslariCiz(); canliOnizleme(); return; }
      if (eylem === 'ans') { if (durum.ans) ekle(durum.ans); return; }
      if (eylem.komut) { odakla(); mf.executeCommand(eylem.komut); onizlemeSonra(); return; }
      if (eylem.ekle) ekle(eylem.ekle);
    }
    const odakla = () => { if (document.activeElement !== mf) mf.focus(); };
    function ekle(latex) {
      odakla();
      mf.executeCommand(['insert', latex, { selectionMode: 'placeholder', format: 'latex', mode: 'math' }]);
      if (durum.katman === 'diger') { durum.katman = 'temel'; tuslariCiz(); }
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
    mf.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); coz(); } });

    // yazarken sonucu küçükçe göster (yalnızca işlemlerde)
    function canliOnizleme() {
      const l = mf.value;
      if (!l.trim()) { onizleme.textContent = ''; return; }
      try {
        const a = M().anla(l);
        if (a.tur === 'islem') { const r = M().islem(a.ifade, { derece: durum.derece }); onizleme.textContent = isFinite(r.deger) || !isNaN(r.deger) ? '= ' + (r.tam ? r.tam.metin.replace('-', '−') + '  ≈ ' : '') + sayi(r.deger) : ''; }
        else onizleme.textContent = { fonksiyon: '📈 Çöz: grafiği ve kökleri', turev: "📐 Çöz: türevi adım adım", denklem: '🔎 Çöz: denklemin kökleri' }[a.tur] || '';
      } catch (e) { onizleme.textContent = ''; }
    }

    // ------------------------------------------------ çözüm ve gösterim
    const kutu = (latex, sinif = '') => `<math-field read-only class="hm-statik ${sinif}">${esc(latex)}</math-field>`;
    function coz() {
      const l = mf.value.trim();
      if (!l) { sonuc.innerHTML = `<p class="hm-not">Önce bir işlem yaz ya da 📷 ile fotoğrafını çek.</p>`; return; }
      let r;
      try { r = M().coz(l, { derece: durum.derece }); } catch (e) {
        sonuc.innerHTML = `<div class="hm-kart hm-hata"><b>Bunu çözemedim</b><p>${esc(hataMetni(e))}</p></div>`;
        return;
      }
      if (r.tur === 'islem') islemGoster(l, r);
      else if (r.tur === 'fonksiyon') fonksiyonGoster(r);
      else if (r.tur === 'turev') turevGoster(r);
      else if (r.tur === 'denklem') denklemGoster(r);
      sonuc.scrollTop = 0;
      if (dar() && r.tur !== 'islem') tuslarAcik(false); // işlemde yeni işlem yazılır; grafik, türev ve denklemde sonuca yer aç
      if (ayar.cozuldu) ayar.cozuldu(r);
    }
    const hataMetni = (e) => {
      const m = String((e && e.message) || e);
      if (/eksik|beklenmeyen|fazladan/.test(m)) return 'İşlemde eksik ya da fazla bir parça var gibi. Parantezleri ve boş kutucukları kontrol et.';
      if (/tanınmayan/.test(m)) return 'Tanımadığım bir işaret var: ' + m.split(':').pop() + '. Tuşlardan yazmayı dene.';
      return 'Hesaplanamadı (' + m + ').';
    };

    function islemGoster(l, r) {
      const s = r.islem;
      const anaTex = s.tam ? s.tam.tex : sayiTex(s.deger);
      durum.ans = s.tam ? s.tam.tex : sayiTex(s.deger);
      durum.gecmis.unshift({ l, tex: anaTex });
      durum.gecmis = durum.gecmis.slice(0, 8);
      sonuc.innerHTML = `
        <div class="hm-kart hm-islem">
          <div class="hm-esittir">${kutu('=' + anaTex, 'buyuk')}</div>
          ${s.tam && isFinite(s.deger) ? `<div class="hm-yaklasik">≈ ${esc(sayi(s.deger))}</div>` : ''}
          ${/sin|cos|tan|cot/.test(r.ifade) ? `<div class="hm-mini">${durum.derece ? 'Açılar derece cinsinden' : 'Açılar radyan cinsinden'} · DEG/RAD tuşuyla değiştir</div>` : ''}
        </div>
        ${durum.gecmis.length > 1 ? `<div class="hm-gecmis"><h4>Son işlemler</h4>${durum.gecmis.slice(1).map((g, k) => `<button type="button" class="hm-gecmis-satir" data-g="${k + 1}">${kutu(g.l)}<span>${kutu('=' + g.tex)}</span></button>`).join('')}</div>` : ''}`;
      sonuc.querySelectorAll('.hm-gecmis-satir').forEach((b) => b.addEventListener('click', () => { mf.value = durum.gecmis[+b.dataset.g].l; canliOnizleme(); mf.focus(); }));
    }

    const RENK = (n) => getComputedStyle(kap).getPropertyValue('--hm-egri-' + n).trim() || ['#7b5cd6', '#e0558a', '#2f9e7e'][n - 1];
    function grafikKur(yer, egriler, noktalar, dogrular, odak) {
      yer.innerHTML = `<div class="hm-grafik"><canvas aria-label="Grafik"></canvas><div class="hm-grafik-tuslar"><button type="button" data-z="0.7" aria-label="Yakınlaştır">＋</button><button type="button" data-z="1.43" aria-label="Uzaklaştır">－</button><button type="button" data-z="0" aria-label="Sığdır">⤢</button></div><div class="hm-iz"></div></div>`;
      const izYer = yer.querySelector('.hm-iz');
      const tuval = yer.querySelector('canvas');
      const g = new kok.HesapGrafik(tuval, {
        izlendi: (n) => { izYer.textContent = n ? `x = ${sayi(n.x)}   y = ${sayi(n.y)}` : ''; },
        ciftDokunus: () => g.sigdir(odak),
      });
      g.ayarla({ egriler, noktalar, dogrular });
      tuval._grafik = g;
      requestAnimationFrame(() => { g._boyut(); g.sigdir(odak); });
      yer.querySelectorAll('[data-z]').forEach((b) => b.addEventListener('click', () => { const z = +b.dataset.z; if (z) g.yakinlastir(z); else g.sigdir(odak); }));
      return g;
    }
    const nokta = (x, y) => `(${sayi(x)} ; ${sayi(y)})`;

    function fonksiyonGoster(r) {
      const a = r.analiz, ad = r.ad && r.ad !== 'y' ? r.ad + '(x)' : 'y';
      const f = M().derle(r.ifade);
      const noktalar = [
        ...a.kokler.map((x) => ({ x, y: 0, renk: RENK(3), etiket: 'x = ' + sayi(x) })),
        ...a.tepeler.map((t) => ({ x: t.x, y: t.y, renk: RENK(2), etiket: nokta(t.x, t.y) })),
      ];
      if (a.yKesen !== null && !a.kokler.some((x) => Math.abs(x) < 1e-9)) noktalar.push({ x: 0, y: a.yKesen, renk: RENK(1), etiket: '(0 ; ' + sayi(a.yKesen) + ')' });
      sonuc.innerHTML = `
        <div class="hm-kart">
          <div class="hm-baslik">${kutu(ad + '=' + r.fonksiyonTex)}</div>
          <div class="hm-grafik-yer"></div>
          <ul class="hm-bilgi">
            <li><b>Kökleri</b> ${a.kokler.length ? a.kokler.slice(0, 8).map((x) => 'x = ' + esc(sayi(x))).join(' · ') + (a.kokler.length > 8 ? ' …' : '') : 'gösterilen aralıkta yok'}</li>
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

    function denklemGoster(r) {
      const d = r.denklem, x = r.degisken || 'x';
      const kokler = d.kokler.map((k) => { const tam = M().tamBicim(k); return { k, tex: (tam ? tam.tex : sayiTex(k)) }; });
      let yol = '';
      if (d.yol === 'delta') {
        const { a, b, c, delta } = d;
        yol = `<ol class="hm-yol">
          <li>Denklem <b>ax² + bx + c = 0</b> biçiminde: a = ${esc(sayi(a))}, b = ${esc(sayi(b))}, c = ${esc(sayi(c))}</li>
          <li>${kutu('\\Delta=b^2-4ac=' + (b < 0 ? '(' + sayiTex(b) + ')' : sayiTex(b)) + '^2-4\\cdot' + (a < 0 ? '(' + sayiTex(a) + ')' : sayiTex(a)) + '\\cdot' + (c < 0 ? '(' + sayiTex(c) + ')' : sayiTex(c)) + '=' + sayiTex(delta))}</li>
          <li>${delta > 0 ? 'Δ > 0 olduğu için iki farklı gerçek kök var:' : delta === 0 ? 'Δ = 0 olduğu için iki kat kök (tek kök) var:' : 'Δ < 0 olduğu için gerçek kök yok.'}</li>
          ${delta >= 0 ? `<li>${kutu('x_{1,2}=\\frac{-b\\mp\\sqrt{\\Delta}}{2a}')}</li>` : ''}
        </ol>`;
      } else if (d.yol === 'dogrusal') yol = '<p class="hm-mini">Birinci dereceden denklem: x yalnız bırakıldı.</p>';
      else yol = '<p class="hm-mini">Kökler sayısal olarak (−100 ile 100 arasında) bulundu.</p>';
      sonuc.innerHTML = `
        <div class="hm-kart">
          <div class="hm-baslik">${kutu(M().tex(r.sol) + '=' + M().tex(r.sag))}</div>
          ${yol}
          <div class="hm-kokler">${kokler.length ? kokler.map((k, n) => kutu((kokler.length > 1 ? x + '_{' + (n + 1) + '}' : x) + '=' + k.tex, 'buyuk vurgu')).join('') : '<p><b>Gerçek sayılarda çözümü yok.</b></p>'}</div>
          ${kokler.length ? `<p class="hm-mini">Çözüm kümesi: {${kokler.map((k) => esc(sayi(k.k))).join(' ; ')}}</p>` : ''}
          <div class="hm-grafik-yer"></div>
          <p class="hm-mini">Grafik: sol taraf − sağ taraf. Köklerde x eksenini keser.</p>
        </div>`;
      const f = M().derle(r.ifade);
      grafikKur(sonuc.querySelector('.hm-grafik-yer'), [{ f, renk: RENK(1) }], d.kokler.map((k) => ({ x: k, y: 0, renk: RENK(3), etiket: x + ' = ' + sayi(k) })), [], d.kokler.map((k) => ({ x: k, y: 0 })));
    }

    // ------------------------------------------------ fotoğraf
    const dosya = $('.hm-dosya');
    $('.hm-foto-btn').addEventListener('click', () => { dosya.value = ''; dosya.click(); });
    dosya.addEventListener('change', () => { if (dosya.files && dosya.files[0]) kirpmaAc(dosya.files[0]); });

    function kirpmaAc(file) {
      const url = URL.createObjectURL(file);
      const katman = document.createElement('div');
      katman.className = 'hm-kirp-katman';
      katman.innerHTML = `
        <div class="hm-kirp-kart" role="dialog" aria-label="Fotoğrafta işlemi seç">
          <h3>İşlemi çerçevenin içine al</h3>
          <p class="hm-mini">Çerçeveyi sürükle, köşesinden büyüt ya da küçült. Yalnızca tek bir işlem ya da fonksiyon kalsın.</p>
          <div class="hm-kirp-alan"><img alt="Seçilen fotoğraf"><div class="hm-cerceve"><i data-k="sol-ust"></i><i data-k="sag-ust"></i><i data-k="sol-alt"></i><i data-k="sag-alt"></i></div></div>
          <div class="hm-kirp-durum" aria-live="polite"></div>
          <div class="hm-kirp-tuslar"><button type="button" class="hm-btn ince" data-k="vazgec">Vazgeç</button><button type="button" class="hm-btn" data-k="oku">Oku ve çöz</button></div>
        </div>`;
      kap.appendChild(katman);
      const img = katman.querySelector('img'), cer = katman.querySelector('.hm-cerceve'), alan = katman.querySelector('.hm-kirp-alan');
      const kapat = () => { URL.revokeObjectURL(url); katman.remove(); };
      let c = { x: 0.06, y: 0.3, w: 0.88, h: 0.4 }; // görüntüye oranla
      const yerlestir = () => { Object.assign(cer.style, { left: c.x * 100 + '%', top: c.y * 100 + '%', width: c.w * 100 + '%', height: c.h * 100 + '%' }); };
      img.onload = () => { if (img.naturalHeight < img.naturalWidth * 0.35) c = { x: 0.02, y: 0.04, w: 0.96, h: 0.92 }; yerlestir(); };
      img.src = url;
      let tut = null;
      alan.addEventListener('pointerdown', (e) => {
        const r = alan.getBoundingClientRect(), kose = e.target.dataset && e.target.dataset.k;
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
          kapat();
          mf.value = latex;
          canliOnizleme();
          coz();
          const not = document.createElement('p'); not.className = 'hm-not hm-okundu';
          not.innerHTML = '📷 Fotoğraftan okundu. Yanlış okuduysam yukarıda düzelt ve <b>Çöz</b>\'e bas.';
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

    return { mf, coz, ekle, durum, kirpmaAc, fotoOku: (gorsel) => okut(gorsel, () => {}) };
  }
  kok.HesapUI = { baslat };
})(typeof window !== 'undefined' ? window : globalThis);
