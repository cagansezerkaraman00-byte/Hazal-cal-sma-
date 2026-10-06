/* Hızlı açılış, çevrimdışı çalışma ve güncellemeler.
   Uygulama kabuğu (HTML, CSS, JS, simgeler) sürüme bağlı önbellekten gelir: zayıf internette de anında açılır
   ve dosyalar hep aynı sürümden olur. Sürüm numarası js/surum.js'den gelir: oraya yeni bir sürüm eklenince
   bu dosya da "değişmiş" sayılır, yeni sürüm arka planda iner ve açık uygulama "Güncelleme hazır" der. */
importScripts('js/surum.js');
const VERSION = 'luna-' + SURUMLER[0].surum;
const VENDOR = 'luna-vendor-1'; // büyük ve değişmeyen kütüphaneler (PDF.js), yazı tipleri
const FILES = [
  'assets/sleeping-family.png', './', 'index.html', 'css/style.css', 'manifest.webmanifest',
  'js/notifications.js', 'js/mini-timer.js', 'js/storage.js', 'js/surum.js', 'js/messages.js', 'js/audio.js', 'js/scene.js', 'js/timer.js', 'js/stats.js',
  'js/takvim.js', 'js/weather.js', 'js/yks.js', 'js/plan.js', 'js/deneme.js', 'js/notes.js', 'js/giris.js', 'js/depo.js', 'js/depo-ui.js', 'js/hata.js', 'js/kaynak.js', 'js/kaynak-ui.js', 'js/badges.js', 'js/spotify.js', 'js/uni.js', 'js/uni-ui.js', 'js/diag.js', 'js/guncelleme.js', 'js/app.js',
  'icons/notification-badge.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-48.png',
];
const SHELL = new Set(FILES.map((f) => new URL(f, self.registration.scope).href));

self.addEventListener('install', (e) => {
  // HTTP önbelleğini atla: yeni sürüm gerçekten yeni dosyalarla kurulsun
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== VENDOR).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
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
      e.respondWith(caches.match(new URL('index.html', self.registration.scope).href, { cacheName: VERSION })
        .then((r) => r || fetch(req))
        .catch(() => caches.match('index.html')));
      return;
    }
    if (url.pathname.includes('/vendor/')) { e.respondWith(cacheFirst(req, VENDOR, url.origin + url.pathname)); return; }
    const key = url.origin + url.pathname;
    if (SHELL.has(key)) { e.respondWith(cacheFirst(req, VERSION, key)); return; }
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
      const c = cs[0];
      if (c) { if (upd) c.postMessage({ type: 'guncelleme' }); else c.postMessage({type:'luna-open-tab',tab:e.notification.data?.tab || 'home'}); return c.focus(); }
      return self.clients.openWindow(upd ? './#guncelleme' : './');
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
  await self.registration.showNotification('Luna güncellemesi hazır ✨', { body: `Sürüm ${v.gorunenSurum || v.surum}: ${v.baslik}. Dokun, güncelleyelim.`, icon: new URL('icons/icon-192.png', self.registration.scope).href, badge: new URL('icons/notification-badge.png', self.registration.scope).href, tag: 'luna-guncelleme' });
  if (self.navigator && self.navigator.setAppBadge) self.navigator.setAppBadge(1).catch(() => {}); // simgede rozet
}
self.addEventListener('periodicsync', (e) => {
  if (e.tag === 'luna-guncelleme') e.waitUntil(remoteCheck().catch(() => {}));
});