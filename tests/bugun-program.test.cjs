// Run: node tests/bugun-program.test.cjs
// Bugün kartındaki program (2.9): günün oturumları o günün plan maddelerine dağıtılır, maddeden başlatılan oturum
// maddeye bağlı kaydedilir, madde kendiliğinden işaretlenmez, süre hedefi sorulmaz ama eski hedefler silinmez.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

let n = 0;
const ok = (v, label) => { assert.ok(v, label); n++; };
const eq = (a, b, label) => { assert.deepStrictEqual(a, b, label); n++; };

let NOW = new Date(2026, 9, 26, 21, 0).getTime();
class FDate extends Date {
  constructor(...a) { if (a.length) super(...a); else super(NOW); }
  static now() { return NOW; }
}
const T = (h, m = 0, d = 26) => new FDate(2026, 9, d, h, m).getTime();
const DAY = '2026-10-26';
const item = (id, title, subjectId, extra = {}) => ({ id, title, subjectId, topicId: '', min: 0, q: 0, done: false, doneAt: 0, moved: '', from: '', src: '', counted: false, created: 1, updated: 1, ...extra });
const SEED = {
  version: 1,
  settings: { name: 'Hazal', dailyGoal: 600, msgInterval: 20 },
  subjects: [
    { id: 'y_tr', name: 'Türkçe', color: '#ff8fb5' }, { id: 'y_mat', name: 'Matematik', color: '#ffb547' },
    { id: 'y_fiz', name: 'Fizik', color: '#6cc4ff' }, { id: 'y_kim', name: 'Kimya', color: '#a98bff' },
  ],
  plans: {
    day: {
      [DAY]: [
        item('p1', 'Cümlenin Ögeleri', 'y_tr', { min: 90 }),
        item('p2', 'Problemler', 'y_mat'),
        item('p3', 'Fonksiyonlar', 'y_mat'),
        item('p4', 'Mol kavramı', 'y_kim'),
        item('p5', 'Taşınan', 'y_fiz', { moved: '2026-10-27' }),
        { id: 'p6', del: true, updated: 1 },
      ],
    },
    week: {}, month: {}, eod: {}, eodSeq: {},
  },
  sessions: [
    { id: 's1', start: T(9), end: T(10, 10), minutes: 70, subjectId: 'y_tr', planId: 'p1' }, // maddeden
    { id: 's2', start: T(11), end: T(11, 40), minutes: 40, subjectId: 'y_tr' },               // ana Başla, tek Türkçe maddesi
    { id: 's3', start: T(12), end: T(12, 30), minutes: 30, subjectId: 'y_mat' },              // iki Matematik maddesi: plan dışı
    { id: 's4', start: T(13), end: T(13, 50), minutes: 50, subjectId: 'y_mat', planId: 'p3' }, // ama maddeden başlatıldıysa ona
    { id: 's5', start: T(14), end: T(14, 20), minutes: 20, subjectId: 'y_fiz' },              // Fizik maddesi taşındı: plan dışı
    { id: 's6', start: T(15), end: T(15, 15), minutes: 15, subjectId: '' },                   // Genel
    { id: 's7', start: T(16), end: T(16, 25), minutes: 25, subjectId: 'y_kim', planId: 'silinmis' }, // madde yok: dersine bakılır
    { id: 's8', start: T(23, 0, 25), end: T(23, 50, 25), minutes: 50, subjectId: 'y_tr', planId: 'p1' }, // dün: sayılmaz
    { id: 's9', start: T(17), end: T(17, 0), minutes: 0.5, subjectId: 'y_kim' },             // yarım dakika
  ],
};

function makeCtx(seed) {
  const store = { 'luna-study-v1': JSON.stringify(seed) };
  const fakeLS = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  const ctx = vm.createContext({ localStorage: fakeLS, console, Date: FDate, Math, JSON, setInterval: () => 0 });
  for (const f of ['js/storage.js', 'js/messages.js', 'js/planlar.js', 'js/timer.js']) vm.runInContext(read(f), ctx, { filename: f });
  const run = (code) => vm.runInContext(code, ctx);
  const get = (expr) => { const s = run(`JSON.stringify(${expr})`); return s === undefined ? undefined : JSON.parse(s); };
  return { run, get, store };
}

// ---------- A. Günün oturumları maddelere dağıtılır ----------
let { run, get } = makeCtx(SEED);
const before = get('Store.data');
const w = get(`Planlar.dayWork("${DAY}")`);
eq(w.items.p1, 110, 'planId oturumu (70) + tek Türkçe maddesine giden ana Başla oturumu (40)');
eq(w.items.p2, undefined, 'iki Matematik maddesi varken dersten tahmin edilmez');
eq(w.items.p3, 50, 'maddeden başlatılan Matematik oturumu kendi maddesine');
eq(w.items.p4, 26, 'silinmiş planId: tek Kimya maddesine (25 + yarım dk)');
eq(w.items.p5, undefined, 'taşınan maddeye süre yazılmaz');
eq(w.extra, { y_mat: 30, y_fiz: 20, '': 15 }, 'plan dışı: ders başına');
eq(w.total, 251, 'maddeler + plan dışı = günün toplamı (dünkü oturum hariç)');
eq(Object.values(w.items).reduce((a, b) => a + b, 0) + Object.values(w.extra).reduce((a, b) => a + b, 0), w.total, 'hiçbir dakika iki kez sayılmaz');
eq(get(`Planlar.dayWork("2026-10-27")`), { items: {}, extra: {}, total: 0 }, 'boş gün');
eq(get(`Planlar.dayWork("26-10-2026")`), { items: {}, extra: {}, total: 0 }, 'bozuk anahtar');
eq(get('Store.data'), before, 'dayWork hiçbir kaydı değiştirmez, plan oluşturmaz');

// ---------- B. Maddeden başlatılan oturum kendiliğinden işaretlenmez ----------
eq(run(`Planlar.onSession({ intent: "Problemler", planId: "p2", start: ${T(18)} })`), null, 'planId olan oturum maddeyi işaretlemez');
eq(get('Planlar.find("p2").item.done'), false, 'madde açık kaldı (işareti Hazal koyar)');
eq(get(`Planlar.onSession({ intent: "Problemler", start: ${T(18)} })`).id, 'p2', 'eski yol (planId yok) olduğu gibi çalışıyor');

// ---------- C. Seçilen madde: sayaç ona sayar, seçim oturumlar arasında kalır ----------
({ run, get } = makeCtx(SEED));
run('var parts = [], got = null; Timer.init({ onFocusPart: (s) => parts.push(s), onFocusDone: (s) => { got = s; } }); Timer.setKind("free");');
run('Timer.setPlan("p4", "y_kim")');
eq(get('[Timer.state().planId, Timer.state().subjectId]'), ['p4', 'y_kim'], 'dokunulan madde ve dersi seçildi');
eq(get('Timer.state().countdown'), false, 'kronometre: kendiliğinden bitmez');
NOW = T(18); run('Timer.toggle()');
NOW = T(20, 10); // 2 sa 10 dk
eq(get('Timer.state().running'), true, '2 sa 10 dk sonra hâlâ sayıyor');
run('Timer.finish()');
eq(get('[got.planId, got.minutes, got.subjectId, got.kind, parts.length]'), ['p4', 130, 'y_kim', 'free', 0], 'oturum maddeye bağlı, 130 dakikanın hepsi sayıldı');
eq(get('Store.data.sessions[Store.data.sessions.length - 1].id'), 's9', 'Timer oturumu listeye kendisi yazmaz (App yazar)');
eq(get('Timer.state().planId'), 'p4', 'bitince seçim kalır: Başla yine bu maddeye sayar');
run('Timer.reset()'); eq(get('Timer.state().planId'), 'p4', 'sıfırlayınca da seçim kalır');
run('Timer.setKind("countdown"); Timer.setKind("free")'); eq(get('Timer.state().planId'), 'p4', 'sayaç türü değişince de');
run('Timer.setPlan(42)'); eq(get('Timer.state().planId'), '', 'geçersiz değer seçimi kaldırır');
run('Timer.setSubject("y_tr");'); NOW = T(23); run('Timer.toggle()'); NOW = T(23, 5); run('Timer.finish()');
ok(!('planId' in get('got')), 'maddesiz oturumda planId alanı yok');

// ---------- D. Sayaç çalışırken başka maddeye geçmek: sayaç sıfırlanmaz, süre maddelere bölünür ----------
({ run, get } = makeCtx(SEED));
run('var parts = [], got = null; Timer.init({ onFocusPart: (s) => parts.push(s), onFocusDone: (s) => { got = s; } }); Timer.setKind("free"); Timer.setPlan("p1", "y_tr");');
NOW = T(9); run('Timer.toggle()');
NOW = T(9, 40); run('Timer.setPlan("p2", "y_mat")');
eq(get('[Timer.state().running, Math.round(Timer.state().elapsed)]'), [true, 2400], 'geçişte sayaç durmadı, sıfırlanmadı (40:00)');
NOW = T(9, 40) + 30000; run('Timer.setPlan("p3", "y_mat")'); // 30 sn sonra fikir değişti: ayrı parça olmaz
eq(get('Timer.state().segs.length'), 1, 'bir dakikadan kısa parça ayrılmaz');
NOW = T(10, 10); run('Timer.toggle()'); // duraklat
NOW = T(10, 20); run('Timer.setPlan("p4", "y_kim")'); // duraklatılmışken geçiş
NOW = T(10, 30); run('Timer.toggle()'); // devam
NOW = T(11); run('Timer.finish()');
eq(get('parts.map((p) => [p.planId, p.subjectId, p.minutes, p.endReason])'), [['p1', 'y_tr', 40, 'part'], ['p3', 'y_mat', 30, 'part']], 'önceki maddeler sessizce kaydedildi');
eq(get('[got.planId, got.subjectId, got.minutes, got.endReason]'), ['p4', 'y_kim', 30, 'manual'], 'son madde normal oturum olarak bitti');
eq(get('[parts[0].start, parts[0].end, parts[1].start, parts[1].end, got.start, got.end]'), [T(9), T(9, 40), T(9, 40), T(10, 10), T(10, 30), T(11)], 'parçaların saatleri doğru (duraklama arası sayılmaz)');
eq(get('parts.reduce((n, p) => n + p.minutes, 0) + got.minutes'), 100, 'toplam süre değişmedi');
eq(get('[Timer.state().segs.length, Timer.state().segAt, Timer.state().planId]'), [0, 0, 'p4'], 'yeni oturum temiz başlar, seçim kalır');
// son maddeye bir dakika kalmadan bitirildi: önceki parça son oturumdur
({ run, get } = makeCtx(SEED));
run('var parts = [], got = null; Timer.init({ onFocusPart: (s) => parts.push(s), onFocusDone: (s) => { got = s; } }); Timer.setKind("free"); Timer.setPlan("p1", "y_tr");');
NOW = T(9); run('Timer.toggle()'); NOW = T(9, 30); run('Timer.setPlan("p4", "y_kim")'); NOW = T(9, 30) + 20000; run('Timer.finish()');
eq(get('[parts.length, got.planId, got.minutes]'), [0, 'p1', 30], 'yarım dakikalık son parça ayrı oturum olmaz');
// gece yarısını geçen duraklatılmış oturum: bağ devam eden parçada kalır
({ run, get } = makeCtx(SEED));
run('var done = []; Timer.init({ onFocusDone: (s) => done.push(s) }); Timer.setKind("free"); Timer.setPlan("p1", "y_tr");');
NOW = T(22); run('Timer.toggle()'); NOW = T(23); run('Timer.toggle()');
NOW = new FDate(2026, 9, 27, 9, 0).getTime(); run('Timer.toggle()');
eq(get('done.map((p) => [p.planId, p.minutes, p.endReason])'), [['p1', 60, 'split']], 'dünkü parça maddeye bağlı kaydedildi');
eq(get('Timer.state().planId'), 'p1', 'bugünkü parça aynı maddeyle sürüyor');
// eski sürümden kalan sayaç durumu (segs alanı yok) bozulmaz
({ run, get } = makeCtx({ ...SEED, timer: { kind: 'free', phase: 'focus', running: false, accum: 0, cycle: 0, subjectId: 'y_tr', intent: '' } }));
run('var got = null; Timer.init({ onFocusDone: (s) => { got = s; } });');
NOW = T(9); run('Timer.toggle()'); NOW = T(9, 30); run('Timer.setPlan("p4", "y_kim")'); NOW = T(10); run('Timer.finish()');
eq(get('[got.planId, got.minutes]'), ['p4', 30], 'eski sayaç durumuyla da parçalar çalışıyor');

// ---------- E. Arayüz: süre hedefi sorulmaz, eski hedef silinmez ----------
const ui = read('js/planlar-ui.js');
ok(!/data-f="hours"/.test(ui) && !/Hedef süre/.test(ui), 'formda ve çizelgede "Hedef süre" yok');
ok(!/data-mp="go"/.test(ui) && !/plan-go/.test(ui), 'planda "Başla ▶" yok: maddeye dokunmak oturum başlatmaz');
ok(/data-mp="pick"/.test(ui) && /App\.pickPlanItem/.test(ui), 'Bugün kartında maddeye dokununca sayaç ona sayar');
ok(/function weekPlanHtml/.test(ui) && /data-mp="add" data-scope="day" data-key="\$\{k\}"/.test(ui), 'haftalık görünümde her günün kendi ＋ düğmesi');
ok(!/'📖 ' \+ s\.intent/.test(read('js/app.js')), 'sayaçta konu adı yazmıyor');
ok(!/function quickForm/.test(ui), 'planda serbest yazı kutusu yok: ders ve konu yeter');
ok(/<th scope="col">Çalıştığın<\/th>/.test(ui), 'çizelgede "Çalıştığın" sütunu');
ok(!/\bmin:\s*minutes\b/.test(ui), 'kaydederken min gönderilmez (eski hedef yerinde kalır)');
({ run, get } = makeCtx(SEED));
run('Planlar.update("p1", { title: "Cümlenin Ögeleri (tekrar)", subjectId: "y_tr", topicId: "" })');
eq(get('Planlar.find("p1").item.min'), 90, 'min gönderilmeyen güncelleme eski hedefi silmez');
const html = read('index.html');
const order = ['class="card timer-card"', 'class="card today-card"', 'id="music-card"', 'id="love-card"'].map((k) => html.indexOf(k));
ok(order.every((x, i) => x > 0 && (i === 0 || x > order[i - 1])), 'sıra: sayaç → Bugün → müzik → gizli not');
ok(/id="today-program"/.test(html) && /id="today-legacy" class="hidden"/.test(html), 'Bugün kartında program; eski kutucuklar yalnızca dönem modunda');

console.log(`bugun-program: ${n} checks passed`);
