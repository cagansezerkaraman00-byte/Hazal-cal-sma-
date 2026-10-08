// Run: node tests/planlar.test.cjs
// Planlarım: elle yazılan günlük / haftalık / aylık planlar, eski verinin korunması, taşıma, kopyalama, ilerleme ve gün sonu yorumu.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

let n = 0;
const ok = (v, label) => { assert.ok(v, label); n++; };
const eq = (a, b, label) => { assert.deepStrictEqual(a, b, label); n++; };

// sabit "şimdi": testler hangi gün çalışırsa çalışsın aynı sonucu versin
let NOW = new Date(2026, 9, 7, 10, 0).getTime();
class FDate extends Date {
  constructor(...a) { if (a.length) super(...a); else super(NOW); }
  static now() { return NOW; }
}
const at = (d, h = 12, m = 0, mo = 9) => new FDate(2026, mo, d, h, m);
const T = (d, h = 12, m = 0) => at(d, h, m).getTime();

const SEED = {
  version: 1,
  settings: { name: 'Hazal', dailyGoal: 180, msgInterval: 20 },
  yks: {
    field: 'SAY', topics: {}, planDone: { '2026-10-06': ['0-1'] },
    planCache: { week: '2026-10-05', field: 'SAY', goal: 180, salt: 0, days: [{ date: '2026-10-05', items: [{ key: '0-0', kind: 'routine', title: '📖 20 paragraf sorusu' }] }] },
  },
  stats: { planItems: 2, planFull: 1, planFullDates: ['2026-10-01'] },
  sessions: [
    { id: 's1', start: T(7, 10), end: T(7, 10, 45), minutes: 45, subjectId: 'y_mat', questions: 30 },
    { id: 's2', start: T(7, 14), end: T(7, 14, 30), minutes: 30, subjectId: 'y_tr' },
  ],
};

function makeCtx(seed) {
  const store = { 'luna-study-v1': JSON.stringify(seed) };
  const fakeLS = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  const ctx = vm.createContext({ localStorage: fakeLS, console, Date: FDate, Math, JSON });
  for (const f of ['js/storage.js', 'js/messages.js', 'js/planlar.js']) vm.runInContext(read(f), ctx, { filename: f });
  const run = (code) => vm.runInContext(code, ctx);
  const get = (expr) => { const s = run(`JSON.stringify(${expr})`); return s === undefined ? undefined : JSON.parse(s); };
  return { ctx, run, get, store };
}
const EMPTY = { day: {}, week: {}, month: {}, eod: {}, eodSeq: {} };

// ======================================================================
// A. Eski (2.3.8) veri: hiçbir şey silinmez, plans eklenir
// ======================================================================
let { run, get, ctx } = makeCtx(SEED);
eq(get('Store.loadError'), '', 'legacy data loads without error');
eq(get('Store.data.plans'), EMPTY, 'plans added as empty structure');
eq(get('Store.data.yks.planDone'), SEED.yks.planDone, 'old planDone kept byte-identical');
eq(get('Store.data.yks.planCache'), SEED.yks.planCache, 'old planCache kept byte-identical');
eq(get('Store.data.yks.field'), 'SAY', 'field kept');
for (const k of Object.keys(SEED.settings)) eq(get(`Store.data.settings.${k}`), SEED.settings[k], `setting ${k} kept`);
for (const k of Object.keys(SEED.stats)) eq(get(`Store.data.stats.${k}`), SEED.stats[k], `stat ${k} kept`);
eq(get('Store.data.sessions'), SEED.sessions, 'sessions kept');
run('Store.importJSON(JSON.parse(JSON.stringify(Store.data)))');
eq(get('Store.data.plans'), EMPTY, 'merge is idempotent for plans');
eq(get('Store.data.yks.planCache'), SEED.yks.planCache, 'import keeps planCache');

// ======================================================================
// H (kısmen). Okumak hiçbir şey üretmez: uygulama kendiliğinden madde oluşturmaz
// ======================================================================
ctx.__now = at(7, 21);
run(`(() => {
  const now = __now;
  for (const s of Planlar.SCOPES) {
    const k = Planlar.keyOf(s, now);
    Planlar.list(s, k); Planlar.roll(s, k); Planlar.prevCount(s, k); Planlar.label(s, k, now); Planlar.carryTarget(s, k, now);
    Planlar.stats(Planlar.list(s, Planlar.shift(s, k, -1)));
  }
  Planlar.daysOf('month', '2026-10'); Planlar.weeksOfMonth('2026-10'); Planlar.usedRecently(now);
  for (const h of [0, 3, 6, 9, 12, 17, 18, 20, 21, 22, 23]) { const d = new Date(2026, 9, 7, h); Planlar.eodDue(d); Planlar.eodView('2026-10-07', d); Planlar.eodView('2026-10-06', d); }
  Planlar.find('yok'); Planlar.subjectWork('y_mat', 'day', '2026-10-07'); Planlar.onSession({ intent: '📖 20 paragraf sorusu', start: now.getTime() });
})()`);
eq(get('Store.data.plans'), EMPTY, 'reading, roll-ups, eod checks and onSession never create plan items');
eq(get('Store.data.stats.planItems'), 2, 'no counters touched by reads');

const reset = () => run('Store.data.plans = { day: {}, week: {}, month: {}, eod: {}, eodSeq: {} }; Store.save();');

// ======================================================================
// B. Normalleştirme: bozuk kayıtlar ayıklanır, geçerliler dokunulmadan kalır
// ======================================================================
const valid = { id: 'v1', title: 'Geçerli madde', subjectId: 'y_mat', topicId: 'tyt_mat:problemler', min: 30, q: 20, done: false, doneAt: 0, moved: '', from: '', src: '', counted: false, created: 5, updated: 6 };
const bad = {
  day: {
    x: [{ id: 'a', title: 't' }],
    '2026-10-08': 'notarray',
    '2026-10-09': [{ title: 'kimliksiz' }, { id: 'ok1', title: 'A'.repeat(500), subjectId: '<b>x</b>', min: 9999, q: -3, moved: 'bad', done: 1 }, valid, { id: 'd1', del: true, updated: 9, title: 'gitmeli' }],
  },
  week: [],
  month: null,
  eod: { notadate: { text: 'x' }, '2026-10-07': { text: 5, at: 1 }, '2026-10-06': 'bozuk' },
  eodSeq: { tam: 2 },
  intro: true,
  future: { keep: 1 },
};
ctx.__bad = JSON.parse(JSON.stringify(bad));
run('Store.importJSON({ ...JSON.parse(JSON.stringify(Store.data)), plans: __bad })');
eq(get('Store.loadError'), '', 'normalization never throws');
eq(Object.keys(get('Store.data.plans.day')), ['2026-10-09'], 'invalid day keys / non-arrays dropped');
const d9 = get("Store.data.plans.day['2026-10-09']");
eq(d9.length, 3, 'item without id dropped');
eq(d9[0].title.length, 120, 'title clipped to 120');
eq(d9[0].subjectId, 'bxb', 'subjectId cleaned to safe characters');
eq(d9[0].min, 600, 'min clamped');
eq(d9[0].q, 0, 'negative q becomes 0');
eq(d9[0].moved, '', 'bad moved key cleared');
eq(d9[0].done, true, 'done coerced to boolean');
eq(d9[1], valid, 'valid item untouched');
eq(d9[2], { id: 'd1', del: true, updated: 9 }, 'tombstone reduced to id/del/updated');
eq(get('Store.data.plans.week'), {}, 'array week map replaced');
eq(get('Store.data.plans.month'), {}, 'null month map replaced');
eq(get('Store.data.plans.eod'), { '2026-10-07': { text: '', at: 1 } }, 'eod: bad keys dropped, text coerced');
eq(get('Store.data.plans.intro'), true, 'intro flag kept');
eq(get('Store.data.plans.future'), { keep: 1 }, 'unknown future keys kept');
const once = run('JSON.stringify(Store.data.plans)');
run('Store.importJSON(JSON.parse(JSON.stringify(Store.data)))');
eq(run('JSON.stringify(Store.data.plans)'), once, 'second normalization pass is identical');
ctx.__junk = 'string';
run('Store.importJSON({ ...JSON.parse(JSON.stringify(Store.data)), plans: __junk })');
eq(get('Store.data.plans'), EMPTY, 'non-object plans becomes the empty structure');
eq(get('Store.data.sessions').length, 2, 'other data untouched by a broken plans value');

// ======================================================================
// C. Anahtarlar
// ======================================================================
reset();
ctx.__now = at(7, 21);
eq(run('Planlar.keyOf("week", new Date(2026, 9, 11, 12))'), '2026-10-05', 'Sunday belongs to the week of Monday 5th');
eq(run('Planlar.keyOf("week", new Date(2026, 9, 5, 0, 30))'), '2026-10-05', 'Monday is its own week key');
eq(run('Planlar.keyOf("month", new Date(2026, 9, 31, 23, 59))'), '2026-10', 'month key');
eq(run('Planlar.shift("month", "2026-12", 1)'), '2027-01', 'month shift across year');
eq(run('Planlar.shift("month", "2026-01", -1)'), '2025-12', 'month shift back across year');
eq(run('Planlar.shift("day", "2026-10-31", 1)'), '2026-11-01', 'day shift across month');
eq(run('Planlar.shift("week", "2026-12-28", 1)'), '2027-01-04', 'week shift across year');
eq(run('(() => { const r = Planlar.range("month", "2026-02"); return Math.round((r.to - r.from) / 864e5); })()'), 28, 'February 2026 has 28 days');
eq(run('(() => { const r = Planlar.range("week", "2026-10-05"); return Math.round((r.to - r.from) / 864e5); })()'), 7, 'week range is 7 days');
eq(run('Planlar.label("day", "2026-10-07", __now).rel'), 'Bugün', 'today label');
eq(run('Planlar.label("day", "2026-10-07", __now).title'), '7 Ekim Çarşamba', 'day title');
eq(run('Planlar.label("day", "2026-10-08", __now).rel'), 'Yarın', 'tomorrow label');
eq(run('Planlar.label("week", "2026-09-28", __now).title'), '28 Eylül – 4 Ekim', 'week title across months');
eq(get('Planlar.label("week", "2026-10-05", __now)'), { title: '5–11 Ekim', rel: 'Bu hafta' }, 'week title in one month');
eq(get('Planlar.label("month", "2026-11", __now)'), { title: 'Kasım 2026', rel: 'Gelecek ay' }, 'month label');
const wom = get('Planlar.weeksOfMonth("2026-10")');
eq(wom[0], '2026-10-05', 'first week of October starts on the 5th');
ok(!wom.includes('2026-09-28'), 'week starting in September belongs to September');
eq(wom.length, 4, 'October 2026 has 4 Mondays');
eq(get('Planlar.daysOf("week", "2026-10-05")').length, 7, '7 days in a week');
eq(get('Planlar.daysOf("month", "2026-10")').length, 31, '31 days in October');
eq(run('Planlar.isKey("week", "2026-10-06")'), false, 'week key must be a Monday');
eq(run('Planlar.isKey("day", "2026-02-30")'), false, 'impossible date rejected');
eq(run('Planlar.isKey("month", "2026-13")'), false, 'month 13 rejected');

// ======================================================================
// D. Ekle / düzenle / sil / sırala / güne taşı
// ======================================================================
reset();
eq(run('Planlar.add("day", "2026-10-07", { title: "   " })'), null, 'empty title rejected');
eq(run('Planlar.add("week", "2026-10-06", { title: "salı" })'), null, 'week key must be Monday');
eq(get('Store.data.plans.day'), {}, 'rejected add creates no key');
run('for (let i = 0; i < 40; i++) Planlar.add("day", "2026-10-20", { title: "Madde " + i })');
eq(get('Planlar.list("day", "2026-10-20")').length, 40, '40 items allowed');
eq(run('Planlar.add("day", "2026-10-20", { title: "41." })'), null, '41st item rejected');
const a = get('Planlar.add("day", "2026-10-07", { title: "  Türev testi  ", subjectId: "<y_mat>", min: 61.4, q: "40", topicId: "tyt_mat:turev" })');
eq([a.title, a.subjectId, a.min, a.q, a.topicId, a.done, a.moved, a.counted], ['Türev testi', 'y_mat', 61, 40, 'tyt_mat:turev', false, '', false], 'add normalizes fields');
ok(/^p/.test(a.id) && a.created === a.updated, 'id and timestamps');
eq(run(`Planlar.update("${a.id}", { title: "  " })`), null, 'update cannot empty the title');
eq(get(`Planlar.find("${a.id}").item.title`), 'Türev testi', 'title unchanged after rejected update');
run(`Planlar.update("${a.id}", { title: "Türev 2", min: 0, q: 5000 }, 999)`);
eq(get(`Planlar.find("${a.id}").item`).title, 'Türev 2', 'title updated');
eq([get(`Planlar.find("${a.id}").item.min`), get(`Planlar.find("${a.id}").item.q`), get(`Planlar.find("${a.id}").item.updated`)], [0, 999, 999], 'targets clamped, updated bumped');
const ids = ['X', 'Y', 'Z'].map((t) => get(`Planlar.add("day", "2026-10-09", { title: "${t}" }).id`));
run(`Planlar.remove("${ids[1]}", 50)`);
eq(get('Planlar.list("day", "2026-10-09")').map((x) => x.title), ['X', 'Z'], 'removed item hidden');
eq(get("Store.data.plans.day['2026-10-09'][1]"), { id: ids[1], del: true, updated: 50 }, 'tombstone stays in place');
eq(run(`Planlar.find("${ids[1]}")`), null, 'find skips tombstones');
const w = get(`Planlar.add("day", "2026-10-09", { title: "W" }).id`);
eq(run(`Planlar.reorder("${w}", -1)`), true, 'reorder up');
eq(get('Planlar.list("day", "2026-10-09")').map((x) => x.title), ['X', 'W', 'Z'], 'reorder swaps live neighbours (skipping tombstones)');
eq(run(`Planlar.reorder("${ids[0]}", -1)`), false, 'no move past the top');
eq(run(`Planlar.reorder("${ids[2]}", 1)`), false, 'no move past the bottom');
run(`Planlar.setDone("${ids[0]}", true)`);
const mv = get(`Planlar.moveToDay("${ids[0]}", "2026-10-10")`);
eq([mv.title, mv.done, mv.counted], ['X', true, true], 'moveToDay keeps fields and done state');
eq(get('Planlar.list("day", "2026-10-09")').map((x) => x.title), ['W', 'Z'], 'moved-to-day item leaves the old day');
eq(get('Planlar.list("day", "2026-10-10")').map((x) => x.title), ['X'], 'and appears on the new day');
ok(get(`Store.data.plans.day['2026-10-09'].find((x) => x.id === "${ids[0]}")`).del, 'old copy tombstoned');

// ======================================================================
// E. Yapıldı ve rozet sayaçları
// ======================================================================
reset();
run('Store.data.stats.planItems = 2; Store.data.stats.planFull = 1; Store.data.stats.planFullDates = ["2026-10-01"];');
const p = get('Planlar.add("day", "2026-10-10", { title: "p" }).id'), q = get('Planlar.add("day", "2026-10-10", { title: "q" }).id');
eq(get(`Planlar.setDone("${p}", true)`).fullDay, false, 'not full yet');
run(`Planlar.setDone("${p}", false); Planlar.setDone("${p}", true);`);
eq(get('Store.data.stats.planItems'), 3, 'tick, untick, tick counts once');
eq(get(`Planlar.setDone("${q}", true)`).fullDay, true, 'finishing every item → full day');
eq([get('Store.data.stats.planFull'), get('Store.data.stats.planItems')], [2, 4], 'planFull +1');
run(`Planlar.setDone("${q}", false); Planlar.setDone("${q}", true);`);
eq(get('Store.data.stats.planFull'), 2, 're-ticking does not add another full day');
eq(get('Store.data.stats.planFullDates').filter((x) => x === '2026-10-10').length, 1, 'date stored once');
const r1 = get('Planlar.add("day", "2026-10-11", { title: "r" }).id');
get('Planlar.add("day", "2026-10-11", { title: "s" })');
run(`Planlar.carry("day", "2026-10-11", { to: "2026-10-12", now: new Date(2026, 9, 11, 21) })`); // r ve s taşındı
run(`Planlar.uncarry("${r1}")`);
eq(get(`Planlar.setDone("${r1}", true)`).fullDay, false, 'a day with a moved item never counts as full');
eq(get('Store.data.stats.planFull'), 2, 'planFull unchanged');
const sMoved = get('Planlar.list("day", "2026-10-11")').find((x) => x.moved);
eq(run(`Planlar.setDone("${sMoved.id}", true)`), null, 'moved items cannot be ticked');

// ======================================================================
// F. İlerleme ve dilim
// ======================================================================
const st = (items) => get(`Planlar.stats(${JSON.stringify(items)})`);
const band = (items) => run(`Planlar.bandOf(Planlar.stats(${JSON.stringify(items)}))`);
const mk = (done, open) => [...Array(done).fill({ done: true }), ...Array(open).fill({ done: false })];
eq([st(mk(3, 2)).pct, band(mk(3, 2))], [60, 'orta'], '3/5 → 60, orta');
eq(st(mk(2, 1)).pct, 66, '2/3 rounds down to 66');
eq([st(mk(1, 199)).pct, band(mk(1, 199))], [1, 'az'], '1/200 → 1, az');
eq([st([]).pct, band([])], [null, 'bos'], 'no items → null, bos');
eq(band([{ moved: '2026-10-08' }]), 'hepsiTasindi', 'all moved');
eq([st(mk(5, 0)).pct, band(mk(5, 0))], [100, 'tam'], '5/5 → 100, tam');
eq(band(mk(0, 3)), 'sifir', '0 done → sifir');
eq(band(mk(4, 1)), 'cok', '4/5 → cok');
const sm = st([{ done: true }, { moved: '2026-10-08' }, { del: true }]);
eq([sm.total, sm.done, sm.moved, sm.pct], [1, 1, 1, 100], 'moved excluded from the total, tombstones ignored');

// ======================================================================
// G. Taşıma
// ======================================================================
reset();
ctx.__now = at(7, 21);
const ga = get('Planlar.add("day", "2026-10-07", { title: "a" }).id');
const gb = get('Planlar.add("day", "2026-10-07", { title: "b", subjectId: "y_mat", min: 30 }).id');
const gc = get('Planlar.add("day", "2026-10-07", { title: "c" }).id');
run(`Planlar.setDone("${ga}", true)`);
const c1 = get('Planlar.carry("day", "2026-10-07", { now: __now })');
eq(c1, { count: 2, moved: 2, to: '2026-10-08' }, 'carry today → tomorrow');
eq([get(`Planlar.find("${gb}").item.moved`), get(`Planlar.find("${gc}").item.moved`), get(`Planlar.find("${ga}").item.moved`)], ['2026-10-08', '2026-10-08', ''], 'only unfinished sources moved');
const copies = get('Planlar.list("day", "2026-10-08")');
eq(copies.map((x) => [x.title, x.from, x.src, x.done, x.subjectId, x.min]), [['b', '2026-10-07', gb, false, 'y_mat', 30], ['c', '2026-10-07', gc, false, '', 0]], 'copies keep fields and point back');
ok(copies.every((x) => x.id !== gb && x.id !== gc), 'copies get new ids');
eq(get('Planlar.carry("day", "2026-10-07", { now: __now })').count, 0, 'second carry does nothing');
eq(get('Planlar.stats(Planlar.list("day", "2026-10-07"))').pct, 100, 'carrying the rest makes the kept part 100%');
get('Planlar.add("day", "2026-10-05", { title: "eski" })');
eq(get('Planlar.carry("day", "2026-10-05", { now: __now })').to, '2026-10-07', 'past day carries to today');
eq(run('Planlar.carryTarget("week", "2026-10-05", __now)'), '2026-10-12', 'current week → next week');
eq(run('Planlar.carryTarget("month", "2026-09", __now)'), '2026-10', 'past month → this month');
get('Planlar.add("day", "2026-10-14", { title: "Dup", subjectId: "y_mat" })');
get('Planlar.add("day", "2026-10-15", { title: "Dup", subjectId: "y_mat" })');
eq(get('Planlar.carry("day", "2026-10-14", { now: __now })'), { count: 0, moved: 1, to: '2026-10-15' }, 'dedupe: no duplicate copy but source still moved');
eq(get('Planlar.list("day", "2026-10-15")').length, 1, 'target keeps one copy');
eq(run(`Planlar.uncarry("${gb}")`), true, 'uncarry');
eq(get(`Planlar.find("${gb}").item.moved`), '', 'source active again');
eq(get('Planlar.list("day", "2026-10-08")').map((x) => x.title), ['c'], 'copy tombstoned');
const cc = get('Planlar.list("day", "2026-10-08")')[0];
run(`Planlar.setDone("${cc.id}", true)`);
eq(run(`Planlar.uncarry("${gc}")`), false, 'cannot uncarry when the copy is done');
eq(get(`Planlar.find("${gc}").item.moved`), '2026-10-08', 'source stays moved');
// zincir: kopya da taşınmışsa ikisi birden geri alınır
reset();
const z1 = get('Planlar.add("day", "2026-10-07", { title: "zincir" }).id');
run('Planlar.carry("day", "2026-10-07", { to: "2026-10-08", now: __now })');
run('Planlar.carry("day", "2026-10-08", { to: "2026-10-09", now: __now })');
eq(run(`Planlar.uncarry("${z1}")`), true, 'chain uncarry');
eq([get('Planlar.list("day", "2026-10-08")').length, get('Planlar.list("day", "2026-10-09")').length, get(`Planlar.find("${z1}").item.moved`)], [0, 0, ''], 'whole chain undone, nothing duplicated');

// ======================================================================
// H. Önceki listeyi kopyala (yalnızca dokununca)
// ======================================================================
reset();
const m1 = get('Planlar.add("day", "2026-10-19", { title: "m1", q: 10 }).id');
get('Planlar.add("day", "2026-10-19", { title: "m2" })');
get('Planlar.add("day", "2026-10-19", { title: "m3" })');
run(`Planlar.setDone("${m1}", true)`);
run('(() => { const it = Planlar.list("day", "2026-10-19")[2]; it.moved = "2026-10-21"; })()');
eq(run('Planlar.prevCount("day", "2026-10-20")'), 2, 'prevCount ignores moved items');
eq(run('Planlar.copyCount("day", "2026-10-20")'), 2, 'copyCount: 2 items would be added');
eq(run('Planlar.copyPrev("day", "2026-10-20")'), 2, 'copies live, non-moved items');
eq(run('Planlar.copyCount("day", "2026-10-20")'), 0, 'copyCount is 0 once everything is already there (copy button hidden)');
eq(run('Planlar.prevCount("day", "2026-10-20")'), 2, 'prevCount still reports the previous list');
eq(get('Planlar.list("day", "2026-10-20")').map((x) => [x.title, x.done, x.q, x.from, x.src]), [['m1', false, 10, '', ''], ['m2', false, 0, '', '']], 'done ones copied as not done');
eq(run('Planlar.copyPrev("day", "2026-10-20")'), 0, 'duplicates skipped');
eq(run('Planlar.copyPrev("day", "2026-11-20")'), 0, 'empty previous period → 0');
eq(get('Store.data.plans.day["2026-11-20"]'), undefined, 'empty copy creates no key');
eq(run('Planlar.copyPrev("week", "2026-10-12")'), 0, 'week copy with nothing before');

// ======================================================================
// I. Hafta / ay toplamları (taşınan bir kez sayılır)
// ======================================================================
reset();
const w1 = get('Planlar.add("week", "2026-10-05", { title: "w1" }).id');
get('Planlar.add("week", "2026-10-05", { title: "w2" })');
get('Planlar.add("week", "2026-09-28", { title: "eylül haftası" })');
const d1 = get('Planlar.add("day", "2026-10-05", { title: "d1" }).id');
get('Planlar.add("day", "2026-10-11", { title: "d2" })');
get('Planlar.add("day", "2026-10-12", { title: "d3" })');
get('Planlar.add("month", "2026-10", { title: "ay hedefi" })');
run(`Planlar.setDone("${w1}", true); Planlar.setDone("${d1}", true);`);
const rw = get('Planlar.roll("week", "2026-10-05")');
eq([rw.own.total, rw.days.total, rw.all.total, rw.all.done, rw.all.pct], [2, 2, 4, 2, 50], 'week = own + its 7 days');
const rm = get('Planlar.roll("month", "2026-10")');
eq([rm.own.total, rm.weeks.total, rm.days.total, rm.all.total, rm.all.done], [1, 2, 3, 6, 2], 'month = own + weeks with Monday in month + days of month');
eq(get('Planlar.roll("day", "2026-10-05")').own.total, 1, 'day roll is its own items only');
run('Planlar.carry("day", "2026-10-11", { to: "2026-10-12", now: new Date(2026, 9, 11, 21) })');
eq(get('Planlar.roll("month", "2026-10")').all.total, 6, 'carried item counted once in the month');
eq(get('Planlar.roll("week", "2026-10-05")').days.total, 1, 'carried item leaves its source week');

// ======================================================================
// J. Ders çalışması ve hedef ipucu (yalnızca gösterim)
// ======================================================================
reset();
eq(get('Planlar.subjectWork("y_mat", "day", "2026-10-07")'), { minutes: 45, questions: 30 }, 'y_mat today: 45 min / 30 questions');
eq(get('Planlar.subjectWork("y_mat", "day", "2026-10-06")'), { minutes: 0, questions: 0 }, 'other day: nothing');
eq(get('Planlar.subjectWork("y_mat", "week", "2026-10-05")'), { minutes: 45, questions: 30 }, 'week includes the day');
eq(run('Planlar.subjectWork("", "day", "2026-10-07")'), null, 'no subject → null');
const t1 = get('Planlar.add("day", "2026-10-07", { title: "Türev", subjectId: "y_mat", min: 40, q: 30 })');
eq(run(`Planlar.targetReached(Planlar.find("${t1.id}").item, "day", "2026-10-07")`), true, 'target reached');
eq(get(`Planlar.find("${t1.id}").item.done`), false, 'reaching a target never ticks');
const t2 = get('Planlar.add("day", "2026-10-07", { title: "Limit", subjectId: "y_mat", min: 10 })');
eq(run(`Planlar.targetReached(Planlar.find("${t1.id}").item, "day", "2026-10-07")`), false, 'two unfinished targeted items in one subject → no hint');
eq(run(`Planlar.targetReached(Planlar.find("${t2.id}").item, "day", "2026-10-07")`), false, 'for either of them');
const t3 = get('Planlar.add("day", "2026-10-07", { title: "Paragraf", subjectId: "y_tr", q: 5 })');
eq(run(`Planlar.targetReached(Planlar.find("${t3.id}").item, "day", "2026-10-07")`), false, 'questions target not met');

// ======================================================================
// K. Oturum bitince (eski kural): yalnızca hedefsiz madde işaretlenir
// ======================================================================
reset();
const long = 'Uzun başlık '.repeat(10).trim();
const k1 = get(`Planlar.add("day", "2026-10-07", { title: ${JSON.stringify(long)} }).id`);
eq(get(`Planlar.onSession({ intent: ${JSON.stringify(long.slice(0, 80))}, start: ${T(7, 15)} })`).id, k1, 'intent = first 80 characters ticks the item');
eq(get(`Planlar.find("${k1}").item.done`), true, 'item done');
const k2 = get('Planlar.add("day", "2026-10-07", { title: "Hedefli", min: 30 }).id');
eq(run(`Planlar.onSession({ intent: "Hedefli", start: ${T(7, 15)} })`), null, 'targeted item not auto-ticked');
eq(get(`Planlar.find("${k2}").item.done`), false, 'still open');
const k3 = get('Planlar.add("day", "2026-10-07", { title: "Bitti" }).id');
run(`Planlar.setDone("${k3}", true, 7)`);
eq(run(`Planlar.onSession({ intent: "Bitti", start: ${T(7, 16)} })`), null, 'done item not toggled');
eq([get(`Planlar.find("${k3}").item.done`), get(`Planlar.find("${k3}").item.doneAt`)], [true, 7], 'done state untouched');
const k4 = get('Planlar.add("day", "2026-10-07", { title: "Bugün işi" }).id');
eq(run(`Planlar.onSession({ intent: "Bugün işi", start: ${T(9, 10)} })`), null, 'a session on another day does not touch today');
eq(get(`Planlar.find("${k4}").item.done`), false, 'today untouched');
const k5 = get('Planlar.add("week", "2026-10-05", { title: "Haftalık iş" }).id');
eq(get(`Planlar.onSession({ intent: "Haftalık iş", start: ${T(9, 10)} })`).id, k5, 'week items too');

// ======================================================================
// L. Gün sonu zamanlaması
// ======================================================================
reset();
run('Store.data.lunaConversation = { introduced: true, day: "2026-10-07", checkedIn: true, feeling: "Good" }');
const y1 = get('Planlar.add("day", "2026-10-06", { title: "dün 1" }).id');
get('Planlar.add("day", "2026-10-06", { title: "dün 2" })');
run(`Planlar.setDone("${y1}", true)`);
const b1 = get('Planlar.add("day", "2026-10-07", { title: "bugün 1", min: 20 }).id');
get('Planlar.add("day", "2026-10-07", { title: "bugün 2", min: 45 })');
get('Planlar.add("day", "2026-10-07", { title: "bugün 3 kısa", min: 15 })');
run(`Planlar.setDone("${b1}", true)`);
const due = (y, mo, d, h, m = 0) => get(`Planlar.eodDue(new Date(${y}, ${mo}, ${d}, ${h}, ${m}))`);
const dm = due(2026, 9, 7, 17, 59);
eq([dm.slot, dm.day, dm.target, dm.band, dm.vars.yuzde], ['sabah', '2026-10-06', '2026-10-07', 'orta', 50], '17:59 → morning recap of yesterday');
eq(due(2026, 9, 7, 18, 30), null, '18:30 → nothing');
eq(due(2026, 9, 7, 19, 59), null, '19:59 → nothing (recap window ends at 18:00, evening starts at 20:00)');
const de = due(2026, 9, 7, 20, 0);
eq([de.slot, de.day, de.band, de.target], ['aksam', '2026-10-07', 'az', '2026-10-08'], '20:00 → evening, today');
eq(de.vars, { yuzde: 33, yapilan: 1, toplam: 3, kalan: 2, tasinan: 0, kucuk: 'bugün 3 kısa', sure: '1 sa 15 dk', dakika: 75 }, 'vars: smallest remaining by target minutes, minutes of the day');
eq(due(2026, 9, 7, 22, 30).slot, 'gece', '22:30 → night');
const dn = due(2026, 9, 8, 0, 30);
eq([dn.day, dn.slot, dn.target], ['2026-10-07', 'gece', '2026-10-08'], '00:30 belongs to the evening before; "tomorrow" is the calendar today');
run('Planlar.markEod("2026-10-07", { text: "x", at: 1, done: 1, total: 3 })');
eq(due(2026, 9, 7, 20, 0), null, 'once per day');
eq(due(2026, 9, 8, 0, 30), null, 'also after midnight');
// boş gün: yalnızca akşam ve yalnızca plan defterini yakın zamanda kullandıysa
const bo = due(2026, 9, 9, 20, 30);
eq([bo.band, bo.slot], ['bos', 'aksam'], 'empty day in the evening when planner used recently');
eq(due(2026, 9, 9, 22, 30), null, 'empty day never at night');
eq(due(2026, 9, 10, 10, 0), null, 'no morning recap for an empty day');
eq(due(2027, 0, 20, 20, 30), null, 'empty day not mentioned when the planner was not used recently');
// yorgun: akşam yumuşak gece dili
run('delete Store.data.plans.eod["2026-10-07"]; Store.data.lunaConversation = { introduced: true, day: "2026-10-07", checkedIn: true, feeling: "Tired" };');
eq(due(2026, 9, 7, 20, 30).slot, 'gece', 'Tired + az in the evening → gentle night wording');
run('Store.data.lunaConversation.feeling = "Hard"');
eq(due(2026, 9, 7, 20, 30).slot, 'gece', 'Hard too');
run('Store.data.lunaConversation.feeling = "Good"');
eq(due(2026, 9, 7, 20, 30).slot, 'aksam', 'Good keeps the evening wording');
// dünkü "yorgunum" bugünü etkilemez ve gün sonu kontrolü Luna'nın sohbet kaydını değiştirmez
run('Store.data.lunaConversation.feeling = "Tired"; Planlar.add("day", "2026-10-09", { title: "perşembe 1" }); Planlar.add("day", "2026-10-09", { title: "perşembe 2" });');
const convBefore = run('JSON.stringify(Store.data.lunaConversation)');
eq(due(2026, 9, 9, 20, 30).slot, 'aksam', 'a feeling from an earlier day does not soften today');
eq(run('JSON.stringify(Store.data.lunaConversation)'), convBefore, 'eodDue never rewrites the companion state');
// tamamen taşınmış gün: akşam söylenir, sabah özeti yok
reset();
get('Planlar.add("day", "2026-10-06", { title: "taşınacak" })');
run('Planlar.carry("day", "2026-10-06", { to: "2026-10-07", now: new Date(2026, 9, 6, 21) })');
eq(due(2026, 9, 6, 21, 0).band, 'hepsiTasindi', 'all moved in the evening');
eq(due(2026, 9, 7, 9, 0), null, 'no morning recap for an all-moved day');
// gün sonu kartı: söylenen metin sayılar değişmediyse aynen gösterilir
reset();
get('Planlar.add("day", "2026-10-07", { title: "tek" })');
run('Planlar.markEod("2026-10-07", { text: "Söylenen cümle", at: 5, done: 0, total: 1 })');
eq(run('Planlar.eodView("2026-10-07", new Date(2026, 9, 7, 21)).showText'), 'Söylenen cümle', 'stored text shown when numbers match');
run('Planlar.setDone(Planlar.list("day", "2026-10-07")[0].id, true)');
const ev = get('Planlar.eodView("2026-10-07", new Date(2026, 9, 7, 21))');
ok(ev.showText && ev.showText !== 'Söylenen cümle' && ev.showText.includes('%100'), 'numbers changed → fresh text with the new %');
eq(run('Planlar.eodView("2026-10-07", new Date(2026, 9, 7, 15)).showText'), '', 'no Luna text before the evening');
run('Planlar.dismissEod("2026-10-08")');
eq(get('Store.data.plans.eod["2026-10-08"]'), { dismissed: true }, 'dismiss creates a record without "at"');
run('Store.data.plans.eod["2026-01-01"] = { at: 1, text: "" }; Planlar.markEod("2026-10-07", { at: 9 })');
eq(get('Store.data.plans.eod["2026-01-01"]'), undefined, 'old eod records pruned');

// ======================================================================
// M. Luna'nın cümleleri
// ======================================================================
const PE = get('Messages.PLAN_EOD');
const allowed = new Set(['name', 'yuzde', 'yapilan', 'toplam', 'kalan', 'tasinan', 'kucuk', 'sure']);
const BAD = /tembel|ayıp|yazık|utan|başaramadın|hayal kırıklığı|neden yapmadın|boşa|kötü|gözler|saçlar|tenin|cildin/i;
for (const [key, list] of Object.entries(PE)) {
  ok(list.length >= 3, `${key} has at least 3 variants`);
  for (const t of list) {
    for (const m of t.matchAll(/\{(\w+)\}/g)) ok(allowed.has(m[1]), `${key}: placeholder {${m[1]}} allowed`);
    if (!['bos', 'bosCalisti', 'hepsiTasindi'].includes(key)) ok(t.includes('%{yuzde}'), `${key}: mentions the percentage`);
    ok(!/\}['’]/.test(t), `${key}: no suffix after a variable`);
    if (/(Gece|Sabah)$/.test(key)) ok(!/oturum yap|otururuz/.test(t), `${key}: no study-session offer at night / in the morning`);
    ok(!BAD.test(t), `${key}: warm, no guilt, no looks`);
  }
}
for (const k of ['tam', 'tamSabah', 'tamTasindi', 'tamTasindiSabah', 'cok', 'cokSabah', 'orta', 'ortaGece', 'ortaSabah', 'az', 'azGece', 'azSabah', 'sifir', 'sifirGece', 'sifirSabah', 'hepsiTasindi', 'bos', 'bosCalisti']) ok(PE[k], `list ${k} exists`);
ctx.__vars = { yuzde: 60, yapilan: 3, toplam: 5, kalan: 2, tasinan: 1, kucuk: 'Türev', sure: '1 sa', dakika: 60 };
for (const b of ['tam', 'cok', 'orta', 'az', 'sifir', 'bos', 'hepsiTasindi']) {
  for (const s of ['aksam', 'gece', 'sabah']) {
    for (let i = 0; i < 4; i++) {
      const c = get(`Messages.planComment("${b}", "${s}", __vars, { [Messages.planComment("${b}", "${s}", __vars).key]: ${i} })`);
      ok(!c.text.includes('{') && c.text.includes('Hazal') === /\{name\}/.test(PE[c.key][i % PE[c.key].length]), `${b}/${s}#${i}: every placeholder filled`);
    }
  }
}
eq(get('Messages.planComment("tam", "aksam", __vars)').emotion, 'proud', 'tam → proud');
eq(get('Messages.planComment("tam", "sabah", __vars)').key, 'tamTasindiSabah', 'tam with moved items in the morning');
eq(get('Messages.planComment("orta", "gece", __vars)').key, 'ortaGece', 'orta at night');
eq(get('Messages.planComment("cok", "gece", __vars)').key, 'cok', 'cok has no separate night list');
eq(get('Messages.planComment("bos", "aksam", { dakika: 0 })').key, 'bos', 'bos without study');
eq(get('Messages.planComment("bos", "aksam", __vars)').key, 'bosCalisti', 'bos with study');
const first = get('Messages.planComment("orta", "aksam", __vars, { orta: 0 })').text;
const second = get('Messages.planComment("orta", "aksam", __vars, { orta: 1 })').text;
ok(first !== second, 'consecutive spoken comments rotate');
ok(get('Messages.planComment("orta", "aksam", __vars, { orta: 0 })').text.includes('“Türev”'), 'smallest item quoted');
ok(!get('Object.keys(Messages)').includes('M'), 'planner lines are not part of Messages.get');

// ======================================================================
// Yedek birleştirme: silinenler geri gelmez, yeni düzenleme kalır, yeni maddeler eklenir
// ======================================================================
reset();
run(`Store.data.plans.day["2026-10-07"] = [
  { id: "L1", title: "yerel", subjectId: "", topicId: "", min: 0, q: 0, done: false, doneAt: 0, moved: "", from: "", src: "", counted: false, created: 1, updated: 100 },
  { id: "L2", del: true, updated: 20 } ]; Store.save();`);
ctx.__backup = JSON.parse(run('JSON.stringify(Store.data)'));
ctx.__backup.plans.day['2026-10-07'] = [
  { id: 'L1', title: 'eski', done: false, updated: 50 },
  { id: 'L2', title: 'silinmişti', done: false, updated: 10 },
  { id: 'N1', title: 'yedekten yeni', done: false, updated: 30 },
];
ctx.__backup.plans.day['2026-10-30'] = [{ id: 'N2', title: 'yeni gün', updated: 1 }, { id: 'N3', title: 'yeni gün 2', updated: 1 }, { id: 'N4', del: true, updated: 1 }];
const added = run('Store.mergeJSON(JSON.parse(JSON.stringify(__backup)))');
eq(get('Planlar.list("day", "2026-10-07")').map((x) => x.title), ['yerel', 'yedekten yeni'], 'newer local edit kept, tombstone kept, new item appended');
eq(get('Planlar.list("day", "2026-10-30")').map((x) => x.title), ['yeni gün', 'yeni gün 2'], 'missing day added');
eq(added, 3, 'merge counts the added plan items');
const before = run('JSON.stringify(Store.data.plans)');
eq(run('Store.mergeJSON(JSON.parse(JSON.stringify(Store.data)))'), 0, 'merging an identical backup adds nothing');
eq(run('JSON.stringify(Store.data.plans)'), before, 'plans unchanged by a self-merge');
// kayıt: yeniden açılışta aynı veri okunur (sıfırlanmaz)
const saved = makeCtx(JSON.parse(run('JSON.stringify(Store.data)')));
eq(saved.get('Store.loadError'), '', 'saved data reloads cleanly');
eq(saved.run('JSON.stringify(Store.data.plans)'), before, 'plans survive a reload');

// ======================================================================
// N. Kaynak kodu denetimleri
// ======================================================================
const planJs = read('js/plan.js'), planlarJs = read('js/planlar.js'), html = read('index.html'), sw = read('sw.js');
ok(!/generateWeek|function rng|planCache\s*=|data-act="regen"/.test(planJs), 'plan.js no longer generates programs');
ok(!/Math\.random|U\.pick|U\.rand/.test(planlarJs), 'planlar.js never uses randomness');
ok(!/document|window\.(?!Planlar)/.test(planlarJs.replace(/if \(typeof window !== 'undefined'\) \{ window\.Planlar = Planlar; \}/, '')), 'planlar.js has no DOM access');
ok(html.indexOf('id="planner-root"') > 0 && html.indexOf('id="planner-root"') < html.indexOf('id="plan-root"'), '#planner-root comes before #plan-root');
const pos = (f) => html.indexOf(`src="js/${f}?`);
ok(pos('plan.js') > 0 && pos('plan.js') < pos('planlar.js') && pos('planlar.js') < pos('planlar-ui.js') && pos('planlar-ui.js') < pos('app.js'), 'script order: plan → planlar → planlar-ui → app');
ok(/'js\/plan\.js', 'js\/planlar\.js', 'js\/planlar-ui\.js'/.test(sw), 'service worker precaches the planner files');
ok(!/\$\('#today-plan'\)\.addEventListener/.test(planJs), 'PlanUI no longer listens on the home card');

console.log(`${n} planner checks passed`);
