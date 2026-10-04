/* Depo ekranı (Kitaplık → Depo) ve tam ekran görüntüleyici (fotoğraf, PDF). */

const DepoUI = (() => {
  let App = null;
  let filterSubject = '', filterKind = '', search = '';
  let progress = null; // {i, n, p, label}
  const $ = (s, el = document) => el.querySelector(s);
  const D = () => Store.data;
  const K = () => Depo.KINDS;
  const ACCEPT = 'image/*,application/pdf,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.odp,.ods,.txt,.rtf,.key,.pages,.numbers';

  const icon = (it) => (Depo.isPdf(it.mime) ? '📕' : Depo.isImg(it.mime) ? '🖼️' : /word|document|text|rtf|pages/.test(it.mime) ? '📄' : /sheet|excel|numbers/.test(it.mime) ? '📊' : /presentation|powerpoint|keynote/.test(it.mime) ? '📽️' : (K()[it.kind] || K().diger)[0]);
  const subjName = (id) => (id ? Store.subject(id).name : 'Genel');
  const dateTxt = (t) => new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: new Date(t).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });

  function statusHtml() {
    const c = Depo.cfg(), st = Depo.status();
    const localTxt = st.local ? `${st.local} dosya bu cihazda (${Depo.fmtSize(st.localBytes)})` : '';
    if (!c.clientId || !c.connected) {
      return `<div class="depo-status local">
          <div><b>📱 Dosyaların şimdilik bu cihazda saklanıyor.</b> <span class="muted small">${localTxt || 'Henüz dosya yok.'}</span>
          <p class="muted small">Google Drive'ı bağlarsan dosyalar senin Drive'ındaki <b>Luna Depo</b> klasöründe durur: iPad'inde yer kaplamaz, telefonda da açılır.</p></div>
          <details class="drive-setup" ${c.clientId ? 'open' : ''}><summary>☁️ Google Drive'ı bağla</summary>
            <p class="hint">Bir kez yapılır (adımlar Ayarlar → Kılavuz → <b>Depo ve Google Drive</b>). Google Cloud'da "Authorized redirect URI" olarak şunu ekle:</p>
            <code class="sp-uri">${U.esc(Depo.redirectUri())}</code>
            <div class="inline-form"><input data-dp="client" placeholder="Client ID (…apps.googleusercontent.com)" value="${U.esc(c.clientId)}" autocomplete="off" spellcheck="false"><button class="btn primary" data-dp="connect" type="button">Bağlan</button></div>
            ${c.lastErr ? `<p class="hint" style="color:var(--red)">Son deneme: ${U.esc(c.lastErr === 'access_denied' ? 'izin verilmedi' : c.lastErr)}</p>` : ''}
          </details>
        </div>`;
    }
    const renew = !Depo.hasToken();
    return `<div class="depo-status drive">
        <div><b>☁️ Google Drive bağlı</b> <span class="muted small">· Luna Depo klasörü${localTxt ? ' · ' + localTxt : ''}</span></div>
        <div class="row">
          ${renew ? '<button class="btn primary" data-dp="connect" type="button">🔄 Drive bağlantısını yenile</button>' : '<button class="btn soft" data-dp="sync" type="button">↻ Eşitle</button>'}
          ${st.local && !renew ? `<button class="btn soft" data-dp="move" type="button">☁️ Bu cihazdakileri Drive'a taşı (${st.local})</button>` : ''}
          <button class="btn soft" data-dp="disconnect" type="button">Bağlantıyı kes</button>
        </div>
        ${renew ? '<p class="hint">Güvenlik için Google bağlantıyı saatte bir yeniler; bir dokunuş yeter. Dosya eklemeye devam edebilirsin, şimdilik bu cihaza kaydedilir.</p>' : ''}
      </div>`;
  }

  function list() {
    const q = search.toLocaleLowerCase('tr-TR');
    return D().files
      .filter((x) => !filterSubject || x.subjectId === filterSubject)
      .filter((x) => !filterKind || x.kind === filterKind)
      .filter((x) => !q || (x.name + ' ' + (x.note || '') + ' ' + subjName(x.subjectId)).toLocaleLowerCase('tr-TR').includes(q))
      .sort((a, b) => b.created - a.created);
  }

  function render() {
    const root = $('#depo-root');
    if (!root) return;
    const used = new Set(D().files.map((x) => x.subjectId));
    const kinds = new Set(D().files.map((x) => x.kind));
    const subjChips = D().subjects.filter((s) => used.has(s.id));
    const items = list();
    root.innerHTML = `
      <div class="card depo-head">${statusHtml()}
        ${progress ? `<div class="depo-progress"><span>${U.esc(progress.label)} ${progress.n > 1 ? `${progress.i + 1}/${progress.n}` : ''} · %${Math.round(progress.p * 100)}</span><i style="width:${Math.round(((progress.i + progress.p) / progress.n) * 100)}%"></i></div>` : ''}
      </div>
      <div class="notes-bar depo-bar">
        <label class="btn primary">📷 Fotoğraf çek<input type="file" accept="image/*" capture="environment" hidden data-dp="cam"></label>
        <label class="btn soft">📎 Dosya ekle<input type="file" multiple accept="${ACCEPT}" hidden data-dp="pick"></label>
        <input type="search" data-dp="search" placeholder="Depoda ara…" value="${U.esc(search)}">
      </div>
      ${subjChips.length ? `<div class="chips">${[['', 'Tüm dersler']].concat(subjChips.map((s) => [s.id, s.name])).map(([id, n]) => `<button class="chip ${filterSubject === id ? 'active' : ''}" data-dp-subj="${id}" type="button">${U.esc(n)}</button>`).join('')}</div>` : ''}
      ${kinds.size > 1 ? `<div class="chips">${[['', '🗂️ Hepsi']].concat(Object.keys(K()).filter((k) => kinds.has(k)).map((k) => [k, K()[k][0] + ' ' + K()[k][1]])).map(([id, n]) => `<button class="chip ${filterKind === id ? 'active' : ''}" data-dp-kind="${id}" type="button">${U.esc(n)}</button>`).join('')}</div>` : ''}
      ${items.length ? `<div class="depo-grid">${items.map((it) => `<button class="depo-tile" data-dp-open="${it.id}" type="button" style="--c:${Store.subject(it.subjectId).color}">
          <span class="dt-thumb" data-thumb="${it.id}"><span class="dt-icon">${icon(it)}</span></span>
          <span class="dt-name">${U.esc(it.name)}</span>
          <span class="dt-meta"><span class="tag">${U.esc(subjName(it.subjectId))}</span> ${it.src === 'drive' ? '☁️' : '📱'} ${dateTxt(it.created)}</span>
        </button>`).join('')}</div>`
        : `<div class="card empty-state"><div style="font-size:2rem">🗂️</div><p><b>${D().files.length ? 'Aramana uyan dosya yok.' : 'Depon boş.'}</b></p><p class="muted">Ders fotoğrafları, PDF'ler, çalışma kağıtları ve ödevler ders ders burada. Galeride aramana gerek kalmaz; PDF'ler uygulamanın içinde açılır.</p></div>`}`;
    // önizlemeler (IndexedDB'den, ekrana çizildikten sonra)
    for (const it of items.slice(0, 120)) {
      Depo.thumbUrl(it).then((u) => {
        const el = root.querySelector(`[data-thumb="${it.id}"]`);
        if (u && el && !el.querySelector('img')) el.innerHTML = `<img src="${u}" alt="" loading="lazy">`;
      });
    }
  }

  // ---------- Dosya ekleme ----------
  function askMeta(files) {
    const first = files[0];
    const kind = Depo.isImg(first.type) ? 'foto' : Depo.isPdf(first.type) ? 'not' : 'diger';
    const total = files.reduce((a, f) => a + f.size, 0);
    const subj = filterSubject || (D().subjects[0] && D().subjects[0].id) || '';
    const target = Depo.driveReady() && Depo.hasToken() ? '☁️ Google Drive’a kaydedilecek' : '📱 Bu cihaza kaydedilecek';
    let chosenKind = filterKind || kind;
    const card = App.openModal(`
      <h3>🗂️ Depoya ekle</h3>
      <p class="muted">${files.length === 1 ? `<b>${U.esc(first.name)}</b>` : `<b>${files.length}</b> dosya`} · ${Depo.fmtSize(total)} · ${target}${files.some((f) => Depo.isImg(f.type)) ? ' (fotoğraflar okunaklı kalacak şekilde küçültülür)' : ''}</p>
      ${files.length === 1 ? `<label>Ad</label><input data-f="title" maxlength="120" value="${U.esc(first.name.replace(/\.[^.]+$/, ''))}">` : ''}
      <label>Ders</label><select data-f="subject">${D().subjects.map((s) => `<option value="${s.id}" ${s.id === subj ? 'selected' : ''}>${U.esc(s.name)}</option>`).join('')}<option value="" ${!subj ? 'selected' : ''}>Genel</option></select>
      <label>Tür</label><div class="chips" data-f="kind">${Object.keys(K()).map((k) => `<button type="button" class="chip ${k === chosenKind ? 'active' : ''}" data-kind="${k}">${K()[k][0]} ${K()[k][1]}</button>`).join('')}</div>
      <label>Not (isteğe bağlı)</label><input data-f="note" maxlength="200" placeholder="Örn: 3. ünite özeti, sınavda çıkabilir">
      <div class="modal-actions"><button class="btn soft" data-act="cancel" type="button">Vazgeç</button><button class="btn primary" data-act="save" type="button">Kaydet</button></div>`);
    card.addEventListener('click', async (e) => {
      const k = e.target.closest('[data-kind]');
      if (k) { chosenKind = k.dataset.kind; card.querySelectorAll('[data-kind]').forEach((b) => b.classList.toggle('active', b === k)); return; }
      const act = e.target.closest('[data-act]') && e.target.closest('[data-act]').dataset.act;
      if (act === 'cancel') App.closeModal();
      if (act !== 'save') return;
      const meta = {
        title: card.querySelector('[data-f="title"]') ? card.querySelector('[data-f="title"]').value.trim() + (first.name.match(/\.[^.]+$/) || [''])[0] : '',
        subjectId: card.querySelector('[data-f="subject"]').value, kind: chosenKind, note: card.querySelector('[data-f="note"]').value.trim(),
      };
      App.closeModal();
      await upload(files, meta);
    });
  }
  async function upload(files, meta) {
    if (Depo.driveReady() && !Depo.hasToken()) App.toast('☁️', 'Drive bağlantısı yenilenmeli', 'Dosyalar şimdilik bu cihaza kaydediliyor; yenileyince Drive’a taşıyabilirsin');
    progress = { i: 0, n: files.length, p: 0, label: 'Kaydediliyor' };
    render();
    try {
      const added = await Depo.addFiles(files, meta, (i, n, p) => { progress = { i, n, p, label: 'Kaydediliyor' }; render(); });
      App.toast('🗂️', added.length === 1 ? 'Dosya depoya eklendi' : `${added.length} dosya depoya eklendi`, added[0].src === 'drive' ? 'Google Drive · Luna Depo' : 'Bu cihazda');
      if (App.checkBadges) App.checkBadges();
    } catch (e) {
      App.toast('⚠️', e instanceof Depo.NeedAuth ? 'Drive bağlantısı yenilenmeli' : 'Dosya kaydedilemedi', e instanceof Depo.NeedAuth ? 'Depo’daki "Drive bağlantısını yenile"ye dokun' : e.message);
    }
    progress = null;
    render();
  }

  // ---------- Görüntüleyici ----------
  const V = { item: null, url: '', pdf: null, zoom: 1, io: null, pages: [], token: 0 };
  function closeViewer() {
    const el = $('#viewer');
    el.classList.add('hidden');
    document.body.classList.remove('viewer-open');
    if (V.io) V.io.disconnect();
    if (V.pdf) V.pdf.close();
    if (V.url) URL.revokeObjectURL(V.url);
    Object.assign(V, { item: null, url: '', pdf: null, io: null, pages: [], token: V.token + 1 });
    $('#vw-body').innerHTML = '';
  }
  async function openViewer(item) {
    const el = $('#viewer');
    V.token++;
    const my = V.token;
    V.item = item; V.zoom = 1;
    $('#vw-title').innerHTML = `${U.esc(item.name)}<small>${U.esc(subjName(item.subjectId))} · ${(K()[item.kind] || K().diger).join(' ')}${item.note ? ' · ' + U.esc(item.note) : ''}</small>`;
    $('#vw-page').textContent = '';
    $('#vw-zoom').classList.toggle('hidden', !(Depo.isPdf(item.mime) || Depo.isImg(item.mime)));
    $('#vw-ask').classList.toggle('hidden', !(window.Asistan && (Depo.isPdf(item.mime) || Depo.isImg(item.mime))));
    $('#vw-body').innerHTML = '<div class="vw-msg">Açılıyor…</div>';
    el.classList.remove('hidden');
    document.body.classList.add('viewer-open');
    let blob;
    try { blob = await Depo.getBlob(item); } catch (e) {
      if (my !== V.token) return;
      const auth = e instanceof Depo.NeedAuth;
      $('#vw-body').innerHTML = `<div class="vw-msg">${auth ? '☁️ Dosyayı açmak için Drive bağlantısını yenilemelisin.' : '⚠️ ' + U.esc(e.message)}
        ${auth ? '<button class="btn primary" data-vw="auth" type="button">Drive bağlantısını yenile</button>' : ''}</div>`;
      return;
    }
    if (my !== V.token) return;
    V.url = URL.createObjectURL(blob);
    if (Depo.isImg(item.mime)) {
      $('#vw-body').innerHTML = `<div class="vw-img"><img src="${V.url}" alt="${U.esc(item.name)}"></div>`;
      applyZoom();
    } else if (Depo.isPdf(item.mime)) {
      try { await renderPdf(blob, my); } catch (e) {
        if (my === V.token) $('#vw-body').innerHTML = `<div class="vw-msg">⚠️ PDF açılamadı (${U.esc(e.message || 'bilinmeyen hata')}). <button class="btn soft" data-vw="download" type="button">İndir / paylaş</button></div>`;
      }
    } else {
      $('#vw-body').innerHTML = `<div class="vw-msg"><div style="font-size:3rem">${icon(item)}</div>Bu dosya türü burada önizlenemiyor.
        <div class="row">${item.src === 'drive' ? `<a class="btn primary" href="https://drive.google.com/file/d/${encodeURIComponent(item.rid)}/view" target="_blank" rel="noopener">Drive’da aç ↗</a>` : ''}<button class="btn soft" data-vw="download" type="button">İndir / paylaş</button></div></div>`;
    }
  }
  function applyZoom() {
    const img = $('#vw-body .vw-img img');
    if (img) img.style.width = V.zoom === 1 ? '' : Math.round(V.zoom * 100) + '%';
    $('#vw-zoom-val').textContent = Math.round(V.zoom * 100) + '%';
  }
  async function renderPdf(blob, my) {
    const pdf = await Depo.openPdf(blob);
    if (my !== V.token) { pdf.close(); return; }
    V.pdf = pdf;
    const body = $('#vw-body');
    const first = await pdf.getPage(1);
    const base = first.getViewport({ scale: 1 });
    body.innerHTML = `<div class="vw-pages">${Array.from({ length: pdf.numPages }, (_, i) => `<div class="vw-page" data-n="${i + 1}"><canvas></canvas><span class="vw-pn">${i + 1}</span></div>`).join('')}</div>`;
    V.pages = [...body.querySelectorAll('.vw-page')];
    const sizeAll = () => {
      const w = Math.min(body.clientWidth - 24, 1100) * V.zoom;
      for (const p of V.pages) { p.style.width = w + 'px'; p.style.height = Math.round(w * (base.height / base.width)) + 'px'; p.dataset.r = ''; }
    };
    sizeAll();
    V.resize = sizeAll;
    const rendered = new Set();
    const draw = async (p) => {
      const n = +p.dataset.n;
      if (p.dataset.r === String(V.zoom) || my !== V.token) return;
      p.dataset.r = String(V.zoom);
      const page = n === 1 ? first : await pdf.getPage(n);
      const w = p.clientWidth;
      const vp0 = page.getViewport({ scale: 1 });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vp = page.getViewport({ scale: (w / vp0.width) * dpr });
      p.style.height = Math.round(vp.height / dpr) + 'px';
      const cv = p.querySelector('canvas');
      cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
      cv.style.width = '100%'; cv.style.height = '100%';
      await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise.catch(() => {});
      rendered.add(p);
      // ilk sayfa: depo için küçük önizleme
      if (n === 1 && V.item && !(await Depo.thumbUrl(V.item))) Depo.saveThumb(V.item, await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.7))).then(() => render());
      // bellek: uzaktaki sayfaların tuvalini boşalt
      if (rendered.size > 14) {
        for (const q of rendered) {
          if (Math.abs(+q.dataset.n - n) > 6) { const c = q.querySelector('canvas'); c.width = c.height = 0; q.dataset.r = ''; rendered.delete(q); }
        }
      }
    };
    V.io = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) draw(e.target);
      // görünür en üst sayfa
      const top = V.pages.find((p) => p.getBoundingClientRect().bottom > body.getBoundingClientRect().top + 40);
      if (top) $('#vw-page').textContent = `${top.dataset.n} / ${pdf.numPages}`;
    }, { root: body, rootMargin: '800px 0px' });
    V.pages.forEach((p) => V.io.observe(p));
    $('#vw-page').textContent = `1 / ${pdf.numPages}`;
    body.onscroll = () => {
      const top = V.pages.find((p) => p.getBoundingClientRect().bottom > body.getBoundingClientRect().top + 40);
      if (top) $('#vw-page').textContent = `${top.dataset.n} / ${pdf.numPages}`;
    };
  }
  function zoomBy(f) {
    V.zoom = U.clamp(Math.round(V.zoom * f * 100) / 100, 0.5, 4);
    if (V.pdf && V.resize) {
      const body = $('#vw-body');
      const ratio = body.scrollTop / Math.max(1, body.scrollHeight);
      V.resize();
      body.scrollTop = ratio * body.scrollHeight;
      // görünür sayfalar yeniden çizilsin
      V.pages.forEach((p) => { V.io.unobserve(p); V.io.observe(p); });
    }
    applyZoom();
  }
  async function download(item) {
    try {
      const blob = await Depo.getBlob(item);
      const file = new File([blob], item.name, { type: item.mime });
      if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: item.name }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = item.name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) { App.toast('⚠️', 'Dosya alınamadı', e instanceof Depo.NeedAuth ? 'Drive bağlantısını yenile' : e.message); }
  }
  function editItem(item) {
    let chosenKind = item.kind;
    const card = App.openModal(`
      <h3>✏️ Dosyayı düzenle</h3>
      <label>Ad</label><input data-f="name" maxlength="120" value="${U.esc(item.name)}">
      <label>Ders</label><select data-f="subject">${D().subjects.map((s) => `<option value="${s.id}" ${s.id === item.subjectId ? 'selected' : ''}>${U.esc(s.name)}</option>`).join('')}<option value="" ${!item.subjectId ? 'selected' : ''}>Genel</option></select>
      <label>Tür</label><div class="chips">${Object.keys(K()).map((k) => `<button type="button" class="chip ${k === chosenKind ? 'active' : ''}" data-kind="${k}">${K()[k][0]} ${K()[k][1]}</button>`).join('')}</div>
      <label>Not</label><input data-f="note" maxlength="200" value="${U.esc(item.note || '')}">
      <p class="muted small">${Depo.fmtSize(item.size || 0)} · ${new Date(item.created).toLocaleString('tr-TR')} · ${item.src === 'drive' ? '☁️ Google Drive' : '📱 Bu cihazda'}</p>
      <div class="modal-actions"><button class="btn danger" data-act="del" type="button">Sil</button><span style="flex:1"></span>
        <button class="btn soft" data-act="cancel" type="button">Vazgeç</button><button class="btn primary" data-act="save" type="button">Kaydet</button></div>`);
    card.addEventListener('click', async (e) => {
      const k = e.target.closest('[data-kind]');
      if (k) { chosenKind = k.dataset.kind; card.querySelectorAll('[data-kind]').forEach((b) => b.classList.toggle('active', b === k)); return; }
      const act = e.target.closest('[data-act]') && e.target.closest('[data-act]').dataset.act;
      if (act === 'cancel') App.closeModal();
      if (act === 'save') {
        item.name = card.querySelector('[data-f="name"]').value.trim().slice(0, 120) || item.name;
        item.subjectId = card.querySelector('[data-f="subject"]').value;
        item.kind = chosenKind;
        item.note = card.querySelector('[data-f="note"]').value.trim().slice(0, 200);
        App.save(); App.closeModal(); render();
        if (V.item === item) $('#vw-title').innerHTML = `${U.esc(item.name)}<small>${U.esc(subjName(item.subjectId))} · ${(K()[item.kind] || K().diger).join(' ')}${item.note ? ' · ' + U.esc(item.note) : ''}</small>`;
      }
      if (act === 'del') {
        if (!confirm(`"${item.name}" silinsin mi?${item.src === 'drive' ? ' (Drive çöp kutusuna gider, 30 gün içinde geri alınabilir)' : ''}`)) return;
        try { await Depo.remove(item); } catch (err) { App.toast('⚠️', 'Silinemedi', err instanceof Depo.NeedAuth ? 'Drive bağlantısını yenile' : err.message); return; }
        App.closeModal(); closeViewer(); render();
        App.toast('🗑️', 'Dosya silindi');
      }
    });
  }

  // ---------- Olaylar ----------
  function bind() {
    const host = $('#notes-root');
    host.addEventListener('click', async (e) => {
      if (!e.target.closest('#depo-root')) return;
      const b = e.target.closest('button, a');
      if (!b) return;
      if (b.dataset.dpSubj != null) { filterSubject = b.dataset.dpSubj; render(); return; }
      if (b.dataset.dpKind != null) { filterKind = b.dataset.dpKind; render(); return; }
      if (b.dataset.dpOpen) { const it = D().files.find((x) => x.id === b.dataset.dpOpen); if (it) openViewer(it); return; }
      const act = b.dataset.dp;
      if (act === 'connect') {
        const inp = $('#depo-root [data-dp="client"]');
        if (inp) {
          const id = inp.value.trim();
          if (!/^[\w-]+\.apps\.googleusercontent\.com$/.test(id)) { App.toast('☁️', 'Client ID biçimi tanınmadı', '…apps.googleusercontent.com ile biten kodu yapıştır'); return; }
          Depo.cfg().clientId = id; Depo.saveCfg();
        }
        Depo.authorize();
      } else if (act === 'disconnect') {
        if (!confirm('Drive bağlantısı bu cihazda kapatılsın mı? Drive’daki dosyaların silinmez; yeniden bağlanınca geri gelir.')) return;
        const c = Depo.cfg();
        Object.assign(c, { token: '', exp: 0, connected: false, folderId: '' });
        Depo.saveCfg();
        D().files = D().files.filter((x) => x.src !== 'drive');
        App.save(); render();
      } else if (act === 'sync') {
        await syncNow(true);
      } else if (act === 'move') {
        progress = { i: 0, n: 1, p: 0, label: 'Drive’a taşınıyor' };
        render();
        try {
          const n = await Depo.moveToDrive((i, total, p) => { progress = { i, n: total, p, label: 'Drive’a taşınıyor' }; render(); });
          App.toast('☁️', `${n} dosya Drive’a taşındı`, 'iPad’inde yer açıldı');
        } catch (err) { App.toast('⚠️', 'Taşıma yarıda kaldı', err instanceof Depo.NeedAuth ? 'Drive bağlantısını yenileyip tekrar dene' : err.message); }
        progress = null; render();
      }
    });
    host.addEventListener('change', (e) => {
      const t = e.target;
      if (!t.closest('#depo-root') || !t.files || !t.files.length) return;
      const files = [...t.files];
      t.value = '';
      const big = files.find((f) => f.size > 200 * 1048576);
      if (big) { App.toast('⚠️', 'Dosya çok büyük', `${big.name}: en fazla 200 MB`); return; }
      askMeta(files);
    });
    host.addEventListener('input', (e) => {
      if (e.target.dataset.dp !== 'search') return;
      search = e.target.value;
      const pos = e.target.selectionStart;
      render();
      const inp = $('#depo-root [data-dp="search"]');
      inp.focus();
      try { inp.setSelectionRange(pos, pos); } catch (err) { /* yok say */ }
    });
    // görüntüleyici
    $('#viewer').addEventListener('click', (e) => {
      const b = e.target.closest('[data-vw]');
      if (!b || !V.item) return;
      const act = b.dataset.vw;
      if (act === 'close') closeViewer();
      else if (act === 'in') zoomBy(1.25);
      else if (act === 'out') zoomBy(0.8);
      else if (act === 'fit') { V.zoom = 1.25; zoomBy(0.8); }
      else if (act === 'download') download(V.item);
      else if (act === 'edit') editItem(V.item);
      else if (act === 'auth') Depo.authorize();
      else if (act === 'ask' && window.Asistan) { const it = V.item; closeViewer(); Asistan.askAboutFile(it); }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && V.item && $('#modal').classList.contains('hidden')) closeViewer(); });
    window.addEventListener('resize', () => { if (V.pdf && V.resize) { V.resize(); V.pages.forEach((p) => { V.io.unobserve(p); V.io.observe(p); }); } });
  }

  async function syncNow(manual) {
    if (!Depo.driveReady() || !Depo.hasToken()) return;
    try {
      const r = await Depo.syncDrive();
      if (manual || r.added || r.removed) App.toast('☁️', 'Drive eşitlendi', r.added || r.removed ? `${r.added} yeni, ${r.removed} silinmiş dosya` : 'Her şey güncel');
    } catch (e) {
      if (manual) App.toast('⚠️', 'Drive eşitlenemedi', e instanceof Depo.NeedAuth ? 'Bağlantıyı yenile' : e.message);
    }
    render();
  }

  return {
    init(app) {
      App = app;
      Depo.setApp(app);
      Depo.loadCfg();
      bind();
      // Google'dan dönüş
      const r = Depo.handleRedirect();
      if (r === 'ok') {
        App.toast('☁️', 'Google Drive bağlandı', 'Dosyaların artık Drive’daki Luna Depo klasöründe');
        if (window.NotesUI) NotesUI.setView('depo');
        App.showTab('notes');
        setTimeout(() => App.dismissFocus && App.dismissFocus(), 0); // odak sürüyorsa da Depo görünsün
        syncNow(false);
      } else if (r === 'denied') App.toast('☁️', 'Drive izni verilmedi', 'İstersen Depo’dan yeniden deneyebilirsin');
      else if (r === 'state') App.toast('☁️', 'Drive bağlantısı tamamlanamadı', 'Depo’dan bir kez daha "Bağlan" de');
      else if (Depo.driveReady() && Depo.hasToken()) setTimeout(() => syncNow(false), 4000);
    },
    render,
    open: openViewer,
  };
})();

if (typeof window !== 'undefined') { window.DepoUI = DepoUI; }
