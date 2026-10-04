/* YKS planı: geri sayım, alan seçimi, haftalık program, bugünün planı ve konu takibi.
   Program hafta başında bir kez üretilir ve hafta boyunca sabit kalır (her açılışta karışmasın). */

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

  // ---------- Tohumlu rastgele (aynı hafta = aynı plan) ----------
  function rng(seedStr) {
    let h = 2166136261;
    for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => {
      h += 0x6D2B79F5;
      let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const monday = (d) => U.addDays(U.dayStart(d), -((new Date(d).getDay() + 6) % 7));

  // Günlük rutinler (alan bazlı) — her gün kısa, düzenli soru çözümü
  function routines(field) {
    if (field === 'DIL') {
      return [
        { kind: 'routine', yksKey: 'ydt', title: '📚 30 kelime tekrarı + 1 okuma parçası', minutes: 30 },
        { kind: 'routine', yksKey: 'tyt_tr', title: '📖 15 paragraf sorusu', minutes: 25 },
      ];
    }
    return [
      { kind: 'routine', yksKey: 'tyt_tr', title: '📖 20 paragraf sorusu', minutes: 30 },
      { kind: 'routine', yksKey: 'tyt_mat', title: field === 'SOZ' ? '➗ 10 problem sorusu' : '➗ 15 problem sorusu', minutes: 30 },
    ];
  }

  // Konu önceliği: YKS soru ağırlığı × durum × deneme eksikleri × son günlerde çalışılmamış olması
  // Her gün rutin olarak çalışılan konular (programda ayrıca konu bloğu olmasın)
  const ROUTINE_TOPICS = new Set(['tyt_tr:paragraf', 'tyt_mat:problemler']);

  function scoreTopics(field, ph) {
    const eks = window.Deneme ? Deneme.eksikCounts(6) : {};
    const since = Date.now() - 7 * 864e5;
    const studied = {}; // çalışma dersi → dakika (son 7 gün)
    for (const s of D().sessions) if (s.start >= since) studied[s.subjectId] = (studied[s.subjectId] || 0) + s.minutes;
    const late = ph && (ph.key === 'deneme' || ph.key === 'son');
    const out = [];
    for (const k of YKS.subjectKeys(field)) {
      const sid = App.subjectFor(k);
      const fresh = !studied[sid];
      for (const t of YKS.SUBJECTS[k].topics) {
        if (ROUTINE_TOPICS.has(t.id) && field !== 'DIL') continue;
        const s = YKS.status(t.id);
        let f = [1, 1.15, 0.6, 0.12][s];
        if (late) f *= s === 0 ? 0.45 : s >= 2 ? 1.5 : 1;
        if (ph && ph.key === 'temel' && s === 0) f *= 1.2;
        const e = eks[t.id] || 0;
        if (e) f *= 1 + 0.7 * Math.min(e, 3);
        if (fresh) f *= 1.25;
        out.push({ t, s, e, w: Math.max(t.avg, 0.3) * f });
      }
    }
    return out;
  }

  function blockTitle(x) {
    if (x.e) return `${x.t.name} — eksik kapat + 20 soru`;
    if (x.s === 0) return `${x.t.name} — konu çalış + 20 soru`;
    if (x.s === 1) return `${x.t.name} — devam + 25 soru`;
    return `${x.t.name} — tekrar + 15 soru`;
  }

  // Bir haftalık program (Pzt..Paz). Aynı konu hafta içinde tekrar etmez, dersler dönüşümlü.
  function generateWeek(field, weekKey, salt) {
    const rand = rng(`${weekKey}|${field}|${salt}`);
    const days = YKS.daysLeft();
    const ph = phase(days);
    const goal = D().settings.dailyGoal || 180;
    const nTopics = goal >= 240 ? 4 : goal >= 180 ? 3 : goal >= 100 ? 2 : 1;
    const scored = scoreTopics(field, ph);
    const used = new Set();
    let prevSubjects = new Set();
    const hasAyt = !!(YKS.FIELDS[field] && YKS.FIELDS[field].ayt.length);
    const weekNo = Math.floor(new Date(weekKey + 'T12:00:00').getTime() / (7 * 864e5));
    const out = [];
    for (let i = 0; i < 7; i++) {
      const date = U.dateKey(U.addDays(new Date(weekKey + 'T12:00:00'), i));
      const items = [];
      const isSunday = i === 6;
      const midDeneme = i === 2 && ph && (ph.key === 'deneme' || ph.key === 'son') && hasAyt;
      if (isSunday || midDeneme) {
        const second = field === 'DIL' ? 'YDT' : 'AYT';
        const type = midDeneme ? second : (hasAyt && weekNo % 2 ? second : 'TYT');
        items.push({ kind: 'deneme', yksKey: type === 'TYT' ? 'tyt_tr' : YKS.FIELDS[field].ayt[0], title: `📝 ${type} denemesi + analiz`, sub: 'Sınav süresinde çöz, sonra yanlış ve boşları Deneme sekmesine işle', minutes: type === 'TYT' ? 165 : type === 'YDT' ? 120 : 180 });
        if (isSunday) items.push({ kind: 'routine', yksKey: 'tyt_tr', title: '🌿 Haftanın tekrarı: işaretlediğin konulara 20 dk göz at', minutes: 20 });
      } else {
        for (const r of routines(field)) items.push({ ...r });
        // ders çeşitliliği: aynı gün aynı çalışma dersinden ikinci konu yok, dünkü derslere hafif ceza
        const todaySubjects = new Set();
        const cand = scored
          .filter((x) => !used.has(x.t.id))
          .map((x) => {
            const sid = App.subjectFor(x.t.subjectKey) || x.t.subjectKey;
            return { ...x, sid, r: x.w * (prevSubjects.has(sid) ? 0.7 : 1) * (0.9 + rand() * 0.2) };
          })
          .sort((a, b) => b.r - a.r);
        for (const x of cand) {
          if (items.filter((it) => it.kind === 'topic').length >= nTopics) break;
          if (todaySubjects.has(x.sid)) continue;
          todaySubjects.add(x.sid);
          used.add(x.t.id);
          items.push({ kind: 'topic', yksKey: x.t.subjectKey, topicId: x.t.id, title: blockTitle(x), sub: `${YKS.SUBJECTS[x.t.subjectKey].name} · YKS'de ≈${x.t.avg} soru${x.e ? ` · ${x.e}× denemede eksik` : ''}`, minutes: 50 });
        }
        prevSubjects = todaySubjects;
      }
      items.forEach((it, j) => { it.key = `${i}-${j}`; });
      out.push({ date, items });
    }
    return out;
  }

  function week(force) {
    const field = Y().field;
    if (!field) return null;
    const wk = U.dateKey(monday(new Date()));
    const c = Y().planCache;
    const goal = D().settings.dailyGoal;
    if (!force && c && c.week === wk && c.field === field && c.goal === goal && Array.isArray(c.days)) return c.days;
    const salt = force ? ((c && c.salt) || 0) + 1 : 0;
    const days = generateWeek(field, wk, salt);
    Y().planCache = { week: wk, field, goal, salt, days };
    // eski "yapıldı" kayıtlarını temizle (sınırsız büyümesin)
    const cut = U.dateKey(U.addDays(new Date(), -21));
    for (const k of Object.keys(Y().planDone)) if (k < cut) delete Y().planDone[k];
    App.save();
    return days;
  }
  function todayItems() {
    const w = week();
    if (!w) return null;
    const k = U.dateKey(new Date());
    const d = w.find((x) => x.date === k);
    return d ? d.items : [];
  }
  const doneSet = (date) => new Set(Y().planDone[date] || []);
  function toggleDone(date, key, on) {
    const s = doneSet(date);
    on ? s.add(key) : s.delete(key);
    Y().planDone[date] = [...s];
    App.save();
  }

  // ---------- Ana sayfadaki "Bugünün planı" ----------
  function itemHtml(it, done) {
    const sub = YKS.SUBJECTS[it.yksKey];
    const sid = App.subjectFor(it.yksKey);
    const color = (sid && Store.subject(sid).color) || 'var(--violet)';
    return `<li class="plan-item ${done ? 'done' : ''}" data-key="${it.key}">
      <span class="plan-dot" style="background:${color}"></span>
      <div><div class="plan-text">${U.esc(it.title)}</div><div class="plan-sub">${U.esc(it.sub || (sub ? sub.name : ''))}${it.minutes ? ` · ~${it.minutes} dk` : ''}</div></div>
      <span class="plan-acts">
        <input type="checkbox" class="check" ${done ? 'checked' : ''} aria-label="Yapıldı">
        ${done ? '' : '<button class="plan-go" data-act="go">Başla ▶</button>'}
      </span>
    </li>`;
  }
  function renderToday(el) {
    if (!el) return;
    if (!Y().field) {
      el.innerHTML = `<h2>🗓️ Bugünün planı</h2>
        <p class="muted">Alanını seçersen YKS'deki soru ağırlıklarına göre sana özel günlük plan hazırlarım.</p>
        <button class="btn primary" data-act="to-plan">YKS planımı oluştur ✨</button>`;
      return;
    }
    const items = todayItems() || [];
    const k = U.dateKey(new Date());
    const done = doneSet(k);
    const n = items.filter((it) => done.has(it.key)).length;
    const best = App.bestHours()[0];
    el.innerHTML = `<h2>🗓️ Bugünün planı <span class="muted small">${n}/${items.length}</span></h2>
      ${items.length ? `<ul class="plan-list" data-date="${k}">${items.map((it) => itemHtml(it, done.has(it.key))).join('')}</ul>` : '<p class="plan-empty">Bugün için plan yok.</p>'}
      ${n === items.length && items.length ? '<p class="hint">Bugünün planı tamam! Harikasın 🌟</p>' : best != null ? `<p class="hint">💡 En verimli saatin ${U.pad(best)}:00 civarı; zor konuyu o saate koy.</p>` : ''}`;
  }

  // ---------- Plan sekmesi ----------
  function render() {
    const root = $('#plan-root');
    if (!root) return;
    const field = Y().field;
    if (!field) {
      root.innerHTML = `<div class="card yks-head">
        <h2>🌟 YKS planını oluşturalım</h2>
        <p class="muted">Alanını seç; konuları ve YKS'de her konudan ortalama kaç soru geldiğini göstereyim, haftalık programını hazırlayayım.</p>
        <div class="field-pick">${Object.keys(YKS.FIELDS).map((k) => `<button class="btn soft" data-field="${k}"><b>${YKS.FIELDS[k].short}</b><small>${YKS.FIELDS[k].name}</small></button>`).join('')}</div>
      </div>`;
      return;
    }
    const days = YKS.daysLeft();
    const ph = phase(days);
    const prog = YKS.progress(field);
    const w = week() || [];
    const todayK = U.dateKey(new Date());
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
          ${!Y().examDate && YKS.DATE_NOTE ? `<p class="hint">${U.esc(YKS.DATE_NOTE)}</p>` : ''}
          ${ph ? `<p class="phase-note"><b>${ph.name}:</b> ${ph.text}</p>` : ''}
          <div class="overall"><div class="track"><i style="width:${Math.round(prog.pct * 100)}%"></i></div>
            <span class="small">Konuların <b>%${Math.round(prog.pct * 100)}</b>'i hazır · YKS'de ≈ <b>${prog.questionsCovered}</b>/${prog.questions} soruya denk</span></div>
        </div>
      </div>

      <div class="grid">
        <div class="card today-plan">${''}</div>
        <div class="card tip">
          <h2>💡 Günün ipucu</h2>
          <p>${U.esc(tip)}</p>
          ${YKS.GUIDANCE.dailyRoutines.length ? `<details class="topics"><summary>Her gün küçük alışkanlıklar</summary><ul class="insights">${YKS.GUIDANCE.dailyRoutines.slice(0, 6).map((x) => `<li>${U.esc(x)}</li>`).join('')}</ul></details>` : ''}
        </div>
        <div class="card wide-card">
          <h2>📅 Bu haftanın programı <button class="btn soft small-btn" data-act="regen" title="Bu haftayı yeniden oluştur">↻ Yenile</button></h2>
          <div class="week-grid">${w.map((d) => dayHtml(d, d.date === todayK)).join('')}</div>
          <p class="hint">Program; konuların YKS'deki soru ağırlığına, işaretlediğin durumlara ve denemelerdeki eksiklerine göre hazırlanır. Pazar günleri deneme günü.</p>
        </div>
      </div>

      <h2 class="section-title">📚 Konu takibi</h2>
      <p class="hint">Konuya dokunarak durumunu değiştir: ○ başlamadım → 📖 çalışıyorum → 🔁 tekrar → ✅ tamam. Sayılar, o konudan YKS'de ortalama kaç soru geldiğini gösterir.</p>
      ${subjectsHtml(field)}
      ${YKS.SOURCES.length ? `<details class="sources"><summary class="hint">Soru dağılımı kaynakları</summary><ul class="small">${YKS.SOURCES.map((u) => `<li>${U.esc(u)}</li>`).join('')}</ul></details>` : ''}`;
    renderToday(root.querySelector('.today-plan'));
  }

  function dayHtml(d, isToday) {
    const dt = new Date(d.date + 'T12:00:00');
    const done = doneSet(d.date);
    return `<div class="day-col ${isToday ? 'today' : ''}">
      <div class="day-name">${U.DAYS_SHORT[dt.getDay()]} <span class="muted small">${dt.getDate()}</span></div>
      ${d.items.filter((it) => it.kind !== 'routine' || it.title.startsWith('🌿')).map((it) => {
        const sid = App.subjectFor(it.yksKey);
        const color = (sid && Store.subject(sid).color) || 'var(--violet)';
        return `<div class="block ${it.kind === 'deneme' ? 'deneme' : ''} ${done.has(it.key) ? 'done' : ''}" style="border-left-color:${color}">${U.esc(it.title.replace(/ — .*/, ''))}</div>`;
      }).join('')}
    </div>`;
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
      <span class="topic-badges"><span class="q-badge" title="YKS'de ortalama soru">≈${t.avg}</span>${e ? `<span class="eksik-badge">${e}× eksik</span>` : ''}</span>
    </li>`;
  }

  function dailyTip() {
    const G = YKS.GUIDANCE;
    const all = [].concat(G.techniques || [], G.wellbeing || [], G.deneme || []);
    if (!all.length) return 'Kısa ve düzenli oturumlar, uzun ve seyrek olanlardan daha etkilidir 🐾';
    const day = Math.floor(U.dayStart(new Date()).getTime() / 864e5);
    return all[day % all.length];
  }

  // Bir oturum bittiğinde, bugünün planında aynı hedefle başlatılan madde yapıldı sayılır
  function onSession(session) {
    if (!Y().field || !session.intent) return;
    const items = todayItems() || [];
    const it = items.find((x) => x.title === session.intent);
    if (it) toggleDone(U.dateKey(new Date()), it.key, true);
  }

  // ---------- Olaylar ----------
  function onPlanClick(ev) {
    const b = ev.target.closest('button, input.check');
    if (!b) return;
    const li = b.closest('.plan-item');
    if (li) {
      const date = li.closest('.plan-list').dataset.date;
      const items = todayItems() || [];
      const it = items.find((x) => x.key === li.dataset.key);
      if (!it) return;
      if (b.classList.contains('check')) {
        toggleDone(date, it.key, b.checked);
        if (b.checked) App.sayText(U.pick(['Plandan bir madde daha tamam! ✅', 'Tik! Harika gidiyorsun 🐾', 'Bir adım daha 🌟']));
        App.refreshHome();
        if ($('#tab-plan').classList.contains('active')) render();
      } else if (b.dataset.act === 'go') {
        App.startStudy({ subjectId: App.subjectFor(it.yksKey), intent: it.title, kind: it.kind === 'deneme' ? 'free' : null });
      }
      return;
    }
    if (b.dataset.act === 'to-plan') App.showTab('plan');
  }

  function bind() {
    $('#today-plan').addEventListener('click', onPlanClick);
    const root = $('#plan-root');
    root.addEventListener('click', (ev) => {
      if (ev.target.closest('.today-plan')) return onPlanClick(ev);
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.dataset.field) {
        const first = !Y().field;
        Y().field = b.dataset.field;
        App.save();
        App.applyFieldSubjects(b.dataset.field);
        render();
        App.refreshHome();
        if (first) App.sayText(`Harika! ${YKS.FIELDS[b.dataset.field].name} planın hazır 🌟 Her gün küçük adımlarla ilerleyeceğiz.`);
        return;
      }
      if (b.dataset.act === 'regen') { week(true); render(); App.refreshHome(); return; }
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
          ov.querySelector('span').innerHTML = `Konuların <b>%${Math.round(pr.pct * 100)}</b>'i hazır · YKS'de ≈ <b>${pr.questionsCovered}</b>/${pr.questions} soruya denk`;
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
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { Y().examDate = v; App.save(); render(); App.refreshHome(); }
    });
  }

  return {
    init(app) { App = app; bind(); },
    render,
    renderToday,
    onSession,
    phase,
  };
})();

// app.js varlık kontrolü için (üst düzey const window'a eklenmez)
if (typeof window !== 'undefined') { window.PlanUI = PlanUI; }
