// Run: node tests/eksik-tasima.test.cjs
// 2.10: bitmeyen plan maddeleri ertesi sabah (05:00'ten sonra) kendiliğinden bugüne geçer; eski gününde "eksik kaldı"
// izi kalır. Tekrar listesi kalktı (veri silinmez). Sticker defterlerinden yalnızca Ay Işığı açık.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let n = 0;
const ok = (v, label) => { assert.ok(v, label); n++; };
const eq = (a, b, label) => { assert.deepStrictEqual(a, b, label); n++; };

let NOW = new Date(2026, 9, 27, 9, 0).getTime();
class FDate extends Date {
  constructor(...a) { if (a.length) super(...a); else super(NOW); }
  static now() { return NOW; }
}
const item = (id, title, subjectId, extra = {}) => ({ id, title, subjectId, topicId: '', min: 0, q: 0, done: false, doneAt: 0, moved: '', from: '', src: '', counted: false, created: 1, updated: 1, ...extra });
const SEED = {
  version: 1,
  settings: { name: 'Hazal', defter: 'leylak-inci' },
  review: [{ id: 'r1', text: 'Türev', subjectId: '', created: 1, done: false }],
  plans: {
    day: {
      '2026-10-15': [item('o1', 'Çok eski', 'y_mat')],                  // 12 gün önce: taşınmaz
      '2026-10-24': [item('a1', 'Paragraf', 'y_tr'), item('a2', 'Bitti', 'y_tr', { done: true, counted: true })],
      '2026-10-26': [item('b1', 'Problemler', 'y_mat'), item('b2', 'Paragraf', 'y_tr'), item('b3', 'Optik', 'y_fiz', { done: true, counted: true })],
      '2026-10-27': [item('c1', 'Kimya', 'y_kim')],
    },
    week: {}, month: {}, eod: {}, eodSeq: {},
  },
};
function makeCtx(seed) {
  const store = { 'luna-study-v1': JSON.stringify(seed) };
  const fakeLS = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  const ctx = vm.createContext({ localStorage: fakeLS, console, Date: FDate, Math, JSON });
  for (const f of ['js/storage.js', 'js/messages.js', 'js/planlar.js']) vm.runInContext(read(f), ctx, { filename: f });
  const run = (code) => vm.runInContext(code, ctx);
  const get = (expr) => { const s = run(`JSON.stringify(${expr})`); return s === undefined ? undefined : JSON.parse(s); };
  return { run, get };
}
const titles = (get, k) => get(`Planlar.list("day", "${k}").filter((x) => !x.moved).map((x) => x.title + (x.from ? "<" + x.from : "") + (x.done ? "✓" : ""))`);

// ---------- A. gece 01:00: dün (26) henüz kapanmadı; ondan öncekiler taşınır ----------
NOW = new Date(2026, 9, 27, 1, 0).getTime();
let { run, get } = makeCtx(SEED);
eq(get('Planlar.autoCarry()'), { count: 1, moved: 1 }, '01:00: yalnızca 24 Ekim’in bitmeyeni taşındı');
eq(titles(get, '2026-10-27'), ['Kimya', 'Paragraf<2026-10-24'], 'bugüne eklendi, nereden geldiği yazılı');
eq(titles(get, '2026-10-26'), ['Problemler', 'Paragraf', 'Optik✓'], 'dün gece yarısından sonra hâlâ yerinde');
eq(get('Planlar.find("a1").item.moved'), '2026-10-27', 'eski gününde iz: bugüne geçti');
eq(get('Planlar.find("a2").item.moved'), '', 'biten madde taşınmaz');
eq(get('Planlar.find("o1").item.moved'), '', '7 günden eski madde kendi gününde kalır');

// ---------- B. sabah 09:00: dün de kapandı ----------
NOW = new Date(2026, 9, 27, 9, 0).getTime();
eq(get('Planlar.autoCarry()'), { count: 1, moved: 2 }, '09:00: dünün iki bitmeyeni; "Paragraf" zaten bugünde olduğu için ikinci kez eklenmedi');
eq(titles(get, '2026-10-27'), ['Kimya', 'Paragraf<2026-10-24', 'Problemler<2026-10-26'], 'bugünün planı');
eq(get('[Planlar.find("b1").item.moved, Planlar.find("b2").item.moved, Planlar.find("b3").item.moved]'), ['2026-10-27', '2026-10-27', ''], 'dünün eksikleri işaretli, biteni yerinde');
eq(get('Planlar.stats(Planlar.list("day", "2026-10-26"))').moved, 2, 'dünün istatistiğinde 2 eksik');
eq(get('Planlar.autoCarry()'), { count: 0, moved: 0 }, 'ikinci çalıştırma bir şey yapmaz');
eq(get('Planlar.roll("week", "2026-10-26").days.moved'), 2, 'haftalık özette eksik kalanlar sayılıyor');
// taşınan madde bugün bitirilince eski gün eksik olarak kalır, yenisi tamam
const copy = get('Planlar.list("day", "2026-10-27").find((x) => x.src === "b1").id');
run(`Planlar.setDone("${copy}", true)`);
eq(get('Planlar.find("b1").item.moved'), '2026-10-27', 'eski gündeki iz silinmez');
// geri alınabilir: düzenleme penceresindeki "taşımayı geri al"
eq(run('Planlar.uncarry("b2")'), true, 'taşıma geri alınabilir');
eq(get('Planlar.find("b2").item.moved'), '', 'madde eski gününe döndü');
eq(get('Store.data.review'), SEED.review, 'tekrar listesi verisi silinmedi');

// ---------- C. hiç plan yokken ya da ileri tarihte bir şey olmaz ----------
({ run, get } = makeCtx({ version: 1, settings: { name: 'Hazal' } }));
eq(get('Planlar.autoCarry()'), { count: 0, moved: 0 }, 'boş planda sessiz');
eq(get('Store.data.plans.day'), {}, 'okurken madde ya da gün oluşturulmaz');

// ---------- D. arayüz ----------
const ui = read('js/planlar-ui.js'), app = read('js/app.js'), html = read('index.html'), tk = read('js/takvim-ui.js');
ok(/carryOver\(\); \}/.test(ui) && /Planlar\.autoCarry\(now\)/.test(ui), 'açılışta ve düzenli aralıkla taşınıyor');
ok(/eksik kaldı → /.test(ui) && /↪ dünden/.test(ui), 'haftalıkta "eksik kaldı", bugünde "↪ dünden"');
ok(/function autoPickPlan/.test(app) && /if \(s\.fresh && s\.phase === 'focus'\) autoPickPlan\(\);/.test(app), 'Başla’da seçili madde yoksa bugünün ilk bitmemiş maddesi seçilir');
ok(!/id="review-form"/.test(html) && !/Tekrar listesi<\/h2>/.test(html), 'Plan sekmesinde tekrar listesi yok');
ok(!/id="m-hard"/.test(app) && /hard: s\.hard \|\| ''/.test(app), 'oturum penceresinde "zorlandığın yer" yok, eski yazı korunuyor');
ok(!/data-act="review"/.test(read('js/deneme.js')), 'denemede 📌 tekrar listesine ekle düğmesi yok');
ok(!/Tekrar listende/.test(read('js/stats.js')), 'raporda tekrar listesi önerisi yok');
// sticker defterleri: yalnızca Ay Işığı
const defter = tk.slice(tk.indexOf('const DEFTERLER = {'), tk.indexOf('};', tk.indexOf('const DEFTERLER = {')));
const ids = [...defter.matchAll(/'([a-z-]+)': \{ ad: '([^']+)'[^\n]*/g)].map((m) => [m[1], m[2], /kilitli: true/.test(m[0])]);
eq(ids.map((x) => x[1]), ['Ay Işığı', 'İnci Düşü', 'Gül Kurusu', 'Saklı Bahçe', 'Mavi Rüya'], 'Ay Işığı başta, öbürleri yerinde duruyor');
eq(ids.map((x) => x[2]), [false, true, true, true, true], 'yalnızca Ay Işığı açık, dördü kilitli');
ok(/if \(acik\(s\)\) return s;/.test(tk) && /return acik\(tema\) \? tema : ACIK\[0\];/.test(tk), 'kilitli bir defter seçiliyse (eski ayar) Ay Işığı açılır, ayar silinmez');
ok(/ACIK\.length > 1 \? `<div class="df-secici"/.test(tk) && /ACIK\.length > 1 \? '<button type="button" class="df-renk"/.test(tk), 'tek defter açıkken seçici ve kapak düğmesi görünmez');
for (const id of ['siyah-yildizli', 'leylak-inci', 'pembe-kurdele', 'krem-botanik', 'mavi-kelebek']) ok(fs.existsSync(path.join(root, 'assets/defter', id, 'kapak.webp')), `${id} kapağı saklı (silinmedi)`);

console.log(`eksik-tasima: ${n} checks passed`);
