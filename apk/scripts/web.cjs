// Luna'nın dosyalarını Android uygulamasının içine (apk/www) kopyalar.
// Luna'nın kendi dosyaları hiç değişmez: uygulamaya özgü küçük ayarlar yalnızca bu kopyada yapılır.
// Beklenen yer bulunamazsa derleme durur (Luna'da bir şey değişmişse sessizce yanlış bir APK çıkmasın).
const fs = require('node:fs'), path = require('node:path');
const apk = path.join(__dirname, '..'), root = path.join(apk, '..'), www = path.join(apk, 'www');

// Uygulamaya girenler: sayfa, stil, kod, görseller, PDF görüntüleyici, sınav tarihleri.
// Girmeyenler: servis çalışanı (sw.js; uygulamada dosyalar zaten içeride), testler, betikler, notlar, önizlemeler.
const COPY = ['index.html', 'repair.html', 'manifest.webmanifest', 'release-manifest.json', 'sinav-tarihleri.json', 'css', 'js', 'assets', 'icons', 'vendor'];

function fail(msg) { console.error('APK web kopyası DURDU: ' + msg); process.exit(1); }
function replaceOnce(file, from, to) {
  const p = path.join(www, file), s = fs.readFileSync(p, 'utf8'), n = s.split(from).length - 1;
  if (n !== 1) fail(`${file}: "${from.slice(0, 60)}" ${n} kez bulundu (1 bekleniyordu)`);
  fs.writeFileSync(p, s.replace(from, to));
}

fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });
for (const name of COPY) {
  const src = path.join(root, name);
  if (!fs.existsSync(src)) fail(name + ' bulunamadı');
  fs.cpSync(src, path.join(www, name), { recursive: true });
}
fs.mkdirSync(path.join(www, 'native'));
fs.copyFileSync(path.join(apk, 'native', 'luna-native.js'), path.join(www, 'native', 'luna-native.js'));

// 1) Uygulama ayarları her şeyden önce yüklensin (açılış korumasından da önce)
replaceOnce('index.html', '<script>\n  // Açılış koruması:', '<script src="native/luna-native.js"></script>\n  <script>\n  // Açılış koruması:');

// 2) Android 15+ uygulamaları ekranın kenarına kadar çizer; durum çubuğu ve alt çubuk payını
//    Capacitor --safe-area-inset-* değişkenleriyle verir. Luna'nın env(...) paylarına bu değişkenler önce gelsin.
{
  const p = path.join(www, 'css/style.css'), s = fs.readFileSync(p, 'utf8');
  let n = 0;
  const out = s.replace(/env\((safe-area-inset-(?:top|right|bottom|left))(\s*,[^()]*)?\)/g, (m, side, fb) => { n++; return `var(--${side}, env(${side}${fb || ''}))`; });
  const left = (out.match(/(?<!var\(--safe-area-inset-[a-z]+, )env\(safe-area-inset/g) || []).length;
  if (!n || left) fail(`css/style.css: ${n} kenar payı çevrildi, ${left} tanesi kaldı`);
  fs.writeFileSync(p, out);
  console.log(`kenar payları: ${n}`);
}

// 3) Spotify girişi uygulama içi Chrome sekmesinde açılır ve bu adresle uygulamaya geri döner
//    (Spotify panelinde de bu adres kayıtlı olmalı)
replaceOnce('js/spotify.js', 'const redirectUri = () => location.origin + location.pathname;', "const redirectUri = () => 'com.hazal.luna://spotify-callback';");
replaceOnce('js/spotify.js', "location.href = AUTH + '?' + q.toString();", "if (window.LunaApk) window.LunaApk.open(AUTH + '?' + q.toString()); else location.href = AUTH + '?' + q.toString();");

console.log('APK web kopyası hazır: ' + www);
