// Run: node tests/dunya.test.cjs
// Hazal'ın Küçük Dünyası: plan maddesi bitince eşya (gün başına bir kez), geçmiş emeğin hediyesi, rozetlerin korunması,
// mektup koşulları, kayıt düzeltme ve yedek birleştirmede hiçbir şeyin kaybolmaması.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

let n = 0;
const ok = (v, label) => { assert.ok(v, label); n++; };
const eq = (a, b, label) => { assert.deepStrictEqual(a, b, label); n++; };

let NOW = new Date(2026, 9, 25, 10, 0).getTime();
class FDate extends Date {
  constructor(...a) { if (a.length) super(...a); else super(NOW); }
  static now() { return NOW; }
}
const T = (d, h = 12, mo = 9) => new FDate(2026, mo, d, h, 0).getTime();
const item = (id, done, doneAt) => ({ id, title: 'Madde ' + id, done, doneAt: doneAt || 0, counted: done, created: 1, updated: 1 });

const SEED = {
  version: 1,
  settings: { name: 'Hazal', partner: 'Çağan', dailyGoal: 180 },
  badges: { first: T(1), plan1: T(3), h1: T(4), streak3: T(8) }, // bir aydır kazanılmış rozetler
  stats: { planItems: 14, planFull: 2, planFullDates: ['2026-10-05', '2026-10-12'] },
  plans: {
    day: {
      '2026-10-20': [item('a1', true, T(20)), item('a2', false)],
      '2026-10-21': [item('b1', true, T(21))],
      '2026-10-23': [item('c1', true, T(23)), item('c2', true, T(23))],
      '2026-10-25': [item('d1', false), item('d2', false)],
    },
    week: {}, month: {}, eod: {}, eodSeq: {},
  },
  sessions: [],
};

function makeCtx(seed, extra = {}) {
  const store = { 'luna-study-v1': JSON.stringify(seed), ...extra };
  const fakeLS = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  const ctx = vm.createContext({ localStorage: fakeLS, console, Date: FDate, Math, JSON, atob: (s) => Buffer.from(s, 'base64').toString('latin1'), TextDecoder });
  for (const f of ['js/storage.js', 'js/messages.js', 'js/planlar.js', 'js/badges.js', 'js/mektuplar.js', 'js/dunya.js']) vm.runInContext(read(f), ctx, { filename: f });
  const run = (code) => vm.runInContext(code, ctx);
  const get = (expr) => { const s = run(`JSON.stringify(${expr})`); return s === undefined ? undefined : JSON.parse(s); };
  return { ctx, run, get, store };
}
const saved = (store) => JSON.parse(store['luna-study-v1']);

// ======================================================================
// A. Eski veri: Küçük Dünya boş eklenir, hiçbir şey değişmez, rozetler yerinde
// ======================================================================
let { run, get, store } = makeCtx(SEED);
eq(get('Store.data.dunya'), { esyalar: [], odul: {}, acildi: {}, hosgeldin: 0, gorulen: 0 }, 'empty world added to old data');
eq(get('Store.data.badges'), SEED.badges, 'earned badges untouched');
eq(get('Object.entries(Store.data.plans.day).map(([k, a]) => [k, a.map((x) => [x.id, x.done])])'), Object.entries(SEED.plans.day).map(([k, a]) => [k, a.map((x) => [x.id, x.done])]), 'plans untouched');
const roz = get('Dunya.rozetler().filter((r) => r.at).map((r) => [r.id, r.yer])');
eq(roz, [['first', 'cerceve'], ['plan1', 'cerceve'], ['h1', 'kupa'], ['streak3', 'madalya']], 'earned badges appear in the room (frames, trophies)');
eq(get('Dunya.rozetler().length'), get('Badges.LIST.length'), 'every badge has a place in the room');

// ======================================================================
// B. Geçmiş emeğin hediyesi: geçmiş her emek günü için bir eşya (en çok 6), bir kez
// ======================================================================
const gecmisGun = get('[...Dunya.emekGunleri()].filter((k) => k < "2026-10-25").length');
eq(gecmisGun, 5, 'past effort days counted (3 plan days + 2 full-plan days)');
const hg = get('Dunya.hosgeldin()');
eq(hg.length, 5, 'one welcome item per past effort day');
ok(hg.every((r) => r.kaynak === 'gecmis' && r.renk === 0), 'welcome items are base items');
eq(get('Dunya.hosgeldin()'), [], 'welcome gift is given only once');
eq(get('Store.data.dunya.esyalar.map((x) => x.tur + "@" + x.yer)'), ['lavanta@pencere-sol', 'minder@hali-sol', 'lamba@kitaplik-ust', 'kitap@pencere-sag', 'celenk@pencere-ust'], 'welcome items placed in their spots');
ok(saved(store).dunya.hosgeldin > 0, 'welcome saved to storage');

// ======================================================================
// C. Bugün: ilk biten madde bir eşya; kaldır-yeniden işaretle ikinci eşya getirmez; gün tamamlanınca bir eşya daha
// ======================================================================
let before = get('Store.data.dunya.esyalar.length');
let r = get('Planlar.setDone("d1", true)');
ok(r && r.item.done, 'plan item completed');
eq(get('Store.data.dunya.esyalar.length'), before + 1, 'first completed item today brings one item');
eq(get('Store.data.dunya.odul["ilk:2026-10-25"]'), 'mum:0', 'reward recorded for today');
get('Planlar.setDone("d1", false)'); get('Planlar.setDone("d1", true)');
eq(get('Store.data.dunya.esyalar.length'), before + 1, 'uncheck and re-check gives no second item');
eq(get('Store.data.stats.planItems'), 15, 'Plancı counter counts the item once');
r = get('Planlar.setDone("d2", true)');
ok(r.fullDay, 'today plan is complete');
eq(get('Store.data.dunya.esyalar.length'), before + 2, 'completing the whole day brings one more item');
get('Planlar.setDone("d2", false)'); get('Planlar.setDone("d2", true)');
eq(get('Store.data.dunya.esyalar.length'), before + 2, 'full-day reward not repeated');
run('Planlar.add("day", "2026-10-25", { title: "Ekstra" })');
const extra = get('Planlar.list("day", "2026-10-25").find((x) => x.title === "Ekstra").id');
get(`Planlar.setDone("${extra}", true)`);
eq(get('Store.data.dunya.esyalar.length'), before + 2, 'at most two items a day');

// ertesi gün yeniden
NOW = T(26, 9);
run('Planlar.add("day", "2026-10-26", { title: "Yarın" })');
const yarin = get('Planlar.list("day", "2026-10-26")[0].id');
get(`Planlar.setDone("${yarin}", true)`);
eq(get('Store.data.dunya.esyalar.length'), before + 4, 'next day: one-item plan done = first-item gift + full-day gift');
// geçmiş bir günün maddesi bugün işaretlenirse o da bugünün adımıdır; bugün zaten ödül verildiyse yenisi gelmez
get('Planlar.setDone("a2", true)');
eq(get('Store.data.dunya.esyalar.length'), before + 4, 'old plan item checked later adds nothing more that day');

// ======================================================================
// D. Ara verilen günler: hiçbir şey kaybolmaz
// ======================================================================
const snap = get('Store.data.dunya');
NOW = T(9, 10, 10); // iki hafta sonra
run('Store.save()');
eq(get('Store.data.dunya'), snap, 'nothing is lost after a break');

// ======================================================================
// E. Sıra: önce tüm eşyalar, sonra renkler
// ======================================================================
const tumu = get('Dunya.ESYALAR.length'), renkli = get('Dunya.ESYALAR.filter((e) => e.renkli).length');
run(`(() => { for (let i = 0; i < 80; i++) Dunya.planBitti('x', false, Date.UTC(2027, 0, 1) + i * 864e5); })()`);
const es = get('Store.data.dunya.esyalar');
eq(es.length, tumu, 'every item earned once');
eq(es.reduce((a, x) => a + x.renkler.length, 0), tumu + renkli * 2, 'colour variants come after all items');
ok(es.every((x) => new Set(x.renkler).size === x.renkler.length), 'no duplicate colours');
const yerler = es.map((x) => x.yer).filter(Boolean);
eq(new Set(yerler).size, yerler.length, 'one item per spot');
ok(es.every((x) => !x.yer || get(`Dunya.yerleri("${x.tur}")`).includes(x.yer)), 'items only in allowed spots');

// ======================================================================
// F. Yer değiştirme ve renk seçimi
// ======================================================================
eq(get('Dunya.yerlestir("celenk", "yer-sol")'), false, 'garland cannot go on the floor');
const lamba0 = get('Store.data.dunya.esyalar.find((x) => x.tur === "lamba").yer');
const lav0 = get('Store.data.dunya.esyalar.find((x) => x.tur === "lavanta").yer');
eq(get(`Dunya.yerlestir("lavanta", "${lamba0}")`), true, 'move lavender onto the lamp spot');
eq(get('Store.data.dunya.esyalar.find((x) => x.tur === "lamba").yer'), lav0, 'lamp swaps into the old lavender spot');
eq(get('Dunya.yerlestir("lavanta", "")'), true, 'item can be put away');
eq(get('Store.data.dunya.esyalar.find((x) => x.tur === "lavanta").yer'), '', 'lavender in the cupboard');
eq(get('Dunya.renkSec("minder", 1)'), true, 'earned colour can be chosen');
eq(get('Dunya.renkSec("lamba", 1)'), false, 'single-colour item has no other colours');

// ======================================================================
// G. Mektuplar
// ======================================================================
const ml = get('Dunya.mektuplar().map((m) => m.id)');
eq(ml, ['ilk', 'm-adim'], 'first letter from the home card plus the new letter');
eq(get('Dunya.mektuplar().map((m) => Dunya.acilabilir(m))'), [true, true], 'letters open (14+ plan items done)');
const ic = get('Dunya.icerik(Dunya.mektuplar()[1])');
eq(ic.hitap, 'Güzel Hazal’ım,', 'letter decodes (greeting)');
eq(ic.paragraflar.length, 4, 'letter decodes (paragraphs)');
eq(ic.imza, 'Çağan', 'letter signature');
ok(!get('Dunya.okundu(Dunya.mektuplar()[1])'), 'new letter unread');
run('Dunya.oku(Dunya.mektuplar()[1])');
ok(get('Dunya.okundu(Dunya.mektuplar()[1])'), 'letter marked as read');
eq(saved(store).dunya.acildi['m-adim'], '2026-11-09', 'read date saved');
ok(get('Dunya.acilabilir({ kosul: { tur: "tarih", tarih: "2026-11-09" } })'), 'date letter opens on its day');
ok(!get('Dunya.acilabilir({ kosul: { tur: "tarih", tarih: "2026-11-10" } })'), 'date letter locked before its day');
ok(!get('Dunya.acilabilir({ kosul: { tur: "madde", sayi: 100 } })'), 'milestone letter locked until enough items');
// Çalış sekmesinde okunmuş ilk mektup kutuda da okunmuş görünür
({ get } = makeCtx(SEED, { 'luna-mektup-okundu': '1' }));
ok(get('Dunya.okundu(Dunya.mektuplar()[0])'), 'first letter read state shared with home card');
// mektup dosyasındaki her mektup çözülebilir
const all = get('Mektuplar.LISTE.map((m) => !!Mektuplar.coz(m.metin))');
ok(all.length && all.every(Boolean), 'every letter in mektuplar.js decodes');

// ======================================================================
// H. Kayıt düzeltme: bozuk alanlar düzelir, eşyalar silinmez; yedek birleştirme çoğaltmaz
// ======================================================================
const BOZUK = { ...SEED, dunya: { esyalar: [{ tur: 'minder', renk: 7, renkler: [0, 'x', 2], yer: 'hali-sol', at: 5 }, { tur: 'minder', yer: 'yer-sol' }, { tur: 'puf', yer: 'hali-sol' }, { tur: '<b>', yer: 'x' }, 'çöp', { tur: 'gelecek', yer: 'raf-2' }],
  odul: { 'ilk:2026-10-01': 'minder:0', kotu: 'x', 'tam:2026-10-02': 5 }, acildi: { 'm-adim': '2026-10-02', '<x>': '2026-10-02', a: 'dün' }, hosgeldin: 'çok' } };
({ get, run, store } = makeCtx(BOZUK));
const d2 = get('Store.data.dunya');
eq(d2.esyalar.map((x) => [x.tur, x.renk, x.renkler, x.yer]), [['minder', 0, [0, 2], 'hali-sol'], ['puf', 0, [0], ''], ['gelecek', 0, [0], 'raf-2']], 'broken items repaired, duplicates and junk dropped, unknown future item kept');
eq(d2.odul, { 'ilk:2026-10-01': 'minder:0' }, 'reward log cleaned');
eq(d2.acildi, { 'm-adim': '2026-10-02' }, 'read log cleaned');
eq(d2.hosgeldin, 0, 'welcome flag repaired');
// yedek birleştirme
const A = makeCtx(SEED);
A.run('Dunya.hosgeldin(); Planlar.setDone("d1", true)');
const yedek = A.get('Store.data');
const B2 = makeCtx(SEED);
B2.run('Dunya.hosgeldin()');
B2.run(`Store.mergeJSON(JSON.parse(${JSON.stringify(JSON.stringify(yedek))}))`);
const m2 = B2.get('Store.data.dunya.esyalar.map((x) => x.tur)');
eq(m2.length, new Set(m2).size, 'merging a backup never duplicates items');
ok(m2.includes('mum'), 'merging a backup brings items earned on the other copy');
eq(B2.get('Store.data.badges'), SEED.badges, 'badges intact after merge');
// eski sürüm (geri dönüş) Küçük Dünya verisini silmez: tanımadığı alanı olduğu gibi saklar
const eski = makeCtx(SEED);
eski.run('Dunya.hosgeldin()');
const kayit = saved(eski.store);
ok(kayit.dunya && kayit.dunya.esyalar.length === 5, 'world data written alongside old data');

console.log(`Küçük Dünya: ${n} kontrol geçti`);
