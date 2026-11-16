const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const src = fs.readFileSync(path.join(__dirname, '../js/timer.js'), 'utf8');
let now = Date.UTC(2026, 9, 8, 9), tick, done = [];
class Clock extends Date { static now() { return now; } }
const Store = { save() {}, data: { settings: { focus: 35, short: 5, long: 15 }, subjects: [{ id: 'math' }], stats: {}, timer: null } };
const U = { clamp: (v, a, b) => Math.max(a, Math.min(b, v)) };
const load = () => new Function('Store', 'U', 'Date', 'setInterval', src + ';return Timer;')(Store, U, Clock, f => { tick = f; });
const handlers = { onFocusDone: s => done.push(s) };
let timer = load(); timer.init(handlers);
for (const [exam, minutes] of [['tyt', 165], ['ayt', 180]]) {
  timer.setKind('countdown', exam);
  assert.equal(timer.state().remaining, minutes * 60);
  timer.toggle(); now += 60000;
  const running = JSON.stringify(Store.data.timer);
  timer.setKind('free', exam); assert.equal(JSON.stringify(Store.data.timer), running, 'invalid selection cannot reset a running session');
  assert.equal(timer.setCountdownMinutes(25), false);
  Store.data.settings.focus = 1;
  timer = load(); timer.init(handlers);
  assert.equal(timer.state().total, minutes * 60, 'reload/settings cannot change exam length');
  timer.toggle(); const paused = timer.state().remaining;
  now += 300000; tick(); assert.equal(timer.state().remaining, paused);
  timer.toggle(); now += paused * 1000;
  const count = done.length; tick(); tick();
  assert.equal(done.length, count + 1); assert.equal(done.at(-1).endReason, 'elapsed');
  assert.equal(done.at(-1).minutes, minutes); assert.equal(done.at(-1).exam, exam);
  assert.equal(timer.state().exam, exam); assert.equal(timer.state().running, false);
  timer = load(); timer.init(handlers); tick(); assert.equal(done.length, count + 1, 'finished session cannot alert again after reload');
}
timer.setKind('countdown', 'tyt'); timer.toggle(); now += 120000; timer.finish();
assert.equal(done.at(-1).endReason, 'manual'); assert.equal(done.at(-1).minutes, 2);
assert.equal(timer.state().exam, 'tyt'); timer.reset(); assert.equal(timer.state().total, 9900);
timer.setKind('free'); timer.toggle(); now += 3661000; timer.finish();
assert.equal(done.at(-1).kind, 'free'); assert.equal(done.at(-1).endReason, 'manual'); assert.equal(done.at(-1).exam, null);
for (const action of ['toggle', 'finish']) {
  timer.setKind('countdown', 'ayt'); timer.toggle(); const start = now;
  now += 180 * 60000 + 5000; timer[action]();
  assert.equal(done.at(-1).endReason, 'elapsed'); assert.equal(done.at(-1).minutes, 180);
  assert.equal(done.at(-1).end, start + 180 * 60000, 'late interaction records exact finish without overtime');
  assert.equal(timer.state().running, false);
}
timer.setKind('countdown'); assert.equal(timer.state().exam, null); assert.ok(timer.setCountdownMinutes(47));
assert.equal(timer.state().total, 2820); timer.toggle(); now += 2820000; tick(); assert.equal(done.at(-1).endReason, 'elapsed');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
assert.equal(/data-duration="(?:25|35|60)"/.test(html), false);
assert.ok(html.includes('data-exam="tyt"') && html.includes('data-exam="ayt"'));
console.log('TYT/AYT: durations, reload, pause, single completion, manual stop, late clicks and custom/free modes passed');
