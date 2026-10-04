/* Hava durumu: Open-Meteo (ücretsiz, anahtarsız). 30 dk önbellek, çevrimdışıyken son veri.
   Hiçbir zaman hata fırlatmaz; veri yoksa null döner. storage.js'ten sonra yüklenmeli. */

const Weather = (() => {
  const KEY = 'luna-weather';
  const TTL = 30 * 60 * 1000;   // taze sayılma süresi
  const TIMEOUT = 8000;         // istek zaman aşımı
  const API = 'https://api.open-meteo.com/v1/forecast';
  const QUERY = '&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m,relative_humidity_2m'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=2';

  // WMO kodu -> [ikon, metin, tür, yoğunluk]
  const CODES = {
    0: ['☀️', 'Açık', 'clear', 0],
    1: ['🌤️', 'Az bulutlu', 'clear', 0.15],
    2: ['⛅', 'Parçalı bulutlu', 'cloudy', 0.4],
    3: ['☁️', 'Kapalı', 'cloudy', 0.8],
    45: ['🌫️', 'Sisli', 'fog', 0.6],
    48: ['🌫️', 'Kırağılı sis', 'fog', 0.8],
    51: ['🌦️', 'Hafif çisenti', 'drizzle', 0.25],
    53: ['🌦️', 'Çisenti', 'drizzle', 0.45],
    55: ['🌧️', 'Yoğun çisenti', 'drizzle', 0.65],
    56: ['🌧️', 'Dondurucu çisenti', 'drizzle', 0.4],
    57: ['🌧️', 'Yoğun dondurucu çisenti', 'drizzle', 0.7],
    61: ['🌦️', 'Hafif yağmurlu', 'rain', 0.35],
    63: ['🌧️', 'Yağmurlu', 'rain', 0.6],
    65: ['🌧️', 'Şiddetli yağmur', 'rain', 0.9],
    66: ['🌧️', 'Dondurucu yağmur', 'rain', 0.5],
    67: ['🌧️', 'Şiddetli dondurucu yağmur', 'rain', 0.85],
    71: ['🌨️', 'Hafif karlı', 'snow', 0.3],
    73: ['🌨️', 'Karlı', 'snow', 0.6],
    75: ['❄️', 'Yoğun kar', 'snow', 0.9],
    77: ['🌨️', 'Kar taneleri', 'snow', 0.3],
    80: ['🌦️', 'Hafif sağanak', 'rain', 0.45],
    81: ['🌧️', 'Sağanak', 'rain', 0.7],
    82: ['🌧️', 'Şiddetli sağanak', 'rain', 1],
    85: ['🌨️', 'Kar sağanağı', 'snow', 0.6],
    86: ['❄️', 'Yoğun kar sağanağı', 'snow', 0.9],
    95: ['⛈️', 'Gök gürültülü fırtına', 'storm', 0.75],
    96: ['⛈️', 'Dolulu fırtına', 'storm', 0.85],
    99: ['⛈️', 'Şiddetli dolulu fırtına', 'storm', 1],
  };
  // bilinmeyen kodlar için onluk gruba göre yedek
  const GROUPS = { 0: 3, 1: 45, 2: 3, 3: 3, 4: 45, 5: 53, 6: 63, 7: 73, 8: 81, 9: 95 };
  const NIGHT = { '☀️': '🌙', '🌤️': '🌙', '⛅': '☁️', '🌦️': '🌧️' };

  function describe(code, isDay = true) {
    const c = Math.round(code === null || code === '' ? NaN : Number(code));
    const row = CODES[c] || (c >= 0 && c < 100 ? CODES[GROUPS[Math.floor(c / 10)]] : null) || ['🌤️', 'Değişken', 'cloudy', 0.3];
    return { icon: (!isDay && NIGHT[row[0]]) || row[0], text: row[1], kind: row[2], intensity: row[3] };
  }

  // ---------- yardımcılar ----------
  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null);
  const int = (v) => (num(v) === null ? null : Math.round(v) || 0); // -0 yerine 0
  const at = (arr, i) => (Array.isArray(arr) ? num(arr[i]) : null);

  const settings = () => (typeof Store !== 'undefined' && Store.data && Store.data.settings) || {};
  function loc() {
    const s = settings();
    const lat = num(s.lat), lon = num(s.lon);
    if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    return { lat: lat.toFixed(2), lon: lon.toFixed(2), key: `${lat.toFixed(2)},${lon.toFixed(2)}` };
  }

  function readCache() {
    try {
      const c = JSON.parse(localStorage.getItem(KEY) || 'null');
      return c && typeof c.summary === 'object' && c.summary && typeof c.at === 'number' ? c : null;
    } catch (e) { return null; }
  }
  function writeCache(key, summary) {
    try { localStorage.setItem(KEY, JSON.stringify({ key, at: summary.updatedAt, day: U.dateKey(summary.updatedAt), summary })); } catch (e) { /* kota / gizli mod */ }
  }
  // aynı konum ve aynı gün olmalı; yoksa "bugün" bilgisi yanlış olur
  function usable(c, key) {
    return c && c.key === key && c.day === U.dateKey(Date.now()) ? c : null;
  }
  const fresh = (c) => { const age = Date.now() - c.at; return age >= 0 && age < TTL; };
  const mark = (c, stale) => (c ? { ...c.summary, stale } : null);

  // bugün her zaman nesne; yarın verisi yoksa null
  function day(d, i, fallbackCode) {
    const code = at(d.weather_code, i) ?? fallbackCode;
    if (code === null || code === undefined) return null;
    const w = describe(code, true);
    return {
      date: Array.isArray(d.time) ? d.time[i] || null : null,
      max: int(at(d.temperature_2m_max, i)),
      min: int(at(d.temperature_2m_min, i)),
      rainChance: int(at(d.precipitation_probability_max, i)),
      code, icon: w.icon, text: w.text, kind: w.kind,
    };
  }

  function parse(j) {
    const c = j && j.current;
    if (!c || num(c.temperature_2m) === null || num(c.weather_code) === null) return null;
    const h = new Date().getHours();
    const isDay = c.is_day == null ? h >= 6 && h < 20 : !!c.is_day;
    const code = Math.round(c.weather_code);
    const w = describe(code, isDay);
    const d = (j.daily && typeof j.daily === 'object') ? j.daily : {};
    return {
      temp: int(c.temperature_2m),
      feels: int(num(c.apparent_temperature) ?? c.temperature_2m),
      humidity: int(c.relative_humidity_2m),
      wind: int(c.wind_speed_10m),
      code, isDay,
      kind: w.kind, intensity: w.intensity, icon: w.icon, text: w.text,
      today: day(d, 0, code),
      tomorrow: day(d, 1, null),
      updatedAt: Date.now(),
      stale: false,
    };
  }

  // zaman aşımı hem AbortController hem yarışla: abort desteklenmese de takılmaz
  async function fetchJSON(url) {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const job = Promise.resolve()
      .then(() => fetch(url, ctl ? { signal: ctl.signal } : {}))
      .then((r) => {
        if (!r || !r.ok) throw new Error('HTTP ' + (r && r.status));
        return r.json();
      });
    job.catch(() => {}); // zaman aşımından sonra gelen hata yakalanmamış kalmasın
    let timer;
    const timeout = new Promise((_, rej) => {
      timer = setTimeout(() => { if (ctl) ctl.abort(); rej(new Error('timeout')); }, TIMEOUT);
    });
    try { return await Promise.race([job, timeout]); } finally { clearTimeout(timer); }
  }

  // son ağ denemesi (Tanılama için): {at, ok, ms, err}
  let net = null;
  function why(e) {
    const m = String((e && e.message) || e || '');
    if (m === 'timeout') return `Zaman aşımı (${TIMEOUT / 1000} sn içinde yanıt gelmedi)`;
    if (/^HTTP/.test(m)) return 'Sunucu yanıtı: ' + m;
    return 'Ağ hatası: bağlantı yok ya da adres engellenmiş (' + (m || 'bilinmiyor') + ')';
  }
  async function run(l, force) {
    const cached = usable(readCache(), l.key);
    if (!force && cached && fresh(cached)) return mark(cached, false);
    if (typeof fetch !== 'function' || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
      net = { at: Date.now(), ok: false, ms: 0, err: 'Cihaz çevrimdışı görünüyor' };
      return mark(cached, true);
    }
    const t0 = Date.now();
    try {
      const summary = parse(await fetchJSON(`${API}?latitude=${l.lat}&longitude=${l.lon}${QUERY}`));
      net = { at: Date.now(), ok: !!summary, ms: Date.now() - t0, err: summary ? '' : 'Yanıt geldi ama biçimi beklenenden farklı' };
      if (!summary) return mark(cached, true);
      writeCache(l.key, summary);
      return summary;
    } catch (e) {
      net = { at: Date.now(), ok: false, ms: Date.now() - t0, err: why(e) };
      return mark(cached, true);
    }
  }
  function status() {
    const l = loc(), c = readCache();
    return { net, loc: l ? l.key : null, cache: c ? { at: c.at, sameLoc: !!l && c.key === l.key, today: c.day === U.dateKey(Date.now()) } : null };
  }

  // aynı anda gelen çağrılar tek isteği paylaşır
  let inflight = null, inflightKey = '';
  function load(opts) {
    const force = !!(opts && opts.force); // load(), load(null) de güvenli
    const l = loc();
    if (!l) return Promise.resolve(null);
    if (inflight && inflightKey === l.key) return inflight;
    inflightKey = l.key;
    const p = run(l, force).catch(() => null).then((r) => {
      if (inflight === p) inflight = null;
      return r;
    });
    inflight = p;
    return p;
  }

  // ağa çıkmadan son kayıtlı veri (ilk çizim için)
  function cached() {
    const l = loc();
    const c = l && usable(readCache(), l.key);
    return c ? mark(c, !fresh(c)) : null;
  }

  // ---------- Luna'nın hava cümleleri ----------
  const LINES = {
    storm: [
      'Dışarıda fırtına var ⛈️ İçerisi güvenli ve sıcacık; sen çalış, ben nöbetteyim 🐾',
      'Gök gürlüyor ama burası huzurlu {name}. Bir pomodoro ile fırtınayı birlikte atlatalım ⚡',
    ],
    snow: [
      'Kar yağıyor ❄️ Sıcak bir içecek al, battaniyene sarın; ben de yanında kıvrılırım.',
      'Lapa lapa kar var {name} ⛄ Pencere kenarında ders çalışmanın tam zamanı.',
    ],
    rain: [
      'Dışarıda yağmur var ☔ İçeride sıcacık ders çalışmak için harika bir gün.',
      'Yağmur sesi en güzel odak müziği {name} 🌧️ Hadi bir oturum açalım.',
      'Cama vuran damlalar eşliğinde çalışmak çok huzurlu, ben de yanındayım 🐾',
    ],
    fog: [
      'Dışarısı sisli 🌫️ Ama senin hedeflerin gayet net {name}.',
      'Sis var ama kafan berrak ✨ Bugün bir konuyu baştan sona netleştirelim mi?',
    ],
    hot: [
      'Hava çok sıcak 🥵 Bol su iç, serin bir köşede kısa oturumlarla ilerleyelim.',
      'Sıcakta ben de yayıldım ☀️ Su şişeni yanına al {name}, molaları atlamayalım.',
    ],
    cold: [
      'Hava soğuk 🧣 Sıcak bir çay demle, battaniyeni al; ben de kucağına kıvrılırım.',
      'Dışarısı buz gibi {name} ❄️ İçeride sıcacık çalışmak için ideal bir gün.',
    ],
    sunny: [
      'Güneş açtı ☀️ Molada pencereyi aç, biraz ışık al; enerjin tazelensin.',
      'Gökyüzü pırıl pırıl {name} 🌤️ Bugün de birlikte parlayacağız.',
    ],
    night: [
      'Gökyüzü açık, yıldızlar seninle ✨ Sakin bir gece tekrarı için harika.',
      'Gece gökyüzü bu akşam senin için parlıyor {name} ✨',
    ],
    cloudy: [
      'Hava bulutlu ☁️ Göz yormayan yumuşak bir ışık, odaklanmak için birebir.',
      'Bulutlu bir gün {name} ⛅ Dikkatini dağıtacak bir şey yok, tam çalışma havası.',
    ],
  };
  const wet = (k) => k === 'rain' || k === 'drizzle' || k === 'storm' || k === 'snow';
  const lower = (s) => { try { return s.toLocaleLowerCase('tr'); } catch (e) { return s.toLowerCase(); } };

  function message(s) {
    if (!s || typeof s !== 'object') return '';
    const t = num(s.feels) ?? num(s.temp);
    const k = s.kind === 'storm' || s.kind === 'snow' || s.kind === 'fog' ? s.kind
      : wet(s.kind) ? 'rain'
      : t !== null && t >= 30 ? 'hot'
      : t !== null && t <= 3 ? 'cold'
      : s.kind === 'clear' ? (s.isDay ? 'sunny' : 'night') : 'cloudy';
    // güne göre sabit seçim: gün içinde değişmez
    const dayNo = Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);
    const list = LINES[k];
    const name = String(settings().name || '').trim();
    let line = list[dayNo % list.length].replace(/ \{name\}/g, name ? ' ' + name : '');
    const td = s.today, tm = s.tomorrow;
    if (!wet(s.kind) && s.isDay && td && num(td.rainChance) !== null && td.rainChance >= 60) line += ` Bugün yağış ihtimali %${td.rainChance}, şemsiyeni unutma ☂️`;
    else if (!wet(s.kind) && tm && wet(tm.kind)) line += ` Yarın: ${lower(tm.text)} ${tm.icon}`;
    else if (wet(s.kind) && tm && tm.kind === 'clear') line += ' Yarın güneş açıyor ☀️';
    return line;
  }

  function sceneParams(s) {
    if (!s || !s.kind) return null;
    return { kind: s.kind, intensity: U.clamp(num(s.intensity) ?? 0, 0, 1) };
  }

  return { load, cached, describe, message, sceneParams, status };
})();

// app.js `window.Weather` ile kontrol ediyor; üst düzey const window'a eklenmez
if (typeof window !== 'undefined') window.Weather = Weather;
