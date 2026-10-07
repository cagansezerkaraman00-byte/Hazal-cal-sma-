/* Kurulum kapısı: bağlantı tarayıcıda açılınca uygulamanın içi gösterilmez (sürpriz bozulmasın). Lila bir sayfada
   yalnızca Luna ve "Luna'yı yükle" düğmesi görünür. Android ve bilgisayarda (Chrome/Edge) düğme sistemin yükleme
   penceresini açar; iPhone/iPad, Samsung Internet, Firefox ve Mac Safari'de adımları gösterir (bu tarayıcılar
   sitenin kendini yüklemesine izin vermiyor). Ana ekrandan/masaüstünden açılan Luna doğrudan uygulamadır.
   Geliştirirken uygulamayı tarayıcıda açmak için adresin sonuna ?app eklenir. */
const LunaKurulum = (() => {
  const params = new URLSearchParams(location.search);
  const ua = navigator.userAgent || '';
  const media = (q) => { try { return matchMedia(q).matches; } catch (e) { return false; } };
  const standalone = navigator.standalone === true || ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'].some((m) => media(`(display-mode: ${m})`));
  const oauthReturn = /[?&#](code|state|access_token|error)=/.test(location.search + location.hash); // Google/Spotify girişi dönüşü
  const active = !standalone && (params.has('kurulum') || (!oauthReturn && !params.has('app')));
  if (!active) return { active: false };

  document.documentElement.classList.add('kurulum');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', '#b896ea');

  const isIOS = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isIPad = isIOS && !/iPhone|iPod/.test(ua);
  const inApp = /FBAN|FBAV|Instagram|Line\/|Twitter|TikTok|Snapchat|WhatsApp|GSA\/|; wv\)/i.test(ua); // ; wv) = Android uygulama içi WebView
  const iosOther = isIOS && /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  // Büyük Android tabletler varsayılan olarak masaüstü sitesini ister: tarayıcı kendini "X11; Linux" diye tanıtır
  const isAndroid = /Android/i.test(ua) || (!isIOS && /\bLinux\b/.test(ua) && !/CrOS/.test(ua) && navigator.maxTouchPoints > 0 && media('(any-pointer: coarse)'));
  const isSamsung = /SamsungBrowser\//.test(ua);
  const isFirefox = /Firefox\//.test(ua) && !isIOS;
  const isEdgeAndroid = isAndroid && /EdgA\//.test(ua);
  const isMacSafari = !isIOS && /Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|Edg\//.test(ua);
  const canPrompt = !isIOS && !inApp && !isFirefox && !isMacSafari; // Chrome, Edge, Samsung: sistem yükleme penceresi gelebilir
  const fromHome = params.get('source') === 'homescreen'; // ana ekran simgesi web uygulaması değil yer imi olarak eklenmiş

  let deferred = null, root = null, completed = false, waiter = null, busy = false;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferred = e;
    if (waiter) return waiter(); // dokunuş bekliyor: aynı dokunuşla pencere açılır
    const box = root && $('#kr-steps');
    if (box && !box.hidden && !completed) { // adımlar gösterilirken izin geldi: tek dokunuş yeter
      box.innerHTML = '<p class="kr-done">Luna yüklemeye hazır 💜</p><p class="kr-note"><b>Luna\'yı yükle</b>\'ye bir kez daha dokun.</p>';
      $('.kr-arrow').hidden = true;
    }
  });
  window.addEventListener('appinstalled', () => { deferred = null; done(); });
  // Servis çalışanı sayfa yüklendikten sonra kaydolur (önce gelirse Android'in yükleme izni gecikir).
  // Yeni bir sürüm yayınlanınca eski kopyadaki adımlar kalmasın: yeni çalışan devralınca sayfa bir kez yenilenir.
  if ('serviceWorker' in navigator) {
    const hadWorker = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadWorker || completed) return;
      try { if (sessionStorage.getItem('luna-kurulum-yenilendi')) return; sessionStorage.setItem('luna-kurulum-yenilendi', '1'); } catch (e) { return; }
      location.reload();
    });
    const register = () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((r) => r.update()).catch(() => {});
    if (document.readyState === 'complete') register(); else window.addEventListener('load', register, { once: true });
  }

  const share = '<svg class="kr-share" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4M6 11H5v10h14V11h-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const shareWhere = isIPad ? 'sağ üstte, adres çubuğunun hemen sağında; pencere darsa <b>•••</b> içinde' : 'altta ya da adres çubuğunun yanında; görmüyorsan önce <b>•••</b>';
  const STEPS = {
    ios: `${fromHome ? `<p class="kr-note kr-warn"><b>Luna Safari'de açıldı.</b> Ana ekrandaki Luna simgesine basılı tut ve sil; sonra aşağıdaki adımlarla yeniden ekle, <b>Web Uygulaması Olarak Aç</b> açık kalsın.</p>` : ''}
      <p class="kr-note">${isIPad ? 'iPad' : 'iPhone'}'de indirme çubuğu bekleme; kurulumu Safari menüsünden tamamla:</p>
      <ol><li><b>Paylaş</b> ${share} düğmesine dokun <small>(${shareWhere})</small></li>
      <li><b>Ana Ekrana Ekle</b>'ye dokun <small>(ilk listede yoksa <b>Daha Fazla</b>'ya dokun ya da listeyi aşağı kaydır)</small></li>
      <li><b>Web Uygulaması Olarak Aç</b> açık olsun <small>(bu seçenek varsa; kapalı kalırsa Luna Safari'de açılır)</small>, sonra <b>Ekle</b>'ye dokun</li>
      <li>Ana ekrandaki <b>Luna</b>'ya dokun 💜</li></ol>
      <p class="kr-note">Başka bir uygulamanın içindeysen bağlantıyı kopyalayıp <b>Safari</b>'de aç.</p>`,
    iosOther: `<ol><li>Adres çubuğundaki <b>Paylaş</b> ${share} düğmesine dokun <small>(görmüyorsan <b>•••</b> menüsünde)</small></li><li><b>Ana Ekrana Ekle</b>'ye dokun <small>(gerekirse <b>Daha Fazla</b>)</small></li><li><b>Ekle</b> → ana ekrandaki <b>Luna</b>'ya dokun 💜</li></ol><p class="kr-note">Göremezsen bağlantıyı <b>Safari</b>'de aç.</p>`,
    inApp: `<ol><li>Bu sayfa başka bir uygulamanın içinde açıldı</li><li>Menüden <b>${isIOS ? "Safari'de aç" : 'Tarayıcıda aç'}</b>'a dokun <small>(sağ üstte <b>•••</b> ya da <b>⋮</b>; yoksa bağlantıyı kopyala)</small></li><li>${isIOS ? "Açılan Safari sayfasındaki adımları izle" : "Açılan sayfada <b>Luna'yı yükle</b>'ye yeniden dokun"}</li></ol>`,
    mac: '<ol><li>Üstteki menü çubuğunda <b>Dosya</b>\'ya tıkla</li><li><b>Dock\'a Ekle</b> → <b>Ekle</b></li><li>Luna Dock\'tan açılır 💜</li></ol>',
    android: '<ol><li>Sağ üstteki <b>⋮</b> menüsüne dokun</li><li><b>Ana ekrana ekle</b> ya da <b>Uygulamayı yükle</b>\'ye dokun</li><li><b>Yükle</b>\'yi seç <small>(<b>Kısayol oluştur</b>\'u değil)</small> → ana ekrandaki <b>Luna</b>\'ya dokun 💜</li></ol><p class="kr-note">Menüde bu seçenek yoksa önce <b>Chrome\'da aç</b>\'a dokun. Luna zaten yüklüyse ana ekrandan aç.</p>',
    samsung: '<ol><li>Adres çubuğunda yükleme (⤓) simgesi varsa ona dokun; yoksa <b>≡</b> menüsünü aç <small>(telefonda sağ altta, tablette sağ üstte)</small></li><li><b>Sayfa ekle</b> → <b>Ana ekran</b>\'a dokun</li><li><b>Ekle</b> → ana ekrandaki <b>Luna</b>\'ya dokun 💜</li></ol><p class="kr-note">Bulamazsan bağlantıyı kopyalayıp <b>Chrome</b>\'da aç.</p>',
    edge: '<ol><li><b>•••</b> menüsüne dokun <small>(altta ya da sağ üstte)</small></li><li><b>Telefona ekle</b> ya da <b>Ana ekrana ekle</b>\'ye dokun</li><li><b>Yükle</b> → ana ekrandaki <b>Luna</b>\'ya dokun 💜</li></ol>',
    firefoxAndroid: '<ol><li><b>⋮</b> menüsüne dokun</li><li><b>Yükle</b> ya da <b>Ana ekrana ekle</b>\'ye dokun</li><li><b>Ekle</b> → ana ekrandaki <b>Luna</b>\'ya dokun 💜</li></ol><p class="kr-note">Olmazsa bağlantıyı kopyalayıp <b>Chrome</b>\'da aç.</p>',
    desktop: '<ol><li>Adres çubuğunun sağındaki <b>yükle</b> simgesine (⊕) ya da <b>⋮</b> menüsüne tıkla</li><li><b>Luna\'yı yükle</b> → <b>Yükle</b></li></ol><p class="kr-note">Luna zaten yüklüyse adres çubuğundaki "uygulamada aç" simgesine tıkla.</p>',
    firefox: '<ol><li>Firefox uygulama yükleyemiyor</li><li>Bağlantıyı <b>Chrome</b>, <b>Edge</b> ya da <b>Safari</b>\'de aç</li></ol>',
  };
  const COPY = ['ios', 'iosOther', 'inApp', 'samsung', 'firefoxAndroid', 'firefox'];
  function stepsKind() {
    if (inApp) return 'inApp';
    if (isIOS) return iosOther ? 'iosOther' : 'ios';
    if (isMacSafari) return 'mac';
    if (isFirefox) return isAndroid ? 'firefoxAndroid' : 'firefox';
    if (isSamsung) return 'samsung';
    if (isEdgeAndroid) return 'edge';
    return isAndroid ? 'android' : 'desktop';
  }

  const $ = (s) => root && root.querySelector(s);
  function showSteps(kind, scroll = true) {
    const box = $('#kr-steps');
    box.innerHTML = STEPS[kind] + (COPY.includes(kind) ? '<button class="kr-copy" type="button" id="kr-copy">🔗 Bağlantıyı kopyala</button>' : '');
    box.hidden = false;
    const arrow = $('.kr-arrow');
    arrow.hidden = !(kind === 'ios' && !isIPad); // iPad'de Paylaş'ın yeri pencereye göre değişir; ok yanlış yeri gösterebilir
    root.classList.toggle('with-arrow', !arrow.hidden); // ok son adımın üstüne binmesin
    if (scroll) try { box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* eski tarayıcı */ }
    const copy = $('#kr-copy');
    if (copy) copy.addEventListener('click', async () => {
      const url = location.origin + location.pathname;
      try { await navigator.clipboard.writeText(url); copy.textContent = '✅ Kopyalandı'; } catch (e) { prompt('Bağlantı:', url); }
    });
  }
  function done() {
    completed = true;
    if (!root) return;
    $('.kr-btn').hidden = true;
    $('.kr-arrow').hidden = true;
    root.classList.remove('with-arrow');
    const box = $('#kr-steps');
    box.innerHTML = `<p class="kr-done">✓ Kurulum isteğin alındı</p><p class="kr-note">Kurulum tamamlanınca ${isAndroid || isIOS ? 'ana ekranındaki' : 'uygulamalarındaki'} <b>Luna</b> simgesine dokun. Bu sayfa uygulamaya yönlendirilmez.</p>`;
    box.hidden = false;
  }
  async function install() {
    if (busy) return;
    if (!canPrompt) {
      showSteps(stepsKind());
      const box = $('#kr-steps'); // adımlar zaten açıksa dokunuşun bir karşılığı olsun
      if (box.classList) { box.classList.remove('kr-flash'); void box.offsetWidth; box.classList.add('kr-flash'); }
      return;
    }
    if (!deferred) {
      // Chrome yükleme iznini sayfa yüklendikten birkaç saniye sonra verir. Dokunuş 5 sn geçerli: kısa bekle,
      // izin gelirse pencere aynı dokunuşla açılır; gelmezse adımlar gösterilir.
      busy = true;
      const btn = $('.kr-btn'), label = btn.textContent;
      btn.textContent = 'Hazırlanıyor…'; btn.disabled = true;
      await new Promise((ok) => { waiter = ok; setTimeout(ok, 3500); });
      waiter = null; btn.textContent = label; btn.disabled = false; busy = false;
    }
    if (!deferred) return showSteps(stepsKind());
    const e = deferred; deferred = null;
    try {
      await e.prompt();
      const choice = await e.userChoice;
      if (choice && choice.outcome === 'accepted') done(); else showSteps(stepsKind());
    } catch (err) { showSteps(stepsKind()); }
  }
  function build() {
    if (root || !document.body) return;
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
    if (completed) done();
    else if (isIOS) { // iPhone/iPad: yükleme yalnızca Safari menüsünden, adımlar hemen görünsün
      $('.kr-btn').textContent = 'Ana ekrana ekleme adımları';
      showSteps(stepsKind(), false);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
  return { active: true, install, mount: build };
})();
window.LunaKurulum = LunaKurulum;
