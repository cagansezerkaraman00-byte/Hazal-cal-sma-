/* Gökyüzü sahnesi: gerçek saate göre güneş/ay, yıldızlar, bulutlar ve pixel art Luna. */

const Scene = (() => {
  // ---------- Sprite'lar (k: gövde, d: koyu, w: beyaz, p: pembe, e: göz, y: yıldız tasma) ----------
  const SPR = {
    walkA: [
      '................k...k.',
      '...............kpk.kpk',
      '...............kkkkkkk',
      '..k............kekkekk',
      '.k.............kkkpkkk',
      '.k.............kkwwwkk',
      '.k....kkkkkkkkkkyyykk.',
      '..k..kkkkkkkkkkkkkkk..',
      '...kkkkkkkkkkkkkkkkw..',
      '....kkkkkkkkkkkkkkww..',
      '.....kkkkkkkkkkkkkk...',
      '.....kk.kk....kk.kk...',
      '.....kk.kk....kk.kk...',
      '.....ww.ww....ww.ww...',
    ],
    walkB: [
      '................k...k.',
      '...............kpk.kpk',
      '...............kkkkkkk',
      '...k...........kekkekk',
      '..k............kkkpkkk',
      '.k.............kkwwwkk',
      '.k....kkkkkkkkkkyyykk.',
      '..k..kkkkkkkkkkkkkkk..',
      '...kkkkkkkkkkkkkkkkw..',
      '....kkkkkkkkkkkkkkww..',
      '.....kkkkkkkkkkkkkk...',
      '....kk..kk....kk..kk..',
      '...kk....kk..kk....kk.',
      '...ww....ww..ww....ww.',
    ],
    sitA: [
      '..........k...k.',
      '.........kpk.kpk',
      '.........kkkkkkk',
      '.........kekkekk',
      '.........kkkpkkk',
      '.........kkwwwkk',
      '..........kyyyk.',
      '.........kkkkkk.',
      '........kkkkkwk.',
      '.......kkkkkkwk.',
      '......kkkkkkkwk.',
      '......kkkkkkkwk.',
      '.kk...kkkkkkkkk.',
      'k..k..kkkkkkkkk.',
      '...kkkkkkkwk.wk.',
      '.....kkkkkww.ww.',
    ],
    sitB: [
      '..........k...k.',
      '.........kpk.kpk',
      '.........kkkkkkk',
      '.........kekkekk',
      '.........kkkpkkk',
      '.........kkwwwkk',
      '..........kyyyk.',
      '.........kkkkkk.',
      '........kkkkkwk.',
      '.......kkkkkkwk.',
      '......kkkkkkkwk.',
      '......kkkkkkkwk.',
      '......kkkkkkkkk.',
      '......kkkkkkkkk.',
      'kkkkkkkkkkwk.wk.',
      '.....kkkkkww.ww.',
    ],
    sleepA: [
      '..........k..k....',
      '.........kpkkpk...',
      '...kkkkkkkkkkkkk..',
      '..kkkkkkkkkdkkdk..',
      '.kkkkkkkkkkkkpkk..',
      '.kkkkkkkkkkkwwkk..',
      'kkkkkkkkkkkkkkkk..',
      'kkkkkkkkkkkkkkkkk.',
      '.kwwkkkkkkkkkkkk..',
    ],
    sleepB: [
      '..................',
      '..........k..k....',
      '...kkkkkkkpkkpk...',
      '..kkkkkkkkkdkkdk..',
      '.kkkkkkkkkkkkpkk..',
      '.kkkkkkkkkkkwwkk..',
      'kkkkkkkkkkkkkkkkk.',
      'kkkkkkkkkkkkkkkkk.',
      '.kwwkkkkkkkkkkkk..',
    ],
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
  };

  const PALETTES = {
    gece:    { k: '#2d2a44', d: '#13111e', w: '#ece7fa', p: '#f5a3c0', e: '#ffd84d', y: '#ffcf3f' },
    gri:     { k: '#8d91a8', d: '#4b4e62', w: '#f4f2fa', p: '#f5a3c0', e: '#7cff9b', y: '#ffcf3f' },
    turuncu: { k: '#e8913a', d: '#8f4a12', w: '#fff3e2', p: '#ff9db3', e: '#7be36f', y: '#7ad3ff' },
    beyaz:   { k: '#f2f0f8', d: '#9a96ad', w: '#ffffff', p: '#ffb3c8', e: '#5fc2ff', y: '#ffcf3f' },
    krem:    { k: '#dcc19a', d: '#8c6b45', w: '#fff8ec', p: '#f39bb2', e: '#4fb0ff', y: '#ff7eb6' },
  };
  const ITEM_PAL = { b: '#7a4fd0', w: '#f8f3ff', l: '#c7bde6', y: '#ffcf3f', o: '#fff1a8', f: '#7ad3ff', e: '#13111e', h: '#ff6b9a' };

  // ---------- Durum ----------
  let cv, ctx, wrap, bubbleEl;
  let W = 200, H = 90, scale = 4, horizon = 60, groundY = 80;
  let pal = PALETTES.gece;
  let stars = [], clouds = [], flies = [], particles = [], hillFar = [], hillNear = [];
  let shooting = null, nextShoot = 6;
  let mode = 'idle';   // idle | focus | break
  let sun = null;
  let lastT = 0, acc = 0, time = 0;
  let bubbleUntil = 0;
  let fishItem = null;
  let onPoke = null;

  const L = { x: 30, y: 0, vy: 0, dir: 1, state: 'walk', frame: 0, ft: 0, target: 60, wait: 0, blinkIn: 3, blink: 0, eatT: 0 };

  // ---------- Renk yardımcıları ----------
  function hex2rgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) {
    const A = hex2rgb(a), B = hex2rgb(b);
    return `rgb(${Math.round(U.lerp(A[0], B[0], t))},${Math.round(U.lerp(A[1], B[1], t))},${Math.round(U.lerp(A[2], B[2], t))})`;
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

  // ---------- Kurulum ----------
  function seeded(seed) {
    return () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  }

  function build() {
    const r = seeded(20240214);
    stars = [];
    const n = Math.floor((W * horizon) / 55);
    for (let i = 0; i < n; i++) {
      stars.push({ x: Math.floor(r() * W), y: Math.floor(r() * (horizon - 6)), big: r() < 0.12, ph: r() * 6.28, sp: 0.6 + r() * 2 });
    }
    hillFar = []; hillNear = [];
    const p1 = r() * 6, p2 = r() * 6, p3 = r() * 6;
    for (let x = 0; x < W; x++) {
      hillFar[x] = Math.round(horizon - 4 - 5 * Math.sin(x / 23 + p1) - 3 * Math.sin(x / 9 + p2));
      hillNear[x] = Math.round(groundY - 6 - 3 * Math.sin(x / 31 + p3) - 1.5 * Math.sin(x / 7 + p1));
    }
    clouds = [];
    for (let i = 0; i < 4; i++) clouds.push({ x: r() * W, y: 6 + r() * (horizon * 0.45), w: 14 + Math.floor(r() * 16), sp: 1 + r() * 2 });
    flies = [];
    for (let i = 0; i < 9; i++) flies.push({ x: r() * W, y: groundY - 4 - r() * 18, ph: r() * 6.28 });
  }

  function resize() {
    const rect = wrap.getBoundingClientRect();
    scale = rect.width < 520 ? 3 : 4;
    W = Math.ceil(rect.width / scale);
    H = Math.ceil(rect.height / scale);
    cv.width = W; cv.height = H;
    horizon = Math.round(H * 0.68);
    groundY = H - 7;
    ctx.imageSmoothingEnabled = false;
    L.x = U.clamp(L.x, 4, W - 26);
    build();
  }

  // ---------- Çizim yardımcıları ----------
  function sprite(rows, x, y, palette, flip, alpha = 1, map) {
    x = Math.round(x); y = Math.round(y);
    const w = rows[0].length;
    ctx.globalAlpha = alpha;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < row.length; c++) {
        let ch = row[c];
        if (ch === '.') continue;
        if (map && map[ch]) ch = map[ch];
        ctx.fillStyle = palette[ch] || '#f0f';
        ctx.fillRect(flip ? x + (w - 1 - c) : x + c, y + r, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }
  function disc(cx, cy, rad, color) {
    ctx.fillStyle = color;
    for (let y = -rad; y <= rad; y++) {
      const half = Math.floor(Math.sqrt(rad * rad - y * y) + 0.3);
      ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
    }
  }

  // ---------- Sahne parçaları ----------
  function drawSky(top, bottom) {
    const band = 3;
    for (let y = 0; y < horizon + 2; y += band) {
      const t = Math.pow(y / horizon, 1.4);
      ctx.fillStyle = mix(top, bottom, U.clamp(t, 0, 1));
      ctx.fillRect(0, y, W, band);
    }
    ctx.fillStyle = bottom;
    ctx.fillRect(0, horizon, W, H - horizon);
  }

  function drawStars(alpha) {
    if (alpha <= 0) return;
    for (const s of stars) {
      const tw = 0.55 + 0.45 * Math.sin(time * s.sp + s.ph);
      const a = alpha * tw * (1 - (s.y / horizon) * 0.5);
      ctx.globalAlpha = a;
      ctx.fillStyle = s.big ? '#fff6c9' : '#ffffff';
      ctx.fillRect(s.x, s.y, 1, 1);
      if (s.big && tw > 0.7) {
        ctx.globalAlpha = a * 0.6;
        ctx.fillRect(s.x - 1, s.y, 1, 1); ctx.fillRect(s.x + 1, s.y, 1, 1);
        ctx.fillRect(s.x, s.y - 1, 1, 1); ctx.fillRect(s.x, s.y + 1, 1, 1);
      }
    }
    // Kalp takımyıldızı 💛 (noktalı pixel çizgiler)
    const hx = Math.round(W * 0.3), hy = Math.round(horizon * 0.42);
    const heart = [[0, 2], [2, 0], [4.5, 1.5], [7, 0], [9, 2], [9, 5], [4.5, 10], [0, 5]];
    const k = 1.6;
    const P = heart.map(([px, py]) => [Math.round(hx + px * k), Math.round(hy + py * k)]);
    ctx.fillStyle = '#ffd6e6';
    ctx.globalAlpha = alpha * 0.3;
    for (let i = 0; i < P.length; i++) {
      const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % P.length];
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let j = 1; j < n; j += 2) ctx.fillRect(Math.round(x0 + ((x1 - x0) * j) / n), Math.round(y0 + ((y1 - y0) * j) / n), 1, 1);
    }
    P.forEach(([x, y], i) => {
      ctx.globalAlpha = alpha * (0.7 + 0.3 * Math.sin(time * 1.5 + i));
      ctx.fillStyle = '#ffe3ef';
      ctx.fillRect(x, y, 1, 1);
    });
    ctx.globalAlpha = 1;
  }

  function drawShooting(dt, alpha) {
    if (alpha < 0.5) { shooting = null; return; }
    nextShoot -= dt;
    if (!shooting && nextShoot <= 0) {
      shooting = { x: U.rand(W * 0.3, W), y: U.rand(2, horizon * 0.4), life: 0 };
      nextShoot = U.rand(7, 22);
    }
    if (shooting) {
      shooting.life += dt;
      const s = shooting, len = 10;
      const px = s.x - s.life * 90, py = s.y + s.life * 45;
      for (let i = 0; i < len; i++) {
        ctx.globalAlpha = alpha * (1 - i / len) * (1 - s.life / 0.9);
        ctx.fillStyle = '#fffbe0';
        ctx.fillRect(Math.round(px + i * 2), Math.round(py - i), 1, 1);
      }
      ctx.globalAlpha = 1;
      if (s.life > 0.9) shooting = null;
    }
  }

  function arcPos(frac, peak) {
    const x = W * (0.06 + 0.88 * frac);
    const y = horizon + 4 - Math.sin(frac * Math.PI) * (horizon - 10) * peak;
    return [x, y];
  }

  function drawSun(info) {
    const { mins, sunrise, sunset } = info;
    if (mins < sunrise - 25 || mins > sunset + 25) return;
    const frac = (mins - sunrise) / (sunset - sunrise);
    const peak = U.clamp(info.noonElev / 70, 0.45, 1);
    const [x, y] = arcPos(frac, peak);
    const low = U.clamp(1 - info.elev / 12, 0, 1);
    // ışıma
    for (let r = 13; r > 6; r -= 2) {
      ctx.globalAlpha = 0.07;
      disc(x, y, r, low > 0.5 ? '#ffb36b' : '#fff3b0');
    }
    ctx.globalAlpha = 1;
    // pixel ışınlar
    const rays = 8, rr = 9 + Math.round(Math.sin(time * 2));
    ctx.fillStyle = mix('#ffe27a', '#ff9a52', low);
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2 + time * 0.15;
      ctx.fillRect(Math.round(x + Math.cos(a) * rr), Math.round(y + Math.sin(a) * rr), 1, 1);
    }
    disc(x, y, 5, mix('#ffd84d', '#ff8a4a', low));
    disc(x - 1, y - 1, 3, mix('#fff3a0', '#ffc07a', low));
  }

  function moonPhase(date) {
    const ref = Date.UTC(2000, 0, 6, 18, 14);
    const syn = 29.530588853;
    const p = (((date - ref) / 864e5) % syn + syn) % syn;
    return p / syn; // 0 yeni ay, 0.5 dolunay
  }

  function drawMoon(info, date) {
    const { mins, sunrise, sunset } = info;
    let frac;
    const nightLen = 1440 - (sunset - sunrise);
    if (mins > sunset - 20) frac = (mins - sunset) / nightLen;
    else if (mins < sunrise + 20) frac = (mins + 1440 - sunset) / nightLen;
    else return;
    const [x, y] = arcPos(U.clamp(frac, -0.05, 1.05), 0.8);
    const r = 5;
    for (let g = 11; g > 6; g -= 2) { ctx.globalAlpha = 0.05; disc(x, y, g, '#dfe6ff'); }
    ctx.globalAlpha = 1;
    // evre: ay diskindeki her piksel, gölge diskinin içindeyse karanlık
    const ph = moonPhase(date);
    const d = (ph < 0.5 ? ph : 1 - ph) * 2 * (r * 2 + 1);
    const sx = ph < 0.5 ? -d : d;
    const craters = { '-2,-1': 1, '-1,-1': 1, '-2,0': 1, '-1,0': 1, '1,2': 1, '2,-2': 1 };
    const cx = Math.round(x), cy = Math.round(y);
    for (let j = -r; j <= r; j++) {
      for (let i = -r; i <= r; i++) {
        if (i * i + j * j > r * r + 1) continue;
        const shadow = (i - sx) * (i - sx) + j * j <= r * r + 1;
        ctx.globalAlpha = shadow ? 0.18 : 1;
        ctx.fillStyle = craters[i + ',' + j] ? '#d9d4b8' : '#f4f1dc';
        ctx.fillRect(cx + i, cy + j, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawClouds(dt, light) {
    for (const c of clouds) {
      c.x += c.sp * dt;
      if (c.x > W + c.w) { c.x = -c.w - 4; c.y = 6 + Math.random() * (horizon * 0.45); }
      const col = mix('#3a3566', '#ffffff', light);
      ctx.globalAlpha = 0.35 + light * 0.55;
      ctx.fillStyle = col;
      const x = Math.round(c.x), y = Math.round(c.y), w = c.w;
      ctx.fillRect(x, y, w, 3);
      ctx.fillRect(x + 3, y - 2, w - 7, 2);
      ctx.fillRect(x + Math.floor(w / 3), y - 4, Math.floor(w / 3), 2);
      ctx.fillStyle = mix('#2a2650', '#dfe9f7', light);
      ctx.fillRect(x + 2, y + 3, w - 4, 1);
      ctx.globalAlpha = 1;
    }
  }

  function drawGround(light, dusk) {
    const far = mixHex(mixHex('#20244a', '#6aa46e', light), '#9a5a7a', dusk * 0.35);
    const near = mixHex(mixHex('#151833', '#4c8a52', light), '#6b3d5e', dusk * 0.3);
    const path = mixHex('#1c1d3a', '#8a7a5a', light);
    ctx.fillStyle = far;
    for (let x = 0; x < W; x++) ctx.fillRect(x, hillFar[x], 1, H - hillFar[x]);
    ctx.fillStyle = near;
    for (let x = 0; x < W; x++) ctx.fillRect(x, hillNear[x], 1, H - hillNear[x]);
    // yol
    ctx.fillStyle = path;
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = mixHex(path, '#000000', 0.2);
    for (let x = (Math.floor(time * 0) % 6); x < W; x += 6) ctx.fillRect(x, groundY + 2, 2, 1);
    // çimen tutamları
    ctx.fillStyle = mixHex(near, '#ffffff', 0.12);
    for (let x = 3; x < W; x += 11) {
      ctx.fillRect(x, groundY - 1, 1, 1);
      ctx.fillRect(x + 2, groundY - 2, 1, 2);
    }
    // ağaç
    const tx = Math.round(W * 0.82);
    ctx.fillStyle = mixHex('#2a1d2e', '#6b4a32', light);
    ctx.fillRect(tx, groundY - 14, 3, 14);
    const leaf = mixHex('#1d2c3e', '#3f8a4a', light);
    disc(tx + 1, groundY - 19, 7, leaf);
    disc(tx - 4, groundY - 15, 5, leaf);
    disc(tx + 6, groundY - 15, 5, leaf);
    ctx.fillStyle = mixHex(leaf, '#ffffff', 0.15);
    ctx.fillRect(tx - 2, groundY - 23, 2, 1);
    ctx.fillRect(tx + 3, groundY - 21, 2, 1);
  }

  function drawFlies(dt, night) {
    if (night <= 0.2) return;
    for (const f of flies) {
      f.ph += dt;
      f.x += Math.sin(f.ph * 0.7) * dt * 4;
      f.y += Math.cos(f.ph * 0.9) * dt * 2;
      if (f.x < 0) f.x = W; if (f.x > W) f.x = 0;
      const a = night * (0.4 + 0.6 * Math.max(0, Math.sin(f.ph * 2)));
      ctx.globalAlpha = a * 0.35;
      ctx.fillStyle = '#fff59a';
      ctx.fillRect(Math.round(f.x) - 1, Math.round(f.y), 3, 1);
      ctx.fillRect(Math.round(f.x), Math.round(f.y) - 1, 1, 3);
      ctx.globalAlpha = a;
      ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Luna ----------
  const studyX = () => Math.round(W * 0.42);
  const isLateNight = () => { const h = new Date().getHours(); return h >= 23 || h < 6; };

  function lunaSpriteSize() {
    if (L.state === 'walk') return [22, 14];
    if (L.state === 'sleep') return [18, 9];
    return [16, 16];
  }

  function chooseNext() {
    if (Math.random() < 0.55) {
      L.target = Math.round(U.rand(6, W - 30));
      L.state = 'walk';
    } else {
      L.state = 'sit';
      L.wait = U.rand(3, 8);
    }
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
    const speed = 16;

    if (fishItem) {
      fishItem.vy += 200 * dt;
      fishItem.y = Math.min(groundY - 3, fishItem.y + fishItem.vy * dt);
      if (L.state !== 'eat') {
        L.target = fishItem.x - 10;
        L.state = 'walk';
        if (Math.abs(L.x - L.target) < 1.5 && fishItem.y >= groundY - 3) {
          L.state = 'eat'; L.eatT = 2.2; L.dir = 1;
        }
      } else {
        L.eatT -= dt;
        if (Math.random() < dt * 6) hearts(L.x + 14, groundY - 18, 1);
        if (L.eatT <= 0) { fishItem = null; L.state = 'sit'; L.wait = 3; hearts(L.x + 10, groundY - 18, 5); }
      }
    } else if (mode === 'focus') {
      L.target = studyX();
      if (Math.abs(L.x - L.target) > 1) L.state = 'walk';
      else { L.state = 'sit'; L.dir = 1; }
    } else if (mode === 'idle' && isLateNight()) {
      L.target = Math.round(W * 0.3);
      if (Math.abs(L.x - L.target) > 1) L.state = 'walk';
      else L.state = 'sleep';
    } else if (L.state === 'sleep') {
      chooseNext();
    } else if (L.state === 'sit') {
      L.wait -= dt;
      if (L.wait <= 0) chooseNext();
    } else if (L.state === 'walk' && Math.abs(L.x - L.target) <= 1) {
      L.state = 'sit'; L.wait = U.rand(2, 6);
    }

    if (L.state === 'walk') {
      const d = L.target - L.x;
      L.dir = d >= 0 ? 1 : -1;
      L.x += Math.sign(d) * Math.min(Math.abs(d), speed * dt);
    }

    // uyurken Zzz
    if (L.state === 'sleep' && Math.random() < dt * 0.8) {
      particles.push({ kind: 'z', x: L.x + 14, y: groundY - 12, vx: 3, vy: -5, life: 2.5, t: 0 });
    }
  }

  function drawLuna() {
    const [w, h] = lunaSpriteSize();
    const x = L.x, baseY = groundY - h + 1 + L.y;
    const blinkMap = L.blink > 0 ? { e: 'k' } : null;
    let rows;
    if (L.state === 'walk') rows = Math.floor(L.ft * 6) % 2 ? SPR.walkA : SPR.walkB;
    else if (L.state === 'sleep') rows = Math.floor(L.ft * 0.8) % 2 ? SPR.sleepA : SPR.sleepB;
    else if (L.state === 'eat') rows = SPR.sitA;
    else rows = Math.floor(L.ft * 1.2) % 3 === 0 ? SPR.sitB : SPR.sitA;
    // gölge
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#000';
    ctx.fillRect(Math.round(x + 2), groundY + 1, w - 4, 1);
    ctx.globalAlpha = 1;
    const map = L.state === 'eat' && Math.floor(L.ft * 6) % 2 ? { e: 'k' } : blinkMap;
    sprite(rows, x, baseY, pal, L.dir < 0, 1, map);
  }

  function drawStudyProps(night) {
    if (mode !== 'focus') return;
    const bx = studyX() + 17, by = groundY - 4;
    sprite(SPR.book, bx, by, ITEM_PAL);
    const lx = bx + 13, ly = groundY - 5;
    if (night > 0.2) {
      for (let r = 9; r > 3; r -= 2) { ctx.globalAlpha = 0.08 * night; disc(lx + 2, ly + 3, r, '#ffe9a0'); }
      ctx.globalAlpha = 1;
    }
    sprite(SPR.lantern, lx, ly, ITEM_PAL);
  }

  function hearts(x, y, n) {
    for (let i = 0; i < n; i++) {
      particles.push({ kind: 'heart', x: x + U.rand(-4, 4), y: y + U.rand(-2, 2), vx: U.rand(-6, 6), vy: U.rand(-16, -8), life: U.rand(1.2, 2), t: 0 });
    }
  }
  function sparkles(x, y, n) {
    for (let i = 0; i < n; i++) {
      particles.push({ kind: 'spark', x, y, vx: U.rand(-30, 30), vy: U.rand(-40, -10), life: U.rand(0.6, 1.2), t: 0 });
    }
  }

  function drawParticles(dt) {
    particles = particles.filter((p) => (p.t += dt) < p.life);
    for (const p of particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'spark') p.vy += 60 * dt;
      const a = 1 - p.t / p.life;
      if (p.kind === 'heart') sprite(SPR.heart, p.x, p.y, ITEM_PAL, false, a);
      else if (p.kind === 'spark') {
        ctx.globalAlpha = a; ctx.fillStyle = U.pick(['#ffd84d', '#fff', '#ff9eb5']);
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); ctx.globalAlpha = 1;
      } else if (p.kind === 'z') {
        ctx.globalAlpha = a; ctx.fillStyle = '#e9e4ff';
        const x = Math.round(p.x), y = Math.round(p.y);
        ctx.fillRect(x, y, 3, 1); ctx.fillRect(x + 1, y + 1, 1, 1); ctx.fillRect(x, y + 2, 3, 1);
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawFish() {
    if (fishItem) sprite(SPR.fish, fishItem.x, fishItem.y, ITEM_PAL);
  }

  // ---------- Konuşma balonu ----------
  function positionBubble() {
    if (!bubbleEl || bubbleEl.classList.contains('hidden')) return;
    const [w, h] = lunaSpriteSize();
    const cx = (L.x + w / 2) * scale;
    const bw = bubbleEl.offsetWidth;
    const ww = wrap.clientWidth;
    const left = U.clamp(cx - bw / 2, 8, ww - bw - 8);
    bubbleEl.style.left = left + 'px';
    bubbleEl.style.bottom = ((H - (groundY - h + L.y)) * scale + 10) + 'px';
    bubbleEl.style.setProperty('--arrow', U.clamp(cx - left, 14, bw - 14) + 'px');
  }

  // ---------- Döngü ----------
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - lastT) / 1000 || 0);
    lastT = now;
    acc += dt;
    if (acc < 1 / 30) return; // ~30 fps yeterli, pil dostu
    const step = acc; acc = 0;
    time += step;

    const date = new Date();
    sun = solar(date);
    const [top, bottom] = skyColors(sun.elev);
    const light = U.clamp((sun.elev + 6) / 16, 0, 1);
    const night = U.clamp((-sun.elev - 2) / 10, 0, 1);
    const dusk = U.clamp(1 - Math.abs(sun.elev - 1) / 8, 0, 1);

    drawSky(top, bottom);
    drawStars(night);
    drawShooting(step, night);
    drawMoon(sun, date);
    drawSun(sun);
    drawClouds(step, light);
    drawGround(light, dusk);
    drawFlies(step, night);
    updateLuna(step);
    drawStudyProps(night);
    drawFish();
    drawLuna();
    drawParticles(step);

    if (bubbleUntil && performance.now() > bubbleUntil) {
      bubbleEl.classList.add('hidden');
      bubbleUntil = 0;
    }
    positionBubble();
  }

  function hit(ev) {
    const rect = cv.getBoundingClientRect();
    const x = (ev.clientX - rect.left) / scale, y = (ev.clientY - rect.top) / scale;
    const [w, h] = lunaSpriteSize();
    const top = groundY - h + L.y;
    if (x >= L.x - 3 && x <= L.x + w + 3 && y >= top - 4 && y <= groundY + 3) {
      if (L.state === 'sleep') { L.state = 'sit'; L.wait = 4; }
      L.vy = -70;
      hearts(L.x + w / 2, top, 4);
      onPoke && onPoke();
    } else {
      sparkles(x, y, 8);
    }
  }

  return {
    init(canvas, bubble, opts = {}) {
      cv = canvas; wrap = canvas.parentElement; bubbleEl = bubble; ctx = cv.getContext('2d');
      onPoke = opts.onPoke;
      this.setPalette(Store.data.settings.lunaColor);
      resize();
      L.x = W * 0.2;
      window.addEventListener('resize', resize);
      cv.addEventListener('pointerdown', hit);
      requestAnimationFrame(frame);
    },
    setMode(m) { mode = m; if (m !== 'focus' && L.state === 'sit') L.wait = 1; },
    setPalette(name) { pal = PALETTES[name] || PALETTES.gece; },
    palettes: Object.keys(PALETTES),
    paletteColor: (name) => (PALETTES[name] || PALETTES.gece).k,
    say(text, opts = {}) {
      if (!bubbleEl) return;
      bubbleEl.innerHTML = (opts.love ? '<span class="love-tag">💌</span> ' : '') + U.esc(text);
      bubbleEl.classList.toggle('love', !!opts.love);
      bubbleEl.classList.remove('hidden');
      bubbleEl.classList.remove('pop'); void bubbleEl.offsetWidth; bubbleEl.classList.add('pop');
      bubbleUntil = performance.now() + (opts.ms || Math.max(5000, text.length * 85));
      positionBubble();
    },
    feed() {
      fishItem = { x: U.clamp(L.x + (L.dir > 0 ? 34 : -14), 20, W - 12), y: 0, vy: 0 };
      if (L.state === 'sleep') L.state = 'sit';
      L.state = 'walk';
    },
    celebrate() { sparkles(L.x + 8, groundY - 16, 30); hearts(L.x + 8, groundY - 18, 6); L.vy = -80; },
    sunInfo() { return sun || solar(new Date()); },
  };
})();
