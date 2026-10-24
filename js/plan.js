/* YKS: geri sayım, alan seçimi, ipucu ve konu takibi. Planlar elle yazılır (planlar.js). */

const PlanUI = (() => {
  let App = null;
  const openSubjects = new Set(); // açık konu listeleri (yeniden çizimde korunur)
  const $ = (s, el = document) => el.querySelector(s);
  const D = () => Store.data;
  const Y = () => D().yks;

  const STATUS = [
    { icon: '○', label: 'Başlamadım' },
    { icon: '📖', label: 'Çalışıyorum' },
    { icon: '🔁', label: 'Tekrar' },
    { icon: '✅', label: 'Tamam' },
  ];

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
  // kaynak bağlantısının okunur adı: "site.com · tyt fizik konulari"
  function srcLabel(u) {
    try {
      const x = new URL(u);
      const tail = decodeURIComponent(x.pathname).split('/').filter(Boolean).pop() || '';
      return x.hostname.replace(/^www\./, '') + (tail ? ' · ' + tail.replace(/\.(html?|php)$/, '').replace(/[-_]+/g, ' ').slice(0, 60) : '');
    } catch (e) { return u; }
  }

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

      <h2 class="section-title">📚 Konu takibi</h2>
      <p class="hint">Konuya dokunarak durumunu değiştir: ○ başlamadım → 📖 çalışıyorum → 🔁 tekrar → ✅ tamam. Sayılar, o konudan YKS'de ortalama kaç soru geldiğini gösterir.</p>
      ${subjectsHtml(field)}
      ${YKS.SOURCES.length ? `<details class="sources"><summary class="hint">Soru dağılımı kaynakları (${YKS.SOURCES.length})</summary><ul class="small">${YKS.SOURCES.filter((u) => /^https:\/\//.test(u)).map((u) => `<li><a href="${U.esc(u)}" target="_blank" rel="noopener noreferrer">${U.esc(srcLabel(u))}</a></li>`).join('')}</ul></details>` : ''}`;
  }

  function subjectsHtml(field) {
    const eks = window.Deneme ? Deneme.eksikCounts(6) : {};
    const group = (exam) => YKS.subjectKeys(field).filter((k) => YKS.SUBJECTS[k].exam === exam);
    const exams = ['TYT', 'AYT', 'YDT'].filter((e) => group(e).length);
    return exams.map((ex) => `<h3 class="sub-h">${ex}</h3><div class="grid">${group(ex).map((k) => subjCard(k, eks)).join('')}</div>`).join('');
  }
  function subjCard(k, eks) {
    const s = YKS.SUBJECTS[k];
    const p = YKS.subjectProgress(k);
    const sid = App.subjectFor(k);
    const color = (sid && Store.subject(sid).color) || 'var(--violet)';
    const pct = Math.round(p.pct * 100);
    return `<div class="card subj-card" data-k="${k}">
      <div class="subj-head"><b>${U.esc(s.name)}</b><span class="muted small">${s.total} soru</span><span class="pct">%${pct}</span></div>
      <div class="track"><i style="width:${pct}%;background:${color}"></i></div>
      <details class="topics" ${openSubjects.has(k) ? 'open' : ''}><summary>${p.done}/${p.count} konu tamam · ≈${p.questionsCovered} soru hazır</summary>
        <ul class="topic-list">${s.topics.map((t) => topicRow(t, eks[t.id] || 0)).join('')}</ul>
      </details>
    </div>`;
  }
  function topicRow(t, e) {
    const st = YKS.status(t.id);
    return `<li class="topic-row" data-id="${t.id}">
      <button class="topic-status" data-s="${st}" title="${STATUS[st].label}" aria-label="${U.esc(t.name)}: ${STATUS[st].label}">${STATUS[st].icon}</button>
      <span class="topic-name">${U.esc(t.name)}${t.d ? `<small class="muted"> · ${U.esc(t.d)}</small>` : ''}</span>
      <span class="topic-badges"><span class="q-badge" title="YKS'de ortalama soru">≈${U.num(t.avg)}</span>${e ? `<span class="eksik-badge">${e}× eksik</span>` : ''}</span>
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
      if (b.classList.contains('topic-status')) {
        const row = b.closest('.topic-row');
        const id = row.dataset.id;
        const next = (YKS.status(id) + 1) % 4;
        YKS.setStatus(id, next);
        b.dataset.s = next;
        b.textContent = STATUS[next].icon;
        b.title = STATUS[next].label;
        // sadece ilgili ders kartını güncelle (tüm sayfayı yeniden çizme)
        const card = b.closest('.subj-card');
        const k = card.dataset.k;
        const p = YKS.subjectProgress(k);
        const pct = Math.round(p.pct * 100);
        card.querySelector('.pct').textContent = `%${pct}`;
        card.querySelector('.track i').style.width = pct + '%';
        card.querySelector('summary').textContent = `${p.done}/${p.count} konu tamam · ≈${p.questionsCovered} soru hazır`;
        const pr = YKS.progress();
        const ov = root.querySelector('.overall');
        if (ov) {
          ov.querySelector('.track i').style.width = Math.round(pr.pct * 100) + '%';
          ov.querySelector('span').innerHTML = `Konular <b>%${Math.round(pr.pct * 100)}</b> hazır · YKS'de ≈ <b>${pr.questionsCovered}</b>/${pr.questions} soruya denk`;
        }
        if (next === 3) App.sayText(U.pick([`${YKS.topic(id).name} tamam! ✅`, 'Bir konu daha bitti, harikasın 🌟', 'Konu listesi kısalıyor, sen büyüyorsun 💪']));
        App.refreshHome();
      }
    });
    root.addEventListener('toggle', (ev) => {
      const card = ev.target.closest && ev.target.closest('.subj-card');
      if (!card || !ev.target.matches('details.topics')) return;
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

