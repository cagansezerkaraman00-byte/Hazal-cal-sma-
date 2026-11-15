// Hesap makinesinin ekranında uyuyan kediler Luna'nın kendi piksel çizimleridir: hesap-kediler.js'teki parçalar ve renkler
// js/scene.js'tekilerle birebir aynı mı? (scene.js'e dokunulmaz; burada yalnızca okunur.)
const fs = require('node:fs'), path = require('node:path');
const K = require('../hesap-kediler.js');
const sahne = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'scene.js'), 'utf8');
let hata = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) hata++; };
const dizeler = [...sahne.matchAll(/'([^'\n]*)'/g)].map((m) => m[1]);
const icinde = (satirlar) => { for (let i = 0; i + satirlar.length <= dizeler.length; i++) if (satirlar.every((r, j) => dizeler[i + j] === r)) return true; return false; };
const V = K.VERI;
for (const ad of Object.keys(V.PART)) ok(icinde(V.PART[ad]), 'Luna parçası aynı: ' + ad);
ok(icinde(V.KIT_SLEEP), 'yavru Güçlü uyku pozu aynı');
for (const ad of Object.keys(V.ITEM)) ok(icinde(V.ITEM[ad]), 'süs aynı: ' + ad);
const palet = (ad) => { const m = sahne.match(new RegExp('const ' + ad + ' = \\{([\\s\\S]*?)\\};')); return m ? Object.fromEntries([...m[1].matchAll(/(\w+): '([^']+)'/g)].map((x) => [x[1], x[2]])) : null; };
for (const ad of ['LUNA_PAL', 'VES_PAL', 'KIT_PAL']) ok(JSON.stringify(palet(ad)) === JSON.stringify(V[ad]), 'renkler aynı: ' + ad);
const sahneItem = palet('ITEM_PAL');
ok(sahneItem && sahneItem.h === '#ff6b9a' && sahneItem.z === '#e9e4ff', 'kalp ve z renkleri aynı');
// uyku pozu sahnedeki gibi kurulur: loaf(tailLoafB, alçak) + uyku gözleri, sağa bakar
const poz = K.uykuLuna();
ok(poz.length === 17 && poz[0].length === 35 && !poz.join('').includes('h'), 'Luna uyku pozu 35×17, gözler kapalı');
console.log(hata ? `\n${hata} SORUN` : '\nhepsi tamam');
process.exitCode = hata ? 1 : 0;
