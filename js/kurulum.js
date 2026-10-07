/* Kurulum kapısı: bağlantı tarayıcıda açılınca uygulamanın içi gösterilmez (sürpriz bozulmasın). Lila bir sayfada
   yalnızca Luna ve "Luna'yı yükle" düğmesi görünür. Android ve bilgisayarda (Chrome/Edge) düğme sistemin yükleme
   penceresini açar; iPhone/iPad ve Mac Safari'de adımları gösterir (Apple kendiliğinden yüklemeye izin vermiyor).
   Ana ekrandan/masaüstünden açılan Luna doğrudan uygulamadır.
   Geliştirirken uygulamayı tarayıcıda açmak için adresin sonuna ?app eklenir. */
const LunaKurulum = (() => {
  const params = new URLSearchParams(location.search);
  const ua = navigator.userAgent || '';
  const standalone = (() => {
    try {
      return navigator.standalone === true || ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'].some((m) => matchMedia(`(display-mode: ${m})`).matches);
    } catch (e) { return false; }
  })();
  const oauthReturn = /[?&#](code|state|access_token|error)=/.test(location.search + location.hash); // Google/Spotify girişi dönüşü
  const active = params.has('kurulum') || (!standalone && !oauthReturn && !params.has('app') && navigator.webdriver !== true);
  if (!active) return { active: false };

  document.documentElement.classList.add('kurulum');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', '#b896ea');

  const isIOS = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isIPad = isIOS && !/iPhone|iPod/.test(ua);
  const inApp = /FBAN|FBAV|Instagram|Line\/|Twitter|TikTok|Snapchat|GSA\//i.test(ua);
  const iosOther = isIOS && /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isFirefox = /Firefox\//.test(ua) && !isIOS;
  const isMacSafari = !isIOS && /Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|Edg\//.test(ua);

  let deferred = null, waiting = false, root = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; });
  window.addEventListener('appinstalled', () => { deferred = null; done(); });
  // yükleme için servis çalışanı gerekir; ayrıca uygulama ilk açılışta internetsiz de hazır olur
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});

  const share = '<svg class="kr-share" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4M6 11H5v10h14V11h-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const STEPS = {
    ios: `<ol><li><b>Paylaş</b> ${share} düğmesine dokun <small>(${isIPad ? 'sağ üstte' : 'altta'}; görmüyorsan önce <b>•••</b>)</small></li>
      <li>Listede <b>Ana Ekrana Ekle</b>'ye dokun <small>(gerekirse aşağı kaydır)</small></li>
      <li><b>Web Uygulaması Olarak Aç</b> açıksa açık kalsın, <b>Ekle</b>'ye dokun</li>
      <li>Ana ekrandaki <b>Luna</b>'ya dokun 💜</li></ol>
      <p class="kr-note">Listede <b>Ana Ekrana Ekle</b> yoksa sayfayı önce <b>Safari</b>'de aç (WhatsApp'tan açtıysan sağ alttaki pusula simgesi).</p>`,
    iosOther: `<ol><li>Adres çubuğundaki <b>Paylaş</b> ${share} düğmesine dokun</li><li><b>Ana Ekrana Ekle</b> → <b>Ekle</b></li><li>Göremezsen bağlantıyı <b>Safari</b>'de aç</li></ol>`,
    inApp: `<ol><li>Bu sayfa başka bir uygulamanın içinde açıldı</li><li>Sağ üstteki <b>•••</b> menüsünden <b>${isIOS ? "Safari'de aç" : 'Tarayıcıda aç'}</b>'a dokun</li><li>Açılan sayfada <b>Luna'yı yükle</b>'ye yeniden dokun</li></ol>`,
    mac: '<ol><li>Üstteki menü çubuğunda <b>Dosya</b>\'ya tıkla</li><li><b>Dock\'a Ekle</b> → <b>Ekle</b></li><li>Luna Dock\'tan açılır 💜</li></ol>',
    android: '<ol><li>Sağ üstteki <b>⋮</b> menüsüne dokun</li><li><b>Uygulamayı yükle</b> ya da <b>Ana ekrana ekle</b>\'ye dokun</li><li><b>Yükle</b> → ana ekrandaki <b>Luna</b>\'ya dokun 💜</li></ol><p class="kr-note">Menüde yükleme yoksa önce <b>Chrome\'da aç</b>\'a dokun. Luna zaten yüklüyse ana ekrandan aç.</p>',
    desktop: '<ol><li>Adres çubuğunun sağındaki <b>yükle</b> simgesine (⊕) ya da <b>⋮</b> menüsüne tıkla</li><li><b>Luna\'yı yükle</b> → <b>Yükle</b></li></ol><p class="kr-note">Luna zaten yüklüyse adres çubuğundaki "uygulamada aç" simgesine tıkla.</p>',
    firefox: '<ol><li>Firefox uygulama yükleyemiyor</li><li>Bağlantıyı <b>Chrome</b>, <b>Edge</b> ya da <b>Safari</b>\'de aç</li></ol>',
  };

  const $ = (s) => root && root.querySelector(s);
  function showSteps(kind) {
    const box = $('#kr-steps');
    box.innerHTML = STEPS[kind] + (['inApp', 'firefox', 'iosOther'].includes(kind) ? '<button class="kr-copy" type="button" id="kr-copy">🔗 Bağlantıyı kopyala</button>' : '');
    box.hidden = false;
    const arrow = $('.kr-arrow');
    arrow.hidden = !(kind === 'ios' && !iosOther && !inApp);
    arrow.classList.toggle('up', isIPad);
    root.classList.toggle('with-arrow', !arrow.hidden && !isIPad); // ok son adımın üstüne binmesin
    try { box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* eski tarayıcı */ }
    const copy = $('#kr-copy');
    if (copy) copy.addEventListener('click', async () => {
      const url = location.origin + location.pathname;
      try { await navigator.clipboard.writeText(url); copy.textContent = '✅ Kopyalandı'; } catch (e) { prompt('Bağlantı:', url); }
    });
  }
  function done() {
    if (!root) return;
    $('.kr-btn').hidden = true;
    $('.kr-arrow').hidden = true;
    const box = $('#kr-steps');
    box.innerHTML = `<p class="kr-done">🎉 Luna yüklendi!</p><p class="kr-note">${isAndroid ? 'Ana ekranındaki' : 'Uygulamalarındaki'} <b>Luna</b> simgesine dokun.</p>`;
    box.hidden = false;
  }
  async function install() {
    if (deferred) {
      const e = deferred; deferred = null;
      try {
        await e.prompt();
        const choice = await e.userChoice;
        if (choice && choice.outcome === 'accepted') done();
      } catch (err) { showSteps(isAndroid ? 'android' : 'desktop'); }
      return;
    }
    if (inApp) return showSteps('inApp');
    if (isIOS) return showSteps(iosOther ? 'iosOther' : 'ios');
    if (isMacSafari) return showSteps('mac');
    if (isFirefox) return showSteps('firefox');
    // Chrome/Edge yükleme izni birkaç saniye içinde gelir: kısa bekle, gelirse aynı dokunuşla aç
    if (waiting) return;
    waiting = true;
    const btn = $('.kr-btn'), label = btn.textContent;
    btn.textContent = 'Hazırlanıyor…';
    const until = Date.now() + 3500;
    while (!deferred && Date.now() < until) await new Promise((r) => setTimeout(r, 150));
    btn.textContent = label; waiting = false;
    if (deferred) return install();
    showSteps(isAndroid ? 'android' : 'desktop');
  }
  function build() {
    root = document.createElement('section');
    root.id = 'kurulum';
    root.className = 'kurulum';
    root.setAttribute('aria-label', "Luna'yı yükle");
    root.innerHTML = `<div class="kr-stars" aria-hidden="true"></div>
      <div class="kr-window">
        <img src="icons/icon-512.png" alt="Luna" class="kr-icon" width="512" height="512">
        <h1 class="kr-title">Luna</h1>
        <p class="kr-sub">Senin için hazırlandı 💜</p>
      </div>
      <button class="kr-btn" type="button">Luna'yı yükle</button>
      <div class="kr-steps" id="kr-steps" role="status" aria-live="polite" hidden></div>
      <div class="kr-arrow" aria-hidden="true" hidden>⬇︎</div>`;
    document.body.prepend(root);
    $('.kr-btn').addEventListener('click', install);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
  return { active: true, install };
})();
window.LunaKurulum = LunaKurulum;
