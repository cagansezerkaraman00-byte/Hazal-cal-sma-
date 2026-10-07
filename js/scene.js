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


  // Öne dönük iri, okunaklı piksel yüzler. Tüy ve göz renkleri karakter paletinden gelir.
  function expression(rows, mood) {
    if (mood === 'neutral') return rows;
    let out = (mood === 'happy' || mood === 'proud' ? eyes(rows, 'happy')
      : mood === 'sleepy' ? eyes(rows, 'sleep') : rows).map(r => r.split(''));
    const eyeY = rows.findIndex(r => r.includes('h'));
    if (eyeY < 0) return rows;
    const eyeX = [...rows[eyeY]].flatMap((c,i) => c === 'h' ? [i] : []);
    const dot = (x,y,c) => { if (out[y] && x >= 0 && x < out[y].length) out[y][x] = c; };
    const mid = Math.round((eyeX[0] + eyeX[eyeX.length-1]) / 2);
    if (mood === 'angry' || mood === 'sad' || mood === 'tender') {
      eyeX.forEach((x,i) => {
        const inward = i === 0 ? 1 : -1;
        const tilt = mood === 'angry' ? 1 : -1;
        dot(x-inward, eyeY-2, 'o'); dot(x, eyeY-2+tilt, 'o'); dot(x+inward, eyeY-2+tilt, 'o');
        if (mood === 'tender') { dot(x+inward,eyeY+2,'t'); dot(x+inward,eyeY+3,'t'); }
      });
    }
    if (mood === 'happy' || mood === 'proud') {
      dot(mid-2,eyeY+3,'o'); dot(mid+2,eyeY+3,'o');
      for(let x=mid-1;x<=mid+1;x++)dot(x,eyeY+4,'o');
      dot(mid-4,eyeY+2,'p'); dot(mid+4,eyeY+2,'p');
    }
    if (mood === 'sleepy') {
      for(let y=eyeY+3;y<=eyeY+5;y++)for(let x=mid-1;x<=mid+1;x++)dot(x,y,'o');
      dot(mid,eyeY+4,'P'); dot(mid,eyeY+5,'p');
    }
    return out.map(r=>r.join(''));
  }
  function frontRows() {
    let rows = blank(28, 29);
    rows = put(rows, [
      '.....oooooo.....','...oowwwwwwoo...','..owwwwwwwwwwo..',
      '.owwwwwwwwwwwwo.','.owwwwwwwwwwwwo.','owwwwwwwwwwwwwwo',
      'owwwwwwwwwwwwwwo','owwwwwwwwwwwwsso','owwwwwwwwwwwwsso',
      'owwwwwwwwwwwssso','owwwwwwwwwwsssso','owwmwwwwwwwmwssso',
      'owwmwwwwwwwmwssso','owwmwwwwwwwmwssso','.owmwwwwwwwmwsso.',
      '..oooooooooooo..'
    ],6,12);
    rows = put(rows, PART.sitTail,0,22,true);
    rows = put(rows,PART.head,4,0);
    rows = put(rows,['owwmwwowwmwwo','.ooooo.ooooo.'],7,27,true);
    return rows;
  }
  function emotionPose(actor) {
    if (!actor.emote || actor.emote.until <= time) return null;
    const e = actor.emote;
    if (reducedMotion) return 'face_' + e.mood;
    const elapsed = time - e.start;
    // Esneme açılıp kapanır; konuşma sırasında arada bir göz kırpar.
    if (e.mood === 'sleepy' && Math.floor(elapsed * 1.5) % 3 === 2) return 'face_neutralB';
    return actor.blink > 0 ? 'face_' + e.mood + 'B' : 'face_' + e.mood;
  }
  function express(actor, mood, ms) {
    const allowed = ['neutral','happy','proud','angry','sad','tender','sleepy'];
    if (!actor || !allowed.includes(mood)) return;
    actor.emote = { mood, start: time, until: time + Math.min(14,Math.max(4,ms/1000)) };
    if (actor === L && play) endPlay(true);
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
    for (const mood of ['neutral','happy','proud','angry','sad','tender','sleepy']) {
      const face = expression(frontRows(), mood);
      add('face_' + mood, face, 13.5);
      add('face_' + mood + 'B', eyes(face, 'blink'), 13.5);
    }
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
    t: '#72c9ef', o: '#665c82', m: '#b3acd0', w: '#fdfcff', s: '#e6e1f3', S: '#cdc6e2', p: '#f7b3c6', P: '#e98aa4',
    e: '#f2b441', E: '#c98524', k: '#4a2f14', h: '#ffffff', x: '#d4cee6',
  };

  // ---------- Vesper ve yavru Güçlü ----------
  // Vesper: Luna'nın pozları, simsiyah kadife tüy, mavi gözler (gece silüeti için yumuşak açık dış hat)
  const VES_PAL = {
    t: '#72c9ef', o: '#706582', m: '#3d3956', w: '#2a2639', s: '#34304a', S: '#403b5a', p: '#b77089', P: '#9a5672',
    e: '#5ccbff', E: '#2c8fe0', k: '#08141f', h: '#ffffff', x: '#6c678c',
  };
  // Yavru Güçlü: küçük gövde, kocaman yeşil gözler. w: turuncu, s: çizgi, c: krem göğüs/pati
  const KIT = {
    head: [
      '..o.........o..',
      '..oo.......oo..',
      '..opo.....opo..',
      '.owpPoooooPpwo.',
      'owwwwswswswwwwo',
      'owwhekwwwhekwwo',
      'owwekkwwwekkwwo',
      'owwEeewpwEeewwo',
      'xowwcwmwmwcwwox',
      '.oscccccccccso.',
      '..oocccccccoo..',
    ],
    sitBody: [
      '..owwwwwwwwwo..',
      '.owswcccccwswo.',
      'owwswcccccwswwo',
      'owswwcccccwwswo',
      'owwswcccccwswwo',
      '.owwcco.occwwo.',
      '..oooo...oooo..',
    ],
    sitTail: [
      '.....oo',
      '....owo',
      '....oso',
      'ooooowo',
      'owswswo',
      '.ooooo.',
    ],
    walkBody: [
      '..ooooooooooo.',
      '.owswswswswwwo',
      'owwwwwwwwwwwwo',
      'owswswswswwcco',
      '.owwwwwwwwcco.',
      '..ooooooooooo.',
    ],
    legsA: [
      '.owo..owo..owo.owo',
      '.ooo..ooo..ooo.ooo',
    ],
    legsB: [
      'owo..owo....owo.ow',
      'ooo..ooo....ooo.oo',
    ],
    tailUp: [
      '.o...',
      'owo..',
      'oso..',
      'owwo.',
      '.oswo',
      '..owo',
    ],
    sleep: [
      '.o.....o..........',
      'opo...opo.ooooo...',
      'oPpooopPoowswsoo..',
      'owwswswwowwwwwwso.',
      'owoowoowowswswwwo.',
      'owwwpwwwowwwwwwswo',
      'occcccccoswswswwso',
      '.ocpcpccowwwwwwwso',
      '..ooooooooooooooo.',
    ],
  };
  const KIT_PAL = {
    t: '#72c9ef', o: '#79421f', w: '#ffb45c', s: '#f08a2c', S: '#d06a18', c: '#fff1d6', m: '#c9753a',
    p: '#ff9db3', P: '#e9789a', e: '#9be36a', E: '#5fae3a', k: '#1f2a12', h: '#ffffff', x: '#e8c9a8',
  };
  function kittenRows() {
    const R = {};
    let s = blank(17, 17);
    s = put(s, KIT.sitTail, 10, 9);
    s = put(s, KIT.sitBody, 1, 10);
    s = put(s, KIT.head, 1, 0);
    R.sit = { rows: s, hx: 8 };
    R.sitB = { rows: eyes(s, 'blink'), hx: 8 };
    for (const mood of ['neutral','happy','proud','angry','sad','tender','sleepy']) {
      const face = expression(s, mood);
      R['face_' + mood] = { rows: face, hx: 8 };
      R['face_' + mood + 'B'] = { rows: eyes(face, 'blink'), hx: 8 };
    }
    const walk = (legs) => {
      let w = blank(27, 14);
      w = put(w, KIT.tailUp, 0, 0);
      w = put(w, KIT.walkBody, 3, 6);
      w = put(w, legs, 3, 12);
      return put(w, KIT.head, 12, 1);
    };
    R.walkA = { rows: walk(KIT.legsA), hx: 19 };
    R.walkB = { rows: walk(KIT.legsB), hx: 19 };
    R.sleep = { rows: mirror(KIT.sleep), hx: KIT.sleep[0].length - 1 - 4 };
    return R;
  }

  // ---------- Mevsimler, çiçekler ve süsler ----------
  // Gündüz renkleri (gece için mevcut koyu tonlarla karıştırılır)
  const SEASON = {
    ilkbahar: { far: '#7fc77c', near: '#58a85e', path: '#9a8a62', leaf: '#5fb062', trunk: '#6b4a32', bloom: '#ffc4dc' },
    yaz: { far: '#6aa46e', near: '#4c8a52', path: '#8a7a5a', leaf: '#3f8a4a', trunk: '#6b4a32' },
    sonbahar: { far: '#c4a55a', near: '#a9803f', path: '#8a6c4a', leaf: '#e07a2e', leaf2: '#c7472f', leaf3: '#f0b13c', trunk: '#5e3f2a' },
    kis: { far: '#dfe6f3', near: '#f2f6fc', path: '#e3eaf5', trunk: '#5a4636', snow: true, nFar: '#3d4767', nNear: '#4a5577', nPath: '#4d5878' },
  };
  const FLOWER = {
    lale: ['.c.', 'ccc', 'cdc', '.g.', 'gg.', '.g.'],
    papatya: ['.w.', 'wyw', '.w.', '.g.', 'g..'],
    aycicegi: ['.yyy.', 'yybyy', 'ybbby', 'yybyy', '.yyy.', '..g..', '.gg..', '..g..', '..gg.', '..g..'],
    gelincik: ['.r.', 'rkr', '.r.', '.g.', '.g.'],
    lavanta: ['.l.', 'lL.', '.l.', 'Ll.', '.g.', '.g.'],
    mantar: ['.rrr.', 'rwrrr', 'rrrwr', '..w..', '..w..'],
    cigdem: ['.p.', 'pPp', 'pPp', '.g.'],
    kardelen: ['.g.', '.gw', '..w', '.g.', '.g.'],
  };
  const FLOWER_PAL = { w: '#ffffff', y: '#ffd23f', b: '#8a5a2b', r: '#e83a3a', k: '#2b1b1b', l: '#b79bff', L: '#8a6be0', p: '#c08cff', P: '#ffe066' };
  const TULIP = [['#e8414e', '#b8283a'], ['#ff7fae', '#d9558a'], ['#ffd23f', '#d9a514'], ['#b98cff', '#8a5fe0']];
  const SEASON_FLOWERS = {
    ilkbahar: ['lale', 'lale', 'papatya', 'cigdem', 'papatya', 'lale'],
    yaz: ['aycicegi', 'gelincik', 'papatya', 'lavanta', 'gelincik', 'papatya'],
    sonbahar: ['mantar', 'cigdem', 'papatya', 'mantar'],
    kis: ['kardelen', 'kardelen'],
  };
  const HOUSE = [
    '......rr.c..',
    '.....rrrrc..',
    '....rrrrrr..',
    '...rrrrrrrr.',
    '..rrrrrrrrrr',
    '.rrrrrrrrrrr',
    '..wwwwwwwww.',
    '..wnnwwwddw.',
    '..wnnwwwddw.',
    '..wwwwwwddw.',
  ];
  const DECO = {
    fener: ['.k.', 'fFf', 'fFf', 'fFf', '.f.'],
    kalp: ['h.h', 'hhh', '.h.'],
    hediye: ['..r..', 'bbrbb', 'bbrbb', 'bbrbb'],
    sapka: ['......ww', '....rrr.', '..rrrrr.', '.rrrrrrr', 'wwwwwwww'],
    bayrakA: [
      'rrrrrrrrrrrr',
      'rrrwwwrrrrrr',
      'rrwwrrrrrrrr',
      'rwwrrrrwrrrr',
      'rwwrrrwwwrrr',
      'rrwwrrrwrrrr',
      'rrrwwwrrrrrr',
      'rrrrrrrrrrrr',
    ],
    kusA: ['o...o', '.o.o.', '..o..'],
    kusB: ['.....', 'oo.oo', '..o..'],
    kelebekA: ['w.w', '.b.'],
    kelebekB: ['.w.', '.b.'],
  };
  const BULBS = ['#ff5d6c', '#ffd84d', '#5fd3a3', '#6cc4ff', '#c49bff'];
  // Mevsimin takımyıldızı (gerçek gökyüzünde akşamları görünenler): noktalar + çizgi sırası
  const CONSTELLATION = {
    kis: { name: 'Avcı', pts: [[2, 1], [10, 0], [5, 6], [6.5, 6.5], [8, 7], [3, 12], [11, 11]], lines: [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]] },
    ilkbahar: { name: 'Büyük Ayı', pts: [[0, 0], [4, 1], [8, 2], [11, 3], [11, 7], [17, 7], [17, 3]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] },
    yaz: { name: 'Yaz Üçgeni', pts: [[0, 9], [13, 0], [9, 13]], lines: [[0, 1], [1, 2], [2, 0]] },
    sonbahar: { name: 'Kraliçe', pts: [[0, 2], [4, 7], [8, 3], [12, 8], [16, 1]], lines: [[0, 1], [1, 2], [2, 3], [3, 4]] },
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
    // Vesper (Luna'nın pozları) ve yavru Güçlü
    const sprite = (rows, hx, pal) => ({ c: [paint(rows, pal), paint(rows, pal, true)], w: rows[0].length, h: rows.length, hx });
    SP.vesper = {};
    for (const k of Object.keys(R)) SP.vesper[k] = sprite(R[k].rows, R[k].hx, VES_PAL);
    SP.kitten = {};
    const KR = kittenRows();
    for (const k in KR) SP.kitten[k] = sprite(KR[k].rows, KR[k].hx, KIT_PAL);
    // süsler
    SP.fener = ['#ff5d6c', '#ffd84d', '#3fc1b0', '#b48bff'].map((f) => paint(DECO.fener, { k: '#4a3a52', f, F: mixHex(f, '#ffffff', 0.45) }));
    SP.kalp = paint(DECO.kalp, { h: '#ff6b9a' });
    SP.hediye = [['#ff5d6c', '#ffd84d'], ['#6cc4ff', '#ffffff'], ['#5fd3a3', '#ff5d6c']].map(([b, rr]) => paint(DECO.hediye, { b, r: rr }));
    SP.sapka = [paint(DECO.sapka, { r: '#e8414e', w: '#ffffff' }), paint(DECO.sapka, { r: '#e8414e', w: '#ffffff' }, true)];
    // dalgalanma: ikinci karede sağ yarı bir piksel aşağı
    const wave = DECO.bayrakA.map((row, j) => row.slice(0, 6) + (j === 0 ? 'rrrrrr' : DECO.bayrakA[j - 1].slice(6)));
    SP.bayrak = [paint(DECO.bayrakA, { r: '#e30a17', w: '#ffffff' }), paint(wave, { r: '#e30a17', w: '#ffffff' })];
    SP.kus = [paint(DECO.kusA, { o: '#3a3f5a' }), paint(DECO.kusB, { o: '#3a3f5a' })];
    SP.kelebek = ['#ffb3d1', '#ffe27a', '#b9a8ff', '#9fe3c5'].map((w) => [paint(DECO.kelebekA, { w, b: '#3a2f45' }), paint(DECO.kelebekB, { w, b: '#3a2f45' })]);
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
  let feedTurn = 0;
  let fishItem = null, yarn = null, play = null, nextPlay = U.rand(90, 240);
  let bubbleUntil = 0, bubbleOn = false, bubbleW = 0, bubbleH = 0, bubbleL = -1, bubbleB = -1, bubbleA = -1;
  let wrapH = 0, hudR = null; // saat kutusunun sağ alt köşesi (balon onun üstüne binmesin)

  const L = { x: 60, y: 0, vy: 0, dir: 1, state: 'walk', ft: 0, target: 80, wait: 0, blinkIn: 3, blink: 0, eatT: 0, nap: false, awake: 0, speed: 16 };
  // mevsim / özel gün / dünya ayrıntıları
  let season = 'yaz', events = [], ev = {}, dayKey = '', flowers = [], house = null, decoCv = null, decoBulbs = [], treeBulbs = [];
  let birds = null, nextBirds = U.rand(25, 70), butterflies = [], seasonT = 0, smokeT = 0, fireT = 3, flagT = 0;
  // ziyaretçi kediler
  let friends = [], nextVisit = U.rand(45, 110), onFriend = null, onFriendSeen = null, onFriendArrival = null;
  let eveningVisitDay = ''; let bubbleSpeaker = 'luna';

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
    // kış ayında gökyüzü açıkken de hafif kar
    snowLight: { tint: '#e3e9f4', night: '#262c48', k: 0.15, cover: 0.15, clouds: 5, sun: 0.95, snow: 1 },
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

  // ---------- Ay hesabı (Meeus'un düşük hassasiyetli formülleri; dakikalar içinde doğru) ----------
  const RAD = Math.PI / 180, OBL = RAD * 23.4397;
  const jdays = (date) => date / 864e5 - 0.5 + 2440588 - 2451545; // J2000'den beri gün
  const ra = (l, b) => Math.atan2(Math.sin(l) * Math.cos(OBL) - Math.tan(b) * Math.sin(OBL), Math.cos(l));
  const dec = (l, b) => Math.asin(Math.sin(b) * Math.cos(OBL) + Math.cos(b) * Math.sin(OBL) * Math.sin(l));
  function moonCoords(d) {
    const L = RAD * (218.316 + 13.176396 * d), M = RAD * (134.963 + 13.064993 * d), F = RAD * (93.272 + 13.22935 * d);
    const l = L + RAD * 6.289 * Math.sin(M), b = RAD * 5.128 * Math.sin(F);
    return { ra: ra(l, b), dec: dec(l, b), dist: 385001 - 20905 * Math.cos(M) };
  }
  function sunCoords(d) {
    const M = RAD * (357.5291 + 0.98560028 * d);
    const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
    const L = M + C + RAD * 102.9372 + Math.PI;
    return { ra: ra(L, 0), dec: dec(L, 0) };
  }
  // ufuk koordinatları: yükseklik (derece) ve güneyden batıya doğru azimut (derece, -180..180)
  function moonSky(date) {
    const { lat, lon } = Store.data.settings;
    const d = jdays(date), c = moonCoords(d), phi = RAD * lat;
    const H = RAD * (280.16 + 360.9856235 * d) + RAD * lon - c.ra;
    let h = Math.asin(Math.sin(phi) * Math.sin(c.dec) + Math.cos(phi) * Math.cos(c.dec) * Math.cos(H));
    const hr = Math.max(h, 0);
    h += 0.0002967 / Math.tan(hr + 0.00312536 / (hr + 0.08901179)); // kırılma
    const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(c.dec) * Math.cos(phi));
    return { alt: h / RAD, az: az / RAD };
  }
  // evre: 0 yeni ay, 0.25 ilk dördün, 0.5 dolunay, 0.75 son dördün; fraction = aydınlık oranı
  function moonIllum(date) {
    const d = jdays(date), sc = sunCoords(d), mc = moonCoords(d), sd = 149598000;
    const phi = Math.acos(U.clamp(Math.sin(sc.dec) * Math.sin(mc.dec) + Math.cos(sc.dec) * Math.cos(mc.dec) * Math.cos(sc.ra - mc.ra), -1, 1));
    const inc = Math.atan2(sd * Math.sin(phi), mc.dist - sd * Math.cos(phi));
    const ang = Math.atan2(Math.cos(sc.dec) * Math.sin(sc.ra - mc.ra), Math.sin(sc.dec) * Math.cos(mc.dec) - Math.cos(sc.dec) * Math.sin(mc.dec) * Math.cos(sc.ra - mc.ra));
    return { fraction: (1 + Math.cos(inc)) / 2, phase: 0.5 + (0.5 * inc * (ang < 0 ? -1 : 1)) / Math.PI };
  }
  // önümüzdeki 24 saatte ilk doğuş ve batış (10 dakikalık adımlar + doğrusal ara değer)
  function moonTimes(date) {
    let rise = null, set = null, t0 = +date, a0 = moonSky(date).alt;
    for (let i = 1; i <= 144 && !(rise && set); i++) {
      const t1 = +date + i * 6e5, a1 = moonSky(new Date(t1)).alt;
      if (a0 <= 0 && a1 > 0 && !rise) rise = new Date(t0 + (t1 - t0) * (-a0 / (a1 - a0)));
      if (a0 > 0 && a1 <= 0 && !set) set = new Date(t0 + (t1 - t0) * (a0 / (a0 - a1)));
      t0 = t1; a0 = a1;
    }
    return { rise, set };
  }
  const MOON_NAMES = [
    [0.033, '🌑', 'Yeni ay'], [0.216, '🌒', 'Hilal'], [0.284, '🌓', 'İlk dördün'], [0.466, '🌔', 'Şişkin ay'],
    [0.534, '🌕', 'Dolunay'], [0.716, '🌖', 'Şişkin ay'], [0.784, '🌗', 'Son dördün'], [0.967, '🌘', 'Hilal'], [1.01, '🌑', 'Yeni ay'],
  ];
  let moonVis = 1; // ay ufkun hemen altındayken yumuşak doğuş/batış
  let moonIllumNow = moonIllum(new Date()).fraction;

  function arcPos(frac, peak) {
    const x = W * (0.06 + 0.88 * frac);
    const y = horizon + 4 - Math.sin(frac * Math.PI) * (horizon - 10) * peak;
    return [Math.round(x), Math.round(y)];
  }

  // sol üstteki saat kutusunun tuval koordinatlarındaki yeri
  function hudBox() {
    const el = wrap && wrap.querySelector('.hud-left');
    if (!el || !scale || !cv) return null;
    const r = el.getBoundingClientRect(), c = cv.getBoundingClientRect();
    if (!r.width || !c.width) return null;
    const k = W / c.width;
    return { x0: (r.left - c.left) * k, y0: (r.top - c.top) * k, x1: (r.right - c.left) * k, y1: (r.bottom - c.top) * k };
  }
  function clearOf(pos, rad, b) {
    if (!pos || !b) return pos;
    const hidden = pos[0] + rad > b.x0 && pos[0] - rad < b.x1 && pos[1] + rad > b.y0 && pos[1] - rad < b.y1;
    return hidden ? [Math.round(b.x1 + rad + 3), pos[1]] : pos;
  }

  // Saniyede bir: güneş, gece katsayısı, güneş/ay konumu; gökyüzü belirgin değiştiyse arka planı yenile
  function updateSun() {
    const date = new Date();
    const dk = U.dateKey(date);
    if (dk !== dayKey) {
      // gün değişti: mevsim ve özel günler yeniden
      dayKey = dk;
      const ns = window.Takvim ? Takvim.season(date) : 'yaz';
      events = window.Takvim ? Takvim.events(date) : [];
      ev = {};
      for (const e of events) ev[e.key] = e;
      if (ns !== season) { season = ns; if (W) buildWorld(); }
      bgDirty = true;
      if (W) applyWeather();
    }
    sun = solar(date);
    hour = date.getHours();
    light = U.clamp((sun.elev + 6) / 16, 0, 1);
    night = U.clamp((-sun.elev - 2) / 10, 0, 1);
    dusk = U.clamp(1 - Math.abs(sun.elev - 1) / 8, 0, 1);
    const { mins, sunrise, sunset } = sun;
    sunPos = mins >= sunrise - 25 && mins <= sunset + 25
      ? arcPos((mins - sunrise) / (sunset - sunrise), U.clamp(sun.noonElev / 70, 0.45, 1)) : null;
    // gerçek ay: azimut sahnede soldan (doğu) sağa (batı), yükseklik güneşle aynı ölçekte
    const m = moonSky(date);
    moonVis = U.clamp((m.alt + 1.5) / 3, 0, 1);
    moonPos = moonVis > 0 && moonIllumNow > 0.02
      ? [Math.round(W * (0.5 + 0.44 * U.clamp(m.az / 120, -1, 1))), Math.round(horizon + 4 - U.clamp(m.alt / 70, -0.05, 1) * (horizon - 10))]
      : null;
    // saat kutusunun arkasında kalmasınlar: yükseklik aynı, kutunun hemen sağına
    const box = hudBox();
    sunPos = clearOf(sunPos, 8, box);
    moonPos = clearOf(moonPos, 6, box);
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
    // mevsimin takımyıldızı (sağ tarafta, soluk)
    const C = CONSTELLATION[season];
    if (C) {
      const ox = Math.round(W * 0.68), oy = Math.round(horizon * 0.12);
      const pts = C.pts.map(([a, b]) => [Math.round(ox + a * 1.4), Math.round(oy + b * 1.4)]);
      cg.fillStyle = '#cfd8ff';
      for (const [i0, i1] of C.lines) {
        const [x0, y0] = pts[i0], [x1, y1] = pts[i1];
        const m = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let j = 2; j < m - 1; j += 2) cg.fillRect(Math.round(x0 + ((x1 - x0) * j) / m), Math.round(y0 + ((y1 - y0) * j) / m), 1, 1);
      }
      consPts = consPts.concat(pts.filter(([x, y]) => x < W - 1 && y < skyH));
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
    buildFlowers(r);
    // tepedeki küçük kulübe (gece penceresi yanar, kış/sonbahar akşamı bacası tüter)
    const hx0 = Math.round(W * 0.6);
    house = W > 120 ? { x: hx0, y: Math.min(hillFar[hx0], hillFar[Math.min(W - 1, hx0 + 11)]) - HOUSE.length + 2 } : null;
    butterflies = [0, 1, 2].map((i) => ({ x: r() * W, y: groundY - 10 - r() * 10, ph: r() * 6.28, c: i % 4, vx: 0 }));
    applyWeather();
  }

  // Mevsim çiçekleri: yolun arka kenarına sabit dizilir (çalışma köşesi ve zambaklar boş kalır)
  function buildFlowers(r) {
    flowers = [];
    const kinds = SEASON_FLOWERS[season] || [];
    if (!kinds.length) return;
    const sx = studyHX();
    const busy = (x) => (x > sx - 32 && x < sx + 38) || lilies.some((l) => !l.fg && Math.abs(l.x - x) < 4);
    const n = U.clamp(Math.round(W / (season === 'kis' ? 26 : season === 'sonbahar' ? 18 : 11)), 3, 26);
    for (let i = 0, tries = 0; i < n && tries < n * 6; tries++) {
      const x = 3 + Math.floor(r() * (W - 8));
      if (busy(x) || flowers.some((f) => Math.abs(f.x - x) < 3)) continue;
      const back = r() < 0.35; // bir kısmı tepenin üstünde, daha küçük görünür
      flowers.push({ x, k: kinds[i % kinds.length], t: Math.floor(r() * TULIP.length), back });
      i++;
    }
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
    wrapH = wrap.clientHeight;
    if (bubbleOn) { bubbleW = bubbleEl.offsetWidth; bubbleH = bubbleEl.offsetHeight; bubbleL = -1; measureHud(); }
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
    let it = weather.intensity;
    if (season === 'kis' && !['rain', 'drizzle', 'storm'].includes(weather.kind)) {
      if (weather.kind === 'snow') fx = WX.snow;
      else { fx = WX.snowLight; it = 0.35; }
    } else fx = WX[weather.kind] || WX.clear;
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
    const SE = SEASON[season] || SEASON.yaz;
    let far = mixHex(mixHex(SE.nFar || '#20244a', SE.far, light), '#9a5a7a', dusk * 0.35);
    let near = mixHex(mixHex(SE.nNear || '#151833', SE.near, light), '#6b3d5e', dusk * 0.3);
    let path = mixHex(SE.nPath || '#1c1d3a', SE.path, light);
    let leaf = mixHex('#1d2c3e', SE.leaf || '#3f8a4a', light);
    if (tint) { far = mixHex(far, tint, k * 0.5); near = mixHex(near, tint, k * 0.25); path = mixHex(path, tint, k * 0.2); leaf = mixHex(leaf, tint, k * 0.25); }
    if (fx.fog) far = mixHex(far, bottom, 0.6 * wk);
    const snowy = fx.snow ? mixHex('#9aa3c4', '#f4f7ff', light) : null;
    if (snowy) { near = mixHex(near, snowy, 0.25 * wk); path = mixHex(path, snowy, 0.35 * wk); }
    const oy = landTop;
    g = landCtx;
    g.clearRect(0, 0, W, H - oy);
    g.fillStyle = far;
    for (let x = 0; x < W; x++) g.fillRect(x, hillFar[x] - oy, 1, H - hillFar[x]);
    drawHouse(g, oy);
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
    stemColor = mixHex('#24413a', season === 'sonbahar' ? '#7a8a3a' : '#4f9a52', light);
    drawTree(g, Math.round(W * 0.82), groundY - oy, leaf, snowy, SE);
    drawFlowers(g, oy, far);
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
    buildDeco();
    // zambak sapları ve yaprakları
    const lp = { g: stemColor, G: mixHex(stemColor, '#000000', 0.3) };
    leafCv = [paint(LILY.leaf, lp, true), paint(LILY.leaf, lp)];
    fogColor = mixHex('#59607e', '#e6e9f0', light);
  }

  // Piksel dizisini doğrudan bir katmana bas (kanvas oluşturmadan)
  function stamp(g, rows, pal, x, y) {
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j];
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '.' || !pal[ch]) continue;
        g.fillStyle = pal[ch];
        g.fillRect(x + i, y + j, 1, 1);
      }
    }
  }
  const dim = (c, k = 0.7) => mixHex('#1b1f3a', c, 1 - (1 - light) * k);

  function drawTree(g, tx, ty, leaf, snowy, SE) {
    const trunk = mixHex('#2a1d2e', SE.trunk, light);
    const snow = mixHex('#9aa3c4', '#ffffff', light);
    const r = seeded(77);
    treeBulbs = [];
    g.fillStyle = trunk;
    g.fillRect(tx, ty - 14, 3, 14);
    if (SE.snow) {
      // kış: çıplak dallar, üstlerinde kar
      const br = [[1, -12, -7, -20], [2, -13, 9, -21], [1, -15, 1, -26], [1, -18, -4, -24], [2, -18, 6, -25]];
      for (const [x0, y0, x1, y1] of br) {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let i = 0; i <= n; i++) {
          const x = Math.round(tx + x0 + ((x1 - x0) * i) / n), y = Math.round(ty + y0 + ((y1 - y0) * i) / n);
          g.fillStyle = trunk; g.fillRect(x, y, 1, 1);
          if (i % 2 === 0) { g.fillStyle = snow; g.fillRect(x, y - 1, 1, 1); }
          if (i > 1 && i % 2) treeBulbs.push([x, y + 1]);
        }
      }
      g.fillStyle = snow;
      g.fillRect(tx - 3, ty - 1, 9, 1);
      g.fillRect(tx - 1, ty - 2, 5, 1);
    } else {
      disc(g, tx + 1, ty - 19, 7, leaf);
      disc(g, tx - 4, ty - 15, 5, leaf);
      disc(g, tx + 6, ty - 15, 5, leaf);
      const spots = season === 'ilkbahar' ? [dim(SE.bloom), dim('#ffffff')] : season === 'sonbahar' ? [dim(SE.leaf2), dim(SE.leaf3)] : [mixHex(leaf, '#ffffff', 0.15)];
      const count = season === 'yaz' ? 6 : 22;
      for (let i = 0; i < count; i++) {
        const a = r() * 6.28, d = r() * 7;
        const x = Math.round(tx + 1 + Math.cos(a) * d * 1.3), y = Math.round(ty - 18 + Math.sin(a) * d * 0.8);
        g.fillStyle = spots[i % spots.length];
        g.fillRect(x, y, 1, 1);
        if (i % 3 === 0) treeBulbs.push([x, y]);
      }
      if (season === 'sonbahar') { // yere düşmüş yapraklar
        for (let i = 0; i < 9; i++) { g.fillStyle = spots[i % 2]; g.fillRect(Math.round(tx - 9 + r() * 20), ty + (i % 2), 1, 1); }
      }
      if (snowy) { g.fillStyle = snowy; g.fillRect(tx - 1, ty - 26, 5, 1); g.fillRect(tx - 8, ty - 19, 3, 1); g.fillRect(tx + 8, ty - 19, 3, 1); }
    }
    // yılbaşı: tepede yıldız, dibinde hediyeler
    if (ev.yilbasi) {
      g.fillStyle = '#ffd84d';
      const sy = SE.snow ? ty - 28 : ty - 28;
      g.fillRect(tx + 1, sy - 1, 1, 3); g.fillRect(tx, sy, 3, 1);
      SP.hediye.forEach((h, i) => g.drawImage(h, tx - 9 + i * 7, ty - 3));
    }
    flagPos = ev.ulusal ? [tx - 13, ty - 22 + landTop] : null;
    if (flagPos) { g.fillStyle = mixHex('#3a3040', '#9a8a7a', light); g.fillRect(tx - 13, ty - 22, 1, 22); }
  }
  let flagPos = null;

  function drawFlowers(g, oy, far) {
    for (const f of flowers) {
      const rows = FLOWER[f.k];
      const tul = TULIP[f.t];
      const pal = {};
      for (const k in FLOWER_PAL) pal[k] = dim(FLOWER_PAL[k]);
      pal.c = dim(tul[0]); pal.d = dim(tul[1]); pal.g = stemColor;
      if (f.back) for (const k in pal) pal[k] = mixHex(pal[k], far, 0.35);
      const baseY = f.back ? Math.min(groundY - 3, hillNear[f.x] + 4) : groundY;
      stamp(g, rows, pal, f.x - (rows[0].length >> 1), baseY - rows.length - oy);
    }
  }

  function drawHouse(g, oy) {
    if (!house) return;
    const lit = night > 0.15 || light < 0.45;
    const pal = { r: dim('#b5544a'), w: dim('#efe0c8'), n: lit ? '#ffd97a' : dim('#7fb2dd'), d: dim('#7a4a2e'), c: dim('#8a5a4a') };
    const rows = season === 'kis' ? HOUSE.map((row, j) => (j < 3 ? row.replace(/r/g, 'S') : row)) : HOUSE;
    pal.S = mixHex('#9aa3c4', '#ffffff', light);
    if (lit) { g.globalAlpha = 0.18; disc(g, house.x + 4, house.y + 8 - oy, 4, '#ffd97a'); g.globalAlpha = 1; }
    stamp(g, rows, pal, house.x, house.y - oy);
  }

  // Özel gün süsleri: üstte asılı süs ipi (bayram fenerleri / bayraklar / yılbaşı ışıkları / kalpler)
  function buildDeco() {
    decoBulbs = [];
    const style = ev.ramazan || ev.kurban ? 'fener' : ev.ulusal ? 'bayrak' : ev.yilbasi ? 'isik' : ev.sevgililer ? 'kalp' : null;
    if (!style) { decoCv = null; return; }
    decoCv = decoCv && decoCv.width === W && decoCv.height === H ? decoCv : makeCanvas(W, H);
    const g = decoCv.getContext('2d');
    g.clearRect(0, 0, W, H);
    const span = Math.max(40, Math.round(W / 3));
    const yAt = (x) => 2 + Math.round(5 * Math.sin(Math.PI * ((x % span) / span)));
    g.fillStyle = dim('#6a5a72', 0.5);
    for (let x = 0; x < W; x++) g.fillRect(x, yAt(x), 1, 1);
    if (style === 'fener') {
      for (let x = 8, i = 0; x < W - 4; x += 16, i++) {
        const y = yAt(x) + 1;
        g.fillStyle = dim('#6a5a72', 0.5); g.fillRect(x, y, 1, 2);
        if (night > 0.2) { g.globalAlpha = 0.16 * night; disc(g, x, y + 5, 5, '#ffd97a'); g.globalAlpha = 1; }
        g.drawImage(SP.fener[i % SP.fener.length], x - 1, y + 2);
      }
    } else if (style === 'bayrak') {
      for (let x = 3, i = 0; x < W - 3; x += 5, i++) {
        const y = yAt(x) + 1;
        g.fillStyle = i % 2 ? '#ffffff' : '#e30a17';
        g.fillRect(x - 1, y, 3, 1); g.fillRect(x - 1, y + 1, 3, 1); g.fillRect(x, y + 2, 1, 1);
      }
    } else if (style === 'kalp') {
      for (let x = 6; x < W - 3; x += 12) g.drawImage(SP.kalp, x - 1, yAt(x) + 1);
    } else {
      for (let x = 2; x < W - 1; x += 5) decoBulbs.push([x, yAt(x) + 1]);
    }
  }

  function buildMoon() {
    moonCv = moonCv || makeCanvas(25, 25);
    const g = moonCv.getContext('2d'), r = 5;
    g.clearRect(0, 0, 25, 25);
    g.globalAlpha = 0.05;
    for (let k = 11; k > 6; k -= 2) disc(g, 12, 12, k, '#dfe6ff');
    // evre: ay diskindeki her piksel, gölge diskinin içindeyse karanlık
    const il = moonIllum(new Date());
    moonIllumNow = il.fraction;
    const ph = il.phase;
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
      // gündüz gökyüzünde soluk, gece parlak; bulut örttükçe silikleşir
      const day = 1 - U.clamp((light - 0.15) / 0.6, 0, 1) * 0.6;
      ctx.globalAlpha = moonVis * day * (1 - 0.6 * fx.cover * (fx.k ? wk : 0));
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
    const expressive = emotionPose(L);
    if (expressive) return expressive;
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
      if (Math.abs(L.x - L.target) <= 1) { L.state = 'sit'; L.wait = isEvening() ? U.rand(8, 18) : U.rand(3, 8); if (!reducedMotion && Math.random()<0.35) express(L,'happy',4000); }
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
    const f = fishItem, actor = f.actor || L;
    f.vy += 200 * dt;
    f.y = Math.min(groundY - 2, f.y + f.vy * dt);
    if (actor.state !== 'eat') {
      const side = f.x + 3 >= actor.x ? 1 : -1;
      actor.target = side > 0 ? f.x - 7 : f.x + 13;
      actor.speed = 18;
      if (Math.abs(actor.x - actor.target) > 1) { actor.state = 'walk'; if (actor !== L) actor.x += Math.sign(actor.target - actor.x) * Math.min(Math.abs(actor.target - actor.x), actor.speed * dt); }
      else if (f.y >= groundY - 2) { actor.state = 'eat'; actor.eatT = 2.2; actor.dir = side; }
      else { actor.state = 'sit'; actor.dir = side; }
    } else {
      actor.eatT -= dt;
      if (Math.random() < dt * 6) hearts(actor.x, groundY - 18, 1);
      if (actor.eatT <= 0) { fishItem = null; actor.state = 'happy'; actor.wait = 4; hearts(actor.x, groundY - 18, 5); if (f.onFed) f.onFed(f.kind); }
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

    if (L.emote && L.emote.until > time && !fishItem) {
      L.state = 'sit'; L.dir = 1; L.wait = 3;
      return; // konuşurken oturup kullanıcıya bakar, bitince normal davranışa döner
    }
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

  // pozlara göre kafanın en üst satırı (şapka için)
  const HEAD_TOP = { loafA: 0, loafB: 0, loafAB: 0, happy: 0, sleep: 2, walkA: 1, walkB: 1, walkAB: 1, walkBB: 1, crouch: 4, crouchB: 4, sitUp: 0, sitUpB: 0, playUp: 0, playSwipe: 0 };
  function drawLuna() {
    const g = lunaGeom();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#000';
    ctx.fillRect(g.left + 3, groundY + 1, g.p.w - 6, 1);
    ctx.globalAlpha = 1;
    // pusudayken kalça sallar
    const wig = L.state === 'crouch' && Math.sin(L.ft * 28) > 0 ? 1 : 0;
    const bob = !reducedMotion && L.emote && L.emote.until > time &&
      ['happy','proud'].includes(L.emote.mood) ? Math.round(Math.sin(time * 5)) : 0;
    const stepBob=!reducedMotion && L.state==='walk' ? Math.round(Math.sin(L.ft*12)) : 0;
    const playLean=!reducedMotion && L.state==='bat' ? Math.round(Math.sin(L.ft*18)) : 0;
    ctx.drawImage(g.c, g.left + wig + playLean, g.top + bob + stepBob);
    // yılbaşında Noel şapkası
    if (ev.yilbasi) {
      const top = HEAD_TOP[poseName()] ?? 0;
      ctx.drawImage(SP.sapka[L.dir > 0 ? 0 : 1], Math.round(L.x - 4) + wig, g.top + top);
    }
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
  const MAX_P = 120, SPARK_COLS = ['#ffd84d', '#ffffff', '#ff9eb5'];
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
      else if (p.kind === 'leaf' || p.kind === 'petal') {
        p.x += Math.sin(p.t * 2.4 + p.vx) * dt * 7;
        if (p.y >= groundY) { p.y = groundY; p.vy = 0; p.vx = 0; }
      }
      let a = 1 - p.t / p.life;
      if (p.kind === 'pollen') a *= 0.5 + 0.5 * Math.sin(p.t * 12);
      else if (p.kind === 'leaf' || p.kind === 'petal') a = Math.min(1, (p.life - p.t) * 1.5);
      ctx.globalAlpha = a;
      const x = Math.round(p.x), y = Math.round(p.y);
      if (p.kind === 'heart') ctx.drawImage(SP.heart, x - 2, y);
      else if (p.kind === 'z') ctx.drawImage(SP.z, x, y);
      else if (p.kind === 'smoke') { ctx.globalAlpha = a * 0.4; ctx.fillStyle = p.c; ctx.fillRect(x, y, 2, 2); }
      else if (p.kind === 'leaf') { ctx.fillStyle = p.c; ctx.fillRect(x, y, 2, 1); }
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

  // ---------- Ziyaretçi kediler: Vesper ve yavru Güçlü ----------
  // Luna ana karakter; diğerleri arada bir gelir, kısa bir "senaryo" oynar ve gider.
  const FRIEND_SPEED = { vesper: 14, kitten: 40 };
  function fpose(f) {
    const expressive = f.state !== 'walk' && emotionPose(f);
    if (expressive) return expressive;
    const blink = f.blink > 0;
    if (f.kind === 'vesper') {
      if (f.state === 'walk') return (Math.floor(f.ft * 6) % 2 ? 'walkA' : 'walkB') + (blink ? 'B' : '');
      if (f.state === 'sleep') return 'sleep';
      if (f.state === 'happy') return 'happy';
      if (f.state === 'eat') return Math.floor(f.ft * 6) % 2 ? 'loafAB' : 'loafA';
      if (f.state === 'loaf') return blink ? 'loafAB' : 'loafA';
      return blink ? 'sitUpB' : 'sitUp';
    }
    if (f.state === 'walk') return Math.floor(f.ft * 10) % 2 ? 'walkA' : 'walkB';
    if (f.state === 'sleep') return 'sleep';
    if (f.state === 'eat') return Math.floor(f.ft * 6) % 2 ? 'sitB' : 'sit';
    return blink ? 'sitB' : 'sit';
  }
  function fgeom(f) {
    const p = SP[f.kind][fpose(f)], right = f.dir > 0;
    return { p, c: p.c[right ? 0 : 1], left: Math.round(f.x - (right ? p.hx : p.w - 1 - p.hx)), top: Math.round(groundY - p.h + 1 + f.y) };
  }
  const spot = (side, dist) => Math.round(U.clamp(L.x + side * dist, 14, W - 14));
  function addFriend(kind, steps, from) {
    if (friends.some((f) => f.kind === kind)) return;
    friends.push({ kind, x: from > 0 ? W + 30 : -30, y: 0, vy: 0, dir: from > 0 ? -1 : 1, state: 'walk', ft: 0, steps, blink: 0, blinkIn: U.rand(2, 5) });
    if (onFriendSeen) onFriendSeen(kind);
  }
  const vesperTime = () => (hour >= 18 || hour < 5) && !!sun && sun.elev < 0;
  function startVisit(kind) {
    if (!W || mode === 'focus' || friends.length) return false;
    const side = L.x < W / 2 ? 1 : -1; // Luna'nın daha boş tarafı
    const from = Math.random() < 0.5 ? 1 : -1;
    if (kind === 'vesper' && !vesperTime()) return false;
    let k = kind || (vesperTime() ? (Math.random() < 0.6 ? 'vesper' : 'kitten') : 'kitten');
    if (!vesperTime() && (k === 'nap' || k === 'family')) k = 'kitten';
    if (k === 'vesper') {
      addFriend('vesper', [{ do: 'walk', x: () => spot(side, 38) }, { do: 'greet', t: 10 }, { do: 'sit', t: U.rand(8, 14) }, { do: 'loaf', t: U.rand(6, 12) }, { do: 'leave' }], from);
    } else if (k === 'kitten') {
      addFriend('kitten', [
        { do: 'walk', x: () => Math.round(U.rand(20, W - 20)), hop: true, speed: 46 },
        { do: 'walk', x: () => spot(side, 28), hop: true, speed: 40 },
        { do: 'greet', t: 10 }, { do: 'sit', t: U.rand(4, 7) }, { do: 'sleep', t: U.rand(14, 26) }, { do: 'sit', t: 2 },
        { do: 'leave', hop: true, speed: 46 },
      ], from);
    } else if (k === 'nap') {
      // akşam: Luna'nın yanına kıvrılıp uyurlar
      addFriend('vesper', [{ do: 'walk', x: () => spot(side, 36) }, { do: 'greet', t: 10 }, { do: 'sleep', t: U.rand(50, 110) }, { do: 'sit', t: 3 }, { do: 'leave' }], from);
      if (Math.random() < 0.6) addFriend('kitten', [{ do: 'wait', t: 3 }, { do: 'walk', x: () => spot(-side, 26), speed: 30 }, { do: 'sleep', t: U.rand(40, 90) }, { do: 'leave', hop: true, speed: 44 }], -from);
    } else {
      addFriend('vesper', [{ do: 'walk', x: () => spot(side, 38) }, { do: 'greet', t: 2 }, { do: 'sit', t: U.rand(16, 24) }, { do: 'leave' }], from);
      addFriend('kitten', [{ do: 'wait', t: 2 }, { do: 'walk', x: () => spot(-side, 26), hop: true, speed: 42 }, { do: 'greet', t: 2 }, { do: 'sleep', t: U.rand(14, 20) }, { do: 'leave', hop: true, speed: 46 }], -from);
    }
    return friends.length > 0;
  }
  // akşam Vesper ziyareti gece başına bir kez (05:00'e kadar "bu gece"); iPad uygulamayı yeniden yükleyince tekrar gelmesin
  const nightOf = () => U.dateKey(new Date(Date.now() - 5 * 3600e3));
  const eveningVisitDone = () => { try { return localStorage.getItem('luna-aksam-ziyaret') === nightOf(); } catch (e) { return eveningVisitDay === nightOf(); } };
  function markEveningVisit() { eveningVisitDay = nightOf(); try { localStorage.setItem('luna-aksam-ziyaret', eveningVisitDay); } catch (e) { /* gizli mod */ } }
  function updateFriends(dt) {
    if (vesperTime() && !eveningVisitDone() && mode !== 'focus' && !friends.length && !play && !fishItem) {
      // bazen Vesper (ve Güçlü) Luna'nın yanına kıvrılıp uyur
      startVisit(Math.random() < 0.4 ? 'nap' : 'vesper'); markEveningVisit(); nextVisit = U.rand(240,480);
    }
    if (mode === 'focus') {
      // odakta sahne sakin: yürüyenler sessizce çıkar, uyuyanlar uyumaya devam eder
      for (const f of friends) if (f.state !== 'sleep' && !(f.steps[0] && f.steps[0].do === 'leave')) f.steps = [{ do: 'leave' }];
    } else if (!friends.length && !play && !fishItem) {
      nextVisit -= dt * (mode === 'break' ? 1.5 : 1);
      if (nextVisit <= 0) { nextVisit = U.rand(240, 480); startVisit(); }
    }
    for (let i = friends.length - 1; i >= 0; i--) {
      const f = friends[i];
      if (f.kind === 'vesper' && !vesperTime() && f.steps[0]?.do !== 'leave') {
        f.emote = null; f.steps = [{ do: 'leave' }];
      }
      f.ft += dt;
      if (f.y < 0 || f.vy !== 0) { f.vy += 260 * dt; f.y += f.vy * dt; if (f.y >= 0) { f.y = 0; f.vy = 0; } }
      f.blinkIn -= dt;
      if (f.blinkIn <= 0) { f.blink = 0.15; f.blinkIn = U.rand(2.5, 6); }
      if (f.blink > 0) f.blink -= dt;
      if (fishItem && fishItem.actor === f) continue;
      const st = f.steps[0];
      if (!st) { friends.splice(i, 1); continue; }
      if (st.do === 'walk' || st.do === 'leave') {
        if (st.tx == null) st.tx = st.do === 'leave' ? (f.x < W / 2 ? -30 : W + 30) : (typeof st.x === 'function' ? st.x() : st.x);
        f.state = 'walk';
        const d = st.tx - f.x;
        if (Math.abs(d) > 0.5) f.dir = d > 0 ? 1 : -1;
        f.x += Math.sign(d) * Math.min(Math.abs(d), (st.speed || FRIEND_SPEED[f.kind]) * dt);
        if (st.hop && f.y === 0 && Math.random() < dt * 2.5) f.vy = -45;
        if (Math.abs(st.tx - f.x) <= 0.6) {
          f.steps.shift();
          if (st.do === 'leave') friends.splice(i, 1);
        }
        continue;
      }
      if (st.left == null) {
        st.left = st.t;
        f.dir = L.x >= f.x ? 1 : -1; // Luna'ya dönük
        if (st.do === 'greet') {
          if (onFriendArrival) onFriendArrival(f.kind);
          hearts((f.x + L.x) / 2, groundY - 18, 3);
          if (L.state === 'sit' || L.state === 'walk' || L.state === 'watch') { L.state = 'happy'; L.wait = 3; }
        }
      }
      f.state = st.do === 'greet' ? (f.kind === 'vesper' ? 'happy' : 'sit') : st.do === 'wait' ? 'sit' : st.do;
      st.left -= dt;
      if (f.state === 'sleep' && Math.random() < dt * 0.5) emit('z', f.x - f.dir * 3, groundY - 11, -2 * f.dir, -5, 2.2);
      if (st.left <= 0) f.steps.shift();
    }
  }
  function drawFriends() {
    for (const f of friends) {
      if (f.x < -40 || f.x > W + 40) continue;
      const g = fgeom(f);
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#000';
      ctx.fillRect(g.left + 2, groundY + 1, g.p.w - 4, 1);
      ctx.globalAlpha = 1;
      const bob = !reducedMotion && f.emote && f.emote.until > time && f.emote.mood === 'happy' ? Math.round(Math.sin(time*6)) : 0;
      ctx.drawImage(g.c, g.left, g.top + bob);
    }
  }

  // ---------- Süsler ve mevsim canlılığı (her kare, hafif) ----------
  function drawDeco() {
    if (decoCv) { ctx.globalAlpha = 1; ctx.drawImage(decoCv, 0, 0); }
    const tw = Math.floor(time * 2);
    // yılbaşı ışıkları: ipte ve ağaçta sırayla yanıp söner
    if (ev.yilbasi) {
      const list = decoBulbs.concat(treeBulbs);
      for (let i = 0; i < list.length; i++) {
        const [x, y] = list[i];
        const c = BULBS[(i + tw) % BULBS.length];
        if (night > 0.2) { ctx.globalAlpha = 0.25 * night; ctx.fillStyle = c; ctx.fillRect(x - 1, y - 1, 3, 3); }
        ctx.globalAlpha = 0.7 + 0.3 * Math.sin(time * 3 + i);
        ctx.fillStyle = c;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    if (flagPos) { ctx.globalAlpha = 1; ctx.drawImage(SP.bayrak[Math.floor(time * 3) % 2], flagPos[0] + 1, flagPos[1]); }
    ctx.globalAlpha = 1;
  }

  const LEAF_COLS = ['#e07a2e', '#c7472f', '#f0b13c'], PETAL_COLS = ['#ffc4dc', '#ffd9e8', '#ffffff'], FW_COLS = ['#ff5d6c', '#ffd84d', '#5fd3a3', '#6cc4ff', '#c49bff', '#ffffff'];
  function seasonFx(dt) {
    const wet = fx.rain || fx.storm;
    // sonbaharda yapraklar, ilkbaharda çiçek yaprakları süzülür
    seasonT += dt;
    if (seasonT > 0.8 && !wet && particles.length < MAX_P - 30) {
      seasonT = 0;
      const tx = Math.round(W * 0.82);
      if (season === 'sonbahar') emit('leaf', Math.random() < 0.6 ? tx + U.rand(-8, 10) : U.rand(0, W), Math.random() < 0.6 ? groundY - 24 : -2, U.rand(0, 6.28), U.rand(7, 12), U.rand(6, 9), U.pick(LEAF_COLS));
      else if (season === 'ilkbahar' && light > 0.3) emit('petal', Math.random() < 0.5 ? tx + U.rand(-8, 10) : U.rand(0, W), Math.random() < 0.5 ? groundY - 24 : -2, U.rand(0, 6.28), U.rand(5, 9), U.rand(6, 9), U.pick(PETAL_COLS));
    }
    // baca dumanı (kış ve sonbahar akşamları)
    if (house && (season === 'kis' || season === 'sonbahar') && (night > 0.1 || light < 0.7)) {
      smokeT += dt;
      if (smokeT > 0.7) { smokeT = 0; emit('smoke', house.x + 9, house.y - 1, U.rand(1, 3), U.rand(-6, -4), U.rand(2.5, 3.5), mixHex('#6a6f88', '#e8ebf2', light)); }
    }
    // kelebekler (ilkbahar/yaz gündüzü)
    if ((season === 'ilkbahar' || season === 'yaz') && light > 0.55 && !wet && !fx.snow) {
      for (const b of butterflies) {
        b.ph += dt;
        b.x += Math.sin(b.ph * 0.6) * dt * 9 + dt * 3;
        if (b.x > W + 3) b.x = -3;
        const y = Math.round(b.y + Math.sin(b.ph * 2.3) * 3);
        ctx.globalAlpha = 0.95;
        ctx.drawImage(SP.kelebek[b.c][Math.floor(b.ph * 8) % 2], Math.round(b.x), y);
      }
    }
    // kuş sürüsü (gündüz, açık havada arada bir)
    if (light > 0.6 && !wet) {
      nextBirds -= dt;
      if (!birds && nextBirds <= 0) { birds = { x: -12, y: U.rand(8, horizon * 0.45), vx: U.rand(13, 19) }; nextBirds = U.rand(70, 160); }
    }
    if (birds) {
      birds.x += birds.vx * dt;
      const f = Math.floor(time * 5) % 2;
      ctx.globalAlpha = 0.8;
      for (const [ox, oy] of [[0, 0], [-7, -3], [-7, 3]]) ctx.drawImage(SP.kus[(f + (ox ? 1 : 0)) % 2], Math.round(birds.x + ox), Math.round(birds.y + oy));
      if (birds.x > W + 12) birds = null;
    }
    // yılbaşı gecesi havai fişek
    if (ev.yilbasi && ev.yilbasi.fireworks && night > 0.5) {
      fireT -= dt;
      if (fireT <= 0) {
        fireT = U.rand(1.6, 3.5);
        const x = U.rand(W * 0.15, W * 0.85), y = U.rand(6, horizon * 0.5), c = U.pick(FW_COLS);
        for (let i = 0; i < 18; i++) { const a = (i / 18) * 6.28, v = U.rand(22, 34); emit('spark', x, y, Math.cos(a) * v, Math.sin(a) * v, U.rand(1, 1.6), c); }
      }
    }
    // 14 Şubat: yerden süzülen kalpler
    if (ev.sevgililer && Math.random() < dt * 0.4) emit('heart', U.rand(5, W - 5), groundY - 2, U.rand(-2, 2), U.rand(-10, -6), U.rand(3, 5));
    ctx.globalAlpha = 1;
  }

  // ---------- Konuşma balonu ----------
  function measureHud() {
    const el = wrap && wrap.querySelector('.hud-left');
    if (!el) { hudR = null; return; }
    const r = el.getBoundingClientRect(), w = wrap.getBoundingClientRect();
    hudR = r.width ? { right: r.right - w.left, bottom: r.bottom - w.top } : null;
  }
  function positionBubble() {
    if (!bubbleOn || !W) return;
    const actor = bubbleSpeaker === 'luna' ? null : friends.find(f=>f.kind===bubbleSpeaker && f.x >= 0 && f.x <= W);
    if (bubbleSpeaker !== 'luna' && !actor) { bubbleEl.classList.add('hidden'); bubbleOn = false; bubbleUntil = 0; return; }
    const g = actor ? fgeom(actor) : lunaGeom();
    const cx = (actor ? actor.x : L.x) * scale;
    let left = Math.round(U.clamp(cx - bubbleW / 2, 8, wrapW - bubbleW - 8));
    // sahnenin üstünden taşmasın (yatay tutulan telefonda sahne alçak)
    let bottom = Math.max(4, Math.min(Math.round((H - (g.top - 1)) * scale + 10), wrapH - bubbleH - 6));
    // saat ve tarih hep görünsün: balon saat kutusuna biniyorsa kutunun sağına (sığarsa) ya da altına geçer
    if (hudR && wrapH - bottom - bubbleH < hudR.bottom + 6 && left < hudR.right + 6) {
      if (hudR.right + 8 + bubbleW <= wrapW - 6) left = Math.round(hudR.right + 8);
      else bottom = Math.max(4, Math.min(bottom, Math.round(wrapH - hudR.bottom - 8 - bubbleH)));
    }
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
    drawDeco();
    drawFlies(dt);
    updateLilies(dt);
    drawLilies(false);
    seasonFx(dt);
    updateLuna(dt);
    updateYarn(dt);
    updateFriends(dt);
    drawStudyProps();
    drawFish();
    drawYarn();
    drawFriends();
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
    // ~30 fps yeterli; odakta sahne sakin, 20 fps; hareket azaltma tercihinde 12 fps (pil dostu)
    if (acc < (reducedMotion ? 0.083 : mode === 'focus' ? 0.05 : 0.028)) return;
    const step = Math.min(acc, 0.1);
    acc = 0;
    render(step);
  }

  const rmq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  let reducedMotion = !!(rmq && rmq.matches);
  if (rmq && rmq.addEventListener) rmq.addEventListener('change', (e) => { reducedMotion = e.matches; });

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
    // ziyaretçi kedilere dokunulursa zıplar
    for (const f of friends) {
      const g = fgeom(f);
      if (x >= g.left - 2 && x <= g.left + g.p.w + 2 && y >= g.top - 3 && y <= groundY + 3) {
        f.vy = -55;
        if (f.state === 'sleep' && f.steps[0]) f.steps[0].left = Math.min(f.steps[0].left, 1);
        hearts(f.x, g.top, 3);
        if (onFriend) onFriend(f.kind);
        return;
      }
    }
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
      onFriend = opts.onFriend || null;
      onFriendSeen = opts.onFriendSeen || null;
      onFriendArrival = opts.onFriendArrival || null;
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
    // ziyaretçi çağır: 'vesper' | 'kitten' | 'nap' | 'family' (odaklanırken yok sayılır)
    visit(kind) { return startVisit(kind); },
    isVesperTime() { return vesperTime(); },
    friendsHere() { return friends.filter((f) => f.x >= 0 && f.x <= W).map((f) => f.kind); },
    // bugünün mevsimi ve özel günleri (arayüz için)
    today() { return { season, events: events.slice() }; },
    // hemen bir ip oyunu başlat (odaklanırken yok sayılır)
    play() { if (mode !== 'focus') { nextPlay = 0; startPlay(); } },
    // Luna'nın küçük portresi (rapor başlığı vb.)
    sleepingCompanions(canvas, t = 0) {
      const g=canvas.getContext('2d'), bank=sprites();
      g.imageSmoothingEnabled=false;
      g.fillStyle='#302b46';g.fillRect(18,152,222,14);g.fillRect(26,142,206,32);
      // Two adults face inward; the kitten sleeps across their paws.
      [['vesper',33,137,3.5,0],['luna',112,143,3.5,1],['kitten',85,162,3,0]].forEach(([kind,x,y,scale,dir],i)=>{
        const p=bank[kind].sleep;
        const breath=reducedMotion?0:Math.round(Math.sin(t*1.35+i*.25));
        g.drawImage(p.c[dir],x,y-p.h*scale+breath,p.w*scale,p.h*scale);
      });
      g.fillStyle='#afa0d3';g.font='18px monospace';
      g.fillText('z',60,54);g.font='24px monospace';g.fillText('z',79,37);
      g.font='16px system-ui';g.fillStyle='#c3b4d4';g.textAlign='center';
      g.fillText('Luna · Vesper · Güçlü',130,190);g.textAlign='left';
    },
    companionPortraits(canvas, y = 155, height = 145, t = 0) {
      const g=canvas.getContext('2d'), bank=sprites();
      const kinds=['luna','vesper','kitten'], names=['Luna','Vesper','Güçlü'];
      kinds.forEach((kind,i)=>{
        const happy=Math.floor(t/5+i)%3===0;
        const p=bank[kind][happy?'face_happy':'face_neutral'];
        const size=kind==='kitten'?5:4;
        const x=100+i*200;
        const bob=reducedMotion?0:Math.round(Math.sin(t*2+i));
        g.imageSmoothingEnabled=false;
        g.drawImage(p.c[0],Math.round(x-p.w*size/2),y+height-p.h*size-20+bob,p.w*size,p.h*size);
        g.font='14px system-ui';g.textAlign='center';g.fillStyle='#d9c4e8';g.fillText(names[i],x,y+height-2);g.textAlign='left';
      });
    },
    portrait(canvas) {
      const p = sprites().luna.loafA;
      canvas.width = p.w; canvas.height = p.h;
      canvas.getContext('2d').drawImage(p.c[1], 0, 0);
    },
    say(text, opts) {
      opts = opts || {};
      if (!bubbleEl || !text) return false;
      const speaker = ['luna','vesper','kitten'].includes(opts.speaker) ? opts.speaker : 'luna';
      const actor = speaker === 'luna' ? L : friends.find(f=>f.kind===speaker && f.x >= 0 && f.x <= W);
      if (!actor) return false; // sahnede olmayan karakterin sesi Luna'nın üstünden çıkmasın
      bubbleSpeaker = speaker;
      const label = speaker === 'vesper' ? 'Vesper' : speaker === 'kitten' ? 'Güçlü' : 'Luna';
      bubbleEl.dataset.speaker = speaker;
      bubbleEl.setAttribute('aria-label', label + ': ' + text);
      const duration = opts.ms || Math.max(5000, text.length * 85);
      if (opts.emotion) express(actor,opts.emotion,duration);
      bubbleEl.innerHTML = '<span class="speaker-tag">' + label + '</span> ' + (opts.love ? '<span class="love-tag">💌</span> ' : '') + U.esc(text);
      bubbleEl.classList.toggle('love', !!opts.love);
      bubbleEl.classList.remove('hidden');
      bubbleEl.classList.remove('pop'); void bubbleEl.offsetWidth; bubbleEl.classList.add('pop');
      bubbleW = bubbleEl.offsetWidth;
      bubbleH = bubbleEl.offsetHeight;
      if (!wrapH) wrapH = wrap.clientHeight;
      measureHud();
      bubbleOn = true;
      bubbleL = bubbleB = bubbleA = -1;
      bubbleUntil = performance.now() + (opts.ms || Math.max(5000, text.length * 85));
      positionBubble();
      return true;
    },
    feed(onFed) {
      if (fishItem || !W) return null;
      const present = [L, ...friends.filter(f => f.x >= 14 && f.x <= W - 14 && f.steps[0]?.do !== 'leave')];
      const actor = present[feedTurn % present.length];
      feedTurn++;
      const kind = actor === L ? 'luna' : actor.kind;
      if (play) endPlay(true);
      fishItem = { actor, kind, onFed, x: U.clamp(actor.x + actor.dir * 16, 36, Math.max(36, W - 42)), y: 0, vy: 0 };
      actor.emote = null;
      actor.state = 'walk';
      L.nap = false;
      L.awake = 10;
      if (actor !== L) { L.state = 'sit'; L.target = L.x; }
      return kind;
    },
    celebrate() { sparkles(L.x, groundY - 16, 30); hearts(L.x, groundY - 20, 6); L.vy = -80; },
    sunInfo() { return solar(new Date()); }, // her seferinde güncel konumla (şehir değişince eski saat kalmasın)
    // ayın evresi ve şu an gökyüzünde olup olmadığı (hava penceresi için)
    moonInfo(date = new Date()) {
      const il = moonIllum(date), m = moonSky(date);
      const row = MOON_NAMES.find((x) => il.phase < x[0]) || MOON_NAMES[0];
      return { phase: il.phase, fraction: il.fraction, emoji: row[1], name: row[2], up: m.alt > 0, alt: m.alt, az: m.az, ...moonTimes(date) };
    },
  };
})();
