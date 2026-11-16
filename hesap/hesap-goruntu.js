/* Luna hesap makinesi — fotoğraf temizleme (cihazın içinde; hem sayfa hem okuyucu işçisi kullanır).
   Telefonla çekilmiş defter/kitap fotoğrafında kâğıt beyaz değildir: gölgeli, gri, arka sayfadan yazı geçer, çizgiler vardır.
   Okuyucu temiz, beyaz zeminli formül bekler. Burada:
   1) kâğıdın aydınlığı bölge bölge tahmin edilip bölünür (gölge ve gri ton düzleşir, kâğıt beyaz olur),
   2) mürekkep ile kâğıt Otsu eşiğiyle ayrılır (arka sayfadan geçen soluk yazı ve lekeler beyaza gider),
   3) mürekkep parçaları bulunur; kenara değen uzun çizgiler ve tozlar atılır, çerçevenin ortasındaki öbek (işlem) ve
      ona yakın parçalar (2, +, 4 ayrı ayrı parçalardır) seçilir,
   4) yalnızca o öbek kırpılır: beyaz zeminde koyu yazı.
   Görüntü: { w, h, d } — d gri tonlu (0 siyah … 255 beyaz) Uint8ClampedArray. */
(function (kok) {
  // kâğıdın aydınlığı: blokların parlak ucu (yüzde 90'lık dilim), yumuşatılıp her piksele çift doğrusal yayılır
  function zemin(im) {
    const { w, h, d } = im;
    const B = Math.max(8, Math.round(Math.max(w, h) / 36));
    const gx = Math.ceil(w / B), gy = Math.ceil(h / B), izgara = new Float32Array(gx * gy), hist = new Uint32Array(256);
    for (let by = 0; by < gy; by++) for (let bx = 0; bx < gx; bx++) {
      hist.fill(0);
      let n = 0;
      for (let y = by * B; y < Math.min(h, (by + 1) * B); y++) for (let x = bx * B; x < Math.min(w, (bx + 1) * B); x++) { hist[d[y * w + x]]++; n++; }
      let k = 0, s = 0;
      for (k = 255; k >= 0; k--) { s += hist[k]; if (s >= n * 0.1) break; }
      izgara[by * gx + bx] = Math.max(k, 24);
    }
    // 3×3 ortalama (blok sınırları görünmesin)
    const yumus = new Float32Array(gx * gy);
    for (let y = 0; y < gy; y++) for (let x = 0; x < gx; x++) {
      let t = 0, n = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const xx = x + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < gx && yy < gy) { t += izgara[yy * gx + xx]; n++; } }
      yumus[y * gx + x] = Math.max(izgara[y * gx + x], t / n); // mürekkep bloğu zemini karartmasın
    }
    const z = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const fy = Math.min(gy - 1, Math.max(0, (y + 0.5) / B - 0.5)), y0 = Math.floor(fy), y1 = Math.min(gy - 1, y0 + 1), ty = fy - y0;
      for (let x = 0; x < w; x++) {
        const fx = Math.min(gx - 1, Math.max(0, (x + 0.5) / B - 0.5)), x0 = Math.floor(fx), x1 = Math.min(gx - 1, x0 + 1), tx = fx - x0;
        const a = yumus[y0 * gx + x0] * (1 - tx) + yumus[y0 * gx + x1] * tx, b = yumus[y1 * gx + x0] * (1 - tx) + yumus[y1 * gx + x1] * tx;
        z[y * w + x] = a * (1 - ty) + b * ty;
      }
    }
    return z;
  }
  function otsu(oran) { // oran: 0..1
    const hist = new Float64Array(256);
    for (const v of oran) hist[Math.min(255, Math.round(v * 255))]++;
    const n = oran.length;
    let top = 0; for (let i = 0; i < 256; i++) top += i * hist[i];
    let wB = 0, sB = 0, en = -1, esik = 200;
    for (let i = 0; i < 256; i++) {
      wB += hist[i]; if (!wB) continue;
      const wF = n - wB; if (!wF) break;
      sB += i * hist[i];
      const mB = sB / wB, mF = (top - sB) / wF, ara = wB * wF * (mB - mF) * (mB - mF);
      if (ara > en) { en = ara; esik = i; }
    }
    return esik / 255;
  }
  // mürekkep parçaları (8 komşulu)
  function parcalar(maske, w, h, oran) {
    const etiket = new Int32Array(w * h).fill(-1), liste = [], yigin = new Int32Array(w * h);
    for (let p = 0; p < w * h; p++) {
      if (!maske[p] || etiket[p] >= 0) continue;
      const no = liste.length, b = { no, alan: 0, kutle: 0, x0: w, y0: h, x1: 0, y1: 0 };
      let ust = 0; yigin[ust++] = p; etiket[p] = no;
      while (ust) {
        const q = yigin[--ust], x = q % w, y = (q - x) / w;
        b.alan++; b.kutle += 1 - oran[q];
        if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y;
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
          const xx = x + i, yy = y + j;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const r = yy * w + xx;
          if (maske[r] && etiket[r] < 0) { etiket[r] = no; yigin[ust++] = r; }
        }
      }
      liste.push(b);
    }
    return { etiket, liste };
  }
  // çerçevenin ortasındaki işlem: en ağır ve ortaya en yakın parça, sonra ona harf boyu kadar yakın parçalar
  // (ölçü harf yüksekliğinin ortancası: formül, üstündeki ve altındaki paragraflardan ayrı kalır)
  function obek(liste, w, h, odak) {
    const N = w * h, kenar = (b) => b.x0 <= 1 || b.y0 <= 1 || b.x1 >= w - 2 || b.y1 >= h - 2;
    const bw = (b) => b.x1 - b.x0 + 1, bh = (b) => b.y1 - b.y0 + 1;
    let adaylar = liste.filter((b) => {
      if (b.alan < 4) return false;
      if (bw(b) > 0.92 * w || bh(b) > 0.92 * h) return false; // sayfa kenarı
      if (kenar(b) && (bw(b) > 0.45 * w || bh(b) > 0.45 * h || bw(b) / bh(b) > 12)) return false; // kenara değen çizgi, gölge
      return true;
    });
    if (!adaylar.length) return null;
    const cizgiMi = (b, med) => bw(b) > 2.5 * med && bw(b) / bh(b) > 12;
    // harf boyu: anlamlı parçaların (en büyüğünün %2'sinden büyük) yüksekliklerinin ortancası; tozlar ölçüyü bozmasın
    const enBuyuk = Math.max(...adaylar.filter((b) => bw(b) / bh(b) < 6).map((b) => b.alan), 1);
    const boylar = adaylar.filter((b) => bw(b) / bh(b) < 6 && b.alan >= enBuyuk * 0.02).map(bh).sort((a, b) => a - b);
    const med = Math.max(4, boylar.length ? boylar[boylar.length >> 1] : 12);
    // toz: harf boyuna göre çok küçük (çarpı noktası ·, i'nin noktası kalır)
    adaylar = adaylar.filter((b) => b.alan >= Math.max(4, 0.006 * med * med) || b.alan >= enBuyuk * 0.02);
    // uzun ince çizgi: hemen üstünde ve altında yazı varsa kesir çizgisidir, yoksa ayırıcıdır (atılır)
    adaylar = adaylar.filter((b) => {
      if (!cizgiMi(b, med)) return true;
      const yakin = (ust) => adaylar.some((c) => c !== b && !cizgiMi(c, med) && c.x1 >= b.x0 && c.x0 <= b.x1 && (ust ? b.y0 - c.y1 : c.y0 - b.y1) >= -2 && (ust ? b.y0 - c.y1 : c.y0 - b.y1) <= 1.7 * med); // paydadaki tek küçük x çizgiden biraz uzakta durur
      return yakin(true) && yakin(false);
    });
    if (!adaylar.length) return null;
    // öbekler: her parça harf boyu kadar yakın komşularıyla birleşir (2, +, 4 tek öbek; paragraf ayrı öbek)
    const atanan = new Set(), obekler = [];
    for (const tohum of adaylar.slice().sort((a, b) => b.kutle - a.kutle)) {
      if (atanan.has(tohum.no)) continue;
      const sec = new Set([tohum.no]); atanan.add(tohum.no);
      let k = { x0: tohum.x0, y0: tohum.y0, x1: tohum.x1, y1: tohum.y1 };
      for (let degisti = true; degisti;) {
        degisti = false;
        for (const b of adaylar) {
          if (atanan.has(b.no)) continue;
          const dx = Math.max(0, b.x0 - k.x1, k.x0 - b.x1), dy = Math.max(0, b.y0 - k.y1, k.y0 - b.y1);
          if (dx <= 1.6 * med && dy <= 0.8 * med) {
            sec.add(b.no); atanan.add(b.no); k = { x0: Math.min(k.x0, b.x0), y0: Math.min(k.y0, b.y0), x1: Math.max(k.x1, b.x1), y1: Math.max(k.y1, b.y1) }; degisti = true;
          }
        }
      }
      obekler.push({ secilen: sec, kutu: k });
    }
    // hangisi işlem? Ağır, harfleri büyük, kesir çizgisi ya da √ ∫ Σ gibi uzun işareti olan ve ortaya (ya da dokunulan yere) yakın öbek
    const cx = odak ? odak.x : w / 2, cy = odak ? odak.y : h / 2, kosegen = Math.hypot(w, h);
    let enIyi = -1, sec = null;
    for (const o of obekler) {
      const p = adaylar.filter((b) => o.secilen.has(b.no)), M = p.reduce((t, b) => t + b.kutle, 0);
      const hs = p.filter((b) => !cizgiMi(b, med) && bw(b) / bh(b) < 6).map(bh).sort((a, b) => a - b), Ho = hs.length ? hs[hs.length >> 1] : med;
      const yapi = p.some((b) => cizgiMi(b, med) || bh(b) > 1.8 * med) ? 3 : 1;
      const k = o.kutu, ux = Math.max(0, k.x0 - cx, cx - k.x1), uy = Math.max(0, k.y0 - cy, cy - k.y1); // en yakın noktasına uzaklık
      const yakin = Math.max(0.02, 1 - Math.hypot(ux, uy) / (0.5 * kosegen));
      const kenarda = p.every(kenar) ? 0.3 : 1;
      const puan = M * Math.pow(Ho / med, 2) * yapi * kenarda * (odak ? Math.pow(yakin, 16) : 0.3 + 0.7 * yakin * yakin);
      if (puan > enIyi) { enIyi = puan; sec = o; }
    }
    const secilen = sec.secilen, k = sec.kutu;
    // seçilen mürekkebin bütün mürekkebe oranı (atılan çizgiler sayılır, tozlar sayılmaz): 1'e yakınsa çerçevede yalnızca işlem var
    const tozEsigi = Math.max(4, 0.006 * med * med), secili = adaylar.reduce((t, b) => t + (secilen.has(b.no) ? b.kutle : 0), 0);
    const toplam = Math.max(secili, liste.reduce((t, b) => t + (b.alan >= tozEsigi ? b.kutle : 0), 0));
    return { kutu: k, secilen, adet: secilen.size, harf: med, pay: toplam ? secili / toplam : 1 };
  }
  // Fotoğraf mı (kâğıt beyaz değil, gölgeli)? Basit uç gerilimle "koyu" sayılan pikseller çoksa evet.
  function fotografMi(im) {
    let en = 255, ek = 0;
    for (const v of im.d) { if (v < en) en = v; if (v > ek) ek = v; }
    if (ek - en < 30) return false;
    let koyu = 0;
    for (const v of im.d) if (((v - en) / (ek - en)) * 255 < 200) koyu++;
    return koyu / im.d.length > 0.3;
  }
  // temizlenmiş görüntü (beyaz zemin, koyu mürekkep), işlemin çevresinden kırpılmış; bulunamazsa null
  // secenek.odak: { x, y } piksel — kullanıcı fotoğrafta bir yere dokunduysa oradaki öbek seçilir
  function temizle(im, secenek = {}) {
    const { w, h, d } = im, z = zemin(im), oran = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) oran[i] = Math.min(1, d[i] / Math.max(1, z[i]));
    let t = otsu(oran);
    t = Math.min(0.86, Math.max(0.45, t));
    const maske = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) maske[i] = oran[i] < t ? 1 : 0;
    const { etiket, liste } = parcalar(maske, w, h, oran);
    const o = obek(liste, w, h, secenek.odak);
    if (!o) return null;
    // mürekkebin en koyu ucu siyaha, eşiğin biraz üstü beyaza (kenar yumuşaklığı kalır)
    const koyular = [];
    for (let i = 0; i < w * h; i += 7) if (maske[i] && o.secilen.has(etiket[i])) koyular.push(oran[i]);
    koyular.sort((a, b) => a - b);
    const alt = koyular.length ? koyular[Math.floor(koyular.length * 0.05)] : 0, ust = t + (1 - t) * 0.3;
    const kh = o.kutu.y1 - o.kutu.y0 + 1, pay = Math.max(4, Math.round(kh * 0.12));
    const x0 = Math.max(0, o.kutu.x0 - pay), y0 = Math.max(0, o.kutu.y0 - pay), x1 = Math.min(w - 1, o.kutu.x1 + pay), y1 = Math.min(h - 1, o.kutu.y1 + pay);
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1, cikis = new Uint8ClampedArray(cw * ch);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const p = (y + y0) * w + x + x0, e = etiket[p];
      if (e >= 0 && !o.secilen.has(e)) { cikis[y * cw + x] = 255; continue; } // seçilmeyen parça (çizgi, başka yazı)
      cikis[y * cw + x] = Math.round(255 * Math.min(1, Math.max(0, (oran[p] - alt) / Math.max(0.05, ust - alt))));
    }
    const ornek = []; for (let i = 0; i < w * h; i += 97) ornek.push(z[i]); ornek.sort((a, b) => a - b);
    return { w: cw, h: ch, d: cikis, kutu: { x0, y0, x1, y1 }, adet: o.adet, esik: t, harf: o.harf, pay: o.pay, kagit: ornek[ornek.length >> 1] };
  }
  const HesapGoruntu = { temizle, fotografMi, zemin, otsu };
  if (typeof module !== 'undefined' && module.exports) module.exports = HesapGoruntu;
  kok.HesapGoruntu = HesapGoruntu;
})(typeof self !== 'undefined' ? self : globalThis);
