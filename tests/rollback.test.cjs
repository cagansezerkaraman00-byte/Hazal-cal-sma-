// Run: node tests/rollback.test.cjs   (no dependencies)
// Servis çalışanının geri dönüş defteri: hangi sürüm bu cihazda sorunsuz açıldı, açılamayan yeni sürümde son sağlam
// sürümün sayfası verilir, düzeltilmiş sürüm gelince iğne kalkar, son sağlam önbellek silinmez, 2.3.4–2.3.6 silinir.
// Kayıtlar (localStorage, IndexedDB) bu akışta hiç kullanılmaz: yalnızca Cache Storage.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict'), crypto = require('node:crypto').webcrypto;
const source = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
const FILES = source.match(/const FILES = \[([\s\S]*?)\];/)[1].match(/'([^']+)'/g).map((x) => x.slice(1, -1));
const scope = 'https://example.test/Luna/';
const abs = (u) => new URL(typeof u === 'string' ? u : u.url, scope).href;

// bellekte Cache Storage
const store = new Map();
const cacheObj = (name) => ({
  async match(req) { const r = store.get(name).get(abs(req)); return r ? r.clone() : undefined; },
  async put(req, res) { store.get(name).set(abs(req), res); },
  async delete(req) { return store.get(name).delete(abs(req)); },
});
const caches = {
  async open(name) { if (!store.has(name)) store.set(name, new Map()); return cacheObj(name); },
  async has(name) { return store.has(name); },
  async keys() { return [...store.keys()]; },
  async delete(name) { return store.delete(name); },
  async match(req, opts = {}) {
    for (const name of opts.cacheName ? [opts.cacheName] : store.keys()) { const r = store.has(name) && store.get(name).get(abs(req)); if (r) return r.clone(); }
    return undefined;
  },
};
const page = (v, reports = true) => `<!doctype html><html lang="tr"${reports ? ` data-surum="${v}"` : ''}><body>Luna ${v}</body></html>`;
const body = (v, f, reports) => (f === './' || f === 'index.html' ? page(v, reports) : `/* ${f} ${v} */`);
function seedOld(v) { // eski bir SW'nin bıraktığı tam önbellek (kendini bildiremeyen sürüm)
  const m = new Map(); for (const f of FILES) m.set(abs(f), new Response(body(v, f, false))); store.set('luna-' + v, m);
}
async function digest(text) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), (b) => b.toString(16).padStart(2, '0')).join(''); }

async function worker(v) {
  const files = {};
  for (const f of FILES) { const k = f === './' ? 'index.html' : f; if (/\.(js|css|html|webmanifest|mp3)$/.test(k)) files[k] = await digest(body(v, f, true)); }
  const handlers = {}; let claimed = 0;
  const ctx = {
    crypto, URL, Response, TextEncoder, location: { origin: 'https://example.test' }, SURUMLER: [{ surum: v }], importScripts() {}, caches,
    Request: class { constructor(url) { this.url = url; } },
    fetch: async (r) => { const f = typeof r === 'string' ? r : r.url; if (f === 'release-manifest.json') return new Response(JSON.stringify({ version: v, files })); if (/^https?:/.test(f)) throw new Error('offline'); return new Response(body(v, f, true)); },
    self: { registration: { scope, getNotifications: async () => [] }, addEventListener: (k, fn) => (handlers[k] = fn), skipWaiting: async () => {}, clients: { claim: async () => { claimed++; } } },
  };
  vm.createContext(ctx); vm.runInContext(source, ctx);
  const run = (k, ev) => { let p; handlers[k]({ ...ev, waitUntil: (x) => (p = x) }); return p; };
  const w = {
    claimed: () => claimed,
    async install() { await run('install', {}); },
    async activate() { await run('activate', {}); },
    async message(data) { let reply; const port = { postMessage: (x) => (reply = x) }; await run('message', { data, ports: [port] }); return reply === undefined ? reply : JSON.parse(JSON.stringify(reply)); },
    async navigate(url = scope + '?source=homescreen') { let r; handlers.fetch({ request: { method: 'GET', mode: 'navigate', url }, respondWith: (x) => (r = x) }); return (await r).text(); },
    async shell(file, ver) { let r; handlers.fetch({ request: { method: 'GET', mode: 'no-cors', url: scope + file + (ver ? '?v=' + ver : '') }, respondWith: (x) => (r = x) }); const res = await r; return res.status === 200 ? res.text() : res.status; },
  };
  await w.install(); await w.activate();
  return w;
}
const meta = async (k) => { const r = await caches.match(scope + '__meta/' + k, { cacheName: 'luna-meta' }); return r ? r.json() : null; };
const has = (v) => store.has('luna-' + v);

(async () => {
  // Hazal'ın telefonu bugün: 2.3.8 (kendini bildiremez), 2.3.7 ve bozuk 2.3.5 önbellekte
  seedOld('2.3.5'); seedOld('2.3.7'); seedOld('2.3.8');
  let w = await worker('2.3.9');
  assert.deepEqual(Object.keys(await meta('good')), ['2.3.8'], 'the unpatched version in use counts as good once');
  assert.ok(!has('2.3.5'), 'known broken 2.3.5 cache is deleted');
  assert.ok(has('2.3.8') && has('2.3.7'), 'recent caches are kept');
  assert.match(await w.navigate(), /Luna 2\.3\.9/);
  assert.equal(w.claimed(), 1);
  await w.message({ type: 'LUNA_GOOD', version: '2.3.9' });
  assert.deepEqual(Object.keys(await meta('good')).sort(), ['2.3.8', '2.3.9']);
  assert.deepEqual(await w.message({ type: 'LUNA_ROLLBACK', version: '2.3.9' }), { ok: false, to: null }, 'a version that already opened here is never rolled back');

  // bozuk 2.3.10 gelir, açılamaz
  w = await worker('2.3.10');
  assert.match(await w.navigate(), /Luna 2\.3\.10/);
  assert.deepEqual(await w.message({ type: 'LUNA_ROLLBACK', version: '2.3.9' }), { ok: false, to: null }, 'only the newest version can ask for a rollback');
  assert.deepEqual(await w.message({ type: 'LUNA_ROLLBACK', version: '2.3.10' }), { ok: true, to: '2.3.9' });
  assert.match(await w.navigate(), /Luna 2\.3\.9/, 'pages now get the last good version');
  assert.equal(await w.shell('js/app.js', '2.3.9'), '/* js/app.js 2.3.9 */', 'its files come from its own cache');
  assert.equal(await w.shell('js/app.js', '2.3.6'), 503, 'a missing release is never filled with other code');
  assert.ok(!has('2.3.6'), 'asking for a missing release does not create an empty cache');
  assert.equal((await w.message({ type: 'LUNA_VERSION' })).pin.good, '2.3.9');
  // aynı sürüm yeniden etkinleşse (tarayıcı SW'yi yeniden kursa) iğne kalır, döngü olmaz
  await w.activate();
  assert.match(await w.navigate(), /Luna 2\.3\.9/);

  // düzeltilmiş 2.3.11 yayınlanır: iğne kalkar, yeni sürüm açılır
  w = await worker('2.3.11');
  assert.equal(await meta('pin'), null, 'a newer version clears the pin');
  assert.match(await w.navigate(), /Luna 2\.3\.11/);
  assert.ok(has('2.3.9'), 'last good cache kept');
  await w.message({ type: 'LUNA_GOOD', version: '2.3.11' });

  // üç bozuk sürüm üst üste: son sağlam önbellek en yeni üçün dışında kalsa da silinmez
  for (const v of ['2.3.12', '2.3.13', '2.3.14']) w = await worker(v);
  assert.ok(has('2.3.11'), 'last good cache survives three broken releases');
  assert.deepEqual(await w.message({ type: 'LUNA_ROLLBACK', version: '2.3.14' }), { ok: true, to: '2.3.11' });
  assert.match(await w.navigate(), /Luna 2\.3\.11/);
  // sağlam sürümün sayfası önbellekten kaybolduysa (tarayıcı sildiyse) yarım sürüme dönülmez: onarım ekranı kalır
  store.get('luna-2.3.11').delete(abs('index.html'));
  w = await worker('2.3.15');
  assert.deepEqual(await w.message({ type: 'LUNA_ROLLBACK', version: '2.3.15' }), { ok: false, to: null }, 'never rolls back to an incomplete cache');
  assert.match(await w.navigate(), /Luna 2\.3\.15/);

  // yeni bir cihaz: ilk kurulan sürüm (kendini bildirebilen) hiç açılamadı -> sağlam sayılmaz, geri dönülecek yer yok
  store.clear();
  w = await worker('2.4.0');
  w = await worker('2.4.1');
  assert.equal(await meta('good'), null, 'a patched version that never reported a good start is not seeded as good');
  assert.deepEqual(await w.message({ type: 'LUNA_ROLLBACK', version: '2.4.1' }), { ok: false, to: null });
  assert.match(await w.navigate(), /Luna 2\.4\.1/);
  console.log('Rollback checks passed: good versions recorded, broken update served the last good page, newer release clears the pin, last good cache kept, broken 2.3.4–2.3.6 removed');
})().catch((e) => { console.error(e); process.exitCode = 1; });
