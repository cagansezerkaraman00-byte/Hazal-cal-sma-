// Yeni mektup için: node scripts/mektup-kodla.cjs mektup.txt
// mektup.txt: ilk satır hitap ("Güzel Hazal’ım,"), sonra boş satırlarla ayrılmış paragraflar.
// Çıktıdaki metni js/mektuplar.js listesine "metin" olarak yapıştır (kodlu durur; kodu açan biri sürprizi okuyamasın).
const fs = require('node:fs');
const src = fs.readFileSync(process.argv[2], 'utf8').replace(/\r/g, '').trim();
const [hitap, ...rest] = src.split('\n');
const paragraflar = rest.join('\n').split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
console.log(Buffer.from(JSON.stringify({ hitap: hitap.trim(), paragraflar }), 'utf8').toString('base64'));
