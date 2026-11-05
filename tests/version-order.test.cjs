// Run: node tests/version-order.test.cjs
// Sürüm listesi yukarıdan aşağı kesin azalmalı; aksi halde kurulu uygulamalar güncellemeyi görmez.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const text = fs.readFileSync(path.join(__dirname, '../js/surum.js'), 'utf8');
const list = JSON.parse(text.match(/\/\*SURUMLER\*\/([\s\S]*?)\/\*SURUMLER\*\//)[1]);
const newer = (a, b) => {
  const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0; }
  return false;
};
let n = 0;
for (let i = 0; i + 1 < list.length; i++) { assert.ok(newer(list[i].surum, list[i + 1].surum), `${list[i].surum} must be newer than ${list[i + 1].surum}`); n++; }
const labels = list.map((v) => v.gorunenSurum || v.surum);
assert.equal(new Set(labels).size, labels.length, 'visible version labels are unique'); n++;
if (labels.length > 1) { assert.ok(newer(labels[0], labels[1]), `visible version ${labels[0]} must be newer than ${labels[1]} (the update card shows it)`); n++; }
for (const v of list) { assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(v.tarih) && v.baslik && Array.isArray(v.notlar) && v.notlar.length, `entry ${v.surum} is complete`); n++; }
console.log(`${n} version order checks passed`);
