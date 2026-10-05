/* Depo için Google Drive girişi (isteğe bağlı), sunucusuz: OAuth yönlendirme akışı; açılır pencere yok,
   iPad ana ekran uygulamasında da çalışır. İzin yalnızca drive.file: uygulama sadece kendi yüklediği dosyaları görür.
   Google'ın verdiği erişim anahtarı 1 saat geçerlidir; süresi dolunca Depo "bağlantıyı yenile" der. */

const GAuth = (() => {
  const KEY = 'luna-google';
  const STATE = 'luna-google-state';
  const S_FILE = 'https://www.googleapis.com/auth/drive.file';
  let s = { clientId: '', token: '', exp: 0, scope: '', lastErr: '' };
  let lastReturn = null; // bu açılıştaki Google dönüşü (bir kez okunur)
  class NeedAuth extends Error {}

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* kota / gizli mod */ } };
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const o = JSON.parse(raw) || {}; s = { clientId: o.clientId || '', token: o.token || '', exp: +o.exp || 0, scope: o.scope || '', lastErr: o.lastErr || '' }; return; }
      // eski sürümün Depo ayarından taşı (Client ID ve geçerli anahtar kaybolmasın)
      const old = JSON.parse(localStorage.getItem('luna-drive') || '{}') || {};
      if (old.clientId) { s.clientId = old.clientId; s.token = old.token || ''; s.exp = +old.exp || 0; s.scope = old.token ? S_FILE : ''; save(); }
    } catch (e) { /* bozuk ayar: varsayılanlarla devam */ }
  }
  const clientId = () => s.clientId;
  const validClient = (id) => /^[\w-]+\.apps\.googleusercontent\.com$/.test(id || '');
  const hasToken = () => !!s.token && Date.now() < s.exp - 60000;
  const canFiles = () => hasToken() && (s.scope || '').split(/\s+/).includes(S_FILE);
  const redirectUri = () => location.origin + location.pathname.replace(/index\.html$/, '');
  const rand = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');

  function authorize(purpose = 'depo') {
    if (!s.clientId) return false;
    const state = rand();
    try { localStorage.setItem(STATE, JSON.stringify({ state, at: Date.now(), purpose })); } catch (e) { /* yok say */ }
    if (window.App && App.allowExit) App.allowExit('google'); // giriş sayfasına gidiş tam odakta sayacı durdurmasın
    location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
      client_id: s.clientId, redirect_uri: redirectUri(), response_type: 'token', scope: S_FILE, include_granted_scopes: 'true', state,
    }).toString();
    return true;
  }

  // Google'dan dönüş: #access_token=…&expires_in=…&scope=…&state=…  ya da  #error=…
  function handleRedirect() {
    if (!/^#.*(access_token|error)=/.test(location.hash)) return null;
    const q = new URLSearchParams(location.hash.slice(1));
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(STATE) || localStorage.getItem('luna-drive-state') || 'null');
      localStorage.removeItem(STATE); localStorage.removeItem('luna-drive-state');
    } catch (e) { /* yok say */ }
    history.replaceState(null, '', location.pathname + location.search);
    if (!saved || saved.state !== q.get('state') || Date.now() - saved.at > 15 * 60000) return (lastReturn = { result: 'state', purpose: '' });
    const purpose = saved.purpose || 'depo';
    if (q.get('error')) { s.lastErr = q.get('error'); save(); return (lastReturn = { result: 'denied', purpose }); }
    s.token = q.get('access_token') || '';
    s.exp = Date.now() + (parseInt(q.get('expires_in'), 10) || 3600) * 1000;
    s.scope = q.get('scope') || S_FILE;
    s.lastErr = '';
    save();
    return (lastReturn = { result: s.token ? 'ok' : 'state', purpose });
  }

  async function api(url, opts = {}) {
    if (!hasToken()) throw new NeedAuth();
    let r;
    try { r = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: 'Bearer ' + s.token } }); } catch (e) { throw new Error('Drive’a ulaşılamadı (internet?)'); }
    if (r.status === 401) { s.token = ''; save(); throw new NeedAuth(); }
    if (!r.ok) {
      let msg = 'HTTP ' + r.status;
      try { const j = await r.json(); if (j.error && j.error.message) msg += ': ' + j.error.message; } catch (e) { /* yok say */ }
      const err = new Error('Drive hatası (' + msg + ')');
      err.status = r.status;
      throw err;
    }
    return r;
  }
  // bu cihazda bağlantıyı kes: anahtar unutulur (Google'daki izin geri alınmaz)
  function forget() { s.token = ''; s.exp = 0; s.scope = ''; save(); }

  load();
  return {
    S_FILE, NeedAuth,
    clientId, validClient, setClientId(id) { s.clientId = id; save(); },
    hasToken, canFiles, token: () => (hasToken() ? s.token : ''), lastErr: () => s.lastErr,
    redirectUri, authorize, handleRedirect, lastReturn: () => lastReturn,
    api, forget, load,
    dropToken() { s.token = ''; save(); },
  };
})();

if (typeof window !== 'undefined') { window.GAuth = GAuth; }
