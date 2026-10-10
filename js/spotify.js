/* Spotify hesabı bağlama (isteğe bağlı): PKCE ile giriş, kullanıcının çalma listelerini listeler,
   dokunulan liste uygulama içindeki Spotify oynatıcısında çalar. Şifre/sunucu yok; anahtarlar sadece bu cihazda. */

const SpotifyLink = (() => {
  const KEY = 'luna-spotify';
  const AUTH = 'https://accounts.spotify.com/authorize';
  const TOKEN = 'https://accounts.spotify.com/api/token';
  const SCOPE = 'playlist-read-private playlist-read-collaborative streaming user-read-private user-read-email user-modify-playback-state';
  let App = null;
  let st = { clientId: '', token: '', refresh: '', exp: 0, user: '', lists: [] };
  let busy = false, libraryEpoch = 0;
  let songEpoch=0,songs={url:'',name:'',items:[],next:'',busy:false,error:''};

  function bindSongs(){
      document.getElementById('sp-song-list')?.addEventListener('click',async e=>{
        const b=e.target.closest('[data-song]');if(!b)return;
        if(b.dataset.song==='more'){showSongs(songs.url,true);return;}
        if(b.dataset.song==='retry'){showSongs(songs.url,false,true);return;}
        if(b.dataset.song==='play'&&songs.items.some(t=>t.uri===b.dataset.uri)){
          const selected=songs.items.find(t=>t.uri===b.dataset.uri);
          b.disabled=true;try{await window.SpotifyPlayback?.chooseTrack(b.dataset.uri,selected,{context:songs.url,items:songs.items});}finally{b.disabled=false;}
        }
      });
  }
  function songPath(next){
    try{const u=new URL(next),id=window.SpotifyPlayback?.uri(songs.url)?.uri.split(':')[2];
      return u.origin==='https://api.spotify.com'&&[ `/v1/playlists/${id}/items`, `/v1/playlists/${id}/tracks`, `/v1/albums/${id}/tracks` ].includes(u.pathname)?u.pathname.slice(3)+u.search:'';
    }catch(e){return '';}
  }
  function renderSongs(){
    const root=document.getElementById('sp-song-list');if(!root)return;
    root.hidden=!(st.refresh||st.token)||!songs.url;
    if(root.hidden){root.innerHTML='';return;}
    root.innerHTML=`<h3 class="sub-h">${U.esc(songs.name||'Listendeki şarkılar')}</h3><p class="hint">İstediğin şarkıya dokun; üstteki Luna oynatıcısında çalsın.</p>
      ${songs.error?`<p class="hint" role="status">${U.esc(songs.error)}</p><button type="button" class="btn soft" data-song="retry">Şarkıları yeniden yükle</button>`:''}
      <div class="sp-song-rows">${songs.items.map((t,i)=>`<div class="sp-song-row"><button type="button" class="sp-song-pick" data-song="play" data-uri="${U.esc(t.uri)}"><span class="sp-song-number">${i+1}</span><span><b>${U.esc(t.name)}</b><small>${U.esc(t.artist)}</small></span><span aria-hidden="true">▶</span></button><a class="sp-song-source" href="https://open.spotify.com/track/${t.uri.split(':')[2]}" target="_blank" rel="noopener" aria-label="${U.esc(t.name)} — Spotify’da aç">↗</a></div>`).join('')}</div>
      ${songs.busy?'<p class="hint" role="status">Şarkılar yükleniyor…</p>':''}
      ${songs.next?`<button type="button" class="btn soft" data-song="more" ${songs.busy?'disabled':''}>Daha fazla şarkı</button>`:''}
      ${!songs.busy&&!songs.error&&!songs.items.length?'<p class="hint">Bu listede çalınabilir şarkı bulunamadı.</p>':''}`;
  }
  async function showSongs(url,more=false,force=false){
    if(!App||!(st.refresh||st.token))return;
    const selection=window.SpotifyPlayback?.uri(url);if(!selection)return;
    if(!more&&!force&&songs.url===url)return;
    if(more&&songs.busy)return;
    const path=more?songPath(songs.next):`/${selection.type==='playlist'?'playlists':selection.type==='album'?'albums':'tracks'}/${selection.uri.split(':')[2]}`;
    if(!path)return;
    const epoch=more?songEpoch:++songEpoch;
    if(!more)songs={url,name:'',items:[],next:'',busy:false,error:''};
    songs.busy=true;songs.error='';renderSongs();
    try{
      const json=await api(path),status=lastStatus;if(epoch!==songEpoch)return;
      const page=more?json:selection.type==='track'?{items:[json]}:json?.items||json?.tracks;
      if(!json||!page||!Array.isArray(page.items)){
        songs.error=status===403||json?'Spotify bu listenin şarkılarını Luna’ya vermedi. Şarkı seçimi için kendi oluşturduğun veya ortak düzenlediğin bir listeyi aç.':status===401?ERR.auth:ERR.net;
      }else{
        const rows=page.items.map(x=>x?.item||x?.track||x).filter(t=>t&&/^spotify:track:[A-Za-z0-9]{10,40}$/.test(t.uri||'')&&!t.is_local&&t.is_playable!==false).map(t=>({uri:t.uri,name:t.name||'Şarkı',artists:t.artists||[],duration_ms:t.duration_ms||0,album:t.album||{images:json.images||[]},artist:(t.artists||[]).map(a=>a.name).join(' · ')}));
        songs.items=more?[...songs.items,...rows]:rows;songs.name=json.name||songs.name;songs.next=page.next&&songPath(page.next)?page.next:'';
      }
    }catch(e){if(epoch===songEpoch)songs.error=ERR.net;}
    finally{if(epoch===songEpoch){songs.busy=false;renderSongs();}}
  }

  function load() {
    try { st = { ...st, ...(JSON.parse(localStorage.getItem(KEY) || '{}') || {}) }; } catch (e) { /* yok say */ }
    const configured = window.LUNA_SPOTIFY_CONFIG?.clientId || '';
    if (/^[0-9a-f]{32}$/i.test(configured)) {
      if (st.clientId && st.clientId !== configured) st = { clientId: configured, token: '', refresh: '', exp: 0, user: '', lists: [] };
      else st.clientId = configured;
    }
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
    if (j.scope) st.scope = j.scope;
    persist();
    return true;
  }
  // aynı anda gelen istekler tek yenilemeyi paylaşır (Spotify yenileme anahtarını her seferinde değiştirir)
  let refreshing = null;
  async function token(force = false) {
    if (force) { st.token = ''; st.exp = 0; }
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
    const state = randomString(32);
    try { localStorage.setItem('luna-sp-verifier', JSON.stringify({ v, state, clientId: st.clientId, redirect: redirectUri(), at: Date.now() })); } catch (e) { App.toast('🎧', 'Giriş kaydı saklanamadı', 'Cihazın depolama iznini kontrol et'); return; }
    const q = new URLSearchParams({ client_id: st.clientId, response_type: 'code', redirect_uri: redirectUri(), state, code_challenge_method: 'S256', code_challenge: await challenge(v), scope: SCOPE });
    if (App.allowExit) App.allowExit('spotifyLogin'); // giriş sayfasına gidiş tam odakta sayacı durdurmasın
    location.href = AUTH + '?' + q.toString();
  }
  // Spotify'dan dönüşte (?code=…) jetonu al ve adres çubuğunu temizle
  async function handleRedirect() {
    const q = new URLSearchParams(location.search);
    const code = q.get('code'), err = q.get('error');
    if (!code && !err) return;
    history.replaceState(null, '', location.pathname + '?app' + location.hash);
    let v = '';
    try {
      const x = JSON.parse(localStorage.getItem('luna-sp-verifier') || 'null');
      localStorage.removeItem('luna-sp-verifier');
      const age = x ? Date.now() - x.at : -1;
      if (x && x.v && x.state === q.get('state') && x.clientId === st.clientId && x.redirect === redirectUri() && age >= 0 && age < 15 * 60000) v = x.v;
    } catch (e) { /* yok say */ }
    if (!v || !st.clientId) { App.toast('🎧', 'Spotify girişi tamamlanamadı', 'Müzik kutusundan bir kez daha "Spotify\'a bağlan" de'); return; }
    if (err) { App.toast('🎧', 'Spotify bağlantısı iptal edildi'); return; }
    const ok = setTokens(await post(TOKEN, { client_id: st.clientId, grant_type: 'authorization_code', code, redirect_uri: redirectUri(), code_verifier: v }));
    if (!ok) { App.toast('🎧', 'Spotify bağlanamadı', 'Redirect URI ve kullanıcı izinlerini kılavuzdaki gibi kontrol et'); return; }
    await refreshLists();
    App.toast('🎧', 'Spotify bağlandı', 'Çalma listelerin müzik kutusunda');
    const card = document.getElementById('music-card');
    if (card) card.open = true;
  }
  function playlistPath(next) {
    try {
      const u = new URL(next);
      return u.origin === 'https://api.spotify.com' && u.pathname === '/v1/me/playlists'
        ? u.pathname.slice(3) + u.search : '';
    } catch (e) { return ''; }
  }
  async function refreshLists(more = false) {
    if (busy) return;
    const path = more ? playlistPath(st.next) : '/me/playlists?limit=50';
    if (!path) return;
    const run = libraryEpoch;
    busy = true;
    render();
    try {
      // A successful profile request must not hide an error loading playlists.
      const pl = await api(path);
      const playlistStatus = lastStatus;
      if (run !== libraryEpoch) return;
      st.err = pl && Array.isArray(pl.items) ? '' : playlistStatus === 403 ? 'forbidden' : playlistStatus === 401 ? 'auth' : 'net';
      if (pl && Array.isArray(pl.items)) {
        const found = pl.items.filter(x => x && x.id).map(x => ({
          id: x.id, name: x.name || 'Liste',
          img: x.images?.length ? x.images[x.images.length - 1].url : '',
          n: (x.items && x.items.total) ?? (x.tracks && x.tracks.total) ?? null,
          owner: x.owner?.display_name || '',
        }));
        // Followed playlists may contain metadata only. Never filter them by owner or item count.
        st.lists = Array.from(new Map([...(more ? st.lists : []), ...found].map(x => [x.id, x])).values());
        st.next = playlistPath(pl.next) ? pl.next : '';
        st.total = pl.total;
        st.listedAt = Date.now();
      }
      if (!more) {
        const me = await api('/me');
        if (run !== libraryEpoch) return;
        if (me) st.user = me.display_name || me.id || '';
      }
      persist();
    } finally {
      if (run === libraryEpoch) { busy = false; render(); }
    }
  }

  function render() {
    const el = document.getElementById('sp-account');
    if (!el) return;
    const connected = !!(st.refresh || st.token);
    if (!connected) {
      el.innerHTML = st.clientId
        ? `<button class="btn primary" data-sp="login" type="button">Spotify ile giriş yap</button><p class="hint">Giriş Spotify'ın güvenli sayfasında tamamlanır; ardından listelerin burada görünür.</p>`
        : '<div class="sp-connect-intro"><b>🎧 Spotify hesabınla Luna’da dinle</b><p class="hint">Premium hesabınla kendi listelerini burada aç. Hesap bağlantısı henüz etkinleştirilmedi.</p><button class="btn primary" type="button" disabled>Spotify ile giriş yap</button><p class="hint">Gömülü oynatıcı için hesap bağlantısı gerekmez; dinleme imkânını Spotify belirler.</p></div>';
      if (window.SpotifyPlayback) SpotifyPlayback.render();
      return;
    }
    el.innerHTML = `<div class="sp-head"><span>👋 ${U.esc(st.user || 'Spotify')}</span>
        <span><button class="chip" data-sp="reload" type="button" aria-label="Spotify listelerini yenile" ${busy ? 'disabled' : ''}>${busy ? '…' : '↻'}</button> <button class="chip" data-sp="logout" type="button">Bağlantıyı kes</button></span></div>
      ${!hasPlaybackAccess() ? '<button class="btn primary" data-sp="login" type="button">Müzik çalma izniyle yeniden bağlan</button>' : ''}
      <h3 class="sub-h">Kütüphanemdeki listeler</h3><p class="hint">Spotify’da kaydettiğin ve oluşturduğun çalma listeleri burada. Listeye dokunarak seç; Luna oynatıcısı açıkken çalar.</p>
      ${st.err ? `<p class="hint" role="status">${ERR[st.err]}</p>` : ''}
      ${st.lists.length ? `<div class="sp-lists">${st.lists.map((l) => `<button class="sp-item ${App.data().settings.spotify.includes(l.id) ? 'active' : ''}" data-sp="play" data-id="${U.esc(l.id)}" type="button">
          ${l.img ? `<img src="${U.esc(l.img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<span class="sp-noimg">🎵</span>'}
          <span class="sp-name">${U.esc(l.name)}</span><small>${l.n != null ? l.n + ' şarkı' : U.esc(l.owner || 'Kaydedilmiş liste')}</small></button>`).join('')}</div>`
        : `<p class="hint">${busy ? 'Listelerin yükleniyor…' : ERR[st.err] || 'Bu hesapta Spotify’dan gelen liste yok. Doğru hesapla giriş yaptığını kontrol et ve listeleri yenile.'}</p>`}
      ${st.next ? `<button class="btn soft" data-sp="more" type="button" ${busy ? 'disabled' : ''}>${busy ? 'Listeler yükleniyor…' : 'Daha fazla liste'}</button>` : ''}`;
    if (window.SpotifyPlayback) SpotifyPlayback.render();
  }

  function hasPlaybackAccess() { return !!(st.refresh || st.token) && SCOPE.split(' ').every(s => (st.scope || '').split(' ').includes(s)); }

  function bind() {
    const el = document.getElementById('sp-account');
    if (!el) return;
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-sp]');
      if (!b || b.tagName === 'INPUT') return;
      const act = b.dataset.sp;
      if (act === 'login') {
        const id = st.clientId.trim();
        if (!/^[0-9a-f]{32}$/i.test(id)) { App.toast('🎧', 'Hesap bağlantısı henüz hazır değil', 'Şimdilik yukarıdaki oynatıcıyı kullanabilirsin'); return; }
        st.clientId = id; persist(); login();
      } else if (act === 'logout') {
        ++songEpoch;songs={url:'',name:'',items:[],next:'',busy:false,error:''};
        ++libraryEpoch; busy = false;
        st = { clientId: st.clientId, token: '', refresh: '', exp: 0, user: '', lists: [] };
        if (window.SpotifyPlayback) SpotifyPlayback.reset();
        persist(); render();renderSongs();
      } else if (act === 'reload') refreshLists();
      else if (act === 'more') refreshLists(true);
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
      if (window.SpotifyPlayback) SpotifyPlayback.init({ getToken: token, hasAccess: hasPlaybackAccess, selection: () => App.data().settings.spotify, restoreEmbed: () => App.playSpotify(App.data().settings.spotify) });
      bind();
      bindSongs();
      render();
      handleRedirect().catch(() => App.toast('🎧', 'Spotify bağlantısı tamamlanamadı', 'Yeniden giriş yapabilirsin'));
      // bağlıysa listeleri arada bir tazele (en fazla günde bir)
      if ((st.refresh || st.token) && (!st.lists.length || Date.now() - (st.listedAt || 0) > 864e5)) {
        refreshLists();
      }
    },
    render,showSongs,
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

