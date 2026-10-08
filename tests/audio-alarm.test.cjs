const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const src = fs.readFileSync(path.join(__dirname, '../js/audio.js'), 'utf8');
const flush = () => new Promise(r => setImmediate(r));
function setup({ missing = false, blocked = false, denied = false, noVibration = false, gate = null, fetchFails = 0, decodeFails = 0 } = {}) {
  const notes = [], patterns = [], requests = [];
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ connect() { return this; }, disconnect() {} });
  class AudioContext {
    constructor() { this.state = blocked ? 'suspended' : 'running'; this.currentTime = 0; this.destination = node(); }
    resume() { return blocked ? Promise.reject(new Error('blocked')) : Promise.resolve(); }
    createOscillator() { throw new Error('A real meow must not use an oscillator'); }
    decodeAudioData(bytes, ok, fail) {
      if (decodeFails-- > 0) { fail(new Error('decode failed')); return; }
      ok({ duration: 10, file: new TextDecoder().decode(bytes) });
    }
    createBufferSource() { const o = { ...node(), playbackRate: { value: 1 }, start(at, offset, duration) { Object.assign(this, { at, offset, duration }); notes.push(this); }, stop() { this.cancelled = true; } }; return o; }
    createGain() { return { ...node(), gain: param() }; }
  }
  const Store = { data: { settings: { sound: true, timerVibrate: true, timerMeow: 'luna', timerVibration: 'double' } } };
  const navigator = noVibration ? {} : { vibrate(p) { patterns.push(p); if (denied) throw new Error('denied'); return true; } };
  const fetch = async url => { requests.push(url); if (gate) await gate; return { ok: fetchFails-- <= 0, arrayBuffer: async () => new TextEncoder().encode(url).buffer }; };
  const Sound = new Function('Store', 'window', 'navigator', 'fetch', 'SURUMLER', src + ';return Sound;')(Store, missing ? {} : { AudioContext }, navigator, fetch, [{surum:'2.4.2'}]);
  return { Sound, Store, notes, patterns, requests };
}
(async () => {
  const x = setup();
  assert.equal(x.Sound.meows.length, 5); assert.equal(x.Sound.vibrations.length, 5);
  assert.equal(await x.Sound.unlock(), true); assert.equal(new Set(x.requests).size, 3);
  const voices = new Set(), rhythms = new Set();
  for (const voice of x.Sound.meows) {
    x.Store.data.settings.timerMeow = voice.id;
    assert.equal((await x.Sound.timerEnd()).sound, true);
    const active = x.notes.filter(n => !n.cancelled);
    voices.add(JSON.stringify([active[0].buffer.file, active[0].offset, active[0].duration]));
    for (const n of active) {
      assert.ok(n.at + n.duration < 6, 'alarm is bounded');
      assert.equal(n.playbackRate.value, 1, 'keep natural pitch and speed');
      assert.equal(n.offset, voice.offset); assert.equal(n.duration, voice.duration);
      assert.ok(n.buffer.file.includes(voice.file));
    }
    x.Sound.stopTimerAlarm(); assert.ok(x.notes.every(n => n.cancelled));
  }
  assert.equal(voices.size, 5); assert.equal(x.requests.length, 3, 'reuse decoded originals');
  assert.ok(x.requests.every(url => url.endsWith('?v=2.4.2')));
  for (const rhythm of x.Sound.vibrations) {
    x.Store.data.settings.timerVibration = rhythm.id; assert.ok((await x.Sound.timerEnd()).vibration);
    const pattern = x.patterns.at(-1); rhythms.add(JSON.stringify(pattern)); assert.ok(pattern.reduce((a, b) => a + b, 0) < 5000);
  }
  assert.equal(rhythms.size, 5);
  x.Store.data.settings.sound = false; const n = x.notes.length;
  assert.equal((await x.Sound.timerEnd()).sound, false); assert.equal(x.notes.length, n);
  x.Store.data.settings.timerVibrate = false; x.patterns.length = 0;
  assert.equal((await x.Sound.timerEnd()).vibration, false); assert.ok(x.patterns.every(p => p === 0));
  x.Store.data.settings.sound = true; x.Store.data.settings.timerMeow = '<invalid>';
  assert.equal((await x.Sound.timerEnd()).sound, true);
  const unsupported = setup({ missing: true, noVibration: true });
  assert.equal(await unsupported.Sound.unlock(), false);
  assert.deepEqual(await unsupported.Sound.timerEnd(), { sound: false, vibration: false, vibrationSupported: false, cancelled:false });
  const blocked = setup({ blocked: true, denied: true });
  assert.equal(await blocked.Sound.unlock(), false); assert.equal((await blocked.Sound.timerEnd()).sound, false);
  assert.equal((await blocked.Sound.timerEnd()).vibration, false);
  for (const fault of ['fetchFails', 'decodeFails']) {
    const bad = setup({ [fault]: 1 }); const result = await bad.Sound.timerEnd();
    assert.equal(result.sound, false); assert.equal(result.vibration, true);
    assert.equal((await bad.Sound.timerEnd()).sound, true, 'failed recordings may retry');
  }
  let release; const slow = setup({ gate: new Promise(r => release = r) });
  const pending = slow.Sound.timerEnd(); await flush(); slow.Sound.stopTimerAlarm(); release();
  assert.equal((await pending).cancelled, true); assert.equal(slow.notes.length, 0);
  let release2; const slow2 = setup({gate:new Promise(r => release2 = r)});
  const old = slow2.Sound.timerEnd(); await flush(); slow2.Store.data.settings.timerMeow = 'guclu';
  const latest = slow2.Sound.timerEnd(); await flush(); release2();
  assert.equal((await old).cancelled,true); assert.equal((await latest).sound,true);
  assert.ok(slow2.notes.every(n => n.buffer.file.includes('kitten.mp3')), 'latest selection wins load races');
  const feed = setup({fetchFails:1}); await assert.doesNotReject(feed.Sound.meow());
  await flush();
  console.log('Real recorded meows: five excerpts, natural speed, preload, retries, cancellation, five vibrations and unsupported devices passed');
})().catch(e => { console.error(e); process.exitCode = 1; });
