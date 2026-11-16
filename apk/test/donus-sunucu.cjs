// Emülatör denemesi için Spotify'ın dönüşünü taklit eden küçük sunucu (emülatörden http://10.0.2.2:8089).
//   /r?k=KOD  → hemen com.hazal.luna://spotify-callback?code=KOD'a yönlendirir (Spotify izin sayfasını atladığında olduğu gibi)
//   /dokun    → tam ekran "Kabul et" bağlantısı; dokununca /r?k=DOKUN (Hazal izin sayfasında "Kabul et"e bastığında olduğu gibi)
const http = require('node:http');
http.createServer((q, s) => {
  const u = new URL(q.url, 'http://x');
  if (u.pathname === '/r') {
    s.writeHead(302, { Location: 'com.hazal.luna://spotify-callback?code=' + encodeURIComponent(u.searchParams.get('k') || 'OTO') + '&state=emu' });
    return s.end();
  }
  s.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  s.end('<!doctype html><meta name="viewport" content="width=device-width"><a href="/r?k=DOKUN" style="display:flex;align-items:center;justify-content:center;height:100vh;font:40px sans-serif;background:#1db954;color:#fff;text-decoration:none">Kabul et</a>');
}).listen(8089, () => console.log('dönüş sunucusu: 8089'));
