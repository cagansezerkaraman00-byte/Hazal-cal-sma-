/* Kaynaklar ekranı (Kitaplık → Kaynaklar): arama, DOI/ISBN ile ekleme, elle ekleme, kaynakça. */

const KaynakUI = (() => {
  let App = null;
  let results = null, searching = false, query = '', filterSubject = '';
  const $ = (s, el = document) => el.querySelector(s);
  const D = () => Store.data;
  const STYLES = { apa: 'APA 7', vancouver: 'Vancouver (tıp/sağlık)', ieee: 'IEEE (mühendislik)' };
  const TYPES = { article: '📄 Makale', book: '📘 Kitap', web: '🌐 Web sayfası' };
  const style = () => D().settings.citeStyle || 'apa';
  const safeUrl = (u) => (/^https?:\/\//i.test(String(u || '')) ? String(u) : ''); // javascript: vb. adresler bağlantı olmaz

  function refHtml(r) {
    const link = r.doi ? 'https://doi.org/' + encodeURI(r.doi) : safeUrl(r.url);
    const oa = safeUrl(r.oaUrl);
    return `<li class="ref-item" data-id="${r.id}">
      <div class="ref-cite">${Kaynak.format(r, style(), true)}</div>
      <div class="ref-meta">
        <span class="tag">${U.esc(r.subjectId ? Store.subject(r.subjectId).name : 'Genel')}</span>
        ${style() === 'apa' ? `<span class="muted small">Metin içi: ${U.esc(Kaynak.inText(r))}</span>` : ''}
        <span class="ref-acts">
          <button class="chip" data-kr="copy" type="button">📋 Kopyala</button>
          ${link ? `<a class="chip" href="${U.esc(link)}" target="_blank" rel="noopener noreferrer">🔗 Aç</a>` : ''}
          ${oa ? `<a class="chip" href="${U.esc(oa)}" target="_blank" rel="noopener noreferrer">🔓 Açık erişim</a>` : ''}
          <button class="chip" data-kr="edit" type="button">✏️</button>
        </span>
      </div></li>`;
  }

  function render() {
    const root = $('#kaynak-root');
    if (!root) return;
    const used = new Set(D().refs.map((r) => r.subjectId));
    const subj = D().subjects.filter((s) => used.has(s.id));
    const list = D().refs.filter((r) => !filterSubject || r.subjectId === filterSubject);
    root.innerHTML = `
      <div class="card kr-head">
        <div class="kr-row">
          <input type="search" data-kr="q" placeholder="Makale ara (konu, başlık, yazar)…" value="${U.esc(query)}">
          <button class="btn primary" data-kr="search" type="button">${searching ? 'Aranıyor…' : '🔎 Ara'}</button>
        </div>
        <div class="kr-row">
          <input data-kr="id" placeholder="DOI ya da ISBN yapıştır (ör. 10.1177/… ya da 978…)">
          <button class="btn soft" data-kr="add-id" type="button">＋ Ekle</button>
          <button class="btn soft" data-kr="manual" type="button">✍️ Elle ekle</button>
        </div>
        <div class="kr-row kr-style"><label>Kaynakça biçimi</label><select data-kr="style">${Object.keys(STYLES).map((k) => `<option value="${k}" ${k === style() ? 'selected' : ''}>${STYLES[k]}</option>`).join('')}</select></div>
      </div>
      ${results ? `<div class="card kr-results"><div class="kr-res-head"><b>Sonuçlar</b> <span class="muted small">${U.esc(results.from)}${results.note ? ' (' + U.esc(results.note) + ')' : ''}</span><button class="icon-btn" data-kr="close-res" type="button" title="Kapat">✕</button></div>
        ${results.items.length ? `<ul class="kr-res-list">${results.items.map((r, i) => `<li>
          <div><b>${U.esc(r.title)}</b><small>${U.esc((r.authors || []).slice(0, 3).map((a) => a.literal || a.family).join(', '))}${(r.authors || []).length > 3 ? ' vd.' : ''} · ${r.year || 't.y.'}${r.container ? ' · ' + U.esc(r.container) : ''}${r.cited ? ` · ${r.cited} atıf` : ''}${r.oaUrl ? ' · 🔓 açık erişim' : ''}</small>
          ${r.abstract ? `<details><summary class="hint">Özet</summary><p class="small">${U.esc(r.abstract)}</p></details>` : ''}</div>
          <button class="btn soft small-btn" data-kr="take" data-i="${i}" type="button">＋ Kütüphaneye</button></li>`).join('')}</ul>` : '<p class="hint">Sonuç bulunamadı; farklı anahtar kelimeler dene (İngilizce terimler daha çok sonuç verir).</p>'}
      </div>` : ''}
      ${subj.length ? `<div class="chips">${[['', 'Tüm dersler']].concat(subj.map((s) => [s.id, s.name])).map(([id, n]) => `<button class="chip ${filterSubject === id ? 'active' : ''}" data-kr-subj="${id}" type="button">${U.esc(n)}</button>`).join('')}</div>` : ''}
      ${list.length ? `<div class="card"><div class="kr-lib-head"><b>📚 Kütüphanem</b> <span class="muted small">${list.length} kaynak</span><button class="btn soft small-btn" data-kr="bib" type="button">📋 Kaynakçayı kopyala</button></div>
        <ul class="ref-list">${list.slice().reverse().map(refHtml).join('')}</ul></div>`
        : `<div class="card empty-state"><div style="font-size:2rem">📚</div><p><b>Kütüphanen boş.</b></p><p class="muted">Makale ara, DOI ya da ISBN yapıştır; künyeyi ben çıkarırım ve seçtiğin biçimde (APA, Vancouver, IEEE) kaynakçana hazır yazarım. Ödev ve tezlerde kaynakça derdi biter.</p></div>`}`;
  }

  async function copyRich(htmlStr, text) {
    try {
      if (window.ClipboardItem && navigator.clipboard.write) {
        await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([htmlStr], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]);
      } else await navigator.clipboard.writeText(text);
      App.toast('📋', 'Kopyalandı', 'Word ya da Google Dokümanlar’a yapıştırınca italikler korunur');
    } catch (e) { App.toast('⚠️', 'Kopyalanamadı', 'Tarayıcı izin vermedi'); }
  }

  // r: kaydedilecek nesne; pre: formu dolduracak (daha yeni) künye
  function edit(r, isNew, pre) {
    r = r || { type: 'article', title: '', authors: [], year: '', container: '', volume: '', issue: '', pages: '', doi: '', url: '', publisher: '', city: '', edition: '', date: '', accessed: U.dateKey(new Date()) };
    const target = r;
    if (pre) r = { ...r, ...pre, id: target.id, subjectId: target.subjectId, added: target.added };
    const authorsTxt = (r.authors || []).map((a) => (a.literal ? a.literal : `${a.family}${a.given ? ', ' + a.given : ''}`)).join('\n');
    const subj = r.subjectId != null ? r.subjectId : filterSubject || '';
    const card = App.openModal(`<h3>${isNew ? '＋ Kaynak ekle' : '✏️ Kaynağı düzenle'}</h3>
      <div class="seg" data-f="type">${Object.keys(TYPES).map((k) => `<button type="button" data-type="${k}" class="${k === r.type ? 'active' : ''}">${TYPES[k]}</button>`).join('')}</div>
      <label>Başlık</label><input data-f="title" value="${U.esc(r.title)}" maxlength="400">
      <label>Yazarlar <span class="muted small">(her satıra bir kişi: Soyad, Ad · kurum adı da olabilir)</span></label><textarea data-f="authors" rows="3">${U.esc(authorsTxt)}</textarea>
      <div class="row2"><label class="field">Yıl <input data-f="year" inputmode="numeric" maxlength="4" value="${U.esc(r.year)}"></label>
        <label class="field" data-show="article web">Dergi / site <input data-f="container" value="${U.esc(r.container)}"></label>
        <label class="field" data-show="book">Yayınevi <input data-f="publisher" value="${U.esc(r.publisher || '')}"></label></div>
      <div class="row3" data-show="article"><label class="field">Cilt <input data-f="volume" value="${U.esc(r.volume)}"></label><label class="field">Sayı <input data-f="issue" value="${U.esc(r.issue)}"></label><label class="field">Sayfa <input data-f="pages" value="${U.esc(r.pages)}" placeholder="12-25"></label></div>
      <div class="row2" data-show="book"><label class="field">Baskı <input data-f="edition" inputmode="numeric" value="${U.esc(r.edition || '')}" placeholder="ör. 14"></label><label class="field">Şehir <input data-f="city" value="${U.esc(r.city || '')}"></label></div>
      <div class="row2" data-show="web"><label class="field">Sayfa tarihi <input type="date" data-f="date" value="${U.esc(r.date || '')}"></label><label class="field">Erişim tarihi <input type="date" data-f="accessed" value="${U.esc(r.accessed || '')}"></label></div>
      <div class="row2"><label class="field">DOI <input data-f="doi" value="${U.esc(r.doi)}" placeholder="10.…"></label><label class="field">Bağlantı <input data-f="url" value="${U.esc(r.url)}" placeholder="https://…"></label></div>
      <label>Ders</label><select data-f="subject">${D().subjects.map((s) => `<option value="${s.id}" ${s.id === subj ? 'selected' : ''}>${U.esc(s.name)}</option>`).join('')}<option value="" ${!subj ? 'selected' : ''}>Genel</option></select>
      <div class="modal-actions">${isNew ? '' : '<button class="btn danger" data-act="del" type="button">Sil</button><span style="flex:1"></span>'}<button class="btn soft" data-act="cancel" type="button">Vazgeç</button><button class="btn primary" data-act="save" type="button">Kaydet</button></div>`);
    let type = r.type;
    const sync = () => card.querySelectorAll('[data-show]').forEach((el) => el.classList.toggle('hidden', !el.dataset.show.split(' ').includes(type)));
    sync();
    card.addEventListener('click', (e) => {
      const tb = e.target.closest('[data-type]');
      if (tb) { type = tb.dataset.type; card.querySelectorAll('[data-type]').forEach((b) => b.classList.toggle('active', b === tb)); sync(); return; }
      const act = e.target.closest('[data-act]') && e.target.closest('[data-act]').dataset.act;
      if (act === 'cancel') App.closeModal();
      if (act === 'del' && confirm('Bu kaynak silinsin mi?')) { D().refs = D().refs.filter((x) => x.id !== target.id); App.save(); App.closeModal(); render(); }
      if (act !== 'save') return;
      const v = (f) => (card.querySelector(`[data-f="${f}"]`) || {}).value || '';
      const title = v('title').trim();
      if (!title) { App.toast('📚', 'Başlık gerekli'); return; }
      Object.assign(target, {
        oaUrl: r.oaUrl || '', abstract: r.abstract || '', isbn: r.isbn || '',
        type, title, year: v('year').trim(), container: v('container').trim(), publisher: v('publisher').trim(), volume: v('volume').trim(), issue: v('issue').trim(),
        pages: v('pages').trim(), edition: v('edition').trim(), city: v('city').trim(), date: v('date'), accessed: v('accessed'), doi: v('doi').trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, ''), url: v('url').trim(),
        subjectId: v('subject'),
        authors: v('authors').split('\n').map((x) => x.trim()).filter(Boolean).map((x) => (x.includes(',') ? Kaynak.splitName(x) : /\s/.test(x) && !/(bakanlığı|üniversitesi|kurumu|derneği|örgütü|organization|association|institute|ÖSYM|MEB|WHO)/i.test(x) ? Kaynak.splitName(x) : { literal: x })),
      });
      if (isNew) { target.id = U.uid(); target.added = Date.now(); D().refs.push(target); }
      App.save(); App.closeModal(); render();
      if (isNew) App.toast('📚', 'Kütüphaneye eklendi');
    });
  }

  function add(r) {
    if (r.doi && D().refs.some((x) => x.doi && x.doi.toLowerCase() === r.doi.toLowerCase())) { App.toast('📚', 'Bu kaynak zaten kütüphanende'); return; }
    D().refs.push({ ...r, id: U.uid(), added: Date.now(), subjectId: filterSubject || '' });
    App.save(); render();
    App.toast('📚', 'Kütüphaneye eklendi', 'Dersini ✏️ ile değiştirebilirsin');
  }

  function bind() {
    const host = $('#notes-root');
    host.addEventListener('click', async (e) => {
      if (!e.target.closest('#kaynak-root')) return;
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.krSubj != null) { filterSubject = b.dataset.krSubj; render(); return; }
      const act = b.dataset.kr;
      if (act === 'search') {
        query = $('#kaynak-root [data-kr="q"]').value.trim();
        if (query.length < 3 || searching) return;
        searching = true; render();
        try { results = await Kaynak.search(query); } catch (err) { App.toast('⚠️', 'Arama yapılamadı', err.message); }
        searching = false; render();
      } else if (act === 'close-res') { results = null; render(); }
      else if (act === 'take') { const r = results && results.items[+b.dataset.i]; if (r) add(r); }
      else if (act === 'add-id') {
        const v = $('#kaynak-root [data-kr="id"]').value.trim();
        if (!v) return;
        b.disabled = true; b.textContent = '…';
        try {
          const r = /10\.\d{4,9}\//.test(v) ? await Kaynak.byDoi(v) : await Kaynak.byIsbn(v);
          const same = r && r.doi && D().refs.find((x) => x.doi && x.doi.toLowerCase() === r.doi.toLowerCase());
          if (!r) App.toast('📚', 'Künye bulunamadı', 'DOI/ISBN’i kontrol et ya da ✍️ Elle ekle');
          else if (same) { App.toast('📚', 'Bu kaynak zaten kütüphanende', 'Künyeyi güncel bilgilerle açtım; kontrol edip kaydet'); edit(same, false, r); }
          else edit({ ...r, accessed: U.dateKey(new Date()) }, true);
        } catch (err) { App.toast('⚠️', 'Künye alınamadı', err.message); }
        render();
      } else if (act === 'manual') edit(null, true);
      else if (act === 'bib') {
        const list = D().refs.filter((r) => !filterSubject || r.subjectId === filterSubject);
        copyRich(Kaynak.bibliography(list, style(), true), Kaynak.bibliography(list, style(), false));
      } else {
        const li = b.closest('.ref-item');
        const r = li && D().refs.find((x) => x.id === li.dataset.id);
        if (!r) return;
        if (act === 'copy') copyRich(Kaynak.format(r, style(), true), Kaynak.format(r, style(), false));
        if (act === 'edit') edit(r, false);
      }
    });
    host.addEventListener('change', (e) => {
      if (!e.target.closest('#kaynak-root')) return;
      if (e.target.dataset.kr === 'style') { D().settings.citeStyle = e.target.value; App.save(); render(); }
    });
    host.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.closest && e.target.closest('#kaynak-root') && e.target.dataset.kr === 'q') { e.preventDefault(); $('#kaynak-root [data-kr="search"]').click(); }
    });
  }

  return {
    init(app) {
      App = app;
      bind();
      // tıp/sağlık bölümlerinde Vancouver önerilir
      const s = D().settings;
      if (!s.citeStyle && /t[ıi]p|di[şs]|eczac|hem[şs]ire|sa[ğg]l[ıi]k|vet/i.test((s.profile && s.profile.dept) || '')) s.citeStyle = 'vancouver';
    },
    render,
  };
})();

if (typeof window !== 'undefined') { window.KaynakUI = KaynakUI; }
