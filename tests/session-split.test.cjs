// Run: node tests/session-split.test.cjs
// Gece duraklatılıp sabah sürdürülen oturum: dünkü kısım düne, bugünkü kısım bugüne yazılır; kalan süre korunur.
// Sıfırlanan oturumun hedefi (plan maddesi) bir sonraki alakasız oturuma taşınmaz.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const src = fs.readFileSync(path.join(__dirname, '../js/timer.js'), 'utf8');
let now = new Date(2026, 9, 20, 22, 0).getTime(), tick;
class Clock extends Date { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } }
const Store = { save() {}, data: { settings: { focus: 60, short: 5, long: 15, longEvery: 4 }, stats: {}, subjects: [{ id: 'math' }], sessions: [], timer: null } };
const U = { clamp: (v, a, b) => Math.min(b, Math.max(a, v)) };
const done = [], started = [];
const timer = new Function('Store', 'U', 'Date', 'setInterval', 'document', src + ';return Timer;')(Store, U, Clock, (f) => { tick = f; }, { hidden: false });
timer.init({ onFocusDone: (s) => done.push(s), onStart: (phase, resumed) => started.push(resumed) });
// 60 dk geri sayım: 22:00–22:30 çalış, duraklat
timer.setSubject('math'); timer.setIntent('Türev testi'); timer.toggle();
now += 30 * 60e3; timer.toggle();
// ertesi sabah 09:00 devam
now = new Date(2026, 9, 21, 9, 0).getTime(); timer.toggle();
assert.equal(done.length, 1, 'the evening part is saved when resuming on another day');
assert.equal(done[0].endReason, 'split'); assert.equal(done[0].minutes, 30);
assert.equal(new Date(done[0].start).getDate(), 20); assert.equal(new Date(done[0].end).getHours(), 22);
const s = timer.state();
assert.equal(s.running, true); assert.equal(s.subjectId, 'math'); assert.equal(s.intent, 'Türev testi', 'the same goal continues');
assert.equal(s.total, 30 * 60, 'only the remaining 30 minutes are left on the countdown');
now += 30 * 60e3; tick();
assert.equal(done.length, 2); assert.equal(done[1].minutes, 30); assert.equal(new Date(done[1].start).getDate(), 21, 'the morning part counts today');
// aynı gün içinde duraklatıp sürdürmek bölmez
timer.toggle(); now += 10 * 60e3; timer.toggle(); now += 5 * 60e3; timer.toggle();
assert.equal(done.length, 2, 'a same-day pause does not split');
timer.finish();
// sıfırlanan oturumun hedefi taşınmaz
timer.setIntent('Paragraf 20 soru'); timer.toggle(); now += 60e3; timer.reset();
assert.equal(timer.state().intent, '', 'reset clears the goal');
timer.setIntent('Kimya'); timer.setKind('free');
assert.equal(timer.state().intent, '', 'switching timer type clears the goal');
console.log('Overnight pause splits by day with the remaining time kept; reset and type switch drop the old goal');
