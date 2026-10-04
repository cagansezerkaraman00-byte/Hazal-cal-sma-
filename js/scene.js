/* Gökyüzü sahnesi: gerçek saate göre güneş/ay, yıldızlar, hava durumu, gece açan zambaklar ve pixel art Luna.
   Pil dostu: arka plan ve bütün sprite'lar bir kez ekran dışı kanvaslara çizilir, her karede yalnızca kopyalanır.
   Sahne görünmezken (sekme gizli ya da sayfa kaydırılmış) döngü tamamen durur. */

const Scene = (() => {
  // ---------- Luna'nın sprite'ları ----------
  // Gerçek Luna: bembeyaz, uzun tüylü, kehribar gözlü, pembe burunlu ve pembe kulaklı.
  // o: dış hat, m: yumuşak iç hat, w: beyaz tüy, s/S: tüy gölgesi, p/P: pembe, e/E: kehribar göz,
  // k: göz bebeği, h: göz parıltısı, x: bıyık (yalnızca boş piksellere çizilir)
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
    ruff: [
      'owwwwwwwwwwwwwww',
      'owwwwswwwwswwwww',
      '.owswwwswwwwswww',
    ],
    pawsLoaf: [
      'owwmwwowwmwwo',
      '.ooooo.ooooo.',
    ],
    tailLoafA: [
      '....o.o.',
      '...owowo',
      'oooowwso',
      'owwwwsso',
      '.oooooo.',
    ],
    tailLoafB: [
      '........',
      '......oo',
      'oooooowo',
      'owwwwsso',
      '.oooooo.',
    ],
    walkBody: [
      '....o..o..o........',
      '..oowoowoowooooooo.',
      '.owwwwwwwwwwwwwwwwo',
      'owwwwwwwwwwwwwwwwwo',
      'owwwwwwwwwwwwwwwwwo',
      'oswwwwwwwwwwwwwwwso',
      '.osswwwwwwwwwwwwsso',
      '..oosssssssssssso..',
    ],
    legsA: [
      '.oSo..owo....oSo..owo.',
      '.oSo..owo....oSo..owo.',
      '.oSSo.owwo...oSSo.owwo',
      '.oooo.oooo...oooo.oooo',
    ],
    legsB: [
      'oSo....owo..oSo....owo',
      'oSo....owo..oSo....owo',
      'oSSo...owwo.oSSo...owwo',
      'oooo...oooo.oooo...oooo',
    ],
    legsCrouch: [
      'oSSo.owwwo..oSSo.owwwo',
      'oooo.ooooo..oooo.ooooo',
    ],
    tailWalkA: [
      '.o.o....',
      'owowo...',
      'owwwwo..',
      'owwwwso.',
      '.owwwso.',
      '..owwso.',
      '..owwwo.',
      '...owwwo',
      '....owwo',
    ],
    tailWalkB: [
      '........',
      '.o.o....',
      'owowoo..',
      'owwwwwo.',
      '.owwwso.',
      '..owwwo.',
      '..owwwo.',
      '...owwwo',
      '....owwo',
    ],
    tailFlat: [
      '.o.o.....',
      'owowooooo',
      'owwwwwwwo',
      '.ooooooo.',
    ],
    // oturuş (sağa bakar): kalça + göğüs + uzak ön bacak; yakın ön bacak ayrı parça
    sitBody: [
      '.........ooooo................',
      '.......oowwwwwo...............',
      '......owwwwwwwwo..............',
      '.....owwwwwwwwww..............',
      '....owwwwwwwwwww..............',
      '....owwwwwwwwwwwwwwwwwwwwwo...',
      '...owwwwwwwwwwwwwswwwswwwwo...',
      '...owwwwwwwwwwwwwwwwwwwwwwo...',
      '..owwwwwwwwwmwwwwwso..........',
      '..owwwwwwwwwwmwwwwso..........',
      '..oswwwwwwwwwmwwwwso..........',
      '..osswwwwwwwmwwwmwso..........',
      '...ooooooooooooooooo..........',
    ],
    sitTail: [
      '.oo..........',
      'owwo.........',
      'owwwooooooooo',
      '.owwwwwwwwwso',
      '..ooooooooooo',
    ],
    legDown: [
      '.wwwwwo',
      'mwwwwwo',
      'mwwwwwo',
      'mwwwwwo',
      'mwwmwwo',
      'ooooooo',
    ],
    pawUp: [
      '...ooo.',
      '..owwwo',
      '.owwwwo',
      'owwwwo.',
      'owwwo..',
      'mwwo...',
    ],
    pawSwipe: [
      '.wwwo.....',
      'mwwwwooooo',
      'mwwwwwwmwo',
      'oooooooooo',
    ],
  };

  function blank(w, h) { return Array.from({ length: h }, () => '.'.repeat(w)); }
  // soft: parçanın dış hattı başka bir tüyün üstüne düşerse yumuşak iç hat olur (gövdeyi kesmesin)
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

  // Göz ifadeleri (3x2, parıltının çevresi): kırpma çizgisi, uyku ‿, mutlu ^
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

  // Pozlar sağa bakacak şekilde saklanır. hx: kafanın orta sütunu; Luna'nın konumu (L.x) bu sütundur.
  function poseRows() {
    const R = {};
    const add = (name, rows, hx, face = 1) => {
      R[name] = face < 0 ? { rows: mirror(rows), hx: rows[0].length - 1 - hx } : { rows, hx };
    };
    const loaf = (tail, low) => {
      let b = blank(35, 17);
      b = put(b, PART.loafBody, 11, 3);
      b = put(b, tail, 27, 11, true);
      if (!low) b = put(b, PART.ruff, 2, 12, true);
      b = put(b, PART.head, 0, low ? 2 : 0);
      b = put(b, PART.pawsLoaf, 3, 15, true);
      return b;
    };
    add('loafA', loaf(PART.tailLoafA), 9.5, -1);
    add('loafB', loaf(PART.tailLoafB), 9.5, -1);
    add('happy', eyes(loaf(PART.tailLoafA), 'happy'), 9.5, -1);
    add('sleep', eyes(loaf(PART.tailLoafB, true), 'sleep'), 9.5, -1);
    const walk = (legs, tail) => {
      let b = blank(38, 19);
      b = put(b, tail, 0, 0);
      b = put(b, PART.walkBody, 4, 7);
      b = put(b, legs, 4, 15);
      return put(b, PART.head, 18, 1);
    };
    add('walkA', walk(PART.legsA, PART.tailWalkA), 27.5);
    add('walkB', walk(PART.legsB, PART.tailWalkB), 27.5);
    // pusu: gövde alçakta, kuyruk düz
    let c = blank(38, 19);
    c = put(c, PART.tailFlat, 0, 11);
    c = put(c, PART.walkBody, 4, 9);
    c = put(c, PART.legsCrouch, 4, 17);
    add('crouch', put(c, PART.head, 18, 4), 27.5);
    // oturuş + pati vuruşu
    const sit = (paw, px, py) => {
      let b = blank(30, 21);
      b = put(b, PART.sitBody, 0, 8);
      b = put(b, paw, px, py, true);
      b = put(b, PART.sitTail, 0, 16, true);
      return put(b, PART.head, 8, 0);
    };
    add('sitUp', sit(PART.legDown, 19, 15), 17.5);
    add('playUp', sit(PART.pawUp, 21, 10), 17.5);
    add('playSwipe', sit(PART.pawSwipe, 19, 17), 17.5);
    for (const k of ['loafA', 'walkA', 'walkB', 'crouch', 'sitUp']) R[k + 'B'] = { rows: eyes(R[k].rows, 'blink'), hx: R[k].hx };
    return R;
  }

  // Diğer küçük çizimler
  const ITEM = {
    book: [
      '.bbbb.bbbb.',
      'bwwwwbwwwwb',
      'bwllwbwllwb',
      'bwwwwbwwwwb',
      '.bbbbbbbbb.',
    ],
    lantern: [
      '..y..',
      '.yyy.',
      'yoooy',
      'yoooy',
      'yoooy',
      '.yyy.',
    ],
    fish: [
      '.fff.f',
      'efffff',
      '.fff.f',
    ],
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
    star: [
      '.a.',
      'aAa',
      '.a.',
    ],
    starBig: [
      '..b..',
      '..a..',
      'baAab',
      '..a..',
      '..b..',
    ],
    firefly: [
      '.f.',
      'fFf',
      '.f.',
    ],
  };
  const ITEM_PAL = {
    b: '#7a4fd0', w: '#f8f3ff', l: '#c7bde6', y: '#ffcf3f', o: '#fff1a8', f: '#7ad3ff', e: '#13111e', h: '#ff6b9a',
    z: '#e9e4ff', A: '#ffffff', a: 'rgba(255,255,255,.55)', F: '#fff59a',
  };
  ITEM_PAL.firefly = { f: 'rgba(255,245,154,.35)', F: '#fff59a' };
  ITEM_PAL.star = { A: '#fffbe8', a: 'rgba(255,250,230,.6)', b: 'rgba(255,250,230,.28)' };

  // Zambaklar: tomurcuk → yarı açık → açık. a: sapın tepesine oturan satır
  const LILY = {
    bud: [
      '.M.',
      'LMD',
      'LMD',
      'GgG',
    ],
    half: [
      'L..t..L',
      'LM.t.ML',
      '.LMcML.',
      '.LMDML.',
      '..LML..',
      '..GgG..',
    ],
    open: [
      '....L....',
      '...LML...',
      'LL.LDL.LL',
      '.LMMDMML.',
      '..tDcDt..',
      '.LMMDMML.',
      'LL.LDL.LL',
      '...LML...',
      '....L....',
    ],
    leaf: [
      '...g',
      '.gg.',
      'gG..',
    ],
  };
  const LILY_AT = { bud: 3, half: 5, open: 6 };
  const LILY_COLORS = [
    { L: '#ffd3e6', M: '#ff8cc0', D: '#d84d93', c: '#ffe066', glow: '#ff9fcf' }, // pembe
    { L: '#eadcff', M: '#b88cff', D: '#7e52d8', c: '#ffe066', glow: '#c6a6ff' }, // lila
    { L: '#ffffff', M: '#f0ebff', D: '#bdb4dc', c: '#d8f07a', glow: '#ffffff' }, // beyaz
    { L: '#ffd6bf', M: '#ff9166', D: '#de5536', c: '#ffe066', glow: '#ffb08f' }, // mercan
    { L: '#e0f4ff', M: '#8fd1ff', D: '#3d8be0', c: '#fff1a0', glow: '#a8dcff' }, // gök mavisi
    { L: '#fff7c9', M: '#ffd84d', D: '#dc9b17', c: '#ff8f3c', glow: '#ffe680' }, // sarı
  ];
  const LILY_BASE = { t: '#9c3d26', g: '#5aa25a', G: '#2f6b3a' };

  const LUNA_PAL = {
    o: '#7d7699', m: '#b3acd0', w: '#fdfcff', s: '#e6e1f3', S: '#cdc6e2', p: '#f7b3c6', P: '#e98aa4',
    e: '#f2b441', E: '#c98524', k: '#4a2f14', h: '#ffffff', x: '#d4cee6',
  };

  // ---------- Sprite'ları kanvaslara çiz (bir kez) ----------
  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function paint(rows, pal, flip) {
    const w = rows[0].length, c = makeCanvas(w, rows.length), g = c.getContext('2d');
    rows.forEach((row, j) => {
      for (let i = 0; i < w; i++) {
        const ch = row[i];
        if (ch === '.') continue;
        g.fillStyle = pal[ch] || '#f0f';
        g.fillRect(flip ? w - 1 - i : i, j, 1, 1);
      }
    });
    return c;
  }
  function disc(g, cx, cy, rad, color) {
    g.fillStyle = color;
    for (let y = -rad; y <= rad; y++) {
      const half = Math.floor(Math.sqrt(rad * rad - y * y) + 0.3);
      g.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
    }
  }
  function glowCanvas(r, color, a) {
    const c = makeCanvas(r * 2 + 1, r * 2 + 1), g = c.getContext('2d');
    g.globalAlpha = a;
    for (let k = r; k > 1; k -= 2) disc(g, r, r, k, color);
    return c;
  }

  let SP = null;
  function sprites() {
    if (SP) return SP;
    SP = { luna: {}, lily: [] };
    const R = poseRows();
    for (const k in R) {
      const { rows, hx } = R[k];
      SP.luna[k] = { c: [paint(rows, LUNA_PAL), paint(rows, LUNA_PAL, true)], w: rows[0].length, h: rows.length, hx };
    }
    for (const k of ['book', 'lantern', 'fish', 'heart', 'z']) SP[k] = paint(ITEM[k], ITEM_PAL);
    SP.star = paint(ITEM.star, ITEM_PAL.star);
    SP.starBig = paint(ITEM.starBig, ITEM_PAL.star);
    SP.firefly = paint(ITEM.firefly, ITEM_PAL.firefly);
    SP.lanternGlow = glowCanvas(9, '#ffe9a0', 0.08);
    SP.lily = LILY_COLORS.map((col) => {
      const pal = { ...LILY_BASE, ...col };
      const o = { glow: glowCanvas(7, col.glow, 0.13) };
      for (const st of ['bud', 'half', 'open']) {
        const c = paint(LILY[st], pal);
        o[st] = { c, ax: (c.width - 1) >> 1, ay: LILY_AT[st] };
      }
      return o;
    });
    // ip yumağı: dönen şerit desenli 3 kare
    SP.yarn = [0, 1, 2].map((k) => {
      const rows = ['.bbb.'];
      for (let i = 1; i <= 3; i++) {
        let r = i === 3 ? 'c' : 'b';
        for (let j = 1; j <= 3; j++) r += i === 1 && j === 1 ? 'h' : ((i - j + k + 3) % 3 === 0 ? 'd' : 'a');
        rows.push(r + 'c');
      }
      rows.push('.ccc.');
      return paint(rows, YARN_PAL);
    });
    return SP;
  }
  const YARN_PAL = { a: '#ffb8d6', b: '#f285b8', c: '#c4558f', d: '#b993ff', h: '#fff4fa' };
  const THREAD = '#e27fb1';

  // ---------- Durum ----------
  let cv, ctx, wrap, bubbleEl, onPoke = null;
  let W = 0, H = 0, scale = 4, horizon = 60, groundY = 80, wrapW = 0;
  let mode = 'idle'; // idle | focus | break
  let sun = null, light = 1, night = 0, dusk = 0, hour = 12, sunPos = null, moonPos = null;
  let lastT = 0, acc = 0, time = 0, sunT = 99, raf = 0, visible = true, resizeT = 0;
  let bgDirty = true, bgAt = -1e9, bgElev = 999;
  // ekran dışı katmanlar
  let skyCv = null, skyCtx = null, landCv = null, landCtx = null, landTop = 0, milkyCv = null, consCv = null;
  let starLayers = [], bright = [], consPts = [], hillFar = [], hillNear = [], lilies = [], fogBands = [];
  let sunCv = null, moonCv = null, cloudCvs = [], leafCv = [], rayColor = '#ffe27a', stemColor = '#4f9a52', fogColor = '#ffffff', cloudA = 1;
  let clouds = [], flies = [], particles = [], drops = [], shooting = null, nextShoot = 6;
  const splashes = Array.from({ length: 14 }, () => ({ x: 0, y: 0, t: 1 }));
  let weather = { kind: 'clear', intensity: 0 }, fx = null, wk = 0, starVis = 1, nextFlash = 12, flashT = 0;
  let fishItem = null, yarn = null, play = null, nextPlay = U.rand(90, 240);
  let bubbleUntil = 0, bubbleOn = false, bubbleW = 0, bubbleL = -1, bubbleB = -1, bubbleA = -1;

  const L = { x: 60, y: 0, vy: 0, dir: 1, state: 'walk', ft: 0, target: 80, wait: 0, blinkIn: 3, blink: 0, eatT: 0, nap: false, awake: 0, speed: 16 };

  // ---------- Renk yardımcıları ----------
  function hex2rgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mixHex(a, b, t) {
    const A = hex2rgb(a), B = hex2rgb(b);
    const c = (i) => Math.round(U.lerp(A[i], B[i], t)).toString(16).padStart(2, '0');
    return `#${c(0)}${c(1)}${c(2)}`;
  }

  // Güneş yüksekliğine göre gökyüzü renkleri [yükseklik, üst, alt]
  const SKY = [
    [-90, '#05071a', '#141838'],
    [-18, '#070b22', '#1b1f4d'],
    [-12, '#0d1236', '#2c2663'],
    [-6, '#1f1c55', '#6a3f7d'],
    [-2, '#2f3373', '#e07b6c'],
    [2, '#4b6db0', '#f7b46b'],
    [8, '#5a97de', '#b9d9f2'],
    [25, '#3f8fe2', '#a3d6ff'],
    [90, '#2f82dc', '#9bd2ff'],
  ];
  function skyColors(elev) {
    for (let i = 0; i < SKY.length - 1; i++) {
      const a = SKY[i], b = SKY[i + 1];
      if (elev >= a[0] && elev <= b[0]) {
        const t = (elev - a[0]) / (b[0] - a[0]);
        return [mixHex(a[1], b[1], t), mixHex(a[2], b[2], t)];
      }
    }
    return [SKY[0][1], SKY[0][2]];
  }

  // Hava durumu: gökyüzü tonu (gündüz/gece), yıldızları örtme, bulut sayısı, güneşin parlaklığı
  const WX = {
    clear: { k: 0, cover: 0, clouds: 4, sun: 1 },
    cloudy: { tint: '#8d99b0', night: '#1d2136', k: 0.32, cover: 0.45, clouds: 9, sun: 0.72 },
    fog: { tint: '#c4cad6', night: '#3a3f58', k: 0.5, cover: 0.65, clouds: 3, sun: 0.5, fog: 1 },
    drizzle: { tint: '#7f8ca6', night: '#181c30', k: 0.38, cover: 0.6, clouds: 8, sun: 0.55, rain: 0.5 },
    rain: { tint: '#5d6a88', night: '#121628', k: 0.5, cover: 0.8, clouds: 10, sun: 0.4, rain: 1 },
    snow: { tint: '#dde3ef', night: '#3a4062', k: 0.45, cover: 0.65, clouds: 8, sun: 0.6, snow: 1 },
    storm: { tint: '#3d4560', night: '#0e1120', k: 0.62, cover: 0.9, clouds: 11, sun: 0.3, rain: 1, storm: 1 },
  };
  fx = WX.clear;

  // ---------- Güneş hesabı (NOAA yaklaşık formülü) ----------
  function solar(date) {
    const { lat, lon } = Store.data.settings;
    const rad = Math.PI / 180;
    const start = new Date(date.getFullYear(), 0, 0);
    const doy = Math.floor((date - start) / 864e5);
    const g = (2 * Math.PI / 365) * (doy - 1 + (date.getHours() - 12) / 24);
    const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const tz = -date.getTimezoneOffset();
    const mins = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
    const ha = ((mins + eqt + 4 * lon - tz) / 4 - 180) * rad;
    const latr = lat * rad;
    const cosZ = Math.sin(latr) * Math.sin(decl) + Math.cos(latr) * Math.cos(decl) * Math.cos(ha);
    const elev = 90 - Math.acos(U.clamp(cosZ, -1, 1)) / rad;
    const cosH0 = (Math.cos(90.833 * rad) - Math.sin(latr) * Math.sin(decl)) / (Math.cos(latr) * Math.cos(decl));
    const H0 = Math.acos(U.clamp(cosH0, -1, 1)) / rad;
    const noon = 720 - 4 * lon - eqt + tz;
    const noonElev = 90 - Math.abs(lat - decl / rad);
    return { elev, mins, sunrise: noon - 4 * H0, sunset: noon + 4 * H0, noon, noonElev };
  }

  function moonPhase(date) {
    const ref = Date.UTC(2000, 0, 6, 18, 14);
    const syn = 29.530588853;
    const p = (((date - ref) / 864e5) % syn + syn) % syn;
    return p / syn; // 0 yeni ay, 0.5 dolunay
  }

  function arcPos(frac, peak) {
    const x = W * (0.06 + 0.88 * frac);
    const y = horizon + 4 - Math.sin(frac * Math.PI) * (horizon - 10) * peak;
    return [Math.round(x), Math.round(y)];
  }

  // Saniyede bir: güneş, gece katsayısı, güneş/ay konumu; gökyüzü belirgin değiştiyse arka planı yenile
  function updateSun() {
    const date = new Date();
    sun = solar(date);
    hour = date.getHours();
    light = U.clamp((sun.elev + 6) / 16, 0, 1);
    night = U.clamp((-sun.elev - 2) / 10, 0, 1);
    dusk = U.clamp(1 - Math.abs(sun.elev - 1) / 8, 0, 1);
    const { mins, sunrise, sunset } = sun;
    sunPos = mins >= sunrise - 25 && mins <= sunset + 25
      ? arcPos((mins - sunrise) / (sunset - sunrise), U.clamp(sun.noonElev / 70, 0.45, 1)) : null;
    const nightLen = 1440 - (sunset - sunrise);
    let frac = null;
    if (mins > sunset - 20) frac = (mins - sunset) / nightLen;
    else if (mins < sunrise + 20) frac = (mins + 1440 - sunset) / nightLen;
    moonPos = frac === null ? null : arcPos(U.clamp(frac, -0.05, 1.05), 0.8);
    const d = Math.abs(sun.elev - bgElev);
    if (d > 0.5 || (time - bgAt > 45 && d > 0.02 && !(sun.elev < -20 && bgElev < -20))) bgDirty = true;
  }

  // ---------- Kurulum (boyut değişince) ----------
  function seeded(seed) {
    return () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  }
  // yumuşak değer gürültüsü (samanyolu bulutsusu için)
  function hash(x, y) {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return U.lerp(U.lerp(a, b, u), U.lerp(c, d, u), v);
  }

  const studyHX = () => Math.round(U.clamp(W * 0.42, 30, W - 34));
  const sleepHX = () => Math.round(U.clamp(W * 0.3, 30, W - 30));
  const roamMax = () => Math.max(31, W - 30);
  const bandY = (x) => horizon * (0.92 - 0.8 * (x / W)) + Math.sin(x / 37) * 3;

  function buildWorld() {
    const r = seeded(20240214);
    const skyH = Math.max(8, horizon - 3);
    // samanyolu: yumuşak, hafif pikselli bir bulutsu bandı
    milkyCv = makeCanvas(W, skyH);
    const mg = milkyCv.getContext('2d'), img = mg.createImageData(W, skyH), px = img.data;
    const half = Math.max(7, horizon * 0.2);
    for (let y = 0; y < skyH; y++) {
      for (let x = 0; x < W; x++) {
        const off = (y - bandY(x)) / half;
        if (off <= -1 || off >= 1) continue;
        let v = 1 - off * off;
        v *= v * (0.35 + 0.65 * vnoise(x / 7, y / 5));
        v *= 1 - 0.55 * Math.max(0, 1 - Math.abs(off + 0.12) * 6) * vnoise(x / 11 + 40, y / 4); // toz şeridi
        const a = Math.round(v * 5) / 5;
        if (a <= 0) continue;
        const i = (y * W + x) * 4;
        px[i] = 205; px[i + 1] = 200; px[i + 2] = 255; px[i + 3] = Math.round(a * 70);
      }
    }
    mg.putImageData(img, 0, 0);
    // yıldızlar: 6 katman, her katman kendi ritminde parıldar (tek tek çizmek yerine)
    starLayers = [];
    const sg = [];
    for (let i = 0; i < 6; i++) {
      const c = makeCanvas(W, skyH);
      starLayers.push({ c, sp: 0.7 + r() * 1.6, ph: r() * 6.28 });
      sg.push(c.getContext('2d'));
    }
    const STAR_COLS = ['#ffffff', '#dfe8ff', '#fff2d6'];
    const n = Math.floor((W * skyH) / 30);
    for (let i = 0; i < n; i++) {
      const x = Math.floor(r() * W);
      // yaklaşık üçte biri samanyolunun içinde toplanır
      const y = i % 3 === 0 ? Math.round(bandY(x) + (r() + r() + r() - 1.5) * half * 0.9) : Math.floor(r() * skyH);
      if (y < 0 || y >= skyH) continue;
      const g = sg[Math.floor(r() * 6)];
      g.globalAlpha = (0.35 + r() * 0.65) * (1 - (y / horizon) * 0.55);
      g.fillStyle = STAR_COLS[Math.floor(r() * 3)];
      g.fillRect(x, y, 1, 1);
    }
    bright = [];
    const nb = Math.max(5, Math.round((W * skyH) / 1500));
    for (let i = 0; i < nb; i++) bright.push({ x: 3 + Math.floor(r() * (W - 6)), y: 3 + Math.floor(r() * (skyH * 0.75)), ph: r() * 6.28, sp: 0.8 + r() * 1.5 });
    // kalp takımyıldızı (noktalı pixel çizgiler)
    consCv = makeCanvas(W, skyH);
    const cg = consCv.getContext('2d');
    const hx = Math.round(W * 0.3), hy = Math.round(horizon * 0.42);
    const heart = [[0, 2], [2, 0], [4.5, 1.5], [7, 0], [9, 2], [9, 5], [4.5, 10], [0, 5]];
    consPts = heart.map(([a, b]) => [Math.round(hx + a * 1.6), Math.round(hy + b * 1.6)]);
    cg.fillStyle = '#ffd6e6';
    for (let i = 0; i < consPts.length; i++) {
      const [x0, y0] = consPts[i], [x1, y1] = consPts[(i + 1) % consPts.length];
      const m = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let j = 1; j < m; j += 2) cg.fillRect(Math.round(x0 + ((x1 - x0) * j) / m), Math.round(y0 + ((y1 - y0) * j) / m), 1, 1);
    }
    // tepeler
    hillFar = []; hillNear = [];
    const p1 = r() * 6, p2 = r() * 6, p3 = r() * 6;
    for (let x = 0; x < W; x++) {
      hillFar[x] = Math.round(horizon - 4 - 5 * Math.sin(x / 23 + p1) - 3 * Math.sin(x / 9 + p2));
      hillNear[x] = Math.round(groundY - 6 - 3 * Math.sin(x / 31 + p3) - 1.5 * Math.sin(x / 7 + p1));
    }
    landTop = Math.max(0, Math.min(Math.min(...hillFar), groundY - 27));
    skyCv = makeCanvas(W, H); skyCtx = skyCv.getContext('2d', { alpha: false });
    landCv = makeCanvas(W, H - landTop); landCtx = landCv.getContext('2d');
    // ateş böcekleri
    flies = [];
    for (let i = 0; i < 9; i++) flies.push({ x: r() * W, y: groundY - 4 - r() * 18, ph: r() * 6.28 });
    // sis şeritleri
    fogBands = [horizon - 12, horizon - 3, groundY - 9].map((y, i) => {
      const bw = Math.round(W * (0.5 + 0.15 * i)), c = makeCanvas(bw, 7), g = c.getContext('2d');
      g.fillStyle = '#ffffff';
      [0.25, 0.5, 0.8, 1, 0.8, 0.5, 0.25].forEach((a, j) => {
        const s = Math.round(r() * bw * 0.18), e = bw - Math.round(r() * bw * 0.18);
        g.globalAlpha = a;
        g.fillRect(s, j, e - s, 1);
      });
      return { c, y, sp: 2 + i * 1.3, off: r() * W, a: 0.32 + 0.08 * i };
    });
    buildLilies(r);
    applyWeather();
  }

  // Zambaklar yolun arka kenarında; Luna'nın çalışma köşesi ve kitap/fener boş kalır. İki tane de ön köşelerde.
  function buildLilies(r) {
    const old = lilies;
    lilies = [];
    const sx = studyHX(), segs = [[6, sx - 30], [sx + 36, W - 8]].filter(([a, b]) => b - a > 4);
    const total = segs.reduce((s, [a, b]) => s + b - a, 0);
    const count = U.clamp(Math.round(W / 34), 5, 9);
    const order = [0, 3, 1, 5, 2, 4, 0, 1, 3];
    for (let i = 0; i < count && total > 0; i++) {
      let t = ((i + 0.5 + (r() - 0.5) * 0.5) / count) * total, x = 0;
      for (const [a, b] of segs) {
        if (t <= b - a) { x = Math.round(a + t); break; }
        t -= b - a;
      }
      lilies.push({ x, base: groundY - 1, h: 7 + Math.floor(r() * 6), c: order[i], th: 0.06 + r() * 0.4, ph: r() * 6.28, leaf: r() < 0.5 ? -1 : 1, fg: false });
    }
    if (W > 110) {
      lilies.push({ x: 4, base: H + 1, h: 13, c: 4, th: 0.12, ph: 1, leaf: 1, fg: true });
      lilies.push({ x: W - 5, base: H + 1, h: 11, c: 5, th: 0.3, ph: 2.5, leaf: -1, fg: true });
    }
    // boyut değişse de açıklık korunur
    lilies.forEach((l, i) => { l.b = old[i] ? old[i].b : -1; l.open = old[i] ? old[i].open : false; });
  }

  function resize() {
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    if (!rect.width || !rect.height) return; // gizliyken bekle
    wrapW = wrap.clientWidth;
    if (bubbleOn) { bubbleW = bubbleEl.offsetWidth; bubbleL = -1; }
    const sc = rect.width < 520 ? 3 : 4;
    const w = Math.ceil(rect.width / sc), h = Math.ceil(rect.height / sc);
    if (w === W && h === H && sc === scale) return;
    scale = sc; W = w; H = h;
    cv.width = W; cv.height = H;
    ctx.imageSmoothingEnabled = false;
    horizon = Math.round(H * 0.68);
    groundY = H - 7;
    L.x = U.clamp(L.x, 30, roamMax());
    if (yarn) yarn.x = U.clamp(yarn.x, 1, W - 6);
    buildWorld();
    bgDirty = true;
    if (raf) render(0);
  }

  // ---------- Hava durumu ----------
  function newCloud(x) {
    return { x, y: 5 + Math.random() * horizon * (fx.rain || fx.snow ? 0.5 : 0.42), s: Math.floor(Math.random() * 3), sp: 1 + Math.random() * 2 };
  }
  function resetDrop(d, anywhere) {
    d.x = Math.random() * (W + 24);
    d.y = anywhere ? Math.random() * H : -2 - Math.random() * 14;
    if (fx.snow) {
      d.v = U.rand(9, 20); d.s = Math.random() < 0.22 ? 2 : 1; d.ph = Math.random() * 6.28; d.ye = H + 2;
    } else {
      const soft = fx.rain < 1;
      d.v = soft ? U.rand(85, 115) : U.rand(150, 200);
      d.l = soft ? 2 : (Math.random() < 0.5 ? 3 : 4);
      d.ye = U.rand(horizon - 4, H + 2);
    }
    return d;
  }
  function applyWeather() {
    fx = WX[weather.kind] || WX.clear;
    const it = weather.intensity;
    wk = fx.k ? 0.55 + 0.45 * it : 0;
    starVis = 1 - fx.cover * (0.6 + 0.4 * it) * 0.85;
    if (!W) return;
    const area = U.clamp(W / 290, 0.45, 1.25);
    const nc = Math.round(fx.clouds * (fx.k ? 0.75 + 0.25 * it : 1) * U.clamp(W / 260, 0.6, 1.3));
    while (clouds.length < nc) clouds.push(newCloud(Math.random() * W));
    clouds.length = nc;
    let nd = 0;
    if (fx.rain) nd = (fx.rain < 1 ? 45 : 120) * (0.35 + 0.65 * it) * area;
    else if (fx.snow) nd = 90 * (0.35 + 0.65 * it) * area;
    nd = Math.min(130, Math.round(nd));
    while (drops.length < nd) drops.push({});
    drops.length = nd;
    for (const d of drops) resetDrop(d, true);
    for (const s of splashes) s.t = 1;
    nextFlash = U.rand(10, 16);
    bgDirty = true;
  }

  // ---------- Arka plan (seyrek yenilenir) ----------
  function buildBg() {
    bgDirty = false; bgAt = time; bgElev = sun.elev;
    let [top, bottom] = skyColors(sun.elev);
    const k = fx.k ? fx.k * wk : 0;
    const tint = fx.k ? mixHex(fx.night, fx.tint, light) : null;
    if (tint) { top = mixHex(top, tint, k); bottom = mixHex(bottom, tint, k * 0.85); }
    // gökyüzü bantları
    let g = skyCtx;
    for (let y = 0; y < horizon + 2; y += 2) {
      g.fillStyle = mixHex(top, bottom, U.clamp(Math.pow(y / horizon, 1.4), 0, 1));
      g.fillRect(0, y, W, 2);
    }
    g.fillStyle = bottom;
    g.fillRect(0, horizon, W, H - horizon);
    const vis = night * starVis;
    if (vis > 0.02) {
      g.globalAlpha = vis;
      g.drawImage(milkyCv, 0, 0);
      g.globalAlpha = 1;
    }
    // tepeler, yol, çimen, ağaç
    let far = mixHex(mixHex('#20244a', '#6aa46e', light), '#9a5a7a', dusk * 0.35);
    let near = mixHex(mixHex('#151833', '#4c8a52', light), '#6b3d5e', dusk * 0.3);
    let path = mixHex('#1c1d3a', '#8a7a5a', light);
    let leaf = mixHex('#1d2c3e', '#3f8a4a', light);
    if (tint) { far = mixHex(far, tint, k * 0.5); near = mixHex(near, tint, k * 0.25); path = mixHex(path, tint, k * 0.2); leaf = mixHex(leaf, tint, k * 0.25); }
    if (fx.fog) far = mixHex(far, bottom, 0.6 * wk);
    const snowy = fx.snow ? mixHex('#9aa3c4', '#f4f7ff', light) : null;
    if (snowy) { near = mixHex(near, snowy, 0.25 * wk); path = mixHex(path, snowy, 0.35 * wk); }
    const oy = landTop;
    g = landCtx;
    g.clearRect(0, 0, W, H - oy);
    g.fillStyle = far;
    for (let x = 0; x < W; x++) g.fillRect(x, hillFar[x] - oy, 1, H - hillFar[x]);
    g.fillStyle = near;
    for (let x = 0; x < W; x++) g.fillRect(x, hillNear[x] - oy, 1, H - hillNear[x]);
    if (snowy) {
      g.fillStyle = snowy;
      for (let x = 0; x < W; x++) g.fillRect(x, hillNear[x] - oy, 1, 1);
    }
    g.fillStyle = path;
    g.fillRect(0, groundY - oy, W, H - groundY);
    g.fillStyle = mixHex(path, '#000000', 0.2);
    for (let x = 0; x < W; x += 6) g.fillRect(x, groundY + 2 - oy, 2, 1);
    g.fillStyle = mixHex(near, '#ffffff', 0.12);
    for (let x = 3; x < W; x += 11) {
      g.fillRect(x, groundY - 1 - oy, 1, 1);
      g.fillRect(x + 2, groundY - 2 - oy, 1, 2);
    }
    const tx = Math.round(W * 0.82), ty = groundY - oy;
    g.fillStyle = mixHex('#2a1d2e', '#6b4a32', light);
    g.fillRect(tx, ty - 14, 3, 14);
    disc(g, tx + 1, ty - 19, 7, leaf);
    disc(g, tx - 4, ty - 15, 5, leaf);
    disc(g, tx + 6, ty - 15, 5, leaf);
    g.fillStyle = snowy || mixHex(leaf, '#ffffff', 0.15);
    g.fillRect(tx - 2, ty - 23, 2, 1);
    g.fillRect(tx + 3, ty - 21, 2, 1);
    if (snowy) { g.fillRect(tx - 1, ty - 26, 5, 1); g.fillRect(tx - 8, ty - 19, 3, 1); g.fillRect(tx + 8, ty - 19, 3, 1); }
    // güneş
    const low = U.clamp(1 - sun.elev / 12, 0, 1);
    sunCv = sunCv || makeCanvas(29, 29);
    g = sunCv.getContext('2d');
    g.clearRect(0, 0, 29, 29);
    g.globalAlpha = 0.07;
    for (let rr = 13; rr > 6; rr -= 2) disc(g, 14, 14, rr, low > 0.5 ? '#ffb36b' : '#fff3b0');
    g.globalAlpha = 1;
    disc(g, 14, 14, 5, mixHex('#ffd84d', '#ff8a4a', low));
    disc(g, 13, 13, 3, mixHex('#fff3a0', '#ffc07a', low));
    rayColor = mixHex('#ffe27a', '#ff9a52', low);
    buildMoon();
    // bulutlar: ışığa ve havaya göre renk
    let col = mixHex('#3a3566', '#ffffff', light), shade = mixHex('#2a2650', '#dfe9f7', light);
    if (tint) { col = mixHex(col, mixHex('#2b2f45', '#9aa3b8', light), k * 0.9); shade = mixHex(shade, mixHex('#1c1f30', '#7d869c', light), k * 0.9); }
    cloudA = Math.min(1, 0.35 + light * 0.55 + k * 0.3);
    cloudCvs = [16, 22, 30].map((w) => {
      const c = makeCanvas(w, 8), cg = c.getContext('2d');
      cg.fillStyle = col;
      cg.fillRect(0, 4, w, 3);
      cg.fillRect(3, 2, w - 7, 2);
      cg.fillRect(Math.floor(w / 3), 0, Math.floor(w / 3), 2);
      cg.fillRect(Math.floor(w * 0.62), 1, Math.max(2, Math.floor(w / 6)), 1);
      cg.fillStyle = shade;
      cg.fillRect(2, 7, w - 4, 1);
      return c;
    });
    // zambak sapları ve yaprakları
    stemColor = mixHex('#24413a', '#4f9a52', light);
    const lp = { g: stemColor, G: mixHex(stemColor, '#000000', 0.3) };
    leafCv = [paint(LILY.leaf, lp, true), paint(LILY.leaf, lp)];
    fogColor = mixHex('#59607e', '#e6e9f0', light);
  }

  function buildMoon() {
    moonCv = moonCv || makeCanvas(25, 25);
    const g = moonCv.getContext('2d'), r = 5;
    g.clearRect(0, 0, 25, 25);
    g.globalAlpha = 0.05;
    for (let k = 11; k > 6; k -= 2) disc(g, 12, 12, k, '#dfe6ff');
    // evre: ay diskindeki her piksel, gölge diskinin içindeyse karanlık
    const ph = moonPhase(new Date());
    const d = (ph < 0.5 ? ph : 1 - ph) * 2 * (r * 2 + 1);
    const sx = ph < 0.5 ? -d : d;
    const craters = { '-2,-1': 1, '-1,-1': 1, '-2,0': 1, '-1,0': 1, '1,2': 1, '2,-2': 1 };
    for (let j = -r; j <= r; j++) {
      for (let i = -r; i <= r; i++) {
        if (i * i + j * j > r * r + 1) continue;
        g.globalAlpha = (i - sx) * (i - sx) + j * j <= r * r + 1 ? 0.18 : 1;
        g.fillStyle = craters[i + ',' + j] ? '#d9d4b8' : '#f4f1dc';
        g.fillRect(12 + i, 12 + j, 1, 1);
      }
    }
    g.globalAlpha = 1;
  }

  // ---------- Her kare çizilenler ----------
  function drawStars() {
    const vis = night * starVis;
    if (vis < 0.02) return;
    for (const s of starLayers) {
      ctx.globalAlpha = vis * (0.62 + 0.38 * Math.sin(time * s.sp + s.ph));
      ctx.drawImage(s.c, 0, 0);
    }
    // birkaç parlak, artı şeklinde yıldız
    for (const s of bright) {
      const tw = 0.55 + 0.45 * Math.sin(time * s.sp + s.ph);
      ctx.globalAlpha = vis * tw;
      if (tw > 0.8) ctx.drawImage(SP.starBig, s.x - 2, s.y - 2);
      else ctx.drawImage(SP.star, s.x - 1, s.y - 1);
    }
    // kalp takımyıldızı
    ctx.globalAlpha = vis * 0.3;
    ctx.drawImage(consCv, 0, 0);
    ctx.fillStyle = '#ffe3ef';
    for (let i = 0; i < consPts.length; i++) {
      ctx.globalAlpha = vis * (0.7 + 0.3 * Math.sin(time * 1.5 + i));
      ctx.fillRect(consPts[i][0], consPts[i][1], 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawShooting(dt) {
    const vis = night * starVis;
    if (vis < 0.5) { shooting = null; return; }
    nextShoot -= dt;
    if (!shooting && nextShoot <= 0) {
      shooting = { x: U.rand(W * 0.3, W), y: U.rand(2, horizon * 0.4), life: 0 };
      // akşam saatlerinde biraz daha sık
      nextShoot = hour >= 19 || hour < 1 ? U.rand(5, 15) : U.rand(8, 22);
    }
    if (!shooting) return;
    const s = shooting;
    s.life += dt;
    const px = s.x - s.life * 90, py = s.y + s.life * 45;
    ctx.fillStyle = '#fffbe0';
    for (let i = 0; i < 10; i++) {
      ctx.globalAlpha = vis * (1 - i / 10) * Math.max(0, 1 - s.life / 0.9);
      ctx.fillRect(Math.round(px + i * 2), Math.round(py - i), 1, 1);
    }
    ctx.globalAlpha = 1;
    if (s.life > 0.9) shooting = null;
  }

  function drawSunMoon() {
    if (moonPos) {
      ctx.globalAlpha = 1 - 0.6 * fx.cover * (fx.k ? wk : 0);
      ctx.drawImage(moonCv, moonPos[0] - 12, moonPos[1] - 12);
    }
    if (sunPos) {
      const [x, y] = sunPos;
      ctx.globalAlpha = fx.sun;
      ctx.drawImage(sunCv, x - 14, y - 14);
      // dönen pixel ışınlar
      const rr = 9 + Math.round(Math.sin(time * 2));
      ctx.fillStyle = rayColor;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + time * 0.15;
        ctx.fillRect(Math.round(x + Math.cos(a) * rr), Math.round(y + Math.sin(a) * rr), 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawClouds(dt) {
    ctx.globalAlpha = cloudA;
    for (const c of clouds) {
      const img = cloudCvs[c.s];
      c.x += c.sp * dt;
      if (c.x > W + 2) { const n = newCloud(0); c.x = -img.width - 4; c.y = n.y; }
      ctx.drawImage(img, Math.round(c.x), Math.round(c.y) - 4);
    }
    ctx.globalAlpha = 1;
  }

  function drawFog() {
    if (!fx.fog) return;
    ctx.globalAlpha = 0.12 * wk;
    ctx.fillStyle = fogColor;
    ctx.fillRect(0, 0, W, H);
    const dim = 0.45 + 0.55 * light;
    for (const b of fogBands) {
      const bw = b.c.width;
      const x = ((time * b.sp + b.off) % (W + bw)) - bw;
      ctx.globalAlpha = b.a * wk * dim;
      ctx.drawImage(b.c, Math.round(x), b.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawFlies(dt) {
    if (night <= 0.2 || fx.rain || fx.snow) return;
    for (const f of flies) {
      f.ph += dt;
      f.x += Math.sin(f.ph * 0.7) * dt * 4;
      f.y += Math.cos(f.ph * 0.9) * dt * 2;
      if (f.x < 0) f.x = W;
      if (f.x > W) f.x = 0;
      ctx.globalAlpha = night * (0.4 + 0.6 * Math.max(0, Math.sin(f.ph * 2)));
      ctx.drawImage(SP.firefly, Math.round(f.x) - 1, Math.round(f.y) - 1);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Zambaklar ----------
  const B_HALF = 0.4, B_OPEN = 0.72, B_FADE = 0.08;
  function updateLilies(dt) {
    for (const l of lilies) {
      if (l.b < 0) { l.open = night > l.th; l.b = l.open ? 1 : 0; }
      if (!l.open && night > l.th) l.open = true;
      else if (l.open && night < l.th - 0.05) l.open = false;
      // birkaç saniyede yavaşça açılır / kapanır
      if (l.open && l.b < 1) l.b = Math.min(1, l.b + dt * 0.28);
      else if (!l.open && l.b > 0) l.b = Math.max(0, l.b - dt * 0.22);
      if (l.b > 0.95 && night > 0.3 && Math.random() < dt * 0.05) {
        emit('pollen', l.x + U.rand(-3, 3), l.base - l.h - 4 + U.rand(-2, 2), U.rand(-2, 2), U.rand(-6, -3), U.rand(1.2, 2.2), '#fff4b0');
      }
    }
  }
  function drawHead(st, x, y, a) {
    if (a <= 0.01) return;
    ctx.globalAlpha = a;
    ctx.drawImage(st.c, x - st.ax, y - st.ay);
  }
  function drawLilies(fg) {
    for (const l of lilies) {
      if (l.fg !== fg) continue;
      const S = SP.lily[l.c], b = l.b;
      const sh = Math.round(l.h * (0.6 + 0.4 * Math.min(1, b / B_HALF)));
      const top = l.base - sh;
      ctx.fillStyle = stemColor;
      ctx.fillRect(l.x, top, 1, sh);
      ctx.drawImage(leafCv[l.leaf < 0 ? 0 : 1], l.leaf < 0 ? l.x - 3 : l.x + 1, l.base - Math.round(sh * 0.45) - 2);
      const sway = Math.sin(time * 0.9 + l.ph) > 0.55 ? 1 : 0; // hafif 1px salınım
      const hx = l.x + sway;
      // gece hafif parıltı
      const open = U.clamp((b - B_HALF) / (1 - B_HALF), 0, 1);
      if (night > 0.05 && open > 0) {
        ctx.globalAlpha = night * open * (0.55 + 0.15 * Math.sin(time * 1.3 + l.ph));
        ctx.drawImage(S.glow, hx - 7, top - 9);
      }
      // aşamalar arasında kısa yumuşak geçiş
      const f1 = U.clamp((b - B_HALF + B_FADE / 2) / B_FADE, 0, 1);
      const f2 = U.clamp((b - B_OPEN + B_FADE / 2) / B_FADE, 0, 1);
      drawHead(S.bud, hx, top, 1 - f1);
      drawHead(S.half, hx, top, f1 * (1 - f2));
      drawHead(S.open, hx, top, f2);
      ctx.globalAlpha = 1;
    }
  }

  // ---------- Luna ----------
  const isLateNight = () => hour >= 23 || hour < 6;
  const isEvening = () => !!sun && sun.elev < -1;
  const REACH = 12; // kafanın ortasından vuruş noktasına uzaklık
  // vücut yürürken kafanın arkasına ~27 px uzanır; sahneden taşmasın
  const validX = (x, side) => (side > 0 ? x - 27 >= 1 && x + 11 <= W - 1 : x - 11 >= 1 && x + 27 <= W - 1);

  function poseName() {
    const blink = L.blink > 0 ? 'B' : '';
    switch (L.state) {
      case 'walk': return (Math.floor(L.ft * (L.speed > 20 ? 9 : 6)) % 2 ? 'walkA' : 'walkB') + blink;
      case 'sleep': return 'sleep';
      case 'eat': return Math.floor(L.ft * 6) % 2 ? 'loafAB' : 'loafA';
      case 'happy': return 'happy';
      case 'crouch': return 'crouch' + blink;
      case 'bat': return play && play.t < 0.3 ? 'playUp' : 'playSwipe';
      case 'watch': return 'sitUp' + blink;
      default: return blink ? 'loafAB' : (Math.floor(L.ft * 1.2) % 3 === 0 ? 'loafB' : 'loafA');
    }
  }
  const G = { p: null, c: null, left: 0, top: 0 };
  function lunaGeom() {
    const p = SP.luna[poseName()], right = L.dir > 0;
    G.p = p;
    G.c = p.c[right ? 0 : 1];
    G.left = Math.round(L.x - (right ? p.hx : p.w - 1 - p.hx));
    G.top = Math.round(groundY - p.h + 1 + L.y);
    return G;
  }

  function walkTo(x, speed = 16) {
    L.target = x;
    L.speed = speed;
    L.state = 'walk';
  }
  function chooseNext() {
    const r = Math.random();
    L.nap = false;
    if (isEvening()) {
      // akşamları daha çok uzanır, ara sıra kestirir
      if (r < 0.28) { L.state = 'sleep'; L.nap = true; L.wait = U.rand(20, 60); }
      else if (r < 0.58) walkTo(Math.round(U.clamp(L.x + U.rand(-45, 45), 30, roamMax())));
      else { L.state = 'sit'; L.wait = U.rand(8, 20); }
      return;
    }
    if (r < 0.55) walkTo(Math.round(U.rand(30, roamMax())));
    else { L.state = 'sit'; L.wait = U.rand(4, 10); }
  }

  function wander(dt) {
    if (L.state === 'sleep' && !L.nap) { chooseNext(); return; } // gece uykusu bitti
    if (L.state === 'walk') {
      if (Math.abs(L.x - L.target) <= 1) { L.state = 'sit'; L.wait = isEvening() ? U.rand(8, 18) : U.rand(3, 8); }
    } else if (L.state === 'sit' || L.state === 'happy' || L.state === 'sleep') {
      L.wait -= dt;
      if (L.wait <= 0) chooseNext();
    } else {
      L.state = 'sit'; L.wait = 2;
    }
    // ara sıra kendiliğinden ip oyunu (molada daha sık)
    if (L.state !== 'sleep') {
      nextPlay -= dt * (mode === 'break' ? 2.2 : 1);
      if (nextPlay <= 0) startPlay();
    }
  }

  function eatFish(dt) {
    const f = fishItem;
    f.vy += 200 * dt;
    f.y = Math.min(groundY - 2, f.y + f.vy * dt);
    if (L.state !== 'eat') {
      const side = f.x + 3 >= L.x ? 1 : -1;
      L.target = side > 0 ? f.x - 7 : f.x + 13;
      L.speed = 18;
      if (Math.abs(L.x - L.target) > 1) L.state = 'walk';
      else if (f.y >= groundY - 2) { L.state = 'eat'; L.eatT = 2.2; L.dir = side; }
      else { L.state = 'sit'; L.dir = side; }
    } else {
      L.eatT -= dt;
      if (Math.random() < dt * 6) hearts(L.x, groundY - 18, 1);
      if (L.eatT <= 0) { fishItem = null; L.state = 'happy'; L.wait = 4; hearts(L.x, groundY - 18, 5); }
    }
  }

  // ---------- İp yumağı oyunu ----------
  function startPlay() {
    nextPlay = U.rand(90, 240);
    if (mode === 'focus' || fishItem || play || !W) return;
    if (!yarn || yarn.leave) {
      const fromRight = L.x < W / 2;
      yarn = { x: fromRight ? W - 10 : 5, y: -10, vx: (fromRight ? -1 : 1) * U.rand(30, 42), vy: 0, roll: 0, a: 1, leave: false, trail: [] };
    }
    play = { phase: 'chase', t: 0, total: 0, rounds: 0, max: 3 + Math.floor(Math.random() * 3), hit: false, wait: 0 };
    if (L.state === 'sleep') L.vy = -40; // uyanıp sıçrar
    L.nap = false;
    L.awake = 30;
    L.state = 'walk';
  }
  function endPlay(rollAway) {
    play = null;
    if (yarn) {
      yarn.leave = true;
      if (rollAway) { yarn.vx = (yarn.x < W / 2 ? -1 : 1) * 55; yarn.vy = -20; }
    }
    if (!rollAway) { L.state = 'sit'; L.wait = U.rand(4, 8); }
  }
  function updatePlay(dt) {
    const P = play, b = yarn;
    P.t += dt; P.total += dt;
    const bx = b.x + 2.5;
    if (P.phase === 'chase') {
      let side = bx >= L.x ? 1 : -1, tx = bx - side * REACH;
      if (!validX(tx, side)) { side = -side; tx = bx - side * REACH; }
      L.target = tx;
      if (Math.abs(L.x - tx) > 1.5) { L.state = 'walk'; L.speed = 30; }
      else {
        L.dir = side;
        if (Math.abs(b.vx) < 14 && b.y > -2) {
          // bazen beklemeden vurur, bazen önce pusuya yatar
          P.phase = Math.random() < 0.6 ? 'crouch' : 'bat'; P.t = 0; P.hit = false;
        } else L.state = 'watch';
      }
    }
    if (P.phase === 'crouch') {
      L.state = 'crouch';
      if (P.t > 0.6) { P.phase = 'bat'; P.t = 0; }
    } else if (P.phase === 'bat') {
      L.state = 'bat';
      if (P.t >= 0.3 && !P.hit) {
        P.hit = true;
        if (Math.abs(bx - (L.x + L.dir * REACH)) < 7) {
          b.vx = L.dir * U.rand(45, 85);
          b.vy = -U.rand(20, 45);
          P.rounds++;
        }
      }
      if (P.t > 0.75) { P.phase = 'watch'; P.t = 0; P.wait = U.rand(0.5, 1.1); }
    } else if (P.phase === 'watch') {
      L.state = 'watch';
      L.dir = bx >= L.x ? 1 : -1;
      if (P.t > P.wait) {
        if (P.rounds >= P.max || P.total > 16) { P.phase = 'content'; P.t = 0; hearts(L.x, groundY - 18, 5); }
        else P.phase = 'chase';
      }
    }
    if (P.phase === 'content') {
      L.state = 'happy';
      if (P.t > 5) endPlay(false);
    } else if (P.total > 24) { P.phase = 'content'; P.t = 0; }
  }
  function updateYarn(dt) {
    const b = yarn;
    if (!b) return;
    if (b.y < 0 || b.vy !== 0) {
      b.vy += 240 * dt;
      b.y += b.vy * dt;
      if (b.y >= 0) { b.y = 0; b.vy = b.vy > 30 ? -b.vy * 0.35 : 0; }
    }
    b.vx *= Math.exp(-(b.y < 0 ? 0.3 : 1.5) * dt); // sürtünme
    if (Math.abs(b.vx) < 1.5 && b.y === 0) b.vx = 0;
    b.x += b.vx * dt;
    if (b.x < 1) { b.x = 1; b.vx = Math.abs(b.vx) * 0.6; }
    else if (b.x > W - 6) { b.x = W - 6; b.vx = -Math.abs(b.vx) * 0.6; }
    b.roll += b.vx * dt;
    // ip: topun geçtiği yerlerden kısa bir iz, yavaşça yere iner
    const T = b.trail, cx = b.x + 2.5, cy = groundY - 2 + b.y, last = T[T.length - 1];
    if (!last || Math.abs(last.x - cx) + Math.abs(last.y - cy) > 2.5) {
      const p = T.length >= 16 ? T.shift() : {};
      p.x = cx; p.y = cy;
      T.push(p);
    }
    const k = Math.min(1, dt * 2);
    for (const p of T) p.y += (groundY - p.y) * k;
    if (b.leave && (b.a -= dt * 0.7) <= 0) yarn = null;
  }
  function line(x0, y0, x1, y1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 1, 1);
  }
  function drawYarn() {
    const b = yarn;
    if (!b) return;
    const T = b.trail;
    ctx.fillStyle = THREAD;
    ctx.globalAlpha = b.a * 0.85;
    for (let i = 1; i < T.length; i++) line(T[i - 1].x, T[i - 1].y, T[i].x, T[i].y);
    const bx = Math.round(b.x), by = Math.round(groundY - 4 + b.y);
    ctx.globalAlpha = b.a * 0.22;
    ctx.fillStyle = '#000';
    ctx.fillRect(bx + 1, groundY + 1, 3, 1);
    ctx.globalAlpha = b.a;
    ctx.drawImage(SP.yarn[((Math.floor(b.roll / 2) % 3) + 3) % 3], bx, by);
    ctx.globalAlpha = 1;
  }

  function updateLuna(dt) {
    // zıplama
    if (L.y < 0 || L.vy !== 0) {
      L.vy += 260 * dt;
      L.y += L.vy * dt;
      if (L.y >= 0) { L.y = 0; L.vy = 0; }
    }
    // göz kırpma
    L.blinkIn -= dt;
    if (L.blinkIn <= 0) { L.blink = 0.15; L.blinkIn = U.rand(2.5, 6); }
    if (L.blink > 0) L.blink -= dt;
    L.ft += dt;
    if (L.awake > 0) L.awake -= dt;

    if (fishItem) eatFish(dt);
    else if (mode === 'focus') {
      L.target = studyHX();
      L.speed = 16;
      if (Math.abs(L.x - L.target) > 1) L.state = 'walk';
      else { L.state = 'sit'; L.dir = 1; }
    } else if (play && yarn) updatePlay(dt);
    else if (mode === 'idle' && isLateNight() && L.awake <= 0) {
      L.target = sleepHX();
      L.speed = 16;
      if (Math.abs(L.x - L.target) > 1) L.state = 'walk';
      else { L.state = 'sleep'; L.nap = false; }
    } else {
      if (play) play = null;
      wander(dt);
    }

    if (L.state === 'walk') {
      const d = L.target - L.x;
      if (Math.abs(d) > 0.5) L.dir = d >= 0 ? 1 : -1;
      L.x += Math.sign(d) * Math.min(Math.abs(d), L.speed * dt);
    }
    // uyurken Zzz
    if (L.state === 'sleep' && Math.random() < dt * 0.8) {
      emit('z', L.x - L.dir * 4, groundY - 15, -3 * L.dir, -5, 2.5);
    }
  }

  function drawLuna() {
    const g = lunaGeom();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#000';
    ctx.fillRect(g.left + 3, groundY + 1, g.p.w - 6, 1);
    ctx.globalAlpha = 1;
    // pusudayken kalça sallar
    const wig = L.state === 'crouch' && Math.sin(L.ft * 28) > 0 ? 1 : 0;
    ctx.drawImage(g.c, g.left + wig, g.top);
  }

  function drawStudyProps() {
    if (mode !== 'focus') return;
    const bx = studyHX() + 11, lx = bx + 13, ly = groundY - 5;
    ctx.drawImage(SP.book, bx, groundY - 4);
    if (night > 0.2) {
      ctx.globalAlpha = night;
      ctx.drawImage(SP.lanternGlow, lx - 7, ly - 6);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(SP.lantern, lx, ly);
  }

  function drawFish() {
    if (fishItem) ctx.drawImage(SP.fish, Math.round(fishItem.x), Math.round(fishItem.y));
  }

  // ---------- Parçacıklar (sınırlı sayıda) ----------
  const MAX_P = 70, SPARK_COLS = ['#ffd84d', '#ffffff', '#ff9eb5'];
  function emit(kind, x, y, vx, vy, life, c) {
    if (particles.length < MAX_P) particles.push({ kind, x, y, vx, vy, life, c, t: 0 });
  }
  function hearts(x, y, n) {
    for (let i = 0; i < n; i++) emit('heart', x + U.rand(-4, 4), y + U.rand(-2, 2), U.rand(-6, 6), U.rand(-16, -8), U.rand(1.2, 2));
  }
  function sparkles(x, y, n) {
    for (let i = 0; i < n; i++) emit('spark', x, y, U.rand(-30, 30), U.rand(-40, -10), U.rand(0.6, 1.2), SPARK_COLS[i % 3]);
  }
  function drawParticles(dt) {
    let n = 0;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.t += dt;
      if (p.t >= p.life) continue;
      particles[n++] = p;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'spark') p.vy += 60 * dt;
      let a = 1 - p.t / p.life;
      if (p.kind === 'pollen') a *= 0.5 + 0.5 * Math.sin(p.t * 12);
      ctx.globalAlpha = a;
      const x = Math.round(p.x), y = Math.round(p.y);
      if (p.kind === 'heart') ctx.drawImage(SP.heart, x - 2, y);
      else if (p.kind === 'z') ctx.drawImage(SP.z, x, y);
      else { ctx.fillStyle = p.c; ctx.fillRect(x, y, 1, 1); }
    }
    particles.length = n;
    ctx.globalAlpha = 1;
  }

  function drawWeather(dt) {
    if (drops.length) {
      if (fx.snow) {
        ctx.fillStyle = '#ffffff';
        for (const d of drops) {
          d.y += d.v * dt;
          d.x += (Math.sin(time * 1.3 + d.ph) * 8 - 2) * dt;
          if (d.y > d.ye || d.x < -3) resetDrop(d, false);
          ctx.globalAlpha = d.s > 1 ? 0.95 : 0.75;
          ctx.fillRect(Math.round(d.x), Math.round(d.y), d.s, d.s);
        }
      } else {
        ctx.fillStyle = '#a9c8ff';
        ctx.globalAlpha = fx.rain < 1 ? 0.45 : 0.55;
        for (const d of drops) {
          d.y += d.v * dt;
          d.x -= d.v * dt * 0.22;
          if (d.y > d.ye) {
            if (d.ye >= groundY) splash(d.x, d.ye);
            resetDrop(d, false);
          }
          const x = Math.round(d.x), y = Math.round(d.y);
          ctx.fillRect(x, y - 1, 1, 2);
          if (d.l > 2) ctx.fillRect(x + 1, y - d.l + 1, 1, d.l - 2);
        }
        ctx.fillStyle = '#d4e3ff';
        for (const s of splashes) {
          if (s.t >= 0.24) continue;
          s.t += dt;
          ctx.globalAlpha = 0.6 * (1 - s.t / 0.24);
          const o = s.t < 0.1 ? 1 : 2;
          ctx.fillRect(s.x - o, s.y - o, 1, 1);
          ctx.fillRect(s.x + o, s.y - o, 1, 1);
        }
      }
      ctx.globalAlpha = 1;
    }
    // fırtına: seyrek ve yumuşak bir şimşek ışığı (hızlı yanıp sönme yok)
    if (!fx.storm) return;
    nextFlash -= dt;
    if (nextFlash <= 0) {
      nextFlash = U.rand(12, 20);
      if (!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) flashT = 1e-4;
    }
    if (flashT > 0) {
      flashT += dt;
      const a = flashT < 0.08 ? flashT / 0.08 : 1 - (flashT - 0.08) / 0.62;
      if (a <= 0) { flashT = 0; return; }
      ctx.globalAlpha = 0.16 * a;
      ctx.fillStyle = '#f4f6ff';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }
  function splash(x, y) {
    for (const s of splashes) {
      if (s.t >= 0.24) { s.x = Math.round(x); s.y = Math.round(y); s.t = 0; return; }
    }
  }

  // ---------- Konuşma balonu ----------
  function positionBubble() {
    if (!bubbleOn || !W) return;
    const g = lunaGeom();
    const cx = L.x * scale;
    const left = Math.round(U.clamp(cx - bubbleW / 2, 8, wrapW - bubbleW - 8));
    const bottom = Math.round((H - (g.top - 1)) * scale + 10);
    const arrow = Math.round(U.clamp(cx - left, 14, bubbleW - 14));
    // yalnızca değişince yaz (her karede stil/düzen hesabı olmasın)
    if (left !== bubbleL) { bubbleEl.style.left = left + 'px'; bubbleL = left; }
    if (bottom !== bubbleB) { bubbleEl.style.bottom = bottom + 'px'; bubbleB = bottom; }
    if (arrow !== bubbleA) { bubbleEl.style.setProperty('--arrow', arrow + 'px'); bubbleA = arrow; }
  }

  // ---------- Döngü ----------
  function render(dt) {
    time += dt;
    sunT += dt;
    if (sunT >= 1) { sunT = 0; updateSun(); }
    if (bgDirty) buildBg();
    ctx.globalAlpha = 1;
    ctx.drawImage(skyCv, 0, 0);
    drawStars();
    drawShooting(dt);
    drawSunMoon();
    drawClouds(dt);
    ctx.drawImage(landCv, 0, landTop);
    drawFog();
    drawFlies(dt);
    updateLilies(dt);
    drawLilies(false);
    updateLuna(dt);
    updateYarn(dt);
    drawStudyProps();
    drawFish();
    drawYarn();
    drawLuna();
    drawLilies(true);
    drawParticles(dt);
    drawWeather(dt);

    if (bubbleUntil && performance.now() > bubbleUntil) {
      bubbleEl.classList.add('hidden');
      bubbleUntil = 0;
      bubbleOn = false;
    }
    positionBubble();
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!lastT) { lastT = now; return; }
    const dt = Math.min(0.1, (now - lastT) / 1000);
    lastT = now;
    acc += dt;
    if (acc < 0.028) return; // ~30 fps yeterli, pil dostu
    const step = Math.min(acc, 0.1);
    acc = 0;
    render(step);
  }

  // Sahne görünmüyorsa (sekme gizli / kaydırılmış) döngüyü tamamen durdur
  function wake() {
    const on = visible && !document.hidden && !!cv;
    if (on && !raf) {
      lastT = 0; acc = 0; sunT = 99;
      raf = requestAnimationFrame(frame);
    } else if (!on && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function hit(ev) {
    const rect = cv.getBoundingClientRect();
    const x = (ev.clientX - rect.left) / scale, y = (ev.clientY - rect.top) / scale;
    // yumağa dokunulursa yuvarlanır (ve Luna oyuna katılır)
    if (yarn && !yarn.leave && Math.abs(x - yarn.x - 2.5) < 6 && y > groundY - 10 + yarn.y && y < groundY + 4) {
      yarn.vx = (x < yarn.x + 2.5 ? 1 : -1) * U.rand(50, 80);
      yarn.vy = -U.rand(25, 40);
      if (!play) startPlay();
      return;
    }
    const g = lunaGeom();
    if (x >= g.left - 3 && x <= g.left + g.p.w + 3 && y >= g.top - 4 && y <= groundY + 3) {
      if (L.state === 'sleep') { L.state = 'happy'; L.wait = 3; L.nap = false; }
      L.awake = 8;
      L.vy = -70;
      hearts(L.x, g.top, 4);
      onPoke && onPoke();
    } else {
      sparkles(x, y, 8);
    }
  }

  return {
    init(canvas, bubble, opts = {}) {
      cv = canvas; wrap = canvas.parentElement; bubbleEl = bubble;
      ctx = cv.getContext('2d', { alpha: false });
      onPoke = opts.onPoke;
      sprites();
      updateSun();
      resize();
      L.x = U.clamp(Math.round(W * 0.25), 30, roamMax());
      L.target = L.x + 20;
      // boyut değişimlerini biraz bekleyip tek seferde uygula
      const later = () => { clearTimeout(resizeT); resizeT = setTimeout(resize, 120); };
      if (window.ResizeObserver) new ResizeObserver(later).observe(wrap);
      else window.addEventListener('resize', later);
      if (window.IntersectionObserver) {
        new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; wake(); }).observe(cv);
      }
      document.addEventListener('visibilitychange', wake);
      cv.addEventListener('pointerdown', hit);
      wake();
    },
    setMode(m) {
      mode = m;
      if (m === 'focus') { if (play) endPlay(true); L.nap = false; }
      else {
        if (L.state === 'sit') L.wait = 1;
        if (m === 'break') nextPlay = Math.min(nextPlay, U.rand(8, 60));
      }
    },
    // w: null | { kind: 'clear'|'cloudy'|'fog'|'drizzle'|'rain'|'snow'|'storm', intensity: 0..1 }
    setWeather(w) {
      const kind = w && WX[w.kind] ? w.kind : 'clear';
      const intensity = w ? U.clamp(Number(w.intensity) || 0, 0, 1) : 0;
      if (kind === weather.kind && Math.abs(intensity - weather.intensity) < 0.01) return;
      weather = { kind, intensity };
      applyWeather();
    },
    // hemen bir ip oyunu başlat (odaklanırken yok sayılır)
    play() { if (mode !== 'focus') { nextPlay = 0; startPlay(); } },
    // Luna'nın küçük portresi (rapor başlığı vb.)
    portrait(canvas) {
      const p = sprites().luna.loafA;
      canvas.width = p.w; canvas.height = p.h;
      canvas.getContext('2d').drawImage(p.c[1], 0, 0);
    },
    say(text, opts = {}) {
      if (!bubbleEl) return;
      bubbleEl.innerHTML = (opts.love ? '<span class="love-tag">💌</span> ' : '') + U.esc(text);
      bubbleEl.classList.toggle('love', !!opts.love);
      bubbleEl.classList.remove('hidden');
      bubbleEl.classList.remove('pop'); void bubbleEl.offsetWidth; bubbleEl.classList.add('pop');
      bubbleW = bubbleEl.offsetWidth;
      bubbleOn = true;
      bubbleL = bubbleB = bubbleA = -1;
      bubbleUntil = performance.now() + (opts.ms || Math.max(5000, text.length * 85));
      positionBubble();
    },
    feed() {
      if (play) endPlay(true);
      fishItem = { x: U.clamp(L.x + L.dir * 16, 36, Math.max(36, W - 42)), y: 0, vy: 0 };
      L.nap = false;
      L.awake = 10;
      L.state = 'walk';
    },
    celebrate() { sparkles(L.x, groundY - 16, 30); hearts(L.x, groundY - 20, 6); L.vy = -80; },
    sunInfo() { return sun || solar(new Date()); },
  };
})();
