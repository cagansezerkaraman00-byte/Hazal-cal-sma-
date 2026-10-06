/* Üniversite (ve KPSS / yüksek lisans) modu: veri ve hesaplar.
   Dersler (kredi, AKTS, hoca, derslik, haftalık saatler), sınav/ödev takvimi, akademik takvim,
   devamsızlık, not ortalaması (harf notu + GANO), sınav tarihlerine göre otomatik çalışma planı,
   telefon takvimine aktarma (.ics). */

const Uni = (() => {
  const D = () => Store.data;
  const U_ = () => D().uni;
  const DAY_NAMES = ['', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  const DAY_SHORT = ['', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  // [simge, ad, "…-e" hâli, "…-i" hâli]: "Anatomi vizesine 3 gün", "Anatomi vizesi yarın"
  const EVENT_KINDS = {
    vize: ['📝', 'Vize', 'vizesine', 'vizesi'], final: ['🎯', 'Final', 'finaline', 'finali'], butunleme: ['🔁', 'Bütünleme', 'bütünlemesine', 'bütünlemesi'],
    quiz: ['❓', 'Quiz', "quiz'ine", "quiz'i"], sinav: ['🏁', 'Sınav', 'sınavına', 'sınavı'],
    odev: ['✍️', 'Ödev', 'teslimine', 'teslimi'], proje: ['📊', 'Proje', 'teslimine', 'teslimi'], sunum: ['🎤', 'Sunum', 'için', ''],
    lab: ['🧪', 'Lab / uygulama', 'teslimine', 'teslimi'], diger: ['📌', 'Diğer', 'için', ''],
  };
  const EXAM = new Set(['vize', 'final', 'butunleme', 'quiz', 'sinav']);
  const CAL_KINDS = { donem: ['🏫', 'Dönem'], vize: ['📝', 'Vize haftası'], final: ['🎯', 'Final haftası'], butunleme: ['🔁', 'Bütünleme'], tatil: ['🌴', 'Tatil'], kayit: ['🗂️', 'Kayıt / ders seçimi'], diger: ['📌', 'Diğer'] };
  // en yaygın harf notu tablosu (okullar farklı olabilir; ayarlardan değişmez, not ortalamasında düzenlenebilir)
  const LETTERS = [['AA', 90, 4], ['BA', 85, 3.5], ['BB', 80, 3], ['CB', 75, 2.5], ['CC', 70, 2], ['DC', 65, 1.5], ['DD', 60, 1], ['FD', 50, 0.5], ['FF', 0, 0]];
  const COLORS = ['#ff8fb5', '#ffb547', '#6cc4ff', '#a98bff', '#5fd3a3', '#ff9e7a', '#7fc8a9', '#c49bff', '#9fb4ff', '#e0a3c8', '#73d2c8', '#ffd84d'];

  const today = () => U.dateKey(new Date());
  const isoDay = (d) => ((new Date(d).getDay() + 6) % 7) + 1; // 1 = Pazartesi … 7 = Pazar
  function daysLeft(dateStr) {
    if (!dateStr) return null;
    return Math.round((new Date(dateStr + 'T12:00:00') - new Date(today() + 'T12:00:00')) / 864e5);
  }
  function leftText(n) {
    if (n == null) return '';
    if (n === 0) return 'bugün';
    if (n === 1) return 'yarın';
    if (n < 0) return `${-n} gün önce`;
    return `${n} gün`;
  }
  const mins = (hm) => { const [h, m] = String(hm || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const course = (id) => U_().courses.find((c) => c.id === id);
  const isProgramMode = () => (D().settings.profile.level || 'yks') !== 'yks';
  // devamsızlık, kredi ve not ortalaması yalnızca okulda anlamlı (KPSS'de dersler konu listesidir)
  const isSchool = () => ['uni', 'yl'].includes(D().settings.profile.level);
  const cap = (t) => t.charAt(0).toLocaleUpperCase('tr-TR') + t.slice(1);
  function evName(e) {
    const c = course(e.courseId), k = EVENT_KINDS[e.kind] || EVENT_KINDS.diger;
    if (EXAM.has(e.kind)) {
      const head = c ? c.name : e.title;
      return head ? { dat: `${head} ${k[2]}`, nom: `${head} ${k[3]}` } : { dat: cap(k[2]), nom: cap(k[3]) };
    }
    const head = [c && c.name, e.title || k[1]].filter(Boolean).join(' · ');
    return { dat: `${head} ${k[2]}`, nom: k[3] ? `${head} ${k[3]}` : head };
  }
  // "Anatomi vizesine 5 gün" · "Anatomi vizesi yarın" · "Anatomi vizesi bugün"
  function evLeft(e, n = daysLeft(e.date)) {
    const w = evName(e);
    return n === 0 ? `${w.nom} bugün` : n === 1 ? `${w.nom} yarın` : `${w.dat} ${n} gün`;
  }

  // ---------- Mod ve ders listeleri ----------
  // her modun kendi ders listesi var; geçişte aktif liste yer değiştirir (eski oturumların ders adları korunur)
  function setMode(level) {
    const s = D().settings, old = s.profile.level || 'yks';
    const oldSet = old === 'yks' ? 'yks' : 'program', newSet = level === 'yks' ? 'yks' : 'program';
    s.profile.level = level;
    if (oldSet !== newSet) {
      const sets = D().subjectSets || (D().subjectSets = {});
      sets[oldSet] = D().subjects.slice();
      D().subjects = (sets[newSet] && sets[newSet].length ? sets[newSet] : newSet === 'program' ? courseSubjects() : []).slice();
      if (newSet === 'program') syncSubjects();
    }
    Store.save();
  }
  function courseSubjects() { return U_().courses.map((c) => ({ id: c.subjectId, name: c.name, color: c.color })); }
  // dersler değişince sayaçtaki ders listesi de güncellenir
  function syncSubjects() {
    if (!isProgramMode()) return;
    for (const c of U_().courses) {
      const s = D().subjects.find((x) => x.id === c.subjectId);
      if (s) { s.name = c.name; s.color = c.color; } else D().subjects.push({ id: c.subjectId, name: c.name, color: c.color });
    }
  }

  // ---------- Dersler ----------
  function addCourse(data) {
    const id = U.uid();
    const c = {
      id, subjectId: 'c_' + id, code: '', name: 'Ders', credit: 3, ects: 5, instructor: '', room: '', color: COLORS[U_().courses.length % COLORS.length],
      slots: [], weeklyHours: 3, absLimit: D().uni.absPct || 30, absences: [], weights: [{ name: 'Vize', w: 40, score: null }, { name: 'Final', w: 60, score: null }],
      letter: '', topics: [], created: Date.now(), ...data,
    };
    U_().courses.push(c);
    syncSubjects();
    Store.save();
    return c;
  }
  function removeCourse(id) {
    const c = course(id);
    if (!c) return;
    U_().courses = U_().courses.filter((x) => x.id !== id);
    U_().events = U_().events.filter((e) => e.courseId !== id);
    // geçmiş oturumlar adını korusun diye ders arşive gider
    const sets = D().subjectSets || (D().subjectSets = {});
    (sets.archive || (sets.archive = [])).push({ id: c.subjectId, name: c.name, color: c.color });
    D().subjects = D().subjects.filter((s) => s.id !== c.subjectId);
    Store.save();
  }
  // KPSS Genel Yetenek - Genel Kültür dersleri ve konuları (ÖSYM KPSS kapsamı)
  const KPSS = [
    ['Türkçe', ['Sözcükte anlam', 'Cümlede anlam', 'Paragraf', 'Ses bilgisi', 'Yapı bilgisi', 'Sözcük türleri', 'Cümlenin öğeleri', 'Yazım kuralları', 'Noktalama işaretleri', 'Anlatım bozuklukları', 'Sözel mantık']],
    ['Matematik', ['Temel kavramlar', 'Sayılar ve basamak', 'Bölme ve bölünebilme', 'EBOB - EKOK', 'Rasyonel ve ondalık sayılar', 'Üslü ve köklü sayılar', 'Çarpanlara ayırma', 'Oran - orantı', 'Denklemler ve eşitsizlikler', 'Problemler', 'Kümeler ve fonksiyonlar', 'Permütasyon, kombinasyon, olasılık', 'Sayısal mantık', 'Geometri']],
    ['Tarih', ['İslamiyet öncesi Türk tarihi', 'İlk Türk-İslam devletleri', 'Osmanlı kuruluş ve yükselme', 'Osmanlı kültür ve medeniyeti', 'Osmanlı duraklama, gerileme, dağılma', 'XX. yüzyıl başında Osmanlı', 'Kurtuluş Savaşı hazırlık dönemi', 'Kurtuluş Savaşı', 'Atatürk ilke ve inkılapları', 'Atatürk dönemi dış politika', 'Çağdaş Türk ve dünya tarihi']],
    ['Coğrafya', ['Coğrafi konum', 'Yer şekilleri', 'İklim ve bitki örtüsü', 'Nüfus ve yerleşme', 'Tarım ve hayvancılık', 'Madenler ve enerji', 'Sanayi', 'Ulaşım, ticaret, turizm', 'Bölgesel coğrafya']],
    ['Vatandaşlık', ['Hukukun temel kavramları', 'Devlet biçimleri ve demokrasi', 'Türk anayasa tarihi', '1982 Anayasası temel ilkeleri', 'Temel hak ve özgürlükler', 'Yasama', 'Yürütme', 'Yargı', 'İdare hukuku', 'Uluslararası kuruluşlar']],
    ['Güncel bilgiler', ['Türkiye ve dünyadan güncel gelişmeler', 'Uluslararası kuruluşlar ve antlaşmalar', 'Kültür, sanat, bilim ve spor']],
  ];
  function addKpss() {
    let n = 0;
    for (const [name, topics] of KPSS) {
      if (U_().courses.some((c) => c.name.toLocaleLowerCase('tr-TR') === name.toLocaleLowerCase('tr-TR'))) continue;
      addCourse({ name, credit: 0, ects: 0, weeklyHours: 0, absLimit: 0, weights: [], topics: topics.map((title) => ({ week: '', title, done: false })) });
      n++;
    }
    return n;
  }
  // bir ders bloğu kaç ders saati: 50 dk ders + 10 dk teneffüs (09.00-10.50 → 2 saat)
  function slotHours(s) { return Math.max(1, Math.round((mins(s.end) - mins(s.start) + 10) / 60)); }
  function weeklyHours(c) {
    return c.slots.length ? c.slots.reduce((a, s) => a + slotHours(s), 0) : +c.weeklyHours || 0;
  }
  // devamsızlık: dönem haftası × haftalık saat × sınır yüzdesi
  function attendance(c) {
    const weeks = +U_().weeks || 14;
    const limit = Math.floor((weeklyHours(c) * weeks * (+c.absLimit || 30)) / 100);
    const used = c.absences.reduce((a, x) => a + (+x.hours || 0), 0);
    return { used, limit, left: Math.max(0, limit - used), ratio: limit ? used / limit : 0 };
  }

  // ---------- Notlar ----------
  function letterOf(score) {
    if (score == null || isNaN(score)) return null;
    return LETTERS.find((l) => score >= l[1]) || LETTERS[LETTERS.length - 1];
  }
  function courseScore(c) {
    const filled = c.weights.filter((w) => w.score != null && w.score !== '' && !isNaN(w.score));
    if (!filled.length) return null;
    const wSum = filled.reduce((a, w) => a + +w.w, 0);
    const done = c.weights.reduce((a, w) => a + +w.w, 0);
    const score = filled.reduce((a, w) => a + (+w.score * +w.w), 0) / (wSum || 1);
    return { score: Math.round(score * 10) / 10, complete: wSum >= done && done > 0, part: wSum };
  }
  // finalden kaç alınırsa hangi harf: geçmek (DD/CC) için gereken puan
  function needForFinal(c, target) {
    const fin = c.weights.find((w) => /final/i.test(w.name));
    if (!fin) return null;
    const others = c.weights.filter((w) => w !== fin);
    if (others.some((w) => w.score == null || w.score === '')) return null;
    const total = c.weights.reduce((a, w) => a + +w.w, 0) || 100;
    const have = others.reduce((a, w) => a + +w.score * +w.w, 0);
    const need = (target * total - have) / +fin.w;
    return Math.max(0, Math.ceil(need));
  }
  function coefOf(c) {
    if (c.letter) { const l = LETTERS.find((x) => x[0] === c.letter); return l ? l[2] : null; }
    const s = courseScore(c);
    if (!s || !s.complete) return null;
    return letterOf(s.score)[2];
  }
  function gpa() {
    let cr = 0, sum = 0;
    for (const c of U_().courses) {
      const k = coefOf(c);
      const w = U_().gpaBy === 'ects' ? +c.ects || 0 : +c.credit || 0;
      if (k == null || !w) continue;
      cr += w; sum += k * w;
    }
    const term = cr ? sum / cr : null;
    let tCr = cr, tSum = sum;
    for (const p of U_().pastTerms || []) { if (+p.credits && p.gpa != null) { tCr += +p.credits; tSum += +p.gpa * +p.credits; } }
    return { term: term == null ? null : Math.round(term * 100) / 100, overall: tCr ? Math.round((tSum / tCr) * 100) / 100 : null, credits: cr };
  }

  // ---------- Takvim ----------
  function upcoming(days = 30) {
    const t = today();
    return U_().events.filter((e) => !e.done && e.date >= t && daysLeft(e.date) <= days).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  }
  function classesOn(date) {
    const d = isoDay(date), out = [];
    for (const c of U_().courses) for (const s of c.slots) if (+s.day === d) out.push({ course: c, slot: s });
    return out.sort((a, b) => mins(a.slot.start) - mins(b.slot.start));
  }
  function weekOfTerm(date = new Date()) {
    const st = U_().termStart;
    if (!st) return null;
    const w = Math.floor((new Date(U.dateKey(date) + 'T12:00:00') - new Date(st + 'T12:00:00')) / (7 * 864e5)) + 1;
    return w >= 1 ? w : null;
  }
  // akademik takvimde sıradaki önemli dönem (vize/final haftası…)
  function nextCalendar() {
    const t = today();
    return (U_().calendar || []).filter((x) => (x.end || x.date) >= t).sort((a, b) => a.date.localeCompare(b.date))[0] || null;
  }

  // ---------- Otomatik çalışma planı ----------
  // sınava kalan gün → tekrar turu (aralıklı tekrar: sınava yaklaştıkça sıklaşır)
  const EXAM_STEPS = { 21: 'ilk tarama, konu listesini çıkar', 14: '1. tekrar turu', 10: '2. tekrar turu + soru', 7: 'zayıf konular + soru çözümü', 5: 'karma soru / eski sınavlar', 3: 'son büyük tekrar', 2: 'özetler + hata defteri', 1: 'hafif son tekrar, erken uyu' };
  const TASK_STEPS = { 7: 'planla ve kaynakları topla', 4: 'taslağı çıkar', 2: 'bitir ve gözden geçir', 1: 'son kontrol ve teslim' };
  function planFor(date) {
    const key = U.dateKey(date), items = [];
    const left = (e) => Math.round((new Date(e.date + 'T12:00:00') - new Date(key + 'T12:00:00')) / 864e5);
    for (const e of U_().events) {
      if (e.done) continue;
      const n = left(e), c = course(e.courseId), w = c ? Math.max(1, +c.ects || +c.credit || 3) : 3;
      if (EXAM.has(e.kind) && EXAM_STEPS[n]) {
        items.push({ id: `ex:${e.id}:${n}`, kind: 'exam', courseId: e.courseId, prio: 100 - n + w, min: Math.min(120, Math.round((n <= 3 ? 50 : 35) + w * 5)), text: `${evLeft(e, n)}: ${EXAM_STEPS[n]}` });
      } else if (!EXAM.has(e.kind) && TASK_STEPS[n]) {
        items.push({ id: `tk:${e.id}:${n}`, kind: 'task', courseId: e.courseId, prio: 80 - n, min: n <= 2 ? 60 : 40, text: `${evLeft(e, n)}: ${TASK_STEPS[n]}` });
      }
    }
    // bugünkü derslerin aynı gün tekrarı (24 saat içinde tekrar unutmayı ciddi azaltır)
    for (const { course: c } of classesOn(date)) {
      if (items.some((x) => x.id === `rv:${c.id}`)) continue;
      items.push({ id: `rv:${c.id}`, kind: 'review', courseId: c.id, prio: 40 + (+c.ects || 3), min: 25, text: `${c.name}: bugünkü dersi tekrar et, 3 soru yaz` });
    }
    const done = new Set((U_().done || {})[key] || []);
    return items.sort((a, b) => b.prio - a.prio).slice(0, 7).map((x) => ({ ...x, done: done.has(x.id) }));
  }
  function toggleDone(date, id) {
    const key = U.dateKey(date), d = U_().done || (U_().done = {});
    const set = new Set(d[key] || []);
    set.has(id) ? set.delete(id) : set.add(id);
    d[key] = [...set];
    // 30 günden eski kayıtları temizle
    const cut = U.dateKey(U.addDays(new Date(), -30));
    for (const k of Object.keys(d)) if (k < cut) delete d[k];
    Store.save();
    return set.has(id);
  }

  // ---------- Telefon takvimine aktarma (.ics) ----------
  function ics() {
    const esc = (s) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
    const dt = (d, t) => d.replace(/-/g, '') + (t ? 'T' + t.replace(':', '') + '00' : '');
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Luna ile Calis//TR', 'CALSCALE:GREGORIAN'];
    const ev = (uid, start, end, title, desc, extra = []) => {
      lines.push('BEGIN:VEVENT', `UID:${uid}@luna`, `DTSTAMP:${stamp}`);
      lines.push(start.length === 8 ? `DTSTART;VALUE=DATE:${start}` : `DTSTART:${start}`);
      if (end) lines.push(end.length === 8 ? `DTEND;VALUE=DATE:${end}` : `DTEND:${end}`);
      lines.push(`SUMMARY:${esc(title)}`);
      if (desc) lines.push(`DESCRIPTION:${esc(desc)}`);
      lines.push(...extra, 'END:VEVENT');
    };
    const nextDay = (d) => U.dateKey(U.addDays(new Date(d + 'T12:00:00'), 1)).replace(/-/g, '');
    for (const e of U_().events) {
      const c = course(e.courseId);
      const title = `${EVENT_KINDS[e.kind][0]} ${c ? c.name + ' ' : ''}${e.title || EVENT_KINDS[e.kind][1]}`;
      if (e.time) ev(e.id, dt(e.date, e.time), dt(e.date, U.pad(Math.min(23, +e.time.slice(0, 2) + 2)) + e.time.slice(2)), title, e.note, ['BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${esc(title)}`, 'END:VALARM']);
      else ev(e.id, dt(e.date), nextDay(e.date), title, e.note, ['BEGIN:VALARM', 'TRIGGER:-PT15H', 'ACTION:DISPLAY', `DESCRIPTION:${esc(title)}`, 'END:VALARM']);
    }
    for (const x of U_().calendar || []) ev('cal' + x.id, dt(x.date), nextDay(x.end || x.date), `${(CAL_KINDS[x.kind] || CAL_KINDS.diger)[0]} ${x.title}`, '');
    // haftalık dersler: dönem sonuna kadar tekrar
    const first = U_().termStart || today();
    const until = (U_().termEnd || U.dateKey(U.addDays(new Date(first + 'T12:00:00'), 7 * (+U_().weeks || 14)))).replace(/-/g, '') + 'T235959';
    for (const c of U_().courses) {
      c.slots.forEach((s, i) => {
        const base = new Date(first + 'T12:00:00');
        const delta = (+s.day - isoDay(base) + 7) % 7;
        const d0 = U.dateKey(U.addDays(base, delta));
        ev(`cls${c.id}${i}`, dt(d0, s.start), dt(d0, s.end), `${c.code ? c.code + ' ' : ''}${c.name}`, [c.instructor, s.room || c.room].filter(Boolean).join(' · '), [`RRULE:FREQ=WEEKLY;UNTIL=${until}`]);
      });
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  const validDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !isNaN(new Date(s + 'T12:00:00'));
  const validTime = (s) => /^\d{2}:\d{2}$/.test(s || '');

  return {
    DAY_NAMES, DAY_SHORT, EVENT_KINDS, CAL_KINDS, LETTERS, COLORS, EXAM,
    isProgramMode, isSchool, evName, evLeft, addKpss, setMode, syncSubjects, addCourse, removeCourse, course, weeklyHours, slotHours, attendance,
    letterOf, courseScore, needForFinal, coefOf, gpa, upcoming, classesOn, weekOfTerm, nextCalendar,
    planFor, toggleDone, daysLeft, leftText, isoDay, ics, validDate, validTime, mins,
  };
})();

if (typeof window !== 'undefined') { window.Uni = Uni; }
