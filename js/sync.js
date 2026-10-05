/* Hesap ve cihazlar: WhatsApp gibi tek hesap, birden çok cihaz (telefon, iPad, bilgisayar).
   Aynı Google hesabıyla giriş yapılan her cihaz, verilerin tamamını Drive'daki gizli uygulama klasöründe kendi
   dosyasına yazar (luna-sync-<cihaz>.json, sıkıştırılmış). Her cihaz yalnızca kendi dosyasına yazdığı için iki cihaz
   aynı anda eşitlese de birbirinin üstüne yazamaz; okurken bütün cihazların dosyaları birleştirilir.

   Birleştirme kayıt kayıt yapılır:
   - her oturum, not, kart, deneme, görev, ders… ayrı bir kayıttır; iki cihazda farklı kayıtlar eklenirse ikisi de kalır
   - aynı kayıt iki cihazda değiştiyse en son değiştirilen kalır (saat + cihaz kimliği; saat sapmasına karşı mantıksal saat)
   - silinen kayıtlar "silindi" işaretiyle hatırlanır, başka cihazdan geri gelmez
   - balık, tamamlanan görev gibi sayaçlar cihaz başına tutulur ve toplanır (iki cihazda kazanılan balıkların ikisi de sayılır)
   - bu cihaza özgü olanlar eşitlenmez: çalışan sayaç, tema, bildirim izni, Asistan anahtarı ve sohbetleri, bu cihazdaki Depo dosyaları */

const Sync = (() => {
  let App = null;
  const D = () => Store.data;
  const API = 'https://www.googleapis.com/drive/v3/files';
  const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
  const SEP = '\u0001';
  const P = (...a) => a.join(SEP);
  const LOCAL_TOP = new Set(['version', 'timer', 'lastGoalDay', 'lastWeatherMsg', 'lastSpecialGreet', 'lastBackup', 'lastBackupNudge', 'lastMoonGreet', 'lastExamGreet']);
  const LOCAL_PATHS = new Set([P('settings', 'notify'), P('settings', 'theme'), P('yks', 'planCache')]);
  const RECORD_LISTS = new Set(['subjects', 'sessions', 'tasks', 'exams', 'review', 'denemeler', 'notes', 'mistakes', 'refs', 'files', 'cards', P('uni', 'courses'), P('uni', 'events'), P('uni', 'calendar')]);
  const SET_LISTS = new Set([P('stats', 'planFullDates')]);
  const COUNTERS = new Set(['fish', 'fed', 'tasksDone', 'reviewDone', P('stats', 'planItems'), P('stats', 'planFull'), P('stats', 'cardReviews'), P('stats', 'aiAsked'), P('stats', 'mistakesLearned'), P('stats', 'mistakeReviews')]);
  const TOMB_DAYS = 120;
  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  const isRecordList = (p) => RECORD_LISTS.has(p) || (p.startsWith('subjectSets' + SEP) && p.split(SEP).length === 2);

  // ---------- yardımcılar ----------
  // anahtar sırası farklı ama içeriği aynı iki kayıt "değişti" sayılmasın
  function stable(v) {
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    if (isObj(v)) return '{' + Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
    return JSON.stringify(v === undefined ? null : v);
  }
  function hash(str) { // cyrb53
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  // değişmeyen kayıtlar için yerleşik (hızlı) JSON ile karşılaştırıp sıralı özeti yeniden hesaplamayız
  const hcache = new WeakMap();
  function hv(v) {
    if (!v || typeof v !== 'object') return hash(JSON.stringify(v === undefined ? null : v));
    const fast = JSON.stringify(v), c = hcache.get(v);
    if (c && c.fast === fast) return c.h;
    const h = hash(stable(v));
    hcache.set(v, { fast, h });
    return h;
  }
  const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('');
  function guessName() {
    const ua = navigator.userAgent || '';
    if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad';
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Android telefon' : 'Android tablet';
    if (/Macintosh|Mac OS X/.test(ua)) return 'Mac';
    if (/Windows/.test(ua)) return 'Windows bilgisayar';
    return 'Bilgisayar';
  }
  const devIcon = (n) => (/iPad|tablet/i.test(n) ? '📱' : /iPhone|telefon|phone/i.test(n) ? '📱' : '💻');
  function ago(t) {
    if (!t) return '';
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'az önce';
    if (m < 60) return `${m} dk önce`;
    if (m < 60 * 24) return `${Math.round(m / 60)} sa önce`;
    return `${Math.round(m / 1440)} gün önce`;
  }

  // ---------- veriyi kayıtlara ayırma / geri yazma ----------
  function flatten(data) {
    const atoms = new Map(), cnt = {};
    (function walk(obj, path) {
      for (const k of Object.keys(obj)) {
        if (!path && LOCAL_TOP.has(k)) continue;
        const p = path ? path + SEP + k : k, v = obj[k];
        if (v === undefined || LOCAL_PATHS.has(p)) continue;
        if (COUNTERS.has(p)) { cnt[p] = +v || 0; continue; }
        if (Array.isArray(v) && isRecordList(p)) {
          for (const r of v) if (isObj(r) && r.id != null && r.id !== '' && !(p === 'files' && r.src === 'local')) atoms.set(p + SEP + '#' + r.id, r);
        } else if (Array.isArray(v) && SET_LISTS.has(p)) {
          for (const x of v) atoms.set(p + SEP + '=' + x, true);
        } else if (isObj(v)) walk(v, p);
        else atoms.set(p, v);
      }
    })(data, '');
    return { atoms, cnt };
  }
  function objAt(data, segs, mk) {
    let o = data;
    for (const s of segs) {
      if (!isObj(o[s])) { if (!mk) return null; o[s] = {}; }
      o = o[s];
    }
    return o;
  }
  function listAt(data, segs, mk) {
    const parent = objAt(data, segs.slice(0, -1), mk);
    if (!parent) return null;
    const k = segs[segs.length - 1];
    if (!Array.isArray(parent[k])) { if (!mk) return null; parent[k] = []; }
    return parent[k];
  }
  function setAt(data, key, v) {
    const segs = key.split(SEP), last = segs.pop();
    if (last[0] === '#') {
      const arr = listAt(data, segs, true), id = last.slice(1);
      const i = arr.findIndex((r) => r && String(r.id) === id);
      if (i >= 0) arr[i] = v;
      else if (segs.join(SEP) === 'sessions' && v.start) { // oturumlar zamana göre sıralı kalsın
        let j = arr.length;
        while (j > 0 && (arr[j - 1].start || 0) > v.start) j--;
        arr.splice(j, 0, v);
      } else arr.push(v);
    } else if (last[0] === '=') {
      const arr = listAt(data, segs, true), x = last.slice(1);
      if (!arr.includes(x)) { arr.push(x); arr.sort(); }
    } else objAt(data, segs, true)[last] = v;
  }
  function delAt(data, key) {
    const segs = key.split(SEP), last = segs.pop();
    if (last[0] === '#' || last[0] === '=') {
      const arr = listAt(data, segs, false);
      if (!arr) return;
      const i = last[0] === '#' ? arr.findIndex((r) => r && String(r.id) === last.slice(1)) : arr.indexOf(last.slice(1));
      if (i >= 0) arr.splice(i, 1);
    } else {
      const o = objAt(data, segs, false);
      if (o) delete o[last];
    }
  }

  // ---------- durum (IndexedDB) ----------
  const KV = (() => {
    let dbp = null;
    const open = () => dbp || (dbp = new Promise((res, rej) => {
      const r = indexedDB.open('luna-sync', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result);
      r.onerror = () => { dbp = null; rej(r.error); };
    }));
    const tx = async (mode, fn) => {
      const db = await open();
      return new Promise((res, rej) => {
        const t = db.transaction('kv', mode);
        const q = fn(t.objectStore('kv'));
        t.oncomplete = () => res(q ? q.result : undefined);
        t.onerror = () => rej(t.error);
        t.onabort = () => rej(t.error);
      });
    };
    return { get: (k) => tx('readonly', (s) => s.get(k)), put: (k, v) => tx('readwrite', (s) => s.put(v, k)), del: (k) => tx('readwrite', (s) => s.delete(k)) };
  })();
  const ON = 'luna-sync-on'; // hızlı karar için küçük kopya (açılışta eşzamanlı okunur)
  let on = (() => { try { return JSON.parse(localStorage.getItem(ON) || 'null') || { on: false }; } catch (e) { return { on: false }; } })();
  const saveOn = () => { try { localStorage.setItem(ON, JSON.stringify(on)); } catch (e) { /* yok say */ } };
  let st = null;
  const fresh = () => ({ dev: '', devName: '', clock: 0, meta: {}, shadow: {}, cnt: {}, cntLocal: {}, rev: {}, files: {}, myFile: '', ver: 0, upVer: -1, lastSync: 0, lastErr: '', devices: [], since: Date.now() });
  let persistP = Promise.resolve();
  const persist = () => (persistP = persistP.then(() => (st ? KV.put('state', st) : null)).catch(() => {}));

  // ---------- değişiklikleri damgalama ----------
  const tick = () => (st.clock = Math.max(Date.now(), st.clock + 1));
  const newer = (a, b) => a[0] > b[0] || (a[0] === b[0] && String(a[1]) > String(b[1]));
  // initial: hesaba ilk girişte bu cihazdaki her şey "eski" damgalanır; varsayılan değerler (1) özelleştirilmişlerin (2) gerisinde kalır
  function stamp(initial) {
    const { atoms, cnt } = flatten(D());
    const defs = initial ? flatten(Store.defaults()).atoms : null;
    let changed = 0;
    for (const [k, v] of atoms) {
      const h = hv(v);
      if (st.shadow[k] === h) continue;
      st.shadow[k] = h;
      st.meta[k] = initial ? [defs.has(k) && hv(defs.get(k)) === h ? 1 : 2, st.dev] : [tick(), st.dev];
      changed++;
    }
    for (const k of Object.keys(st.shadow)) {
      if (atoms.has(k)) continue;
      delete st.shadow[k];
      st.meta[k] = [tick(), st.dev, 1];
      changed++;
    }
    // hesaptan önce silinmiş varsayılanlar (ör. silinen hazır ders) başka cihazdan geri gelmesin
    if (initial) for (const k of defs.keys()) if (!atoms.has(k) && !st.meta[k]) { st.meta[k] = [2, st.dev, 1]; changed++; }
    for (const p of Object.keys(cnt)) {
      const d = cnt[p] - (st.cntLocal[p] || 0);
      if (!d) continue;
      const c = st.cnt[p] || (st.cnt[p] = {}), mine = c[st.dev] || (c[st.dev] = [0, 0]);
      if (d > 0) mine[0] += d; else mine[1] -= d;
      st.cntLocal[p] = cnt[p];
      changed++;
    }
    if (changed) st.ver++;
    return changed;
  }
  function gcTombstones() {
    const cut = Date.now() - TOMB_DAYS * 864e5;
    for (const k of Object.keys(st.meta)) { const m = st.meta[k]; if (m[2] && m[0] > 2 && m[0] < cut) delete st.meta[k]; }
  }

  // ---------- birleştirme ----------
  function mergeDocs(docs) {
    const vals = new Map(), dels = new Set();
    let metaChanged = false;
    for (const doc of docs) {
      const meta = isObj(doc.meta) ? doc.meta : {}, atoms = isObj(doc.atoms) ? doc.atoms : {};
      for (const k of Object.keys(meta)) {
        const r = meta[k];
        if (!Array.isArray(r) || typeof r[0] !== 'number') continue;
        if (r[0] > st.clock && r[0] < Date.now() + 864e5) st.clock = r[0]; // gördüğümüz en yeni andan ileri yazalım
        const l = st.meta[k];
        if (l && !newer(r, l)) continue;
        if (!r[2] && !(k in atoms)) continue; // değeri eksik kayıt: atla
        st.meta[k] = r; metaChanged = true;
        if (r[2]) { dels.add(k); vals.delete(k); } else { vals.set(k, atoms[k]); dels.delete(k); }
      }
      for (const p of Object.keys(isObj(doc.cnt) ? doc.cnt : {})) {
        if (!COUNTERS.has(p) || !isObj(doc.cnt[p])) continue;
        const c = st.cnt[p] || (st.cnt[p] = {});
        for (const dv of Object.keys(doc.cnt[p])) {
          const x = doc.cnt[p][dv], m = c[dv] || (c[dv] = [0, 0]);
          if (!Array.isArray(x)) continue;
          if ((+x[0] || 0) > m[0]) { m[0] = +x[0]; metaChanged = true; }
          if ((+x[1] || 0) > m[1]) { m[1] = +x[1]; metaChanged = true; }
        }
      }
      for (const dv of Object.keys(isObj(doc.rev) ? doc.rev : {})) if (!(st.rev[dv] >= doc.rev[dv])) { st.rev[dv] = +doc.rev[dv]; metaChanged = true; }
    }
    const data = D();
    for (const [k, v] of vals) { setAt(data, k, v); st.shadow[k] = hv(v); }
    for (const k of dels) { delAt(data, k); delete st.shadow[k]; }
    let n = vals.size + dels.size;
    for (const p of Object.keys(st.cnt)) {
      let tot = 0;
      for (const x of Object.values(st.cnt[p])) tot += (x[0] || 0) - (x[1] || 0);
      tot = Math.max(0, tot);
      const segs = p.split(SEP), last = segs.pop(), o = objAt(data, segs, true);
      if ((+o[last] || 0) !== tot) { o[last] = tot; n++; }
      st.cntLocal[p] = tot;
    }
    if (n) dedupeFiles();
    if (metaChanged) st.ver++;
    return n;
  }
  // iki cihaz aynı Drive dosyası için ayrı kayıt açtıysa (Depo eşitlemesi) biri kalsın; her cihaz aynısını seçer
  function dedupeFiles() {
    const keep = new Map();
    for (const f of D().files) if (f.src === 'drive' && f.rid && (!keep.has(f.rid) || String(f.id) < String(keep.get(f.rid).id))) keep.set(f.rid, f);
    D().files = D().files.filter((f) => !(f.src === 'drive' && f.rid) || keep.get(f.rid) === f);
  }

  // ---------- Drive ----------
  async function pack(obj) {
    const json = JSON.stringify(obj);
    if (typeof CompressionStream === 'undefined') return { blob: new Blob([json], { type: 'application/json' }), enc: 'json' };
    const s = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
    return { blob: await new Response(s).blob(), enc: 'gz' };
  }
  async function unpack(blob, enc) {
    if (enc === 'gz') {
      if (typeof DecompressionStream === 'undefined') throw new Error('Bu tarayıcı eşitleme dosyasını açamıyor; tarayıcıyı güncelle');
      return JSON.parse(await new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text());
    }
    return JSON.parse(await blob.text());
  }
  async function listFiles() {
    const q = encodeURIComponent("name contains 'luna-sync-' and trashed=false");
    const j = await (await GAuth.api(`${API}?spaces=appDataFolder&q=${q}&pageSize=100&fields=files(id,name,modifiedTime,appProperties)`)).json();
    return (j.files || []).filter((f) => f.appProperties && f.appProperties.luna === 'sync' && f.appProperties.dev);
  }
  async function download(f) {
    const blob = await (await GAuth.api(`${API}/${encodeURIComponent(f.id)}?alt=media`)).blob();
    return unpack(blob, f.appProperties.enc);
  }
  async function upload(doc) {
    const { blob, enc } = await pack(doc);
    const create = !st.myFile;
    const meta = { appProperties: { luna: 'sync', dev: st.dev, name: (st.devName || 'Cihaz').slice(0, 40), enc, at: String(doc.at), out: '0' } };
    if (create) Object.assign(meta, { name: `luna-sync-${st.dev}.json`, parents: ['appDataFolder'] });
    const b = 'luna' + rid();
    const body = new Blob([`--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${b}\r\nContent-Type: application/octet-stream\r\n\r\n`, blob, `\r\n--${b}--`]);
    const url = create ? `${UPLOAD}?uploadType=multipart&fields=id` : `${UPLOAD}/${encodeURIComponent(st.myFile)}?uploadType=multipart&fields=id`;
    try {
      const j = await (await GAuth.api(url, { method: create ? 'POST' : 'PATCH', headers: { 'Content-Type': `multipart/related; boundary=${b}` }, body })).json();
      st.myFile = j.id || st.myFile;
    } catch (e) {
      if (!create && e.status === 404) { st.myFile = ''; return upload(doc); } // dosya silinmişse yeniden oluştur
      throw e;
    }
  }
  function buildDoc() {
    const { atoms } = flatten(D());
    const a = {};
    for (const [k, v] of atoms) a[k] = v;
    return { v: 1, dev: st.dev, name: st.devName, at: Date.now(), meta: st.meta, atoms: a, cnt: st.cnt, rev: st.rev };
  }
  const patchMeta = (id, appProperties) => GAuth.api(`${API}/${encodeURIComponent(id)}?fields=id`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appProperties }) });

  // ---------- eşitleme ----------
  let busy = false, again = '', applying = false, saveT = 0, lastFull = 0, hiddenAt = 0, status = '', lastNotice = 0;
  function uiIdle() {
    const m = document.getElementById('modal');
    if (m && !m.classList.contains('hidden')) return false;
    const a = document.activeElement;
    return !(a && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && !/^(checkbox|radio|range|button|submit|color|file)$/.test(a.type))));
  }
  let idleWait = 0;
  function whenIdle() {
    if (idleWait) return;
    const until = Date.now() + 15 * 60e3;
    idleWait = setInterval(() => {
      if (!on.on || !st || Date.now() > until) { clearInterval(idleWait); idleWait = 0; return; }
      if (uiIdle() && !busy && !document.hidden) { clearInterval(idleWait); idleWait = 0; syncNow('idle'); }
    }, 1500);
  }
  function setStatus(s) { status = s; if (App && App.currentTab && App.currentTab() === 'settings') renderCard(); }

  // pushOnly: yalnızca bu cihazın değişikliklerini gönder (bir pencere açıkken ya da uygulamadan çıkarken)
  async function syncNow(reason = '', pushOnly = false) {
    if (!st || !on.on) return false;
    if (busy) { if (!pushOnly || !again) again = pushOnly ? 'push' : 'full'; return false; }
    if (!GAuth.canSync()) { setStatus(GAuth.hasToken() ? 'scope' : 'renew'); return false; }
    if (navigator.onLine === false) { setStatus('offline'); return false; }
    busy = true; setStatus('busy');
    try {
      stamp();
      const list = await listFiles();
      st.devices = list.map((f) => ({ id: f.id, dev: f.appProperties.dev, name: f.appProperties.name || 'Cihaz', at: +f.appProperties.at || Date.parse(f.modifiedTime) || 0, out: f.appProperties.out === '1' }));
      const mine = list.find((f) => f.appProperties.dev === st.dev);
      st.myFile = mine ? mine.id : '';
      let applied = 0;
      if (!pushOnly) {
        const docs = [];
        for (const f of list) {
          if (f.appProperties.dev === st.dev || st.files[f.id] === f.modifiedTime) continue;
          try { docs.push({ f, doc: await download(f) }); } catch (e) { if (e instanceof GAuth.NeedAuth) throw e; if (window.ErrLog) ErrLog.add('Eşitleme dosyası okunamadı: ' + e.message, 'sync.js'); }
        }
        if (docs.length && uiIdle()) {
          stamp(); // indirme sürerken yapılan değişiklikler önce damgalansın, üzerine yazılmasın
          applied = mergeDocs(docs.map((x) => x.doc));
          for (const x of docs) st.files[x.f.id] = x.f.modifiedTime;
          if (applied) stamp(); // birleştirmenin yol açtığı temizlikler (çift dosya kaydı) de gitsin
        }
        if (docs.length && !uiIdle()) whenIdle(); // bir pencere açıktı: kapanınca birleştir
        if (st.rev[st.dev]) { await revokedHere(); return false; }
        lastFull = Date.now();
      }
      if (applied) { applying = true; Store.save(); applying = false; }
      gcTombstones();
      if (st.ver !== st.upVer || !st.myFile) {
        const v = st.ver;
        await upload(buildDoc());
        st.upVer = v;
      }
      st.lastSync = Date.now(); st.lastErr = '';
      await persist();
      setStatus('ok');
      if (applied && App) {
        App.syncApplied();
        if (reason !== 'tick' && Date.now() - lastNotice > 10 * 60e3) { lastNotice = Date.now(); App.toast('☁️', 'Diğer cihazından güncellendi', `${applied} değişiklik geldi`); }
      }
      return true;
    } catch (e) {
      if (e instanceof GAuth.NeedAuth) setStatus('renew');
      else { st.lastErr = e.message || String(e); setStatus('err'); }
      persist();
      return false;
    } finally {
      busy = false;
      if (again) { const p = again === 'push'; again = ''; setTimeout(() => syncNow('again', p), 1500); }
    }
  }

  // hesaba ilk giriş (bu cihaz yeni bir bağlı cihaz olur; bu cihazdaki veriler hesaptakilerle birleşir)
  async function enable() {
    st = fresh();
    st.dev = rid();
    st.devName = guessName();
    stamp(true);
    try { await GAuth.profile(); } catch (e) { /* e-posta sonra gelir */ }
    on = { on: true, dev: st.dev, email: GAuth.email() };
    saveOn();
    await persist();
    if (window.Depo && GAuth.canFiles()) Depo.connect(); // tek giriş: Depo dosyaları da Drive'a
    App.toast('👤', 'Hesabına giriş yapıldı', `${GAuth.email() || 'Google hesabın'} · diğer cihazında da aynı hesapla giriş yap, veriler birleşir`, 8000);
    await syncNow('enable');
  }
  function clearLocal() {
    st = null;
    on = { on: false };
    saveOn();
    KV.del('state').catch(() => {});
    GAuth.forget();
    if (window.Depo) { Object.assign(Depo.cfg(), { connected: false }); Depo.saveCfg(); }
  }
  // bu cihazda çıkış: son değişiklikler gönderilir, veriler bu cihazda kalır, eşitleme durur
  async function signOut() {
    if (st && GAuth.canSync()) {
      try { await syncNow('final', true); if (st.myFile) await patchMeta(st.myFile, { out: '1' }); } catch (e) { /* çevrimdışıysa da çıkış yapılabilsin */ }
    }
    clearLocal();
    setStatus('');
  }
  async function revokedHere() {
    try { if (st.myFile) await patchMeta(st.myFile, { out: '1' }); } catch (e) { /* yok say */ }
    clearLocal();
    setStatus('');
    if (App) App.toast('👤', 'Bu cihaz hesaptan çıkarıldı', 'Başka bir cihazından çıkış yaptırıldı; verilerin bu cihazda duruyor', 9000);
  }
  function revoke(dev) {
    if (!st || dev === st.dev) return;
    st.rev[dev] = Date.now();
    st.ver++;
    st.devices = st.devices.filter((d) => d.dev !== dev);
    persist();
    syncNow('revoke', true);
  }

  // açılışta: giriş süresi dolmuşsa sessizce yenile (sayaç çalışırken değil)
  function wantRenew() {
    if (!on.on || GAuth.hasToken() || GAuth.lastReturn()) return false;
    const t = D().timer;
    if (t && t.running && t.phase === 'focus') return false;
    return GAuth.canTrySilent();
  }

  // ---------- Ayarlar kartı ----------
  function renderCard() {
    const el = document.getElementById('account-card');
    if (!el) return;
    const esc = U.esc, cid = GAuth.clientId();
    if (!on.on || !st) {
      el.innerHTML = `<h2>👤 Hesap ve cihazlar</h2>
        <p>WhatsApp gibi: telefonunda ve iPad'inde <b>aynı Google hesabıyla</b> giriş yap. Oturumların, planın, notların, kartların, denemelerin, derslerin ve Depo dosyaların iki cihazda da aynı olur; birinde yaptığın değişiklik diğerine kendiliğinden geçer.</p>
        ${cid ? '<button class="btn primary google-btn" data-sy="login" type="button"><span class="g-logo" aria-hidden="true">G</span> Google ile giriş yap</button>'
          : `<details class="drive-setup"><summary>☁️ Google ile giriş yap (ilk kurulum)</summary>
            <p class="hint">Bir kez yapılır; adımlar Kılavuz → <b>Hesap, cihazlar ve Google Drive</b>. Google Cloud'da "Authorized redirect URI" olarak şunu ekle:</p>
            <code class="sp-uri">${esc(GAuth.redirectUri())}</code>
            <div class="inline-form"><input data-sy="client" placeholder="Client ID (…apps.googleusercontent.com)" autocomplete="off" spellcheck="false"><button class="btn primary" data-sy="login" type="button">Giriş yap</button></div>
          </details>`}
        <p class="muted small">🔒 Veriler senin Google Drive'ında, yalnızca bu uygulamanın erişebildiği gizli bir klasörde durur; Drive'daki diğer dosyalarını göremez. Arada sunucu yok. Asistan sohbetleri ve API anahtarı her cihazda ayrı kalır.</p>`;
      return;
    }
    const pill = {
      ok: ['ok', `☁️ Eşitlendi · ${ago(st.lastSync)}`], busy: ['busy', '⏳ Eşitleniyor…'], renew: ['warn', '🔄 Giriş yenilenmeli'],
      scope: ['warn', '🔒 Eşitleme izni eksik'], err: ['warn', '⚠️ Eşitlenemedi'], offline: ['', '📴 Çevrimdışı'],
    }[status] || ['', st.lastSync ? `☁️ Son eşitleme ${ago(st.lastSync)}` : '☁️ Bekliyor'];
    const devs = (st.devices || []).filter((d) => !d.out && !st.rev[d.dev]);
    if (!devs.some((d) => d.dev === st.dev)) devs.unshift({ dev: st.dev, name: st.devName, at: st.lastSync });
    devs.sort((a, b) => (a.dev === st.dev ? -1 : b.dev === st.dev ? 1 : b.at - a.at));
    const name = GAuth.name() || D().settings.name || '';
    el.innerHTML = `<h2>👤 Hesap ve cihazlar</h2>
      <div class="acct"><span class="acct-av" aria-hidden="true">${esc((name || GAuth.email() || '?').charAt(0).toLocaleUpperCase('tr-TR'))}</span>
        <div class="acct-id"><b>${esc(name || 'Google hesabı')}</b><small>${esc(GAuth.email())}</small></div>
        <span class="sync-pill ${pill[0]}">${pill[1]}</span></div>
      ${status === 'renew' ? '<p class="hint">Google girişi güvenlik için saatte bir yenilenir; uygulamayı açtığında kendiliğinden yenilenir. <button class="btn soft small-btn" data-sy="renew" type="button">🔄 Şimdi yenile</button></p>' : ''}
      ${status === 'scope' ? '<p class="hint">Girişte "uygulama verilerini görme" izni verilmemiş. <button class="btn soft small-btn" data-sy="renew" type="button">İzni ver</button></p>' : ''}
      ${status === 'err' && st.lastErr ? `<p class="hint" style="color:var(--red)">${esc(st.lastErr)}</p>` : ''}
      <h3 class="sub-h">Bağlı cihazlar</h3>
      <ul class="dev-list">${devs.map((d) => {
        const me = d.dev === st.dev;
        return `<li><span class="dev-ic" aria-hidden="true">${devIcon(d.name)}</span><div><b>${esc(d.name)}${me ? ' <span class="muted small">(bu cihaz)</span>' : ''}</b><small>${me ? (st.lastSync ? 'son eşitleme ' + ago(st.lastSync) : 'ilk eşitleme bekleniyor') : 'son görülme ' + ago(d.at)}</small></div>
          ${me ? '<button class="chip" data-sy="rename" type="button">✏️ Ad</button>' : `<button class="chip" data-sy="revoke" data-dev="${esc(d.dev)}" data-name="${esc(d.name)}" type="button">Çıkış yaptır</button>`}</li>`;
      }).join('')}</ul>
      ${devs.length < 2 ? '<p class="hint">Diğer cihazında (telefon ya da iPad) uygulamayı aç, Ayarlar → Hesap ve cihazlar → <b>Google ile giriş yap</b>. İki cihazdaki veriler birleşir, hiçbiri silinmez.</p>' : ''}
      <div class="row acct-actions"><button class="btn soft" data-sy="sync" type="button" ${status === 'busy' ? 'disabled' : ''}>↻ Şimdi eşitle</button><button class="btn soft" data-sy="logout" type="button">Bu cihazda çıkış yap</button></div>`;
  }
  function bindCard() {
    const el = document.getElementById('account-card');
    if (!el) return;
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-sy]');
      if (!b || b.tagName === 'INPUT') return;
      const act = b.dataset.sy;
      if (act === 'login') {
        const inp = el.querySelector('[data-sy="client"]');
        if (inp) {
          const id = inp.value.trim();
          if (!GAuth.validClient(id)) { App.toast('☁️', 'Client ID biçimi tanınmadı', '…apps.googleusercontent.com ile biten kodu yapıştır'); return; }
          GAuth.setClientId(id);
        }
        GAuth.authorize('account');
      } else if (act === 'renew') GAuth.authorize('account', false);
      else if (act === 'sync') { const ok = await syncNow('manual'); if (ok) App.toast('☁️', 'Eşitlendi', 'Her şey güncel'); else if (status === 'err') App.toast('⚠️', 'Eşitlenemedi', st && st.lastErr); }
      else if (act === 'rename') {
        const n = prompt('Bu cihazın adı (diğer cihazlarda böyle görünür):', st.devName);
        if (n == null || !n.trim()) return;
        st.devName = n.trim().slice(0, 40);
        persist(); renderCard();
        if (st.myFile && GAuth.canSync()) patchMeta(st.myFile, { name: st.devName }).catch(() => {});
      } else if (act === 'revoke') {
        if (!confirm(`"${b.dataset.name}" hesaptan çıkarılsın mı? O cihaz bir sonraki açılışta eşitlemeyi bırakır; verileri o cihazda kalır, buradakiler silinmez.`)) return;
        revoke(b.dataset.dev);
        renderCard();
        App.toast('👤', `${b.dataset.name} çıkarıldı`, 'Yeniden bağlamak için o cihazda tekrar giriş yapılabilir');
      } else if (act === 'logout') {
        if (!confirm('Bu cihazda hesaptan çıkılsın mı? Verilerin bu cihazda kalır ve diğer cihazlarında da durur; yalnızca bu cihaz artık eşitlenmez.')) return;
        await signOut();
        renderCard();
        App.toast('👤', 'Bu cihazda çıkış yapıldı', 'Verilerin bu cihazda duruyor');
      }
    });
  }

  // ---------- başlatma ----------
  async function init(app) {
    App = app;
    bindCard();
    try { st = (await KV.get('state')) || null; } catch (e) { st = null; }
    if (st) st = { ...fresh(), ...st };
    if (on.on && (!st || st.dev !== on.dev)) { st = null; on = { on: false }; saveOn(); } // durum kaybolmuş: yeniden giriş gerekir
    const r = GAuth.lastReturn();
    if (r && !r.silent && r.purpose === 'account') {
      if (r.result === 'denied') App.toast('👤', 'Giriş tamamlanmadı', 'İzin verilmedi; istediğin zaman yeniden deneyebilirsin');
      else if (r.result === 'state') App.toast('👤', 'Giriş tamamlanamadı', 'Bir kez daha "Google ile giriş yap"a dokun');
    }
    if (r && r.result === 'ok' && !r.silent && !on.on) {
      if (GAuth.canSync()) await enable();
      else if (r.purpose === 'account') App.toast('👤', 'Eşitleme izni verilmedi', 'Girişte "uygulama verilerini görme" iznini işaretle');
    } else if (on.on && st) {
      if (r && r.result === 'ok' && !r.silent) {
        // yenilerken başka bir Google hesabı seçildiyse o hesaba yeni cihaz olarak bağlan
        try { await GAuth.profile(); } catch (e) { /* yok say */ }
        if (on.email && GAuth.email() && GAuth.email() !== on.email && GAuth.canSync()) { await enable(); renderCard(); return startLoops(); }
        if (r.purpose === 'account') App.toast('👤', 'Giriş yenilendi', GAuth.email());
      }
      if (GAuth.canSync()) setTimeout(() => syncNow('start'), 1200);
      else setStatus(GAuth.hasToken() ? 'scope' : 'renew');
    }
    renderCard();
    startLoops();
  }
  let loops = false;
  function startLoops() {
    if (loops) return;
    loops = true;
    let pendingSince = 0;
    Store.onSave(() => {
      if (!on.on || applying) return;
      clearTimeout(saveT);
      if (!pendingSince) pendingSince = Date.now();
      // yazmayı bitirince 4 sn sonra gönder; sürekli kayıt olsa bile en geç 20 sn'de bir
      const wait = Math.max(0, Math.min(4000, pendingSince + 20000 - Date.now()));
      saveT = setTimeout(() => { pendingSince = 0; if (st && stamp()) { persist(); syncNow('save', !uiIdle()); } }, wait);
    });
    setInterval(() => { if (on.on && st && !document.hidden) syncNow('tick', !uiIdle()); }, 120000);
    document.addEventListener('visibilitychange', () => {
      if (!on.on || !st) return;
      if (document.hidden) {
        hiddenAt = Date.now();
        clearTimeout(saveT);
        if (GAuth.canSync()) syncNow('hide', true);
        return;
      }
      if (GAuth.canSync()) { if (Date.now() - lastFull > 20000) syncNow('show', !uiIdle()); }
      else if (hiddenAt && Date.now() - hiddenAt > 10 * 60e3 && uiIdle() && !App.isFocusing() && GAuth.canTrySilent()) GAuth.authorize('renew', true);
    });
    window.addEventListener('online', () => { if (on.on && st && GAuth.canSync()) syncNow('online'); });
  }

  return {
    init, renderCard, syncNow, wantRenew, signOut,
    enabled: () => !!(on.on && st),
    status() { return { on: !!on.on, email: on.email || GAuth.email(), state: status, last: st ? st.lastSync : 0, err: st ? st.lastErr : '', devices: st ? (st.devices || []).filter((d) => !d.out && !st.rev[d.dev]).length : 0, dev: st ? st.devName : '' }; },
    // testler ve tanılama için iç parçalar
    _: { flatten, mergeDocs, stamp, stable, hv, state: () => st },
  };
})();

if (typeof window !== 'undefined') { window.Sync = Sync; }
