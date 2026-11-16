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
// Tuşlara adıyla bas (görünen yazısı ya da erişilebilir adı). Tuş o an açık sekmede yoksa sekmeler sırayla denenir.
// '◀' / '▶' ekrandaki imleç düğmeleridir; '⇄' eski katman tuşudur, yok sayılır. '=' yazı tuşudur (Çöz tuşu "Çöz" adıyla).
function tusci(page) {
  return async (...adlar) => {
    if (await page.locator('.hm.tuslar-kapali').count()) { await page.click('.hm-tus-ac'); await page.waitForTimeout(80); }
    for (const a of adlar) {
      if (a === '⇄') continue;
      if (a === '▶' || a === '◀') { await page.click(`.hm-imlec [data-komut="${a === '▶' ? 'moveToNextChar' : 'moveToPreviousChar'}"]`); await page.waitForTimeout(40); continue; }
      const kac = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let el = null;
      for (const sekme of [null, 'bilimsel', 'cebir', 'analiz']) {
        if (sekme) await page.click(`.hm-sekme[data-sekme="${sekme}"]`);
        const t = page.locator('.hm-tus:not(.esit)').filter({ hasText: new RegExp('^\\s*' + kac + '\\s*$') });
        if (await t.count()) { el = t.first(); break; }
        const t2 = page.locator(`.hm-tus[aria-label="${a}"]`);
        if (await t2.count()) { el = t2.first(); break; }
      }
      if (!el) throw new Error('tuş yok: ' + a);
      await el.click(); await page.waitForTimeout(40);
    }
  };
}
module.exports = { sun, cdnYerel, tusci };
