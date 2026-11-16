// Run: node tests/release-integrity.test.cjs   (no dependencies)
// GitHub Pages bu daldan doğrudan yayın yapar: bozuk ya da yarım bir dosya gönderilirse Hazal'ın telefonundaki Luna
// bir sonraki güncellemede açılamaz (2.3.4–2.3.6'da app.js yarım kalmıştı: kedi, yıldızlar, sayaç hiçbiri çalışmadı).
// Bu test göndermeden önce şunları denetler:
//  1. her betik (js/*.js, sw.js, index.html ve repair.html içindeki satır içi betikler) sözdizimi olarak tam
//  2. metin dosyalarında (vendor dışında hepsi) CR yok (karışık satır sonu, dosyaları yarıda kesen düzenleme hatalarının işaretiydi)
//  3. index.html'in yüklediği her yerel dosya var, ?v= ve <html data-surum> güncel sürüm, sw.js önbellek listesinde;
//     js/ klasöründeki her dosya index.html'de yükleniyor (eksik <script> etiketi)
//  4. index.html sırasıyla yüklenen modüller gerçekten tanımlanıyor ve app.js'in çağırdığı her Modül.işlev var
//  5. app.js'in açılışı (init) sahte bir tarayıcıda baştan sona çalışıyor: adı değişmiş/silinmiş bir işlev (ReferenceError) yakalanır
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// 1 + 2: sözdizimi ve satır sonları
const html = read('index.html');
const scripts = fs.readdirSync(path.join(root, 'js')).filter((f) => f.endsWith('.js')).map((f) => 'js/' + f).concat(['sw.js']);
for (const f of scripts) {
  const src = read(f);
  try { new vm.Script(src, { filename: f }); } catch (e) { problems.push(`${f}: ${e.message}`); }
}
for (const page of ['index.html', 'repair.html']) {
  if (!fs.existsSync(path.join(root, page))) continue;
  [...read(page).matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].forEach((m, i) => {
    try { new vm.Script(m[1], { filename: `${page} inline #${i + 1}` }); } catch (e) { problems.push(`${page} inline script #${i + 1}: ${e.message}`); }
  });
  check(/<\/html>\s*$/.test(read(page)), `${page}: dosya </html> ile bitmiyor (yarım kalmış olabilir)`);
}
const walk = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((d) => {
  const p = dir ? dir + '/' + d.name : d.name;
  if (d.isDirectory()) return ['.git', 'node_modules', 'vendor'].includes(d.name) ? [] : walk(p);
  return /\.(js|cjs|mjs|json|html|css|webmanifest|md|yml|yaml)$/.test(d.name) || p === '.githooks/pre-push' ? [p] : [];
});
const textFiles = walk('');
for (const f of textFiles) check(!read(f).includes('\r'), `${f}: CR satır sonu var (LF olmalı; karışık satır sonu düzenleme araçlarında dosyayı yarıda kesebiliyor)`);

// 3: index.html'in yüklediği dosyalar
const version = JSON.parse(read('js/surum.js').match(/\/\*SURUMLER\*\/([\s\S]*?)\/\*SURUMLER\*\//)[1])[0].surum;
const sw = read('sw.js');
const cached = sw.match(/const FILES = \[([\s\S]*?)\];/)[1].match(/'([^']+)'/g).map((x) => x.slice(1, -1));
const order = [];
for (const m of html.matchAll(/<(?:script[^>]*\bsrc|link[^>]*\bhref)="((?:js|css)\/[^"?#]+)(\?v=([^"]*))?"/g)) {
  check(fs.existsSync(path.join(root, m[1])), `index.html ${m[1]} yüklüyor ama dosya yok`);
  check(m[3] === version, `index.html ${m[1]}?v=${m[3]} ama sürüm ${version} (node scripts/build-release.cjs çalıştır)`);
  check(cached.includes(m[1]), `index.html ${m[1]} kullanıyor ama sw.js önbelleğe almıyor`);
  if (m[1].endsWith('.js')) order.push(m[1]);
}
for (const f of scripts.filter((x) => x.startsWith('js/'))) check(order.includes(f), `${f} var ama index.html onu yüklemiyor (<script src="${f}?v=${version}"> eksik)`);
const htmlTag = (html.match(/<html\b[^>]*>/) || [''])[0];
check((htmlTag.match(/\bdata-surum="/g) || []).length === 1 && htmlTag.includes(`data-surum="${version}"`), `index.html <html data-surum="${version}"> olmalı (açılış koruması kendi sürümünü buradan bilir; node scripts/build-release.cjs çalıştır)`);

// 4: modülleri index.html sırasıyla, her şeyi yutan sahte bir tarayıcıda çalıştır; tanımlananları ve app.js'in çağırdıklarını karşılaştır
const stub = () => { const f = function () { return p; }; const p = new Proxy(f, { get: (t, k) => (k === Symbol.toPrimitive ? () => '' : k === 'then' ? undefined : k === 'length' ? 0 : k === Symbol.iterator ? [][Symbol.iterator].bind([]) : p), apply: () => p, construct: () => p, set: () => true, has: () => true }); return p; };
const store = new Map(), started = [], errors = [];
const sandbox = {
  console: { log() {}, warn() {}, info() {}, error: (...a) => errors.push(a) }, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 0, cancelAnimationFrame() {}, queueMicrotask() {},
  URL, URLSearchParams, TextEncoder, TextDecoder, Intl, structuredClone, atob, btoa, crypto: globalThis.crypto, performance: { now: () => 0 },
  localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), key: () => null, length: 0 },
  location: new URL('https://example.test/Luna/?app'), document: null,
  navigator: { userAgent: 'integrity-test', platform: 'test', maxTouchPoints: 0, standalone: true, onLine: true,
    serviceWorker: { controller: null, ready: new Promise(() => {}), register: () => new Promise(() => {}), getRegistration: () => new Promise(() => {}), addEventListener() {} },
    storage: { persisted: () => Promise.resolve(true), persist: () => Promise.resolve(true), estimate: () => Promise.resolve({}) } },
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }), addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
  Event: class {}, CustomEvent: class {}, Image: class {}, Audio: class {}, MessageChannel: class { constructor() { this.port1 = stub(); this.port2 = stub(); } }, BroadcastChannel: class { postMessage() {} close() {} addEventListener() {} }, Notification: stub(), indexedDB: stub(), caches: stub(),
};
{ const base = stub(); sandbox.document = new Proxy(function () {}, { get: (t, k) => (k === 'addEventListener' ? (type, fn) => { if (type === 'DOMContentLoaded') started.push(fn); } : k === 'readyState' ? 'loading' : base[k]), set: () => true, has: () => true }); }
let bootReady = false;
sandbox.LunaBoot = { ready() { bootReady = true; }, fail(e) { errors.push(['açılış', e]); }, rolledBack: () => null, told() {} };
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox; sandbox.sessionStorage = sandbox.localStorage;
const ctx = vm.createContext(sandbox);
for (const f of order) {
  try { vm.runInContext(read(f), ctx, { filename: f, timeout: 5000 }); } catch (e) { problems.push(`${f} yüklenirken hata verdi: ${e.message}`); }
}
const declared = new Map();
for (const f of order) for (const m of read(f).matchAll(/^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm)) declared.set(m[1], f);
for (const f of scripts.filter((x) => x.startsWith('js/') && !order.includes(x))) for (const m of read(f).matchAll(/^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm)) declared.set(m[1], f);
const defined = (expr) => { try { return vm.runInContext(`typeof ${expr} !== 'undefined'`, ctx); } catch (e) { return false; } };
for (const [name, f] of declared) check(defined(name), `${f}: ${name} tanımlanamadı`);
const app = read('js/app.js') + '\n' + html;
const calls = new Set([...app.matchAll(/\b([A-Z][A-Za-z]+|U)\.([A-Za-z_$][\w$]*)\b/g)].filter((m) => declared.has(m[1])).map((m) => m[1] + '.' + m[2]));
const guarded = (call) => new RegExp('&&\\s*' + call.replace('.', '\\.') + '\\b').test(app); // ör. LunaKurulum.active && LunaKurulum.mount
for (const call of calls) if (!guarded(call)) check(defined(call), `app.js ya da index.html ${call} kullanıyor ama ${declared.get(call.split('.')[0])} bunu tanımlamıyor`);

// 5: açılışı çalıştır (DOM, zamanlayıcılar ve ağ sahte; yalnızca tanımsız ad hataları kesin sorun sayılır)
for (const fn of started) { try { fn(); } catch (e) { errors.push(['açılış', e]); } }
const failures = errors.map((a) => [String(a[0]).slice(0, 40), a.find((x) => x instanceof Error || (x && x.stack))]).filter(([, e], i, all) => e && all.findIndex(([, x]) => x === e) === i);
for (const [where, e] of failures) {
  if (e.name === 'ReferenceError' || e.name === 'SyntaxError') problems.push(`app.js açılışı durdu (${where.trim()}): ${e.name}: ${e.message}`);
  else console.log(`(uyarı) açılışta ${where.trim()} ${e.name}: ${e.message} — bu test DOM'u taklit ediyor; tarayıcıda duman testine (scripts/smoke.cjs) bak`);
}
if (!order.length || !started.length) problems.push('app.js açılış işlevini (DOMContentLoaded) kaydetmedi');
else if (!bootReady && !failures.length) problems.push('app.js açılışı LunaBoot.ready() çağrısına ulaşmadı');

if (problems.length) { console.error('Yayın bütünlüğü BOZUK:\n - ' + problems.join('\n - ')); process.exitCode = 1; }
else console.log(`Yayın bütünlüğü tamam: ${scripts.length} betik derlendi, ${order.length} modül yüklendi, ${calls.size} modül çağrısı doğrulandı, açılış sonuna kadar çalıştı (sürüm ${version})`);
