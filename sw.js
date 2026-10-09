// Spotify preview configuration revision: 2026-10-09-client-ready
/* Hızlı açılış, çevrimdışı çalışma ve güncellemeler.
   Uygulama kabuğu (HTML, CSS, JS, simgeler) sürüme bağlı önbellekten gelir: zayıf internette de anında açılır
   ve dosyalar hep aynı sürümden olur. Sürüm numarası js/surum.js'den gelir: oraya yeni bir sürüm eklenince
   bu dosya da "değişmiş" sayılır, yeni sürüm arka planda iner ve açık uygulama "Güncelleme hazır" der. */
importScripts('js/surum.js');
const VERSION = 'luna-' + SURUMLER[0].surum;
const VENDOR = 'luna-vendor-1'; // büyük ve değişmeyen kütüphaneler (PDF.js), yazı tipleri
const FILES = [
  'assets/sleeping-family.jpg', './', 'index.html', 'css/style.css', 'manifest.webmanifest',
  'assets/meows/cat-voice.mp3', 'assets/meows/kitten.mp3', 'assets/meows/cat-meow.mp3',
  'js/kurulum.js', 'js/notifications.js', 'js/mini-timer.js', 'js/storage.js', 'js/surum.js', 'js/messages.js', 'js/audio.js', 'js/scene.js', 'js/timer.js', 'js/stats.js',
  'js/takvim.js', 'js/weather.js', 'js/yks.js', 'js/plan.js', 'js/planlar.js', 'js/planlar-ui.js', 'js/deneme.js', 'js/notes.js', 'js/giris.js', 'js/depo.js', 'js/depo-ui.js', 'js/hata.js', 'js/kaynak.js', 'js/kaynak-ui.js', 'js/badges.js', 'js/spotify-config.js', 'js/spotify-playback.js', 'js/spotify.js', 'js/uni.js', 'js/uni-ui.js', 'js/diag.js', 'js/guncelleme.js', 'js/app.js',
  'icons/luna-notification-v2.png', 'icons/icon-512-maskable.png', 'icons/notification-badge.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-48.png',
];
const SHELL = new Set(FILES.map((f) => new URL(f, self.registration.scope).href));
const INDEX = new URL('index.html', self.registration.scope).href;
// Açılışı bozuk çıkmış sürümler: önbellekleri silinir, hiçbir zaman geri dönülmez.
const BOZUK = ['2.3.4', '2.3.5', '2.3.6'];
// Küçük kayıt defteri (Cache Storage, sayfa verilerinden ayrı): bu cihazda sorunsuz açılmış sürümler ve geri dönüş iğnesi
const META = 'luna-meta';
async function meta(key, value) {
  const c = await caches.open(META), url = new URL('__meta/' + key, self.registration.scope).href;
  if (value === undefined) { const r = await c.match(url); return r ? r.json().catch(() => null) : null; }
  return value === null ? c.delete(url) : c.put(url, new Response(JSON.stringify(value)));
}
const byNewest = (a, b) => b.localeCompare(a, undefined, { numeric: true });
// Sayfalar hangi sürümün index.html'ini alsın: normalde bu sürüm; bu sürüm bu cihazda açılamadıysa son sağlam sürüm
async function shellCache() {
  const pin = await meta('pin');
  if (pin && pin.bad === SURUMLER[0].surum && await caches.has('luna-' + pin.good)) return 'luna-' + pin.good;
  return VERSION;
}
async function rollback(bad) {
  if (bad !== SURUMLER[0].surum) return null;                 // yalnızca en yeni sürüm için
  const good = (await meta('good')) || {};
  if (good[bad]) return null;                                  // bu sürüm burada daha önce açıldı: güncelleme sorunu değil
  const names = await caches.keys();
  let to = null;
  for (const v of Object.keys(good).filter((x) => x !== bad && !BOZUK.includes(x) && names.includes('luna-' + x)).sort(byNewest)) {
    if (await caches.match(INDEX, { cacheName: 'luna-' + v })) { to = v; break; } // sayfası önbellekte duran en yeni sağlam sürüm
  }
  if (!to) return null;
  await meta('pin', { bad, good: to, at: Date.now() });
  return to;
}

// A release is usable only when every code file and recorded alarm matches the published digest.
async function installRelease() {
  const mr = await fetch('release-manifest.json', { cache: 'no-store' });
  if (!mr.ok) throw new Error('Release manifest unavailable');
  const manifest = await mr.json();
  if (manifest.version !== SURUMLER[0].surum) throw new Error('Release version mismatch');
  const responses = await Promise.all(FILES.map(async file => {
    const response = await fetch(new Request(file, { cache: 'reload' }));
    if (!response.ok) throw new Error('Release file unavailable: ' + file);
    const key = file === './' ? 'index.html' : file;
    if (/\.(js|css|html|webmanifest|mp3)$/.test(key)) {
      if (!manifest.files[key]) throw new Error('Missing release digest: ' + key);
      const bytes = await response.clone().arrayBuffer();
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
      if (digest !== manifest.files[key]) throw new Error('Release file mismatch: ' + key);
    }
    return [file, response];
  }));
  const cache = await caches.open(VERSION);
  await Promise.all(responses.map(([file, response]) => cache.put(file, response)));
  await self.skipWaiting();
}
self.addEventListener('install', e => e.waitUntil(installRelease()));
self.addEventListener('message', e => {
  const d = e.data || {}, reply = (x) => e.ports?.[0]?.postMessage(x);
  if (d.type === 'LUNA_VERSION') e.waitUntil(meta('pin').then((pin) => reply({ version: SURUMLER[0].surum, pin: pin && pin.bad === SURUMLER[0].surum ? pin : null })));
  if (d.type === 'LUNA_GOOD' && /^\d+(?:\.\d+)+$/.test(d.version)) e.waitUntil(meta('good').then((g) => meta('good', { ...(g || {}), [d.version]: Date.now() })));
  if (d.type === 'LUNA_ROLLBACK') e.waitUntil(rollback(d.version).then((to) => reply({ ok: !!to, to })).catch(() => reply({ ok: false })));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(async (keys) => {
        const rel = keys.filter((k) => /^luna-\d/.test(k)), ver = (k) => k.slice(5);
        let good = (await meta('good')) || {}, pin = await meta('pin');
        // ilk kez: açılışını kendisi bildiremeyen eski bir sürüm (sayfasında data-surum yok, 2.3.8 ve öncesi) bu cihazda
        // kullanılıyorduysa sağlam sayılır. Kendini bildirebilen bir sürüm hiç "sağlam" demediyse açılamamıştır: sayılmaz.
        if (!Object.keys(good).length) {
          const prev = rel.filter((k) => k !== VERSION && !BOZUK.includes(ver(k))).sort(byNewest)[0];
          const page = prev && await caches.match(INDEX, { cacheName: prev });
          if (page && !/\bdata-surum=/.test(await page.text())) await meta('good', good = { [ver(prev)]: Date.now() });
        }
        if (pin && pin.bad !== SURUMLER[0].surum) await meta('pin', pin = null); // yeni (düzeltilmiş) sürüm geldi: iğne kalkar
        const lastGood = Object.keys(good).filter((v) => !BOZUK.includes(v) && rel.includes('luna-' + v)).sort(byNewest)[0];
        const keep = new Set([VERSION, ...rel.filter((k) => !BOZUK.includes(ver(k))).sort(byNewest).slice(0, 3), lastGood && 'luna-' + lastGood, pin && 'luna-' + pin.good]);
        await Promise.all(rel.filter((k) => !keep.has(k)).map((k) => caches.delete(k)));
      })
      .catch(() => {}) // defter okunamasa/yazılamasa da yeni sürüm etkinleşsin ve açık sayfaları devralsın
      .then(async () => {
        try { for (const n of await self.registration.getNotifications()) if (n.tag === 'luna-guncelleme') n.close(); } catch (e) {} // eski güncelleme haberi; sayaç bildirimi kalsın
        return self.clients.claim();
      })
  );
});

// önce önbellek, yoksa ağ (ve önbelleğe yaz)
async function cacheFirst(req, cacheName, key) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(key || req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok && (res.type === 'basic' || res.type === 'cors')) cache.put(key || req, res.clone());
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // güncelleme denetimi: önbelleği atla, sunucudaki en yeni hali al
    if (url.searchParams.has('guncel')) { e.respondWith(fetch(req, { cache: 'no-store' })); return; }
    // sayfa gezintisi (Spotify/Google dönüşündeki ?code= ve #… dahil): sürümün index.html'i
    if (req.mode === 'navigate') {
      e.respondWith(shellCache().then((name) => caches.match(INDEX, { cacheName: name }))
        .then((r) => r || fetch(req))
        .catch(() => caches.match(INDEX, { cacheName: VERSION }).then((r) => r || Response.error()))); // başka sürümün sayfası asla
      return;
    }
    if (url.pathname.includes('/vendor/')) { e.respondWith(cacheFirst(req, VENDOR, url.origin + url.pathname)); return; }
    const key = url.origin + url.pathname;
    if (SHELL.has(key)) {
      const requested = url.searchParams.get('v');
      const version = requested && /^\d+(?:\.\d+)+$/.test(requested) ? 'luna-' + requested : VERSION;
      // A missing old file must never be replaced with a different release's code.
      e.respondWith(version === VERSION ? cacheFirst(req, version, key) : caches.has(version).then((ok) => ok && caches.match(key, { cacheName: version })).then(r => r || new Response('Bu sürüm artık yok; Luna’yı yeniden aç', {status:503})));
      return;
    }
    // diğer dosyalar: önce ağ, olmazsa önbellek
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }
  // yazı tipleri: önce önbellek
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) e.respondWith(cacheFirst(req, VENDOR).catch(() => new Response('', { status: 504 })));
});

// bildirime dokununca uygulama öne gelir; güncelleme bildirimiyse güncelleme başlar
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const upd = e.notification.tag === 'luna-guncelleme';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
      const own=cs.filter(c=>c.url.startsWith(self.registration.scope));
      const c=own.find(c=>new URL(c.url).searchParams.get('source')==='homescreen') || own.find(c=>c.focused) || own[0];
      if (c) { if (upd) c.postMessage({ type: 'guncelleme' }); else c.postMessage({type:'luna-open-tab',tab:e.notification.data?.tab || 'home'}); return c.focus(); }
      return self.clients.openWindow(upd ? './?source=homescreen#guncelleme' : './?source=homescreen');
    })
  );
});

// Android'de ana ekrandaki uygulama kapalıyken yeni sürüme bakılır (tarayıcı izin verirse, günde bir iki kez)
const newer = (a, b) => {
  const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0; }
  return false;
};
async function remoteCheck() {
  const r = await fetch('js/surum.js?guncel=' + Date.now(), { cache: 'no-store' });
  const m = r.ok && (await r.text()).match(/\/\*SURUMLER\*\/([\s\S]*?)\/\*SURUMLER\*\//);
  if (!m) return;
  const v = JSON.parse(m[1])[0];
  if (!v || !newer(v.surum, SURUMLER[0].surum)) return;
  // aynı sürüm için bir kez haber ver
  const box = await caches.open(VENDOR), mark = new URL('__bildirildi/' + v.surum, self.registration.scope).href;
  if (await box.match(mark)) return;
  await box.put(mark, new Response('1'));
  await self.registration.showNotification('Luna güncellemesi hazır ✨', { body: `Sürüm ${v.gorunenSurum || v.surum}: ${v.baslik}. Dokun, güncelleyelim.`, icon: new URL('icons/icon-192.png', self.registration.scope).href, badge: new URL('icons/luna-notification-v2.png', self.registration.scope).href, tag: 'luna-guncelleme' });
  if (self.navigator && self.navigator.setAppBadge) self.navigator.setAppBadge(1).catch(() => {}); // simgede rozet
}
self.addEventListener('periodicsync', (e) => {
  if (e.tag === 'luna-guncelleme') e.waitUntil(remoteCheck().catch(() => {}));
});
