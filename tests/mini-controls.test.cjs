// Mini pencereden durdur / başlat: Android Chrome (Media Session), iPhone Safari (pencerenin kendi tuşu) ve bilgisayar (düğme).
// Pencere kapanırken video dursa bile sayaç durmamalı.
const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../js/mini-timer.js'), 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };

function world(ua, noFrames = false) {
  const timer = { running: true, fresh: false }, ticks = [];
  const pipWin = { l: {}, addEventListener(k, f) { this.l[k] = f; } };
  let toggles = 0;
  const listeners = {};
  const doc = { hidden: true, pictureInPictureEnabled: true, pictureInPictureElement: null, body: { appendChild(el) { if (el.requestPictureInPicture) video = el; } },
    exitPictureInPicture: async () => { doc.pictureInPictureElement = null; },
    querySelector: (s) => (s === '#mini-timer-open' ? button : null), addEventListener: (k, f) => { listeners[k] = f; } };
  const button = { l: {}, addEventListener(k, f) { this.l[k] = f; } };
  const ms = { h: {}, playbackState: 'none', setActionHandler(a, f) { this.h[a] = f; } };
  function makeVideo() {
    const ev = {};
    const v = { paused: true, readyState: 1, muted: false, style: {}, setAttribute() {}, remove() {},
      addEventListener(k, f) { (ev[k] = ev[k] || []).push(f); },
      fire(k) { (ev[k] || []).forEach((f) => f()); },
      play() { if (this.paused) { this.paused = false; this.fire('play'); } return Promise.resolve(); },
      pause() { if (!this.paused) { this.paused = true; this.fire('pause'); } },
      requestVideoFrameCallback(cb) { if (!noFrames) setTimeout(cb, 5); }, // gizli sayfada kare bildirimi gelmez
      requestPictureInPicture() { doc.pictureInPictureElement = v; return Promise.resolve(pipWin); } };
    return v;
  }
  let video = null;
  const ctx2d = new Proxy({}, { get: (o, k) => o[k] || (() => {}), set: (o, k, v) => { o[k] = v; return true; } });
  doc.createElement = (t) => (t === 'video' ? makeVideo() : { width: 0, height: 0, getContext: () => ctx2d, captureStream: () => ({ getVideoTracks: () => [{}], getTracks: () => [] }) });
  const ctx = { Date, Promise, URL, Blob: function () {}, Worker: undefined, Image: undefined,
    navigator: { userAgent: ua, platform: 'Linux', maxTouchPoints: 0, standalone: false, mediaSession: ms },
    matchMedia: () => ({ matches: false }), HTMLCanvasElement: { prototype: { captureStream() {} } },
    window: { addEventListener() {} }, document: doc,
    Store: { data: { timer: {}, settings: { miniUsed: true } }, save() {} },
    Timer: { state: () => ({ phase: 'focus', running: timer.running, fresh: timer.fresh, elapsed: 600, countdown: true, remaining: 900, progress: 0.4 }) },
    U: { hm: () => '20:30', fmtClock: () => '15:00' }, LunaNotify: { timerSnapshot() {} },
    setTimeout, clearTimeout, setInterval: (f) => { ticks.push(f); return ticks.length; }, clearInterval() {} };
  ctx.window.document = doc;
  vm.createContext(ctx); vm.runInContext(source, ctx);
  const api = ctx.window.MiniTimer;
  api.init({ toast() {}, miniToggle() { toggles++; timer.running = !timer.running; timer.fresh = false; } });
  return { api, doc, ms, timer, pipWin, tick: () => ticks.forEach((f) => f()), get video() { return video; }, get toggles() { return toggles; }, button };
}

const CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36';
const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

(async () => {
  // ---- Android Chrome: pencerenin ⏯ tuşu Media Session'a gelir; her basış sayacı çevirir ----
  {
    const w = world(CHROME);
    w.button.l.pointerdown(); w.button.l.click(); await wait(20);
    ok(w.api.isOpen(), 'Chrome: mini pencere açıldı');
    ok(typeof w.ms.h.play === 'function' && typeof w.ms.h.pause === 'function', 'Chrome: ⏯ tuşu için iki işleyici de bağlı');
    await wait(400);
    ok(w.ms.playbackState === 'playing' && !w.video.paused, 'Chrome: sayaç çalışırken pencere ⏸ gösterir, görüntü akar');
    w.ms.h.pause(); await wait(30);
    ok(w.toggles === 1 && !w.timer.running && w.ms.playbackState === 'paused', 'Chrome: ⏸ sayacı durdurur');
    w.tick(); await wait(500);
    ok(!w.video.paused, 'Chrome: pencere açılalı 2 sn olmadan görüntü hiç bekletilmez (tablette kararmasın)');
    await wait(1400); w.tick(); await wait(900);
    ok(w.video.paused, 'Chrome: pencere görüntüyü aldıktan sonra video bekletilir, tuş ▶ gösterir');
    w.tick(); await wait(1100);
    ok(w.video.paused, 'Chrome: beklerken saniyelik denetim görüntüyü oynatıp durdurmaz (simge titremez)');
    w.pipWin.l.resize(); await wait(30);
    ok(!w.video.paused, 'Chrome: pencerenin boyutu değişince (tablet döndü) yeni kare gider');
    await wait(900);
    ok(w.video.paused && !w.timer.running, 'Chrome: sonra yeniden bekler, sayaç değişmez');
    w.ms.h.play(); await wait(30);
    ok(w.toggles === 2 && w.timer.running && !w.video.paused && w.ms.playbackState === 'playing', 'Chrome: ▶ sayacı devam ettirir, görüntü akar');
    await wait(700); w.ms.h.pause(); await wait(30);
    ok(w.toggles === 3 && !w.timer.running, 'Chrome: yeniden ⏸');
    await wait(400);
    ok(w.video.paused, 'Chrome: ⏸ sonrası ▶ simgesi 0,4 sn içinde gelir (bekletmeden)');
    await wait(700); w.ms.h.pause(); await wait(30);
    ok(w.toggles === 4 && w.timer.running && !w.video.paused, 'Chrome: tarayıcı yine "pause" yollasa da basış sayacı çevirir');
    await wait(700); w.ms.h.play(); w.ms.h.pause(); await wait(30);
    ok(w.toggles === 5 && !w.timer.running, 'Chrome: hemen art arda gelen iki tuş bir kez sayılır');
    await wait(900);
    // pencere kapanırken Chrome videoyu durdurur: sayaç değişmemeli
    w.video.pause(); w.doc.pictureInPictureElement = null; w.video.fire('leavepictureinpicture'); await wait(1000);
    ok(!w.timer.running && w.toggles === 5, 'Chrome: pencereyi kapatmak sayacı değiştirmez');
    ok(w.ms.h.play === null && w.ms.h.pause === null && w.ms.playbackState === 'none', 'Chrome: kapanınca tuşlar bırakılır');
  }
  // ---- Chrome: çalışan sayaç pencere kapanırken durmaz ----
  {
    const w = world(CHROME);
    w.button.l.pointerdown(); w.button.l.click(); await wait(3400); w.tick(); await wait(50);
    ok(w.timer.running && !w.video.paused, 'Chrome: sayaç çalışırken görüntü hep akar');
    w.video.pause(); w.doc.pictureInPictureElement = null; w.video.fire('leavepictureinpicture'); await wait(1000);
    ok(w.timer.running && w.toggles === 0, 'Chrome: pencereyi kapatmak çalışan sayacı durdurmaz');
  }
  // ---- Chrome: sayaç başka yoldan durursa (süre doldu / Luna'dan basıldı) pencere de uyar ----
  {
    const w = world(CHROME);
    w.button.l.pointerdown(); w.button.l.click(); await wait(3400);
    w.timer.running = false;
    w.tick(); await wait(900);
    ok(w.ms.playbackState === 'paused' && w.video.paused, 'Chrome: sayaç başka yoldan durunca pencere ▶ gösterir');
    w.ms.h.play(); await wait(30);
    ok(w.timer.running && w.toggles === 1 && !w.video.paused, 'Chrome: durmuş sayaç ▶ ile başlar');
    w.api.close();
  }
  // ---- Hazır (başlamamış) sayaç: pencere ilk saniyelerde akar, kararmaz; sonra ▶ gösterir; ▶ ile başlar ----
  {
    const w = world(CHROME);
    w.timer.running = false; w.timer.fresh = true;
    w.button.l.pointerdown(); w.button.l.click(); await wait(1200); w.tick(); await wait(50);
    ok(w.ms.playbackState === 'paused' && !w.video.paused, 'Hazır: açılır açılmaz bekletilmez (tablette kararmasın)');
    await wait(1000); w.tick(); await wait(900);
    ok(w.video.paused, 'Hazır: pencere görüntüyü aldıktan sonra ▶ gösterir');
    w.ms.h.play(); await wait(30);
    ok(w.timer.running && w.toggles === 1 && !w.video.paused, 'Hazır: ▶ sayacı başlatır');
    w.api.close();
  }
  // ---- Luna arkadayken tarayıcı kareleri saymaz: 5 sn sonra yine ▶ gösterir ----
  {
    const w = world(CHROME, true);
    w.timer.running = false; w.timer.fresh = true;
    w.button.l.pointerdown(); w.button.l.click(); await wait(10);
    await wait(2500); w.tick(); await wait(300);
    ok(!w.video.paused, 'Arkada: kareler sayılamazken 3,5 sn dolmadan bekletilmez');
    await wait(900); w.tick(); await wait(1800);
    ok(w.video.paused && w.ms.playbackState === 'paused', 'Arkada: 3,5 sn sonra pencere ▶ gösterir');
    w.video.play(); await wait(30); // Chrome ▶'ı Media Session'a sormadan kendisi oynattı
    ok(w.timer.running && w.toggles === 1 && !w.video.paused, 'Arkada: Chrome ▶ ile videoyu kendisi oynatsa da sayaç başlar');
    w.ms.h.play && w.ms.h.play(); await wait(30);
    ok(w.timer.running && w.toggles === 1, 'Arkada: aynı ▶ Media Session\'dan da gelirse ikinci kez sayılmaz');
    w.api.close();
  }
  // ---- iPhone/iPad Safari: pencerenin tuşu videonun kendisini durdurur ----
  {
    const w = world(SAFARI);
    w.button.l.pointerdown(); w.button.l.click(); await wait(400);
    ok(w.api.isOpen() && w.timer.running && !w.video.paused, 'Safari: açık, sayaç çalışıyor');
    w.video.pause(); // kullanıcı ⏸
    await wait(300);
    ok(w.timer.running, 'Safari: kapanma mı dokunuş mu anlaşılana kadar sayaç sürer');
    await wait(700);
    ok(!w.timer.running && w.toggles === 1 && !w.video.paused, 'Safari: ⏸ sayacı durdurur, görüntü yeniden akar');
    await wait(700);
    w.video.pause(); await wait(1000); // yine pencerenin tuşu
    ok(w.timer.running && w.toggles === 2 && !w.video.paused, 'Safari: ikinci basış sayacı devam ettirir');
    // ⏸ ve hemen ▶: vazgeçti, sayaç değişmez
    await wait(700);
    w.video.pause(); await wait(200); w.video.play(); await wait(900);
    ok(w.timer.running && w.toggles === 2, 'Safari: ⏸ ardından hemen ▶ (vazgeçme) sayacı değiştirmez');
    // Media Session tuşu da aynı anda gelirse bir kez sayılır
    await wait(700);
    w.ms.h.pause && w.ms.h.pause(); w.video.pause(); await wait(1000);
    ok(w.toggles === 3 && !w.timer.running, 'Safari: aynı ⏸ iki yoldan gelse de bir kez sayılır');
    // kapanış: video durur ve pencere hemen kaybolur → sayaç değişmez
    await wait(700);
    w.video.pause(); setTimeout(() => { w.doc.pictureInPictureElement = null; w.video.fire('leavepictureinpicture'); }, 150);
    await wait(1100);
    ok(!w.timer.running && w.toggles === 3, 'Safari: pencereyi kapatmak sayacı değiştirmez');
  }
  // ---- Bilgisayar (Document PiP): pencerenin içinde gerçek düğme ----
  {
    const timer = { running: false, fresh: true };
    let toggles = 0, btn = null;
    const ctx2d = new Proxy({}, { get: (o, k) => o[k] || (() => {}), set: (o, k, v) => { o[k] = v; return true; } });
    const canvas = { setAttribute() {}, getContext: () => ctx2d, getBoundingClientRect: () => ({ left: 0, top: 0, width: 320, height: 120 }) };
    const child = { closed: false, focus() {}, close() { this.closed = true; }, addEventListener() {},
      document: { head: { append() {} }, body: { style: {}, append() {} }, createElement: (t) => (t === 'canvas' ? canvas : (btn = { l: {}, style: {}, title: '', innerHTML: '', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(k, f) { this.l[k] = f; } })) } };
    const button = { l: {}, addEventListener(k, f) { this.l[k] = f; } };
    const ctx = { Date, Promise, navigator: { userAgent: CHROME.replace('Android 14; Pixel 8', 'X11; Linux x86_64').replace(' Mobile', '') },
      window: { addEventListener() {}, documentPictureInPicture: { requestWindow: async () => child } },
      document: { hidden: false, querySelector: (s) => (s === '#mini-timer-open' ? button : null), addEventListener() {} },
      Store: { data: { timer: {}, settings: {} }, save() {} },
      Timer: { state: () => ({ phase: 'focus', running: timer.running, fresh: timer.fresh, elapsed: 0, countdown: true, remaining: 1500, progress: 0 }) },
      U: { hm: () => '20:30', fmtClock: () => '25:00' }, LunaNotify: { timerSnapshot() {} }, setTimeout, clearTimeout, setInterval: () => 1, clearInterval() {} };
    vm.createContext(ctx); vm.runInContext(source, ctx);
    ctx.window.MiniTimer.init({ toast() {}, miniToggle() { toggles++; timer.running = !timer.running; timer.fresh = false; } });
    await button.l.click(); await wait(10);
    ok(btn && typeof btn.l.click === 'function', 'Bilgisayar: pencerede düğme var');
    ok(btn.title === 'Başlat' && /path/.test(btn.innerHTML), 'Bilgisayar: hazır sayaçta ▶ Başlat');
    ok(parseInt(btn.style.width, 10) >= 30 && parseInt(btn.style.left, 10) > 240, 'Bilgisayar: düğme büyük saatin sağında, dokunulacak boyda');
    btn.l.click(); await wait(10);
    ok(toggles === 1 && timer.running && btn.title === 'Duraklat' && /rect/.test(btn.innerHTML), 'Bilgisayar: basınca başlar, ⏸ Duraklat olur');
    btn.l.click(); await wait(10);
    ok(toggles === 1, 'Bilgisayar: çift tıklama iki kez saymaz');
    await wait(700); btn.l.click(); await wait(10);
    ok(toggles === 2 && !timer.running && btn.title === 'Devam et', 'Bilgisayar: yeniden basınca durur, ▶ Devam et olur');
    ctx.window.MiniTimer.close();
  }
  console.log(`Mini pencere durdur/başlat: ${checks} kontrol geçti`);
})().catch((e) => { console.error(e); process.exitCode = 1; });
