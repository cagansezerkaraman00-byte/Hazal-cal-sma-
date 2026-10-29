// Run: node tests/globals.test.cjs
// "const X = ..." ile tanımlanan modüller tarayıcıda window'a bağlanmaz: window.X hep boş görünür ve o özellik sessizce çalışmaz
// (seri rozetleri, defter sesleri böyle kaybolmuştu). Bu test, window'a bağlanmamış bir modülün window.X diye sorulmasını yakalar.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const dir = path.join(__dirname, '..', 'js');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
const src = Object.fromEntries(files.map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf8')]));
const all = Object.values(src).join('\n');
const consts = [...new Set([...all.matchAll(/^const ([A-Z][A-Za-z]*) = /gm)].map((m) => m[1]))];
const onWindow = (c) => new RegExp(`window\\.${c}\\s*=`).test(all);
const bad = [];
for (const c of consts.filter((x) => !onWindow(x))) {
  for (const [f, s] of Object.entries(src)) {
    s.split('\n').forEach((line, i) => { if (new RegExp(`window\\.${c}\\b`).test(line)) bad.push(`${f}:${i + 1}: window.${c} (window'a bağlı değil; typeof ${c} kullan)`); });
  }
}
assert.deepStrictEqual(bad, [], bad.join('\n'));
console.log(`Genel adlar: ${consts.length} modül denetlendi, window'a bağlı olmayan bir modül window.X diye sorulmuyor`);
