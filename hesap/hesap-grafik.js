/* Luna hesap makinesi — grafik çizici (tuval).
   Fonksiyonları çizer; parmakla kaydırılır, iki parmakla (ya da tekerlekle) yaklaştırılır, çift dokununca sığdırılır.
   Dokunulan yerde en yakın eğrinin noktası gösterilir. Renkler CSS değişkenlerinden okunur (tema ile değişir). */
(function (kok) {
  const guzelAdim = (aralik, hedef) => {
    const ham = aralik / hedef, us = Math.pow(10, Math.floor(Math.log10(ham))), b = ham / us;
    return (b < 1.5 ? 1 : b < 3.5 ? 2 : b < 7.5 ? 5 : 10) * us;
  };
  const etiket = (v, adim) => {
    if (Math.abs(v) < adim / 1e6) return '0';
    const basamak = Math.max(0, -Math.floor(Math.log10(adim)) + (adim / Math.pow(10, Math.floor(Math.log10(adim))) === 5 ? 0 : 0));
    return (+v.toFixed(Math.min(6, basamak))).toString().replace('.', ',').replace('-', '−');
  };

  class HesapGrafik {
    constructor(tuval, ayar = {}) {
      this.c = tuval; this.g = tuval.getContext('2d');
      this.ayar = ayar;
      this.pencere = { x0: -10, x1: 10, y0: -7, y1: 7 };
      this.egriler = []; this.noktalar = []; this.dogrular = []; this.iz = null;
      this.parmaklar = new Map(); this.son = 0;
      this._bagla();
      this._boyut();
      if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { this._boyut(); this.ciz(); }).observe(tuval);
    }
    renk(ad, yedek) {
      const v = getComputedStyle(this.c).getPropertyValue(ad).trim();
      return v || yedek;
    }
    _boyut() {
      const r = this.c.getBoundingClientRect(), k = window.devicePixelRatio || 1;
      this.w = Math.max(10, r.width); this.h = Math.max(10, r.height);
      this.c.width = Math.round(this.w * k); this.c.height = Math.round(this.h * k);
      this.g.setTransform(k, 0, 0, k, 0, 0);
      // en-boy oranı korunur: x aralığı sabit, y ona göre
      const p = this.pencere, orta = (p.y0 + p.y1) / 2, yYari = ((p.x1 - p.x0) * this.h / this.w) / 2;
      if (this.esit !== false) { p.y0 = orta - yYari; p.y1 = orta + yYari; }
    }
    px(x) { const p = this.pencere; return (x - p.x0) / (p.x1 - p.x0) * this.w; }
    py(y) { const p = this.pencere; return (p.y1 - y) / (p.y1 - p.y0) * this.h; }
    gx(px) { const p = this.pencere; return p.x0 + px / this.w * (p.x1 - p.x0); }
    gy(py) { const p = this.pencere; return p.y1 - py / this.h * (p.y1 - p.y0); }

    /** egriler: [{ f(x), renk, ad }]; noktalar: [{ x, y, etiket, renk }]; dogrular: [{ f, renk, kesikli }] */
    ayarla({ egriler, noktalar, dogrular } = {}) {
      if (egriler) this.egriler = egriler;
      if (noktalar) this.noktalar = noktalar;
      if (dogrular) this.dogrular = dogrular;
      this.iz = null;
      this.ciz();
    }
    // eğrilerin önemli kısmını (kökler, tepeler) gösterecek pencere
    sigdir(odak = []) {
      let xs = odak.map((n) => n.x).filter(isFinite);
      let x0 = -10, x1 = 10;
      if (xs.length) { const a = Math.min(...xs), b = Math.max(...xs), pay = Math.max(2, (b - a) * 0.35); x0 = Math.min(-2, a - pay); x1 = Math.max(2, b + pay); }
      const ys = [];
      for (const e of this.egriler) for (let i = 0; i <= 400; i++) { const y = e.f(x0 + (x1 - x0) * i / 400); if (isFinite(y)) ys.push(y); }
      for (const n of odak) if (isFinite(n.y)) ys.push(n.y);
      ys.sort((a, b) => a - b);
      let y0 = -7, y1 = 7;
      if (ys.length) {
        const al = ys[Math.floor(ys.length * 0.04)], ust = ys[Math.ceil(ys.length * 0.96) - 1];
        const pay = Math.max(1, (ust - al) * 0.15);
        y0 = Math.min(-1, al - pay); y1 = Math.max(1, ust + pay);
      }
      // ekrana oranlı: x ve y birimleri mümkünse eşit (en fazla 8 kat fark)
      const xBirim = (x1 - x0) / this.w, yBirim = (y1 - y0) / this.h;
      if (yBirim > xBirim && yBirim / xBirim < 8) { const ek = (yBirim * this.w - (x1 - x0)) / 2; x0 -= ek; x1 += ek; }
      else if (xBirim > yBirim) { const ek = (xBirim * this.h - (y1 - y0)) / 2; y0 -= ek; y1 += ek; }
      this.esit = false;
      this.pencere = { x0, x1, y0, y1 };
      this.ciz();
    }
    yakinlastir(k, cx = this.w / 2, cy = this.h / 2) {
      const p = this.pencere, x = this.gx(cx), y = this.gy(cy);
      this.pencere = { x0: x - (x - p.x0) * k, x1: x + (p.x1 - x) * k, y0: y - (y - p.y0) * k, y1: y + (p.y1 - y) * k };
      this.ciz();
    }
    ciz() {
      const g = this.g, w = this.w, h = this.h, p = this.pencere;
      const zemin = this.renk('--hg-zemin', '#fff'), izgara = this.renk('--hg-izgara', '#eee'), eksen = this.renk('--hg-eksen', '#888'), yazi = this.renk('--hg-yazi', '#666');
      g.clearRect(0, 0, w, h);
      g.fillStyle = zemin; g.fillRect(0, 0, w, h);
      const ax = guzelAdim(p.x1 - p.x0, Math.max(4, w / 70)), ay = guzelAdim(p.y1 - p.y0, Math.max(4, h / 55));
      g.lineWidth = 1; g.strokeStyle = izgara; g.beginPath();
      for (let x = Math.ceil(p.x0 / ax) * ax; x <= p.x1; x += ax) { const X = Math.round(this.px(x)) + 0.5; g.moveTo(X, 0); g.lineTo(X, h); }
      for (let y = Math.ceil(p.y0 / ay) * ay; y <= p.y1; y += ay) { const Y = Math.round(this.py(y)) + 0.5; g.moveTo(0, Y); g.lineTo(w, Y); }
      g.stroke();
      // eksenler
      const X0 = this.px(0), Y0 = this.py(0);
      g.strokeStyle = eksen; g.lineWidth = 1.4; g.beginPath();
      if (X0 >= 0 && X0 <= w) { g.moveTo(X0, 0); g.lineTo(X0, h); }
      if (Y0 >= 0 && Y0 <= h) { g.moveTo(0, Y0); g.lineTo(w, Y0); }
      g.stroke();
      // sayılar (eksen ekranda değilse kenarda)
      g.fillStyle = yazi; g.font = '11px system-ui, sans-serif';
      const ly = Math.min(h - 4, Math.max(12, Y0 + 13)), lx = Math.min(w - 4, Math.max(4, X0 - 5));
      g.textAlign = 'center';
      for (let x = Math.ceil(p.x0 / ax) * ax; x <= p.x1; x += ax) if (Math.abs(x) > ax / 2) g.fillText(etiket(x, ax), this.px(x), ly);
      g.textAlign = X0 < 30 ? 'left' : 'right';
      for (let y = Math.ceil(p.y0 / ay) * ay; y <= p.y1; y += ay) if (Math.abs(y) > ay / 2) g.fillText(etiket(y, ay), X0 < 30 ? lx + 8 : lx, this.py(y) + 4);
      // doğrular (teğet gibi) ve eğriler
      for (const d of this.dogrular) this._egri(d.f, d.renk || eksen, 1.6, d.kesikli);
      for (const e of this.egriler) this._egri(e.f, e.renk, 2.6);
      // noktalar
      g.font = '600 12px system-ui, sans-serif';
      for (const n of this.noktalar) this._nokta(n);
      if (this.iz) this._nokta({ ...this.iz, iz: true });
    }
    _egri(f, renk, kalinlik, kesikli) {
      const g = this.g, p = this.pencere, adet = Math.ceil(this.w * 1.5), yUzun = (p.y1 - p.y0) * 4;
      g.strokeStyle = renk; g.lineWidth = kalinlik; g.lineJoin = 'round'; g.lineCap = 'round';
      g.setLineDash(kesikli ? [6, 5] : []);
      g.beginPath();
      let acik = false, oy = NaN;
      for (let i = 0; i <= adet; i++) {
        const x = p.x0 + (p.x1 - p.x0) * i / adet, y = f(x);
        if (!isFinite(y) || (isFinite(oy) && Math.abs(y - oy) > yUzun)) { acik = false; oy = y; continue; } // süreksizlik (1/x, tan x)
        const X = this.px(x), Y = Math.max(-1e4, Math.min(1e4, this.py(y)));
        if (acik) g.lineTo(X, Y); else { g.moveTo(X, Y); acik = true; }
        oy = y;
      }
      g.stroke(); g.setLineDash([]);
    }
    _nokta(n) {
      const g = this.g, X = this.px(n.x), Y = this.py(n.y);
      if (X < -20 || X > this.w + 20 || Y < -20 || Y > this.h + 20) return;
      g.fillStyle = n.renk || this.renk('--hg-nokta', '#333');
      g.beginPath(); g.arc(X, Y, n.iz ? 5.5 : 4.5, 0, Math.PI * 2); g.fill();
      g.strokeStyle = this.renk('--hg-zemin', '#fff'); g.lineWidth = 2; g.stroke();
      const t = n.etiket || `(${(+n.x.toFixed(3)).toString().replace('.', ',')} ; ${(+n.y.toFixed(3)).toString().replace('.', ',')})`;
      g.font = '600 12px system-ui, sans-serif';
      const tw = g.measureText(t).width, sag = X + tw + 16 > this.w, bx = sag ? X - tw - 14 : X + 9, by = Y - 26 < 2 ? Y + 8 : Y - 26;
      g.fillStyle = this.renk('--hg-etiket-zemin', 'rgba(255,255,255,.9)');
      g.beginPath(); g.roundRect ? g.roundRect(bx, by, tw + 10, 19, 6) : g.rect(bx, by, tw + 10, 19); g.fill();
      g.fillStyle = this.renk('--hg-etiket-yazi', '#222'); g.textAlign = 'left';
      g.fillText(t, bx + 5, by + 14);
    }
    _izle(px, py) {
      let en = null;
      const x = this.gx(px);
      for (const e of this.egriler) {
        const y = e.f(x);
        if (!isFinite(y)) continue;
        const d = Math.abs(this.py(y) - py);
        if (!en || d < en.d) en = { d, x, y, renk: e.renk };
      }
      this.iz = en && en.d < 60 ? en : null;
      this.ciz();
      if (this.ayar.izlendi) this.ayar.izlendi(this.iz);
    }
    _bagla() {
      const c = this.c;
      c.style.touchAction = 'none';
      let surukle = null, kistir = null, tasindi = false;
      c.addEventListener('pointerdown', (e) => {
        c.setPointerCapture(e.pointerId);
        this.parmaklar.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
        tasindi = false;
        if (this.parmaklar.size === 1) surukle = { x: e.offsetX, y: e.offsetY, p: { ...this.pencere } };
        if (this.parmaklar.size === 2) {
          const [a, b] = [...this.parmaklar.values()];
          kistir = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, p: { ...this.pencere } };
          surukle = null;
        }
      });
      c.addEventListener('pointermove', (e) => {
        if (!this.parmaklar.has(e.pointerId)) return;
        this.parmaklar.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
        if (kistir && this.parmaklar.size === 2) {
          const [a, b] = [...this.parmaklar.values()], d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
          const k = kistir.d / d, p = kistir.p, x = p.x0 + kistir.cx / this.w * (p.x1 - p.x0), y = p.y1 - kistir.cy / this.h * (p.y1 - p.y0);
          this.pencere = { x0: x - (x - p.x0) * k, x1: x + (p.x1 - x) * k, y0: y - (y - p.y0) * k, y1: y + (p.y1 - y) * k };
          tasindi = true; this.ciz(); return;
        }
        if (surukle) {
          const dx = e.offsetX - surukle.x, dy = e.offsetY - surukle.y;
          if (Math.abs(dx) + Math.abs(dy) > 4) tasindi = true;
          if (!tasindi) return;
          const p = surukle.p, kx = (p.x1 - p.x0) / this.w, ky = (p.y1 - p.y0) / this.h;
          this.pencere = { x0: p.x0 - dx * kx, x1: p.x1 - dx * kx, y0: p.y0 + dy * ky, y1: p.y1 + dy * ky };
          this.iz = null; this.ciz();
        }
      });
      const bit = (e) => {
        const tek = this.parmaklar.size === 1;
        this.parmaklar.delete(e.pointerId);
        if (this.parmaklar.size < 2) kistir = null;
        if (tek && !tasindi && e.type === 'pointerup') {
          const simdi = Date.now();
          if (simdi - this.son < 300) { if (this.ayar.ciftDokunus) this.ayar.ciftDokunus(); }
          else this._izle(e.offsetX, e.offsetY);
          this.son = simdi;
        }
        if (!this.parmaklar.size) surukle = null;
      };
      c.addEventListener('pointerup', bit); c.addEventListener('pointercancel', bit);
      c.addEventListener('wheel', (e) => { e.preventDefault(); this.yakinlastir(e.deltaY > 0 ? 1.15 : 1 / 1.15, e.offsetX, e.offsetY); }, { passive: false });
    }
  }
  kok.HesapGrafik = HesapGrafik;
})(typeof window !== 'undefined' ? window : globalThis);
