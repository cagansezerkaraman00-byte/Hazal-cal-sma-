// Hazal'a giden Luna sürümünü seçer: apk/guncel.json'ı GitHub'daki bir derlemeden doldurur.
// Kullanım (depo kökünden): node apk/scripts/onayla.cjs <derleme>   ör. node apk/scripts/onayla.cjs 1015
// Yalnızca Çağan "Hazal'a gönder" deyince çalıştırılır; sonra guncel.json işlenip gönderilir.
//  - apk: o derlemenin kalıcı anahtarlı luna.apk'sı (Android tarafı değiştiyse Hazal Ayarlar'da bir kez "Güncelle" der)
//  - web: o derlemenin Luna paketi ve Android parmak izi (aynı parmak izli uygulama yeniliği kendiliğinden alır)
const fs = require('node:fs'), path = require('node:path');
const DEPO = 'cagansezerkaraman00-byte/Hazal-cal-sma-';
const kod = +process.argv[2];
if (!(kod > 1000)) { console.error('derleme numarası ver: node apk/scripts/onayla.cjs 1015'); process.exit(1); }
const dosya = path.join(__dirname, '..', 'guncel.json');

(async () => {
  // curl: çalışılan makinenin vekil sunucu ve GitHub ayarlarını kullanır (Windows 10+, macOS ve Linux'ta hazır)
  let rel;
  try {
    rel = JSON.parse(require('node:child_process').execFileSync('curl', ['-sSf', '-H', 'Accept: application/vnd.github+json',
      `https://api.github.com/repos/${DEPO}/releases/tags/apk-${kod}`], { encoding: 'utf8' }));
  } catch (e) { throw new Error(`apk-${kod} sürüm sayfası okunamadı (${String(e.message).split('\n')[0]})`); }
  const hazir = (a) => a && a.state === 'uploaded' && a.size > 0;
  const apk = rel.assets.find((a) => a.name === 'luna.apk');
  if (!hazir(apk)) throw new Error(`apk-${kod}: kalıcı anahtarlı luna.apk yok`);
  const web = rel.assets.find((a) => /^luna-web-[0-9a-f]{12}\.zip$/.test(a.name));
  const surum = (String(rel.name || '').match(/Luna APK ([\d.]+)/) || [])[1] || '';
  const yenilikler = String(rel.body || '').split(/\n---\n/)[0].split('\n').filter((s) => /^- /.test(s)).map((s) => s.slice(2).trim());
  const eski = JSON.parse(fs.readFileSync(dosya, 'utf8'));
  const yeni = {
    aciklama: eski.aciklama,
    kod, surum, tarih: String(rel.published_at || new Date().toISOString()).slice(0, 10),
    apk: apk.browser_download_url, boyut: apk.size, yenilikler,
  };
  if (hazir(web)) {
    yeni.web = {
      kod, yerli: web.name.slice(9, 21), url: web.browser_download_url, boyut: web.size,
      sha256: String(web.digest || '').replace(/^sha256:/, ''),
    };
  }
  fs.writeFileSync(dosya, JSON.stringify(yeni, null, 2) + '\n');
  console.log(`Hazal'a giden sürüm: ${eski.kod} → ${kod} (${surum})${yeni.web ? ' · Luna paketi ' + yeni.web.yerli : ' · Luna paketi yok (yalnızca APK)'}`);
})().catch((e) => { console.error('ONAYLANAMADI: ' + e.message); process.exit(1); });
