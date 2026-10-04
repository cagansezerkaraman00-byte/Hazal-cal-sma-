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
    for (const k of ['subjects', 'sessions', 'tasks', 'exams', 'review', 'loveNotes', 'denemeler']) {
      if (!Array.isArray(out[k])) out[k] = def[k];
    }
    const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
    if (!isObj(out.badges)) out.badges = {};
    out.yks = { ...def.yks, ...(isObj(obj.yks) ? obj.yks : {}) };
    if (!isObj(out.yks.topics)) out.yks.topics = {};
    if (!isObj(out.yks.planDone)) out.yks.planDone = {};
    return out;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return merge(defaults(), JSON.parse(raw));
    } catch (e) { /* bozuk veri ya da gizli sekme */ }
    return defaults();
  }

  let data = load();

  return {
    get data() { return data; },
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* kota / gizli mod */ }
    },
    reset() { data = defaults(); this.save(); },
    importJSON(obj) { data = merge(defaults(), obj); this.save(); },
    subject(id) { return data.subjects.find((s) => s.id === id) || { id: '', name: 'Genel', color: '#c9c3e6' }; },
  };
})();
