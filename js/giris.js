/* Google hesabı: tek giriş, sunucusuz (OAuth yönlendirme akışı; açılır pencere yok, iPad ana ekran uygulamasında da çalışır).
   Hesap eşitleme (Drive'daki gizli uygulama klasörü: drive.appdata) ve Depo (drive.file) aynı girişi kullanır.
   İki izin de yalnızca uygulamanın kendi oluşturduğu dosyalara erişir; Drive'daki diğer dosyalar görünmez.
   Google'ın verdiği erişim anahtarı 1 saat geçerlidir; süresi dolunca açılışta sessizce (prompt=none) yenilenir.
   Uygulamayı yayınlayan kişi Client ID'yi js/config.js'e yazarsa cihazlarda hiçbir kod girilmez. */

const GAuth = (() => {
  const KEY = 'luna-google';
  const STATE = 'luna-google-state';
  const S_FILE = 'https://www.googleapis.com/auth/drive.file';
  const S_APPDATA = 'https://www.googleapis.com/auth/drive.appdata';
  const SCOPES = `${S_FILE} ${S_APPDATA}`;
  let s = { clientId: '', token: '', exp: 0, scope: '', email: '', name: '', lastErr: '', silentFail: 0, silentAt: 0 };
  let lastReturn = null; // bu açılıştaki Google dönüşü (bir kez okunur)
  class NeedAuth extends Error {}

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* kota / gizli mod */ } };
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { s = { ...s, ...(JSON.parse(raw) || {}) }; return; }
      // eski sürümün Depo ayarından taşı (Client ID ve geçerli anahtar kaybolmasın)
      const old = JSON.parse(localStorage.getItem('luna-drive') || '{}') || {};
      if (old.clientId) { s.clientId = old.clientId; s.token = old.token || ''; s.exp = +old.exp || 0; s.scope = old.token ? S_FILE : ''; save(); }
    } catch (e) { /* bozuk ayar: varsayılanlarla devam */ }
  }
  const clientId = () => s.clientId || (typeof window !== 'undefined' && window.LUNA_CONFIG && window.LUNA_CONFIG.googleClientId) || '';
  const builtInClient = () => !!(window.LUNA_CONFIG && window.LUNA_CONFIG.googleClientId) && !s.clientId;
  const validClient = (id) => /^[\w-]+\.apps\.googleusercontent\.com$/.test(id || '');
  const hasToken = () => !!s.token && Date.now() < s.exp - 60000;
  const granted = (scope) => (s.scope || '').split(/\s+/).includes(scope);
  const canFiles = () => hasToken() && granted(S_FILE);
  const canSync = () => hasToken() && granted(S_APPDATA);
  const redirectUri = () => location.origin + location.pathname.replace(/index\.html$/, '');
  const rand = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');

  // purpose: 'account' | 'depo' | 'renew'; silent: kullanıcıya hiçbir şey göstermeden yenile (oturum açıksa Google hemen geri döner)
  function authorize(purpose, silent) {
    const id = clientId();
    if (!id) return false;
    const state = rand();
    try { localStorage.setItem(STATE, JSON.stringify({ state, at: Date.now(), purpose, silent: !!silent })); } catch (e) { /* yok say */ }
    if (silent) { s.silentAt = Date.now(); save(); }
    if (window.App && App.allowExit) App.allowExit('google'); // giriş sayfasına gidiş tam odakta sayacı durdurmasın
    const q = { client_id: id, redirect_uri: redirectUri(), response_type: 'token', scope: SCOPES, include_granted_scopes: 'true', state };
    if (silent) q.prompt = 'none';
    if (s.email) q.login_hint = s.email;
    location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams(q).toString();
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
    const purpose = saved.purpose || 'depo', silent = !!saved.silent;
    if (q.get('error')) {
      if (silent) { s.silentFail = Date.now(); save(); return (lastReturn = { result: 'silent-fail', purpose, silent }); }
      s.lastErr = q.get('error'); save();
      return (lastReturn = { result: 'denied', purpose, silent });
    }
    s.token = q.get('access_token') || '';
    s.exp = Date.now() + (parseInt(q.get('expires_in'), 10) || 3600) * 1000;
    s.scope = q.get('scope') || SCOPES;
    s.lastErr = ''; s.silentFail = 0;
    save();
    return (lastReturn = { result: s.token ? 'ok' : 'state', purpose, silent });
  }

  // açılışta sessiz yenileme denenebilir mi (döngü ve rahatsızlık koruması)
  function canTrySilent() {
    const now = Date.now();
    return !!clientId() && !!s.email && !hasToken() && navigator.onLine !== false
      && now - (s.silentFail || 0) > 6 * 3600e3 && now - (s.silentAt || 0) > 3 * 60e3;
  }

  async function api(url, opts = {}) {
    if (!hasToken()) throw new NeedAuth();
    let r;
    try { r = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: 'Bearer ' + s.token } }); } catch (e) { throw new Error('Google’a ulaşılamadı (internet?)'); }
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
  // hangi hesapla girildiği (Drive "about": ek izin gerektirmez)
  async function profile() {
    const j = await (await api('https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress)')).json();
    const u = j.user || {};
    s.email = u.emailAddress || s.email;
    s.name = u.displayName || s.name;
    save();
    return { email: s.email, name: s.name };
  }
  // bu cihazda çıkış: anahtar unutulur. Google'daki izin geri alınmaz (diğer cihazların girişi bozulmasın).
  function forget() { s.token = ''; s.exp = 0; s.email = ''; s.name = ''; s.scope = ''; s.silentFail = 0; save(); }

  load();
  return {
    S_FILE, S_APPDATA, NeedAuth,
    clientId, builtInClient, validClient, setClientId(id) { s.clientId = id; save(); },
    hasToken, canFiles, canSync, granted, token: () => (hasToken() ? s.token : ''), expires: () => s.exp,
    email: () => s.email, name: () => s.name, lastErr: () => s.lastErr,
    redirectUri, authorize, handleRedirect, lastReturn: () => lastReturn, canTrySilent,
    api, profile, forget, load,
    dropToken() { s.token = ''; save(); },
  };
})();

if (typeof window !== 'undefined') { window.GAuth = GAuth; }
