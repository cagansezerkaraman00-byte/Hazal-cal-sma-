// Run: node tests/precache.test.cjs
// sw.js'deki önbellek listesinde tek bir eksik dosya kurulumun tamamını bozar (cache.addAll hepsini ister):
// kurulu uygulamalar o zaman güncellemeyi hiç alamaz. Listedeki her dosya depoda olmalı.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const files = sw.match(/const FILES = \[([\s\S]*?)\];/)[1].match(/'([^']+)'/g).map((x) => x.slice(1, -1));
let n = 0;
for (const f of files) { if (f === './') continue; assert.ok(fs.existsSync(path.join(root, f)), `precached file missing: ${f}`); n++; }
// index.html'deki yerel betik ve stil dosyaları da listede olmalı (çevrimdışı açılış)
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const m of html.matchAll(/(?:src|href)="((?:js|css)\/[^"?#]+)"/g)) { assert.ok(files.includes(m[1]), `index.html uses ${m[1]} but sw.js does not precache it`); n++; }
console.log(`${n} precache checks passed`);
