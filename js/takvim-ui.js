/* Takvim sekmesi: telli masa takvimi. Bir güne dokununca o günün sayfası açılır: notlar ("Doğum günüm 🎂" gibi, istenirse her yıl),
   özel günler ve sınavlar, o günkü çalışma, sticker ve gün rengi, deneme planı, o günün planı (Planlarım ile aynı liste)
   ve geçmiş bir güne çalışma ekleme.
   Notlar D().dayNotes: {id, date: YYYY-AA-GG, text, emoji, yearly, remind, created, updated}.
   Süsler D().dayDecor: {id: 'dc-' + tarih, date, stickers: [en çok 3], tint, oto, updated}. Sticker yapıştırılınca gün onun rengine
   boyanır (oto: true); rengi elle seçtiysen (oto: false) dokunulmaz.
   Planlanan denemeler D().denemePlan: Deneme sekmesinde de görünür; sonuç girilince gerçek denemeye dönüşüp analize katılır.
   Not günü gelince sayfanın üstünde yazar, Luna da bir kez söyler; "bir gün önce haber ver" açıksa (ve denemelerde her zaman) bir gün önceden de. */

const TakvimUI = (() => {
  const EMOJI = ['🎂', '💖', '🎉', '📚', '📝', '⭐', '🌸', '🎁', '✈️', '🩺'];
  const SD = () => window.StickerDefter || null;
  const stHtml = (x, cls, lazy) => (SD() ? SD().html(x, cls, lazy) : `<span class="${cls}">${esc(x)}</span>`);
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
  const TYPING = ['tk-text', 'tk-ptext', 'tk-dname']; // bunlara yazılırken sayfa arkadan yeniden çizilmez

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
      out.push({ emoji: e.emoji, text: e.name, sub: e.not || '', dogum: e.key === 'dogumgunu' });
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
  // gün, üstündeki ilk renkli stickerın rengine boyanır; rengi sen seçtiysen (ya da bu özellikten önce seçtiysen) o kalır
  function autoTint(d) {
    if (d.oto === false || (d.oto !== true && d.tint)) return;
    const t = (SD() && d.stickers.map((x) => SD().tint(x)).find(Boolean)) || '';
    d.tint = t;
    if (t) d.oto = true; else delete d.oto;
  }
  // görünen gün rengi: kayıtlı renk; yoksa (elle "Renksiz" seçilmediyse) ilk renkli stickerın rengi
  const tintOf = (d) => (!d ? '' : d.tint || (d.oto !== false && SD() && d.stickers.map((x) => SD().tint(x)).find(Boolean)) || '');
  // son yapıştırdığın stickerlar (en yeni önce): defteri açmadan tek dokunuşla yapıştırmak için
  function recentStickers(k) {
    const on = new Set(decorOn(k) ? decorOn(k).stickers : []), out = [];
    if (!SD()) return out;
    for (const x of decorList().slice().sort((a, b) => (b.updated || 0) - (a.updated || 0))) {
      for (const st of x.stickers) if (SD().isImg(st) && SD().known(st) && !on.has(st) && !out.includes(st)) out.push(st);
      if (out.length >= 6) break;
    }
    return out.slice(0, 6);
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
      const k = key(U.addDays(at(today), i)), n = notesOn(k)[0] || special(k).find((x) => x.dogum);
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
      const tn = tintOf(dc), cls = ['tk-cell', k === today ? 'today' : '', k === sel ? 'sel' : '', dow >= 5 ? 'we' : '', tn ? 't-' + tn : ''].join(' ');
      const label = [longDate(k), ...marks.map((x) => x.text), mins[k] ? U.fmtMin(mins[k]) + ' çalışma' : '', plan ? plan + ' plan maddesi' : ''].filter(Boolean).join(', ');
      // her günün stickerı biraz farklı açıyla durur (elle yapıştırılmış gibi)
      const tilt = st.length ? ` style="--r:${[-14, -8, -17, -5, -11, -19, -7][d % 7] + (d % 3) * 2}deg;--r2:${[9, 15, 6, 13, 18][d % 5]}deg"` : '';
      html += `<button type="button" class="${cls}" data-day="${k}"${tilt} aria-label="${esc(label)}" aria-pressed="${k === sel}">
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
      .concat(sp.map((s) => `<li class="tk-ev${s.dogum ? ' dogum' : ''}"><span class="tk-ev-e">${s.emoji}</span><span class="tk-ev-t"><b>${esc(s.text)}</b>${s.sub ? `<small>${esc(s.sub)}</small>` : ''}</span></li>`)).join('');
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
    const editing = !!form.id, dc = decorOn(k), stuck = dc ? dc.stickers : [], tint = tintOf(dc), recent = recentStickers(k);
    const decorHtml = `<section class="tk-sec tk-decor" aria-label="Sticker ve gün rengi">
        <h3>🌈 Sticker ve renk ${stuck.length ? `<small>${stuck.length}/3</small>` : ''}</h3>
        <div class="tk-stuck">${[0, 1, 2].map((i) => stuck[i]
          ? `<button type="button" data-unstick="${i}" aria-label="${esc(stName(stuck[i]))} stickerını kaldır">${stHtml(stuck[i], 'tk-stuck-i')}<i aria-hidden="true">✕</i></button>`
          : `<button type="button" class="empty" data-book aria-label="Boş yer: sticker defterini aç"><span aria-hidden="true">＋</span></button>`).join('')}
          ${SD() ? `<button type="button" class="tk-book-btn" data-book aria-label="Sticker defterini aç"><span class="tk-book-ic" aria-hidden="true"></span><small>Sticker defteri</small></button>` : ''}</div>
        ${recent.length && stuck.length < 3 ? `<div class="tk-son"><small>Son kullandıkların</small><div>${recent.map((x) => `<button type="button" data-stick="${esc(x)}" aria-label="Bu stickerı güne yapıştır">${stHtml(x, 'tk-son-i')}</button>`).join('')}</div></div>` : ''}
        ${stuck.length ? '' : '<p class="tk-hint">Bir sticker yapıştır, gün onun rengine boyansın ✨</p>'}
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
      ${rows ? `<ul class="tk-evs">${rows}</ul>` : ''}
      <form class="tk-sec tk-note-form${editing ? ' editing' : ''}" data-form="note" autocomplete="off">
        <h3>${editing ? '✎ Notu düzenle' : '📝 Güne not al'}</h3>
        <div class="tk-add-row">
          <input id="tk-text" maxlength="60" placeholder="Doğum günüm, sınav, buluşma…" value="${esc(form.text)}" aria-label="Not">
          <button class="btn primary" type="submit">${editing ? 'Kaydet' : 'Ekle'}</button>
        </div>
        <div class="tk-emojis" role="radiogroup" aria-label="Not simgesi">${EMOJI.map((e) => `<button type="button" role="radio" data-emoji="${e}" aria-checked="${e === form.emoji}">${e}</button>`).join('')}</div>
        <label class="tk-check"><input type="checkbox" data-opt="yearly" ${form.yearly ? 'checked' : ''}> Her yıl tekrarla (doğum günü gibi)</label>
        <label class="tk-check"><input type="checkbox" data-opt="remind" ${form.remind ? 'checked' : ''}> Bir gün önce Luna haber versin</label>
        ${editing ? '<button type="button" class="tk-back" data-cancel>Vazgeç</button>' : ''}
      </form>
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
    if (a && TYPING.includes(a.id)) return;
    const today = todayKey();
    if (!view) view = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12);
    if (!sel) sel = today;
    renderMonth(today);
    renderDay(today);
    renderSoon(today);
  }
  function pick(k, scroll) {
    const changed = sel !== k;
    if (changed) form = blank();
    sel = k;
    view = new Date(at(k).getFullYear(), at(k).getMonth(), 1, 12);
    render();
    const day = $('#takvim-gun');
    // yeni günün sayfası sağdan süzülerek gelir (hareket azaltılmışsa hemen)
    if (changed && day && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      day.classList.remove('gel'); void day.offsetWidth; day.classList.add('gel');
      day.addEventListener('animationend', () => day.classList.remove('gel'), { once: true });
    }
    if (scroll && day && day.getBoundingClientRect().top > window.innerHeight - 140) day.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  function bind() {
    const tab = $('#tab-takvim');
    if (bound || !tab) return;
    bound = true;
    tab.addEventListener('click', (e) => {
      const t = e.target;
      // iPhone'da düğmeye dokunmak yazı kutusundan çıkarmaz; çıkmazsa sayfa çizilmez, dokunuş boşa gider
      const a = document.activeElement;
      if (a && TYPING.includes(a.id) && t.closest('button')) a.blur();
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
      if (un) { const x = decor(sel); x.stickers.splice(+un.dataset.unstick, 1); autoTint(x); x.updated = Date.now(); app.save(); render(); return; }
      const tn = t.closest('[data-tint]');
      if (tn) { const x = decor(sel); x.tint = tn.dataset.tint; x.oto = false; x.updated = Date.now(); app.save(); render(); return; }
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
    d.stickers.push(x); autoTint(d); d.updated = Date.now();
    app.save(); render(); popSticker();
    return true;
  }

  // ---------- Sticker defteri: envanter gibi; kapağı açılır, oklarla sayfa sayfa çevrilir ----------
  // Kapak ve kâğıt görselleri css'teki --bk-kapak / --bk-kagit ile gelir (Hazal'ın tasarımı gelince yalnızca oraya yazılır).
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const slotHtml = (x, i) => (x
    ? `<button type="button" class="bk-slot full" data-bk-un="${i}" data-st="${esc(x)}" aria-label="${esc(stName(x))} stickerını kaldır">${stHtml(x, 'bk-st')}</button>`
    : '<span class="bk-slot" aria-hidden="true"></span>');
  function slots() {
    const d = decorOn(sel), stuck = d ? d.stickers : [];
    return [0, 1, 2].map((i) => slotHtml(stuck[i], i)).join('');
  }
  function pageHtml(p) {
    return `<div class="bk-ph"><b>${p.icon} ${esc(p.title)}</b>${p.parts > 1 ? `<span>${p.part}/${p.parts}</span>` : ''}</div>
      <div class="bk-grid">${p.items.map((x) => `<button type="button" class="bk-cell" data-pick="${esc(x)}" aria-label="${esc(p.title)} stickerı yapıştır">${stHtml(x, 'bk-st', true)}</button>`).join('')}</div>`;
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
    next.innerHTML = pageHtml(SD().PAGES[to]);
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
          <div class="bk-view"><div class="bk-page">${pageHtml(SD().PAGES[bookPage])}</div></div>
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
      if (un) { const d = decor(sel); d.stickers.splice(+un.dataset.bkUn, 1); autoTint(d); d.updated = Date.now(); app.save(); render(); bookSync(); return; }
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
  // Ölçüler, gölgeler, çevirme süresi, kapalı defterin kayması ve sahne renkleri Lilium defterinden (aynı StPageFlip 2.0.7).
  // Sayfalar yalnızca alttaki oklarla (bilgisayarda klavye oklarıyla da) çevrilir: sürükleme, kaydırma ve köşe kıvırma kapalı.
  // Her zaman iki sayfa yan yana; dik telefonda sayfa daralınca stickerlar küçülmesin diye sayfa başına 2 × 3 dizilir.
  // Kapak ve kâğıt Hazal'ın tasarımları (assets/defter/<ad>/). Kütüphane yüklenemezse (ilk açılış internetsiz) basit defter açılır.
  const FLIP_SRC = 'vendor/page-flip-2.0.7/page-flip.browser.js', FLIP_MS = 900, DAR = 230;
  // alan: stickerların süslere binmediği bölge (yüzde: üst, sağ, alt, sol); yazi: başlık rengi; sahne, isik, vurgu: Lilium renkleri;
  // kurdele: ayracın saten rengi
  // Şimdilik yalnızca Ay Işığı (siyah, beyaz zambaklı) açık; öbür dört defter kilitli ve görünmez. Kapakları, kâğıtları ve
  // ayarları yerinde durur: her birine kendi stickerları gelince "kilitli" kalkar. O zamana kadar bütün stickerlar Ay Işığı'nda.
  const DEFTERLER = {
    'siyah-yildizli': { ad: 'Ay Işığı', kagit: 'Noktalı', yazi: '#4a4658', alan: [10, 8, 25, 8], sahne: '#d6d8d2', isik: '#edf0df', vurgu: '#a9ad9b', kurdele: '#c2a25a' },
    'leylak-inci': { ad: 'İnci Düşü', kagit: 'Noktalı', yazi: '#7a67a3', alan: [11, 8, 20, 8], sahne: '#ddd9e5', isik: '#f6efff', vurgu: '#9d8daf', kurdele: '#8b74c4', kilitli: true },
    'pembe-kurdele': { ad: 'Gül Kurusu', kagit: 'Noktalı', yazi: '#8e2e3e', alan: [10, 9, 26, 9], sahne: '#e5d6d1', isik: '#ffede4', vurgu: '#9d5e66', kurdele: '#9b2f45', kilitli: true },
    'krem-botanik': { ad: 'Saklı Bahçe', kagit: 'Noktalı', yazi: '#6c7a4c', alan: [15, 10, 14, 10], sahne: '#dde0d2', isik: '#f7f0d8', vurgu: '#8b997b', kurdele: '#7a9160', kilitli: true },
    'mavi-kelebek': { ad: 'Mavi Rüya', kagit: 'Noktalı', yazi: '#46699a', alan: [11, 9, 13, 9], sahne: '#d7e2e8', isik: '#effaff', vurgu: '#769aac', kurdele: '#5a82b8', kilitli: true },
  };
  const ACIK = Object.keys(DEFTERLER).filter((id) => !DEFTERLER[id].kilitli);
  const acik = (id) => !!DEFTERLER[id] && !DEFTERLER[id].kilitli;
  // seçilen defter kilitliyse ya da seçilmediyse: sitenin temasına uyan açık defter, o da yoksa ilk açık defter (Ay Işığı).
  // Eski seçim ayarlarda silinmeden durur; defter açılınca yine o gelir.
  function defterId() {
    const s = D().settings.defter;
    if (acik(s)) return s;
    const r = document.documentElement, tema = r.dataset.tema === 'zambak' || r.dataset.theme === 'dark' ? 'siyah-yildizli' : 'leylak-inci';
    return acik(tema) ? tema : ACIK[0];
  }
  let flipLib = null, flip = null, scene = null, pageW = 0, shown = [], leaves = [];
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
  // kapağı önceden yükle: defter açılırken resim sonradan belirmesin
  function preload(id) {
    const urls = ['kapak', 'sayfa'].map((x) => `assets/defter/${id}/${x}.webp`);
    return Promise.race([Promise.all(urls.map((u) => new Promise((ok) => { const i = new Image(); i.onload = i.onerror = ok; i.src = u; }))), new Promise((ok) => setTimeout(ok, 1500))]);
  }
  // dar sayfada (dik telefon) her sayfa ikiye bölünür: 6 sticker, aynı bölüm yine yan yana sayfalarda
  function contentPages(dar) {
    if (!dar) return SD().PAGES;
    const out = [];
    SD().PAGES.forEach((p) => { for (let j = 0; j < p.items.length; j += 6) out.push({ ...p, items: p.items.slice(j, j + 6) }); });
    const count = {};
    out.forEach((p) => { count[p.bolum] = (count[p.bolum] || 0) + 1; p.part = count[p.bolum]; });
    out.forEach((p) => { p.parts = count[p.bolum]; });
    return out;
  }
  // ilk sayfadaki küçük not: bu ay kaç güne sticker yapıştırdın
  function titleNote() {
    const m = todayKey().slice(0, 7);
    let days = 0, n = 0;
    for (const x of decorList()) if (x.date.slice(0, 7) === m && x.stickers.length) { days++; n += x.stickers.length; }
    return n ? `Bu ay ${days} güne ${n} sticker yapıştırdın 🌸` : 'Bir stickera dokun, güne yapışsın';
  }
  // o güne yapışmış stickerlar defterde küçük bir ✓ ile işaretli; ilk sayfadaki not da güncellenir
  function markOn() {
    if (!scene) return;
    const on = new Set(decorOn(sel) ? decorOn(sel).stickers : []);
    scene.querySelectorAll('.df-flip [data-pick]').forEach((b) => b.classList.toggle('on', on.has(b.dataset.pick)));
    scene.querySelectorAll('.df-ilk small').forEach((x) => { x.textContent = titleNote(); });
  }
  // Lilium sırası: sert ön kapak, kâğıt sayfalar (ilki defterin adı), sert arka kapak; arka kapak sola düşsün diye sayfa sayısı çift
  function flipPages(id) {
    const d = DEFTERLER[id], name = esc(D().settings.name || ''), a = d.alan;
    const area = `top:${a[0]}%;right:${a[1]}%;bottom:${a[2]}%;left:${a[3]}%;color:${d.yazi}`;
    const pages = [
      '<div class="df-sayfa df-kapak" data-density="hard"></div>',
      `<div class="df-sayfa df-kagit"><div class="df-alan2 df-ilk" style="${area}"><p>${name ? name + "'ın" : 'Benim'}<br>sticker defteri</p><small>${esc(titleNote())}</small></div></div>`,
    ];
    shown.forEach((p, i) => pages.push(`<div class="df-sayfa df-kagit"><div class="df-alan2" style="${area}">${pageHtml(p)}</div><span class="df-no">${String(i + 1).padStart(2, '0')}</span></div>`));
    if (pages.length % 2 === 0) pages.push('<div class="df-sayfa df-kagit"></div>');
    pages.push('<div class="df-sayfa df-kapak df-arka" data-density="hard"></div>');
    return pages.join('');
  }
  // Lilium ölçüsü: sayfa 2:3, iki sayfa alana sığar (dikken genişliğe, yanken yüksekliğe göre); altta ayracın ucuna biraz yer kalır
  const kurdeleYeri = (area) => Math.min(30, Math.round(area.clientHeight * 0.06));
  function sizeFor() {
    const area = scene.querySelector('.df-alan');
    return Math.max(60, Math.floor(Math.min((area.clientHeight - kurdeleYeri(area)) / 1.5, area.clientWidth / 2, 560)));
  }
  // açık sayfadaki ilk sticker: ekran dönüp diziliş değişince defter aynı yerden açılsın (0 ön kapak, -1 arka kapak)
  function anchorNow() {
    if (!flip) return 0;
    const i = flip.getCurrentPageIndex(), n = flip.getPageCount();
    if (i <= 0) return 0;
    if (i >= n - 1) return -1;
    const p = shown[Math.min(shown.length - 1, Math.max(0, i - 2))];
    return p ? p.items[0] : 0;
  }
  const abs = (u) => new URL(u, location.href).href; // css değişkenindeki url() stil dosyasına göre çözülmesin
  // css'teki cubic-bezier gibi: x geçen zaman, sonuç alınan yol
  function bezier(x1, y1, x2, y2) {
    const f = (a, b, t) => 3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t;
    return (x) => {
      let lo = 0, hi = 1, t = x;
      for (let i = 0; i < 24; i++) { const v = f(x1, x2, t); if (Math.abs(v - x) < 1e-4) break; if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; }
      return f(y1, y2, t);
    };
  }
  // Kütüphane köşeyi sabit hızla taşır; sayfanın kendisi bu yüzden zaten hızlı kalkıp yavaş iner (ölçtük: sürenin yarısında
  // yolun üçte ikisi). Kareleri, bu doğal yavaşlamayı da hesaba katıp toplamda şu eğriyi verecek biçimde yeniden sıralarız:
  // sayfa hemen kıpırdar, ortada akıp gider, yere yumuşakça oturur (süre ve kare sayısı aynı kalır).
  const HEDEF = bezier(0.35, 0, 0.3, 1);
  const SAYFA_EGRI = (t) => 1 - Math.pow(1 - HEDEF(t), 0.6);
  function smooth(pf) {
    const r = pf.getRender();
    if (!r || typeof r.startAnimation !== 'function') return;
    const start = r.startAnimation.bind(r);
    r.startAnimation = (frames, duration, done) => {
      const n = frames.length;
      if (n < 3 || calm()) return start(frames, duration, done);
      const eased = [];
      for (let k = 0; k < n; k++) eased.push(frames[Math.round(SAYFA_EGRI(k / (n - 1)) * (n - 1))]);
      return start(eased, duration, done);
    };
  }
  // Kütüphanenin çizim döngüsü destroy'dan sonra da durmaz, her karede kopmuş sayfaları çizmeye devam eder (defter her
  // kurulduğunda bir döngü daha birikir). Kapatırken çizimi boşa çıkarıp sayfaları bırakırız: telefon yorulmaz, bellek dolmaz.
  function retire(pf) {
    if (!pf) return;
    try { pf.destroy(); } catch (e) { /* yok say */ }
    const r = pf.getRender && pf.getRender();
    if (!r) return;
    for (const k of Object.keys(r)) r[k] = null;
    r.render = r.update = r.drawFrame = () => {};
  }
  function buildFlip(anchor) {
    const id = defterId(), d = DEFTERLER[id];
    stopSync();
    // kütüphane kapanırken kök kutuyu da siler: her kurulumda yeni kutu
    retire(flip); flip = null;
    const kitap = scene.querySelector('.df-kitap'), old = kitap.querySelector('.df-flip');
    if (old) old.remove();
    const el = document.createElement('div');
    pageW = sizeFor();
    const h = Math.floor(pageW * 1.5), dar = pageW < DAR;
    el.className = 'df-flip' + (dar ? ' dar' : '');
    el.style.width = pageW * 2 + 'px'; el.style.height = h + 'px';
    kitap.style.setProperty('--page-w', pageW + 'px');
    // ayracın defterin altından sarkan kısmı alttaki şeride değmeyecek kadar (V ucu hep görünsün)
    const alan = scene.querySelector('.df-alan'), bos = (alan.clientHeight - h) / 2 + 4;
    kitap.style.setProperty('--kboy', Math.round(Math.max(14, Math.min(pageW * 0.23, bos))) + 'px');
    kitap.appendChild(el);
    scene.dataset.tasarim = id;
    scene.style.setProperty('--df-kapak', `url("${abs(`assets/defter/${id}/kapak.webp`)}")`);
    scene.style.setProperty('--df-kagit', `url("${abs(`assets/defter/${id}/sayfa.webp`)}")`);
    scene.style.setProperty('--df-sahne', d.sahne);
    scene.style.setProperty('--df-isik', d.isik);
    scene.style.setProperty('--df-vurgu', d.vurgu);
    scene.style.setProperty('--df-kurdele', d.kurdele);
    scene.querySelector('.df-etiket b').textContent = `${d.ad} · ${d.kagit}`.toLocaleUpperCase('tr');
    shown = contentPages(dar);
    el.innerHTML = flipPages(id);
    leaves = [...el.querySelectorAll('.df-sayfa')];
    const n = leaves.length, at = shown.findIndex((p) => p.items.includes(anchor));
    const start = anchor === -1 ? n - 1 : anchor && at >= 0 ? at + 2 : 0;
    flip = new window.St.PageFlip(el, {
      width: pageW, height: h, size: 'fixed', autoSize: false, usePortrait: false, showCover: true, startPage: start,
      // Lilium: 1 saniyelik çevirme, hafif gölge. Kütüphane süreyi kısa yolda kısaltır; küçük ekranda da aynı hızda dönsün diye büyütülür.
      drawShadow: true, maxShadowOpacity: 0.32, flippingTime: calm() ? 1 : Math.round(FLIP_MS * Math.max(1, 1000 / (pageW * 2))),
      // sayfa itilmez, sürüklenmez, köşesi kıvrılmaz: yalnızca oklar
      useMouseEvents: false, showPageCorners: false, disableFlipByClick: true, mobileScrollSupport: false,
    });
    flip.loadFromHTML(leaves);
    smooth(flip); // çizim bölümü loadFromHTML'de kurulur; eğri ondan sonra takılır
    markOn();
    flip.on('flip', (e) => place(e.data));
    flip.on('changeState', (e) => { if (e.data === 'read') place(flip.getCurrentPageIndex()); });
    place(flip.getCurrentPageIndex(), true);
  }
  // kapalı defter ortada: ön kapakta yarım sayfa sola, arka kapakta yarım sayfa sağa (Lilium: data-position, .65 s)
  function place(i, instant) {
    stopSync();
    if (!scene || !flip) return;
    const n = flip.getPageCount(), kitap = scene.querySelector('.df-kitap');
    const el = kitap.querySelector('.df-flip');
    if (el) el.classList.remove('kapak-on', 'kapak-arka');
    if (instant) kitap.style.transition = 'none';
    kitap.style.transform = '';
    kitap.dataset.position = i <= 0 ? 'front' : i >= n - 1 ? 'back' : 'open';
    if (instant) { void kitap.offsetWidth; kitap.style.transition = ''; }
    // kenardaki sayfa yığını: solda çevrilenler, sağda kalanlar (kapalıyken görünmez; arka kapakta hepsi solda)
    kitap.classList.remove('senk');
    const open = i > 0 && i < n - 1, done = open ? Math.min(1, (i - 1) / Math.max(1, n - 3)) : i >= n - 1 ? 1 : 0;
    kitap.style.setProperty('--acik', open ? 1 : 0);
    kitap.style.setProperty('--sol', done.toFixed(3));
    kitap.style.setProperty('--sag', (1 - done).toFixed(3));
    kitap.style.setProperty('--kx', open ? KX.acik : i >= n - 1 ? KX.arka : KX.on);
    scene.querySelector('[data-df="prev"]').disabled = i <= 0;
    scene.querySelector('[data-df="next"]').disabled = i >= n - 1;
    const nums = [i - 1, i].filter((x) => x >= 1 && x <= shown.length);
    scene.querySelector('.df-sayac').textContent = i <= 0 ? 'Kapak' : i >= n - 1 ? 'Arka kapak'
      : nums.length ? `${nums.join(' — ')} / ${shown.length}` : '';
  }
  // Kapak (ya da arka kapak) dönerken defterin kayması her karede yaprağın gerçek açısından hesaplanır: dik telefonda da
  // açılan kapak ekrandan taşmaz, defter kapakla aynı anda ortaya gelir.
  let syncRaf = 0, syncSide = '', syncAt = 0;
  // ayracın sırta göre yeri (kendi eninin katı): kapalıyken kapağın altında kalır, açıkken iki sayfanın arasından çıkar
  const KX = { on: 0.25, acik: -0.5, arka: -1.25 };
  const angleOf = (el) => { const m = el && /rotateY\((-?[\d.]+)deg\)/.exec(el.style.transform || ''); return m ? ((+m[1] % 360) + 360) % 360 : null; };
  const seen = (el) => el && getComputedStyle(el).display !== 'none';
  function syncShift() {
    syncRaf = 0;
    if (!scene || !flip) return;
    if (!busy() && performance.now() - syncAt > 200) { place(flip.getCurrentPageIndex()); return; }
    const n = leaves.length, [front, back] = syncSide === 'back' ? [leaves[n - 2], leaves[n - 1]] : [leaves[0], leaves[1]];
    let a = seen(back) ? angleOf(back) : null; // yaprağın arka yüzü: 180° sağda kalkık … 0° solda yatık
    if (a == null && seen(front)) { const c = angleOf(front); if (c != null) a = (c + 180) % 360; }
    if (a != null && a <= 180) {
      const p = (1 - Math.cos(a * Math.PI / 180)) / 2; // 1 yaprak sağda … 0 yaprak solda; iki ucunda yavaş, ortada hızlı
      const kitap = scene.querySelector('.df-kitap');
      kitap.style.transition = 'none';
      kitap.style.transform = `translateX(${syncSide === 'back' ? pageW / 2 * (1 - p) : -pageW / 2 * p}px)`;
      // sayfa yığını kapakla birlikte belirir / kaybolur; ayraç da kapağın altına girip çıkar
      const ac = syncSide === 'back' ? p : 1 - p;
      kitap.classList.add('senk');
      kitap.style.setProperty('--acik', ac.toFixed(3));
      kitap.style.setProperty('--kx', (KX.acik * ac + (syncSide === 'back' ? KX.arka : KX.on) * (1 - ac)).toFixed(3));
    }
    syncRaf = requestAnimationFrame(syncShift);
  }
  function stopSync() { if (syncRaf) cancelAnimationFrame(syncRaf); syncRaf = 0; }
  const busy = () => !!flip && ['flipping', 'user_fold', 'fold_corner'].includes(flip.getState());
  function go(dir) {
    if (!scene || !flip || busy()) return;
    const i = flip.getCurrentPageIndex(), n = flip.getPageCount();
    if (dir > 0 ? i >= n - 1 : i <= 0) return;
    syncSide = dir > 0 ? (i === 0 ? 'front' : i >= n - 3 ? 'back' : '') : (i >= n - 1 ? 'back' : i <= 2 ? 'front' : '');
    // kapak dönerken kütüphane gölgeyi defterin boş tarafına da çizer (arkadan gri bir şey çıkıyor gibi); o gölge gizlenir
    if (syncSide) scene.querySelector('.df-flip').classList.add(syncSide === 'back' ? 'kapak-arka' : 'kapak-on');
    if (syncSide && !calm()) { stopSync(); syncAt = performance.now(); syncRaf = requestAnimationFrame(syncShift); }
    if (dir > 0) flip.flipNext('bottom'); else flip.flipPrev('bottom');
    if (typeof Sound !== 'undefined' && Sound.page) Sound.page();
    // kurdele sayfa dönerken hafifçe sallanır
    const rb = scene.querySelector('.df-kurdele');
    if (rb && !calm()) { rb.classList.remove('sallan'); void rb.offsetWidth; rb.classList.add('sallan'); }
  }
  // Stickera dokununca sayfadan kalkar, alttaki yerine uçup yapışır (hareket azaltılmışsa hemen yerinde görünür)
  function flyTo(img, slotIndex) {
    const slot = scene && scene.querySelectorAll('.df-slots .bk-slot')[slotIndex];
    const target = slot && slot.querySelector('.bk-st');
    const land = () => {
      if (target) target.style.visibility = '';
      if (slot && slot.animate && !calm()) slot.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.2) rotate(-4deg)' }, { transform: 'scale(1)' }], { duration: 280, easing: 'ease-out' });
      if (typeof Sound !== 'undefined' && Sound.stick) Sound.stick();
    };
    if (!img || !target || calm() || !img.animate) { land(); return; }
    const a = img.getBoundingClientRect(), b = target.getBoundingClientRect();
    if (!a.width || !b.width) { land(); return; }
    const ghost = img.cloneNode();
    ghost.className = 'df-ucan';
    Object.assign(ghost.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' });
    scene.appendChild(ghost);
    target.style.visibility = 'hidden';
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2), k = b.width / a.width;
    ghost.animate([
      { transform: 'translate(0, 0) scale(1) rotate(0deg)', filter: 'drop-shadow(0 2px 2px rgba(40, 20, 60, .25))' },
      { transform: `translate(${dx * 0.2}px, ${dy * 0.2 - 36}px) scale(1.28) rotate(-10deg)`, filter: 'drop-shadow(0 14px 12px rgba(40, 20, 60, .3))', offset: 0.35 },
      { transform: `translate(${dx}px, ${dy}px) scale(${k}) rotate(-4deg)`, filter: 'drop-shadow(0 1px 1px rgba(40, 20, 60, .25))' },
    ], { duration: 580, easing: 'cubic-bezier(.3, .6, .25, 1)' }).onfinish = () => { ghost.remove(); land(); };
  }
  // yalnızca değişen yer yeniden çizilir: duran stickerın resmi yeniden yüklenip bir an kaybolmasın
  function sceneSync() {
    if (!scene) return;
    const box = scene.querySelector('.df-slots'), d = decorOn(sel), stuck = d ? d.stickers : [];
    if (box.children.length !== 3) { box.innerHTML = slots(); return; }
    [0, 1, 2].forEach((i) => {
      const cur = box.children[i], want = stuck[i] || '';
      if ((cur.dataset.st || '') === want && (!want || +cur.dataset.bkUn === i)) return;
      const t = document.createElement('div');
      t.innerHTML = slotHtml(want, i);
      cur.replaceWith(t.firstElementChild);
    });
  }
  // ekran dönünce ya da boyu değişince defter yeni ölçüyle aynı sayfadan yeniden kurulur (Lilium gibi)
  let resizeT = 0;
  function onResize() {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      if (!scene || !flip) return;
      if (busy()) { onResize(); return; }
      const w = sizeFor();
      if (Math.abs(w - pageW) >= 8 || (w < DAR) !== (pageW < DAR)) buildFlip(anchorNow());
    }, 220);
  }
  // kapak seçici açılıp kapanınca defter kalan yere göre yeniden ölçülür; kısa bir an solup yerine oturur
  function refit() {
    const area = scene.querySelector('.df-alan');
    if (Math.abs(sizeFor() - pageW) < 8) return;
    area.classList.add('degisiyor');
    setTimeout(() => {
      if (!scene) return;
      if (flip && !busy()) buildFlip(anchorNow());
      requestAnimationFrame(() => area.classList.remove('degisiyor'));
    }, calm() ? 0 : 260);
  }
  function closeBook() {
    if (!scene) return;
    stopSync();
    const sc = scene;
    grow(false);
    scene = null;
    window.removeEventListener('resize', onResize);
    document.removeEventListener('keydown', onKey, true);
    sc.classList.add('kapaniyor');
    setTimeout(() => {
      retire(flip); flip = null; sc.remove();
      // defterde yapıştırılan sticker takvimde de zıplasın (perdenin arkasında görünmüyordu)
      if (stuckHere) { stuckHere = false; popSticker(); }
    }, calm() ? 0 : 280);
  }
  // Defter, takvimdeki küçük defter simgesinden büyüyerek gelir; kapanınca ona küçülerek döner
  let stuckHere = false;
  function grow(opening) {
    const ic = $('#takvim-gun .tk-book-ic') || $('#takvim-gun [data-book]');
    const area = scene && scene.querySelector('.df-alan'), kitap = area && area.querySelector('.df-kitap');
    if (!ic || !kitap || calm() || !area.animate) return;
    const a = ic.getBoundingClientRect(), r = kitap.getBoundingClientRect(), box = area.getBoundingClientRect();
    if (!a.width || !r.width) return;
    // kapalıyken görünen yalnızca kapak (sağ yarı); açıkken bütün defter
    const front = kitap.dataset.position === 'front', w = front ? r.width / 2 : r.width;
    const cx = front ? r.left + r.width * 0.75 : r.left + r.width / 2, cy = r.top + r.height / 2;
    const to = `translate(${a.left + a.width / 2 - cx}px, ${a.top + a.height / 2 - cy}px) scale(${Math.max(0.05, a.width / w)})`;
    area.style.transformOrigin = `${cx - box.left}px ${cy - box.top}px`;
    const frames = [{ transform: to, opacity: 0.5 }, { transform: 'none', opacity: 1 }];
    area.animate(opening ? frames : frames.reverse(), { duration: opening ? 620 : 300, easing: opening ? 'cubic-bezier(.45, .05, .2, 1)' : 'cubic-bezier(.5, 0, .9, .4)', fill: opening ? 'none' : 'forwards' });
  }
  function onKey(e) {
    if (!scene) return;
    if (e.key === 'Escape') { e.stopPropagation(); closeBook(); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); go(e.key === 'ArrowRight' ? 1 : -1); }
  }
  // Lilium rafındaki gibi küçük defterler; seçilen öne çıkar
  function chooser() {
    const cur = defterId();
    return Object.entries(DEFTERLER).filter(([id]) => acik(id)).map(([id, d]) => `<button type="button" class="df-sec" data-defter="${id}" aria-label="${esc(d.ad)}, ${esc(d.kagit.toLocaleLowerCase('tr'))} defter" aria-pressed="${id === cur}"><span class="df-mini"><img src="assets/defter/${id}/kapak.webp" alt="" loading="lazy"></span><small>${esc(d.ad)}</small></button>`).join('');
  }
  const ARROW = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  async function openBook() {
    if (!SD() || !SD().PAGES.length || scene) return;
    const id = defterId();
    const [ok] = await Promise.all([loadFlip(), preload(id)]);
    if (!ok) { openSimpleBook(); return; }
    if (scene) return;
    scene = document.createElement('div');
    scene.className = 'df-sahne';
    scene.setAttribute('role', 'dialog'); scene.setAttribute('aria-modal', 'true'); scene.setAttribute('aria-label', 'Sticker defteri');
    scene.innerHTML = `<div class="df-etiket"><i></i><b></b><span class="df-sayac" aria-live="polite"></span></div>
      <button type="button" class="df-x" data-df="close" aria-label="Defteri kapat">${ARROW('m6 6 12 12M6 18 18 6')}</button>
      <div class="df-alan"><div class="df-kitap"><i class="df-blok sol" aria-hidden="true"></i><i class="df-blok sag" aria-hidden="true"></i><i class="df-kurdele" aria-hidden="true"></i></div></div>
      ${ACIK.length > 1 ? `<div class="df-secici" hidden>${chooser()}</div>` : ''}
      <div class="df-alt">
        <button type="button" class="df-ok" data-df="prev" aria-label="Önceki sayfa">${ARROW('m14 6-6 6 6 6')}</button>
        <div class="df-gun"><span>${longDate(sel)}</span><div class="df-slots"></div></div>
        <button type="button" class="df-ok" data-df="next" aria-label="Sonraki sayfa">${ARROW('m10 6 6 6-6 6')}</button>
        ${ACIK.length > 1 ? '<button type="button" class="df-renk" data-df="kapak" aria-label="Defterin kapağını değiştir" aria-expanded="false"></button>' : ''}
      </div>`;
    document.body.appendChild(scene);
    sceneSync();
    buildFlip(0);
    stuckHere = false;
    if (!calm() && $('#takvim-gun .tk-book-ic')) { scene.classList.add('buyu'); grow(true); }
    window.addEventListener('resize', onResize);
    document.addEventListener('keydown', onKey, true);
    // açılış: kapalı defter ortada belirir, az sonra kapak kendiliğinden açılır
    setTimeout(() => { if (scene && flip && flip.getCurrentPageIndex() === 0) go(1); }, calm() ? 0 : 900); // simgeden büyüme bitince kısa bir an durup açılır
    scene.addEventListener('click', (e) => {
      if (!scene) return; // kapanırken (son 280 ms) dokunuşlar yok sayılır
      const t = e.target;
      const b = t.closest('[data-df]');
      if (b) {
        const a = b.dataset.df;
        if (a === 'close') closeBook();
        else if (a === 'kapak') { const box = scene.querySelector('.df-secici'); box.hidden = !box.hidden; b.setAttribute('aria-expanded', String(!box.hidden)); refit(); }
        else go(a === 'next' ? 1 : -1);
        return;
      }
      const df = t.closest('.df-sec');
      if (df && acik(df.dataset.defter)) {
        if (df.dataset.defter === defterId() || busy()) return;
        D().settings.defter = df.dataset.defter; app.save();
        scene.querySelectorAll('.df-sec').forEach((x) => x.setAttribute('aria-pressed', String(x === df)));
        // Lilium: defter kısa bir an solar, yenisi aynı sayfadan açılır
        const at = anchorNow(), area = scene.querySelector('.df-alan');
        area.classList.add('degisiyor');
        Promise.all([preload(df.dataset.defter), new Promise((ok) => setTimeout(ok, calm() ? 0 : 260))]).then(() => {
          if (!scene) return;
          buildFlip(at);
          requestAnimationFrame(() => area.classList.remove('degisiyor'));
        });
        return;
      }
      const un = t.closest('[data-bk-un]');
      if (un) { const d = decor(sel); d.stickers.splice(+un.dataset.bkUn, 1); autoTint(d); d.updated = Date.now(); app.save(); render(); sceneSync(); markOn(); return; }
      const pk = t.closest('[data-pick]');
      if (pk && stickOn(pk.dataset.pick)) {
        stuckHere = true;
        sceneSync();
        markOn();
        flyTo(pk.querySelector('.bk-st'), decor(sel).stickers.length - 1);
      }
    });
  }

  // yeni yapışan sticker hafifçe zıplar (hareket azaltılmışsa durur)
  function popSticker() {
    const c = $(`#takvim-card [data-day="${sel}"] .tk-st`);
    if (!c || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); // defter kapanınca yeniden zıplayabilsin
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
    // takvimin bildiği doğum günü (14 Ağustos) de not gibi söylenir, bir gün önce de haber verilir
    const dogum = (k) => special(k).filter((x) => x.dogum).map((x) => ({ emoji: x.emoji, text: x.text, sub: x.sub, remind: true, dogum: true }));
    const mine = notesOn(today).concat(plansOn(today).map(asNote), dogum(today)), eve = notesOn(tomorrow).filter((n) => n.remind).concat(plansOn(tomorrow).map(asNote), dogum(tomorrow));
    const todayDue = mine.length && lsGet(SAID_KEY) !== today, eveDue = eve.length && lsGet(EVE_KEY) !== today;
    if (!todayDue && !eveDue) return;
    const busy = app.isFocusing() || !$('#modal').classList.contains('hidden') || app.quietFor(8000) || document.hidden;
    if (busy) { if (++tries < 40) setTimeout(sayToday, 15000); return; }
    const bday = (arr) => arr.find((n) => n.dogum) || arr.find((n) => /doğum ?günüm/i.test(n.text)); // Luna adını değil "anneciğim" der
    const join = (arr) => arr.map((n) => `${n.emoji} ${n.text}`).join(', ');
    if (todayDue) {
      const b = bday(mine);
      const text = b ? `İyi ki doğdun anneciğim! 🎂 Bugün senin günün; takvimine kocaman bir yıldız kondurdum ✨${b.sub ? ` Çağan da takvimine bir not bırakmış: “${b.sub}”` : ''}`
        : `Takvimine baktım: bugün ${join(mine)} ✨ ${mine.some((n) => n.deneme) ? 'Bitince sonuçlarını gir, analizini birlikte yapalım.' : 'Unutmadım!'}`;
      if (app.sayText(text, { speaker: 'luna', emotion: 'happy' })) { lsSet(SAID_KEY, today); if (b) app.celebrate(); }
      if (eveDue) setTimeout(sayToday, 20000);
      return;
    }
    const text = bday(eve) ? `Yarın senin doğum günün 🎂 Şimdiden heyecanlandım annem!`
      : `Yarın takviminde: ${join(eve)} 🗓️ ${eve.some((n) => n.deneme) ? 'Bu akşam erken uyu, kalemlerini hazırla.' : 'Unutmayalım diye söylüyorum.'}`;
    if (app.sayText(text, { speaker: 'luna', emotion: 'happy' })) lsSet(EVE_KEY, today);
  }

  return {
    init(a) { app = a; bind(); setTimeout(sayToday, 6000); }, // sekme açılınca çizilir
    render() { bind(); render(); },
    open(k) { pick(k || todayKey(), false); },
    notesOn,
    special,
  };
})();

if (typeof window !== 'undefined') { window.TakvimUI = TakvimUI; }
