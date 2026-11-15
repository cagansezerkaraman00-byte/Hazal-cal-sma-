/* Luna hesap makinesi — ekranın üstünde uyuyan kediler: Luna, Vesper ve yavru Güçlü.
   Çizimler Luna'nın kendi piksel çizimleridir: js/scene.js'teki parçalar, renkler ve uyku pozu burada birebir aynen
   kullanılır (scene.js'e dokunulmaz; test/kedi-test.cjs aynı kaldıklarını denetler). Bir kez küçük bir tuvale çizilir,
   CSS ile piksel piksel büyütülür. */
(function (kok) {
  // ---------- js/scene.js'ten aynen (Luna'nın sprite'ları) ----------
  const PART = {
    head: [
      '....o..........o....',
      '....oo........oo....',
      '....opo......opo....',
      '....oPpo....opPo....',
      '...owpPpoooopPpwo...',
      '...owwwwwwwwwwwwo...',
      '..owwwwwwwwwwwwwwo..',
      '..owwehewwwwehewwo..',
      '..owwEkEwwwwEkEwwo..',
      'xxowwwwwwppwwwwwwoxx',
      '...owwwwmwwmwwwwo...',
      'xxowswwwwwwwwwwswoxx',
      '...oosswwwwwwssoo...',
    ],
    loafBody: [
      '.......o..o.o......',
      '....oooowoowowoo...',
      '...owwwwwwwwwwwwwo.',
      '..owwwwwwwwwwwwwwwo',
      '.owwwwwwwwwwwwwwwso',
      'owwwwwwwwwwwwwwwsso',
      'owwwwwwwwwwwwwwwsso',
      'owwwwwwwwwwwwwwssso',
      'owwwwwwwwwwwwwwssSo',
      'owwwwwwwwwwwwwsssSo',
      'oswwwwwwwwwwwssSSSo',
      'osswwwwwwwwsssSSSo.',
      '.oooooooooooooooo..',
    ],
    pawsLoaf: [
      'owwmwwowwmwwo',
      '.ooooo.ooooo.',
    ],
    tailLoafB: [
      '........',
      '......oo',
      'oooooowo',
      'owwwwsso',
      '.oooooo.',
    ],
  };
  const KIT_SLEEP = [
    '.o.....o..........',
    'opo...opo.ooooo...',
    'oPpooopPoowswsoo..',
    'owwswswwowwwwwwso.',
    'owoowoowowswswwwo.',
    'owwwpwwwowwwwwwswo',
    'occcccccoswswswwso',
    '.ocpcpccowwwwwwwso',
    '..ooooooooooooooo.',
  ];
  const ITEM = {
    heart: [
      '.h.h.',
      'hhhhh',
      '.hhh.',
      '..h..',
    ],
    z: [
      'zzzz',
      '..z.',
      '.z..',
      'zzzz',
    ],
  };
  const LUNA_PAL = {
    t: '#72c9ef', o: '#665c82', m: '#b3acd0', w: '#fdfcff', s: '#e6e1f3', S: '#cdc6e2', p: '#f7b3c6', P: '#e98aa4',
    e: '#f2b441', E: '#c98524', k: '#4a2f14', h: '#ffffff', x: '#d4cee6',
  };
  const VES_PAL = {
    t: '#72c9ef', o: '#706582', m: '#3d3956', w: '#2a2639', s: '#34304a', S: '#403b5a', p: '#b77089', P: '#9a5672',
    e: '#5ccbff', E: '#2c8fe0', k: '#08141f', h: '#ffffff', x: '#6c678c',
  };
  const KIT_PAL = {
    t: '#72c9ef', o: '#79421f', w: '#ffb45c', s: '#f08a2c', S: '#d06a18', c: '#fff1d6', m: '#c9753a',
    p: '#ff9db3', P: '#e9789a', e: '#9be36a', E: '#5fae3a', k: '#1f2a12', h: '#ffffff', x: '#e8c9a8',
  };
  const ITEM_PAL = { h: '#ff6b9a', z: '#e9e4ff' };
  function blank(w, h) { return Array.from({ length: h }, () => '.'.repeat(w)); }
  function put(base, part, x, y, soft) {
    const out = base.map((r) => r.split(''));
    part.forEach((row, j) => {
      const line = out[y + j];
      if (!line) return;
      [...row].forEach((ch, i) => {
        const c = x + i;
        if (ch === '.' || c < 0 || c >= line.length) return;
        if (ch === 'x' && line[c] !== '.') return; // bıyık tüyün altında kalır
        line[c] = soft && ch === 'o' && 'wsSm'.includes(line[c]) ? 'm' : ch;
      });
    });
    return out.map((r) => r.join(''));
  }
  const mirror = (rows) => rows.map((r) => [...r].reverse().join(''));
  const EYES = { blink: ['www', 'ooo'], sleep: ['owo', 'wow'], happy: ['wow', 'owo'] };
  function eyes(rows, kind) {
    const j = rows.findIndex((r) => r.includes('h'));
    if (j < 0) return rows;
    const [top, bot] = EYES[kind];
    const out = rows.map((r) => r.split(''));
    for (let i = 1; i < out[j].length - 1; i++) {
      if (out[j][i] !== 'h') continue;
      for (let d = -1; d <= 1; d++) { out[j][i + d] = top[d + 1]; out[j + 1][i + d] = bot[d + 1]; }
    }
    return out.map((r) => r.join(''));
  }
  // Luna'nın uyku pozu (scene.js poseRows: add('sleep', eyes(loaf(PART.tailLoafB, true), 'sleep'), 9.5, -1))
  function uykuLuna() {
    let b = blank(35, 17);
    b = put(b, PART.loafBody, 11, 3);
    b = put(b, PART.tailLoafB, 27, 11, true);
    b = put(b, PART.head, 0, 2);
    b = put(b, PART.pawsLoaf, 3, 15, true);
    return mirror(eyes(b, 'sleep'));
  }
  // ---------- çizim ----------
  function boya(g, rows, pal, x0, y0) {
    rows.forEach((row, j) => [...row].forEach((ch, i) => {
      if (ch === '.') return;
      g.fillStyle = pal[ch] || '#f0f';
      g.fillRect(x0 + i, y0 + j, 1, 1);
    }));
  }
  // Uyuyan üç kedi: soldan Luna, Vesper, Güçlü; Vesper'in üstünde z'ler, Güçlü'nün üstünde kalp
  function ciz(tuval) {
    const luna = uykuLuna(), w = 92, h = 26;
    tuval.width = w; tuval.height = h;
    const g = tuval.getContext('2d');
    g.clearRect(0, 0, w, h);
    boya(g, luna, VES_PAL, 30, h - 17);  // Vesper (Luna'nın pozlarıyla, simsiyah)
    boya(g, luna, LUNA_PAL, 0, h - 17);  // Luna önde
    boya(g, mirror(KIT_SLEEP), KIT_PAL, 70, h - 9); // yavru Güçlü
    return { w, h };
  }
  function kucuk(tuval, rows) { tuval.width = rows[0].length; tuval.height = rows.length; boya(tuval.getContext('2d'), rows, ITEM_PAL, 0, 0); }
  // kap: kedilerin oturacağı öğe (ekranın üst kenarı). Dönüş: öğe
  function yerlestir(kap) {
    const el = document.createElement('div');
    el.className = 'hm-kediler';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<canvas class="hm-kedi-tuval"></canvas><canvas class="hm-z z1"></canvas><canvas class="hm-z z2"></canvas><canvas class="hm-z z3"></canvas><canvas class="hm-kalp"></canvas>';
    ciz(el.querySelector('.hm-kedi-tuval'));
    el.querySelectorAll('.hm-z').forEach((c) => kucuk(c, ITEM.z));
    kucuk(el.querySelector('.hm-kalp'), ITEM.heart);
    kap.appendChild(el);
    return el;
  }
  const HesapKediler = { yerlestir, ciz, uykuLuna, VERI: { PART, KIT_SLEEP, ITEM, LUNA_PAL, VES_PAL, KIT_PAL } };
  if (typeof module !== 'undefined' && module.exports) module.exports = HesapKediler;
  kok.HesapKediler = HesapKediler;
})(typeof window !== 'undefined' ? window : globalThis);
