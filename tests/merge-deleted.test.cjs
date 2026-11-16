// Run: node tests/merge-deleted.test.cjs
// Yedek birleştirme: silinen kayıt eski yedekten geri gelmez, başka cihazda silinen burada da kalkar, yeni düzenleme kazanır;
// dışarıdan gelen yedeğin sayı ve tür alanları sayfaya kod sızdıramaz.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const T = Date.UTC(2026, 9, 20, 9);
function makeCtx(seed) {
  const store = { 'luna-study-v1': JSON.stringify(seed) };
  const ls = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  const ctx = vm.createContext({ localStorage: ls, console, Date, Math, JSON });
  vm.runInContext(read('js/storage.js'), ctx, { filename: 'js/storage.js' });
  const run = (code) => vm.runInContext(code, ctx);
  return { run, get: (expr) => JSON.parse(run(`JSON.stringify(${expr})`)) };
}
const seed = {
  version: 1, settings: { name: 'Hazal' },
  sessions: [{ id: 'a', start: T, end: T + 3600e3, minutes: 480, subjectId: 's1' }, { id: 'b', start: T + 7200e3, end: T + 9000e3, minutes: 30, subjectId: 's2' }],
  notes: [{ id: 'n1', title: 'Türev', body: '', created: T, updated: T }],
  denemeler: [{ id: 'd1', date: '2026-10-19', type: 'TYT', scores: { tr: { d: 30, y: 5 } } }],
};
const { run, get } = makeCtx(seed);
const before = get('Store.data');
// burada silinenler
run(`Store.data.sessions = Store.data.sessions.filter((x) => x.id !== 'b'); Store.forget('b');
     Store.data.notes = []; Store.forget('n1'); Store.data.denemeler = []; Store.forget('d1'); Store.save();`);
assert.equal(run('Store.mergeJSON(' + JSON.stringify(before) + ')'), 0, 'an older backup adds nothing back');
assert.deepEqual(get('Store.data.sessions.map((x) => x.id)'), ['a'], 'deleted session stays deleted');
assert.equal(get('Store.data.notes.length'), 0, 'deleted note stays deleted');
assert.equal(get('Store.data.denemeler.length'), 0, 'deleted practice exam stays deleted');
// başka cihazda düzeltilen oturum (yeni "updated") birleştirince kazanır
const edited = JSON.parse(JSON.stringify(before));
edited.sessions[0] = { ...edited.sessions[0], minutes: 48, note: 'düzelttim', updated: T + 99 };
run('Store.mergeJSON(' + JSON.stringify(edited) + ')');
assert.equal(get('Store.data.sessions[0].minutes'), 48, 'newer edit from another device wins');
assert.equal(get('Store.data.sessions.length'), 1, 'the edited backup still cannot bring back b');
// başka cihazda silinen kayıt burada da kalkar; yeni kayıtlar eklenir
const other = { version: 1, settings: { name: 'Hazal' }, sessions: [{ id: 'c', start: T + 20000e3, end: T + 21800e3, minutes: 30, subjectId: 's1' }], deleted: { a: T + 100 } };
assert.equal(run('Store.mergeJSON(' + JSON.stringify(other) + ')'), 1, 'one new session from the other device');
assert.deepEqual(get('Store.data.sessions.map((x) => x.id)'), ['c'], 'a deleted on the other device is removed here too');
assert.ok(get('Store.data.deleted.a') && get('Store.data.deleted.b'), 'deletion marks are kept from both devices');
// içe aktarılan yedekte bozuk alanlar
const evil = { version: 1, settings: { name: 'Hazal' }, denemeler: [{ id: 'e1', date: '2026-10-19', type: '<img src=x onerror=alert(1)>', scores: { tr: { d: '<b>x</b>', y: 4 }, mat: { d: '', y: null }, bad: 'x' } }],
  cards: [{ id: 'k1', front: 'a', back: 'b', box: '<i>1</i>' }, { id: 'k2', front: 'a', back: 'b', box: 0 }], mistakes: [{ id: 'm1', box: 9 }, { id: 'm2', box: 3 }] };
assert.equal(run('Store.importJSON(' + JSON.stringify(evil) + ')'), true);
const e = get('Store.data.denemeler[0]');
assert.equal(e.type, 'TYT'); assert.equal(e.scores.tr.d, 0); assert.equal(e.scores.tr.y, 4); assert.equal(e.scores.mat.d, ''); assert.equal(e.scores.mat.y, null); assert.equal('bad' in e.scores, false);
assert.deepEqual(get('Store.data.cards.map((c) => c.box)'), [1, 0], 'card box: junk becomes 1, a valid 0 stays');
assert.deepEqual(get('Store.data.mistakes.map((m) => m.box)'), [1, 3], 'mistake box limited to 1–5');
console.log('Backup merge: deletions stay deleted and travel between devices, newer edits win, imported numbers and types are cleaned');
