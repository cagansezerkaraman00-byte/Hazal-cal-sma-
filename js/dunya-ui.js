/* Hazal'ın Küçük Dünyası (görünüm): Çalış sekmesindeki karttan açılan, ekranı kaplayan gece odası.
   Yıldızlı pencerenin önünde Luna, Vesper ve Güçlü birlikte dinlenir (uygulamadaki çizimlerin aynısı; Scene.catSprite ile okunur).
   Kazanılan rozetler odayı doldurur: ilk adımlar, denemeler ve özel günler duvarda çerçeve; süre rozetleri kupa, seriler madalya
   olarak kitaplığın üst raflarında; konular, odak ve kesintisiz çalışma kitap olarak alt raflarda. Rozete dokununca kartı açılır.
   Plan maddelerinden gelen eşyaların yeri seçilir; Çağan'ın mektupları kutuda durur, açılanlar yeniden okunur.
   Oda 224 × 128 mantıksal piksel; telefonda sağa sola kaydırılır. Hareket azaltılmışsa oda kıpırdamaz. */

const DunyaUI = (() => {
  const W = 224, H = 128;
  let app = null;
  const $ = (s, r = document) => (r ? r.querySelector(s) : null); // oda kapandıktan sonra gelen gecikmeli işler boşa düşsün
  const esc = (s) => U.esc(String(s == null ? '' : s));
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const hex = (c) => { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  function paint(rows, pal) {
    const w = rows[0].length, h = rows.length, c = mk(w, h), g = c.getContext('2d'), img = g.createImageData(w, h), d = img.data;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const ch = rows[j][i]; if (ch === '.' || !pal[ch]) continue;
      const v = hex(pal[ch]), o = (j * w + i) * 4;
      d[o] = v[0]; d[o + 1] = v[1]; d[o + 2] = v[2]; d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0); return c;
  }

  // ---------- Eşya çizimleri (a/A/h/o: renkli eşyaların seçilen rengi) ----------
  const CIZIM = {
    lavanta: { pal: { l: '#c9adff', L: '#8f6fe0', g: '#6aa86e', G: '#447a4c' }, rows: [
      '...l.L...', '..lL.Ll..', '.l.L.L.l.', '..lL.Ll..', '.L.l.l.L.', '..Lg.gL..', '...g.g...', '...gGg...', '....G....',
      '.hhhhhhh.', '.AaaaaaA.', '..aaaaa..', '..AaaaA..', '...AAA...'] },
    minder: { pal: {}, rows: [
      '..oooooooooooooo..', '.ohhaaaaaaaaaaaao.', 'oaahaaaaaaaaaaaaao', 'oaaaaaaaAaaaaaaaao', 'oaaaaaaaaaaaaaaaAo', '.oAAAAAAAAAAAAAAo.', '..oooooooooooooo..'] },
    lamba: { pal: { y: '#e0a93a', Y: '#ffe08a', W: '#fff6d0', s: '#7d6595', S: '#a48cc0' }, rows: [
      '....y....', '...yWy...', 'yyyyWyyyy', '.yWWWWWy.', '..yYWYy..', '.yYy.yYy.', '.yy...yy.', '....s....', '....S....', '....s....', '....S....', '...sss...', '..sssss..'] },
    kitap: { pal: { b: '#5f45a8', B: '#9b80e0', p: '#a83e6c', P: '#e591b6', c: '#3f6a8a', C: '#7fb0cf', w: '#f3eadb' }, rows: [
      '..bbbbbbbb..', '.bBBBBBBBBb.', '.bwwwwwwwwb.', 'pppppppppp..', 'pPPPPPPPPPp.', 'pwwwwwwwwwp.', '.cccccccccc.', '.cCCCCCCCCCc', '.cwwwwwwwwwc'] },
    mum: { pal: { k: '#4a3a3a', m: '#c9a24a', M: '#a07c2a' }, rows: [
      '...k...', '.hhaaa.', '.haaaA.', '.haaaA.', '.haaaA.', '.haaaA.', 'mmmmmmm', '.MMMMM.'] },
    kupa: { pal: { t: '#a0603a' }, rows: [
      '.hhhhhhh..', '.attttta..', '.aaaaaaaAA', '.aahaaaa.A', '.aaaaaaaAA', '.aaaaaaa..', '..AAAAA...'] },
    puf: { pal: {}, rows: [
      '...oooooooo...', '.ooaahhaaaaoo.', 'oaahhaaaaaaaao', 'oaaaaaAaaaaaao', 'oaaaaaaaaaaaao', 'oAaaaaaaaaaaAo', '.oAAAAAAAAAAo.', '..oooooooooo..'] },
    zambak: { pal: { w: '#fff7fb', W: '#f6d6e6', p: '#f28ab2', g: '#5e9a63', L: '#7cc07f', v: '#b79bff', V: '#8f74e0' }, rows: [
      '.w.....w.', 'wWw...wWw', '.wpw.wpw.', '..wg.gw..', '...g.g...', '..Lg.gL..', '...gLg...', '....g....', '.vvvvvvv.', '.VvvvvvV.', '..vvvvv..', '..VvvvV..', '...VVV...'] },
    sepet: { pal: { y: '#b79bff', Y: '#8f74e0', b: '#c9965a', B: '#a0703c' }, rows: [
      '....aaa.......', '...ahhaa.yyy..', '...aaaaA.yYyy.', '.bBbBbBbBbBbB.', 'bBbBbBbBbBbBbB', '.bbbbbbbbbbbb.', '.BbBbBbBbBbBb.', '.bbbbbbbbbbbb.', '..BBBBBBBBBB..'] },
    balik: { pal: { c: '#cfe3ff', w: '#6fb6e8', W: '#4b90c8', o: '#ff9a3c', O: '#ff6f1a', s: '#8f74e0' }, rows: [
      '..ccccccc..', '.c.......c.', 'cwwwwwwwwwc', 'cwwwoOwwwwc', 'cwwooOOwwwc', 'cwwwoOwwWwc', 'cWwwwwwwWWc', '.cWWWWWWWc.', '..ccccccc..', '.sssssssss.'] },
    yatak: { pal: { c: '#fff1e6' }, rows: [
      '..oooooooooooooo..', '.oaaaahhaaaaaaaao.', 'oaaccccccccccccaao', 'oaccccccccccccccao', 'oaAccccccccccccAao', 'oaaAAAAAAAAAAAAaao', '.oaaaaaaaaaaaaaao.', '..oooooooooooooo..'] },
    karkuresi: { pal: { g: '#cfe3ff', n: '#3b4a8a', w: '#ffffff', r: '#e86a8a', h: '#f3e6d6', d: '#8a5a3a', b: '#c9a24a', B: '#e0bd5e' }, rows: [
      '..ggggg..', '.gnnwnng.', 'gnwnnnwng', 'gnnnrnnng', 'gnnrrrnwg', 'gwnhhhnng', '.gnhdhng.', '..ggggg..', '.bbbbbbb.', 'bBBBBBBBb', '.bbbbbbb.'] },
    teleskop: { pal: { t: '#8f74e0', T: '#cbb0ef', b: '#e0bd5e', l: '#6d5a8c' }, rows: [
      'tt............', 'TTt...........', '.tTTt.........', '..tTTtt.......', '...tTTTt......', '....tTTTt.....', '.....btTTt....', '......bbtTt...', '.......bb.t...', '.......ll.....', '......l.l.....',
      '.....l..l.....', '....l...l.....', '...l....l.l...', '..l.....l..l..', '.l......l...l.'] },
  };
  const spCache = new Map();
  function esyaSprite(tur, renk) {
    const k = tur + ':' + renk;
    if (spCache.has(k)) return spCache.get(k);
    const c = CIZIM[tur];
    const s = c ? paint(c.rows, { ...Dunya.RENKLER[0], ...c.pal, ...Dunya.RENKLER[renk] || {} }) : null;
    spCache.set(k, s);
    return s;
  }
  // yerler: x, y eşyanın alt ortası (asılıda üst ortası)
  const YER = {
    'pencere-ust': { x: 112, y: 5 }, 'pencere-sol': { x: 63, y: 59 }, 'pencere-sag': { x: 161, y: 59 }, 'kitaplik-ust': { x: 195, y: 16 },
    'sehpa': { x: 19, y: 86 }, 'yer-sol': { x: 38, y: 122 }, 'hali-sol': { x: 86, y: 117 }, 'hali-sag': { x: 140, y: 117 }, 'yer-sag': { x: 198, y: 123 },
  };
  function yerKutusu(id) {
    const p = YER[id], kat = Dunya.YERLER[id].kat;
    return kat === 'asili' ? [p.x - 16, p.y - 2, 32, 12] : kat === 'yer' ? [p.x - 14, p.y - 14, 28, 16] : [p.x - 7, p.y - 15, 14, 17];
  }

  // ---------- Oda ----------
  const KONUM = { vesper: { x: 69, y: 44 }, guclu: { x: 102, y: 52 }, luna: { x: 118, y: 44 } };
  let SP = null;
  function kediler() {
    if (SP) return SP;
    const cs = (k, p, d) => (typeof Scene !== 'undefined' && Scene.catSprite ? Scene.catSprite(k, p, d) : null);
    SP = { luna: { a: cs('luna', 'loafA', 1), b: cs('luna', 'loafAB', 1), mutlu: cs('luna', 'happy', 1) },
      vesper: { a: cs('vesper', 'loafA', 0), b: cs('vesper', 'loafAB', 0), kuyruk: cs('vesper', 'loafB', 0) }, guclu: cs('kitten', 'sleep', 0) };
    return SP;
  }
  const GOK = ['#110c29', '#150f30', '#1a1338', '#1f1741', '#251b4a', '#2b2054'];
  const gokRenk = (y) => GOK[Math.max(0, Math.min(GOK.length - 1, Math.floor((y - 15) / 6.2)))];
  const seeded = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647;
  const YILDIZ = (() => { const r = seeded(7); return [[85, 18], [90, 35], [99, 17], [104, 28], [116, 19], [120, 38], [124, 26], [135, 17], [139, 30], [128, 42], [84, 42], [102, 40], [118, 29], [140, 41], [96, 34], [132, 35]].map(([x, y]) => ({ x, y, f: r() * 6.28, h: 0.6 + r() * 1.2 })); })();
  let arka = null;
  function arkaCiz() {
    arka = mk(W, H); const a = arka.getContext('2d'), P = (c, x, y, w = 1, h = 1) => { a.fillStyle = c; a.fillRect(x, y, w, h); };
    const rnd = seeded(11);
    P('#2b2040', 0, 0, W, 74);
    for (let y = 4; y < 64; y += 8) for (let x = (y / 8) % 2 ? 6 : 2; x < W; x += 8) { P('#352950', x, y); P('#30254a', x + 1, y + 1); }
    P('#251b37', 0, 66, W, 8); P('#3d2d55', 0, 65, W, 1);
    P('#352640', 0, 74, W, H - 74);
    for (let y = 74; y < H; y += 5) { P('#2b1f35', 0, y, W, 1); for (let x = ((y / 5) % 2) * 13; x < W; x += 26) P('#2f2238', x, y + 1, 1, 4); }
    for (let y = 90; y <= 114; y++) { // halı
      const dy = (y - 102) / 12.5, half = Math.round(66 * Math.sqrt(Math.max(0, 1 - dy * dy)));
      if (half > 0) { P('#5a4679', 112 - half, y, half * 2); if (half > 2) P('#46355f', 112 - half + 2, y, half * 2 - 4); }
    }
    for (let x = 60; x <= 164; x += 6) P('#6b5790', x, 102); for (let x = 63; x <= 161; x += 6) { P('#6b5790', x, 97); P('#6b5790', x, 107); }
    // pencere: çerçeve, gök, uzaktaki çatılar ve ışıklı pencereler, ay, kayıtlar
    P('#4e3f6b', 78, 12, 69, 43); P('#6f5c8e', 79, 13, 67, 41); P('#8f7bb0', 79, 13, 67, 1);
    for (let y = 15; y <= 51; y++) P(gokRenk(y), 81, y, 63, 1);
    let roof = 48;
    for (let x = 81; x <= 143; x++) { if (x % 7 === 0) roof = 45 + Math.floor(rnd() * 5); P('#1b1438', x, roof, 1, 52 - roof); }
    [[87, 49], [106, 48], [125, 49], [136, 48]].forEach(([x, y]) => P('#e8b85a', x, y));
    const disk = (cx, cy, r, c) => { for (let y = -r; y <= r; y++) { const h2 = Math.floor(Math.sqrt(r * r - y * y) + 0.3); P(c, cx - h2, cy + y, h2 * 2 + 1, 1); } };
    disk(94, 23, 5, '#fff1c2'); disk(97, 22, 5, gokRenk(22)); P('#fff8dc', 90, 23, 1, 2);
    P('#6f5c8e', 111, 15, 2, 37); P('#6f5c8e', 81, 32, 63, 2); P('#8f7bb0', 111, 15, 1, 37);
    P('#5c4b7c', 78, 54, 69, 2); P('#8f7bb0', 76, 53, 73, 1);
    // perde çubuğu ve perdeler
    P('#8f7bb0', 65, 9, 95, 1); P('#6f5c8e', 65, 10, 95, 1); P('#cbb0ef', 64, 8, 2, 3); P('#cbb0ef', 159, 8, 2, 3);
    for (const sag of [false, true]) {
      for (let y = 10; y <= 59; y++) {
        const ust = y <= 36, r = ust ? Math.round(83 - (y - 10) * 6 / 26) : Math.round(77 + (y - 36) * 4 / 23);
        for (let x = 69; x <= r; x++) { const f = (x - 69) % 4; P(f === 0 ? '#88497a' : f === 2 ? '#c886ad' : '#a9628e', sag ? W - 1 - x : x, y); }
      }
      for (let x = 69; x <= 77; x++) P(x % 2 ? '#ffd56b' : '#e0a93a', sag ? W - 1 - x : x, 36);
    }
    // pencere önündeki minderli oturak
    P('#3a2a52', 57, 62, 111, 10); for (let x = 65; x < 166; x += 20) P('#33254a', x, 64, 16, 6);
    P('#2c2042', 57, 71, 111, 1);
    P('#5b4479', 58, 57, 109, 5); P('#7259a0', 59, 57, 107, 1); P('#4b3866', 58, 61, 109, 1); P('#5b4479', 57, 58, 1, 3); P('#5b4479', 167, 58, 1, 3);
    // sehpa (sol)
    P('#6f5c8e', 8, 86, 23, 2); P('#8f7bb0', 8, 86, 23, 1); P('#4e3f6b', 10, 88, 2, 12); P('#4e3f6b', 27, 88, 2, 12); P('#3d2d55', 12, 95, 15, 1);
    // kitaplık (sağ): beş raf
    P('#4e3f6b', 170, 16, 51, 69); P('#2a1f38', 172, 18, 47, 60);
    for (const y of [28, 40, 52, 64, 76]) { P('#6f5c8e', 172, y, 47, 2); P('#8f7bb0', 172, y, 47, 1); }
    P('#6f5c8e', 170, 16, 51, 2); P('#8f7bb0', 170, 16, 51, 1); P('#3d2d55', 170, 78, 51, 7); P('#5c4b7c', 170, 16, 2, 69); P('#5c4b7c', 219, 16, 2, 69);
  }

  // ---------- Rozetler: çerçeve, kupa, madalya, kitap ----------
  const MOTIF = {
    filiz: ['..g..', '.gGg.', '..g..', '.ggg.'], yildiz: ['..y..', '.yyy.', 'yyyyy', '.y.y.'], kalp: ['.p.p.', 'ppppp', '.ppp.', '..p..'],
    pati: ['p.p.p', '.....', '.ppp.', '.ppp.'], sayfa: ['wwwww', 'w...w', 'wwwww', 'w...w'], tik: ['....g', '...g.', 'g.g..', '.g...'], ay: ['.yy..', 'yy...', 'yy...', '.yy..'],
  };
  const MOTIF_PAL = { g: '#5fae6a', G: '#9ee0a4', y: '#e0a93a', p: '#e86a9a', w: '#8f7bb0' };
  const CERCEVE_ZEMIN = { ilk: '#d7f2e1', deneme: '#f3eadb', ozel: '#fbdcec' };
  const CERCEVE_MOTIF = { ilk: ['filiz', 'yildiz', 'filiz'], deneme: ['sayfa', 'tik', 'yildiz'], ozel: ['kalp', 'pati', 'ay', 'yildiz'] };
  const CERCEVE_RENK = [['#c9a24a', '#e0bd5e'], ['#8a6a4a', '#a8865e'], ['#8f7bb0', '#b5a3d6']];
  const KITAP_RENK = { yks: [['#3f6a8a', '#7fb0cf'], ['#2f7a78', '#7cc4bf'], ['#4a5c9a', '#93a5e0']], odak: [['#a83e6c', '#e591b6'], ['#b0577e', '#f0a8c6'], ['#8a3f73', '#d68ab9']], kesintisiz: [['#a07c2a', '#e0bd5e'], ['#6f5ab0', '#b5a3e6'], ['#8f6a3a', '#d6ad6c']] };
  let rozetKutulari = [];
  function rozetCiz(g, t) {
    const list = Dunya.rozetler().filter((r) => r.at).sort((a, b) => a.at - b.at || a.sira - b.sira);
    rozetKutulari = [];
    const px = (c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    // duvar çerçeveleri: 4 sütun × 6 sıra
    list.filter((r) => r.yer === 'cerceve').slice(0, 24).forEach((r, i) => {
      const x = 6 + (i % 4) * 12, y = 5 + Math.floor(i / 4) * 10, [fr, fl] = CERCEVE_RENK[(r.sira + i) % 3];
      px('#1c1430', x + 1, y + 1, 10, 8); px(fr, x, y, 10, 8); px(fl, x, y, 10, 1); px(CERCEVE_ZEMIN[r.cat] || '#efe6f7', x + 1, y + 1, 8, 6);
      const mm = CERCEVE_MOTIF[r.cat] || ['yildiz'], m = MOTIF[mm[r.sira % mm.length]];
      m.forEach((row, j) => [...row].forEach((ch, k) => { if (ch !== '.') px(MOTIF_PAL[ch], x + 3 + k - 1, y + 2 + j); }));
      rozetKutulari.push({ id: r.id, k: [x - 1, y - 1, 12, 10] });
    });
    // kitaplık: kupalar (süre), madalyalar (seri), kitaplar
    const raf = (yer, alt, kac) => list.filter((r) => r.yer === yer).slice(0, kac).map((r, i) => ({ r, i, alt }));
    raf('kupa', 28, 9).forEach(({ r, i, alt }) => {
      const x = 173 + i * 5, y = alt - 7;
      ['yyyyy', 'yYYYy', '.yYy.', '..y..', '..y..', '.yyy.', '.bbb.'].forEach((row, j) => [...row].forEach((ch, k) => { if (ch !== '.') px(ch === 'y' ? '#e0a93a' : ch === 'Y' ? '#ffe08a' : '#6d5a8c', x + k, y + j); }));
      if (!calm() && Math.floor(t * 0.7 + i * 1.7) % 9 === 0) px('#fffbe8', x + 1, y + 1);
      rozetKutulari.push({ id: r.id, k: [x, y - 1, 5, 9] });
    });
    raf('madalya', 40, 9).forEach(({ r, i, alt }) => {
      const x = 173 + i * 5, y = alt - 7, rb = i % 2 ? ['#b79bff', '#8f74e0'] : ['#f5a3cf', '#d985b4'];
      ['.rRr.', '.rRr.', '..r..', '.mmm.', 'mmMmm', 'mMMMm', '.mmm.'].forEach((row, j) => [...row].forEach((ch, k) => { if (ch !== '.') px(ch === 'r' ? rb[0] : ch === 'R' ? rb[1] : ch === 'm' ? '#e0a93a' : '#ffe08a', x + k, y + j); }));
      rozetKutulari.push({ id: r.id, k: [x, y - 1, 5, 9] });
    });
    const kitaplar = (cat, alt) => {
      let x = 173;
      list.filter((r) => r.cat === cat).slice(0, 15).forEach((r, i) => {
        const [c, l] = KITAP_RENK[cat][(r.sira + i) % 3], h = 7 + ((r.sira * 7 + i * 3) % 4), w = cat === 'kesintisiz' ? 3 : (r.sira % 3 === 0 ? 4 : 3);
        if (x + w > 218) return;
        px(c, x, alt - h, w, h); px(l, x, alt - h + 1, w, 1); px(l, x, alt - 2, w, 1); px('#ffe08a', x + Math.floor(w / 2), alt - h + 4);
        px('#1c1430', x + w - 1, alt - h, 1, h);
        rozetKutulari.push({ id: r.id, k: [x, alt - h, w, h] });
        x += w;
      });
    };
    kitaplar('yks', 52); kitaplar('odak', 64); kitaplar('kesintisiz', 76);
  }

  // ---------- Çizim döngüsü ----------
  let sahne = null, lo = null, g = null, vg = null, olcek = 3, t0 = 0, dongu = 0, gorunur = true;
  let parcaciklar = [], gizli = new Set(), konusma = 0, kalpZamani = 0;
  const z = { luna: { kirp: 2.4 }, vesper: { kirp: 4.1, kuyruk: 6 }, sokul: { at: 9, bitis: 11.4 } };
  let esyaKutulari = [];
  function celenk(gg, x0, y0, t, sakin) {
    const w = 28;
    gg.fillStyle = '#9b87bd';
    for (let i = 0; i < w; i++) gg.fillRect(x0 + i, y0 + Math.round(Math.sin(Math.PI * i / (w - 1)) * 3), 1, 1);
    [2, 8, 14, 20, 26].forEach((i, n) => {
      const sy = y0 + Math.round(Math.sin(Math.PI * i / (w - 1)) * 3) + 2, on = sakin || Math.sin(t * 2 + n * 1.3) > -0.2;
      gg.fillStyle = n % 2 ? (on ? '#f7b3d6' : '#b98aa8') : (on ? '#ffe08a' : '#c9a85a');
      gg.fillRect(x0 + i - 1, sy + 1, 3, 1); gg.fillRect(x0 + i, sy, 1, 3);
      if (on) { gg.fillStyle = '#fffbe8'; gg.fillRect(x0 + i, sy + 1, 1, 1); }
    });
  }
  function esyaCiz(x, t) {
    const p = YER[x.yer]; if (!p) return;
    if (x.tur === 'celenk') { celenk(g, p.x - 14, p.y, t, calm()); esyaKutulari.push({ tur: x.tur, k: [p.x - 15, p.y - 1, 30, 9] }); return; }
    const s = esyaSprite(x.tur, x.renk); if (!s) return;
    const sx = Math.round(p.x - s.width / 2), sy = p.y - s.height;
    g.drawImage(s, sx, sy);
    esyaKutulari.push({ tur: x.tur, k: [sx, sy, s.width, s.height] });
    if (x.tur === 'mum') { // titreyen alev
      const f = calm() ? 0 : Math.floor(t * 8) % 3;
      g.fillStyle = '#ffd56b'; g.fillRect(sx + 3, sy - 3 + (f === 2 ? 1 : 0), 1, f === 2 ? 2 : 3); g.fillRect(sx + (f === 1 ? 2 : 3), sy - 2, f === 0 ? 1 : 2, 1);
      g.fillStyle = '#fff3c4'; g.fillRect(sx + 3, sy - 1, 1, 1);
    }
    if (x.tur === 'kupa' && !calm()) { // buhar
      for (let i = 0; i < 2; i++) { const k = ((t * 0.8 + i * 0.5) % 1); g.fillStyle = `rgba(255,255,255,${0.35 * (1 - k)})`; g.fillRect(sx + 3 + i * 2 + Math.round(Math.sin((t + i) * 3)), sy - 2 - Math.round(k * 5), 1, 1); }
    }
  }
  function kediCiz(t) {
    const S = kediler(); if (!S.luna.a) return;
    const sakin = calm(), nefes = (ph, per) => (sakin ? 0 : Math.sin(t * 6.283 / per + ph) > 0.3 ? 1 : 0);
    const sok = !sakin && t >= z.sokul.at && t < z.sokul.bitis;
    if (!sakin && t >= z.sokul.bitis) { z.sokul.at = t + 9 + Math.random() * 6; z.sokul.bitis = z.sokul.at + 2.4; if (Math.random() < 0.6) kalpZamani = z.sokul.at + 0.4; }
    if (kalpZamani && t >= kalpZamani && !sakin) { kalpZamani = 0; parcaciklar.push({ tur: 'kalp', x: 118, y: 48, t0: t, omur: 2.2 }); }
    let v = S.vesper.a;
    if (!sakin) {
      if (t > z.vesper.kirp) { if (t > z.vesper.kirp + 0.16) z.vesper.kirp = t + 2.5 + Math.random() * 4; else v = S.vesper.b; }
      if (t > z.vesper.kuyruk) { if (t > z.vesper.kuyruk + 0.7) z.vesper.kuyruk = t + 4 + Math.random() * 5; else v = S.vesper.kuyruk; }
    }
    const nv = nefes(0.4, 3.6); g.drawImage(v.c, KONUM.vesper.x, KONUM.vesper.y - nv, v.w, v.h + nv);
    let l = S.luna.a;
    if (konusma > performance.now() || sok) l = S.luna.mutlu;
    else if (!sakin && t > z.luna.kirp) { if (t > z.luna.kirp + 0.16) z.luna.kirp = t + 2.8 + Math.random() * 3.5; else l = S.luna.b; }
    const nl = nefes(2.1, 3.2); g.drawImage(l.c, KONUM.luna.x, KONUM.luna.y - nl, l.w, l.h + nl);
    const k = S.guclu, ng = nefes(1.2, 2.4); g.drawImage(k.c, KONUM.guclu.x + (sok ? 1 : 0), KONUM.guclu.y - ng, k.w, k.h + ng);
  }
  const KALP = ['.p.p.', 'ppppp', '.ppp.', '..p..'];
  function parcacikCiz(t) {
    parcaciklar = parcaciklar.filter((p) => t - p.t0 < p.omur);
    for (const p of parcaciklar) {
      const k = (t - p.t0) / p.omur;
      if (p.tur === 'kalp') {
        const y = Math.round(p.y - k * 10), x = Math.round(p.x + Math.sin(k * 6) * 1.5);
        g.fillStyle = k > 0.7 ? '#c98bb0' : '#f5a3cf';
        KALP.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === 'p') g.fillRect(x + i, y + j, 1, 1); }));
      } else {
        const r = Math.round(2 + k * 7), on = Math.floor((t - p.t0) * 10) % 2 === 0;
        for (let n = 0; n < 6; n++) {
          const a = n * 1.047 + (p.f || 0), x = Math.round(p.x + Math.cos(a) * r), y = Math.round(p.y + Math.sin(a) * r * 0.8);
          g.fillStyle = on ? '#fff3c8' : '#ffd56b'; g.fillRect(x, y, 1, 1);
          if (k < 0.5) { g.fillStyle = '#ffd56b'; g.fillRect(x - 1, y, 1, 1); g.fillRect(x + 1, y, 1, 1); }
        }
      }
    }
  }
  function isik(t) {
    const s = vg.canvas.width / W, P = (x, y) => [x * s, y * s], st = Dunya.st();
    vg.save();
    vg.globalCompositeOperation = 'lighter';
    let gr = vg.createRadialGradient(...P(112, 34), 0, ...P(112, 34), 70 * s);
    gr.addColorStop(0, 'rgba(160, 140, 255, .16)'); gr.addColorStop(1, 'rgba(160, 140, 255, 0)');
    vg.fillStyle = gr; vg.fillRect(0, 0, W * s, H * s);
    const nab = calm() ? 1 : 0.92 + 0.08 * Math.sin(t * 1.7);
    const isiklar = st.esyalar.filter((x) => YER[x.yer] && !gizli.has(x.tur) && (x.tur === 'lamba' || x.tur === 'mum'));
    if (!isiklar.length) isiklar.push({ yer: null });
    for (const x of isiklar) {
      const p = x.yer ? YER[x.yer] : { x: 196, y: 30 }, guc = x.tur === 'lamba' ? 0.32 : x.tur === 'mum' ? 0.2 : 0.12, r = x.tur === 'lamba' ? 52 : x.tur === 'mum' ? 30 : 80;
      const [lx, ly] = P(p.x, p.y - (x.tur === 'mum' ? 10 : 9));
      gr = vg.createRadialGradient(lx, ly, 0, lx, ly, r * s);
      gr.addColorStop(0, `rgba(255, 196, 120, ${guc * nab})`); gr.addColorStop(1, 'rgba(255, 196, 120, 0)');
      vg.fillStyle = gr; vg.fillRect(0, 0, W * s, H * s);
    }
    const cl = st.esyalar.find((x) => x.tur === 'celenk' && YER[x.yer] && !gizli.has(x.tur));
    if (cl) {
      const p = YER[cl.yer]; gr = vg.createRadialGradient(...P(p.x, p.y + 4), 0, ...P(p.x, p.y + 4), 24 * s);
      gr.addColorStop(0, 'rgba(255, 200, 220, .12)'); gr.addColorStop(1, 'rgba(255, 200, 220, 0)');
      vg.fillStyle = gr; vg.fillRect(0, 0, W * s, H * s);
    }
    vg.globalCompositeOperation = 'source-over';
    gr = vg.createRadialGradient(...P(112, 60), 45 * s, ...P(112, 60), 150 * s);
    gr.addColorStop(0, 'rgba(14, 8, 26, 0)'); gr.addColorStop(1, 'rgba(14, 8, 26, .34)');
    vg.fillStyle = gr; vg.fillRect(0, 0, W * s, H * s);
    vg.restore();
  }
  function ciz(now = performance.now()) {
    if (!sahne) return;
    const t = (now - t0) / 1000;
    if (!arka) arkaCiz();
    g.clearRect(0, 0, W, H); g.drawImage(arka, 0, 0);
    for (const y of YILDIZ) { const b = calm() ? 0.7 : 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * y.h + y.f)); g.fillStyle = b > 0.75 ? '#ffffff' : b > 0.5 ? '#d9c8ff' : '#8f80c0'; g.fillRect(y.x, y.y, 1, 1); }
    const p = calm() ? 1 : 0.5 + 0.5 * Math.sin(t * 1.1), A = { x: 131, y: 22 }; // pencerede altın yıldız
    g.fillStyle = '#ffd56b'; g.fillRect(A.x, A.y, 1, 1); g.fillStyle = p > 0.4 ? '#ffe9a8' : '#c9a24a';
    g.fillRect(A.x - 1, A.y, 1, 1); g.fillRect(A.x + 1, A.y, 1, 1); g.fillRect(A.x, A.y - 1, 1, 1); g.fillRect(A.x, A.y + 1, 1, 1);
    rozetCiz(g, t);
    esyaKutulari = [];
    const es = Dunya.st().esyalar.filter((x) => YER[x.yer] && !gizli.has(x.tur)).sort((a, b) => YER[a.yer].y - YER[b.yer].y);
    es.filter((x) => YER[x.yer].y < 66).forEach((x) => esyaCiz(x, t));
    kediCiz(t);
    es.filter((x) => YER[x.yer].y >= 66).forEach((x) => esyaCiz(x, t));
    parcacikCiz(t);
    vg.imageSmoothingEnabled = false;
    vg.clearRect(0, 0, vg.canvas.width, vg.canvas.height);
    vg.drawImage(lo, 0, 0, vg.canvas.width, vg.canvas.height);
    isik(t);
  }
  function basla() {
    clearTimeout(dongu); cancelAnimationFrame(dongu);
    if (!sahne) return;
    if (calm() || !gorunur || document.hidden) { ciz(); return; }
    const adim = () => { if (!sahne) return; ciz(); dongu = setTimeout(() => { dongu = requestAnimationFrame(adim); }, 66); };
    adim();
  }

  // ---------- Luna'nın sözleri ----------
  const SOZ = {
    ilk: 'Anneciğim, bugün senin için küçücük bir sürpriz sakladık.',
    gecmis: 'Bunlar şimdiye kadarki emeğin 💜 Rozetlerin duvarda ve kitaplıkta, eşyaların da odanda.',
    mektup: 'Çok güzel çalıştın annem. Sana gelen mektuba bakalım mı?',
    ayni: ['Buradayım anneciğim 💜', 'Güçlü yine uyuyakaldı 🐾', 'Vesper yıldızları sayıyor ✨', 'Bu oda senin emeğinle doldu 💜'],
  };
  let balonT = 0;
  function soyle(metin, ms = 0) {
    const b = sahne && $('.dn-balon', sahne); if (!b) return;
    clearTimeout(balonT);
    b.innerHTML = '<span class="dn-kim">Luna</span>'; b.appendChild(document.createTextNode(metin));
    b.hidden = false; b.classList.remove('gel'); void b.offsetWidth; if (!calm()) b.classList.add('gel');
    balonYeri();
    const d = $('.dn-duyuru', sahne); if (d) d.textContent = 'Luna: ' + metin;
    konusma = performance.now() + 2600;
    if (calm()) ciz();
    if (ms) balonT = setTimeout(() => { b.hidden = true; }, ms);
  }
  function balonYeri() {
    const b = sahne && $('.dn-balon', sahne), k = sahne && $('.dn-kaydir', sahne);
    if (!b || b.hidden) return;
    const s = olcek, ax = 125 * s, bw = b.offsetWidth, sol = k.scrollLeft, gen = k.clientWidth;
    const left = Math.max(sol + 8, Math.min(sol + gen - bw - 8, ax - bw * 0.3));
    b.style.left = left + 'px';
    b.style.bottom = Math.min((H - 41) * s, H * s - b.offsetHeight - 8) + 'px';
    b.style.setProperty('--kuyruk', Math.max(14, Math.min(bw - 14, ax - left)) + 'px');
  }

  // ---------- Yer seçimi ----------
  let secili = null;
  function yerSecimi(tur) {
    if (!sahne) return;
    secili = tur;
    const b = $('.dn-balon', sahne); b.hidden = true;
    const e = Dunya.bilgi(tur), s = Dunya.st(), s0 = olcek;
    const kim = (y) => s.esyalar.find((x) => x.yer === y);
    $('.dn-yerler', sahne).innerHTML = Dunya.yerleri(tur).map((y) => {
      const [x0, y0, w, h] = yerKutusu(y), d = kim(y), ayni = d && d.tur === tur, ad = Dunya.YERLER[y].ad;
      const hiza = Dunya.YERLER[y].kat === 'asili' ? ' ust' : YER[y].x < 40 ? ' sol' : YER[y].x > 184 ? ' sag' : '';
      return `<button type="button" class="dn-yer${hiza}${d && !ayni ? ' dolu' : ''}" data-yer="${y}" style="left:${(x0 + w / 2) * s0}px;top:${(y0 + h / 2) * s0}px;width:${w * s0}px;height:${h * s0}px"
        aria-label="${esc(e.ad)}: ${esc(ad)}${ayni ? ' (şu an burada)' : d ? ` (${esc(Dunya.bilgi(d.tur) ? Dunya.bilgi(d.tur).ad : d.tur)} ile yer değiştirir)` : ''}"><span>${ayni ? 'Burada' : esc(ad)}</span></button>`;
    }).join('');
    const bar = $('.dn-yerbar', sahne);
    bar.innerHTML = `<span>${esc(e.ad)} için odada bir yer seç</span><span class="dn-dugmeler">
      <button type="button" class="btn soft small-btn" data-yer="">Dolaba kaldır</button><button type="button" class="btn primary small-btn" data-vazgec>Vazgeç</button></span>`;
    bar.hidden = false;
    const ilk = $('.dn-yer', sahne); if (ilk) ilk.focus({ preventScroll: true });
    bar.scrollIntoView({ block: 'nearest', behavior: calm() ? 'auto' : 'smooth' });
  }
  function yerKapat() { secili = null; if (!sahne) return; $('.dn-yerler', sahne).innerHTML = ''; const bar = $('.dn-yerbar', sahne); bar.hidden = true; bar.innerHTML = ''; }
  function yerTik(ev) {
    const b = ev.target.closest('button'); if (!b || !secili || !sahne) return;
    const tur = secili;
    if (b.hasAttribute('data-vazgec')) { yerKapat(); odakla(tur); return; }
    const hedef = b.dataset.yer;
    if (hedef !== undefined && Dunya.yerlestir(tur, hedef)) {
      if (hedef && !calm()) { const [x0, y0, w, h] = yerKutusu(hedef); parcaciklar.push({ tur: 'pirilti', x: x0 + w / 2, y: y0 + h / 2, t0: (performance.now() - t0) / 1000, omur: 0.9 }); }
      if (typeof Sound !== 'undefined' && Sound.stick) Sound.stick();
    }
    yerKapat(); pano(); odakla(tur);
    if (calm()) ciz();
  }
  const odakla = (tur) => { const b = sahne && $(`[data-yerini="${tur}"]`, sahne); if (b) b.focus({ preventScroll: true }); };

  // ---------- Pano: eşyalar, mektuplar, rozetler ----------
  let sekme = 'esya';
  const mini = new Map();
  function miniResim(tur, renk) {
    const k = tur + ':' + renk;
    if (mini.has(k)) return mini.get(k);
    const c = mk(32, 32), m = c.getContext('2d'); m.imageSmoothingEnabled = false;
    if (tur === 'celenk') { const t = mk(30, 12); celenk(t.getContext('2d'), 1, 1, 0, true); m.drawImage(t, 1, 10, 30, 12); }
    else { const s = esyaSprite(tur, renk); if (s) { const f = Math.max(1, Math.floor(Math.min(28 / s.width, 28 / s.height))); m.drawImage(s, Math.round((32 - s.width * f) / 2), Math.round((32 - s.height * f) / 2), s.width * f, s.height * f); } }
    const u = c.toDataURL(); mini.set(k, u); return u;
  }
  const uzunTarih = (k) => { const [y, m, d] = k.split('-').map(Number); return `${d} ${U.MONTHS[m - 1]} ${y}`; };
  function pano() {
    if (!sahne) return;
    const s = Dunya.st(), root = $('.dn-pano', sahne);
    sahne.querySelectorAll('.dn-sekme button').forEach((b) => { const on = b.dataset.sekme === sekme; b.classList.toggle('active', on); b.setAttribute('aria-selected', String(on)); });
    const yeni = Dunya.yeniMektup(), ma = $('.dn-mektup-ac', sahne);
    ma.hidden = !yeni; if (yeni) ma.dataset.mektup = yeni.id; else delete ma.dataset.mektup;
    const roz = Dunya.rozetler(), kazanilan = roz.filter((r) => r.at);
    $('.dn-ozet', sahne).textContent = `${s.esyalar.length} eşya · ${kazanilan.length} rozet`;
    if (sekme === 'esya') {
      root.innerHTML = (s.esyalar.length ? `<ul class="dn-liste">${s.esyalar.filter((x) => Dunya.bilgi(x.tur)).map((x) => {
        const e = Dunya.bilgi(x.tur), yer = Dunya.YERLER[x.yer];
        const renk = x.renkler.length > 1 ? `<span class="dn-renkler" role="radiogroup" aria-label="${esc(e.ad)} rengi">${x.renkler.map((r) => `<button type="button" role="radio" class="dn-renk" data-renk="${r}" data-tur="${x.tur}" style="background:${Dunya.RENKLER[r].a}" aria-checked="${r === x.renk}" aria-label="${Dunya.RENKLER[r].ad}"></button>`).join('')}</span>` : '';
        return `<li class="dn-esya"><img src="${miniResim(x.tur, x.renk)}" alt=""><span class="dn-ad"><b>${esc(e.ad)}</b><small>${yer ? esc(yer.ad) : 'Dolapta saklanıyor'}</small>${renk}</span>
          <button type="button" class="btn soft small-btn" data-yerini="${x.tur}" aria-label="${esc(e.ad)} için yer seç">Yerini seç</button></li>`;
      }).join('')}</ul>` : '<p class="dn-bos">Bugün planından bir madde bitirince ilk eşyan gelecek 🌱</p>')
        + '<p class="dn-not">Her gün planından ilk bitirdiğin madde odana bir eşya getirir; günün planı tamamen bitince bir tane daha. Ara verdiğin günlerde hiçbir şey kaybolmaz. Eşyaya odada dokunarak da yerini değiştirebilirsin.</p>';
    } else if (sekme === 'mektup') {
      root.innerHTML = `<ul class="dn-liste">${Dunya.mektuplar().map((m) => {
        const ac = Dunya.acilabilir(m), ok = Dunya.okundu(m), k = m.kosul || {};
        const kosul = k.tur === 'madde' ? `${k.sayi}. plan maddende açılır` : k.tur === 'tarih' ? `${uzunTarih(k.tarih)} günü açılır` : 'İstediğin zaman açabilirsin';
        const durum = !ac ? kosul : ok ? `Okundu${s.acildi[m.id] ? ' · ' + uzunTarih(s.acildi[m.id]) : ''}` : 'Yeni mektup';
        return `<li class="dn-mektup${ac ? '' : ' kilitli'}${ok ? ' okundu' : ''}"><span class="dn-zarf" aria-hidden="true"></span><span class="dn-ad"><b>${esc(m.baslik)}</b><small${ac && !ok ? ' class="dn-yeni"' : ''}>${esc(durum)}</small></span>
          <button type="button" class="btn ${ac && !ok ? 'primary' : 'soft'} small-btn" data-mektup="${esc(m.id)}" ${ac ? '' : 'disabled'}>${!ac ? 'Kilitli' : ok ? 'Tekrar oku' : 'Aç'}</button></li>`;
      }).join('')}</ul><p class="dn-not">Mektupları Çağan yazar; her biri kendi gününde ya da emeğin bir eşiğe varınca açılır.</p>`;
    } else {
      const gr = { cerceve: 'Duvardaki çerçeveler', kupa: 'Kitaplıktaki kupalar', madalya: 'Kitaplıktaki madalyalar', kitap: 'Kitaplıktaki kitaplar' };
      root.innerHTML = `<p class="dn-rozet-ozet"><b>${kazanilan.length}</b> / ${roz.length} rozet odanda</p>${Object.keys(gr).map((yer) => {
        const l = kazanilan.filter((r) => r.yer === yer);
        return l.length ? `<h4>${gr[yer]} <small>${l.length}</small></h4><div class="dn-rozetler">${l.map((r) => `<button type="button" class="dn-rozet" data-rozet="${esc(r.id)}" aria-label="${esc(r.ad)} rozeti" title="${esc(r.ad)}">${r.e}</button>`).join('')}</div>` : '';
      }).join('') || '<p class="dn-bos">İlk rozetin geldiğinde duvarına asılacak 🌱</p>'}<p class="dn-not">Rozetlerin hiçbir zaman silinmez; her yeni rozet odana kendiliğinden eklenir. Odada bir rozete dokununca kartı açılır.</p>`;
    }
    const yerdekiler = s.esyalar.filter((x) => YER[x.yer] && Dunya.bilgi(x.tur)).map((x) => Dunya.bilgi(x.tur).ad.toLocaleLowerCase('tr'));
    $('canvas', sahne).setAttribute('aria-label', `Yıldızlı pencerenin önünde Luna, Vesper ve Güçlü birlikte dinleniyor. Duvarda ve kitaplıkta ${kazanilan.length} rozet var.${yerdekiler.length ? ' Odada: ' + yerdekiler.join(', ') + '.' : ''}`);
  }

  // ---------- Mektup ----------
  let onceki = null;
  function mektupAc(id) {
    const m = Dunya.mektuplar().find((x) => x.id === id);
    if (!m || !Dunya.acilabilir(m) || !sahne) return;
    const ic = Dunya.icerik(m); if (!ic) return;
    const ilkKez = !Dunya.okundu(m);
    Dunya.oku(m);
    const perde = $('.dn-perde', sahne), kagit = $('.dn-kagit', sahne), tarih = Dunya.st().acildi[m.id];
    onceki = document.activeElement;
    kagit.innerHTML = `${tarih ? `<p class="dn-m-tarih">${uzunTarih(tarih)}</p>` : ''}<h2 class="dn-m-hitap" id="dn-m-hitap">${esc(ic.hitap)}</h2>
      <div class="dn-m-metin">${ic.paragraflar.map((p) => `<p>${esc(p)}</p>`).join('')}</div>${ic.imza ? `<p class="dn-m-imza">— ${esc(ic.imza)}</p>` : '<p class="dn-m-imza">💜</p>'}`;
    perde.hidden = false; perde.classList.remove('gel', 'acik'); void perde.offsetWidth;
    perde.classList.add(ilkKez && !calm() ? 'gel' : 'acik');
    kagit.scrollTop = 0;
    setTimeout(() => { const k = $('[data-dn="mektup-kapat"]', sahne); if (k) k.focus({ preventScroll: true }); }, ilkKez && !calm() ? 1500 : 0);
    pano(); kart();
    if (app && app.refreshHome) { try { app.refreshHome(); } catch (e) { /* yok say */ } } // Çalış'taki mektup kartı da "okundu" olsun
  }
  function mektupKapat() {
    const perde = sahne && $('.dn-perde', sahne);
    if (!perde || perde.hidden) return;
    perde.hidden = true; perde.classList.remove('gel', 'acik');
    if (onceki && onceki.focus && onceki.isConnected) onceki.focus({ preventScroll: true });
  }

  // ---------- Odayı aç / kapat ----------
  function olc() {
    const w = innerWidth, h = innerHeight;
    let s = Math.max(2, Math.min(5, Math.round(h * 0.5 / H)));
    if (s * W > w && Math.floor(w / W) >= 3) s = Math.floor(w / W);
    return s;
  }
  function boyut() {
    if (!sahne) return;
    olcek = olc();
    const oda = $('.dn-oda', sahne), c = $('canvas', sahne), k = Math.max(olcek, Math.round(olcek * Math.min(3, devicePixelRatio || 1)));
    oda.style.width = W * olcek + 'px'; oda.style.height = H * olcek + 'px';
    if (c.width !== W * k) { c.width = W * k; c.height = H * k; }
    const kay = $('.dn-kaydir', sahne);
    sahne.classList.toggle('kayar', kay.scrollWidth > kay.clientWidth + 2);
    if (secili) yerSecimi(secili);
    balonYeri();
    ciz();
  }
  function ortala() {
    const k = sahne && $('.dn-kaydir', sahne);
    if (k) k.scrollLeft = Math.max(0, 112 * olcek - k.clientWidth / 2);
  }
  function dokun(ev) {
    if (!sahne || secili) return;
    const c = $('canvas', sahne), r = c.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width * W, y = (ev.clientY - r.top) / r.height * H, pay = 1.5;
    const icinde = (k) => x >= k[0] - pay && x <= k[0] + k[2] + pay && y >= k[1] - pay && y <= k[1] + k[3] + pay;
    const roz = rozetKutulari.find((b) => icinde(b.k));
    if (roz && window.Badges) { Badges.openDetail(roz.id); return; }
    const es = esyaKutulari.slice().reverse().find((b) => icinde(b.k));
    if (es) { yerSecimi(es.tur); return; }
    const kedi = Object.keys(KONUM).find((k) => { const s = kediler()[k], sp = k === 'guclu' ? s : s && s.a; return sp && icinde([KONUM[k].x, KONUM[k].y - 2, sp.w, sp.h + 2]); });
    if (kedi) {
      if (!calm()) parcaciklar.push({ tur: 'kalp', x: KONUM[kedi].x + (kedi === 'vesper' ? 26 : kedi === 'luna' ? 6 : 8), y: KONUM[kedi].y - 2, t0: (performance.now() - t0) / 1000, omur: 2 });
      if (kedi === 'luna') soyle(Dunya.yeniMektup() ? SOZ.mektup : SOZ.ayni[Math.floor(Math.random() * SOZ.ayni.length)], 7000);
      if (typeof Sound !== 'undefined' && Sound.meow && kedi !== 'luna' && Math.random() < 0.3) Sound.meow();
      if (calm()) ciz();
    }
  }
  // yeni eşyalar odada pırıltıyla tek tek belirir
  function belirt(list, sonra) {
    const turler = list.map((r) => r.tur).filter((t, i, a) => a.indexOf(t) === i);
    turler.forEach((t) => gizli.add(t));
    const goster = (i) => {
      if (!sahne) { gizli.clear(); return; }
      if (i >= turler.length) { if (sonra) sonra(); return; }
      gizli.delete(turler[i]);
      const x = Dunya.st().esyalar.find((e) => e.tur === turler[i]);
      if (x && YER[x.yer] && !calm()) { const [x0, y0, w, h] = yerKutusu(x.yer); parcaciklar.push({ tur: 'pirilti', x: x0 + w / 2, y: y0 + h / 2, t0: (performance.now() - t0) / 1000, omur: 1.3, f: Math.random() }); }
      if (typeof Sound !== 'undefined' && Sound.stick && i < 3) Sound.stick();
      ciz();
      setTimeout(() => goster(i + 1), calm() ? 0 : 480);
    };
    setTimeout(() => goster(0), calm() ? 0 : 300);
  }
  const ad = (r) => (Dunya.bilgi(r.tur) ? Dunya.bilgi(r.tur).ad : r.tur);
  let oturum = 0; // her açılışın kendi numarası: kapatıp yeniden açınca eski gecikmeli sözler karışmasın
  function karsila() {
    const my = ++oturum, acik = () => !!sahne && my === oturum;
    const hg = Dunya.hosgeldin(), yeniler = Dunya.yeniEsya().map((x) => ({ tur: x.tur, renk: x.renk, yeni: x.renkler.length === 1 }));
    pano(); kart();
    const mektupSor = () => { if (acik() && Dunya.yeniMektup()) { soyle(SOZ.mektup, 12000); const b = $('.dn-mektup-ac', sahne); if (b && !calm()) { b.classList.remove('parla'); void b.offsetWidth; b.classList.add('parla'); } } };
    if (hg.length) {
      soyle(SOZ.ilk);
      setTimeout(() => { if (!acik()) return; belirt(hg, () => { if (!acik()) return; soyle(SOZ.gecmis); setTimeout(() => { if (acik()) mektupSor(); }, calm() ? 0 : 3800); }); }, calm() ? 0 : 2400);
    } else if (yeniler.length) {
      const r = yeniler[yeniler.length - 1], e = Dunya.st().esyalar.find((x) => x.tur === r.tur);
      belirt(yeniler, () => {
        soyle(yeniler.length > 1 ? `${yeniler.length} yeni şeyin var ✨ Yerlerini istediğin gibi seçebilirsin.` : e && e.renkler.length > 1 ? `${ad(r)} için yeni bir renk geldi: ${Dunya.RENKLER[e.renk].ad.toLocaleLowerCase('tr')} ✨` : `${ad(r)} odana geldi ✨ Yerini istediğin gibi seçebilirsin.`);
        setTimeout(() => { if (acik()) mektupSor(); }, calm() ? 0 : 4200);
      });
    } else if (Dunya.yeniMektup()) setTimeout(mektupSor, calm() ? 0 : 700);
    else setTimeout(() => acik() && soyle(Dunya.st().esyalar.length ? SOZ.ayni[Math.floor(Math.random() * SOZ.ayni.length)] : SOZ.ilk, 7000), calm() ? 0 : 700);
  }
  const ARROW_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>';
  function ac() {
    if (sahne || !window.Dunya) return;
    sahne = document.createElement('div');
    sahne.className = 'dn-sahne';
    sahne.setAttribute('role', 'dialog'); sahne.setAttribute('aria-modal', 'true'); sahne.setAttribute('aria-label', "Hazal'ın Küçük Dünyası");
    sahne.innerHTML = `<header class="dn-ust"><div class="dn-baslik"><b>Hazal'ın Küçük Dünyası</b><small class="dn-ozet"></small></div>
        <button type="button" class="dn-x" data-dn="kapat" aria-label="Odayı kapat">${ARROW_X}</button></header>
      <div class="dn-kaydir"><div class="dn-oda"><canvas role="img"></canvas><div class="dn-balon" hidden></div><div class="dn-yerler"></div></div></div>
      <p class="dn-ipucu">Sağa sola kaydır: duvarında çerçevelerin, kitaplığında kupaların ve kitapların var</p>
      <div class="dn-yerbar" role="group" aria-label="Yer seçimi" hidden></div>
      <div class="dn-icerik">
        <button type="button" class="btn primary dn-mektup-ac" hidden>💌 Mektubu aç</button>
        <div class="dn-sekme" role="tablist" aria-label="Oda bölümleri">
          <button type="button" role="tab" data-sekme="esya">Eşyalar</button><button type="button" role="tab" data-sekme="mektup">Mektuplar</button><button type="button" role="tab" data-sekme="rozet">Rozetler</button>
        </div>
        <div class="dn-pano" role="tabpanel"></div>
      </div>
      <p class="dn-duyuru" aria-live="polite"></p>
      <div class="dn-perde" hidden><div class="dn-mektup-kutu" role="dialog" aria-modal="true" aria-labelledby="dn-m-hitap">
        <div class="dn-zarf-buyuk" aria-hidden="true"><i class="kapak"></i><i class="muhur"></i></div>
        <article class="dn-kagit" tabindex="-1"></article>
        <button type="button" class="btn soft" data-dn="mektup-kapat">Mektubu kapat</button></div></div>`;
    document.body.appendChild(sahne);
    document.body.classList.add('dn-acik');
    lo = mk(W, H); g = lo.getContext('2d'); vg = $('canvas', sahne).getContext('2d');
    t0 = performance.now(); parcaciklar = []; gizli = new Set(); sekme = Dunya.yeniMektup() ? 'mektup' : 'esya';
    z.sokul = { at: 9, bitis: 11.4 };
    boyut(); ortala(); pano();
    if (!calm()) sahne.classList.add('gel');
    sahne.addEventListener('click', (e) => {
      if (!sahne) return;
      const t = e.target;
      if (t.closest('[data-dn="kapat"]')) { kapat(); return; }
      if (t.closest('[data-dn="mektup-kapat"]')) { mektupKapat(); return; }
      if (t === $('.dn-perde', sahne)) { mektupKapat(); return; }
      if (t.closest('.dn-yerler, .dn-yerbar')) { yerTik(e); return; }
      const sk = t.closest('[data-sekme]'); if (sk) { sekme = sk.dataset.sekme; pano(); return; }
      const yr = t.closest('[data-yerini]'); if (yr) { yerSecimi(yr.dataset.yerini); return; }
      const rk = t.closest('[data-renk]'); if (rk) { if (Dunya.renkSec(rk.dataset.tur, +rk.dataset.renk)) { pano(); ciz(); } return; }
      const mk2 = t.closest('[data-mektup]'); if (mk2) { mektupAc(mk2.dataset.mektup); return; }
      const rz = t.closest('[data-rozet]'); if (rz && window.Badges) { Badges.openDetail(rz.dataset.rozet); return; }
      if (t.tagName === 'CANVAS') dokun(e);
    });
    $('.dn-kaydir', sahne).addEventListener('scroll', balonYeri, { passive: true });
    window.addEventListener('resize', boyut);
    document.addEventListener('keydown', tus, true);
    document.addEventListener('visibilitychange', basla);
    if (window.IntersectionObserver) { const io = new IntersectionObserver((es) => { gorunur = es[es.length - 1].isIntersecting; basla(); }); io.observe($('canvas', sahne)); sahne._io = io; }
    basla();
    karsila();
  }
  function tus(e) {
    if (!sahne || e.key !== 'Escape') return;
    if (!$('#modal').classList.contains('hidden')) return; // rozet kartı açıksa önce o kapanır
    e.stopPropagation();
    if (!$('.dn-perde', sahne).hidden) mektupKapat();
    else if (secili) { const t = secili; yerKapat(); odakla(t); }
    else kapat();
  }
  function kapat() {
    if (!sahne) return;
    const sc = sahne;
    Dunya.gordu();
    clearTimeout(dongu); cancelAnimationFrame(dongu); clearTimeout(balonT);
    if (sc._io) sc._io.disconnect();
    window.removeEventListener('resize', boyut);
    document.removeEventListener('keydown', tus, true);
    document.removeEventListener('visibilitychange', basla);
    sahne = null; secili = null; gizli = new Set();
    document.body.classList.remove('dn-acik');
    sc.classList.add('kapaniyor');
    setTimeout(() => sc.remove(), calm() ? 0 : 260);
    kart();
    const k = $('#dunya-kart button'); if (k) k.focus({ preventScroll: true });
  }

  // ---------- Çalış sekmesindeki kart ----------
  function kart() {
    const el = $('#dunya-kart');
    if (!el || !window.Dunya) return;
    const s = Dunya.st(), roz = Dunya.rozetler().filter((r) => r.at).length, yeniE = Dunya.yeniEsya().length, yeniM = Dunya.yeniMektup();
    const ilk = !s.hosgeldin;
    const etiket = ilk ? 'Odan hazır ✨' : yeniM ? '💌 Yeni mektup' : yeniE ? `✨ ${yeniE} yeni eşya` : '';
    const alt = ilk ? 'Şimdiye kadarki emeğin seni bekliyor' : `${s.esyalar.length} eşya · ${roz} rozet odanda`;
    el.hidden = false;
    el.classList.toggle('yeni', !!etiket);
    el.innerHTML = `<button type="button" class="dunya-ac" aria-label="Hazal'ın Küçük Dünyası: odayı aç"><canvas class="dunya-kediler" width="88" height="20" aria-hidden="true"></canvas>
      <span class="dunya-yazi"><b>Hazal'ın Küçük Dünyası</b><small>${esc(alt)}</small>${etiket ? `<span class="dunya-etiket">${esc(etiket)}</span>` : ''}</span><span class="dunya-ok" aria-hidden="true">›</span></button>`;
    // kartta üç kedi yan yana dinlenir (sabit, küçük); çizimler ilk kez boşta hazırlanır, açılışı bekletmez
    const c = $('.dunya-kediler', el);
    const ciz = () => {
      if (!c.isConnected) return;
      const cg = c.getContext('2d'), S = kediler();
      if (!S.luna.a) return;
      cg.imageSmoothingEnabled = false;
      cg.drawImage(S.vesper.a.c, 0, 3); cg.drawImage(S.guclu.c, 33, 11); cg.drawImage(S.luna.a.c, 50, 3);
    };
    if (SP) ciz(); else (window.requestIdleCallback || ((f) => setTimeout(f, 1500)))(ciz, { timeout: 4000 });
  }

  return {
    init(a) {
      app = a;
      if (!window.Dunya) return;
      kart();
      $('#dunya-kart') && $('#dunya-kart').addEventListener('click', (e) => { if (e.target.closest('.dunya-ac')) ac(); });
      // planda madde bitince: eşya geldi haberi; oda açıksa hemen belirir
      Dunya.dinle((list) => {
        const r = list[list.length - 1];
        const yazi = r.yeni ? `${ad(r)} odana geldi` : `${ad(r)} için yeni bir renk geldi`;
        if (app && app.toast) app.toast('🪴', 'Küçük Dünyana bir hediye geldi', `${yazi} 💜`, 5200);
        kart();
        if (sahne) { belirt(list, () => soyle(`${yazi} ✨`, 6000)); pano(); }
      });
    },
    kart,
    ac,
    kapat,
    acik: () => !!sahne,
  };
})();

if (typeof window !== 'undefined') { window.DunyaUI = DunyaUI; }
