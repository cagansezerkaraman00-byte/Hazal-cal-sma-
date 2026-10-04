/* Luna ile Çalış — veri katmanı ve küçük yardımcılar.
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
  fmtMin(m) {
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
      notify: false,
      focusMode: true,   // başlayınca sade odak ekranı
      quietFocus: true,  // odaklanırken Luna konuşmasın
      pauseOnLeave: true, // tam odak: uygulamadan çıkınca sayaç durur (izinli uygulamalar hariç)
      allowedApps: ['chatgpt', 'gemini', 'claude', 'youtube', 'spotify'], // tam odakta sayacı durdurmayan uygulamalar
      kittenName: 'Güçlü', // sarı yavrunun adı
      theme: 'light',    // light | dark | auto (gün batımında koyu)
      weather: true,     // günlük hava durumu
      city: 'İstanbul',
      lat: 41.01,
      lon: 28.97,
      spotify: 'https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn',
      msgInterval: 20,
    },
    subjects: [
      { id: 's1', name: 'Matematik', color: '#f7c948' },
      { id: 's2', name: 'Fizik', color: '#7ad3ff' },
      { id: 's3', name: 'Kimya', color: '#b48bff' },
      { id: 's4', name: 'Biyoloji', color: '#7ee0a1' },
      { id: 's5', name: 'Türkçe', color: '#ff9eb5' },
    ],
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
    files: [],      // depo: {id, src: drive|local, rid, name, mime, size, subjectId, kind, note, created}
    cards: [],      // bilgi kartları: {id, subjectId, front, back, box (1-5), due (YYYY-AA-GG), created}
    stats: { planItems: 0, planFull: 0, planFullDates: [], cardReviews: 0, friendsMet: false, seen: {} },
    badges: {},     // id -> timestamp
    tasksDone: 0,
    reviewDone: 0,
    fish: 0,
    fed: 0,
    timer: null,
    lastGoalDay: null,
  });

  function merge(def, obj) {
    if (!obj || typeof obj !== 'object') return def;
    const out = { ...def, ...obj };
    out.settings = { ...def.settings, ...(obj.settings || {}) };
    if (!Array.isArray(out.settings.allowedApps)) out.settings.allowedApps = def.settings.allowedApps.slice();
    if (out.settings.kittenName === 'Sarman') out.settings.kittenName = 'Güçlü'; // yavrunun yeni adı
    for (const k of ['subjects', 'sessions', 'tasks', 'exams', 'review', 'loveNotes', 'denemeler', 'notes', 'cards', 'files']) {
      if (!Array.isArray(out[k])) out[k] = def[k];
    }
    const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
    if (!isObj(out.badges)) out.badges = {};
    out.yks = { ...def.yks, ...(isObj(obj.yks) ? obj.yks : {}) };
    if (!isObj(out.yks.topics)) out.yks.topics = {};
    if (!isObj(out.yks.planDone)) out.yks.planDone = {};
    out.stats = { ...def.stats, ...(isObj(obj.stats) ? obj.stats : {}) };
    if (!Array.isArray(out.stats.planFullDates)) out.stats.planFullDates = [];
    if (!isObj(out.stats.seen)) out.stats.seen = {};
    return out;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return merge(defaults(), JSON.parse(raw));
    } catch (e) { /* bozuk veri ya da gizli sekme */ }
    return defaults();
  }

  // Yedeği mevcut verilerle birleştirir: hiçbir kayıt silinmez, eksikler eklenir.
  // id'li listeler id'ye göre, haritalar anahtara göre birleşir; ayarlar bu cihazdaki gibi kalır.
  // Bilinmeyen (ileride eklenecek) alanlar da aynı kurallarla birleşir. Eklenen kayıt sayısını döndürür.
  const LOCAL_ONLY = new Set(['version', 'settings', 'timer', 'lastGoalDay', 'lastWeatherMsg', 'lastSpecialGreet', 'lastBackup', 'lastBackupNudge', 'lastMoonGreet']);
  const COUNTERS = new Set(['fish', 'fed', 'tasksDone', 'reviewDone', 'planItems', 'planFull', 'cardReviews']);
  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  const hasIds = (arr) => arr.length > 0 && arr.every((x) => isObj(x) && (typeof x.id === 'string' || typeof x.id === 'number'));
  function mergeIn(obj) {
    const inc = merge(defaults(), obj);
    let added = 0;
    const list = (a, b) => {
      if (!Array.isArray(a)) return b;
      if (hasIds(b) && (hasIds(a) || !a.length)) {
        const byId = new Map(a.map((x, i) => [x.id, i]));
        for (const x of b) {
          if (!byId.has(x.id)) { a.push(x); added++; continue; }
          const i = byId.get(x.id); // ikisinde de varsa daha yeni düzenlenen kalsın (notlar gibi)
          if (+x.updated > +(a[i].updated || 0)) a[i] = x;
        }
        return a;
      }
      for (const x of b) if (!a.some((y) => JSON.stringify(y) === JSON.stringify(x))) { a.push(x); if (typeof x !== 'string') added++; }
      return a;
    };
    const obj2 = (a, b, key) => {
      for (const k of Object.keys(b)) {
        const x = a[k], y = b[k];
        if (x === undefined || x === null) { a[k] = y; if (key === 'badges' || key === 'topics') added++; }
        else if (Array.isArray(x) && Array.isArray(y)) a[k] = list(x, y);
        else if (isObj(x) && isObj(y)) obj2(x, y, k);
        else if (typeof x === 'number' && typeof y === 'number') {
          if (key === 'badges' || key === 'seen') a[k] = Math.min(x, y);       // ilk kazanılan / ilk görülen an
          else if (COUNTERS.has(k) || key === 'topics') a[k] = Math.max(x, y); // sayaçlar ve konu ilerlemesi
        } else if (typeof x === 'boolean' && typeof y === 'boolean') a[k] = x || y;
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
    return added;
  }

  let data = load();

  return {
    get data() { return data; },
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* kota / gizli mod */ }
    },
    reset() { data = defaults(); this.save(); },
    importJSON(obj) { data = merge(defaults(), obj); this.save(); },
    mergeJSON(obj) { const n = mergeIn(obj); this.save(); return n; },
    subject(id) { return data.subjects.find((s) => s.id === id) || { id: '', name: 'Genel', color: '#c9c3e6' }; },
  };
})();

if (typeof window !== 'undefined') { window.ErrLog = ErrLog; }
