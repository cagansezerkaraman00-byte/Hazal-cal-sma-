/* Luna — veri katmanı ve küçük yardımcılar.
   Her şey tarayıcının localStorage'ında saklanır; sunucu yok. */

const U = {
  pad: (n) => String(n).padStart(2, '0'),
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a, b) => a + Math.random() * (b - a),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7),

  dateKey(d) {
    d = new Date(d);
    return `${d.getFullYear()}-${U.pad(d.getMonth() + 1)}-${U.pad(d.getDate())}`;
  },
  dayStart(d) {
    d = new Date(d);
    d.setHours(0, 0, 0, 0);
    return d;
  },
  addDays(d, n) {
    d = new Date(d);
    d.setDate(d.getDate() + n);
    return d;
  },
  hm(d) {
    d = new Date(d);
    return `${U.pad(d.getHours())}:${U.pad(d.getMinutes())}`;
  },
  // Türkçe ondalık: 3,25 (dec: sabit basamak, num: olduğu gibi)
  dec(n, d = 1) { return Number(n || 0).toFixed(d).replace('.', ','); },
  num(n) { return String(n).replace('.', ','); },
  fmtMin(m) {
    if (m > 0 && m < 1) return `${Math.max(1, Math.round(m * 60))} sn`;
    m = Math.round(m || 0);
    if (m < 60) return `${m} dk`;
    const h = Math.floor(m / 60), r = m % 60;
    return r ? `${h} sa ${r} dk` : `${h} sa`;
  },
  // İlerleme'deki süreler: 1 sa 05 dk 03 sn · 40 dk 00 sn · 12 sn
  fmtSec(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h ? `${h} sa ${U.pad(m)} dk ${U.pad(s)} sn` : m ? `${m} dk ${U.pad(s)} sn` : `${s} sn`;
  },
  fmtClock(sec) {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h ? `${h}:${U.pad(m)}:${U.pad(s)}` : `${U.pad(m)}:${U.pad(s)}`;
  },
  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  DAYS: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
  DAYS_SHORT: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
  MONTHS: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
};

// Hata günlüğü: telefonda konsol yok; son 20 hata Ayarlar → Tanılama'da görünür (yalnızca bu cihazda)
const ErrLog = (() => {
  const KEY = 'luna-errors';
  const read = () => { try { const l = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
  function add(m, s) {
    try {
      const l = read();
      const msg = String(m || 'Bilinmeyen hata').slice(0, 300);
      const last = l[l.length - 1];
      if (last && last.m === msg && Date.now() - last.t < 10000) last.n = (last.n || 1) + 1; // aynı hata art arda: say
      else l.push({ t: Date.now(), m: msg, s: String(s || '').slice(0, 120) });
      localStorage.setItem(KEY, JSON.stringify(l.slice(-20)));
    } catch (e) { /* kota / gizli mod */ }
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (e) => add(e.message, e.filename ? `${e.filename.split('/').pop()}:${e.lineno}:${e.colno}` : ''));
    window.addEventListener('unhandledrejection', (e) => { const r = e.reason; add('Promise: ' + ((r && (r.message || r.name)) || String(r)), ''); });
  }
  return { list: read, add, clear() { try { localStorage.removeItem(KEY); } catch (e) { /* yok say */ } } };
})();

const Store = (() => {
  const KEY = 'luna-study-v1';

  const defaults = () => ({
    version: 1,
    settings: {
      name: 'Hazal',
      partner: '',
      dailyGoal: 180,
      focus: 25,
      short: 5,
      long: 15,
      longEvery: 4,
      autoBreak: true,
      autoFocus: false,
      sound: true,
      timerMeow: 'luna',
      timerVibrate: true,
      timerVibration: 'double',
      notify: false,
      studyReminders: true,
      miniTheme: 'cream',
      focusMode: true,   // başlayınca sade odak ekranı
      quietFocus: true,  // odaklanırken Luna konuşmasın
      pauseOnLeave: true, // tam odak: uygulamadan çıkınca sayaç durur (izinli uygulamalar hariç)
      allowedApps: ['chatgpt', 'gemini', 'youtube', 'spotify'], // tam odakta sayacı durdurmayan uygulamalar
      theme: 'light',    // light | dark | auto (gün batımında koyu)
      weather: true,     // günlük hava durumu
      city: 'İstanbul',
      lat: 41.01,
      lon: 28.97,
      spotify: 'https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn',
      msgInterval: 20,
      profile: { level: 'yks', dept: '', year: '' }, // eğitim düzeyi ve bölüm
    },
    subjects: [
      { id: 's1', name: 'Matematik', color: '#f7c948' },
      { id: 's2', name: 'Fizik', color: '#7ad3ff' },
      { id: 's3', name: 'Kimya', color: '#b48bff' },
      { id: 's4', name: 'Biyoloji', color: '#7ee0a1' },
      { id: 's5', name: 'Türkçe', color: '#ff9eb5' },
    ],
    questionLogs: [], // Gün sonunda girilen gerçek soru sayıları; süre ve rozet üretmez.
    sessions: [],   // {id, start, end, minutes, subjectId, note, hard, rating, mood, kind}
    tasks: [],      // {id, text, subjectId, due, done, doneAt, created}
    exams: [],      // {id, name, date}
    review: [],     // tekrar listesi: {id, text, subjectId, created, done}
    loveNotes: [
      'Seninle her zaman gurur duyuyorum, bunu unutma.',
      'Bugün de harika iş çıkarıyorsun sevgilim ✨',
      'Molada su içmeyi unutma, seni çok seviyorum 💛',
      'Yorulduğunda hatırla: ben hep yanındayım.',
      'Bu sınavlar bitince seni çok güzel bir yere götüreceğim, söz.',
      'Senin azmin bana her gün ilham veriyor.',
      'Biraz daha dayan, gece seni arayıp tebrik edeceğim 🌙',
    ],
    // YKS: alan, sınav tarihi, konu durumları (0 başlamadım, 1 çalışıyorum, 2 tekrar, 3 tamam)
    yks: { field: null, examDate: null, topics: {}, takip: {}, planDone: {} },
    denemeler: [],  // {id, date, type: TYT|AYT|BRANS, name, scores: {subjectKey: {d, y}}, eksik: [topicId], note, created}
    notes: [],      // {id, subjectId, title, body, created, updated, pinned}
    mistakes: [],   // hata defteri: {id, fileId, subjectId, topic, reason, note, box, due, rights}
    refs: [],       // kaynaklar: {id, type, title, authors:[{family, given}|{literal}], year, container, volume, issue, pages, doi, url, …}
    files: [],      // depo: {id, src: drive|local, rid, name, mime, size, subjectId, kind, note, created}
    cards: [],      // bilgi kartları: {id, subjectId, front, back, box (1-5), due (YYYY-AA-GG), created}
    dayNotes: [],   // takvim notları: {id, date (YYYY-AA-GG), text, emoji, yearly, remind, created, updated}
    dayDecor: [],   // takvim süsleri: {id: 'dc-YYYY-AA-GG', date, stickers: [en çok 3], tint (gün rengi), oto (renk stickerdan mı), updated}
    denemePlan: [], // takvimden planlanan denemeler: {id, date, type: TYT|AYT|BRANS, name, created, updated}; sonuç girilince denemelere geçer
    dunya: { esyalar: [], odul: {}, acildi: {}, hosgeldin: 0, gorulen: 0 }, // Hazal'ın Küçük Dünyası: kazanılan eşyalar, günlük ödül izi, okunan mektuplar
    plans: { day: {}, week: {}, month: {}, eod: {}, eodSeq: {} }, // Planlarım: Hazal'ın elle yazdığı planlar (gün / hafta / ay) ve gün sonu notları
    stats: { planItems: 0, planFull: 0, planFullDates: [], cardReviews: 0, friendsMet: false, seen: {} },
    badges: {},     // id -> timestamp
    tasksDone: 0,
    reviewDone: 0,
    // üniversite / KPSS / yüksek lisans modu
    uni: { school: '', faculty: '', term: '', termStart: '', termEnd: '', weeks: 14, absPct: 30, gpaBy: 'credit', courses: [], events: [], calendar: [], pastTerms: [], done: {} },
    subjectSets: {}, // modlara göre ders listeleri (yks | program | archive)
    fish: 0,
    fed: 0,
    timer: null,
    lastGoalDay: null,
    deleted: {},    // silinen kayıtların izi (id -> silinme anı): eski bir yedek birleştirilince geri gelmesinler
  });

  function merge(def, obj) {
    if (!obj || typeof obj !== 'object') return def;
    const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
    const out = { ...def, ...obj };
    out.settings = { ...def.settings, ...(isObj(obj.settings) ? obj.settings : {}) };
    out.settings.profile = { ...def.settings.profile, ...(isObj(out.settings.profile) ? out.settings.profile : {}) };
    if (!Array.isArray(out.settings.allowedApps)) out.settings.allowedApps = def.settings.allowedApps.slice();
    delete out.settings.kittenName; // yavrunun adı sabit: Güçlü
    for (const k of ['subjects', 'questionLogs', 'sessions', 'tasks', 'exams', 'review', 'loveNotes', 'denemeler', 'notes', 'cards', 'files', 'mistakes', 'refs', 'dayNotes', 'dayDecor', 'denemePlan']) {
      if (!Array.isArray(out[k])) out[k] = def[k];
    }
    if (!isObj(out.badges)) out.badges = {};
    out.uni = { ...def.uni, ...(isObj(obj.uni) ? obj.uni : {}) };
    for (const k of ['courses', 'events', 'calendar', 'pastTerms']) if (!Array.isArray(out.uni[k])) out.uni[k] = [];
    if (!isObj(out.uni.done)) out.uni.done = {};
    if (!isObj(out.subjectSets)) out.subjectSets = {};
    out.yks = { ...def.yks, ...(isObj(obj.yks) ? obj.yks : {}) };
    if (!isObj(out.yks.topics)) out.yks.topics = {};
    if (!isObj(out.yks.takip)) out.yks.takip = {};
    if (!isObj(out.yks.planDone)) out.yks.planDone = {};
    out.stats = { ...def.stats, ...(isObj(obj.stats) ? obj.stats : {}) };
    if (!Array.isArray(out.stats.planFullDates)) out.stats.planFullDates = [];
    if (!isObj(out.stats.seen)) out.stats.seen = {};
    // planlar: bozuk bir kayıt bütün verinin sıfırlanmasına yol açmasın (hata günlüğe yazılır, veri olduğu gibi kalır)
    try { out.plans = normPlans(obj.plans); } catch (e) { out.plans = isObj(obj.plans) ? obj.plans : def.plans; try { ErrLog.add('Planlar okunamadı: ' + ((e && e.message) || e), 'storage.js'); } catch (e2) { /* yok say */ } }
    tidy(out);
    return out;
  }
  // Dışarıdan gelen yedek sayfaya kod sokamasın: kimlikler, renkler, tarih ve ruh hâli yalnızca beklenen biçimde kalır
  const MOODS = new Set(['🤩', '🙂', '😐', '😴', '😣']);
  function tidy(out) {
    const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
    const rec = (x) => {
      if (!isObj(x)) return;
      for (const k of ['id', 'subjectId', 'courseId', 'fileId']) {
        if (typeof x[k] === 'string' && /[^\w:.-]/.test(x[k])) x[k] = x[k].replace(/[^\w:.-]/g, '');
      }
      if ('color' in x && !/^#[0-9a-f]{3,8}$/i.test(String(x.color))) x.color = '#c9c3e6';
    };
    const each = (a) => { if (Array.isArray(a)) a.forEach(rec); };
    for (const k of Object.keys(out)) each(out[k]);
    for (const k of Object.keys(out.subjectSets)) each(out.subjectSets[k]);
    for (const k of ['courses', 'events', 'calendar']) each(out.uni[k]);
    for (const e of out.denemeler) if (isObj(e) && !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) e.date = U.dateKey(new Date());
    for (const x of out.sessions) if (isObj(x) && x.mood && !MOODS.has(x.mood)) x.mood = '';
    const num = (v) => (v == null || v === '' ? v : Number.isFinite(+v) ? +v : 0); // boş alan boş kalır
    const box = (v, lo) => (Number.isInteger(+v) && +v >= lo && +v <= 5 ? +v : 1);
    for (const e of out.denemeler) {
      if (!isObj(e)) continue;
      if (!['TYT', 'AYT', 'BRANS'].includes(e.type)) e.type = 'TYT';
      if (isObj(e.scores)) for (const k of Object.keys(e.scores)) { const s = e.scores[k]; if (!isObj(s)) { delete e.scores[k]; continue; } s.d = num(s.d); s.y = num(s.y); }
    }
    for (const c of out.cards) if (isObj(c) && 'box' in c) c.box = box(c.box, 0);
    for (const m of out.mistakes) if (isObj(m) && 'box' in m) m.box = box(m.box, 1);
    for (const c of out.uni.courses) if (isObj(c) && Array.isArray(c.absences)) for (const a of c.absences) if (isObj(a)) a.hours = num(a.hours) || 0;
    // takvim notları: tarihi bozuk olan atılır; yazı metin, simge kısa kalır (ekrana her zaman kaçışlı yazılır)
    out.dayNotes = out.dayNotes.filter((n) => isObj(n) && typeof n.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(n.date));
    for (const n of out.dayNotes) {
      if (typeof n.id !== 'string' || !n.id) n.id = 'g' + U.uid();
      n.text = typeof n.text === 'string' ? n.text.slice(0, 60) : '';
      n.emoji = typeof n.emoji === 'string' && n.emoji.length <= 8 ? n.emoji : '⭐';
      n.yearly = !!n.yearly; n.remind = !!n.remind; n.created = +n.created || 0; n.updated = +n.updated || 0;
    }
    const DAY = /^\d{4}-\d{2}-\d{2}$/, TINTS = ['', 'pembe', 'seftali', 'limon', 'nane', 'gok', 'lila']; // 'color' değil: o ad yukarıda #renk diye denetleniyor
    out.dayDecor = out.dayDecor.filter((x) => isObj(x) && typeof x.date === 'string' && DAY.test(x.date));
    for (const x of out.dayDecor) {
      x.id = 'dc-' + x.date;
      // emoji (kısa) ya da defterdeki görsel ('i:paket/ad')
      x.stickers = (Array.isArray(x.stickers) ? x.stickers : []).filter((s) => typeof s === 'string' && s && (s.length <= 8 || /^i:[a-z0-9]{1,12}\/[a-z0-9-]{1,30}$/.test(s))).slice(0, 3);
      if (!TINTS.includes(x.tint)) x.tint = '';
      if (typeof x.oto !== 'boolean') delete x.oto; // gün rengi stickerdan mı geldi (true) yoksa elle mi seçildi (false)
      x.updated = +x.updated || 0;
    }
    out.denemePlan = out.denemePlan.filter((x) => isObj(x) && typeof x.date === 'string' && DAY.test(x.date));
    for (const x of out.denemePlan) {
      if (typeof x.id !== 'string' || !x.id) x.id = 'dp' + U.uid();
      if (!['TYT', 'AYT', 'BRANS'].includes(x.type)) x.type = 'TYT';
      x.name = typeof x.name === 'string' ? x.name.slice(0, 40) : '';
      x.created = +x.created || 0; x.updated = +x.updated || 0;
    }
    if (!isObj(out.deleted)) out.deleted = {};
    // Küçük Dünya: biçimi bozuk alan düzeltilir, eşya ve ödül izi asla silinmez (tanınmayan eşya türü de saklanır)
    const dn = isObj(out.dunya) ? out.dunya : {};
    const ESYA = /^[a-z]{2,16}$/, YER = /^[a-z0-9-]{0,20}$/;
    const esyalar = [];
    for (const x of Array.isArray(dn.esyalar) ? dn.esyalar : []) {
      if (!isObj(x) || !ESYA.test(x.tur) || esyalar.some((y) => y.tur === x.tur)) continue;
      const renkler = [...new Set((Array.isArray(x.renkler) ? x.renkler : [0]).map((r) => +r).filter((r) => Number.isInteger(r) && r >= 0 && r <= 9))];
      if (!renkler.length) renkler.push(0);
      const renk = renkler.includes(+x.renk) ? +x.renk : renkler[0];
      esyalar.push({ id: 'es-' + x.tur, tur: x.tur, renk, renkler, yer: typeof x.yer === 'string' && YER.test(x.yer) ? x.yer : '', at: +x.at || 0, updated: +x.updated || 0 });
    }
    const dolu = new Set();
    for (const x of esyalar) { if (x.yer && dolu.has(x.yer)) x.yer = ''; if (x.yer) dolu.add(x.yer); } // bir yerde tek eşya
    const odul = {}, acildi = {};
    if (isObj(dn.odul)) for (const k of Object.keys(dn.odul)) if (/^(ilk|tam):\d{4}-\d{2}-\d{2}$/.test(k) && typeof dn.odul[k] === 'string') odul[k] = dn.odul[k].slice(0, 24);
    if (isObj(dn.acildi)) for (const k of Object.keys(dn.acildi)) if (/^[\w-]{1,24}$/.test(k) && typeof dn.acildi[k] === 'string' && DAY.test(dn.acildi[k])) acildi[k] = dn.acildi[k];
    out.dunya = { ...dn, esyalar, odul, acildi, hosgeldin: +dn.hosgeldin || 0, gorulen: +dn.gorulen || 0 };
  }

  // Planlarım: anahtarlar (YYYY-AA-GG / YYYY-AA) ve maddeler beklenen biçimde kalır; geçerli kayıtlara dokunulmaz.
  // Silinen maddeler { id, del: true, updated } olarak kalır: eski bir yedek birleştirilince geri gelmesinler.
  const PLAN_DAY = /^\d{4}-\d{2}-\d{2}$/, PLAN_MONTH = /^\d{4}-\d{2}$/;
  function normPlanItem(it) {
    const clean = (v) => (typeof v === 'string' ? v.replace(/[^\w:.-]/g, '') : '');
    const num = (v, max) => { const n = Math.round(Number(v) || 0); return n > 0 ? Math.min(n, max) : 0; };
    it.id = clean(String(it.id)) || 'p' + U.uid();
    if (it.del) return { id: it.id, del: true, updated: +it.updated || 0 };
    it.title = (typeof it.title === 'string' ? it.title : typeof it.title === 'number' ? String(it.title) : '').slice(0, 120); // metin değilse boş (String() bazı nesnelerde hata verir)
    it.subjectId = clean(it.subjectId); it.topicId = clean(it.topicId); it.src = clean(it.src);
    it.min = num(it.min, 44640); it.q = num(it.q, 999);
    it.done = !!it.done; it.doneAt = +it.doneAt || 0; it.counted = !!it.counted;
    const pk = (v) => (typeof v === 'string' && (PLAN_DAY.test(v) || PLAN_MONTH.test(v)) ? v : '');
    it.moved = pk(it.moved); it.from = pk(it.from);
    it.created = +it.created || 0; it.updated = +it.updated || 0;
    return it;
  }
  function normPlans(p) {
    const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
    const out = { day: {}, week: {}, month: {}, eod: {}, eodSeq: {}, ...(isObj(p) ? p : {}) }; // ileride eklenecek alanlar korunur
    for (const [scope, re] of [['day', PLAN_DAY], ['week', PLAN_DAY], ['month', PLAN_MONTH]]) {
      const src = isObj(out[scope]) ? out[scope] : {}, m = {};
      for (const k of Object.keys(src)) {
        if (!re.test(k) || !Array.isArray(src[k])) continue;
        m[k] = src[k].filter((it) => isObj(it) && (typeof it.id === 'string' || typeof it.id === 'number')).map(normPlanItem);
      }
      out[scope] = m;
    }
    if (!isObj(out.eod)) out.eod = {};
    for (const k of Object.keys(out.eod)) {
      const e = out.eod[k];
      if (!PLAN_DAY.test(k) || !isObj(e)) { delete out.eod[k]; continue; }
      e.text = typeof e.text === 'string' ? e.text.slice(0, 400) : '';
    }
    if (!isObj(out.eodSeq)) out.eodSeq = {};
    return out;
  }

  // Veri okunamazsa sessizce sıfırlanmasın: ham veri kurtarma kopyasına alınır, uygulama haber verir
  let loadError = '';
  function load() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { return defaults(); } // gizli sekme
    if (!raw) return defaults();
    try { return merge(defaults(), JSON.parse(raw)); } catch (e) {
      loadError = String((e && e.message) || e);
      try { localStorage.setItem(KEY + '-kurtarma', raw); } catch (e2) { /* kota */ }
      if (typeof ErrLog !== 'undefined') ErrLog.add('Veriler okunamadı: ' + loadError, 'storage.js');
      return defaults();
    }
  }

  // Yedeği mevcut verilerle birleştirir: hiçbir kayıt silinmez, eksikler eklenir.
  // id'li listeler id'ye göre, haritalar anahtara göre birleşir; ayarlar bu cihazdaki gibi kalır.
  // Bilinmeyen (ileride eklenecek) alanlar da aynı kurallarla birleşir. Eklenen kayıt sayısını döndürür.
  const LOCAL_ONLY = new Set(['version', 'settings', 'timer', 'lastGoalDay', 'lastWeatherMsg', 'lastSpecialGreet', 'lastBackup', 'lastBackupNudge', 'lastMoonGreet', 'lastExamGreet', 'lunaConversation', 'notificationMemory']);
  const COUNTERS = new Set(['fish', 'fed', 'tasksDone', 'reviewDone', 'planItems', 'planFull', 'cardReviews']);
  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  const hasIds = (arr) => arr.length > 0 && arr.every((x) => isObj(x) && (typeof x.id === 'string' || typeof x.id === 'number'));
  // izi tutulan listeler: bunlarda silinen kayıt, silinmeden önce alınmış bir yedekten geri gelmez
  const TRACKED = ['sessions', 'tasks', 'review', 'notes', 'cards', 'denemeler', 'mistakes', 'refs', 'files', 'dayNotes', 'denemePlan'];
  function mergeIn(obj) {
    const inc = merge(defaults(), obj);
    let added = 0;
    // iki cihazın silme izleri birleşir: izi olan kayıt geri eklenmez; öbür cihazda silinen burada da kalkar
    const gone = { ...(isObj(inc.deleted) ? inc.deleted : {}), ...(isObj(data.deleted) ? data.deleted : {}) };
    // yedek başka moddaysa (YKS / üniversite) aktif listeler yer değiştirir: dersler kendi modunun listesine gider
    const setOf = (lvl) => ((lvl || 'yks') === 'yks' ? 'yks' : 'program');
    const mine = setOf(data.settings.profile.level), theirs = setOf(inc.settings.profile.level);
    if (mine !== theirs) {
      const active = inc.subjects;
      inc.subjects = Array.isArray(inc.subjectSets[mine]) ? inc.subjectSets[mine] : [];
      inc.subjectSets = { ...inc.subjectSets, [theirs]: active };
      delete inc.subjectSets[mine];
    }
    const list = (a, b) => {
      if (!Array.isArray(a)) return b;
      if (hasIds(b) && (hasIds(a) || !a.length)) {
        const byId = new Map(a.map((x, i) => [x.id, i]));
        for (const x of b) {
          if (!x.del && gone[x.id] != null) continue; // burada (ya da yedeğin cihazında) silinmiş
          if (!byId.has(x.id)) { a.push(x); if (!x.del) added++; continue; } // silinmiş plan maddesinin izi kayıt sayılmaz
          const i = byId.get(x.id); // ikisinde de varsa daha yeni düzenlenen kalsın (notlar gibi)
          if (+x.updated > +(a[i].updated || 0)) a[i] = x;
        }
        return a;
      }
      for (const x of b) if (!a.some((y) => JSON.stringify(y) === JSON.stringify(x))) { a.push(x); if (typeof x !== 'string') added++; }
      return a;
    };
    const obj2 = (a, b, key, parent) => {
      for (const k of Object.keys(b)) {
        const x = a[k], y = b[k];
        if (x === undefined || x === null) {
          a[k] = y;
          if (key === 'badges' || key === 'topics') added++;
          else if (parent === 'plans' && (key === 'day' || key === 'week' || key === 'month') && Array.isArray(y)) added += y.filter((it) => isObj(it) && !it.del).length; // yedekte olup burada olmayan bir günün maddeleri
        }
        else if (Array.isArray(x) && Array.isArray(y)) a[k] = list(x, y);
        else if (key === 'takip' && isObj(x) && isObj(y)) { if (+y.at > +(x.at || 0)) a[k] = y; } // konu işareti ve notu: en son değiştirilen kalır
        else if (isObj(x) && isObj(y)) obj2(x, y, k, key);
        else if (typeof x === 'number' && typeof y === 'number') {
          if (key === 'badges' || key === 'seen') a[k] = Math.min(x, y);       // ilk kazanılan / ilk görülen an
          else if (COUNTERS.has(k) || key === 'topics') a[k] = Math.max(x, y); // sayaçlar ve konu ilerlemesi
        } else if (typeof x === 'boolean' && typeof y === 'boolean') a[k] = x || y;
        else if (x === '' && typeof y === 'string' && y) a[k] = y; // boş alan yedektekiyle dolsun (okul adı gibi)
      }
      return a;
    };
    for (const k of Object.keys(inc)) {
      if (LOCAL_ONLY.has(k)) continue;
      const x = data[k], y = inc[k];
      if (x === undefined || x === null) data[k] = y;
      else if (Array.isArray(x) && Array.isArray(y)) data[k] = list(x, y);
      else if (isObj(x) && isObj(y)) obj2(x, y, k);
      else if (COUNTERS.has(k) && typeof x === 'number' && typeof y === 'number') data[k] = Math.max(x, y);
    }
    data.deleted = gone;
    for (const k of TRACKED) if (Array.isArray(data[k])) data[k] = data[k].filter((x) => !(isObj(x) && gone[x.id] != null));
    if (data.yks && data.yks.planCache) delete data.yks.planCache; // plan yeniden hesaplansın
    // üniversite modundaki bir yedeğin ders kutucukları YKS listesine karışmasın
    if ((data.settings.profile.level || 'yks') === 'yks') {
      const moved = data.subjects.filter((x) => /^c_/.test(x.id));
      if (moved.length) {
        data.subjects = data.subjects.filter((x) => !/^c_/.test(x.id));
        const prog = data.subjectSets.program || (data.subjectSets.program = []);
        for (const x of moved) if (!prog.some((y) => y.id === x.id)) prog.push(x);
      }
    }
    data.sessions.sort((a, b) => (+a.start || 0) - (+b.start || 0)); // eklenen oturumlar tarih sırasına girsin
    return added;
  }

  let data = load();
  let saveWarned = false;
  // başka sekmede kaydedilen veri bu sekmeye de geçer; yoksa eski kopya yenisinin üstüne yazılırdı
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== KEY || !e.newValue) return;
      try { data = merge(defaults(), JSON.parse(e.newValue)); } catch (err) { return; }
      window.dispatchEvent(new Event('luna-data-changed'));
    });
  }

  return {
    get data() { return data; },
    get loadError() { return loadError; },
    rescueCopy() { try { return localStorage.getItem(KEY + '-kurtarma'); } catch (e) { return null; } },
    dropRescue() { try { localStorage.removeItem(KEY + '-kurtarma'); } catch (e) { /* yok say */ } },
    // kaydedilemezse (depolama dolu / gizli mod) sessiz kalmaz: bir kez uyarı olayı yollanır
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(data)); saveWarned = false; return true; } catch (e) {
        if (!saveWarned) {
          saveWarned = true;
          ErrLog.add('Kaydedilemedi: ' + ((e && e.name) || e), 'storage.js');
          if (typeof window !== 'undefined') window.dispatchEvent(new Event('luna-save-failed'));
        }
        return false;
      }
    },
    reset() { data = defaults(); this.save(); },
    // Yükleme/birleştirme ya tam uygulanır ya hiç: hata ya da dolu depolama Hazal'ın verisini bozmaz.
    importJSON(obj) { // başka cihazın sayacı buraya taşınmasın
      const prev = data;
      try { data = merge(defaults(), { ...obj, timer: null }); if (this.save()) return true; } catch (e) { /* bozuk yedek */ }
      data = prev; return false;
    },
    mergeJSON(obj) {
      const snap = JSON.parse(JSON.stringify(data)); // mergeIn yerinde değiştirir; hata olursa eski hale dön
      try { const n = mergeIn(obj); if (this.save()) return n; } catch (e) { /* bozuk yedek */ }
      data = snap; return false;
    },
    // silinen kaydın izi: eski bir yedek birleştirilince geri gelmez (en yeni 3000 iz tutulur)
    forget(id) {
      if (id == null || id === '') return;
      const m = isObj(data.deleted) ? data.deleted : (data.deleted = {});
      m[id] = Date.now();
      const keys = Object.keys(m);
      if (keys.length > 3000) keys.sort((a, b) => m[a] - m[b]).slice(0, keys.length - 3000).forEach((k) => delete m[k]);
    },
    // aktif listede yoksa diğer modların listelerine de bakılır (geçmiş oturumların ders adı kaybolmasın)
    subject(id) {
      const hit = data.subjects.find((s) => s.id === id);
      if (hit || !id) return hit || { id: '', name: 'Genel', color: '#c9c3e6' };
      for (const k of Object.keys(data.subjectSets || {})) { const s = (data.subjectSets[k] || []).find((x) => x.id === id); if (s) return s; }
      return { id: '', name: 'Genel', color: '#c9c3e6' };
    },
  };
})();

if (typeof window !== 'undefined') { window.ErrLog = ErrLog; }
