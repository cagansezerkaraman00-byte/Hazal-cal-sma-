/* Luna hesap makinesi — fotoğraf okuyucu (modül işçisi, cihazın içinde çalışır; fotoğraf hiçbir sunucuya gitmez).
   Model: Texo (alephpi/FormulaNet, AGPL-3.0, 20 milyon parametre). Yalnızca fotoğraftaki matematiği okuyup LaTeX
   olarak geri verir; çözüm Luna'nın kendi hesap motorundadır (hesap-motor.js).
   İlk kullanımda model (~76 MB) iner ve tarayıcının önbelleğinde kalır; sonra internetsiz çalışır.
   Hazırlık Texo-web ile birebir aynıdır (app/composables/workers/imageProcessor.ts): beyaz zemin, gri ton, koyu zeminse
   ters çevirme, mürekkebin çevresinden kırpma, 384×384'e oranı koruyarak sığdırma (siyah dolgu), UniMERNet normalleştirmesi. */
const ORTALAMA = 0.7931, SAPMA = 0.1738, BOY = 384;
let tf = null, model = null, sozluk = null, hazirlaniyor = null;

async function baslat({ kutuphane, model: ad, uzak, yerel, wasm }) {
  if (model) return;
  if (hazirlaniyor) return hazirlaniyor;
  hazirlaniyor = (async () => {
    tf = await import(kutuphane);
    tf.env.allowLocalModels = !!yerel;
    if (yerel) tf.env.localModelPath = yerel;
    if (uzak) tf.env.remoteHost = uzak;
    if (wasm) tf.env.backends.onnx.wasm.wasmPaths = wasm;
    const ilerleme = (p) => {
      if (p && p.status === 'progress' && p.total) postMessage({ tur: 'ilerleme', dosya: p.file, yuklendi: p.loaded, toplam: p.total });
    };
    model = await tf.VisionEncoderDecoderModel.from_pretrained(ad, { dtype: 'fp32', progress_callback: ilerleme });
    sozluk = await tf.PreTrainedTokenizer.from_pretrained(ad);
  })();
  try { await hazirlaniyor; } finally { hazirlaniyor = null; }
}

function griTon(img) {
  const c = new OffscreenCanvas(img.width, img.height), g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); // saydam zemin beyaz olsun
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data, gri = new Uint8ClampedArray(c.width * c.height);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) gri[j] = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
  return { w: c.width, h: c.height, d: gri };
}
function tersCevir(im) { // koyu zemin, açık yazı: ters çevir
  let koyu = 0;
  for (const v of im.d) if (v < 200) koyu++;
  if (koyu >= im.d.length - koyu) for (let i = 0; i < im.d.length; i++) im.d[i] = 255 - im.d[i];
  return im;
}
function kirp(im) {
  let en = 255, ek = 0;
  for (const v of im.d) { if (v > ek) ek = v; if (v < en) en = v; }
  if (ek === en) return im;
  let x0 = im.w, y0 = im.h, x1 = 0, y1 = 0;
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) {
    if (((im.d[y * im.w + x] - en) / (ek - en)) * 255 < 200) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < x0 || y1 < y0) return im;
  const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0), d = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) d.set(im.d.subarray((y + y0) * im.w + x0, (y + y0) * im.w + x0 + w), y * w);
  return { w, h, d };
}
function sigdir(im) {
  const olcek = BOY / Math.min(im.h, im.w);
  let w = Math.round(im.w * olcek), h = Math.round(im.h * olcek);
  if (w > BOY || h > BOY) { const r = Math.min(BOY / w, BOY / h); w = Math.round(w * r); h = Math.round(h * r); }
  w = Math.max(1, w); h = Math.max(1, h);
  // gri görüntüyü tuvale koyup tuvalin kendi (çift doğrusal) küçültmesiyle boyutlandır
  const kaynak = new OffscreenCanvas(im.w, im.h), kg = kaynak.getContext('2d'), rgba = new Uint8ClampedArray(im.w * im.h * 4);
  for (let i = 0; i < im.d.length; i++) { rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = im.d[i]; rgba[i * 4 + 3] = 255; }
  kg.putImageData(new ImageData(rgba, im.w, im.h), 0, 0);
  const hedef = new OffscreenCanvas(w, h), hg = hedef.getContext('2d');
  hg.imageSmoothingEnabled = true; hg.imageSmoothingQuality = 'high';
  hg.drawImage(kaynak, 0, 0, w, h);
  const kucuk = hg.getImageData(0, 0, w, h).data, cikis = new Uint8ClampedArray(BOY * BOY); // siyah dolgu
  const px = Math.floor((BOY - w) / 2), py = Math.floor((BOY - h) / 2);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cikis[(y + py) * BOY + x + px] = kucuk[(y * w + x) * 4];
  return cikis;
}
async function oku(gorsel) {
  const img = await createImageBitmap(gorsel);
  const piksel = sigdir(kirp(tersCevir(griTon(img))));
  const dizi = new Float32Array(BOY * BOY);
  for (let i = 0; i < piksel.length; i++) dizi[i] = (piksel[i] / 255 - ORTALAMA) / SAPMA;
  const t = new tf.Tensor('float32', dizi, [1, 1, BOY, BOY]);
  const cikti = await model.generate({ inputs: tf.cat([t, t, t], 1) });
  return sozluk.batch_decode(cikti, { skip_special_tokens: true })[0];
}

self.onmessage = async (e) => {
  const m = e.data || {};
  try {
    if (m.tur === 'baslat') { await baslat(m.ayar); postMessage({ tur: 'hazir' }); }
    else if (m.tur === 'oku') { await baslat(m.ayar); const t0 = Date.now(); const latex = await oku(m.gorsel); postMessage({ tur: 'sonuc', latex, sure: Date.now() - t0, no: m.no }); }
  } catch (err) {
    postMessage({ tur: 'hata', hata: String((err && err.message) || err), no: m.no });
  }
};
