/* Tanılama: test sürecinde sorunları görmek için Ayarlar'da açılır bir bölüm.
   Hava durumu ve Spotify bağlantısının durumu, bağlantı testleri, cihaz bilgisi ve hata günlüğü.
   Rapor yalnızca sayılar ve durumlar içerir; notlar, oturum içerikleri ya da jetonlar asla eklenmez. */

const Diag = (() => {
  let App = null;
  let pings = null;   // son bağlantı testi sonuçları
  let busy = false;
  const $ = (s, el = document) => el.querySelector(s);
  const D = () => Store.data;

  const ago = (t) => {
    if (!t) return '—';
    const s = Math.round((Date.now() - t) / 1000);
    if (s < 60) return 'az önce';
    if (s < 3600) return Math.round(s / 60) + ' dk önce';
    if (s < 86400) return Math.round(s / 3600) + ' sa önce';
    return Math.round(s / 86400) + ' gün önce';
  };
  const hm = (t) => (t ? U.hm(t) : '—');
  const yes = (b) => (b ? 'evet' : 'hayır');

  // kaba ama yeterli: cihaz + tarayıcı
  function device() {
    const ua = navigator.userAgent || '';
    const touchMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
    const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) || touchMac ? 'iPad' : /Android/.test(ua) ? (/Mobile/.test(ua) ? 'Android telefon' : 'Android tablet')
      : /Windows/.test(ua) ? 'Windows' : /Macintosh/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Bilinmeyen cihaz';
    const m = (re) => { const x = ua.match(re); return x ? x[1].split('.')[0] : ''; };
    const br = /CriOS/.test(ua) ? 'Chrome ' + m(/CriOS\/([\d.]+)/) : /FxiOS/.test(ua) ? 'Firefox ' + m(/FxiOS\/([\d.]+)/)
      : /EdgA?\//.test(ua) ? 'Edge ' + m(/EdgA?\/([\d.]+)/) : /SamsungBrowser/.test(ua) ? 'Samsung Internet ' + m(/SamsungBrowser\/([\d.]+)/)
      : /Chrome\//.test(ua) ? 'Chrome ' + m(/Chrome\/([\d.]+)/) : /Firefox\//.test(ua) ? 'Firefox ' + m(/Firefox\/([\d.]+)/)
      : /Version\/[\d.]+.*Safari/.test(ua) ? 'Safari ' + m(/Version\/([\d.]+)/) : 'tarayıcı';
    return `${os} · ${br}`;
  }
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  async function appInfo() {
    let ver = '—', persisted = null, usage = null;
    try { if (window.caches) ver = (await caches.keys()).filter((k) => /^luna-/.test(k)).sort().pop() || 'önbellek yok'; } catch (e) { /* yok say */ }
    try { if (navigator.storage && navigator.storage.persisted) persisted = await navigator.storage.persisted(); } catch (e) { /* yok say */ }
    try { if (navigator.storage && navigator.storage.estimate) usage = (await navigator.storage.estimate()).usage; } catch (e) { /* yok say */ }
    const sw = !('serviceWorker' in navigator) ? 'desteklenmiyor' : navigator.serviceWorker.controller ? 'aktif' : 'henüz değil (bir kez yenile)';
    return { ver, persisted, usage, sw };
  }

  // bağlantı testi: no-cors istek, ulaşılabiliyor mu ve kaç ms (içerik okunmaz)
  const TARGETS = [
    ['🌦️ Open-Meteo (hava)', 'https://api.open-meteo.com/v1/forecast?latitude=41&longitude=29&current=temperature_2m'],
    ['🎧 Spotify oynatıcı', 'https://open.spotify.com/'],
    ['🔑 Spotify giriş', 'https://accounts.spotify.com/'],
    ['🔤 Google Fonts (yazı tipi)', 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'],
    ['☁️ Google Drive', 'https://www.googleapis.com/drive/v3/about'],
    ['🎓 Claude (asistan)', 'https://api.anthropic.com/v1/models'],
  ];
  async function ping(url) {
    const t0 = performance.now();
    const ctl = window.AbortController ? new AbortController() : null;
    const timer = setTimeout(() => ctl && ctl.abort(), 8000);
    try {
      await fetch(url, { mode: 'no-cors', cache: 'no-store', signal: ctl ? ctl.signal : undefined });
      return { ok: true, ms: Math.round(performance.now() - t0) };
    } catch (e) {
      return { ok: false, ms: Math.round(performance.now() - t0), err: e && e.name === 'AbortError' ? 'zaman aşımı' : 'ulaşılamadı' };
    } finally { clearTimeout(timer); }
  }

  function weatherText(w) {
    if (!D().settings.weather) return 'kapalı (Ayarlar → Konum ve hava)';
    const n = w.net;
    const last = !n ? 'bu açılışta henüz istek yok (önbellek kullanıldı)'
      : n.ok ? `son istek ${hm(n.at)} başarılı (${n.ms} ms)` : `son istek ${hm(n.at)} başarısız: ${n.err}`;
    const c = w.cache ? `kayıtlı veri ${ago(w.cache.at)}${w.cache.sameLoc ? '' : ' (başka konum)'}` : 'kayıtlı veri yok';
    return `${last} · ${c}`;
  }
  function spotifyText(s) {
    const link = D().settings.spotify ? 'liste bağlantısı var' : 'liste bağlantısı yok';
    if (!s) return link;
    if (!s.connected) return `${link} · hesap bağlı değil${s.client ? ' (Client ID girilmiş)' : ''}${s.secure ? '' : ' · hesap bağlamak için https adres gerekir'}`;
    const st = s.err ? { forbidden: 'izin verilmedi (403: kullanıcı listesi / Premium)', auth: 'oturum süresi dolmuş', net: 'ulaşılamadı' }[s.err] : 'çalışıyor';
    return `${link} · hesap bağlı (${s.user || 'kullanıcı'}) · ${s.lists} çalma listesi · durum: ${st}${s.lastStatus ? ' · son API kodu ' + s.lastStatus : ''}`;
  }

  function aiText(a) {
    if (!a.ready) return 'API anahtarı girilmemiş';
    return `${a.model} · bu ay ${a.req} istek, $${a.usd.toFixed(2)} / $${a.budget} · web araması ${a.web ? 'açık' : 'kapalı'}${a.err ? ' · son hata: ' + a.err : ''}`;
  }
  function depoText(d) {
    const where = d.drive ? `Google Drive bağlı (${d.token ? 'oturum açık' : 'bağlantı yenilenmeli'})` : d.client ? 'Client ID girilmiş, Drive bağlı değil' : 'Drive bağlı değil';
    return `${where} · ${d.files} dosya${d.local ? ` (${d.local} tanesi bu cihazda, ${Depo.fmtSize(d.localBytes)})` : ''}${d.err ? ' · son hata: ' + d.err : ''}`;
  }

  async function collect() {
    const a = await appInfo();
    const s = D().settings;
    const sun = Scene.sunInfo();
    const moon = Scene.moonInfo ? Scene.moonInfo() : null;
    const fmt = (m) => { const x = Math.round(((m % 1440) + 1440) % 1440); return `${U.pad(Math.floor(x / 60) % 24)}:${U.pad(x % 60)}`; };
    const dataKB = Math.round((JSON.stringify(D()).length / 1024) * 10) / 10;
    let tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { /* yok say */ }
    return {
      rows: [
        ['📦 Uygulama', `${a.ver} · ana ekranda: ${yes(standalone())} · çevrimdışı desteği: ${a.sw} · kalıcı depolama: ${a.persisted == null ? 'bilinmiyor' : yes(a.persisted)}`],
        ['📱 Cihaz', `${device()} · ${innerWidth}×${innerHeight} @${Math.round(devicePixelRatio * 10) / 10}x · ${tz} · ${navigator.language || ''} · ${navigator.onLine ? 'çevrimiçi' : 'çevrimdışı'}`],
        ['📍 Konum', `${s.city || '—'} (${(+s.lat).toFixed(2)}, ${(+s.lon).toFixed(2)}) · gün doğumu ${fmt(sun.sunrise)} · batımı ${fmt(sun.sunset)}${moon ? ` · ay: ${moon.name} %${Math.round(moon.fraction * 100)}${moon.up ? ' (gökte)' : ''}` : ''}`],
        ['🌦️ Hava', window.Weather ? weatherText(Weather.status()) : 'modül yüklenmedi'],
        ['🎧 Spotify', spotifyText(window.SpotifyLink && SpotifyLink.status ? SpotifyLink.status() : null)],
        ['🗂️ Depo', window.Depo ? depoText(Depo.status()) : 'modül yüklenmedi'],
        ['🎓 Asistan', window.Asistan ? aiText(Asistan.status()) : 'modül yüklenmedi'],
        ['💾 Veri', `${D().sessions.length} oturum · ${D().denemeler.length} deneme · ${D().notes.length} not · ${D().cards.length} kart · ${dataKB} KB${a.usage ? ` (tarayıcıda toplam ${Math.round(a.usage / 1024)} KB)` : ''} · son yedek: ${D().lastBackup ? ago(D().lastBackup) : 'yok'}`],
      ],
      errors: window.ErrLog ? ErrLog.list() : [],
    };
  }

  function reportText(c) {
    const lines = [`Luna tanılama raporu · ${U.dateKey(new Date())} ${U.hm(new Date())}`];
    for (const [k, v] of c.rows) lines.push(`${k.replace(/^\S+\s/, '')}: ${v}`);
    if (pings) lines.push('Bağlantı testi: ' + pings.map((p) => `${p.name.replace(/^\S+\s/, '')} ${p.ok ? '✓ ' + p.ms + ' ms' : '✗ ' + p.err}`).join(' · '));
    lines.push(`Hatalar (${c.errors.length}):` + (c.errors.length ? '' : ' yok'));
    for (const e of c.errors) lines.push(`  ${U.dateKey(e.t)} ${U.hm(e.t)} ${e.m}${e.s ? ' (' + e.s + ')' : ''}${e.n > 1 ? ' ×' + e.n : ''}`);
    return lines.join('\n');
  }

  async function render() {
    const root = $('#diag-root');
    if (!root || !$('#diag-card').open) return;
    const c = await collect();
    const rows = c.rows.map(([k, v]) => `<div class="diag-row"><b>${U.esc(k)}</b><span>${U.esc(v)}</span></div>`).join('');
    const pingHtml = pings ? `<ul class="diag-pings">${pings.map((p) => `<li class="${p.ok ? 'ok' : 'bad'}">${p.ok ? '✓' : '✗'} ${U.esc(p.name)} <small>${p.ok ? p.ms + ' ms' : U.esc(p.err)}</small></li>`).join('')}</ul>` : '';
    const errs = c.errors.length
      ? `<ul class="diag-errors">${c.errors.slice().reverse().map((e) => `<li><small>${U.esc(U.dateKey(e.t).slice(5))} ${U.esc(U.hm(e.t))}</small> ${U.esc(e.m)}${e.s ? ` <small>(${U.esc(e.s)})</small>` : ''}${e.n > 1 ? ` <small>×${e.n}</small>` : ''}</li>`).join('')}</ul>`
      : '<p class="hint">Kayıtlı hata yok 🐾</p>';
    root.innerHTML = `
      <div class="diag-rows">${rows}</div>
      <div class="row diag-actions">
        <button class="btn soft" data-dg="ping" type="button" ${busy ? 'disabled' : ''}>${busy ? 'Test ediliyor…' : '📡 Bağlantıları test et'}</button>
        <button class="btn soft" data-dg="weather" type="button">🌦️ Havayı şimdi yenile</button>
        ${window.SpotifyLink && SpotifyLink.status && SpotifyLink.status().connected ? '<button class="btn soft" data-dg="spotify" type="button">🎧 Spotify’ı yenile</button>' : ''}
      </div>
      ${pingHtml}
      <h3 class="sub-h">Hata günlüğü</h3>
      ${errs}
      <details class="diag-report"><summary class="hint">Rapor metni</summary><textarea readonly rows="8">${U.esc(reportText(c))}</textarea></details>
      <div class="row diag-actions">
        <button class="btn primary" data-dg="copy" type="button">📋 Raporu kopyala</button>
        ${navigator.share ? '<button class="btn soft" data-dg="share" type="button">📤 Paylaş</button>' : ''}
        ${c.errors.length ? '<button class="btn soft" data-dg="clear" type="button">Günlüğü temizle</button>' : ''}
      </div>
      <p class="hint">Rapor yalnızca durum bilgisi ve sayılar içerir; notların, oturum içeriklerin ya da şifre/jeton gibi bilgiler eklenmez.</p>`;
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = $('#diag-root textarea');
      if (!ta) return false;
      ta.closest('details').open = true;
      ta.focus(); ta.select();
      try { return document.execCommand('copy'); } catch (err) { return false; }
    }
  }

  function bind() {
    const card = $('#diag-card');
    if (!card) return;
    card.addEventListener('toggle', () => { if (card.open) render(); });
    $('#diag-root').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-dg]');
      if (!b) return;
      const act = b.dataset.dg;
      if (act === 'ping') {
        if (busy) return;
        busy = true; render();
        const res = await Promise.all(TARGETS.map(([, u]) => ping(u)));
        pings = res.map((r, i) => ({ name: TARGETS[i][0], ...r }));
        busy = false; render();
      } else if (act === 'weather') {
        b.disabled = true;
        await App.refreshWeather(true);
        render();
      } else if (act === 'spotify') {
        b.disabled = true;
        await SpotifyLink.test();
        render();
      } else if (act === 'copy') {
        const ok = await copy(reportText(await collect()));
        App.toast(ok ? '📋' : '⚠️', ok ? 'Rapor kopyalandı' : 'Kopyalanamadı', ok ? 'İstediğin yere yapıştırabilirsin' : '"Rapor metni"ni açıp elle seç');
      } else if (act === 'share') {
        try { await navigator.share({ title: 'Luna tanılama raporu', text: reportText(await collect()) }); } catch (err) { /* vazgeçildi */ }
      } else if (act === 'clear') {
        ErrLog.clear(); render();
      }
    });
  }

  return {
    init(app) { App = app; bind(); },
    render,
  };
})();

if (typeof window !== 'undefined') { window.Diag = Diag; }
