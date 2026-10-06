/* Depo: ders ders fotoğraf, PDF, çalışma kağıdı ve ödev dosyaları.
   Dosyalar Hazal'ın kendi Google Drive'ında "Luna Depo" klasöründe durur (iPad'de yer kaplamaz);
   Drive bağlanana kadar bu cihazda (IndexedDB) saklanır ve sonra tek dokunuşla Drive'a taşınır.
   İzin: drive.file — uygulama yalnızca kendi yüklediği dosyaları görebilir. Sunucu yok. */

const Depo = (() => {
  let App = null;
  const $ = (s, el = document) => el.querySelector(s);
  const D = () => Store.data;

  const KINDS = {
    not: ['📄', 'Ders notu'], kagit: ['📝', 'Çalışma kağıdı'], odev: ['📊', 'Proje / ödev'],
    kitap: ['📚', 'Kitap / makale'], foto: ['📸', 'Fotoğraf'], video: ['🎬', 'Ders videosu'], hata: ['❌', 'Hata defteri'], diger: ['🗂️', 'Diğer'],
  };
  const isImg = (m) => /^image\//.test(m || '');
  const isPdf = (m) => m === 'application/pdf';
  const isVideo = (m) => /^video\//.test(m || '');
  const fmtSize = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

  // ---------- Bu cihazdaki depo (IndexedDB) ----------
  const IDB = (() => {
    let dbp = null;
    const open = () => dbp || (dbp = new Promise((res, rej) => {
      const r = indexedDB.open('luna-depo', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('files');
      r.onsuccess = () => res(r.result);
      r.onerror = () => { dbp = null; rej(r.error); };
    }));
    const tx = async (mode, fn) => {
      const db = await open();
      return new Promise((res, rej) => {
        const t = db.transaction('files', mode);
        const req = fn(t.objectStore('files'));
        t.oncomplete = () => res(req ? req.result : undefined);
        t.onerror = () => rej(t.error);
        t.onabort = () => rej(t.error);
      });
    };
    return {
      put: (k, v) => tx('readwrite', (s) => s.put(v, k)),
      get: (k) => tx('readonly', (s) => s.get(k)),
      del: (k) => tx('readwrite', (s) => s.delete(k)),
    };
  })();

  // ---------- Google Drive (giriş ve erişim anahtarı GAuth'ta: hesap eşitlemeyle aynı Google girişi) ----------
  const API = 'https://www.googleapis.com/drive/v3/files';
  const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
  const FIELDS = 'id,name,mimeType,size,createdTime,webViewLink,appProperties';
  const CKEY = 'luna-drive';
  let cfg = { folderId: '', connected: false };
  const NeedAuth = GAuth.NeedAuth;

  function loadCfg() {
    try { const c = JSON.parse(localStorage.getItem(CKEY) || '{}') || {}; cfg = { folderId: c.folderId || '', connected: !!c.connected }; } catch (e) { /* yok say */ }
  }
  function saveCfg() { try { localStorage.setItem(CKEY, JSON.stringify(cfg)); } catch (e) { /* yok say */ } }
  const hasToken = () => GAuth.canFiles();
  const driveReady = () => !!GAuth.clientId() && cfg.connected;
  const authorize = () => GAuth.authorize('depo');
  function gapi(url, opts) {
    if (!hasToken()) return Promise.reject(new NeedAuth());
    return GAuth.api(url, opts);
  }
  async function ensureFolder() {
    if (cfg.folderId) return cfg.folderId;
    const q = encodeURIComponent("mimeType='application/vnd.google-apps.folder' and name='Luna Depo' and trashed=false");
    const j = await (await gapi(`${API}?q=${q}&fields=files(id)&spaces=drive`)).json();
    if (j.files && j.files[0]) cfg.folderId = j.files[0].id;
    else {
      const c = await (await gapi(`${API}?fields=id`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Luna Depo', mimeType: 'application/vnd.google-apps.folder' }) })).json();
      cfg.folderId = c.id;
    }
    saveCfg();
    return cfg.folderId;
  }
  // yükleme ilerlemesi için XMLHttpRequest (fetch yükleme yüzdesi vermiyor)
  function xhr(method, url, headers, body, onProgress) {
    return new Promise((res, rej) => {
      const x = new XMLHttpRequest();
      x.open(method, url);
      for (const k of Object.keys(headers)) x.setRequestHeader(k, headers[k]);
      if (onProgress && x.upload) x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
      x.onload = () => {
        if (x.status === 401) { GAuth.dropToken(); rej(new NeedAuth()); return; }
        if (x.status < 200 || x.status >= 300) { const err = new Error('Drive yükleme hatası (HTTP ' + x.status + ')'); err.status = x.status; rej(err); return; }
        try { res(JSON.parse(x.responseText)); } catch (e) { res({}); }
      };
      x.onerror = () => rej(new Error('Yükleme sırasında bağlantı koptu'));
      x.send(body);
    });
  }
  async function driveUpload(blob, meta, onProgress, retried) {
    if (!hasToken()) throw new NeedAuth();
    const parent = await ensureFolder();
    const type = blob.type || 'application/octet-stream';
    const metadata = {
      name: meta.name, mimeType: type, parents: [parent],
      // başka cihazda bağlanınca ders/tür bilgisi geri gelsin (anahtar+değer en fazla 124 bayt)
      appProperties: { luna: '1', kind: meta.kind, subject: String(meta.subjectName || '').slice(0, 40) },
    };
    const auth = { Authorization: 'Bearer ' + GAuth.token() };
    try {
      if (blob.size <= 5 * 1048576) {
        const boundary = 'luna' + Math.random().toString(36).slice(2);
        const body = new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${type}\r\n\r\n`, blob, `\r\n--${boundary}--`]);
        return await xhr('POST', `${UPLOAD}?uploadType=multipart&fields=${FIELDS}`, { ...auth, 'Content-Type': `multipart/related; boundary=${boundary}` }, body, onProgress);
      }
      // büyük dosya: kaldığı yerden devam edebilen yükleme oturumu
      const init = await gapi(`${UPLOAD}?uploadType=resumable&fields=${FIELDS}`, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': type }, body: JSON.stringify(metadata) });
      const loc = init.headers.get('Location');
      if (!loc) throw new Error('Drive yükleme adresi vermedi');
      return await xhr('PUT', loc, { 'Content-Type': type }, blob, onProgress);
    } catch (e) {
      // klasör Drive'dan silinmişse bir kez yeniden oluştur
      if (!retried && e.status === 404) { cfg.folderId = ''; saveCfg(); return driveUpload(blob, meta, onProgress, true); }
      throw e;
    }
  }
  const driveDownload = async (rid) => (await gapi(`${API}/${encodeURIComponent(rid)}?alt=media`)).blob();
  const driveTrash = (rid) => gapi(`${API}/${encodeURIComponent(rid)}?fields=id`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{"trashed":true}' });
  async function driveList() {
    const parent = await ensureFolder();
    const out = [];
    let page = '';
    do {
      const q = encodeURIComponent(`'${parent}' in parents and trashed=false`);
      const j = await (await gapi(`${API}?q=${q}&pageSize=200&fields=nextPageToken,files(${FIELDS})${page ? '&pageToken=' + encodeURIComponent(page) : ''}`)).json();
      out.push(...(j.files || []));
      page = j.nextPageToken || '';
    } while (page);
    return out;
  }

  // ---------- Dosya içeriği ----------
  const blobCache = new Map(); // bu oturumda açılan dosyalar (hafızada, en fazla 6)
  async function getBlob(item) {
    if (blobCache.has(item.id)) return blobCache.get(item.id);
    let blob = null;
    if (item.src === 'local') blob = await IDB.get('f:' + item.id);
    else blob = await driveDownload(item.rid);
    if (!blob) throw new Error('Dosya bu cihazda bulunamadı');
    if (blob.type !== item.mime && item.mime) blob = new Blob([blob], { type: item.mime });
    if (blob.size < 20 * 1048576) { // büyük dosyalar (video) bellekte tutulmaz
      blobCache.set(item.id, blob);
      while (blobCache.size > 6) blobCache.delete(blobCache.keys().next().value);
    }
    return blob;
  }

  // fotoğrafları küçült: kenar en fazla 2200 px, JPEG — çalışma kağıdı okunur kalır, Drive'da az yer tutar
  async function shrink(file) {
    if (!isImg(file.type) || file.type === 'image/gif' || file.type === 'image/svg+xml' || !window.createImageBitmap) return file;
    try {
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, 2200 / Math.max(bmp.width, bmp.height));
      if (k === 1 && file.size < 1.5 * 1048576) { bmp.close && bmp.close(); return file; }
      const c = document.createElement('canvas');
      c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      bmp.close && bmp.close();
      const out = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
      if (!out || out.size >= file.size) return file;
      return new File([out], file.name.replace(/\.(heic|heif|png|webp|jpe?g)$/i, '') + '.jpg', { type: 'image/jpeg' });
    } catch (e) { return file; }
  }
  // küçük önizleme (IndexedDB'de; veri yedeğini şişirmez)
  async function makeThumb(blob) {
    try {
      const bmp = await createImageBitmap(blob);
      const k = Math.min(1, 320 / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      bmp.close && bmp.close();
      return await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.7));
    } catch (e) { return null; }
  }
  const thumbUrls = new Map();
  async function thumbUrl(item) {
    if (thumbUrls.has(item.id)) return thumbUrls.get(item.id);
    let url = '';
    try { const b = await IDB.get('t:' + item.id); if (b) url = URL.createObjectURL(b); } catch (e) { /* yok say */ }
    thumbUrls.set(item.id, url);
    return url;
  }
  async function saveThumb(item, blob) {
    if (!blob) return;
    try { await IDB.put('t:' + item.id, blob); } catch (e) { return; }
    if (thumbUrls.get(item.id)) URL.revokeObjectURL(thumbUrls.get(item.id));
    thumbUrls.delete(item.id);
  }

  // ---------- PDF.js (yalnızca bir PDF açılınca yüklenir) ----------
  let pdfjsP = null;
  const VENDOR = () => new URL('vendor/pdfjs/', location.href).href; // sayfaya göre mutlak adres
  function pdfjs() {
    if (!pdfjsP) {
      pdfjsP = import(VENDOR() + 'pdf.min.mjs').then((m) => {
        m.GlobalWorkerOptions.workerSrc = VENDOR() + 'pdf.worker.min.mjs';
        return m;
      }).catch((e) => { pdfjsP = null; throw e; });
    }
    return pdfjsP;
  }
  async function openPdf(blob) {
    const lib = await pdfjs();
    const data = new Uint8Array(await blob.arrayBuffer());
    const task = lib.getDocument({ data, standardFontDataUrl: VENDOR() + 'standard_fonts/', wasmUrl: VENDOR() + 'wasm/', iccUrl: VENDOR() + 'iccs/' });
    const pdf = await task.promise;
    pdf.close = () => task.destroy().catch(() => {}); // PDF.js 6: belge, yükleme görevi üzerinden kapatılır
    return pdf;
  }

  // ---------- Kaydetme / silme ----------
  async function addFiles(files, meta, onProgress) {
    const added = [];
    added.fellBack = 0; // Drive'a yüklenemeyip bu cihaza kaydedilenler
    for (let i = 0; i < files.length; i++) {
      const f = await shrink(files[i]);
      const item = {
        // Drive bağlı ama oturum süresi dolmuşsa dosya kaybolmasın: önce bu cihaza, sonra tek dokunuşla Drive'a
        id: U.uid(), src: driveReady() && hasToken() ? 'drive' : 'local', rid: '', name: (meta.title && files.length === 1 ? meta.title : f.name || 'dosya').slice(0, 120),
        mime: f.type || 'application/octet-stream', size: f.size, subjectId: meta.subjectId || '', kind: meta.kind, note: meta.note || '', created: Date.now(),
      };
      if (isImg(item.mime)) saveThumb(item, await makeThumb(f));
      if (item.src === 'drive') {
        try {
          const res = await driveUpload(f, { name: item.name, kind: item.kind, subjectName: Store.subject(item.subjectId).name }, (p) => onProgress && onProgress(i, files.length, p));
          item.rid = res.id;
        } catch (e) {
          // bağlantı koptu / oturum düştü: dosya kaybolmasın, bu cihaza kaydedilir ("Drive'a taşı" ile sonra gider)
          item.src = 'local';
          added.fellBack++;
        }
      }
      if (item.src === 'local') {
        await IDB.put('f:' + item.id, f);
        onProgress && onProgress(i, files.length, 1);
      }
      D().files.push(item);
      App.save();
      added.push(item);
    }
    return added;
  }
  async function remove(item) {
    if (item.src === 'drive' && item.rid) await driveTrash(item.rid); // Drive çöp kutusuna (30 gün geri alınabilir)
    if (item.src === 'local') await IDB.del('f:' + item.id).catch(() => {});
    await IDB.del('t:' + item.id).catch(() => {});
    blobCache.delete(item.id);
    D().files = D().files.filter((x) => x.id !== item.id);
    App.save();
  }
  // bu cihazdaki dosyaları Drive'a taşı (iPad'de yer açılır)
  let moving = null; // iki kez dokunulursa aynı dosyalar iki kez yüklenmesin
  function moveToDrive(onProgress) {
    if (!moving) moving = moveAll(onProgress).finally(() => { moving = null; });
    return moving;
  }
  async function moveAll(onProgress) {
    const list = D().files.filter((x) => x.src === 'local');
    let moved = 0;
    for (const item of list) {
      const blob = await IDB.get('f:' + item.id);
      if (!blob) continue;
      const res = await driveUpload(blob, { name: item.name, kind: item.kind, subjectName: Store.subject(item.subjectId).name }, (p) => onProgress && onProgress(moved, list.length, p));
      item.src = 'drive'; item.rid = res.id;
      App.save();
      await IDB.del('f:' + item.id).catch(() => {});
      moved++;
    }
    return moved;
  }
  // Drive klasörü asıl kaynak: başka cihazdan yüklenenler eklenir, Drive'dan silinenler listeden çıkar
  async function syncDrive() {
    const remote = await driveList();
    const byRid = new Map(remote.map((f) => [f.id, f]));
    const known = new Set(D().files.filter((x) => x.src === 'drive').map((x) => x.rid));
    let added = 0, removed = 0;
    for (const f of remote) {
      if (known.has(f.id)) continue;
      const ap = f.appProperties || {};
      const subj = D().subjects.find((s) => s.name === ap.subject);
      D().files.push({
        id: U.uid(), src: 'drive', rid: f.id, name: f.name, mime: f.mimeType, size: +f.size || 0,
        subjectId: subj ? subj.id : '', kind: KINDS[ap.kind] ? ap.kind : isImg(f.mimeType) ? 'foto' : 'diger', note: '',
        created: Date.parse(f.createdTime) || Date.now(), link: f.webViewLink || '',
      });
      added++;
    }
    const before = D().files.length;
    D().files = D().files.filter((x) => x.src !== 'drive' || byRid.has(x.rid));
    removed = before - D().files.length;
    if (added || removed) App.save();
    return { added, removed };
  }

  return {
    KINDS, isImg, isPdf, isVideo, fmtSize, IDB, NeedAuth,
    loadCfg, cfg: () => cfg, saveCfg, redirectUri: GAuth.redirectUri, authorize, hasToken, driveReady,
    connect() { cfg.connected = true; saveCfg(); },
    getBlob, openPdf, addFiles, remove, moveToDrive, syncDrive, thumbUrl, saveThumb, makeThumb,
    setApp(a) { App = a; },
    // Tanılama için durum
    status() {
      const local = D().files.filter((x) => x.src === 'local');
      return {
        drive: driveReady(), token: hasToken(), client: !!GAuth.clientId(), err: GAuth.lastErr() || '',
        files: D().files.length, local: local.length, localBytes: local.reduce((a, x) => a + (x.size || 0), 0),
      };
    },
  };
})();

if (typeof window !== 'undefined') { window.Depo = Depo; }
