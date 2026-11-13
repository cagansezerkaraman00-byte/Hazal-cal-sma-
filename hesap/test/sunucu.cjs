// Testler için: hesap/ klasörünü yerelde sunar. YEREL_NM verilirse CDN kütüphaneleri internete çıkmadan oradan gelir.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const kok = path.join(__dirname, '..');
const tur = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.png': 'image/png', '.json': 'application/json' };
function sun() {
  const s = http.createServer((q, r) => {
    let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(kok, p);
    if (!f.startsWith(kok) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': tur[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  });
  return new Promise((ok) => s.listen(0, '127.0.0.1', () => ok({ adres: `http://127.0.0.1:${s.address().port}/`, kapat: () => s.close() })));
}
async function cdnYerel(ctx) {
  const nm = process.env.YEREL_NM;
  if (!nm) return;
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/([^@]+|@[^/]+\/[^@]+)@[^/]+\/(.*)$/, (rt) => {
    const m = rt.request().url().match(/cdn\.jsdelivr\.net\/npm\/((?:@[^/]+\/)?[^@/]+)@[^/]+\/(.*)$/);
    const f = path.join(nm, m[1], m[2].split('?')[0]);
    if (!fs.existsSync(f)) return rt.fulfill({ status: 404, body: '' });
    rt.fulfill({ status: 200, headers: { 'content-type': tur[path.extname(f)] || 'application/octet-stream', 'access-control-allow-origin': '*' }, body: fs.readFileSync(f) });
  });
}
module.exports = { sun, cdnYerel };
