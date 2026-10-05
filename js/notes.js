/* Notlar ve bilgi kartları (aralıklı tekrar / Leitner sistemi).
   Kart kutuları: 1 → aynı gün, 2 → 1 gün, 3 → 3 gün, 4 → 7 gün, 5 → 16 gün sonra tekrar. */

const NotesUI = (() => {
  let App = null;
  let view = 'notes';      // notes | cards | depo | hata | kaynak
  let filterSubject = '';
  let search = '';
  const $ = (s, el = document) => el.querySelector(s);
  const D = () => Store.data;
  const INTERVAL = [0, 0, 1, 3, 7, 16]; // kutu → gün

  const today = () => U.dateKey(new Date());
  const dueCards = () => D().cards.filter((c) => c.due <= today());
  const subjName = (id) => (id ? Store.subject(id).name : 'Genel');

  // Güvenli mini biçimlendirme: **kalın**, `kod`, "- " madde, satır sonları
  // (tek yıldız bilerek yok: fizik formüllerindeki m*a*g eğik yazıya dönüşmesin)
  function fmt(text) {
    const lines = U.esc(text || '').split('\n');
    let html = '', inList = false;
    for (const raw of lines) {
      const l = raw
        .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
        .replace(/`(.+?)`/g, '<code>$1</code>');
      if (/^\s*[-•]\s+/.test(raw)) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += `<li>${l.replace(/^\s*[-•]\s+/, '')}</li>`;
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        html += l ? `<p>${l}</p>` : '';
      }
    }
    if (inList) html += '</ul>';
    return html;
  }

  function subjectChips() {
    const used = new Set((view === 'notes' ? D().notes : D().cards).map((x) => x.subjectId));
    const list = D().subjects.filter((s) => used.has(s.id));
    if (!list.length) return '';
    return `<div class="chips">${[['', 'Hepsi']].concat(list.map((s) => [s.id, s.name])).map(([id, n]) => `<button class="chip ${filterSubject === id ? 'active' : ''}" data-filter="${id}">${U.esc(n)}</button>`).join('')}</div>`;
  }

  function render() {
    const root = $('#notes-root');
    if (!root) return;
    const due = dueCards().length;
    root.innerHTML = `
      <div class="seg notes-seg">
        <button data-view="notes" class="${view === 'notes' ? 'active' : ''}">📓 Notlar</button>
        <button data-view="cards" class="${view === 'cards' ? 'active' : ''}">🃏 Kartlar${due ? ` <span class="pill-count">${due}</span>` : ''}</button>
        ${window.DepoUI ? `<button data-view="depo" class="${view === 'depo' ? 'active' : ''}">🗂️ Depo</button>` : ''}
        ${window.HataUI ? `<button data-view="hata" class="${view === 'hata' ? 'active' : ''}">❌ Hatalar${HataUI.dueCount() ? ` <span class="pill-count">${HataUI.dueCount()}</span>` : ''}</button>` : ''}
        ${window.KaynakUI ? `<button data-view="kaynak" class="${view === 'kaynak' ? 'active' : ''}">📚 Kaynaklar</button>` : ''}
      </div>
      ${view === 'depo' ? '<div id="depo-root"></div>' : view === 'hata' ? '<div id="hata-root"></div>' : view === 'kaynak' ? '<div id="kaynak-root"></div>' : view === 'notes' ? notesHtml() : cardsHtml(due)}`;
    // dar ekranda seçili bölüm görünür kalsın
    const seg = root.querySelector('.notes-seg'), act = seg && seg.querySelector('.active');
    if (act && seg.scrollWidth > seg.clientWidth) seg.scrollLeft = act.offsetLeft - (seg.clientWidth - act.offsetWidth) / 2; // yalnızca yatay kaydırma
    if (view === 'depo') DepoUI.render();
    if (view === 'hata') HataUI.render();
    if (view === 'kaynak') KaynakUI.render();
  }

  function notesHtml() {
    const q = search.toLocaleLowerCase('tr-TR');
    const list = D().notes
      .filter((n) => !filterSubject || n.subjectId === filterSubject)
      .filter((n) => !q || (n.title + ' ' + n.body).toLocaleLowerCase('tr-TR').includes(q))
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updated - a.updated);
    return `<div class="notes-bar">
        <button class="btn primary" data-act="new-note">＋ Yeni not</button>
        <input type="search" data-f="search" placeholder="Notlarda ara…" value="${U.esc(search)}">
      </div>
      ${subjectChips()}
      ${list.length ? `<div class="note-grid">${list.map((n) => `<article class="note-card" data-id="${n.id}" style="--c:${Store.subject(n.subjectId).color}">
          <header><span class="tag">${U.esc(subjName(n.subjectId))}</span>${n.pinned ? '<span title="Sabit">📌</span>' : ''}</header>
          <h3>${U.esc(n.title || 'Başlıksız not')}</h3>
          <div class="note-body">${fmt(n.body.length > 700 ? n.body.slice(0, 700) + '…' : n.body)}</div>
          <footer class="muted small">${new Date(n.updated).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</footer>
        </article>`).join('')}</div>`
        : `<div class="card empty-state"><div style="font-size:2rem">📓</div><p><b>${D().notes.length ? 'Aramana uyan not yok.' : 'Henüz not yok.'}</b></p><p class="muted">Formüller, özetler, "bunu unutma" dediğin her şey burada. <b>**kalın**</b>, \`kod\` ve "- " ile madde yazabilirsin.</p></div>`}`;
  }

  function cardsHtml(due) {
    const list = D().cards.filter((c) => !filterSubject || c.subjectId === filterSubject);
    const boxes = [1, 2, 3, 4, 5].map((b) => D().cards.filter((c) => c.box === b).length);
    return `<div class="card cards-hero">
        <div>
          <h2>🧠 Aralıklı tekrar</h2>
          <p class="muted">${due ? `Bugün <b>${due}</b> kart seni bekliyor. Bildiğin kart daha seyrek, bilemediğin daha sık gelir.` : 'Bugünlük tekrar yok, harikasın! Yeni kart ekleyebilirsin ✨'}</p>
          <div class="box-row">${boxes.map((n, i) => `<span class="box b${i + 1}" title="${i + 1}. kutu: ${['her gün', '1 günde bir', '3 günde bir', 'haftada bir', '16 günde bir'][i]}"><b>${n}</b><small>${i + 1}. kutu</small></span>`).join('')}</div>
        </div>
        <div class="cards-actions">
          <button class="btn primary big" data-act="review" ${due ? '' : 'disabled'}>Tekrara başla ▶</button>
          <button class="btn soft" data-act="new-card">＋ Yeni kart</button>
        </div>
      </div>
      ${subjectChips()}
      ${list.length ? `<ul class="card-list">${list.slice().sort((a, b) => a.due.localeCompare(b.due)).map((c) => `<li data-id="${c.id}">
          <span class="box-dot b${c.box}" title="${c.box}. kutu">${c.box}</span>
          <div class="cl-text"><b>${U.esc(c.front)}</b><span class="muted small">${U.esc(subjName(c.subjectId))} · ${c.due <= today() ? 'bugün' : new Date(c.due + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span></div>
          <button class="icon-btn" data-act="edit-card" title="Düzenle">✏️</button>
        </li>`).join('')}</ul>`
        : `<div class="card empty-state"><div style="font-size:2rem">🃏</div><p><b>Henüz kart yok.</b></p><p class="muted">Ön yüze soru (örn. "Mol kütlesi nedir?"), arka yüze cevabı yaz. Luna her gün tekrar etmen gerekenleri sana getirir.</p></div>`}`;
  }

  function subjectSelect(sel) {
    // listede olmayan (mod değişince başka listeye geçmiş) ders seçili kalsın; yoksa kaydedince "Genel"e düşerdi
    const lost = sel && !D().subjects.some((s) => s.id === sel) ? `<option value="${U.esc(sel)}" selected>${U.esc(Store.subject(sel).name)}</option>` : '';
    return `<select data-f="subject">${D().subjects.map((s) => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${U.esc(s.name)}</option>`).join('')}${lost}<option value="" ${!sel ? 'selected' : ''}>Genel</option></select>`;
  }

  // ---------- Not düzenleme ----------
  function editNote(n) {
    const isNew = !n;
    n = n || { id: U.uid(), subjectId: filterSubject || (D().subjects[0] && D().subjects[0].id) || '', title: '', body: '', pinned: false, created: Date.now() };
    const card = App.openModal(`
      <h3>${isNew ? '📓 Yeni not' : '✏️ Notu düzenle'}</h3>
      <label>Başlık</label><input data-f="title" maxlength="80" value="${U.esc(n.title)}" placeholder="Örn: Türev kuralları">
      <label>Ders</label>${subjectSelect(n.subjectId)}
      <label>Not</label><textarea data-f="body" rows="9" placeholder="- madde\n**önemli**\nformül: F = m·a">${U.esc(n.body)}</textarea>
      <label class="switch"><input type="checkbox" data-f="pinned" ${n.pinned ? 'checked' : ''}> Üste sabitle</label>
      <div class="modal-actions">${isNew ? '' : '<button class="btn danger" data-act="del">Sil</button><span style="flex:1"></span>'}
        <button class="btn soft" data-act="cancel">Vazgeç</button><button class="btn primary" data-act="save">Kaydet</button></div>`);
    card.addEventListener('click', (e) => {
      const act = e.target.closest('button') && e.target.closest('button').dataset.act;
      if (act === 'cancel') App.closeModal();
      if (act === 'del' && confirm('Bu not silinsin mi?')) { D().notes = D().notes.filter((x) => x.id !== n.id); done(); }
      if (act === 'save') {
        const title = card.querySelector('[data-f="title"]').value.trim().slice(0, 80);
        const body = card.querySelector('[data-f="body"]').value.slice(0, 20000);
        if (!title && !body.trim()) { App.closeModal(); return; }
        Object.assign(n, { title, body, subjectId: card.querySelector('[data-f="subject"]').value, pinned: card.querySelector('[data-f="pinned"]').checked, updated: Date.now() });
        if (isNew) D().notes.push(n);
        done();
      }
    });
    function done() { App.save(); App.closeModal(); render(); App.refreshHome(); }
  }

  // ---------- Kart düzenleme ----------
  function editCard(c) {
    const isNew = !c;
    c = c || { id: U.uid(), subjectId: filterSubject || (D().subjects[0] && D().subjects[0].id) || '', front: '', back: '', box: 1, due: today(), created: Date.now() };
    const card = App.openModal(`
      <h3>${isNew ? '🃏 Yeni kart' : '✏️ Kartı düzenle'}</h3>
      <label>Ön yüz (soru)</label><textarea data-f="front" rows="3" maxlength="400" placeholder="Örn: Newton'un 2. yasası?">${U.esc(c.front)}</textarea>
      <label>Arka yüz (cevap)</label><textarea data-f="back" rows="4" maxlength="1200" placeholder="F = m · a">${U.esc(c.back)}</textarea>
      <label>Ders</label>${subjectSelect(c.subjectId)}
      <div class="modal-actions">${isNew ? '' : '<button class="btn danger" data-act="del">Sil</button><span style="flex:1"></span>'}
        <button class="btn soft" data-act="cancel">${isNew ? 'Kapat' : 'Vazgeç'}</button>
        ${isNew ? '<button class="btn soft" data-act="save-more">Kaydet + yeni</button>' : ''}
        <button class="btn primary" data-act="save">Kaydet</button></div>`);
    card.querySelector('[data-f="front"]').focus();
    card.addEventListener('click', (e) => {
      const act = e.target.closest('button') && e.target.closest('button').dataset.act;
      if (act === 'cancel') { App.closeModal(); render(); }
      if (act === 'del' && confirm('Bu kart silinsin mi?')) { D().cards = D().cards.filter((x) => x.id !== c.id); App.save(); App.closeModal(); render(); }
      if (act === 'save' || act === 'save-more') {
        const front = card.querySelector('[data-f="front"]').value.trim();
        const back = card.querySelector('[data-f="back"]').value.trim();
        if (!front || !back) { App.toast('🃏', 'Ön ve arka yüzü doldur'); return; }
        Object.assign(c, { front, back, subjectId: card.querySelector('[data-f="subject"]').value });
        if (isNew) D().cards.push(c);
        App.save(); App.refreshHome();
        if (act === 'save-more') { App.toast('🃏', 'Kart eklendi'); editCard(null); } else { App.closeModal(); render(); }
      }
    });
  }

  // ---------- Tekrar oturumu ----------
  function review() {
    const list = dueCards().slice(0, 50);
    if (!list.length) return;
    let i = 0, known = 0;
    const card = App.openModal('<div class="review"></div>');
    const box = card.querySelector('.review');
    function show(flipped) {
      const c = list[i];
      box.innerHTML = `<div class="review-top"><span class="muted small">${i + 1}/${list.length} · ${U.esc(subjName(c.subjectId))}</span><button class="icon-btn" data-act="close" title="Kapat">✕</button></div>
        <div class="flash ${flipped ? 'flipped' : ''}">
          <div class="flash-face">${fmt(c.front)}</div>
          ${flipped ? `<div class="flash-back">${fmt(c.back)}</div>` : ''}
        </div>
        <div class="review-actions">${flipped
          ? '<button class="btn soft big" data-act="no">Bilemedim ❌</button><button class="btn primary big" data-act="yes">Bildim ✅</button>'
          : '<button class="btn primary big" data-act="flip">Cevabı göster</button>'}</div>`;
    }
    function finish() {
      box.innerHTML = `<div class="badge-pop"><div class="bp-emoji">🧠</div><h3>Tekrar bitti!</h3>
        <p class="bp-msg">${list.length} kartın ${known} tanesini bildin. ${known === list.length ? 'Kusursuz! 🌟' : 'Bilemediklerin bugün yeniden karşına çıkacak; her tekrar hafızanı güçlendirir 💪'}</p>
        <button class="btn primary" data-act="close">Harika 💛</button></div>`;
      App.refreshHome();
    }
    box.addEventListener('click', (e) => {
      const act = e.target.closest('button') && e.target.closest('button').dataset.act;
      if (!act) return;
      if (act === 'close') { App.closeModal(); render(); return; }
      if (act === 'flip') return show(true);
      const c = list[i];
      if (act === 'yes') { c.box = Math.min(5, c.box + 1); known++; } else c.box = 1;
      c.due = U.dateKey(U.addDays(new Date(), INTERVAL[c.box]));
      D().stats.cardReviews = (D().stats.cardReviews || 0) + 1;
      App.save();
      i++;
      if (i >= list.length) finish(); else show(false);
    });
    show(false);
  }

  function bind() {
    const root = $('#notes-root');
    root.addEventListener('click', (e) => {
      if (e.target.closest('#depo-root, #hata-root, #kaynak-root')) return; // bu bölümler kendi olaylarını yönetir
      const b = e.target.closest('button, .note-card, .card-list li');
      if (!b) return;
      if (b.dataset.view) { view = b.dataset.view; filterSubject = ''; render(); return; }
      if (b.dataset.filter != null && b.classList.contains('chip')) { filterSubject = b.dataset.filter; render(); return; }
      const act = b.dataset.act;
      if (act === 'new-note') return editNote(null);
      if (act === 'new-card') return editCard(null);
      if (act === 'review') return review();
      if (b.classList.contains('note-card')) return editNote(D().notes.find((n) => n.id === b.dataset.id));
      const li = b.closest('.card-list li');
      if (li) editCard(D().cards.find((c) => c.id === li.dataset.id));
    });
    root.addEventListener('input', (e) => {
      if (e.target.closest('#depo-root, #hata-root, #kaynak-root') || e.target.dataset.f !== 'search') return;
      search = e.target.value;
      const pos = e.target.selectionStart;
      render();
      const inp = root.querySelector('[data-f="search"]');
      inp.focus();
      try { inp.setSelectionRange(pos, pos); } catch (err) { /* bazı tarayıcılar */ }
    });
  }

  return {
    init(app) { App = app; bind(); },
    render,
    setView(v) { view = v; filterSubject = ''; render(); },
    dueCount: () => dueCards().length,
  };
})();

if (typeof window !== 'undefined') { window.NotesUI = NotesUI; }
