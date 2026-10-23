/* Takvim sekmesi: telli masa takvimi. Bir güne dokununca o günün sayfası açılır: notlar ("Doğum günüm 🎂" gibi, istenirse her yıl),
   özel günler ve sınavlar, o günkü çalışma, sticker ve gün rengi, deneme planı, o günün planı (Planlarım ile aynı liste)
   ve geçmiş bir güne çalışma ekleme.
   Notlar D().dayNotes: {id, date: YYYY-AA-GG, text, emoji, yearly, remind, created, updated}.
   Süsler D().dayDecor: {id: 'dc-' + tarih, date, stickers: [en çok 3], tint, updated}.
   Planlanan denemeler D().denemePlan: Deneme sekmesinde de görünür; sonuç girilince gerçek denemeye dönüşüp analize katılır.
   Not günü gelince sayfanın üstünde yazar, Luna da bir kez söyler; "bir gün önce haber ver" açıksa (ve denemelerde her zaman) bir gün önceden de. */

const TakvimUI = (() => {
  const EMOJI = ['🎂', '💖', '🎉', '📚', '📝', '⭐', '🌸', '🎁', '✈️', '🩺'];
  const SD = () => window.StickerDefter || null;
  const stHtml = (x, cls) => (SD() ? SD().html(x, cls) : `<span class="${cls}">${esc(x)}</span>`);
  const stName = (x) => (SD() && SD().isImg(x) ? 'sticker' : x);
  const TINTS = [['', 'Renksiz'], ['pembe', 'Pembe'], ['seftali', 'Şeftali'], ['limon', 'Limon'], ['nane', 'Nane'], ['gok', 'Gök mavisi'], ['lila', 'Lila']];
  const MONTH_STICKER = ['❄️', '💝', '🌱', '🌷', '🌼', '☀️', '🍉', '🐚', '📚', '🍁', '☕', '🎄'];
  const SAID_KEY = 'luna-takvim-soz', EVE_KEY = 'luna-takvim-yarin'; // Luna bugünün / yarının notunu söyledi mi (günde bir kez)
  let app = null, bound = false, view = null, sel = '';
  let form = { id: '', text: '', emoji: EMOJI[0], yearly: true, remind: true }, planDraft = '', dnType = 'TYT', dnDraft = '';
  let bookPage = 0, book = null; // sticker defterinde açık sayfa ve açık pencere

  const $ = (s) => document.querySelector(s);
  const D = () => app.data();
  const esc = (s) => U.esc(String(s == null ? '' : s));
  const key = (d) => U.dateKey(d);
  const at = (k) => new Date(k + 'T12:00:00');
  const todayKey = () => key(new Date());
  const programMode = () => !!(window.Uni && window.UniUI) && Uni.isProgramMode();
  const list = () => (Array.isArray(D().dayNotes) ? D().dayNotes : (D().dayNotes = []));
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* gizli mod */ } };
  const blank = () => ({ id: '', text: '', emoji: EMOJI[0], yearly: true, remind: true });

  // o günün notları: o tarihe yazılanlar + her yıl tekrar edenler (yazıldığı yıldan sonra)
  function notesOn(k) {
    const md = k.slice(5);
    return list().filter((n) => n && typeof n.date === 'string' && (n.date === k || (n.yearly && n.date.slice(5) === md && n.date < k)));
  }
  // takvimin kendi bildiği günler: bayramlar, yılbaşı, 14 Şubat, sınavlar
  function special(k) {
    const out = [], md = k.slice(5);
    for (const e of window.Takvim ? Takvim.events(at(k)) : []) {
      if (e.key === 'yilbasi') {
        if (md === '01-01') out.push({ emoji: '🎆', text: 'Yılbaşı' });
        else if (md === '12-31') out.push({ emoji: '🎄', text: 'Yılbaşı gecesi' });
        continue;
      }
      out.push({ emoji: e.emoji, text: e.name });
    }
    if (programMode()) {
      for (const e of D().uni.events || []) if (e && e.date === k) out.push({ emoji: (Uni.EVENT_KINDS[e.kind] || ['📌'])[0], text: Uni.evName(e) });
      for (const c of D().uni.calendar || []) if (c && c.date === k) out.push({ emoji: (Uni.CAL_KINDS[c.kind] || Uni.CAL_KINDS.diger)[0], text: c.title || (Uni.CAL_KINDS[c.kind] || Uni.CAL_KINDS.diger)[1] });
    } else if (window.YKS && YKS.examDate) {
      const ex = YKS.examDate();
      if (ex === k) out.push({ emoji: '🎓', text: 'YKS 1. gün: TYT' });
      else if (ex && key(U.addDays(at(ex), 1)) === k) out.push({ emoji: '🎓', text: 'YKS 2. gün: AYT ve YDT' });
    }
    return out;
  }
  function minutesByDay() {
    const m = {};
    for (const s of D().sessions) { const k = key(s.start); m[k] = (m[k] || 0) + (+s.minutes || 0); }
    return m;
  }
  const planOn = (k) => (window.Planlar ? Planlar.list('day', k) : []);
  const level = (m) => { const r = m / (D().settings.dailyGoal || 180); return !m ? '' : r < 0.25 ? 'l1' : r < 0.6 ? 'l2' : r < 1 ? 'l3' : 'l4'; };
  function rel(k) {
    const n = Math.round((at(k) - at(todayKey())) / 864e5);
    return n === 0 ? 'Bugün' : n === 1 ? 'Yarın' : n === -1 ? 'Dün' : n > 0 ? `${n} gün sonra` : `${-n} gün önce`;
  }
  const longDate = (k) => { const d = at(k); return `${d.getDate()} ${U.MONTHS[d.getMonth()]} ${U.DAYS[d.getDay()]}`; };
  // süsler ve denemeler
  const decorList = () => (Array.isArray(D().dayDecor) ? D().dayDecor : (D().dayDecor = []));
  const decorOn = (k) => decorList().find((x) => x.date === k) || null;
  function decor(k) { // yoksa oluşturur
    let x = decorOn(k);
    if (!x) { x = { id: 'dc-' + k, date: k, stickers: [], tint: '', updated: 0 }; decorList().push(x); }
    return x;
  }
  const deneme = () => !programMode() && !!window.Deneme && !!window.DenemeUI;
  // Üniversite modu (ileride): burası vize / final / proje olacak; şimdilik deneme yalnızca YKS modunda (bkz. NOTLAR.md)
  const plansOn = (k) => (deneme() ? (D().denemePlan || []).filter((x) => x && x.date === k) : []);
  const doneOn = (k) => (deneme() ? D().denemeler.filter((x) => x && x.date === k) : []);
  const dnName = (t) => (t === 'BRANS' ? 'Branş' : window.Deneme ? Deneme.typeName(t) : t);
  const marksOf = (k) => notesOn(k).map((n) => ({ emoji: n.emoji, text: n.text }))
    .concat(plansOn(k).map((p) => ({ emoji: '📝', text: Deneme.planTitle(p) })))
    .concat(doneOn(k).map((e) => ({ emoji: '📊', text: `${e.name || Deneme.label(e) + ' denemesi'} · ${Deneme.fmt(Deneme.total(e))} net` })))
    .concat(special(k));

  // ---------- Takvim sayfası ----------
  function ribbon(today) {
    const t = marksOf(today).map((m) => `${m.emoji} ${esc(m.text)}`);
    if (t.length) return `<p class="tk-ribbon"><b>Bugün:</b> ${t.join(' · ')}</p>`;
    for (let i = 1; i <= 14; i++) { // bugün bir şey yoksa önümüzdeki iki haftanın ilk notu
      const k = key(U.addDays(at(today), i)), n = notesOn(k)[0];
      if (n) return `<p class="tk-ribbon soon"><b>Yaklaşan:</b> ${n.emoji} ${esc(n.text)} · ${rel(k).toLowerCase()}</p>`;
    }
    return '';
  }
  function grid(today) {
    const y = view.getFullYear(), m = view.getMonth(), mins = minutesByDay();
    const days = new Date(y, m + 1, 0).getDate(), pad = (new Date(y, m, 1, 12).getDay() + 6) % 7; // Pzt = 0
    let html = '<span class="tk-cell empty" aria-hidden="true"></span>'.repeat(pad);
    for (let d = 1; d <= days; d++) {
      const k = key(new Date(y, m, d, 12)), dow = (pad + d - 1) % 7, marks = marksOf(k), dc = decorOn(k);
      const lv = k <= today ? level(mins[k] || 0) : '', plan = planOn(k).length, st = dc ? dc.stickers : [];
      const cls = ['tk-cell', k === today ? 'today' : '', k === sel ? 'sel' : '', dow >= 5 ? 'we' : '', dc && dc.tint ? 't-' + dc.tint : ''].join(' ');
      const label = [longDate(k), ...marks.map((x) => x.text), mins[k] ? U.fmtMin(mins[k]) + ' çalışma' : '', plan ? plan + ' plan maddesi' : ''].filter(Boolean).join(', ');
      html += `<button type="button" class="${cls}" data-day="${k}" aria-label="${esc(label)}" aria-pressed="${k === sel}">
        ${st[0] ? stHtml(st[0], 'tk-st') : ''}${st[1] ? stHtml(st[1], 'tk-st s2') : ''}
        <span class="tk-n">${d}</span>${marks.length ? `<span class="tk-mark" aria-hidden="true">${marks.slice(0, 2).map((x) => x.emoji).join('')}${marks.length > 2 ? '<i>+</i>' : ''}</span>` : ''}
        ${lv ? `<span class="tk-star ${lv}" aria-hidden="true">★</span>` : plan && k >= today ? '<span class="tk-dot" aria-hidden="true"></span>' : ''}</button>`;
    }
    return html;
  }
  function renderMonth(today) {
    const root = $('#takvim-card');
    if (!root) return;
    const away = key(view).slice(0, 7) !== today.slice(0, 7) || sel !== today;
    root.innerHTML = `<div class="tk-wire" aria-hidden="true">${'<i></i>'.repeat(12)}</div>
      <span class="tk-corner" aria-hidden="true">${MONTH_STICKER[view.getMonth()]}</span>
      <div class="tk-page">
        <div class="tk-head">
          <button type="button" class="tk-nav" data-nav="-1" aria-label="Önceki ay">‹</button>
          <h2 class="tk-month"><span>${U.MONTHS[view.getMonth()]}</span><small>${view.getFullYear()}</small></h2>
          <button type="button" class="tk-nav" data-nav="1" aria-label="Sonraki ay">›</button>
        </div>
        ${ribbon(today)}
        <div class="tk-week" aria-hidden="true">${['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((d, i) => `<span class="${i >= 5 ? 'we' : ''}">${d}</span>`).join('')}</div>
        <div class="tk-grid">${grid(today)}</div>
        <div class="tk-legend" aria-hidden="true"><span><b class="tk-star l4">★</b> hedef tamam</span><span><b class="tk-star l2">★</b> çalıştın</span><span><i class="tk-dot"></i> plan var</span>${away ? '<button type="button" class="tk-back" data-nav="0">Bugüne dön</button>' : ''}</div>
      </div>`;
  }

  // ---------- Günün sayfası ----------
  function renderDay(today) {
    const root = $('#takvim-gun');
    if (!root) return;
    const k = sel, mine = notesOn(k), sp = special(k), mins = minutesByDay()[k] || 0, plan = planOn(k);
    const goal = D().settings.dailyGoal || 180;
    const rows = mine.map((n) => `<li class="tk-ev mine${n.id === form.id ? ' editing' : ''}"><button type="button" class="tk-ev-edit" data-edit="${esc(n.id)}" aria-label="${esc(n.text)} notunu düzenle">
          <span class="tk-ev-e">${n.emoji}</span><span class="tk-ev-t"><b>${esc(n.text)}</b><small>${[n.yearly ? 'her yıl' : '', n.remind ? 'bir gün önce haber verir' : ''].filter(Boolean).join(' · ') || 'dokun, düzenle'}</small></span><span class="tk-pen" aria-hidden="true">✎</span></button>
        <button type="button" class="tk-del" data-del="${esc(n.id)}" aria-label="${esc(n.text)} notunu sil">✕</button></li>`)
      .concat(sp.map((s) => `<li class="tk-ev"><span class="tk-ev-e">${s.emoji}</span><span class="tk-ev-t"><b>${esc(s.text)}</b></span></li>`)).join('');
    const facts = [];
    if (k <= today && mins) facts.push(`⭐ ${k === today ? 'Bugün şimdiye kadar' : 'O gün'} ${U.fmtMin(mins)} çalıştın${mins >= goal ? ' · hedef tamam 🎯' : ''}`);
    else if (k < today) facts.push('🌙 O gün çalışma kaydı yok; dinlenmek de yolun parçası.');
    if (k > today && !programMode() && window.YKS && YKS.examDate) {
      const n = Math.round((at(YKS.examDate()) - at(k)) / 864e5);
      if (n > 0) facts.push(`🎓 O gün YKS'ye ${n} gün kalacak`);
    }
    const planRows = plan.map((it) => it.moved
      ? `<li class="tk-pl moved"><span>↪</span><span class="tk-pl-t">${esc(it.title)}</span><small>taşındı</small></li>`
      : `<li class="tk-pl${it.done ? ' done' : ''}"><label><input type="checkbox" data-pdone="${esc(it.id)}" ${it.done ? 'checked' : ''}><span class="tk-pl-t">${esc(it.title)}</span></label>
          <button type="button" class="tk-del" data-pdel="${esc(it.id)}" aria-label="${esc(it.title)} maddesini sil">✕</button></li>`).join('');
    const editing = !!form.id, dc = decorOn(k), stuck = dc ? dc.stickers : [], tint = dc ? dc.tint : '';
    const decorHtml = `<section class="tk-sec tk-decor" aria-label="Sticker ve gün rengi">
        <h3>🌈 Sticker ve renk ${stuck.length ? `<small>${stuck.length}/3</small>` : ''}</h3>
        <div class="tk-stuck">${[0, 1, 2].map((i) => stuck[i]
          ? `<button type="button" data-unstick="${i}" aria-label="${esc(stName(stuck[i]))} stickerını kaldır">${stHtml(stuck[i], 'tk-stuck-i')}<i aria-hidden="true">✕</i></button>`
          : `<button type="button" class="empty" data-book aria-label="Boş yer: sticker defterini aç"><span aria-hidden="true">＋</span></button>`).join('')}
          ${SD() ? `<button type="button" class="tk-book-btn" data-book aria-label="Sticker defterini aç"><span class="tk-book-ic" aria-hidden="true"></span><small>Sticker defteri</small></button>` : ''}</div>
        <div class="tk-tints" role="radiogroup" aria-label="Gün rengi">${TINTS.map(([v, n]) => `<button type="button" role="radio" class="tint-${v || 'yok'}" data-tint="${v}" aria-checked="${v === tint}" aria-label="${n}" title="${n}"></button>`).join('')}</div>
      </section>`;
    const pl = plansOn(k), dn = doneOn(k);
    const dnHtml = !deneme() ? '' : `<section class="tk-sec tk-deneme" aria-label="Deneme">
        <h3>📝 Deneme</h3>
        ${pl.length || dn.length ? `<ul class="tk-dn-list">${pl.map((x) => `<li class="tk-dn"><span class="type-tag" data-type="${x.type === 'BRANS' ? 'BRANS' : esc(dnName(x.type))}">${esc(dnName(x.type))}</span>
            <span class="tk-dn-t"><b>${esc(x.name || dnName(x.type) + ' denemesi')}</b><small>${k <= today ? 'sonuçlarını bekliyor' : 'planlandı'}</small></span>
            <button type="button" class="btn ${k <= today ? 'primary' : 'soft'} small-btn" data-dres="${esc(x.id)}">Sonuçları gir</button>
            <button type="button" class="tk-del" data-ddel="${esc(x.id)}" aria-label="Deneme planını sil">✕</button></li>`).join('')}${dn.map((e) => `<li class="tk-dn done"><span class="type-tag" data-type="${esc(Deneme.kind(e))}">${esc(Deneme.label(e))}</span>
            <span class="tk-dn-t"><b>${esc(e.name || Deneme.label(e) + ' denemesi')}</b><small>${Deneme.fmt(Deneme.total(e))} net</small></span>
            <button type="button" class="btn soft small-btn" data-dgo>Analiz ›</button></li>`).join('')}</ul>` : ''}
        <form class="tk-dn-form" data-form="deneme" autocomplete="off">
          <div class="seg tk-dn-types" role="radiogroup" aria-label="Deneme türü">${['TYT', 'AYT', 'BRANS'].map((t) => `<button type="button" role="radio" data-dtype="${t}" class="${t === dnType ? 'active' : ''}" aria-checked="${t === dnType}">${esc(dnName(t))}</button>`).join('')}</div>
          <div class="tk-row-form"><input id="tk-dname" maxlength="40" placeholder="Adı / yayın (isteğe bağlı)" value="${esc(dnDraft)}" aria-label="Deneme adı"><button class="btn soft" type="submit">Planla</button></div>
        </form>
      </section>`;
    root.innerHTML = `<div class="tk-d-head"><h2>${longDate(k)}</h2><span>${rel(k)}</span></div>
      ${rows ? `<ul class="tk-evs">${rows}</ul>` : '<p class="tk-empty">Bu günün henüz notu yok. Aşağıdan ekleyebilirsin 🌸</p>'}
      ${facts.length ? `<ul class="tk-facts">${facts.map((f) => `<li>${f}</li>`).join('')}</ul>` : ''}
      ${decorHtml}
      ${dnHtml}
      <section class="tk-sec" aria-label="Bu günün planı">
        <h3>🗓️ Bu günün planı${plan.length ? ` <small>${plan.filter((x) => x.done).length}/${plan.filter((x) => !x.moved).length}</small>` : ''}</h3>
        ${planRows ? `<ul class="tk-plan">${planRows}</ul>` : ''}
        <form class="tk-row-form" data-form="plan" autocomplete="off">
          <input id="tk-ptext" maxlength="120" placeholder="Plana ekle: Türev 20 soru" value="${esc(planDraft)}" aria-label="Bu güne plan maddesi ekle">
          <button class="btn soft" type="submit">Ekle</button>
        </form>
      </section>
      <form class="tk-sec tk-note-form${editing ? ' editing' : ''}" data-form="note" autocomplete="off">
        <h3>${editing ? '✎ Notu düzenle' : '💌 Bu güne not ekle'}</h3>
        <div class="tk-add-row">
          <input id="tk-text" maxlength="60" placeholder="Doğum günüm, sınav, buluşma…" value="${esc(form.text)}" aria-label="Not">
          <button class="btn primary" type="submit">${editing ? 'Kaydet' : 'Ekle'}</button>
        </div>
        <div class="tk-emojis" role="radiogroup" aria-label="Not simgesi">${EMOJI.map((e) => `<button type="button" role="radio" data-emoji="${e}" aria-checked="${e === form.emoji}">${e}</button>`).join('')}</div>
        <label class="tk-check"><input type="checkbox" data-opt="yearly" ${form.yearly ? 'checked' : ''}> Her yıl tekrarla (doğum günü gibi)</label>
        <label class="tk-check"><input type="checkbox" data-opt="remind" ${form.remind ? 'checked' : ''}> Bir gün önce Luna haber versin</label>
        ${editing ? '<button type="button" class="tk-back" data-cancel>Vazgeç</button>' : ''}
      </form>
      ${k <= today ? '<button type="button" class="btn soft wide" data-session>＋ Bu güne çalışma ekle</button>' : ''}`;
  }

  // ---------- Yaklaşanlar ----------
  function renderSoon(today) {
    const root = $('#takvim-yakin');
    if (!root) return;
    const rows = [];
    for (let i = 1; i <= 90 && rows.length < 10; i++) {
      const k = key(U.addDays(at(today), i));
      for (const m of marksOf(k)) if (rows.length < 10) rows.push({ k, ...m });
    }
    root.innerHTML = `<h2>✨ Yaklaşan günler</h2>
      ${rows.length ? `<ul class="tk-soon">${rows.map((r) => `<li><button type="button" data-go="${r.k}"><span class="tk-ev-e">${r.emoji}</span><span class="tk-ev-t"><b>${esc(r.text)}</b><small>${longDate(r.k)}</small></span><span class="tk-rel">${rel(r.k)}</span></button></li>`).join('')}</ul>`
        : '<p class="tk-empty">Önümüzdeki üç ayda not yok. Takvimde bir güne dokunup doğum günlerini, sınavlarını ekleyebilirsin.</p>'}`;
  }

  function render() {
    if (!app || !$('#takvim-card')) return;
    // yazarken yeniden çizilip yazı kaybolmasın
    const a = document.activeElement;
    if (a && (a.id === 'tk-text' || a.id === 'tk-ptext' || a.id === 'tk-dname')) return;
    const today = todayKey();
    if (!view) view = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12);
    if (!sel) sel = today;
    renderMonth(today);
    renderDay(today);
    renderSoon(today);
  }
  function pick(k, scroll) {
    if (sel !== k) form = blank();
    sel = k;
    view = new Date(at(k).getFullYear(), at(k).getMonth(), 1, 12);
    render();
    const day = $('#takvim-gun');
    if (scroll && day && day.getBoundingClientRect().top > window.innerHeight - 140) day.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  function bind() {
    const tab = $('#tab-takvim');
    if (bound || !tab) return;
    bound = true;
    tab.addEventListener('click', (e) => {
      const t = e.target;
      const nav = t.closest('[data-nav]');
      if (nav) {
        const n = +nav.dataset.nav, now = new Date();
        if (!n) { view = new Date(now.getFullYear(), now.getMonth(), 1, 12); if (sel !== todayKey()) form = blank(); sel = todayKey(); }
        else {
          view = new Date(view.getFullYear(), view.getMonth() + n, 1, 12);
          if (sel.slice(0, 7) !== key(view).slice(0, 7)) { form = blank(); sel = key(view).slice(0, 7) === todayKey().slice(0, 7) ? todayKey() : key(view); }
        }
        render();
        return;
      }
      const day = t.closest('[data-day]');
      if (day) { pick(day.dataset.day, true); return; }
      const go = t.closest('[data-go]');
      if (go) { pick(go.dataset.go, false); const c = $('#takvim-card'); if (c) c.scrollIntoView({ block: 'start' }); return; }
      const em = t.closest('[data-emoji]');
      if (em) { syncForm(); form.emoji = em.dataset.emoji; if (form.emoji === '🎂' && !form.id) form.yearly = true; render(); return; }
      const ed = t.closest('[data-edit]');
      if (ed) {
        const n = list().find((x) => x.id === ed.dataset.edit);
        if (n) { form = { id: n.id, text: n.text, emoji: n.emoji, yearly: !!n.yearly, remind: !!n.remind }; render(); const i = $('#tk-text'); if (i) i.focus({ preventScroll: false }); }
        return;
      }
      if (t.closest('[data-cancel]')) { form = blank(); render(); return; }
      const del = t.closest('[data-del]');
      if (del) {
        const arr = list(), i = arr.findIndex((n) => n.id === del.dataset.del);
        if (i < 0) return;
        const [gone] = arr.splice(i, 1);
        Store.forget(gone.id);
        if (form.id === gone.id) form = blank();
        app.save();
        render();
        app.toast('🗓️', 'Not silindi', gone.text);
        return;
      }
      const pdel = t.closest('[data-pdel]');
      if (pdel) { if (Planlar.remove(pdel.dataset.pdel)) { app.refresh(); render(); } return; }
      if (t.closest('[data-session]')) { app.addSession(sel); return; }
      // sticker yapıştır / kaldır, gün rengi
      const stick = t.closest('[data-stick]');
      if (stick) { stickOn(stick.dataset.stick); return; }
      if (t.closest('[data-book]')) { openBook(); return; }
      const un = t.closest('[data-unstick]');
      if (un) { const x = decor(sel); x.stickers.splice(+un.dataset.unstick, 1); x.updated = Date.now(); app.save(); render(); return; }
      const tn = t.closest('[data-tint]');
      if (tn) { const x = decor(sel); x.tint = tn.dataset.tint; x.updated = Date.now(); app.save(); render(); return; }
      // deneme planı
      const dt = t.closest('[data-dtype]');
      if (dt) { const i = $('#tk-dname'); if (i) dnDraft = i.value; dnType = dt.dataset.dtype; render(); return; }
      const dres = t.closest('[data-dres]');
      if (dres) { DenemeUI.openPlan(dres.dataset.dres); return; }
      const ddel = t.closest('[data-ddel]');
      if (ddel) { if (DenemeUI.removePlan(ddel.dataset.ddel)) { app.save(); app.refresh(); render(); app.toast('📝', 'Deneme planı silindi'); } return; }
      if (t.closest('[data-dgo]')) app.showTab('deneme');
    });
    tab.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.opt) { form[t.dataset.opt] = t.checked; return; }
      if (t.dataset.pdone) {
        const r = Planlar.setDone(t.dataset.pdone, t.checked);
        if (r && t.checked) {
          if (r.fullDay) { app.sayText('Bu günün planı tamam! 🌟 Takvimine bir yıldız daha kondu.', { emotion: 'proud' }); app.celebrate(); }
          else app.sayText('Bir madde daha bitti ✨');
        }
        app.refresh();
        render();
      }
    });
    tab.addEventListener('input', (e) => {
      if (e.target.id === 'tk-text') form.text = e.target.value;
      if (e.target.id === 'tk-ptext') planDraft = e.target.value;
      if (e.target.id === 'tk-dname') dnDraft = e.target.value;
    });
    tab.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target.dataset.form;
      if (f === 'deneme') {
        const input = $('#tk-dname'), name = (input ? input.value : dnDraft).trim().slice(0, 40), now = Date.now();
        if (!Array.isArray(D().denemePlan)) D().denemePlan = [];
        D().denemePlan.push({ id: 'dp' + U.uid(), date: sel, type: dnType, name, created: now, updated: now });
        dnDraft = '';
        if (input) input.blur();
        app.save();
        app.refresh();
        render();
        app.toast('📝', `${dnName(dnType)} denemesi planlandı`, `${longDate(sel)} · Deneme sekmesinde de görünüyor`);
        if (sel === todayKey() || sel === key(U.addDays(new Date(), 1))) setTimeout(sayToday, 600);
        return;
      }
      if (f === 'plan') {
        const input = $('#tk-ptext'), title = (input ? input.value : planDraft).trim();
        if (!title) { if (input) input.focus(); return; }
        if (!Planlar.add('day', sel, { title })) { app.toast('🗓️', 'Bu güne en fazla 40 madde eklenebilir'); return; }
        planDraft = '';
        if (input) input.blur();
        app.refresh();
        render();
        return;
      }
      if (f !== 'note') return;
      syncForm();
      const input = $('#tk-text'), text = form.text.trim().slice(0, 60);
      if (!text) { if (input) input.focus(); return; }
      const now = Date.now();
      const n = form.id && list().find((x) => x.id === form.id);
      if (n) Object.assign(n, { text, emoji: form.emoji, yearly: form.yearly, remind: form.remind, updated: now });
      else list().push({ id: 'g' + U.uid(), date: sel, text, emoji: form.emoji, yearly: form.yearly, remind: form.remind, created: now, updated: now });
      const was = form.emoji;
      form = blank();
      if (input) input.blur();
      app.save();
      render();
      app.toast(was, n ? 'Not güncellendi' : 'Takvime eklendi', `${longDate(sel)}: ${text}`);
      if (sel === todayKey() || sel === key(U.addDays(new Date(), 1))) setTimeout(sayToday, 600);
    });
  }
  // güne sticker yapıştır (en çok 3); defterden de buradan
  function stickOn(x) {
    const d = decor(sel);
    if (d.stickers.length >= 3) { app.toast('🌈', 'Bir güne en fazla 3 sticker', 'Kaldırmak için üstteki stickera dokun'); return false; }
    d.stickers.push(x); d.updated = Date.now();
    app.save(); render(); popSticker();
    return true;
  }

  // ---------- Sticker defteri: envanter gibi; kapağı açılır, oklarla sayfa sayfa çevrilir ----------
  // Kapak ve kâğıt görselleri css'teki --bk-kapak / --bk-kagit ile gelir (Hazal'ın tasarımı gelince yalnızca oraya yazılır).
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function slots() {
    const d = decorOn(sel), stuck = d ? d.stickers : [];
    return [0, 1, 2].map((i) => (stuck[i]
      ? `<button type="button" class="bk-slot full" data-bk-un="${i}" aria-label="${esc(stName(stuck[i]))} stickerını kaldır">${stHtml(stuck[i], 'bk-st')}</button>`
      : '<span class="bk-slot" aria-hidden="true"></span>')).join('');
  }
  function pageHtml(i) {
    const p = SD().PAGES[i];
    return `<div class="bk-ph"><b>${p.icon} ${esc(p.title)}</b>${p.parts > 1 ? `<span>${p.part}/${p.parts}</span>` : ''}</div>
      <div class="bk-grid">${p.items.map((x) => `<button type="button" class="bk-cell" data-pick="${esc(x)}" aria-label="${esc(p.title)} stickerı yapıştır">${stHtml(x, 'bk-st')}</button>`).join('')}</div>`;
  }
  function bookSync() {
    if (!book) return;
    book.querySelector('.bk-slots').innerHTML = slots();
    book.querySelector('.bk-count').textContent = `${bookPage + 1} / ${SD().PAGES.length}`;
  }
  let sliding = false;
  // Defter sayfası gibi çevrilir: ileri giderken üstteki sayfa sırtından kalkıp döner, altındaki yeni sayfa görünür;
  // geri giderken önceki sayfa sırttan dönüp yığının üstüne iner. Hareket azaltılmışsa sayfa doğrudan değişir.
  function turn(step) {
    const n = SD().PAGES.length, to = (bookPage + step + n) % n, view = book && book.querySelector('.bk-view');
    if (!view || sliding || n < 2) return;
    const old = view.querySelector('.bk-page:not(.flip)'), next = document.createElement('div');
    next.className = 'bk-page';
    next.innerHTML = pageHtml(to);
    bookPage = to;
    lsSet('luna-defter-sayfa', String(to));
    bookSync();
    if (calm() || !old || !old.animate) { if (old) old.replaceWith(next); else view.appendChild(next); return; }
    sliding = true;
    const fwd = step > 0, mover = fwd ? old : next;
    if (fwd) view.insertBefore(next, old); else view.appendChild(next);
    mover.classList.add('flip');
    const shade = document.createElement('i');
    shade.className = 'bk-shade';
    mover.appendChild(shade);
    // sayfa dik konumu geçince arkası görünmez; o yüzden -110°'de biter (boşta bekleme olmaz)
    const flat = 'rotateY(0deg)', up = 'rotateY(-110deg)', opt = { duration: 520, easing: 'cubic-bezier(.45, .05, .3, 1)' };
    shade.animate([{ opacity: fwd ? 0 : 0.55 }, { opacity: fwd ? 0.55 : 0 }], opt);
    mover.animate(fwd ? [{ transform: flat }, { transform: up }] : [{ transform: up }, { transform: flat }], opt).onfinish = () => {
      if (fwd) old.remove(); else { old.remove(); next.classList.remove('flip'); shade.remove(); }
      sliding = false;
    };
  }
  function openSimpleBook() {
    if (!SD() || !SD().PAGES.length) return;
    const n = SD().PAGES.length, saved = +lsGet('luna-defter-sayfa');
    bookPage = Number.isInteger(saved) && saved >= 0 && saved < n ? saved : 0;
    sliding = false;
    book = app.openModal(`<div class="bk">
        <div class="bk-top"><b>Sticker defteri</b><button type="button" class="bk-x" data-bk="close" aria-label="Defteri kapat">✕</button></div>
        <div class="bk-equip"><span>${longDate(sel)}</span><div class="bk-slots"></div></div>
        <div class="bk-book">
          <div class="bk-view"><div class="bk-page">${pageHtml(bookPage)}</div></div>
          <div class="bk-cover" aria-hidden="true"><b>Sticker defteri</b><small>${esc(D().settings.name || '')}</small></div>
        </div>
        <div class="bk-nav"><button type="button" class="bk-arrow" data-bk="prev" aria-label="Önceki sayfa">‹</button><span class="bk-count"></span><button type="button" class="bk-arrow" data-bk="next" aria-label="Sonraki sayfa">›</button></div>
      </div>`);
    book.classList.add('bk-card');
    bookSync();
    // kapak sırtından açılır
    const cover = book.querySelector('.bk-cover');
    if (calm() || !cover.animate) cover.remove();
    else cover.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-12deg)', offset: 0.18 }, { transform: 'rotateY(-110deg)' }], { duration: 950, delay: 350, easing: 'cubic-bezier(.5, 0, .35, 1)', fill: 'forwards' }).onfinish = () => cover.remove();
    let x0 = null, y0 = 0, swiped = false;
    const area = book.querySelector('.bk-view');
    area.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; swiped = false; });
    area.addEventListener('pointerup', (e) => {
      if (x0 == null) return;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) { swiped = true; turn(dx < 0 ? 1 : -1); }
    });
    area.addEventListener('pointercancel', () => { x0 = null; });
    book.addEventListener('click', (e) => {
      const t = e.target;
      const b = t.closest('[data-bk]');
      if (b) { if (b.dataset.bk === 'close') { app.closeModal(); book = null; } else turn(b.dataset.bk === 'next' ? 1 : -1); return; }
      const un = t.closest('[data-bk-un]');
      if (un) { const d = decor(sel); d.stickers.splice(+un.dataset.bkUn, 1); d.updated = Date.now(); app.save(); render(); bookSync(); return; }
      const pk = t.closest('[data-pick]');
      if (pk) {
        if (swiped) { swiped = false; return; } // kaydırma dokunuş sayılmasın
        if (stickOn(pk.dataset.pick)) {
          bookSync();
          if (!calm() && pk.animate) pk.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.22) rotate(-8deg)' }, { transform: 'scale(1)' }], { duration: 320 });
        }
      }
    });
    book.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') turn(1); if (e.key === 'ArrowLeft') turn(-1); });
  }

  // ---------- Gerçek defter: ekranı kaplar, sayfalar köşeden kıvrılarak çevrilir (StPageFlip, vendor/page-flip) ----------
  // Telefon dikken tek sayfa, yan çevrilince iki sayfa yan yana; arkada sert kapak ve sayfa kenarları görünür.
  // Kütüphane ilk açılışta yüklenir; yüklenemezse (ilk açılış internetsiz) basit defter açılır.
  const FLIP_SRC = 'vendor/page-flip-2.0.7/page-flip.browser.js';
  let flipLib = null, flip = null, scene = null;
  function loadFlip() {
    if (window.St && window.St.PageFlip) return Promise.resolve(true);
    if (!flipLib) flipLib = new Promise((ok) => {
      const sc = document.createElement('script');
      sc.src = FLIP_SRC; sc.async = true;
      sc.onload = () => ok(!!(window.St && window.St.PageFlip));
      sc.onerror = () => { flipLib = null; ok(false); };
      document.head.appendChild(sc);
    });
    return flipLib;
  }
  function flipPages() {
    const name = esc(D().settings.name || '');
    const pages = [`<div class="df-sayfa df-kapak" data-density="hard"><div class="df-pg df-kapak-pg"><div class="df-kapak-ic"><b>Sticker defteri</b><small>${name}</small></div></div></div>`,
      `<div class="df-sayfa df-ic" data-density="hard"><div class="df-pg df-ic-pg"><p>${name ? name + "'ın" : 'Benim'}<br>sticker defteri</p><small>Bir stickera dokun, güne yapışsın</small></div></div>`];
    // kütüphane sayfanın display'ini kendisi ayarlar; düzen içteki kutuda
    SD().PAGES.forEach((p, i) => pages.push(`<div class="df-sayfa df-kagit"><div class="df-pg">${pageHtml(i)}<span class="df-no">${i + 1}</span></div></div>`));
    if (pages.length % 2) pages.push('<div class="df-sayfa df-kagit df-bos"></div>'); // arka kapak tek başına kalsın diye çift sayıda sayfa
    pages.push('<div class="df-sayfa df-ic" data-density="hard"></div>', '<div class="df-sayfa df-kapak df-arka" data-density="hard"></div>');
    return pages.join('');
  }
  const isLand = () => window.innerWidth > window.innerHeight;
  // defterin boyu: dikken tek sayfa ekrana sığar (kenarlar görünsün diye biraz küçük), yanken iki sayfa
  function sizeBook() {
    const area = scene.querySelector('.df-alan'), el = scene.querySelector('.df-flip');
    const w = area.clientWidth, h = area.clientHeight, land = isLand();
    const pageW = land ? Math.min(w * 0.94 / 2, h * 0.9 * 0.75) : Math.min(w * 0.82, h * 0.88 * 0.75);
    el.style.width = Math.round(land ? pageW * 2 : pageW) + 'px';
    el.style.height = Math.round(pageW / 0.75) + 'px';
    return { land, pageW };
  }
  // arkadaki sert kapak ve sayfa yığını: açıkken iki sayfanın, kapalıyken yalnızca kapağın arkasında
  function placeBoard() {
    if (!scene || !flip) return;
    const el = scene.querySelector('.df-flip'), board = scene.querySelector('.df-arka-kapak');
    const n = flip.getPageCount(), i = flip.getCurrentPageIndex(), land = flip.getOrientation() === 'landscape';
    const half = el.offsetWidth / 2, closed = land && (i === 0 || i >= n - 1);
    const left = el.offsetLeft + (land && i === 0 ? half : 0), width = land ? (closed ? half : half * 2) : el.offsetWidth;
    board.style.left = left + 'px'; board.style.top = el.offsetTop + 'px';
    board.style.width = width + 'px'; board.style.height = el.offsetHeight + 'px';
    board.classList.toggle('kapali', closed || i === 0);
    board.classList.toggle('acik', land && !closed);
  }
  function sceneSync() {
    if (!scene) return;
    scene.querySelector('.df-slots').innerHTML = slots();
  }
  function buildFlip(start) {
    const el = scene.querySelector('.df-flip');
    if (flip) { try { flip.destroy(); } catch (e) { /* yok say */ } flip = null; }
    el.innerHTML = flipPages();
    // boyu biz veriyoruz (autoSize kapalı): dikken kutu tek sayfa genişliğinde olduğu için kütüphane tek sayfa gösterir
    const { land, pageW } = sizeBook();
    flip = new window.St.PageFlip(el, {
      width: 600, height: 800, size: 'stretch', autoSize: false, minWidth: Math.round(pageW * 0.6), maxWidth: 4000, minHeight: 100, maxHeight: 6000,
      showCover: true, usePortrait: true, drawShadow: true, maxShadowOpacity: 0.55, flippingTime: 850,
      mobileScrollSupport: false, clickEventForward: true, disableFlipByClick: true, swipeDistance: 25, showPageCorners: true,
      startPage: Math.max(0, Math.min(start, el.children.length - 1)),
    });
    flip.loadFromHTML(el.querySelectorAll('.df-sayfa'));
    flip.on('flip', (e) => { const p = e.data - 2; if (p >= 0 && p < SD().PAGES.length) lsSet('luna-defter-sayfa', String(p)); placeBoard(); });
    flip.on('changeOrientation', placeBoard);
    flip.on('changeState', placeBoard);
    scene.dataset.yon = land ? 'yan' : 'dik';
    placeBoard();
  }
  let resizeT = 0;
  function onResize() {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      if (!scene || !flip) return;
      if ((scene.dataset.yon === 'yan') !== isLand()) buildFlip(flip.getCurrentPageIndex()); // dik ↔ yan: tek sayfa ↔ iki sayfa
      else { sizeBook(); flip.update(); placeBoard(); }
    }, 180);
  }
  function closeBook() {
    if (!scene) return;
    const sc = scene;
    scene = null;
    window.removeEventListener('resize', onResize);
    document.removeEventListener('keydown', onKey, true);
    sc.classList.add('kapaniyor');
    setTimeout(() => { if (flip) { try { flip.destroy(); } catch (e) { /* yok say */ } flip = null; } sc.remove(); }, calm() ? 0 : 260);
  }
  function onKey(e) {
    if (!scene) return;
    if (e.key === 'Escape') { e.stopPropagation(); closeBook(); }
    else if (e.key === 'ArrowRight' && flip) flip.flipNext('bottom');
    else if (e.key === 'ArrowLeft' && flip) flip.flipPrev('bottom');
  }
  async function openBook() {
    if (!SD() || !SD().PAGES.length || scene) return;
    if (!(await loadFlip())) { openSimpleBook(); return; }
    scene = document.createElement('div');
    scene.className = 'df-sahne';
    scene.setAttribute('role', 'dialog'); scene.setAttribute('aria-modal', 'true'); scene.setAttribute('aria-label', 'Sticker defteri');
    scene.innerHTML = `<button type="button" class="df-x" data-df="close" aria-label="Defteri kapat">✕</button>
      <div class="df-alan"><div class="df-arka-kapak kapali" aria-hidden="true"><i></i></div><div class="df-flip"></div></div>
      <div class="df-alt">
        <button type="button" class="df-ok" data-df="prev" aria-label="Önceki sayfa">‹</button>
        <div class="df-gun"><span>${longDate(sel)}</span><div class="df-slots"></div></div>
        <button type="button" class="df-ok" data-df="next" aria-label="Sonraki sayfa">›</button>
      </div>`;
    document.body.appendChild(scene);
    sceneSync();
    const saved = +lsGet('luna-defter-sayfa'), resume = Number.isInteger(saved) && saved > 0 && saved < SD().PAGES.length ? saved : -1;
    buildFlip(0);
    window.addEventListener('resize', onResize);
    document.addEventListener('keydown', onKey, true);
    // açılış: kapalı defter belirir, kapak kendiliğinden açılır (kaldığın sayfa varsa oraya gider)
    setTimeout(() => {
      if (!scene || !flip) return;
      if (resume > 0) flip.flip(resume + 2, 'bottom'); else flip.flipNext('bottom');
    }, calm() ? 0 : 650);
    scene.addEventListener('click', (e) => {
      const t = e.target;
      const b = t.closest('[data-df]');
      if (b) { const a = b.dataset.df; if (a === 'close') closeBook(); else if (flip) (a === 'next' ? flip.flipNext('bottom') : flip.flipPrev('bottom')); return; }
      const un = t.closest('[data-bk-un]');
      if (un) { const d = decor(sel); d.stickers.splice(+un.dataset.bkUn, 1); d.updated = Date.now(); app.save(); render(); sceneSync(); return; }
      const pk = t.closest('[data-pick]');
      if (pk && stickOn(pk.dataset.pick)) {
        sceneSync();
        const img = pk.querySelector('.bk-st');
        if (!calm() && img && img.animate) img.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25) rotate(-8deg)' }, { transform: 'scale(1)' }], { duration: 320 });
      }
    });
  }

  // yeni yapışan sticker hafifçe zıplar (hareket azaltılmışsa durur)
  function popSticker() {
    const c = $(`#takvim-card [data-day="${sel}"] .tk-st`);
    if (!c || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    c.classList.add('pop');
  }
  // açık formdaki kutucuklar (yazı yazılırken çizim atlanabildiği için) kaybolmasın
  function syncForm() {
    const i = $('#tk-text');
    if (i) form.text = i.value;
    document.querySelectorAll('#takvim-gun [data-opt]').forEach((c) => { form[c.dataset.opt] = c.checked; });
  }

  // o günün notunu (yoksa yarının "haber ver" notunu) Luna bir kez söyler; odakta, açık pencere varken ya da az önce konuştuysa bekler
  let tries = 0;
  function sayToday() {
    const today = todayKey(), tomorrow = key(U.addDays(at(today), 1));
    // denemeler not gibi söylenir; bir gün önce her zaman haber verilir
    const asNote = (p) => ({ emoji: '📝', text: Deneme.planTitle(p), remind: true, deneme: true });
    const mine = notesOn(today).concat(plansOn(today).map(asNote)), eve = notesOn(tomorrow).filter((n) => n.remind).concat(plansOn(tomorrow).map(asNote));
    const todayDue = mine.length && lsGet(SAID_KEY) !== today, eveDue = eve.length && lsGet(EVE_KEY) !== today;
    if (!todayDue && !eveDue) return;
    const busy = app.isFocusing() || !$('#modal').classList.contains('hidden') || app.quietFor(8000) || document.hidden;
    if (busy) { if (++tries < 40) setTimeout(sayToday, 15000); return; }
    const name = D().settings.name || 'canım', bday = (arr) => arr.find((n) => /doğum ?günüm/i.test(n.text));
    const join = (arr) => arr.map((n) => `${n.emoji} ${n.text}`).join(', ');
    if (todayDue) {
      const b = bday(mine);
      const text = b ? `İyi ki doğdun ${name}! 🎂 Bugün senin günün; takvimine kocaman bir yıldız kondurdum ✨`
        : `Takvimine baktım: bugün ${join(mine)} ✨ ${mine.some((n) => n.deneme) ? 'Bitince sonuçlarını gir, analizini birlikte yapalım.' : 'Unutmadım!'}`;
      if (app.sayText(text, { speaker: 'luna', emotion: 'happy' })) { lsSet(SAID_KEY, today); if (b) app.celebrate(); }
      if (eveDue) setTimeout(sayToday, 20000);
      return;
    }
    const text = bday(eve) ? `Yarın senin doğum günün 🎂 Şimdiden heyecanlandım ${name}!`
      : `Yarın takviminde: ${join(eve)} 🗓️ ${eve.some((n) => n.deneme) ? 'Bu akşam erken uyu, kalemlerini hazırla.' : 'Unutmayalım diye söylüyorum.'}`;
    if (app.sayText(text, { speaker: 'luna', emotion: 'happy' })) lsSet(EVE_KEY, today);
  }

  return {
    init(a) { app = a; bind(); render(); setTimeout(sayToday, 6000); },
    render() { bind(); render(); },
    open(k) { pick(k || todayKey(), false); },
    notesOn,
    special,
  };
})();

if (typeof window !== 'undefined') { window.TakvimUI = TakvimUI; }
