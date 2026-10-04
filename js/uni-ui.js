/* Dönem ekranı (Plan sekmesi, üniversite / KPSS / yüksek lisans modunda) ve ana sayfadaki "bugün" kartı. */

const UniUI = (() => {
  let App = null;
  let lastSources = [];
  const $ = (s, el = document) => el.querySelector(s);
  const D = () => Store.data;
  const u = () => D().uni;
  const esc = (s) => U.esc(s);
  const K = Uni.EVENT_KINDS;
  const levelName = () => ({ uni: 'Üniversite', yl: 'Yüksek lisans', kpss: 'KPSS', diger: 'Program' }[D().settings.profile.level] || 'Program');
  const fmtDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' });
  const urg = (n) => (n == null ? '' : n <= 3 ? 'hot' : n <= 7 ? 'warm' : '');

  // ---------- Bölümler ----------
  function headHtml() {
    const p = D().settings.profile, x = u();
    const wk = Uni.weekOfTerm(), weeks = +x.weeks || 14;
    const nc = Uni.nextCalendar();
    const ncLeft = nc ? Uni.daysLeft(nc.date) : null;
    const school = Uni.isSchool();
    const sub = school ? [x.faculty, p.dept, p.year, x.term].filter(Boolean).map(esc).join(' · ') || 'Okul ve bölüm bilgilerini Ayarlar → Eğitim modu’ndan girebilirsin.'
      : [p.dept, x.term].filter(Boolean).map(esc).join(' · ') || 'Derslerin, konuların ve sınav tarihin burada; plan kendiliğinden oluşur.';
    return `<div class="card uni-head wide-card">
      <div class="uni-title"><div><h2>${D().settings.profile.level === 'kpss' ? '🏛️' : '🎓'} ${esc((school && x.school) || levelName())}</h2>
        <p class="muted small">${sub}</p></div>
        <div class="row"><button class="btn soft small-btn" data-u="ics" type="button" ${x.courses.length || x.events.length ? '' : 'disabled'}>📅 Telefon takvimine aktar</button></div></div>
      ${wk && wk <= weeks + 3 ? `<div class="term-bar" title="Dönem ilerlemesi"><i style="width:${Math.min(100, Math.round((wk / weeks) * 100))}%"></i><span>Dönemin ${Math.min(wk, weeks)}. haftası / ${weeks}</span></div>` : ''}
      ${nc ? `<p class="uni-next">${(Uni.CAL_KINDS[nc.kind] || Uni.CAL_KINDS.diger)[0]} <b>${esc(nc.title)}</b> ${ncLeft > 0 ? `· <span class="cd ${urg(ncLeft)}">${Uni.leftText(ncLeft)} kaldı</span>` : '· şu an'}</p>` : ''}
    </div>`;
  }
  function onboardHtml() {
    if (!Uni.isSchool()) {
      return `<div class="card wide-card uni-onboard">
        <h2>📚 Derslerini ekleyelim</h2>
        <p class="muted">Derslerini ve konularını ekle, sınav tarihini gir; geri sayımın ve tekrar planın kendiliğinden oluşsun.</p>
        <div class="uni-acts">
          ${D().settings.profile.level === 'kpss' ? '<button class="btn primary" data-u="kpss" type="button">🏛️ KPSS GY-GK derslerini ekle</button>' : ''}
          <button class="btn soft" data-u="add-course" type="button">＋ Elle ders ekle</button>
          <button class="btn soft" data-u="add-event" type="button">🏁 Sınav tarihini gir</button>
        </div>
      </div>`;
    }
    return `<div class="card wide-card uni-onboard">
      <h2>📚 Derslerini ekleyelim</h2>
      <p class="muted">Ders programını, sınav ve ödev tarihlerini bir kez gir; çalışma planın, geri sayımların, devamsızlığın ve not ortalaman kendiliğinden hesaplansın.</p>
      <div class="uni-acts">
        <label class="btn primary">📷 Ders programının fotoğrafı<input type="file" accept="image/*,application/pdf" hidden data-u="tt-file"></label>
        <button class="btn soft" data-u="add-course" type="button">＋ Elle ders ekle</button>
      </div>
      <p class="hint">Fotoğraftan okuma ve izlenceden doldurma Asistan ile çalışır (Asistan sekmesinden API anahtarı gerekir). Okuduklarını kaydetmeden önce kontrol edebilirsin.</p>
    </div>`;
  }
  function eventRow(e) {
    const c = Uni.course(e.courseId), n = Uni.daysLeft(e.date);
    return `<li class="ev-item ${e.done ? 'done' : ''}" data-ev="${e.id}" style="--c:${c ? c.color : 'var(--line-strong)'}">
      <span class="ev-ic">${K[e.kind][0]}</span>
      <div class="ev-text"><b>${c ? esc(c.name) + ' · ' : ''}${esc(e.title || K[e.kind][1])}</b><small>${fmtDate(e.date)}${e.time ? ' ' + esc(e.time) : ''}${e.grade != null && e.grade !== '' ? ` · not: ${esc(e.grade)}` : ''}</small></div>
      ${e.done ? '<span class="cd">✓</span>' : `<span class="cd ${urg(n)}">${n < 0 ? 'geçti' : Uni.leftText(n)}</span>`}
    </li>`;
  }
  function upcomingHtml() {
    const list = Uni.upcoming(45);
    const past = u().events.filter((e) => !e.done && e.date < U.dateKey(new Date()));
    return `<div class="card">
      <div class="sec-head"><h2>📌 Yaklaşanlar</h2><button class="btn soft small-btn" data-u="add-event" type="button">＋ Sınav / ödev</button></div>
      ${past.length ? `<p class="hint">Tarihi geçmiş ${past.length} kayıt var; notunu girmek ya da "bitti" demek için dokun.</p><ul class="ev-list">${past.map(eventRow).join('')}</ul>` : ''}
      ${list.length ? `<ul class="ev-list">${list.map(eventRow).join('')}</ul>` : '<p class="empty-state">Önümüzdeki 45 günde kayıtlı sınav ya da teslim yok. Eklediğinde geri sayım ve çalışma planı kendiliğinden oluşur.</p>'}
    </div>`;
  }
  function todayHtml() {
    const now = new Date(), cls = Uni.classesOn(now), plan = Uni.planFor(now);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return `<div class="card">
      <h2>🗓️ Bugün</h2>
      ${cls.length ? `<ul class="cls-list">${cls.map(({ course: c, slot: s }) => {
        const live = nowMin >= Uni.mins(s.start) && nowMin < Uni.mins(s.end), past = nowMin >= Uni.mins(s.end);
        const absToday = c.absences.some((a) => a.date === U.dateKey(now) && a.slot === s.start);
        return `<li class="${live ? 'live' : past ? 'past' : ''}" style="--c:${c.color}"><span class="cls-time">${esc(s.start)}–${esc(s.end)}</span><div><b>${esc(c.name)}</b><small>${esc([s.room || c.room, c.instructor].filter(Boolean).join(' · '))}${live ? ' · şu an' : ''}</small></div>
          ${Uni.isSchool() ? `<button class="chip ${absToday ? 'active' : ''}" data-u="absent" data-c="${c.id}" data-s="${esc(s.start)}" type="button">${absToday ? 'Gelmedim ✓' : 'Gelmedim'}</button>` : ''}</li>`;
      }).join('')}</ul>` : u().courses.some((c) => c.slots.length) ? '<p class="muted small">Bugün dersin yok 🌿</p>' : ''}
      ${planHtml(plan, now)}
    </div>`;
  }
  function planHtml(plan, date) {
    if (!plan.length) return '<p class="hint">Çalışma planı, ders programın ve sınav tarihlerinden kendiliğinden oluşur.</p>';
    return `<h3 class="sub-h">Bugünün çalışma listesi</h3><ul class="uplan">${plan.map((it) => {
      const c = Uni.course(it.courseId);
      return `<li class="${it.done ? 'done' : ''}" style="--c:${c ? c.color : 'var(--violet)'}">
        <button class="up-check" data-u="plan-done" data-id="${esc(it.id)}" data-date="${U.dateKey(date)}" type="button" aria-label="Tamamlandı">${it.done ? '✓' : ''}</button>
        <span class="up-text">${esc(it.text)}<small>${it.min} dk</small></span>
        ${it.done ? '' : `<button class="btn soft small-btn" data-u="plan-start" data-id="${esc(it.id)}" data-date="${U.dateKey(date)}" type="button">▶</button>`}
      </li>`;
    }).join('')}</ul>`;
  }
  function weekHtml() {
    const cs = u().courses;
    if (!cs.some((c) => c.slots.length)) return '';
    const days = [1, 2, 3, 4, 5, 6, 7].filter((d) => d <= 5 || cs.some((c) => c.slots.some((s) => +s.day === d)));
    const today = Uni.isoDay(new Date());
    return `<div class="card wide-card"><h2>📚 Haftalık ders programı</h2>
      <div class="tt-grid" style="--cols:${days.length}">${days.map((d) => {
        const list = cs.flatMap((c) => c.slots.filter((s) => +s.day === d).map((s) => ({ c, s }))).sort((a, b) => Uni.mins(a.s.start) - Uni.mins(b.s.start));
        return `<div class="tt-day ${d === today ? 'today' : ''}"><h4>${Uni.DAY_NAMES[d]}</h4>${list.length ? list.map(({ c, s }) => `<button class="tt-slot" data-u="edit-course" data-c="${c.id}" type="button" style="--c:${c.color}"><b>${esc(s.start)}–${esc(s.end)}</b><span>${esc(c.code || c.name)}</span>${s.room || c.room ? `<small>${esc(s.room || c.room)}</small>` : ''}</button>`).join('') : '<p class="muted small">—</p>'}</div>`;
      }).join('')}</div></div>`;
  }
  function coursesHtml() {
    const cs = u().courses;
    return `<div class="card wide-card">
      <div class="sec-head"><h2>📘 Dersler</h2><span class="row">${Uni.isSchool() ? '<label class="btn soft small-btn">📷 Programdan oku<input type="file" accept="image/*,application/pdf" hidden data-u="tt-file"></label>' : ''}${D().settings.profile.level === 'kpss' ? '<button class="btn soft small-btn" data-u="kpss" type="button">🏛️ KPSS dersleri</button>' : ''}<button class="btn soft small-btn" data-u="add-course" type="button">＋ Ders</button></span></div>
      ${cs.length ? `<div class="course-grid">${cs.map((c) => {
        const school = Uni.isSchool(), at = Uni.attendance(c), sc = school ? Uni.courseScore(c) : null, lt = sc ? Uni.letterOf(sc.score) : null;
        const next = Uni.upcoming(120).find((e) => e.courseId === c.id);
        const tDone = c.topics.filter((t) => t.done).length;
        return `<article class="course-card" style="--c:${c.color}">
          <header><b>${esc(c.code ? c.code + ' · ' : '')}${esc(c.name)}</b><span class="muted small">${c.credit ? esc(c.credit) + ' kredi' : ''}${c.ects ? ' · ' + esc(c.ects) + ' AKTS' : ''}</span></header>
          ${c.instructor ? `<p class="muted small">${esc(c.instructor)}</p>` : ''}
          ${school && at.limit ? `<div class="att ${at.ratio >= 0.8 ? 'hot' : at.ratio >= 0.5 ? 'warm' : ''}" title="Devamsızlık"><span>Devamsızlık ${at.used}/${at.limit} saat${at.ratio >= 0.8 ? ' ⚠️' : ''}</span><i style="width:${Math.min(100, Math.round(at.ratio * 100))}%"></i></div>` : ''}
          ${school ? `<p class="small">${sc ? `Not: <b>${sc.score}</b>${sc.complete ? ` → <b>${lt[0]}</b>` : ` <span class="muted">(%${sc.part} girildi, tahmini ${lt[0]})</span>`}` : c.letter ? `Harf notu: <b>${esc(c.letter)}</b>` : '<span class="muted">Henüz not yok</span>'}</p>` : ''}
          ${c.topics.length ? `<div class="topic-bar" title="Çalışılan konular"><i style="width:${Math.round((tDone / c.topics.length) * 100)}%"></i><span>Konular ${tDone}/${c.topics.length}</span></div>` : ''}
          ${next ? `<p class="small">${K[next.kind][0]} ${esc(next.title || K[next.kind][1])}: <span class="cd ${urg(Uni.daysLeft(next.date))}">${Uni.leftText(Uni.daysLeft(next.date))}</span></p>` : ''}
          <footer>
            <button class="chip" data-u="edit-course" data-c="${c.id}" type="button">✏️ Düzenle</button>
            <button class="chip" data-u="add-event" data-c="${c.id}" type="button">＋ Sınav</button>
            ${c.topics.length ? `<button class="chip" data-u="topics" data-c="${c.id}" type="button">📖 Konular</button>` : ''}
            ${school ? `<label class="chip">📄 İzlence<input type="file" accept="application/pdf,image/*" hidden data-u="syl-file" data-c="${c.id}"></label>` : ''}
            ${window.Asistan ? `<button class="chip" data-u="ask-course" data-c="${c.id}" type="button">🎓 Sınava hazırla</button>` : ''}
          </footer></article>`;
      }).join('')}</div>` : '<p class="empty-state">Henüz ders yok.</p>'}
    </div>`;
  }
  function gradesHtml() {
    const cs = u().courses, g = Uni.gpa();
    if (!cs.length || !Uni.isSchool()) return '';
    return `<div class="card">
      <div class="sec-head"><h2>🎯 Not ortalaması</h2>
        <select data-u="gpa-by" aria-label="Hesaplama"><option value="credit" ${u().gpaBy !== 'ects' ? 'selected' : ''}>Kredi ile</option><option value="ects" ${u().gpaBy === 'ects' ? 'selected' : ''}>AKTS ile</option></select></div>
      <div class="gpa-tiles"><div><span>Dönem ortalaması</span><b>${g.term != null ? g.term.toFixed(2) : '—'}</b></div><div><span>Genel ortalama (GANO)</span><b>${g.overall != null ? g.overall.toFixed(2) : '—'}</b></div></div>
      <table class="gpa-table"><thead><tr><th>Ders</th><th>Not</th><th>Harf</th><th>${u().gpaBy === 'ects' ? 'AKTS' : 'Kredi'}</th></tr></thead><tbody>
        ${cs.map((c) => { const sc = Uni.courseScore(c); const lt = c.letter || (sc && sc.complete ? Uni.letterOf(sc.score)[0] : ''); const need = Uni.needForFinal(c, 60); return `<tr><td>${esc(c.name)}${need != null && !sc?.complete ? `<small class="muted"> · DD için finalden ≥ ${need}</small>` : ''}</td><td>${sc ? sc.score : '—'}</td><td>${esc(lt || '—')}</td><td>${esc(u().gpaBy === 'ects' ? c.ects : c.credit)}</td></tr>`; }).join('')}
      </tbody></table>
      <details class="hint"><summary>Geçmiş dönemler ve harf tablosu</summary>
        <p>GANO için önceki dönemlerin kredisini ve ortalamasını ekle:</p>
        <ul class="past-list">${(u().pastTerms || []).map((p, i) => `<li>${esc(p.term || 'Dönem')} · ${esc(p.credits)} kredi · ${esc(p.gpa)} <button class="icon-btn" data-u="del-past" data-i="${i}" type="button">✕</button></li>`).join('')}</ul>
        <div class="inline-form"><input data-u="past-term" placeholder="Dönem (ör. 2025 Güz)"><input data-u="past-cr" type="number" step="0.5" placeholder="Kredi"><input data-u="past-gpa" type="number" step="0.01" placeholder="Ortalama"><button class="btn soft small-btn" data-u="add-past" type="button">Ekle</button></div>
        <p>Kullanılan tablo (en yaygın): ${Uni.LETTERS.map((l) => `${l[0]} ≥${l[1]} (${l[2]})`).join(', ')}. Okulun bağıl değerlendirme ya da farklı tablo kullanıyorsa dersin düzenleme ekranından harf notunu elle seçebilirsin.</p>
      </details>
    </div>`;
  }
  function calendarHtml() {
    if (!Uni.isSchool() && !(u().calendar || []).length) return '';
    const cal = (u().calendar || []).slice().sort((a, b) => a.date.localeCompare(b.date));
    const t = U.dateKey(new Date());
    return `<div class="card">
      <div class="sec-head"><h2>🏫 Akademik takvim</h2><span class="row">${window.Asistan ? '<button class="btn soft small-btn" data-u="find-cal" type="button">🎓 İnternetten bul</button>' : ''}<button class="btn soft small-btn" data-u="add-cal" type="button">＋</button></span></div>
      ${cal.length ? `<ul class="ev-list">${cal.map((x) => { const n = Uni.daysLeft(x.date), past = (x.end || x.date) < t; return `<li class="ev-item ${past ? 'done' : ''}" data-cal="${x.id}"><span class="ev-ic">${(Uni.CAL_KINDS[x.kind] || Uni.CAL_KINDS.diger)[0]}</span><div class="ev-text"><b>${esc(x.title)}</b><small>${fmtDate(x.date)}${x.end ? ' – ' + fmtDate(x.end) : ''}</small></div>${past ? '' : `<span class="cd ${urg(n)}">${n <= 0 ? 'şu an' : Uni.leftText(n)}</span>`}</li>`; }).join('')}</ul>` : '<p class="empty-state">Vize ve final haftalarını, tatilleri ekle; ya da Asistan okulunun resmî takvimini internetten bulsun.</p>'}
      ${lastSources.length ? `<details class="hint"><summary>Son aramanın kaynakları</summary><ol>${lastSources.map((s) => `<li>${/^https?:\/\//.test(s.url || '') ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a>` : esc(s.label)}</li>`).join('')}</ol></details>` : ''}
    </div>`;
  }

  function render() {
    const root = $('#uni-root');
    if (!root) return;
    const has = u().courses.length > 0;
    root.innerHTML = `<div class="grid">${headHtml()}${has ? '' : onboardHtml()}${todayHtml()}${upcomingHtml()}${weekHtml()}${has ? coursesHtml() : ''}${gradesHtml()}${calendarHtml()}</div>`;
  }

  // ana sayfadaki "bugün" kartı
  function renderToday(el) {
    const now = new Date(), cls = Uni.classesOn(now), plan = Uni.planFor(now).filter((x) => !x.done).slice(0, 3);
    const next = Uni.upcoming(21)[0];
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const nextCls = cls.find(({ slot: s }) => Uni.mins(s.end) > nowMin);
    if (!cls.length && !plan.length && !next) {
      el.innerHTML = `<h2>🎓 ${levelName()} planı</h2><p class="muted small">${u().courses.length ? 'Bugün dersin ve plan maddesi yok; dinlenmek de planın parçası 🌿' : 'Plan sekmesinden derslerini ekle; günlük çalışma listen kendiliğinden oluşsun.'}</p>`;
      return;
    }
    el.innerHTML = `<h2>🎓 Bugün</h2>
      ${nextCls ? `<p class="small">${Uni.mins(nextCls.slot.start) <= nowMin ? '📍 Şu an' : '⏰ Sıradaki ders'}: <b>${esc(nextCls.course.name)}</b> ${esc(nextCls.slot.start)}${nextCls.slot.room || nextCls.course.room ? ' · ' + esc(nextCls.slot.room || nextCls.course.room) : ''}</p>` : ''}
      ${next ? `<p class="small">${K[next.kind][0]} ${esc((Uni.course(next.courseId) || {}).name || '')} ${esc(next.title || K[next.kind][1])}: <span class="cd ${urg(Uni.daysLeft(next.date))}">${Uni.leftText(Uni.daysLeft(next.date))}</span></p>` : ''}
      ${planHtml(plan, now)}
      <button class="btn soft small-btn" data-tab-go="plan" type="button">Dönem planına git →</button>`;
  }

  // ---------- Düzenleme pencereleri ----------
  function courseForm(c) {
    const isNew = !c, school = Uni.isSchool();
    c = c || { name: '', code: '', credit: 3, ects: 5, instructor: '', room: '', color: Uni.COLORS[u().courses.length % Uni.COLORS.length], slots: [], weeklyHours: 3, absLimit: u().absPct || 30, weights: [{ name: 'Vize', w: 40, score: null }, { name: 'Final', w: 60, score: null }], letter: '', topics: [], absences: [] };
    const slotRow = (s = { day: 1, start: '09:00', end: '10:50', room: '' }) => `<div class="slot-row"><select data-k="day">${[1, 2, 3, 4, 5, 6, 7].map((d) => `<option value="${d}" ${+s.day === d ? 'selected' : ''}>${Uni.DAY_SHORT[d]}</option>`).join('')}</select><input type="time" data-k="start" value="${esc(s.start)}"><input type="time" data-k="end" value="${esc(s.end)}"><input data-k="room" placeholder="Derslik" value="${esc(s.room || '')}"><button class="icon-btn" data-x="row" type="button">✕</button></div>`;
    const wRow = (w = { name: '', w: '', score: '' }) => `<div class="w-row"><input data-k="name" placeholder="Bileşen (ör. Vize)" value="${esc(w.name)}"><input type="number" data-k="w" placeholder="%" value="${esc(w.w)}"><input type="number" data-k="score" placeholder="Not" value="${w.score == null ? '' : esc(w.score)}"><button class="icon-btn" data-x="row" type="button">✕</button></div>`;
    const tRow = (t = { week: '', title: '', done: false }) => `<div class="t-row"><input type="number" data-k="week" placeholder="Hf" value="${esc(t.week)}"><input data-k="title" placeholder="Konu" value="${esc(t.title)}"><input type="checkbox" data-k="done" ${t.done ? 'checked' : ''} title="Çalıştım"><button class="icon-btn" data-x="row" type="button">✕</button></div>`;
    const card = App.openModal(`<h3>${isNew ? '＋ Yeni ders' : '✏️ ' + esc(c.name)}</h3>
      <div class="row2"><label class="field">Ders adı <input data-f="name" value="${esc(c.name)}" maxlength="60"></label><label class="field">Kodu <input data-f="code" value="${esc(c.code)}" maxlength="16" placeholder="ANA101"></label></div>
      <div class="row3 ${school ? '' : 'hidden'}"><label class="field">Kredi <input type="number" step="0.5" data-f="credit" value="${esc(c.credit)}"></label><label class="field">AKTS <input type="number" step="0.5" data-f="ects" value="${esc(c.ects)}"></label><label class="field">Renk <input type="color" data-f="color" value="${esc(c.color)}"></label></div>
      <div class="row2 ${school ? '' : 'hidden'}"><label class="field">Öğretim üyesi <input data-f="instructor" value="${esc(c.instructor)}"></label><label class="field">Derslik <input data-f="room" value="${esc(c.room)}"></label></div>
      ${school ? '' : `<label class="field">Renk <input type="color" data-f="color2" value="${esc(c.color)}"></label>`}
      <details ${school || c.slots.length ? 'open' : ''}><summary><b>🗓️ Haftalık saatler</b> <span class="muted small">${school ? '' : '(kurs / dershane varsa)'}</span></summary><div data-list="slots">${c.slots.map(slotRow).join('')}</div><button class="btn soft small-btn" data-add="slots" type="button">＋ Saat ekle</button></details>
      <details class="${school ? '' : 'hidden'}"><summary><b>🚶 Devamsızlık</b></summary><div class="row2"><label class="field">Sınır (%) <input type="number" data-f="absLimit" value="${esc(c.absLimit)}"></label><label class="field">Haftalık saat (saat girilmediyse) <input type="number" data-f="weeklyHours" value="${esc(c.weeklyHours)}"></label></div>
        <p class="muted small">Kayıtlı devamsızlık: ${c.absences.length ? c.absences.map((a) => esc(a.date) + ' (' + a.hours + ' sa)').join(', ') : 'yok'} ${c.absences.length ? '<button class="chip" data-x="clear-abs" type="button">Sıfırla</button>' : ''}</p></details>
      <details class="${school ? '' : 'hidden'}"><summary><b>🎯 Değerlendirme ve notlar</b></summary><div data-list="weights">${c.weights.map(wRow).join('')}</div><button class="btn soft small-btn" data-add="weights" type="button">＋ Bileşen</button>
        <label class="field">Harf notu (biliyorsan; boşsa hesaplanır) <select data-f="letter"><option value="">—</option>${Uni.LETTERS.map((l) => `<option ${c.letter === l[0] ? 'selected' : ''}>${l[0]}</option>`).join('')}</select></label></details>
      <details ${school ? '' : 'open'}><summary><b>📖 ${school ? 'Haftalık konular' : 'Konular'}</b></summary><div data-list="topics">${c.topics.map(tRow).join('')}</div><button class="btn soft small-btn" data-add="topics" type="button">＋ Konu</button></details>
      <div class="modal-actions">${isNew ? '' : '<button class="btn danger" data-act="del" type="button">Sil</button><span style="flex:1"></span>'}<button class="btn soft" data-act="cancel" type="button">Vazgeç</button><button class="btn primary" data-act="save" type="button">Kaydet</button></div>`);
    const rows = { slots: slotRow, weights: wRow, topics: tRow };
    card.addEventListener('click', (e) => {
      const add = e.target.closest('[data-add]');
      if (add) { card.querySelector(`[data-list="${add.dataset.add}"]`).insertAdjacentHTML('beforeend', rows[add.dataset.add]()); return; }
      if (e.target.closest('[data-x="row"]')) { e.target.closest('.slot-row, .w-row, .t-row').remove(); return; }
      if (e.target.closest('[data-x="clear-abs"]')) { c.absences = []; e.target.closest('p').textContent = 'Kayıtlı devamsızlık: yok'; return; }
      const act = e.target.closest('[data-act]') && e.target.closest('[data-act]').dataset.act;
      if (act === 'cancel') App.closeModal();
      if (act === 'del' && confirm(`"${c.name}" dersi silinsin mi? Sınav ve ödev kayıtları da silinir; geçmiş çalışma oturumların kalır.`)) { Uni.removeCourse(c.id); App.closeModal(); refresh(); }
      if (act !== 'save') return;
      const v = (f) => card.querySelector(`[data-f="${f}"]`).value;
      const name = v('name').trim();
      if (!name) { App.toast('📘', 'Ders adı gerekli'); return; }
      const read = (list, f) => [...card.querySelectorAll(`[data-list="${list}"] > div`)].map((r) => f((k) => r.querySelector(`[data-k="${k}"]`)));
      const data = {
        name, code: v('code').trim(), credit: +v('credit') || 0, ects: +v('ects') || 0, color: school ? v('color') : v('color2'), instructor: v('instructor').trim(), room: v('room').trim(),
        absLimit: +v('absLimit') || 30, weeklyHours: +v('weeklyHours') || 0, letter: v('letter'),
        slots: read('slots', (q) => ({ day: +q('day').value, start: q('start').value, end: q('end').value, room: q('room').value.trim() })).filter((s) => Uni.validTime(s.start) && Uni.validTime(s.end) && Uni.mins(s.end) > Uni.mins(s.start)),
        weights: read('weights', (q) => ({ name: q('name').value.trim(), w: +q('w').value || 0, score: q('score').value === '' ? null : U.clamp(+q('score').value, 0, 100) })).filter((w) => w.name && w.w > 0),
        topics: read('topics', (q) => ({ week: +q('week').value || '', title: q('title').value.trim(), done: q('done').checked })).filter((t) => t.title),
      };
      if (isNew) Uni.addCourse(data);
      else { Object.assign(c, data); Uni.syncSubjects(); }
      App.save(); App.closeModal(); refresh();
      if (isNew) App.toast('📘', 'Ders eklendi', 'Sayaçtaki ders listesine de eklendi');
    });
  }

  // konuları hızlıca işaretleme (KPSS'de ana kullanım)
  function topicsForm(c) {
    if (!c) return;
    const card = App.openModal(`<h3>📖 ${esc(c.name)}</h3><p class="muted small">Çalıştığın konuları işaretle.</p>
      <ul class="topic-check">${c.topics.map((t, i) => `<li><label><input type="checkbox" data-i="${i}" ${t.done ? 'checked' : ''}><span>${t.week ? `<small>${esc(t.week)}. hf</small> ` : ''}${esc(t.title)}</span></label></li>`).join('')}</ul>
      <div class="modal-actions"><button class="btn primary" data-act="close" type="button">Tamam</button></div>`);
    card.addEventListener('change', (e) => {
      const cb = e.target.closest('[data-i]');
      if (!cb) return;
      c.topics[+cb.dataset.i].done = cb.checked;
      App.save(); refresh();
      if (cb.checked && c.topics.every((t) => t.done)) App.toast('🌟', `${c.name}: bütün konular tamam!`, 'Şimdi tekrar ve soru zamanı');
    });
    card.addEventListener('click', (e) => { if (e.target.closest('[data-act="close"]')) App.closeModal(); });
  }

  function eventForm(e, courseId) {
    const isNew = !e;
    e = e || { kind: Uni.isSchool() ? 'vize' : 'sinav', courseId: courseId || (u().courses[0] && u().courses[0].id) || '', title: '', date: U.dateKey(U.addDays(new Date(), 7)), time: '', note: '', done: false, grade: '' };
    let kind = e.kind;
    const card = App.openModal(`<h3>${isNew ? '＋ Sınav / ödev' : '✏️ Düzenle'}</h3>
      <div class="chips">${Object.keys(K).map((k) => `<button type="button" class="chip ${k === kind ? 'active' : ''}" data-kind="${k}">${K[k][0]} ${K[k][1]}</button>`).join('')}</div>
      <label class="field">Ders <select data-f="course"><option value="">Genel</option>${u().courses.map((c) => `<option value="${c.id}" ${c.id === e.courseId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
      <label class="field">Başlık (isteğe bağlı) <input data-f="title" value="${esc(e.title)}" maxlength="80" placeholder="Ör. 1. ara sınav, Lab raporu 3"></label>
      <div class="row2"><label class="field">Tarih <input type="date" data-f="date" value="${esc(e.date)}"></label><label class="field">Saat <input type="time" data-f="time" value="${esc(e.time || '')}"></label></div>
      <label class="field">Not / konular <input data-f="note" value="${esc(e.note || '')}" maxlength="200" placeholder="Ör. 1-6. hafta konuları"></label>
      ${isNew ? '' : `<div class="row2"><label class="field">Aldığın not <input type="number" data-f="grade" value="${esc(e.grade ?? '')}" min="0" max="100"></label><label class="switch"><input type="checkbox" data-f="done" ${e.done ? 'checked' : ''}> Bitti</label></div>`}
      <div class="modal-actions">${isNew ? '' : '<button class="btn danger" data-act="del" type="button">Sil</button><span style="flex:1"></span>'}<button class="btn soft" data-act="cancel" type="button">Vazgeç</button><button class="btn primary" data-act="save" type="button">Kaydet</button></div>`);
    card.addEventListener('click', (ev) => {
      const kb = ev.target.closest('[data-kind]');
      if (kb) { kind = kb.dataset.kind; card.querySelectorAll('[data-kind]').forEach((b) => b.classList.toggle('active', b === kb)); return; }
      const act = ev.target.closest('[data-act]') && ev.target.closest('[data-act]').dataset.act;
      if (act === 'cancel') App.closeModal();
      if (act === 'del' && confirm('Bu kayıt silinsin mi?')) { u().events = u().events.filter((x) => x.id !== e.id); App.save(); App.closeModal(); refresh(); }
      if (act !== 'save') return;
      const v = (f) => (card.querySelector(`[data-f="${f}"]`) || {}).value;
      const date = v('date');
      if (!Uni.validDate(date)) { App.toast('📌', 'Tarih seç'); return; }
      Object.assign(e, { kind, courseId: v('course'), title: (v('title') || '').trim(), date, time: v('time') || '', note: (v('note') || '').trim() });
      if (!isNew) {
        e.done = card.querySelector('[data-f="done"]').checked;
        const g = v('grade');
        e.grade = g === '' ? '' : U.clamp(+g, 0, 100);
        // vize/final notu dersin değerlendirmesine de yazılır
        const c = Uni.course(e.courseId);
        if (c && e.grade !== '' && Uni.EXAM.has(kind)) { const w = c.weights.find((x) => x.name.toLocaleLowerCase('tr-TR').startsWith(K[kind][1].toLocaleLowerCase('tr-TR'))); if (w) w.score = e.grade; }
        if (e.grade !== '' && !e.done) e.done = true;
      }
      if (isNew) { e.id = U.uid(); u().events.push(e); }
      App.save(); App.closeModal(); refresh();
    });
  }

  function calForm(x) {
    const isNew = !x;
    x = x || { title: '', date: U.dateKey(new Date()), end: '', kind: 'vize' };
    const card = App.openModal(`<h3>${isNew ? '＋ Takvime ekle' : '✏️ Düzenle'}</h3>
      <label class="field">Tür <select data-f="kind">${Object.keys(Uni.CAL_KINDS).map((k) => `<option value="${k}" ${k === x.kind ? 'selected' : ''}>${Uni.CAL_KINDS[k].join(' ')}</option>`).join('')}</select></label>
      <label class="field">Başlık <input data-f="title" value="${esc(x.title)}" maxlength="80" placeholder="Ör. Ara sınav haftası"></label>
      <div class="row2"><label class="field">Başlangıç <input type="date" data-f="date" value="${esc(x.date)}"></label><label class="field">Bitiş (aralıksa) <input type="date" data-f="end" value="${esc(x.end || '')}"></label></div>
      <div class="modal-actions">${isNew ? '' : '<button class="btn danger" data-act="del" type="button">Sil</button><span style="flex:1"></span>'}<button class="btn soft" data-act="cancel" type="button">Vazgeç</button><button class="btn primary" data-act="save" type="button">Kaydet</button></div>`);
    card.addEventListener('click', (ev) => {
      const act = ev.target.closest('[data-act]') && ev.target.closest('[data-act]').dataset.act;
      if (act === 'cancel') App.closeModal();
      if (act === 'del') { u().calendar = u().calendar.filter((y) => y.id !== x.id); App.save(); App.closeModal(); refresh(); }
      if (act !== 'save') return;
      const v = (f) => card.querySelector(`[data-f="${f}"]`).value;
      if (!Uni.validDate(v('date')) || !v('title').trim()) { App.toast('🏫', 'Başlık ve tarih gerekli'); return; }
      Object.assign(x, { kind: v('kind'), title: v('title').trim(), date: v('date'), end: Uni.validDate(v('end')) && v('end') > v('date') ? v('end') : '' });
      if (isNew) { x.id = U.uid(); x.src = 'user'; u().calendar.push(x); }
      App.save(); App.closeModal(); refresh();
    });
  }

  // ---------- Yapay zekâ akışları ----------
  async function withAi(label, job) {
    if (!window.Asistan || !Asistan.ready()) { App.toast('🎓', 'Önce Asistan’ı kur', 'Asistan sekmesi → ⚙️ Asistan ayarları → API anahtarı'); return null; }
    App.toast('🎓', label, 'Birkaç saniye sürebilir', 6000);
    try { return await job(); } catch (e) { App.toast('⚠️', 'Asistan tamamlayamadı', e.message); return null; }
  }
  async function scanTT(file) {
    const r = await withAi('Ders programın okunuyor…', () => Uni.scanTimetable(file));
    if (!r) return;
    if (!r.courses.length) { App.toast('📷', 'Programda ders bulunamadı', 'Daha net bir fotoğraf dene'); return; }
    const card = App.openModal(`<h3>📷 ${r.courses.length} ders okundu</h3><p class="muted small">Kontrol et; istemediklerinin işaretini kaldır. (Maliyet: $${r.cost.toFixed(3)})</p>
      <ul class="gen-cards">${r.courses.map((c, i) => `<li><label><input type="checkbox" checked data-i="${i}"><span><b>${esc([c.code, c.name].filter(Boolean).join(' · '))}</b><small>${c.slots.map((s) => `${Uni.DAY_SHORT[s.day]} ${s.start}–${s.end}`).join(', ') || 'saat okunamadı'}${c.room ? ' · ' + esc(c.room) : ''}${c.instructor ? ' · ' + esc(c.instructor) : ''}</small></span></label></li>`).join('')}</ul>
      <div class="modal-actions"><button class="btn soft" data-act="cancel" type="button">Vazgeç</button><button class="btn primary" data-act="add" type="button">Derslere ekle</button></div>`);
    card.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]') && e.target.closest('[data-act]').dataset.act;
      if (act === 'cancel') App.closeModal();
      if (act !== 'add') return;
      let n = 0;
      card.querySelectorAll('[data-i]').forEach((cb) => {
        if (!cb.checked) return;
        const c = r.courses[+cb.dataset.i];
        const low = (t) => String(t || '').toLocaleLowerCase('tr-TR');
        const same = u().courses.find((x) => (c.code && low(x.code) === low(c.code)) || low(x.name) === low(c.name));
        if (same) { for (const s of c.slots) if (!same.slots.some((y) => +y.day === s.day && y.start === s.start)) same.slots.push({ ...s, room: c.room || '' }); same.instructor = same.instructor || c.instructor; same.room = same.room || c.room; }
        else Uni.addCourse({ name: c.name || c.code || 'Ders', code: c.code, instructor: c.instructor, room: c.room, slots: c.slots.map((s) => ({ ...s, room: '' })) });
        n++;
      });
      Uni.syncSubjects(); App.save(); App.closeModal(); refresh();
      App.toast('📘', `${n} ders eklendi`, 'Kredi, AKTS ve değerlendirme ağırlıklarını ✏️ ile tamamlayabilirsin');
    });
  }
  async function syllabus(courseId, file) {
    const c = Uni.course(courseId);
    if (!c) return;
    const r = await withAi('İzlence okunuyor…', () => Uni.parseSyllabus(file));
    if (!r) return;
    const card = App.openModal(`<h3>📄 ${esc(r.name || c.name)}</h3><p class="muted small">İzlenceden çıkanlar; kaydetmeden önce kontrol et. (Maliyet: $${r.cost.toFixed(3)})</p>
      <ul class="syl-sum">
        ${r.code ? `<li><label><input type="checkbox" checked data-k="code"> Kod: <b>${esc(r.code)}</b></label></li>` : ''}
        ${r.credit ? `<li><label><input type="checkbox" checked data-k="credit"> Kredi: <b>${esc(r.credit)}</b></label></li>` : ''}
        ${r.ects ? `<li><label><input type="checkbox" checked data-k="ects"> AKTS: <b>${esc(r.ects)}</b></label></li>` : ''}
        ${r.instructor ? `<li><label><input type="checkbox" checked data-k="instructor"> Öğretim üyesi: <b>${esc(r.instructor)}</b></label></li>` : ''}
        ${r.weights.length ? `<li><label><input type="checkbox" checked data-k="weights"> Değerlendirme: <b>${r.weights.map((w) => `${esc(w.name)} %${esc(w.w)}`).join(', ')}</b></label></li>` : ''}
        ${r.topics.length ? `<li><label><input type="checkbox" checked data-k="topics"> ${r.topics.length} haftalık konu</label></li>` : ''}
        ${r.events.length ? `<li><label><input type="checkbox" checked data-k="events"> Tarihli sınav/ödev: <b>${r.events.map((e) => `${esc(e.title || K[e.kind][1])} (${esc(e.date)})`).join(', ')}</b></label></li>` : ''}
      </ul>
      <div class="modal-actions"><button class="btn soft" data-act="cancel" type="button">Vazgeç</button><button class="btn primary" data-act="apply" type="button">Derse uygula</button></div>`);
    card.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]') && e.target.closest('[data-act]').dataset.act;
      if (act === 'cancel') App.closeModal();
      if (act !== 'apply') return;
      const on = (k) => { const cb = card.querySelector(`[data-k="${k}"]`); return cb && cb.checked; };
      if (on('code')) c.code = r.code;
      if (on('credit')) c.credit = r.credit;
      if (on('ects')) c.ects = r.ects;
      if (on('instructor')) c.instructor = r.instructor;
      if (on('weights')) c.weights = r.weights.map((w) => ({ name: w.name, w: w.w, score: (c.weights.find((x) => x.name === w.name) || {}).score ?? null }));
      if (on('topics')) c.topics = r.topics.map((t) => ({ week: t.week, title: t.title, done: false }));
      if (on('events')) for (const ev of r.events) if (!u().events.some((x) => x.courseId === c.id && x.date === ev.date && x.kind === ev.kind)) u().events.push({ id: U.uid(), courseId: c.id, kind: ev.kind, title: ev.title, date: ev.date, time: '', note: '', done: false, grade: '' });
      App.save(); App.closeModal(); refresh();
      App.toast('📄', 'İzlence derse uygulandı');
    });
  }
  async function findCal() {
    const r = await withAi('Akademik takvim internette aranıyor…', () => Uni.findCalendar());
    if (!r) return;
    lastSources = r.sources || [];
    if (!r.items.length) { App.toast('🏫', 'Takvimde tarih bulunamadı', 'Okul adını tam yazmayı ya da elle eklemeyi dene'); render(); return; }
    const card = App.openModal(`<h3>🏫 Akademik takvim</h3><p class="muted small">${r.items.length} tarih bulundu (maliyet $${r.cost.toFixed(3)}). Resmî kaynakla karşılaştırıp istemediklerinin işaretini kaldır.</p>
      ${r.termStart ? `<label class="switch"><input type="checkbox" data-k="term" checked> Dönem: ${esc(r.termStart)} – ${esc(r.termEnd || '?')}</label>` : ''}
      <ul class="gen-cards">${r.items.map((x, i) => `<li><label><input type="checkbox" checked data-i="${i}"><span><b>${(Uni.CAL_KINDS[x.kind] || Uni.CAL_KINDS.diger)[0]} ${esc(x.title)}</b><small>${esc(x.date)}${x.end ? ' – ' + esc(x.end) : ''}</small></span></label></li>`).join('')}</ul>
      ${lastSources.length ? `<details class="hint" open><summary>Kaynaklar</summary><ol>${lastSources.map((s) => `<li>${/^https?:\/\//.test(s.url || '') ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a>` : esc(s.label)}</li>`).join('')}</ol></details>` : ''}
      <div class="modal-actions"><button class="btn soft" data-act="cancel" type="button">Vazgeç</button><button class="btn primary" data-act="add" type="button">Takvime ekle</button></div>`);
    card.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]') && e.target.closest('[data-act]').dataset.act;
      if (act === 'cancel') { App.closeModal(); render(); }
      if (act !== 'add') return;
      const t = card.querySelector('[data-k="term"]');
      if (t && t.checked) { u().termStart = r.termStart; if (r.termEnd) u().termEnd = r.termEnd; }
      let n = 0;
      card.querySelectorAll('[data-i]').forEach((cb) => {
        if (!cb.checked) return;
        const x = r.items[+cb.dataset.i];
        if (u().calendar.some((y) => y.date === x.date && y.title === x.title)) return;
        u().calendar.push({ id: U.uid(), title: x.title, date: x.date, end: x.end || '', kind: x.kind, src: 'ai' });
        n++;
      });
      App.save(); App.closeModal(); refresh();
      if (n) App.toast('🏫', `${n} tarih takvime eklendi`, 'Geri sayımlar ana sayfada ve Dönem ekranında');
      else App.toast('🏫', 'Yeni tarih yok', 'Seçtiklerin zaten takvimde');
    });
  }

  function refresh() { render(); App.refreshHome(); App.refreshSubjects(); }

  // ---------- Olaylar ----------
  function onClick(e) {
    const go = e.target.closest('[data-tab-go]');
    if (go) { App.showTab(go.dataset.tabGo); return; }
    const ev = e.target.closest('.ev-item[data-ev]');
    if (ev) { const x = u().events.find((y) => y.id === ev.dataset.ev); if (x) eventForm(x); return; }
    const cl = e.target.closest('.ev-item[data-cal]');
    if (cl) { const x = u().calendar.find((y) => y.id === cl.dataset.cal); if (x) calForm(x); return; }
    const b = e.target.closest('[data-u]');
    if (!b || b.tagName === 'INPUT' || b.tagName === 'SELECT') return;
    const act = b.dataset.u;
    if (act === 'add-course') courseForm(null);
    else if (act === 'edit-course') courseForm(Uni.course(b.dataset.c));
    else if (act === 'add-event') eventForm(null, b.dataset.c);
    else if (act === 'add-cal') calForm(null);
    else if (act === 'kpss') { const n = Uni.addKpss(); App.save(); refresh(); App.toast('🏛️', n ? `${n} ders konularıyla eklendi` : 'KPSS dersleri zaten ekli', 'Sınav tarihini de eklersen tekrar planı oluşur'); }
    else if (act === 'topics') topicsForm(Uni.course(b.dataset.c));
    else if (act === 'find-cal') findCal();
    else if (act === 'ics') shareIcs();
    else if (act === 'absent') {
      const c = Uni.course(b.dataset.c), slot = c && c.slots.find((s) => s.start === b.dataset.s);
      if (!c || !slot) return;
      const day = U.dateKey(new Date());
      const i = c.absences.findIndex((a) => a.date === day && a.slot === slot.start);
      if (i >= 0) c.absences.splice(i, 1);
      else c.absences.push({ date: day, slot: slot.start, hours: Math.max(1, Math.round((Uni.mins(slot.end) - Uni.mins(slot.start)) / 50)) });
      App.save(); refresh();
      const at = Uni.attendance(c);
      if (i < 0) App.toast('🚶', `${c.name}: devamsızlık ${at.used}/${at.limit} saat`, at.left <= 2 ? 'Sınıra çok yaklaştın, dikkat 💛' : `${at.left} saat hakkın kaldı`);
    } else if (act === 'plan-done') { Uni.toggleDone(new Date(b.dataset.date + 'T12:00:00'), b.dataset.id); refresh(); }
    else if (act === 'plan-start') startItem(b.dataset.id, b.dataset.date);
    else if (act === 'ask-course') askCourse(Uni.course(b.dataset.c));
    else if (act === 'add-past') {
      const cr = +$('#uni-root [data-u="past-cr"]').value, g = +$('#uni-root [data-u="past-gpa"]').value;
      if (!cr || !(g >= 0 && g <= 4)) { App.toast('🎯', 'Kredi ve 0-4 arası ortalama gir'); return; }
      u().pastTerms.push({ term: $('#uni-root [data-u="past-term"]').value.trim(), credits: cr, gpa: g });
      App.save(); render();
    } else if (act === 'del-past') { u().pastTerms.splice(+b.dataset.i, 1); App.save(); render(); }
  }
  function bind() {
    const root = $('#uni-root');
    root.addEventListener('click', onClick);
    // ana sayfadaki "bugün" kartı da aynı düğmeleri kullanır (YKS modunda o kartı PlanUI doldurur)
    $('#today-plan').addEventListener('click', (e) => { if (Uni.isProgramMode()) onClick(e); });
    root.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.u === 'gpa-by') { u().gpaBy = t.value; App.save(); render(); return; }
      if (!t.files || !t.files[0]) return;
      const f = t.files[0];
      t.value = '';
      if (t.dataset.u === 'tt-file') scanTT(f);
      if (t.dataset.u === 'syl-file') syllabus(t.dataset.c, f);
    });
  }
  function startItem(id, date) {
    const it = Uni.planFor(new Date(date + 'T12:00:00')).find((x) => x.id === id);
    if (!it) return;
    const c = Uni.course(it.courseId);
    App.startStudy({ subjectId: c ? c.subjectId : '', intent: it.text.slice(0, 80) });
  }
  // plandan başlatılan oturum bitince o madde yapıldı sayılır
  function onSession(session) {
    if (!Uni.isProgramMode() || !session.intent) return;
    const now = new Date(session.start || Date.now());
    const it = Uni.planFor(now).find((x) => !x.done && x.text.slice(0, 80) === session.intent);
    if (it) Uni.toggleDone(now, it.id);
  }
  function askCourse(c) {
    if (!c) return;
    const next = Uni.upcoming(120).find((e) => e.courseId === c.id);
    const topics = c.topics.length ? c.topics.map((t) => `${t.week ? t.week + '. hafta: ' : ''}${t.title}${t.done ? ' (çalıştım)' : ''}`).join('\n') : '(konu listesi girilmemiş)';
    Asistan.ask(`${c.name}${c.code ? ' (' + c.code + ')' : ''} dersinin sınavına hazırlanmak istiyorum${next ? ` (${Uni.evLeft(next)})` : ''}.\nKonular:\n${topics}\n\nBana gün gün bir çalışma planı yap (aktif hatırlama ve aralıklı tekrarla), her konu için en önemli kavramları ve sık sorulan soru tiplerini kısaca yaz, sonunda kendimi sınayabileceğim 5 soru sor. Konuyu bölümüme ve düzeyime göre anlat.`, '🎓 ' + c.name);
  }
  async function shareIcs() {
    const blob = new Blob([Uni.ics()], { type: 'text/calendar' });
    const name = 'luna-donem.ics';
    const file = window.File ? new File([blob], name, { type: 'text/calendar' }) : null;
    if (file && matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Dönem takvimi' }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    App.toast('📅', 'Takvim dosyası hazır', 'Açınca dersler, sınavlar ve hatırlatmalar telefon takvimine eklenir');
  }

  return {
    init(app) { App = app; bind(); },
    render,
    renderToday,
    onSession,
  };
})();

if (typeof window !== 'undefined') { window.UniUI = UniUI; }
