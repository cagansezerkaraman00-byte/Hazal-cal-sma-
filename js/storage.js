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
    yks: { field: null, examDate: null, topics: {}, planDone: {} },
    denemeler: [],  // {id, date, type: TYT|AYT|BRANS, name, scores: {subjectKey: {d, y}}, eksik: [topicId], note, created}
    notes: [],      // {id, subjectId, title, body, created, updated, pinned}
    mistakes: [],   // hata defteri: {id, fileId, subjectId, topic, reason, note, box, due, rights}
    refs: [],       // kaynaklar: {id, type, title, authors:[{family, given}|{literal}], year, container, volume, issue, pages, doi, url, …}
    files: [],      // depo: {id, src: drive|local, rid, name, mime, size, subjectId, kind, note, created}
    cards: [],      // bilgi kartları: {id, subjectId, front, back, box (1-5), due (YYYY-AA-GG), created}
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
  });

  function merge(def, obj) {
    if (!obj || typeof obj !== 'object') return def;
    const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
    const out = { ...def, ...obj };
    out.settings = { ...def.settings, ...(isObj(obj.settings) ? obj.settings : {}) };
    out.settings.profile = { ...def.settings.profile, ...(isObj(out.settings.profile) ? out.settings.profile : {}) };
    if (!Array.isArray(out.settings.allowedApps)) out.settings.allowedApps = def.settings.allowedApps.slice();
    delete out.settings.kittenName; // yavrunun adı sabit: Güçlü
    for (const k of ['subjects', 'questionLogs', 'sessions', 'tasks', 'exams', 'review', 'loveNotes', 'denemeler', 'notes', 'cards', 'files', 'mistakes', 'refs']) {
      if (!Array.isArray(out[k])) out[k] = def[k];
    }
    if (!isObj(out.badges)) out.badges = {};
    out.uni = { ...def.uni, ...(isObj(obj.uni) ? obj.uni : {}) };
    for (const k of ['courses', 'events', 'calendar', 'pastTerms']) if (!Array.isArray(out.uni[k])) out.uni[k] = [];
    if (!isObj(out.uni.done)) out.uni.done = {};
    if (!isObj(out.subjectSets)) out.subjectSets = {};
    out.yks = { ...def.yks, ...(isObj(obj.yks) ? obj.yks : {}) };
    if (!isObj(out.yks.topics)) out.yks.topics = {};
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
  function mergeIn(obj) {
    const inc = merge(defaults(), obj);
    let added = 0;
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
    importJSON(obj) { data = merge(defaults(), { ...obj, timer: null }); return this.save(); }, // başka cihazın sayacı buraya taşınmasın
    mergeJSON(obj) { const n = mergeIn(obj); this.save(); return n; },
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
