/* Hızlı açılış ve çevrimdışı çalışma.
   Uygulama kabuğu (HTML, CSS, JS, simgeler) sürüme bağlı önbellekten gelir: zayıf internette de anında açılır
   ve dosyalar hep aynı sürümden olur. Dosyaları değiştirince VERSION'ı artır: yeni sürüm arka planda iner,
   sayfa güvenli bir anda (uygulamadan çıkılınca, sayaç çalışmıyorken) yenilenir. */
const VERSION = 'luna-v17';
const VENDOR = 'luna-vendor-1'; // büyük ve değişmeyen kütüphaneler (PDF.js, Anthropic SDK), yazı tipleri
const FILES = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest',
  'js/storage.js', 'js/messages.js', 'js/audio.js', 'js/scene.js', 'js/timer.js', 'js/stats.js',
  'js/takvim.js', 'js/weather.js', 'js/yks.js', 'js/plan.js', 'js/deneme.js', 'js/notes.js', 'js/giris.js', 'js/depo.js', 'js/depo-ui.js', 'js/hata.js', 'js/kaynak.js', 'js/kaynak-ui.js', 'js/badges.js', 'js/spotify.js', 'js/asistan.js', 'js/uni.js', 'js/uni-ui.js', 'js/diag.js', 'js/app.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
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

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((cs) => (cs[0] ? cs[0].focus() : self.clients.openWindow('./')))
  );
});
