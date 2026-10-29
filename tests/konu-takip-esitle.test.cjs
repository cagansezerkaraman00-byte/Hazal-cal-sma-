// Run: node tests/konu-takip-esitle.test.cjs
// İki cihazın konu işaretleri ve notları birleşince en son değişiklik kalır; boşaltılan kutu öbür cihazın eski işaretiyle geri dolmaz.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const cihaz = () => {
  const st = { 'luna-study-v1': JSON.stringify({ version: 1, yks: { field: 'SAY', topics: {}, planDone: {} } }) };
  const ctx = vm.createContext({ localStorage: { getItem: (k) => (k in st ? st[k] : null), setItem: (k, v) => { st[k] = String(v); }, removeItem: (k) => { delete st[k]; } }, console, Date, Math, JSON });
  for (const f of ['js/storage.js', 'js/yks.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
  return ctx;
};
const bekle = () => { const t = Date.now(); while (Date.now() - t < 3); };
const A = cihaz(), B = cihaz();
vm.runInContext('YKS.setDurum("tyt_mat:sayilar", "tam"); YKS.setDurum("tyt_mat:problemler", "tam")', A);
bekle();
vm.runInContext('YKS.setDurum("tyt_mat:sayilar", "yarim"); YKS.setNot("tyt_fiz:optik", "ayna soruları")', B);
bekle();
vm.runInContext('YKS.setDurum("tyt_mat:problemler", "")', A);
const veriB = vm.runInContext('JSON.stringify(Store.data)', B);
assert.notStrictEqual(vm.runInContext(`Store.mergeJSON(${veriB})`, A), false, 'birleştirme çalıştı');
const sonuc = JSON.parse(vm.runInContext('JSON.stringify([YKS.durum("tyt_mat:sayilar"), YKS.durum("tyt_mat:problemler"), YKS.not("tyt_fiz:optik")])', A));
assert.deepStrictEqual(sonuc, ['yarim', '', 'ayna soruları'], 'en son değişiklik kaldı, boşaltılan kutu geri dolmadı, öbür cihazın notu geldi');
console.log('konu-takip-esitle: 2 checks passed');
