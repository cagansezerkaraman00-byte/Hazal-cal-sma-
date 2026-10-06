/* Güncellemeler ve kurulum (App Store / Play Store gibi).
   - Uygulama açıkken arada bir sunucudaki sürüm listesine (js/surum.js) bakar. Yeni sürüm varsa üstte bir kart,
     Ayarlar sekmesinde nokta ve (bildirim izni varsa) bir bildirim çıkar. "Güncelle" yeni sürümü yükleyip yeniler.
   - Uygulama kapalıyken (Android'de ana ekrandaki uygulama) arka planda da bakılır; servis çalışanı bildirir.
   - Veriler localStorage ve IndexedDB'de durur; güncelleme onlara dokunmaz, sayaç kaldığı yerden devam eder.
   - Güncellemeden sonraki ilk açılışta "Yenilikler" penceresi açılır.
   - Tarayıcıdan açıldıysa "Ana ekrana ekle" rehberi (Android'de doğrudan yükleme düğmesi). */

const Guncelleme = (() => {
  let App = null;
  const $ = (s) => document.querySelector(s);
  const KEY = { seen: 'luna-surum-goruldu', notified: 'luna-surum-bildirildi', install: 'luna-kurulum-gizle' };
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* gizli mod */ } };
  const esc = (s) => U.esc(s);
  const current = () => SURUMLER[0];
  const fmtDate = (iso) => { const d = new Date(iso + 'T12:00:00'); return isNaN(d) ? iso : `${d.getDate()} ${U.MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
  // "2.10" "2.9"dan yenidir
  function newer(a, b) {
    const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
    for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0; }
    return false;
  }
  function parse(text) {
    const m = String(text).match(/\/\*SURUMLER\*\/([\s\S]*?)\/\*SURUMLER\*\//);
    if (!m) return null;
    try { const l = JSON.parse(m[1]); return Array.isArray(l) && l.length && l[0] && l[0].surum ? l : null; } catch (e) { return null; }
  }

  let reg = null, remote = null, swReady = false, checking = false, applying = false, bannerHidden = false, installEvt = null, lastCheck = 0;
  const latest = () => (remote && newer(remote[0].surum, current().surum) ? remote[0] : null);
  const fresh = () => (remote ? remote.filter((v) => newer(v.surum, current().surum)) : []);
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // ---------- Denetleme ----------
  async function check(manual) {
    if (checking) return;
    checking = true; lastCheck = Date.now(); renderCard();
    try {
      const r = await fetch('js/surum.js?guncel=' + Date.now(), { cache: 'no-store' });
      const list = r.ok ? parse(await r.text()) : null;
      if (!list) throw new Error('liste okunamadı');
      remote = list;
      if (latest()) announce();
      else if (manual) App.toast('✅', 'Luna güncel', `Sürüm ${current().surum} en yeni sürüm`);
      if (reg) reg.update().catch(() => {});
    } catch (e) {
      if (manual) App.toast('📡', 'Güncellemelere bakılamadı', 'İnternet bağlantını kontrol edip tekrar dene');
    }
    await checkDates();
    checking = false;
    renderCard();
  }
  // Sınav tarihleri (sinav-tarihleri.json): ÖSYM tarihi değişince geri sayım ve plan kendiliğinden ona uyar
  async function checkDates() {
    if (!window.YKS || !YKS.setOfficial) return;
    try {
      const r = await fetch('sinav-tarihleri.json?guncel=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      const ch = YKS.setOfficial(await r.json());
      if (!ch) return;
      App.refresh();
      App.toast('🗓️', ch.kesin ? 'YKS tarihi kesinleşti' : 'YKS tarihi güncellendi', `${fmtDate(ch.to)} · geri sayım ve plan buna göre ayarlandı`, 7000);
    } catch (e) { /* çevrimdışı: kayıtlı tarih geçerli */ }
  }
  // uygulama simgesindeki kırmızı rozet (iPhone'da "Rozetler"): güncelleme hazırsa 1
  function iconBadge(on) {
    try { if (on && navigator.setAppBadge) navigator.setAppBadge(1).catch(() => {}); else if (!on && navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {}); } catch (e) { /* desteklenmiyor */ }
  }
  function announce() {
    const v = latest();
    if (!v) return;
    renderBanner(); renderCard(); dot(true); iconBadge(true);
    if (get(KEY.notified) !== v.surum) { set(KEY.notified, v.surum); systemNote(v); }
  }
  async function systemNote(v) {
    if (!App.data().settings.notify || !('Notification' in window) || Notification.permission !== 'granted' || !reg) return;
    try { await reg.showNotification('Luna güncellemesi hazır ✨', { body: `Sürüm ${v.surum}: ${v.baslik}. Dokun, güncelleyelim.`, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'luna-guncelleme' }); } catch (e) { /* desteklenmiyor */ }
  }
  function dot(on) { const b = $('#tabs button[data-tab="settings"]'); if (b) b.classList.toggle('has-dot', on); }

  // ---------- Güncelleme ----------
  function reload() {
    applying = true;
    App.allowExit('guncelleme'); // yenileme anı "uygulamadan çıkış" sayılmasın
    location.reload();
  }
  async function apply() {
    if (applying) return;
    applying = true; renderBanner(); renderCard();
    App.toast('🔄', 'Güncelleniyor…', 'Birkaç saniye sürer; verilerin olduğu gibi kalır', 6000);
    if (swReady || !reg) { reload(); return; }
    const changed = new Promise((res) => {
      navigator.serviceWorker.addEventListener('controllerchange', () => res(true), { once: true });
      setTimeout(() => res(false), 20000);
    });
    try { await reg.update(); } catch (e) { /* ağ yok */ }
    if ((await changed) || swReady) { reload(); return; }
    applying = false; renderBanner(); renderCard();
    App.toast('⏳', 'Yeni sürüm henüz yolda', 'Birkaç dakika sonra tekrar dene; hazır olunca kendiliğinden de yüklenir', 7000);
  }

  // ---------- Yenilikler ----------
  function notesHtml(list) {
    return list.map((v) => `<div class="wn-ver"><h4>Sürüm ${esc(v.surum)} · ${esc(v.baslik)} <small>${esc(fmtDate(v.tarih))}</small></h4><ul>${v.notlar.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>`).join('');
  }
  function whatsNew() {
    const seen = get(KEY.seen), cur = current().surum;
    set(KEY.seen, cur);
    let list = [];
    if (seen && newer(cur, seen)) list = SURUMLER.filter((v) => newer(v.surum, seen));
    else if (!seen && App.data().sessions.length) list = [current()]; // bu sürümden önce kurulmuş uygulama
    if (!list.length) return;
    let tries = 0;
    const show = () => {
      if (!$('#modal').classList.contains('hidden')) { if (++tries < 8) setTimeout(show, 2500); return; }
      App.openModal(`<div class="wn-head"><img src="icons/icon-192.png" alt="" class="wn-icon"><div><h3>Luna güncellendi ✨</h3><p class="muted small">Sürüm ${esc(cur)} · ${esc(fmtDate(current().tarih))}</p></div></div>
        <div class="wn-list">${notesHtml(list)}</div>
        <div class="modal-actions"><button class="btn primary" type="button" data-act="ok">Harika 💛</button></div>`, (card) => {
        card.querySelector('[data-act="ok"]').addEventListener('click', () => App.closeModal());
      });
    };
    setTimeout(show, 1600);
  }

  // ---------- Kurulum (ana ekrana ekle) ----------
  function installHidden() {
    const h = get(KEY.install);
    return h === 'kuruldu' || (h && Date.now() - +h < 3 * 864e5);
  }
  const canOfferInstall = () => !standalone() && (installEvt || isIOS());
  async function install() {
    if (installEvt) {
      const e = installEvt;
      installEvt = null;
      try { e.prompt(); const c = await e.userChoice; if (c && c.outcome === 'accepted') set(KEY.install, 'kuruldu'); } catch (err) { /* iptal */ }
      renderBanner(); renderCard();
      return;
    }
    const ipad = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    App.openModal(`<h3>📲 Luna'yı ana ekrana ekle</h3>
      <ol class="install-steps">
        <li>${isIOS() ? `Safari'de <b>Paylaş</b> düğmesine dokun <span class="muted">(${ipad ? 'sağ üstte' : 'altta'}, içinden ok çıkan kare)</span>.` : 'Tarayıcının menüsünü aç (⋮ ya da Paylaş).'}</li>
        <li><b>${isIOS() ? 'Ana Ekrana Ekle' : 'Ana ekrana ekle / Uygulamayı yükle'}</b>'yi seç.</li>
        <li><b>Ekle</b>'ye dokun. Luna artık ana ekranında; bundan sonra oradan aç.</li>
      </ol>
      <p class="hint">Ana ekrandaki Luna tam ekran açılır, internetsiz çalışır, güncellemeleri kendisi alır ve verilerini kendi içinde saklar. Bu sayfada daha önce çalıştıysan önce Ayarlar → Veriler → <b>Yedek al</b>, sonra ana ekrandaki Luna'da <b>Yedeği yükle</b>.</p>
      <div class="modal-actions"><button class="btn primary" type="button" data-act="ok">Tamam</button></div>`, (card) => {
      card.querySelector('[data-act="ok"]').addEventListener('click', () => App.closeModal());
    });
  }

  // tarayıcıdan açılınca tam ekran "Luna'yı yükle" (bir kez kurunca bir daha çıkmaz)
  const inApp = () => /FBAN|FBAV|Instagram|Line\/|Twitter|TikTok|Snapchat|WhatsApp|GSA\//i.test(navigator.userAgent);
  const isSafari = () => isIOS() && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent) && !inApp();
  function installScreen(force) {
    if (standalone() || (!force && (installHidden() || !matchMedia('(pointer: coarse)').matches))) return;
    if ($('#install-screen')) return;
    const ipad = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    let steps;
    if (inApp()) {
      steps = `<li>Bu sayfa bir uygulamanın içinde açıldı. Sağ üstteki <b>•••</b> menüsünden <b>${isIOS() ? "Safari'de aç" : 'Tarayıcıda aç'}</b>'a dokun.</li><li>Açılan sayfada bu adımlar yeniden görünecek.</li>`;
    } else if (isIOS()) {
      steps = `<li><b>Paylaş</b> düğmesine dokun <svg class="share-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4M6 11H5v10h14V11h-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> <small>(${ipad ? 'sağ üstte' : 'altta'}; görmüyorsan önce <b>•••</b> düğmesine dokun)</small></li>
        <li>Listede <b>Ana Ekrana Ekle</b>'yi bul <small>(gerekirse aşağı kaydır)</small></li>
        <li><b>Ekle</b>'ye dokun. Luna artık ana ekranında; bundan sonra oradan aç.</li>`;
    } else if (installEvt) {
      steps = '<li>Aşağıdaki <b>Luna\'yı yükle</b> düğmesine dokun, sonra <b>Yükle</b>.</li><li>Luna ana ekranına ve uygulamalarının arasına gelir; oradan aç.</li>';
    } else {
      steps = '<li>Tarayıcının menüsünü aç (sağ üstte <b>⋮</b>).</li><li><b>Uygulamayı yükle</b> ya da <b>Ana ekrana ekle</b>\'ye dokun.</li><li>Luna ana ekranına gelir; bundan sonra oradan aç.</li>';
    }
    const el = document.createElement('div');
    el.id = 'install-screen';
    el.className = 'install-screen';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', "Luna'yı yükle");
    el.innerHTML = `<div class="is-card">
        <img src="icons/icon-512.png" alt="Luna" class="is-icon">
        <h2>Luna</h2>
        <p class="muted">Ders çalışma arkadaşın 🐾 Ana ekranına ekle; tek dokunuşla açılır, internetsiz de çalışır, güncellemeleri kendisi alır.</p>
        <ol class="install-steps">${steps}</ol>
        ${installEvt ? '<button class="btn primary big" type="button" data-is="install">📲 Luna\'yı yükle</button>' : ''}
        <button class="btn soft" type="button" data-is="later">Şimdilik tarayıcıda devam et</button>
      </div>
      ${isSafari() && !ipad ? '<div class="is-arrow" aria-hidden="true">⬇︎</div>' : ''}`;
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-is]');
      if (!b) return;
      if (b.dataset.is === 'install') { await install(); if (get(KEY.install) === 'kuruldu') el.remove(); }
      else { set(KEY.install, String(Date.now())); el.remove(); renderBanner(); }
    });
    document.body.appendChild(el);
  }
  // ana ekrandaki Luna'nın ilk açılışında: güncellemeler ve sayaç için bildirim izni (iOS dokunuşla ister)
  function askNotify() {
    if (!standalone() || !('Notification' in window) || Notification.permission !== 'default' || get('luna-bildirim-soruldu')) return;
    let tries = 0;
    const show = () => {
      if (!$('#modal').classList.contains('hidden')) { if (++tries < 10) setTimeout(show, 3000); return; }
      set('luna-bildirim-soruldu', '1');
      App.openModal(`<div class="wn-head"><img src="icons/icon-192.png" alt="" class="wn-icon"><div><h3>🔔 Haber vereyim mi?</h3><p class="muted small">Yeni sürüm çıkınca ve sayaç bitince bildirim gönderirim.</p></div></div>
        <div class="modal-actions"><button class="btn soft" type="button" data-act="no">Şimdi değil</button><button class="btn primary" type="button" data-act="yes">İzin ver</button></div>`, (card) => {
        card.addEventListener('click', async (e) => {
          const b = e.target.closest('[data-act]');
          if (!b) return;
          App.closeModal();
          if (b.dataset.act !== 'yes') return;
          try {
            const p = await Notification.requestPermission();
            if (p === 'granted') { App.data().settings.notify = true; App.save(); App.toast('🔔', 'Bildirimler açık', 'Yeni sürüm çıkınca haber vereceğim'); }
          } catch (err) { /* desteklenmiyor */ }
        });
      });
    };
    setTimeout(show, 5000);
  }

  // ---------- Görünüm ----------
  function renderBanner() {
    const el = $('#update-banner');
    if (!el) return;
    const v = latest();
    let html = '';
    if (v && !bannerHidden) {
      html = `<img src="icons/icon-192.png" alt="" class="ub-icon"><div class="ub-text"><b>Güncelleme hazır</b><small>Sürüm ${esc(v.surum)} · ${esc(v.baslik)}</small></div>
        <button class="btn primary small-btn" type="button" data-up="apply" ${applying ? 'disabled' : ''}>${applying ? 'Yükleniyor…' : 'Güncelle'}</button>
        <button class="icon-btn" type="button" data-up="later" aria-label="Sonra">✕</button>`;
    } else if (!v && canOfferInstall() && !installHidden() && matchMedia('(pointer: coarse)').matches) {
      html = `<img src="icons/icon-192.png" alt="" class="ub-icon"><div class="ub-text"><b>Luna'yı ana ekranına ekle</b><small>Tek dokunuşla açılır, internetsiz de çalışır</small></div>
        <button class="btn primary small-btn" type="button" data-up="install">${installEvt ? 'Yükle' : 'Nasıl?'}</button>
        <button class="icon-btn" type="button" data-up="install-later" aria-label="Sonra">✕</button>`;
    }
    el.innerHTML = html;
    el.classList.toggle('hidden', !html);
  }
  function renderCard() {
    const el = $('#update-card');
    if (!el) return;
    const v = latest(), cur = current();
    el.innerHTML = `<h2>🔄 Güncellemeler</h2>
      <div class="upd-row"><img src="icons/icon-192.png" alt="" class="ub-icon"><div class="ub-text"><b>Luna</b><small>Sürüm ${esc(cur.surum)} · ${esc(fmtDate(cur.tarih))}</small></div>
        <span class="upd-state ${v ? 'new' : ''}">${checking ? 'Bakılıyor…' : v ? 'Yeni sürüm hazır' : 'Güncel ✓'}</span></div>
      ${v ? `<div class="upd-new"><div class="wn-list">${notesHtml(fresh())}</div><button class="btn primary" type="button" data-up="apply" ${applying ? 'disabled' : ''}>${applying ? 'Yükleniyor…' : `Sürüm ${esc(v.surum)}'e güncelle`}</button></div>` : ''}
      <div class="row upd-acts"><button class="btn soft" type="button" data-up="check" ${checking ? 'disabled' : ''}>Güncellemeleri denetle</button>${canOfferInstall() ? `<button class="btn soft" type="button" data-up="install">📲 Ana ekrana ekle</button>` : ''}</div>
      <p class="muted small">Güncellemeler verilerine ve ayarlarına dokunmaz; sayaç da kaldığı yerden devam eder. Yeni sürüm çıkınca bildirim gelmesi için Odak bölümünden <b>Bildirim gönder</b>'i aç.</p>
      <details class="upd-history"><summary>📜 Tüm sürümler ve yenilikler</summary><div class="wn-list">${notesHtml(SURUMLER)}</div></details>`;
  }
  function onClick(e) {
    const b = e.target.closest('[data-up]');
    if (!b) return;
    const a = b.dataset.up;
    if (a === 'apply') apply();
    else if (a === 'check') check(true);
    else if (a === 'install') { if (installEvt) install(); else installScreen(true); }
    else if (a === 'later') { bannerHidden = true; renderBanner(); }
    else if (a === 'install-later') { set(KEY.install, String(Date.now())); renderBanner(); }
  }

  // ---------- Çevrimdışı PDF ----------
  // ana ekrandaki uygulamada, internet varken PDF görüntüleyiciyi bir kez önceden indir (Kütüphane'deki PDF'ler internetsiz de açılsın)
  async function prefetchPdf() {
    try {
      if (!standalone() || !navigator.onLine || !window.caches || (navigator.connection && navigator.connection.saveData)) return;
      const box = await caches.open('luna-vendor-1');
      for (const f of ['vendor/pdfjs/pdf.min.mjs', 'vendor/pdfjs/pdf.worker.min.mjs']) {
        const u = new URL(f, location.href);
        if (!(await box.match(u.origin + u.pathname))) await fetch(f); // servis çalışanı satıcı önbelleğine yazar
      }
    } catch (e) { /* sonra yeniden denenir */ }
  }

  // ---------- Servis çalışanı ----------
  function setupSW() {
    let hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((r) => {
      reg = r;
      // Android'de ana ekrandaki uygulama kapalıyken de yeni sürüme bakılsın (izin verilirse)
      if ('periodicSync' in r && navigator.permissions) {
        navigator.permissions.query({ name: 'periodic-background-sync' }).then((p) => {
          if (p.state === 'granted') r.periodicSync.register('luna-guncelleme', { minInterval: 12 * 3600e3 }).catch(() => {});
        }).catch(() => {});
      }
    }).catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) { hadController = true; return; } // ilk kurulum: yenilemeye gerek yok; sonrakiler güncelleme
      swReady = true;
      if (applying) { reload(); return; }
      if (!latest()) check(false); // notlar için sürüm listesini al
      else announce();
      if (document.hidden) tryAutoReload();
    });
    // bildirime dokunulunca açık uygulama güncelleme kartını göstersin
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'guncelleme') { App.showTab('settings'); if (latest()) apply(); else check(true); }
    });
  }
  // kullanıcı bir şeyle meşgul değilken (uygulamadan çıkınca) yeni sürüm sessizce yüklenir;
  // bir sonraki açılışta "Yenilikler" penceresi neyin değiştiğini söyler
  function tryAutoReload() {
    if (!swReady || applying || App.isBusy()) return;
    applying = true;
    location.reload();
  }

  return {
    init(app) {
      App = app;
      document.addEventListener('click', (e) => { if (e.target.closest('#update-banner, #update-card')) onClick(e); });
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault(); installEvt = e; renderBanner(); renderCard();
        const sc = $('#install-screen'); if (sc) { sc.remove(); installScreen(true); } // Android: yükle düğmesi gelsin
      });
      window.addEventListener('appinstalled', () => {
        installEvt = null; set(KEY.install, 'kuruldu'); renderBanner(); renderCard();
        const sc = $('#install-screen'); if (sc) sc.remove();
        App.toast('📲', 'Luna ana ekranına eklendi', 'Bundan sonra oradan aç; verilerin orada saklanır', 7000);
      });
      renderCard();
      renderBanner();
      whatsNew();
      iconBadge(false); // açık sürüm en yenisi (yeni sürüm bulunursa yeniden yanar)
      setTimeout(() => installScreen(false), 1200);
      askNotify();
      if (/#guncelleme$/.test(location.hash)) { App.showTab('settings'); history.replaceState(null, '', location.pathname + location.search); }
      if (!('serviceWorker' in navigator) || !location.protocol.startsWith('http')) return;
      setupSW();
      setTimeout(() => check(false), 4000);
      setTimeout(prefetchPdf, 30000);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) tryAutoReload();
        else if (Date.now() - lastCheck > 2 * 60000) check(false);
      });
      setInterval(() => { if (!document.hidden) check(false); }, 10 * 60000); // açıkken 10 dakikada bir
    },
    check,
    apply,
    install,
    current,
    newer,
    parse,
  };
})();

if (typeof window !== 'undefined') { window.Guncelleme = Guncelleme; }
