/* YKS: geri sayım, alan seçimi, ipucu ve konu takibi. Planlar elle yazılır (planlar.js). */

const PlanUI = (() => {
  let App = null;
  const openSubjects = new Set(); // açık konu listeleri (yeniden çizimde korunur)
  const $ = (s, el = document) => el.querySelector(s);
  const D = () => Store.data;
  const Y = () => D().yks;

  // Konu takibi: konunun yanındaki kutu. Dokun: ✓ bitti (üstü çizilir) → − yarım → boş. İstenirse konuya not.
  // Bitti konular plan eklerken konu listesinde çıkmaz (planlar-ui).
  const DURUM = { tam: { icon: '✓', label: 'bitti' }, yarim: { icon: '−', label: 'yarım' } };
  const SIRA = { '': 'tam', tam: 'yarim', yarim: '' };
  const openNotes = new Set(); // not kutusu açık konular

  // ---------- Dönem (sınava kalan güne göre) ----------
  function phase(days) {
    if (days == null) return null;
    if (days > 240) return { key: 'temel', name: 'Temel atma dönemi', text: 'Konuları sağlam öğrenme zamanı. Her gün az da olsa soru çöz; deneme ayda 2-3 yeter.' };
    if (days > 120) return { key: 'konu', name: 'Konu + soru dönemi', text: 'Konuları bitirirken bol soru çöz. Haftada bir TYT denemesi ritmi yakalatır.' };
    if (days > 60) return { key: 'pekistir', name: 'Pekiştirme dönemi', text: 'Eksik konuları kapat, tekrarları sıklaştır. Haftada 1-2 deneme ve mutlaka analiz.' };
    if (days > 14) return { key: 'deneme', name: 'Deneme ve tekrar dönemi', text: 'Yeni konudan çok tekrar ve deneme. Her denemenin eksiklerini aynı hafta kapat.' };
    if (days >= 0) return { key: 'son', name: 'Son düzlük', text: 'Yeni konu yok; hafif tekrar, sınav saatinde deneme ve düzenli uyku. Sen hazırsın 💛' };
    return null;
  }

  const fmtDay = (iso) => { const d = new Date(iso + 'T12:00:00'); return isNaN(d) ? iso : `${d.getDate()} ${U.MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

  // ---------- Plan sekmesi ----------
  function render() {
    const root = $('#plan-root');
    if (!root) return;
    const field = Y().field;
    if (!field) {
      root.innerHTML = `<div class="card yks-head">
        <h2>🌟 YKS planını oluşturalım</h2>
        <p class="muted">Alanını seç; konuları ve YKS'de her konudan ortalama kaç soru geldiğini göstereyim. Planını yukarıdaki Planlarım bölümünde kendin yazarsın 🐾</p>
        <div class="field-pick">${Object.keys(YKS.FIELDS).map((k) => `<button class="btn soft" data-field="${k}"><b>${YKS.FIELDS[k].short}</b><small>${YKS.FIELDS[k].name}</small></button>`).join('')}</div>
      </div>`;
      return;
    }
    const days = YKS.daysLeft();
    const ph = phase(days);
    const prog = YKS.progress(field);
    const tip = dailyTip();

    root.innerHTML = `
      <div class="card yks-head">
        <div class="yks-count">
          <div class="count-num">${days != null && days >= 0 ? days : '—'}</div>
          <div class="count-label">YKS'ye kalan gün</div>
        </div>
        <div class="yks-controls">
          <div class="seg" data-role="field">${Object.keys(YKS.FIELDS).map((k) => `<button data-field="${k}" class="${k === field ? 'active' : ''}">${YKS.FIELDS[k].short}</button>`).join('')}</div>
          <label class="yks-date">Sınav tarihi <input type="date" data-f="exam" value="${YKS.examDate()}"></label>
          ${YKS.customDate() ? `<p class="hint">Kendi seçtiğin tarih. <button class="link-btn" data-act="exam-official">Resmi tarihe dön (${fmtDay(YKS.officialDate())})</button></p>` : `<p class="hint">${U.esc(YKS.dateNote())}</p>`}
          ${ph ? `<p class="phase-note"><b>${ph.name}:</b> ${ph.text}</p>` : ''}
          <div class="overall"><div class="track"><i style="width:${Math.round(prog.pct * 100)}%"></i></div>
            <span class="small">Konular <b>%${Math.round(prog.pct * 100)}</b> hazır · YKS'de ≈ <b>${prog.questionsCovered}</b>/${prog.questions} soruya denk</span></div>
        </div>
      </div>

      <div class="grid">
        <div class="card tip wide-card">
          <h2>💡 Günün ipucu</h2>
          <p>${U.esc(tip)}</p>
          ${YKS.GUIDANCE.dailyRoutines.length ? `<details class="topics"><summary>Her gün küçük alışkanlıklar</summary><ul class="insights">${YKS.GUIDANCE.dailyRoutines.slice(0, 6).map((x) => `<li>${U.esc(x)}</li>`).join('')}</ul></details>` : ''}
        </div>
      </div>

      ${kapakHtml(field)}
      ${subjectsHtml(field)}`;
  }

  // ---------- Konu takibinin kapağı: gece zambak bahçesinde uyuyan beyaz kedi (assets/konu/kapak.webp); ortadaki boş gökte toplam ilerleme ----------
  function toplam(field) {
    let done = 0, half = 0, count = 0;
    for (const k of YKS.subjectKeys(field)) { const p = YKS.subjectProgress(k); done += p.done; half += p.half; count += p.count; }
    return { done, half, count, pct: count ? Math.round(((done + half / 2) / count) * 100) : 0 };
  }
  const kapakSayi = (t) => `<div class="kk-num">%${t.pct}</div>
      <div class="kk-bar" aria-hidden="true"><i style="width:${t.count ? ((t.done + t.half / 2) / t.count) * 100 : 0}%"></i></div>
      <p class="kk-sub">${t.done}/${t.count} konu bitti${t.half ? ` · ${t.half} yarım` : ''}</p>`;
  function kapakHtml(field) {
    return `<section class="kt-kapak" aria-label="Konu takibi">
      <div class="kk-ic">
        <h2 class="kk-title">✦ Konu Takibi ✦</h2>
        <div class="kk-stat">${kapakSayi(toplam(field))}</div>
        <p class="kk-hint">Kutuya dokun: <b class="tam">✓ bitti</b> · bir daha <b class="yarim">− yarım</b> · bir daha boş</p>
      </div>
    </section>`;
  }

  // ---------- Ders kartlarının görselleri ----------
  // Her dersin başlığının sağında kendi piksel çizimi (assets/konu): Türkçe kütüphanede baykuş, Matematik tahta ve kedi,
  // AYT Fizik kara delik... Kartın zemin rengi ve yüzdenin rengi de o çizime göre. Görseli olmayan dersler en yakınını kullanır.
  const KONU_GORSEL = {
    tyt_tr: ['#170b2d', '#f26fb5'],
    tyt_mat: ['#02172e', '#f7c158'],
    tyt_geo: ['#060f34', '#f8d15a'],
    tyt_fiz: ['#090f31', '#61dbf6'],
    tyt_kim: ['#0b0f31', '#d196f3'],
    tyt_bio: ['#02192c', '#90f2c3'],
    tyt_tar: ['#1e0e23', '#f58262'],
    tyt_cog: ['#031337', '#71e3f7'],
    tyt_fel: ['#100f33', '#db8af0'],
    tyt_din: ['#0a1134', '#f8d65c'],
    ayt_mat: ['#100e2e', '#f8bf5b'],
    ayt_geo: ['#041239', '#f9e25d'],
    ayt_fiz: ['#020d31', '#61dff7'],
    ayt_kim: ['#100f33', '#df8eee'],
    ayt_bio: ['#01192b', '#8df1c4'],
  };
  const BENZER = { ayt_edb: 'tyt_tr', ayt_tar1: 'tyt_tar', ayt_tar2: 'tyt_tar', ayt_cog1: 'tyt_cog', ayt_cog2: 'tyt_cog', ayt_fel: 'tyt_fel', ayt_din: 'tyt_din', ydt: 'tyt_tr' };
  const gorselOf = (k) => (KONU_GORSEL[k] ? k : BENZER[k] || null);

  function subjectsHtml(field) {
    const group = (exam) => YKS.subjectKeys(field).filter((k) => YKS.SUBJECTS[k].exam === exam);
    const exams = ['TYT', 'AYT', 'YDT'].filter((e) => group(e).length);
    return exams.map((ex) => `<h3 class="sub-h kt-sinav">✦ ${ex} ✦</h3><div class="kt-stack">${group(ex).map((k) => subjCard(k)).join('')}</div>`).join('');
  }
  // Ders başlığı (dokununca konular açılır): ad, yüzde, kaç konu bitti, çubuk
  function cardTop(k) {
    const s = YKS.SUBJECTS[k], p = YKS.subjectProgress(k), n = p.count || 1;
    const bitti = p.count && p.done === p.count;
    const gk = gorselOf(k);
    return `${gk ? `<span class="kt-resim" aria-hidden="true" style="background-image:url('assets/konu/${gk}.webp')"></span>` : ''}<span class="kt-chev" aria-hidden="true">▸</span><b class="kt-title">${U.esc(s.name)}${bitti ? ' <span class="kt-bitti">🌸 tamamlandı</span>' : ''}</b><span class="kt-pct">%${Math.round(p.pct * 100)}</span>
      <span class="kt-meta">${p.done}/${p.count} konu bitti${p.half ? ` · ${p.half} yarım` : ''} · ${s.total} soru</span>
      <span class="kt-bar" aria-hidden="true"><i class="tam" style="width:${(p.done / n) * 100}%"></i><i class="yarim" style="width:${(p.half / n) * 100}%"></i></span>`;
  }
  function subjCard(k) {
    const s = YKS.SUBJECTS[k];
    const sid = App.subjectFor(k);
    const color = (sid && Store.subject(sid).color) || 'var(--violet)';
    const p = YKS.subjectProgress(k), gr = KONU_GORSEL[gorselOf(k)];
    return `<section class="card kt-card${p.count && p.done === p.count ? ' bitti' : ''}" data-k="${k}" style="--c:${U.esc(color)}${gr ? `;--zemin:${gr[0]};--yuzde:${gr[1]}` : ''}">
      <details class="kt-list" ${openSubjects.has(k) ? 'open' : ''}><summary class="kt-top">${cardTop(k)}</summary>
        <ul class="kt-ul">${s.topics.map(topicRow).join('')}</ul>
      </details>
    </section>`;
  }
  function topicRow(t) {
    const d = DURUM[YKS.durum(t.id)] ? YKS.durum(t.id) : '', n = YKS.not(t.id), open = openNotes.has(t.id);
    return `<li class="kt-row${d ? ' ' + d : ''}" data-id="${t.id}">
      <button type="button" class="kt-box" data-kt="kutu" aria-label="${U.esc(t.name)}${d ? ': ' + DURUM[d].label : ''}">${d ? DURUM[d].icon : ''}</button>
      <span class="kt-name">${U.esc(t.name)}${t.d ? `<small>${U.esc(t.d)}</small>` : ''}${n && !open ? `<span class="kt-note">${U.esc(n)}</span>` : ''}</span>
      <button type="button" class="kt-pen${n ? ' var' : ''}" data-kt="not" aria-expanded="${open}" aria-label="${U.esc(t.name)}: not">✎</button>
      ${open ? `<textarea class="kt-ta" maxlength="300" rows="2" placeholder="Örn: türev kuralları tamam, zincir kuralı tekrar" aria-label="${U.esc(t.name)} notu">${U.esc(n)}</textarea>` : ''}
    </li>`;
  }

  function dailyTip() {
    const G = YKS.GUIDANCE;
    const all = [].concat(G.techniques || [], G.wellbeing || [], G.deneme || []);
    if (!all.length) return 'Kısa ve düzenli oturumlar, uzun ve seyrek olanlardan daha etkilidir 🐾';
    const day = Math.floor(U.dayStart(new Date()).getTime() / 864e5);
    return all[day % all.length];
  }

  function bind() {
    const root = $('#plan-root');
    root.addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.dataset.act === 'exam-official') { Y().examDate = null; App.save(); render(); App.refreshHome(); return; }
      if (b.dataset.field) {
        const first = !Y().field;
        Y().field = b.dataset.field;
        App.save();
        App.applyFieldSubjects(b.dataset.field);
        render();
        App.refreshHome();
        if (first) App.sayText(`Harika! ${YKS.FIELDS[b.dataset.field].name} konuların hazır 🌟 Planını sen yaz, ben her akşam nasıl gittiğine birlikte bakarım 🐾`);
        return;
      }
      if (b.dataset.kt) {
        const row = b.closest('.kt-row'), id = row.dataset.id, card = b.closest('.kt-card');
        if (b.dataset.kt === 'not') {
          openNotes.has(id) ? openNotes.delete(id) : openNotes.add(id);
          row.outerHTML = topicRow(YKS.topic(id));
          const ta = root.querySelector(`.kt-row[data-id="${CSS.escape(id)}"] .kt-ta`);
          if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
          return;
        }
        const cur = YKS.durum(id), next = SIRA[DURUM[cur] ? cur : ''];
        YKS.setDurum(id, next);
        row.outerHTML = topicRow(YKS.topic(id));
        card.querySelector('summary.kt-top').innerHTML = cardTop(card.dataset.k);
        const p = YKS.subjectProgress(card.dataset.k);
        card.classList.toggle('bitti', !!p.count && p.done === p.count);
        const ks = root.querySelector('.kk-stat');
        if (ks) ks.innerHTML = kapakSayi(toplam(Y().field));
        if (next) { const box = root.querySelector(`.kt-row[data-id="${CSS.escape(id)}"] .kt-box`); if (box) box.classList.add('pop'); }
        const pr = YKS.progress();
        const ov = root.querySelector('.overall');
        if (ov) {
          ov.querySelector('.track i').style.width = Math.round(pr.pct * 100) + '%';
          ov.querySelector('span').innerHTML = `Konular <b>%${Math.round(pr.pct * 100)}</b> hazır · YKS'de ≈ <b>${pr.questionsCovered}</b>/${pr.questions} soruya denk`;
        }
        if (next === 'tam') App.sayText(U.pick([`${YKS.topic(id).name} bitti! ✅`, 'Bir konu daha bitti, harikasın 🌟', 'Konu listesi kısalıyor, sen büyüyorsun 💪']));
        App.refreshHome();
      }
    });
    // not yazdıkça kaydedilir; kutudan çıkınca not satırı olarak görünür
    root.addEventListener('input', (ev) => {
      const ta = ev.target.closest && ev.target.closest('.kt-ta');
      if (!ta) return;
      YKS.setNot(ta.closest('.kt-row').dataset.id, ta.value);
    });
    root.addEventListener('focusout', (ev) => {
      const ta = ev.target.closest && ev.target.closest('.kt-ta');
      if (!ta) return;
      const row = ta.closest('.kt-row'), id = row.dataset.id;
      YKS.setNot(id, ta.value);
      setTimeout(() => { // not düğmesine basılarak kapatılıyorsa onu bekle
        if (!openNotes.has(id) || !row.isConnected || row.contains(document.activeElement)) return;
        openNotes.delete(id);
        row.outerHTML = topicRow(YKS.topic(id));
      }, 150);
    });
    root.addEventListener('toggle', (ev) => {
      const card = ev.target.closest && ev.target.closest('.kt-card');
      if (!card || !ev.target.matches('details.kt-list')) return;
      ev.target.open ? openSubjects.add(card.dataset.k) : openSubjects.delete(card.dataset.k);
    }, true);
    root.addEventListener('change', (ev) => {
      if (ev.target.dataset.f !== 'exam') return;
      const v = ev.target.value;
      // resmi tarih seçilirse kendi tarihi sayılmaz: ÖSYM tarihi değişince geri sayım yine kendiliğinden güncellenir
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { Y().examDate = v === YKS.officialDate() ? null : v; App.save(); render(); App.refreshHome(); }
    });
  }

  return {
    init(app) { App = app; bind(); },
    render,
    phase,
  };
})();

// app.js varlık kontrolü için (üst düzey const window'a eklenmez)
if (typeof window !== 'undefined') { window.PlanUI = PlanUI; }

