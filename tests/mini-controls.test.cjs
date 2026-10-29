// Mini pencereden durdur / başlat: Android Chrome (Media Session), iPhone Safari (pencerenin kendi tuşu) ve bilgisayar (düğme).
// Pencere kapanırken video dursa bile sayaç durmamalı.
const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../js/mini-timer.js'), 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };

function world(ua) {
  const timer = { running: true, fresh: false }, ticks = [];
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
      requestVideoFrameCallback(cb) { setTimeout(cb, 5); },
      requestPictureInPicture() { doc.pictureInPictureElement = v; return Promise.resolve(); } };
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
  return { api, doc, ms, timer, tick: () => ticks.forEach((f) => f()), get video() { return video; }, get toggles() { return toggles; }, button };
}

const CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36';
const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

(async () => {
  // ---- Android Chrome: pencerenin ⏯ tuşu Media Session'a gelir ----
  {
    const w = world(CHROME);
    w.button.l.pointerdown(); w.button.l.click(); await wait(20);
    ok(w.api.isOpen(), 'Chrome: mini pencere açıldı');
    ok(typeof w.ms.h.play === 'function' && typeof w.ms.h.pause === 'function', 'Chrome: ⏯ tuşu için iki işleyici de bağlı');
    await wait(400);
    ok(w.ms.playbackState === 'playing' && !w.video.paused, 'Chrome: sayaç çalışırken pencere ⏸ gösterir, görüntü akar');
    w.ms.h.pause(); await wait(60);
    ok(w.toggles === 1 && !w.timer.running, 'Chrome: ⏸ sayacı durdurur');
    ok(w.ms.playbackState === 'paused', 'Chrome: pencere ▶ gösterir');
    ok(!w.video.paused, 'Chrome: "Duraklatıldı" karesi gidene kadar görüntü akar');
    await wait(800);
    ok(w.video.paused, 'Chrome: son kare gittikten sonra video bekletilir (simge sayaçla aynı)');
    w.ms.h.pause(); await wait(30);
    ok(w.toggles === 1, 'Chrome: durmuş sayaçta ⏸ ikinci kez bir şey yapmaz');
    w.ms.h.play(); await wait(30);
    ok(w.toggles === 2 && w.timer.running && !w.video.paused && w.ms.playbackState === 'playing', 'Chrome: ▶ sayacı devam ettirir, görüntü akar');
    // pencere kapanırken Chrome videoyu durdurur: sayaç durmamalı
    await wait(1600);
    w.video.pause(); w.doc.pictureInPictureElement = null; w.video.fire('leavepictureinpicture'); await wait(1000);
    ok(w.timer.running && w.toggles === 2, 'Chrome: pencereyi kapatmak sayacı durdurmaz');
    ok(w.ms.h.play === null && w.ms.h.pause === null && w.ms.playbackState === 'none', 'Chrome: kapanınca tuşlar bırakılır');
  }
  // ---- Chrome: sayaç bitmeden önce pencereden bağımsız durursa (süre doldu / Luna'dan basıldı) pencere uyar ----
  {
    const w = world(CHROME);
    w.button.l.pointerdown(); w.button.l.click(); await wait(400);
    w.timer.running = false; // başka yoldan durdu (süre doldu ya da Luna'dan basıldı)
    w.tick(); await wait(800);
    ok(w.ms.playbackState === 'paused' && w.video.paused, 'Chrome: sayaç başka yoldan durunca pencere de ▶ gösterir');
    w.ms.h.play(); await wait(30);
    ok(w.timer.running && w.toggles === 1, 'Chrome: durmuş sayaç ▶ ile başlar');
  }
  // ---- Hazır (başlamamış) sayaç: pencereden ▶ ile başlar ----
  {
    const w = world(CHROME);
    w.timer.running = false; w.timer.fresh = true;
    w.button.l.pointerdown(); w.button.l.click(); await wait(1200);
    ok(w.ms.playbackState === 'paused' && w.video.paused, 'Hazır: pencere ▶ gösterir');
    w.ms.h.play(); await wait(30);
    ok(w.timer.running && w.toggles === 1 && !w.video.paused, 'Hazır: ▶ sayacı başlatır');
  }
  // ---- iPhone Safari: pencerenin tuşu videonun kendisini durdurur ----
  {
    const w = world(SAFARI);
    w.button.l.pointerdown(); w.button.l.click(); await wait(400);
    ok(w.api.isOpen() && w.timer.running && !w.video.paused, 'Safari: açık, sayaç çalışıyor');
    w.video.pause(); // kullanıcı ⏸
    await wait(300);
    ok(w.timer.running, 'Safari: kapanma mı dokunuş mu anlaşılana kadar sayaç sürer');
    await wait(700);
    ok(!w.timer.running && w.toggles === 1, 'Safari: ⏸ sayacı durdurur');
    await wait(800);
    ok(w.video.paused, 'Safari: video bekletilir, pencere ▶ gösterir');
    await wait(1600);
    w.video.play(); // kullanıcı ▶
    await wait(20);
    ok(w.timer.running && w.toggles === 2 && !w.video.paused, 'Safari: ▶ sayacı devam ettirir');
    // Media Session tuşu da gelirse ikinci kez saymaz
    w.ms.h.play && w.ms.h.play(); await wait(20);
    ok(w.toggles === 2, 'Safari: aynı ▶ iki yoldan gelse de bir kez sayılır');
    // kapanış: video durur ve pencere hemen kaybolur → sayaç durmaz
    await wait(1600);
    w.video.pause(); setTimeout(() => { w.doc.pictureInPictureElement = null; w.video.fire('leavepictureinpicture'); }, 150);
    await wait(1100);
    ok(w.timer.running && w.toggles === 2, 'Safari: pencereyi kapatmak sayacı durdurmaz');
  }
  // ---- Safari: pencere ▶'a döndükten hemen sonra basılan ▶ kaybolmaz ----
  {
    const w = world(SAFARI);
    w.timer.running = false; w.timer.fresh = true;
    w.button.l.pointerdown(); w.button.l.click();
    for (let i = 0; i < 40 && !w.video.paused; i++) await wait(50); // pencere ▶ gösterene kadar
    ok(w.video.paused && !w.timer.running, 'Safari: hazır sayaçta pencere ▶ gösterir');
    await wait(100);
    w.video.play(); await wait(20); // hemen basıldı
    ok(w.timer.running && w.toggles === 1, 'Safari: hemen basılan ▶ de sayacı başlatır');
    w.tick(); await wait(50);
    ok(!w.video.paused && w.timer.running, 'Safari: görüntü akmaya devam eder');
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
    await wait(450); btn.l.click(); await wait(10);
    ok(toggles === 2 && !timer.running && btn.title === 'Devam et', 'Bilgisayar: yeniden basınca durur, ▶ Devam et olur');
  }
  console.log(`Mini pencere durdur/başlat: ${checks} kontrol geçti`);
})().catch((e) => { console.error(e); process.exitCode = 1; });
