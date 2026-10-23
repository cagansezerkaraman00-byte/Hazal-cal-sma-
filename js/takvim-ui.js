/* Takvim sekmesi: telli masa takvimi. Bir güne dokununca o günün sayfası açılır: notlar ("Doğum günüm 🎂" gibi, istenirse her yıl),
   özel günler ve sınavlar, o günkü çalışma, sticker ve gün rengi, deneme planı, o günün planı (Planlarım ile aynı liste)
   ve geçmiş bir güne çalışma ekleme.
   Notlar D().dayNotes: {id, date: YYYY-AA-GG, text, emoji, yearly, remind, created, updated}.
   Süsler D().dayDecor: {id: 'dc-' + tarih, date, stickers: [en çok 3], tint, updated}.
   Planlanan denemeler D().denemePlan: Deneme sekmesinde de görünür; sonuç girilince gerçek denemeye dönüşüp analize katılır.
   Not günü gelince sayfanın üstünde yazar, Luna da bir kez söyler; "bir gün önce haber ver" açıksa (ve denemelerde her zaman) bir gün önceden de. */

const TakvimUI = (() => {
  const EMOJI = ['🎂', '💖', '🎉', '📚', '📝', '⭐', '🌸', '🎁', '✈️', '🩺'];
  const STICKERS = ['🌸', '🌷', '🌈', '⭐', '🌙', '☁️', '🦋', '🍓', '🍒', '🧁', '🎀', '💖', '💫', '🐱', '🐰', '🍀', '🌻', '🍉'];
  const TINTS = [['', 'Renksiz'], ['pembe', 'Pembe'], ['seftali', 'Şeftali'], ['limon', 'Limon'], ['nane', 'Nane'], ['gok', 'Gök mavisi'], ['lila', 'Lila']];
  const MONTH_STICKER = ['❄️', '💝', '🌱', '🌷', '🌼', '☀️', '🍉', '🐚', '📚', '🍁', '☕', '🎄'];
  const SAID_KEY = 'luna-takvim-soz', EVE_KEY = 'luna-takvim-yarin'; // Luna bugünün / yarının notunu söyledi mi (günde bir kez)
  let app = null, bound = false, view = null, sel = '';
  let form = { id: '', text: '', emoji: EMOJI[0], yearly: true, remind: true }, planDraft = '', dnType = 'TYT', dnDraft = '';

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
        ${st[0] ? `<span class="tk-st" aria-hidden="true">${st[0]}</span>` : ''}${st[1] ? `<span class="tk-st s2" aria-hidden="true">${st[1]}</span>` : ''}
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
        ${stuck.length ? `<div class="tk-stuck">${stuck.map((x, i) => `<button type="button" data-unstick="${i}" aria-label="${x} stickerını kaldır">${x}<i aria-hidden="true">✕</i></button>`).join('')}</div>` : ''}
        <div class="tk-stickers" role="group" aria-label="Sticker yapıştır">${STICKERS.map((x) => `<button type="button" data-stick="${x}" aria-label="${x} yapıştır">${x}</button>`).join('')}</div>
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
      if (stick) {
        const x = decor(sel);
        if (x.stickers.length >= 3) { app.toast('🌈', 'Bir güne en fazla 3 sticker', 'Kaldırmak için üstteki stickera dokun'); return; }
        x.stickers.push(stick.dataset.stick); x.updated = Date.now();
        app.save(); render(); popSticker();
        return;
      }
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
