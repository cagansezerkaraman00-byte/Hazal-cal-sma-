/* Hata defteri (Notlar → Hatalar): yanlış yapılan sorunun fotoğrafı, konusu, neden yanlış yapıldığı ve
   püf noktası. Sorular aralıklı tekrarla geri gelir (1 → 3 → 7 → 21 gün); dört kez üst üste doğru çözülen soru
   "öğrenildi" olur. Fotoğraflar Kütüphane'de (Google Drive ya da cihaz) "Hata defteri" türüyle saklanır. */

const HataUI = (() => {
  let App = null;
  let showLearned = false;
  const $ = (s, el = document) => el.querySelector(s);
  const D = () => Store.data;
  const INTERVAL = [0, 1, 3, 7, 21]; // kutu → gün (5 = öğrenildi)
  const REASONS = {
    bilgi: ['📖', 'Bilgi eksiği', 'Konuyu kısa bir tekrarla tazele, sonra benzer 5-10 soru çöz.'],
    yorum: ['🧩', 'Soruyu yanlış yorumladım', 'Soru kökünü iki kez oku, istenen şeyin altını çiz; "değildir/en az" gibi kelimelere dikkat et.'],
    islem: ['✏️', 'İşlem hatası', 'İşlemleri düzenli alt alta yaz, sonucu ters işlemle ya da birimle kontrol et.'],
    dikkat: ['👀', 'Dikkat hatası', 'Denemede soru başına kısa bir kontrol alışkanlığı edin; yorgunken çözülen sorular burada birikir.'],
    sure: ['⏱️', 'Süre yetmedi', 'Bu tip sorularda süre tutarak çalış; takıldığın soruyu işaretleyip geçmeyi dene.'],
  };
  const today = () => U.dateKey(new Date());
  const active = () => D().mistakes.filter((m) => m.box < 5);
  const due = () => active().filter((m) => m.due <= today());

  // derse ait YKS konuları (öneri listesi)
  function topicsFor(subjectId) {
    if (!window.YKS || !D().yks.field) return [];
    const st = (YKS.studySubjects(D().yks.field) || []).find((s) => s.id === subjectId);
    if (!st) return [];
    return st.yks.flatMap((k) => (YKS.SUBJECTS[k] ? YKS.SUBJECTS[k].topics.map((t) => t.name) : []));
  }

  function insights() {
    const all = D().mistakes;
    if (all.length < 3) return '';
    const cnt = {};
    for (const m of all) cnt[m.reason] = (cnt[m.reason] || 0) + 1;
    const top = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    const topics = {};
    for (const m of active()) if (m.topic) topics[m.topic] = (topics[m.topic] || 0) + 1;
    const tt = Object.keys(topics).sort((a, b) => topics[b] - topics[a]).slice(0, 3);
    const learned = all.filter((m) => m.box >= 5).length;
    return `<ul class="insights">
      ${REASONS[top] ? `<li>En sık hata nedenin: <b>${REASONS[top][1]}</b> (%${Math.round((cnt[top] / all.length) * 100)}). ${REASONS[top][2]}</li>` : ''}
      ${tt.length ? `<li>En çok soru biriken konular: <b>${tt.map(U.esc).join(', ')}</b>. Bu hafta planına küçük bir tekrar ekleyebilirsin.</li>` : ''}
      ${learned ? `<li>${learned} soruyu artık öğrendin 🌟 Her biri sınavda sana dönecek bir net.</li>` : ''}
    </ul>`;
  }

  function rowHtml(m) {
    const r = REASONS[m.reason] || REASONS.bilgi;
    const when = m.box >= 5 ? 'öğrenildi ✅' : m.due <= today() ? 'bugün' : new Date(m.due + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    return `<li class="hata-item" data-id="${m.id}">
      <span class="ht-thumb" data-thumb="${m.fileId}">❌</span>
      <div class="ht-text"><b>${U.esc(m.topic || 'Konu belirtilmedi')}</b><small>${U.esc(m.subjectId ? Store.subject(m.subjectId).name : 'Genel')} · ${r[0]} ${r[1]} · ${when}</small></div>
      <span class="box-dot b${Math.min(5, m.box)}" title="${m.box}. kutu">${Math.min(5, m.box)}</span>
    </li>`;
  }

  function render() {
    const root = $('#hata-root');
    if (!root) return;
    const d = due(), act = active();
    const later = act.filter((m) => m.due > today()).sort((a, b) => a.due.localeCompare(b.due));
    const learned = D().mistakes.filter((m) => m.box >= 5);
    root.innerHTML = `
      <div class="card cards-hero">
        <div>
          <h2>❌ Hata defteri</h2>
          <p class="muted">${d.length ? `Bugün <b>${d.length}</b> soruyu yeniden çözme günü. Yanlışlar en iyi öğretmenlerdir.` : act.length ? 'Bugünlük tekrar yok ✨ Yeni yanlışlarını eklemeyi unutma.' : 'Denemede ya da testte yanlış yaptığın soruyu fotoğrafla; nedenini yaz, ben de doğru zamanda yeniden önüne getireyim.'}</p>
        </div>
        <div class="cards-actions">
          <button class="btn primary big" data-ht="review" type="button" ${d.length ? '' : 'disabled'}>Yeniden çöz ▶</button>
          <label class="btn soft">📷 Soru ekle<input type="file" accept="image/*" capture="environment" hidden data-ht="cam"></label>
          <label class="btn soft">🖼️ Görsel seç<input type="file" accept="image/*" hidden data-ht="pick"></label>
        </div>
      </div>
      ${insights() ? `<div class="card good"><h2>🧭 Hata analizi</h2>${insights()}</div>` : ''}
      ${d.length ? `<div class="card"><h3 class="sub-h">Bugün</h3><ul class="hata-list">${d.map(rowHtml).join('')}</ul></div>` : ''}
      ${later.length ? `<div class="card"><h3 class="sub-h">Sırada</h3><ul class="hata-list">${later.map(rowHtml).join('')}</ul></div>` : ''}
      ${learned.length ? `<div class="card"><button class="chip" data-ht="learned" type="button">${showLearned ? '▾' : '▸'} Öğrendiklerim (${learned.length})</button>${showLearned ? `<ul class="hata-list">${learned.map(rowHtml).join('')}</ul>` : ''}</div>` : ''}`;
    for (const m of D().mistakes) {
      const item = D().files.find((f) => f.id === m.fileId);
      if (!item) continue;
      Depo.thumbUrl(item).then((u) => { root.querySelectorAll(`[data-thumb="${m.fileId}"]`).forEach((el) => { if (u) el.innerHTML = `<img src="${u}" alt="">`; }); });
    }
  }

  function addForm(file) {
    const subj = (D().subjects[0] && D().subjects[0].id) || '';
    let reason = 'bilgi';
    const prev = URL.createObjectURL(file);
    const card = App.openModal(`<h3>❌ Hata defterine ekle</h3>
      <img class="ht-preview" src="${prev}" alt="">
      <label>Ders</label><select data-f="subject">${D().subjects.map((s) => `<option value="${s.id}" ${s.id === subj ? 'selected' : ''}>${U.esc(s.name)}</option>`).join('')}<option value="">Genel</option></select>
      <label>Konu</label><input data-f="topic" list="ht-topics" maxlength="80" placeholder="Örn: Problemler, Türev, Paragraf"><datalist id="ht-topics"></datalist>
      <label>Neden yanlış yaptım?</label><div class="chips">${Object.keys(REASONS).map((k) => `<button type="button" class="chip ${k === reason ? 'active' : ''}" data-reason="${k}">${REASONS[k][0]} ${REASONS[k][1]}</button>`).join('')}</div>
      <label>Doğru cevap / püf noktası</label><textarea data-f="note" rows="3" maxlength="600" placeholder="Örn: Cevap C. Payda sıfır olamaz; tanım kümesini önce yaz."></textarea>
      <div class="modal-actions"><button class="btn soft" data-act="cancel" type="button">Vazgeç</button><button class="btn primary" data-act="save" type="button">Kaydet</button></div>`);
    const fillTopics = () => { card.querySelector('#ht-topics').innerHTML = topicsFor(card.querySelector('[data-f="subject"]').value).map((t) => `<option value="${U.esc(t)}">`).join(''); };
    fillTopics();
    card.querySelector('[data-f="subject"]').addEventListener('change', fillTopics);
    card.addEventListener('click', async (e) => {
      const rb = e.target.closest('[data-reason]');
      if (rb) { reason = rb.dataset.reason; card.querySelectorAll('[data-reason]').forEach((b) => b.classList.toggle('active', b === rb)); return; }
      const act = e.target.closest('[data-act]') && e.target.closest('[data-act]').dataset.act;
      if (act === 'cancel') { URL.revokeObjectURL(prev); App.closeModal(); }
      if (act !== 'save') return;
      const subjectId = card.querySelector('[data-f="subject"]').value;
      const topic = card.querySelector('[data-f="topic"]').value.trim();
      const note = card.querySelector('[data-f="note"]').value.trim();
      e.target.disabled = true;
      try {
        const [item] = await Depo.addFiles([file], { subjectId, kind: 'hata', note: topic, title: `Hata · ${topic || Store.subject(subjectId).name} · ${today()}.jpg` });
        D().mistakes.push({ id: U.uid(), fileId: item.id, subjectId, topic, reason, note, created: Date.now(), box: 1, due: U.dateKey(U.addDays(new Date(), 1)), rights: 0 });
        App.save();
        URL.revokeObjectURL(prev);
        App.closeModal(); render(); App.refreshHome();
        App.toast('❌', 'Hata defterine eklendi', 'Yarın yeniden çözmen için karşına çıkacak');
      } catch (err) { e.target.disabled = false; App.toast('⚠️', 'Kaydedilemedi', err.message); }
    });
  }

  function review(list) {
    if (!list.length) return;
    let i = 0, right = 0, url = '';
    const card = App.openModal('<div class="review ht-review"></div>');
    const box = card.querySelector('.review');
    async function show(reveal) {
      const m = list[i];
      const item = D().files.find((f) => f.id === m.fileId);
      const r = REASONS[m.reason] || REASONS.bilgi;
      box.innerHTML = `<div class="review-top"><span class="muted small">${i + 1}/${list.length} · ${U.esc(m.subjectId ? Store.subject(m.subjectId).name : 'Genel')} · ${U.esc(m.topic || '')}</span><button class="icon-btn" data-act="close" type="button" title="Kapat">✕</button></div>
        <div class="ht-img">${url ? `<img src="${url}" alt="Soru">` : item ? '<div class="vw-msg">Soru yükleniyor…</div>' : '<div class="vw-msg">📷 Bu sorunun fotoğrafı bu cihazda bulunamadı (yedekten geldiyse fotoğraflar yedeğe dahil değildir). Notun ve tekrar sırası duruyor.</div>'}</div>
        <p class="hint">Önce kendin çöz, sonra kontrol et. Geçen sefer: ${r[0]} ${r[1]}</p>
        ${reveal ? `<div class="flash-back">${m.note ? U.esc(m.note).replace(/\n/g, '<br>') : '<span class="muted">Not eklememişsin.</span>'}</div>` : ''}
        <div class="review-actions">${reveal
          ? '<button class="btn soft big" data-act="no" type="button">Yine zorlandım ❌</button><button class="btn primary big" data-act="yes" type="button">Doğru çözdüm ✅</button>'
          : `<button class="btn primary big" data-act="flip" type="button">Notu / cevabı göster</button>`}</div>`;
      if (!url && item) {
        try { const blob = await Depo.getBlob(item); if (list[i] === m) { url = URL.createObjectURL(blob); show(reveal); } } catch (e) {
          const el = box.querySelector('.ht-img');
          if (el) el.innerHTML = `<div class="vw-msg">${e instanceof Depo.NeedAuth ? '☁️ Fotoğraf Drive’da; Notlar → Kütüphane’dan bağlantıyı yenile.' : '⚠️ ' + U.esc(e.message)}</div>`;
        }
      }
    }
    function next() {
      if (url) URL.revokeObjectURL(url);
      url = '';
      i++;
      if (i >= list.length) {
        box.innerHTML = `<div class="badge-pop"><div class="bp-emoji">🧠</div><h3>Tekrar bitti!</h3><p class="bp-msg">${list.length} sorunun ${right} tanesini doğru çözdün. ${right === list.length ? 'Kusursuz! 🌟' : 'Zorlandıkların birkaç gün sonra yine gelecek; her deneme öğrenmeyi derinleştirir 💪'}</p><button class="btn primary" data-act="close" type="button">Harika 💛</button></div>`;
        App.refreshHome();
        return;
      }
      show(false);
    }
    box.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]') && e.target.closest('[data-act]').dataset.act;
      if (!act) return;
      if (act === 'close') { if (url) URL.revokeObjectURL(url); App.closeModal(); render(); return; }
      if (act === 'flip') return show(true);
      const m = list[i];
      D().stats.mistakeReviews = (D().stats.mistakeReviews || 0) + 1;
      if (act === 'yes') {
        right++;
        m.rights = (m.rights || 0) + 1;
        m.box = Math.min(5, m.box + 1);
        if (m.box >= 5) { m.learnedAt = Date.now(); D().stats.mistakesLearned = (D().stats.mistakesLearned || 0) + 1; }
      } else m.box = 1;
      m.last = Date.now();
      if (m.box < 5) m.due = U.dateKey(U.addDays(new Date(), INTERVAL[m.box]));
      App.save();
      next();
    });
    show(false);
  }

  function bind() {
    const host = $('#notes-root');
    host.addEventListener('click', (e) => {
      if (!e.target.closest('#hata-root')) return;
      const b = e.target.closest('button, .hata-item');
      if (!b) return;
      if (b.dataset.ht === 'review') return review(due());
      if (b.dataset.ht === 'learned') { showLearned = !showLearned; render(); return; }
      if (b.classList.contains('hata-item')) {
        const m = D().mistakes.find((x) => x.id === b.dataset.id);
        if (m) manage(m);
      }
    });
    host.addEventListener('change', (e) => {
      const t = e.target;
      if (!t.closest('#hata-root') || !t.files || !t.files[0]) return;
      const f = t.files[0];
      t.value = '';
      addForm(f);
    });
  }
  // tek soruyu yeniden çöz / sil
  function manage(m) {
    const card = App.openModal(`<h3>❌ ${U.esc(m.topic || 'Hata sorusu')}</h3>
      <p class="muted small">${U.esc(m.subjectId ? Store.subject(m.subjectId).name : 'Genel')} · ${(REASONS[m.reason] || REASONS.bilgi).slice(0, 2).join(' ')} · ${m.box >= 5 ? 'öğrenildi' : m.box + '. kutu'}</p>
      ${m.note ? `<p>${U.esc(m.note)}</p>` : ''}
      <div class="modal-actions"><button class="btn danger" data-act="del" type="button">Sil</button><span style="flex:1"></span>
        <button class="btn soft" data-act="cancel" type="button">Kapat</button><button class="btn primary" data-act="solve" type="button">Şimdi çöz ▶</button></div>`);
    card.addEventListener('click', async (e) => {
      const act = e.target.closest('[data-act]') && e.target.closest('[data-act]').dataset.act;
      if (act === 'cancel') App.closeModal();
      if (act === 'solve') { App.closeModal(); review([m]); }
      if (act === 'del' && confirm('Bu soru hata defterinden silinsin mi? (Fotoğrafı Kütüphane’de kalır)')) {
        D().mistakes = D().mistakes.filter((x) => x.id !== m.id);
        App.save(); App.closeModal(); render(); App.refreshHome();
      }
    });
  }

  return {
    init(app) { App = app; bind(); },
    render,
    dueCount: () => due().length,
    REASONS,
  };
})();

if (typeof window !== 'undefined') { window.HataUI = HataUI; }
