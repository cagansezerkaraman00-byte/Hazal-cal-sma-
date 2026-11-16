// Tuş gecikmesi: tablet/telefon işlemcisi gibi 4 kat yavaşlatılmış tarayıcıda dokunuştan kutudaki değişikliğe kadar geçen süre.
// node hesap/test/hiz-test.cjs   (yerelde: YEREL_NM=<node_modules>)
const { chromium } = require('playwright');
const { sun, cdnYerel } = require('./sunucu.cjs');
(async () => {
  const sunucu = await sun();
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await cdnYerel(ctx);
  const page = await ctx.newPage();
  await page.goto(sunucu.adres + '?guncel');
  await page.waitForFunction(() => window.hesap && customElements.get('math-field'));
  await page.waitForTimeout(500);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const sureler = [];
  const sira = ['7', '+', '8', '×', '9', '−', '6', '÷', '3', '+', '1', '2', '5', '4'];
  for (const t of sira) {
    const el = page.locator('.hm-tus').filter({ hasText: new RegExp('^\\s*' + t.replace(/[+×÷−]/, (c) => '\\' + c) + '\\s*$') }).first();
    const bb = await el.boundingBox();
    const once = await page.evaluate(() => window.hesap.mf.value);
    const sure = await page.evaluate(([x, y, once]) => new Promise((ok) => {
      const t0 = performance.now();
      const bekle = () => { if (window.hesap.mf.value !== once) { requestAnimationFrame(() => ok(performance.now() - t0)); } else if (performance.now() - t0 > 3000) ok(3000); else setTimeout(bekle, 1); };
      // gerçek dokunuş sırası: pointerdown → (bekleme) → pointerup → click
      const hedef = document.elementFromPoint(x, y);
      const ev = (tur, Sinif) => hedef.dispatchEvent(new Sinif(tur, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerType: 'touch', isPrimary: true, pointerId: 1, detail: 1 }));
      ev('pointerdown', PointerEvent); bekle();
      setTimeout(() => { ev('pointerup', PointerEvent); ev('click', MouseEvent); }, 90); // parmağın camda kalma süresi ~90 ms
    }), [bb.x + bb.width / 2, bb.y + bb.height / 2, once]);
    sureler.push(sure);
  }
  sureler.sort((a, c) => a - c);
  const ort = sureler.reduce((s, x) => s + x, 0) / sureler.length;
  console.log(`dokunuştan ekrana: ortalama ${Math.round(ort)} ms, ortanca ${Math.round(sureler[sureler.length >> 1])} ms, en kötü ${Math.round(sureler[sureler.length - 1])} ms (işlemci 4× yavaş)`);
  console.log('kutu: ' + await page.evaluate(() => window.hesap.mf.value));
  await b.close(); sunucu.kapat();
})();
