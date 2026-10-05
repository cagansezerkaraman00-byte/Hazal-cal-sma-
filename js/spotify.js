/* Spotify hesabı bağlama (isteğe bağlı): PKCE ile giriş, kullanıcının çalma listelerini listeler,
   dokunulan liste uygulama içindeki Spotify oynatıcısında çalar. Şifre/sunucu yok; anahtarlar sadece bu cihazda. */

const SpotifyLink = (() => {
  const KEY = 'luna-spotify';
  const AUTH = 'https://accounts.spotify.com/authorize';
  const TOKEN = 'https://accounts.spotify.com/api/token';
  const SCOPE = 'playlist-read-private playlist-read-collaborative';
  let App = null;
  let st = { clientId: '', token: '', refresh: '', exp: 0, user: '', lists: [] };
  let busy = false;

  function load() {
    try { st = { ...st, ...(JSON.parse(localStorage.getItem(KEY) || '{}') || {}) }; } catch (e) { /* yok say */ }
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* kota / gizli mod */ }
  }
  const redirectUri = () => location.origin + location.pathname;
  // Spotify yalnızca https (ya da 127.0.0.1) yönlendirmesini kabul ediyor
  const secureOrigin = () => location.protocol === 'https:' || location.hostname === '127.0.0.1';
  const ERR = {
    forbidden: 'Spotify izin vermedi. Spotify panelinde Settings → User Management\'a e-postanın ekli olduğundan ve uygulamayı açan hesabın Premium olduğundan emin ol.',
    auth: 'Spotify oturumu sona ermiş. "Bağlantıyı kes" deyip yeniden bağlan.',
    net: 'Spotify\'a şu an ulaşılamadı; internet gelince ↻ ile yenileyebilirsin.',
  };

  function randomString(n) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const a = new Uint8Array(n);
    crypto.getRandomValues(a);
    return Array.from(a, (b) => chars[b % chars.length]).join('');
  }
  async function challenge(v) {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
    return btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  async function post(url, params) {
    const ctl = window.AbortController ? new AbortController() : null;
    const t = setTimeout(() => ctl && ctl.abort(), 10000);
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params), signal: ctl ? ctl.signal : undefined });
      return r.ok ? await r.json() : null;
    } catch (e) { return null; } finally { clearTimeout(t); }
  }
  function setTokens(j) {
    if (!j || !j.access_token) return false;
    st.token = j.access_token;
    st.exp = Date.now() + (j.expires_in || 3600) * 1000;
    if (j.refresh_token) st.refresh = j.refresh_token;
    persist();
    return true;
  }
  // aynı anda gelen istekler tek yenilemeyi paylaşır (Spotify yenileme anahtarını her seferinde değiştirir)
  let refreshing = null;
  async function token() {
    if (st.token && Date.now() < st.exp - 60000) return st.token;
    if (!st.refresh || !st.clientId) return '';
    if (!refreshing) refreshing = post(TOKEN, { grant_type: 'refresh_token', refresh_token: st.refresh, client_id: st.clientId }).then(setTokens).finally(() => { refreshing = null; });
    return (await refreshing) ? st.token : '';
  }
  let lastStatus = 0; // son API yanıtı: 403 genelde izin listesi ya da Premium eksikliği
  async function api(path) {
    const t = await token();
    if (!t) { lastStatus = 401; return null; }
    try {
      const r = await fetch('https://api.spotify.com/v1' + path, { headers: { Authorization: 'Bearer ' + t } });
      lastStatus = r.status;
      if (r.status === 401) { st.token = ''; persist(); return null; }
      return r.ok ? await r.json() : null;
    } catch (e) { lastStatus = 0; return null; }
  }

  async function login() {
    if (!st.clientId || !window.crypto || !crypto.subtle) { App.toast('🎧', 'Bu tarayıcı Spotify bağlantısını desteklemiyor'); return; }
    if (!secureOrigin()) { App.toast('🎧', 'Spotify bağlantısı https adres ister', 'Uygulamayı GitHub Pages adresinden açıp dene'); return; }
    const v = randomString(64);
    // doğrulayıcı localStorage'da: iOS ana ekran uygulamasında oturum deposu yönlendirmede kaybolabiliyor
    try { localStorage.setItem('luna-sp-verifier', JSON.stringify({ v, at: Date.now() })); } catch (e) { /* yok say */ }
    const q = new URLSearchParams({ client_id: st.clientId, response_type: 'code', redirect_uri: redirectUri(), code_challenge_method: 'S256', code_challenge: await challenge(v), scope: SCOPE });
    if (App.allowExit) App.allowExit('spotifyLogin'); // giriş sayfasına gidiş tam odakta sayacı durdurmasın
    location.href = AUTH + '?' + q.toString();
  }
  // Spotify'dan dönüşte (?code=…) jetonu al ve adres çubuğunu temizle
  async function handleRedirect() {
    const q = new URLSearchParams(location.search);
    const code = q.get('code'), err = q.get('error');
    if (!code && !err) return;
    history.replaceState(null, '', location.pathname + location.hash);
    if (err) { App.toast('🎧', 'Spotify bağlantısı iptal edildi'); return; }
    let v = '';
    try {
      const x = JSON.parse(localStorage.getItem('luna-sp-verifier') || 'null');
      localStorage.removeItem('luna-sp-verifier');
      if (x && x.v && Date.now() - x.at < 15 * 60000) v = x.v;
    } catch (e) { /* yok say */ }
    if (!v || !st.clientId) { App.toast('🎧', 'Spotify girişi tamamlanamadı', 'Müzik kutusundan bir kez daha "Spotify\'a bağlan" de'); return; }
    const ok = setTokens(await post(TOKEN, { client_id: st.clientId, grant_type: 'authorization_code', code, redirect_uri: redirectUri(), code_verifier: v }));
    if (!ok) { App.toast('🎧', 'Spotify bağlanamadı', 'Redirect URI ve kullanıcı izinlerini kılavuzdaki gibi kontrol et'); return; }
    await refreshLists();
    App.toast('🎧', 'Spotify bağlandı', 'Çalma listelerin müzik kutusunda');
    const card = document.getElementById('music-card');
    if (card) card.open = true;
  }
  async function refreshLists() {
    if (busy) return;
    busy = true;
    render();
    const [me, pl] = await Promise.all([api('/me'), api('/me/playlists?limit=50')]);
    busy = false;
    st.err = me || pl ? '' : lastStatus === 403 ? 'forbidden' : lastStatus === 401 ? 'auth' : 'net';
    if (me) st.user = me.display_name || me.id || '';
    if (pl && Array.isArray(pl.items)) {
      st.lists = pl.items.filter(Boolean).map((x) => ({
        id: x.id, name: x.name || 'Liste',
        img: x.images && x.images.length ? x.images[x.images.length - 1].url : '',
        n: (x.items && x.items.total) ?? (x.tracks && x.tracks.total) ?? null, // Şubat 2026: tracks -> items
      }));
    }
    persist();
    render();
  }

  function render() {
    const el = document.getElementById('sp-account');
    if (!el) return;
    const connected = !!(st.refresh || st.token);
    if (!connected) {
      el.innerHTML = `<details class="sp-connect"><summary>🔗 Kendi çalma listelerini burada gör (isteğe bağlı)</summary>
        <p class="hint">Bir kez kurulur; adımlar Ayarlar → Kılavuz → Müzik ve Spotify bölümünde. Redirect URI olarak şunu ekle:</p>
        <code class="sp-uri">${U.esc(redirectUri())}</code>
        ${secureOrigin() ? '' : '<p class="hint">⚠️ Spotify bağlantısı için uygulamayı https ile başlayan adresinden (ör. GitHub Pages) açmalısın.</p>'}
        <div class="inline-form"><input data-sp="client" placeholder="Spotify Client ID" value="${U.esc(st.clientId)}" autocomplete="off" spellcheck="false"><button class="btn primary" data-sp="login" type="button">Spotify'a bağlan</button></div>
      </details>`;
      return;
    }
    el.innerHTML = `<div class="sp-head"><span>👋 ${U.esc(st.user || 'Spotify')}</span>
        <span><button class="chip" data-sp="reload" type="button">${busy ? '…' : '↻'}</button> <button class="chip" data-sp="logout" type="button">Bağlantıyı kes</button></span></div>
      ${st.lists.length ? `<div class="sp-lists">${st.lists.map((l) => `<button class="sp-item ${App.data().settings.spotify.includes(l.id) ? 'active' : ''}" data-sp="play" data-id="${U.esc(l.id)}" type="button">
          ${l.img ? `<img src="${U.esc(l.img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<span class="sp-noimg">🎵</span>'}
          <span class="sp-name">${U.esc(l.name)}</span><small>${l.n != null ? l.n + ' şarkı' : 'Çalma listesi'}</small></button>`).join('')}</div>`
        : `<p class="hint">${busy ? 'Listelerin yükleniyor…' : ERR[st.err] || 'Çalma listesi bulunamadı.'}</p>`}`;
  }

  function bind() {
    const el = document.getElementById('sp-account');
    if (!el) return;
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-sp]');
      if (!b || b.tagName === 'INPUT') return;
      const act = b.dataset.sp;
      if (act === 'login') {
        const id = el.querySelector('[data-sp="client"]').value.trim();
        if (!/^[0-9a-f]{32}$/i.test(id)) { App.toast('🎧', 'Client ID 32 karakterlik bir koddur', 'Spotify Developer panelinden kopyala'); return; }
        st.clientId = id; persist(); login();
      } else if (act === 'logout') {
        st = { clientId: st.clientId, token: '', refresh: '', exp: 0, user: '', lists: [] }; persist(); render();
      } else if (act === 'reload') refreshLists();
      else if (act === 'play') {
        App.playSpotify('https://open.spotify.com/playlist/' + b.dataset.id);
        el.querySelectorAll('.sp-item').forEach((x) => x.classList.toggle('active', x === b));
      }
    });
  }

  return {
    init(app) {
      App = app;
      load();
      bind();
      render();
      handleRedirect();
      // bağlıysa listeleri arada bir tazele (en fazla günde bir)
      if ((st.refresh || st.token) && (!st.lists.length || Date.now() - (st.listedAt || 0) > 864e5)) {
        st.listedAt = Date.now();
        refreshLists();
      }
    },
    render,
    // Tanılama: bağlantı durumu (jeton gibi gizli bilgiler dışarı verilmez)
    status() {
      return {
        connected: !!(st.refresh || st.token), user: st.user || '', lists: st.lists.length, client: !!st.clientId,
        lastStatus, err: st.err || '', redirect: redirectUri(), secure: secureOrigin(), listedAt: st.listedAt || 0,
      };
    },
    async test() { if (st.refresh || st.token) await refreshLists(); return this.status(); },
  };
})();

if (typeof window !== 'undefined') { window.SpotifyLink = SpotifyLink; }
