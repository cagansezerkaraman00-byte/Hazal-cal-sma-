/* Planlarım arayüzü: Plan sekmesinin üstündeki günlük / haftalık / aylık planlar, ana sayfadaki "Bugünün planı" kartı,
   gün sonu kartı ve Luna'nın akşam yorumu. Maddeleri yalnızca Hazal yazar; buradaki hiçbir şey kendiliğinden madde eklemez.
   Yükleme anında sayfaya, verilere ya da başka modüllere dokunulmaz; her şey init'ten sonra çalışır. */

const PlanlarUI = (() => {
  let App = null;
  const view = { scope: 'day', key: '', follow: true }; // bakılan dönem her açılışta bugünden başlar
  const openDetails = new Set(); // gün görünümündeki açık "haftanın / ayın hedefleri" kutuları
  const SCOPE_KEY = 'luna-plan-scope'; // yalnızca bu cihazda: son seçilen Günlük / Haftalık / Aylık
  const $ = (s, el = document) => el.querySelector(s);
  const D = () => Store.data;
  const esc = (s) => U.esc(s);
  const noon = (k) => new Date(k + 'T12:00:00');

  const TICK = ['Plandan bir madde daha tamam! ✅', 'Tik! Harika gidiyorsun 🐾', 'Bir adım daha 🌟'];
  const FULL = ['Bugünün planı tamam! Harikasın 🌟', 'Listenin hepsi tik! Kuyruğum havada 😻', 'Plan bitti, şimdi kendine güzel bir mola ver 💜'];
  const INTRO = 'Planını sen yazdın, ben de takipteyim 🐾 Akşam nasıl geçtiğine birlikte bakarız.';
  const STATUS_ICON = ['○', '📖', '🔁', '✅'];

  const N = {
    day: { seg: 'Günlük', prev: 'Önceki gün', next: 'Sonraki gün', cur: 'Bugün', empty: 'Bu gün için henüz plan yok.', unit: 'maddeyi',
      hedef: ['bugüne', 'yarına', 'ertesi güne'], tag: ['→ bugüne taşındı', '→ yarına taşındı'], from: '↪ dünden', when: ['bugün', 'o gün'],
      kaynak: ['Dünün planını', 'Bugünün planını', 'Önceki günün planını'], ph: ['Örn: Paragraf çalışıp yanlışlarımı incele', 'Örn: 2. ünite tekrarı'] },
    week: { seg: 'Haftalık', prev: 'Önceki hafta', next: 'Sonraki hafta', cur: 'Bu hafta', empty: 'Bu hafta için henüz hedef yok.', unit: 'hedefi',
      hedef: ['bu haftaya', 'gelecek haftaya', 'sonraki haftaya'], tag: ['→ bu haftaya taşındı', '→ gelecek haftaya taşındı'], from: '↪ geçen haftadan', when: ['bu hafta', 'o hafta'],
      kaynak: ['Geçen haftanın hedeflerini', 'Bu haftanın hedeflerini', 'Önceki haftanın hedeflerini'], ph: ['Örn: Türev konusunu bitir', 'Örn: Ödev taslağını bitir'] },
    month: { seg: 'Aylık', prev: 'Önceki ay', next: 'Sonraki ay', cur: 'Bu ay', empty: 'Bu ay için henüz hedef yok.', unit: 'hedefi',
      hedef: ['bu aya', 'gelecek aya', 'sonraki aya'], tag: ['→ bu aya taşındı', '→ gelecek aya taşındı'], from: '↪ geçen aydan', when: ['bu ay', 'o ay'],
      kaynak: ['Geçen ayın hedeflerini', 'Bu ayın hedeflerini', 'Önceki ayın hedeflerini'], ph: ['Örn: 4 TYT denemesi çöz', 'Örn: Vize konularını bitir'] },
  };

  const isProgram = () => !!(window.Uni && typeof Uni.isProgramMode === 'function' && Uni.isProgramMode());
  const isEvening = (now) => { const h = now.getHours(); return h >= 20 || h < 5; };
  const placeholder = (scope) => N[scope].ph[isProgram() ? 1 : 0];
  // ders: etkin listede yoksa arşivdeki / diğer moddaki adı ve rengi (Store.subject); hiç yoksa ders gösterilmez
  function subj(id) { if (!id) return null; const s = Store.subject(id); return s && s.id ? s : null; }
  // "bugüne / yarına / ertesi güne" (takvimdeki şimdiye göre)
  function hedefWord(scope, to, now) {
    const cur = Planlar.keyOf(scope, now);
    return N[scope].hedef[to === cur ? 0 : to === Planlar.shift(scope, cur, 1) ? 1 : 2];
  }
  function sessionsIn(scope, key) {
    const { from, to } = Planlar.range(scope, key);
    let minutes = 0, questions = 0;
    for (const s of D().sessions) if (s && s.start >= from && s.start < to) { minutes += Math.max(0, Number(s.minutes) || 0); questions += +s.questions || 0; }
    questions += Planlar.questionEntries(scope, key).reduce((n, x) => n + x.questions, 0);
    return { minutes: Math.round(minutes), questions };
  }
  function loadScope() { try { const s = localStorage.getItem(SCOPE_KEY); if (Planlar.SCOPES.includes(s)) view.scope = s; } catch (e) { /* gizli mod */ } }
  function saveScope() { try { localStorage.setItem(SCOPE_KEY, view.scope); } catch (e) { /* gizli mod */ } }

  // ---------- Yeniden çizerken yazılan metin kaybolmasın (iOS klavyesi kapanmasın) ----------
  function saveQuick(el) {
    const q = el && el.querySelector('[data-mp-quick]');
    if (!q) return null;
    const f = q.form;
    return { value: q.value, focused: document.activeElement === q, start: q.selectionStart, end: q.selectionEnd, scope: f && f.dataset.scope, key: f && f.dataset.key };
  }
  function restoreQuick(el, s) {
    if (!s) return;
    const q = el.querySelector('[data-mp-quick]');
    if (!q) return;
    const f = q.form, same = f && f.dataset.scope === s.scope && f.dataset.key === s.key;
    if (!same && !s.focused) return; // başka bir listeye geçildi: yazı oraya taşınmasın
    if (s.value) q.value = s.value;
    if (s.focused) { try { q.focus({ preventScroll: true }); q.setSelectionRange(s.start, s.end); } catch (e) { /* bazı tarayıcılar */ } }
  }
  // aynı içerik yeniden yazılmaz: odak, klavye ve yazılan metin olduğu gibi kalır
  function paint(el, html) {
    if (el.__mpHtml === html && el.__mpFirst && el.firstElementChild === el.__mpFirst) return false;
    const keep = saveQuick(el);
    el.innerHTML = html;
    el.__mpHtml = html;
    el.__mpFirst = el.firstElementChild;
    restoreQuick(el, keep);
    return true;
  }
  function invalidate() { for (const id of ['#planner-root', '#today-plan']) { const el = $(id); if (el) el.__mpHtml = ''; } }
  let paintedPhase = ''; // akşam şeridi ve gün sonu kartı 20:00'de kendiliğinden görünsün diye
  const phaseOf = (now) => (isEvening(now) ? 'eve' : 'day');

  // ---------- Madde satırı (Plan sekmesi, ana sayfa ve Dönem modundaki küçük blok) ----------
  function itemHtml(it, scope, key, now) {
    const n = N[scope], cur = Planlar.keyOf(scope, now);
    const s = subj(it.subjectId);
    const color = s ? s.color : 'var(--violet)';
    const parts = [];
    if (s) parts.push(esc(s.name));
    const tg = it.min ? U.fmtMin(it.min) : '';
    if (tg) parts.push('hedef ' + tg);
    if (s && tg && key <= cur && !it.moved) {
      const w = Planlar.subjectWork(it.subjectId, scope, key);
      if (w) parts.push(`${n.when[key === cur ? 0 : 1]} ${U.fmtMin(w.minutes)}`);
    }
    if (it.from) parts.push(it.from === Planlar.shift(scope, key, -1) ? n.from : '↪ ertelenen');
    const reached = Planlar.targetReached(it, scope, key);
    if (reached) parts.push('<span class="mp-tag ok">✓ hedefe ulaştın</span>');
    const startable = key === cur && !it.done && !it.moved;
    let acts;
    if (it.moved) {
      const tag = it.moved === cur && key !== cur ? n.tag[0] : it.moved === Planlar.shift(scope, cur, 1) ? n.tag[1] : '→ taşındı';
      acts = `<span class="mp-tag">${tag}</span>`;
    } else {
      acts = `<input type="checkbox" class="check" data-mp="done" aria-label="Yapıldı"${it.done ? ' checked' : ''}>${startable ? '<button type="button" class="plan-go" data-mp="go" aria-label="Başla"><span class="pg-t">Başla </span>▶</button>' : ''}`;
    }
    return `<li class="plan-item mp-item${it.done ? ' done' : ''}${it.moved ? ' moved' : ''}${reached ? ' reached' : ''}" data-mp-id="${esc(it.id)}">
      <span class="plan-dot" style="background:${esc(color)}"></span>
      <button type="button" class="mp-edit" data-mp="edit" aria-label="Düzenle: ${esc(it.title)}"><span class="plan-text">${esc(it.title)}</span>${parts.length ? `<span class="plan-sub">${parts.join(' · ')}</span>` : ''}</button>
      <span class="plan-acts">${acts}</span></li>`;
  }
  const ordered = (items) => items.filter((x) => !x.moved).concat(items.filter((x) => x.moved));
  function quickForm(scope, key) {
    return `<form class="inline-form mp-add" data-mp-form data-scope="${esc(scope)}" data-key="${esc(key)}" autocomplete="off">
      <input data-mp-quick maxlength="120" enterkeyhint="done" aria-label="Yeni plan maddesi" placeholder="${esc(placeholder(scope))}"><button class="btn primary">Ekle</button></form>`;
  }
  function progHtml(st) {
    if (!st.total) return `<p class="mp-prog mp-pct muted">${st.moved ? `${st.moved} madde taşındı` : 'Henüz madde yok'}</p>`;
    return `<div class="mp-prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${st.pct}" aria-label="Plan ilerlemesi"><div class="track"><i style="width:${st.pct}%"></i></div>
      <span class="mp-pct">${st.done}/${st.total} madde tamam · %${st.pct}${st.moved ? ` · ${st.moved} madde taşındı` : ''}</span></div>`;
  }

  // ---------- Plan sekmesi: #planner-root (her modda) ----------
  function render() {
    const root = $('#planner-root');
    if (!root || !window.Planlar) return;
    const now = new Date();
    if (!Planlar.SCOPES.includes(view.scope)) view.scope = 'day';
    if (view.follow || !Planlar.isKey(view.scope, view.key)) { view.key = Planlar.keyOf(view.scope, now); view.follow = true; }
    paintedPhase = phaseOf(now);
    paint(root, cardHtml(now));
  }

  function cardHtml(now) {
    const { scope, key } = view, n = N[scope];
    const cur = Planlar.keyOf(scope, now), lab = Planlar.label(scope, key, now);
    const items = Planlar.list(scope, key), r = Planlar.roll(scope, key), own = r.own;
    const segBtn = (s) => `<button type="button" data-mp="scope" data-scope="${s}" class="${s === scope ? 'active' : ''}" aria-pressed="${s === scope}">${N[s].seg}</button>`;
    let rollLine = '';
    if (scope !== 'day') {
      const parts = scope === 'week'
        ? [`Haftalık hedefler ${own.done}/${own.total}`, `Günlük maddeler ${r.days.done}/${r.days.total}`]
        : [`Aylık hedefler ${own.done}/${own.total}`, `Haftalık ${r.weeks.done}/${r.weeks.total}`, `Günlük ${r.days.done}/${r.days.total}`];
      if (r.all.total) parts.push(`Toplam %${r.all.pct}`);
      if (own.moved) parts.push(`${own.moved} madde taşındı`);
      const w0 = key <= cur ? sessionsIn(scope, key) : null, w = w0 && w0.minutes > 0 ? w0 : null; // "0 dk çalıştın" yazılmaz
      rollLine = `<p class="mp-roll">${parts.join(' · ')}${w ? `<br>⏱️ ${key === cur ? n.cur : scope === 'week' ? 'O hafta' : 'O ay'} ${U.fmtMin(w.minutes)} çalıştın${w.questions ? ` · ${w.questions} soru` : ''}` : ''}</p>`;
    }
    const remaining = own.remaining.length;
    const tools = [];
    if (remaining) {
      const to = Planlar.carryTarget(scope, key, now), hw = hedefWord(scope, to, now);
      tools.push(`<button type="button" class="btn soft small-btn" data-mp="carry" data-scope="${scope}" data-key="${esc(key)}" data-to="${esc(to)}" data-hedef="${esc(hw)}">↪ Kalan ${remaining} ${n.unit} ${hw} taşı</button>`);
    }
    const pc = Planlar.copyCount(scope, key);
    if (pc) {
      const src = Planlar.shift(scope, key, -1);
      const kay = n.kaynak[src === Planlar.shift(scope, cur, -1) ? 0 : src === cur ? 1 : 2];
      tools.push(`<button type="button" class="btn soft small-btn" data-mp="copy" data-scope="${scope}" data-key="${esc(key)}">⧉ ${kay} kopyala (${pc})</button>`);
    }
    return `<div class="card wide-card mp-card">
      <div class="mp-head"><h2>🗓️ Planlarım</h2>
        <div class="seg mp-scope" role="group" aria-label="Plan türü">${Planlar.SCOPES.map(segBtn).join('')}</div></div>
      <div class="mp-nav">
        <button type="button" class="icon-btn" data-mp="prev" aria-label="${n.prev}">‹</button>
        <div class="mp-title"><b>${esc(lab.title)}</b>${lab.rel ? `<small>${lab.rel}</small>` : ''}${key !== cur ? `<button type="button" class="chip" data-mp="today">${n.cur}</button>` : ''}</div>
        <button type="button" class="icon-btn" data-mp="next" aria-label="${n.next}">›</button></div>
      ${progHtml(scope === 'day' ? own : { ...r.all, moved: r.all.total ? 0 : own.moved })}
      ${rollLine}
      ${items.length ? `<ul class="plan-list mp-list">${ordered(items).map((it) => itemHtml(it, scope, key, now)).join('')}</ul>`
        : `<div class="empty-state"><span>📝</span><b>${n.empty}</b><p>Ne yapmak istediğini sen yaz, ben takip edeyim 🐾</p></div>`}
      ${quickForm(scope, key)}
      <button type="button" class="link-btn" data-mp="add">＋ Ders ve hedefle ekle</button>
      ${tools.length ? `<div class="mp-tools">${tools.join('')}</div>` : ''}
      ${scope === 'day' ? questionHtml(key) + upHtml(key, now) + eodHtml(key, now) : ''}
      ${scope === 'week' ? daysHtml(key, now) : ''}
      ${scope === 'month' ? calHtml(key, now) : ''}
    </div>`;
  }

  // gün görünümünde o günün haftasının ve ayının hedefleri (işaretlenebilir)
  function upHtml(day, now) {
    const out = [];
    for (const [scope, icon, word] of [['week', '📅', 'haftanın'], ['month', '🗓️', 'ayın']]) {
      const k = Planlar.keyOf(scope, noon(day)), items = Planlar.list(scope, k);
      if (!items.length) continue;
      const st = Planlar.stats(items), isCur = k === Planlar.keyOf(scope, now);
      out.push(`<details class="mp-up" data-mp-open="${scope}"${openDetails.has(scope) ? ' open' : ''}><summary>${icon} ${isCur ? 'Bu' : 'O'} ${word} hedefleri (${st.done}/${st.total})</summary>
        <ul class="plan-list mp-list">${ordered(items).map((it) => itemHtml(it, scope, k, now)).join('')}</ul></details>`);
    }
    return out.join('');
  }

  function questionHtml(day) {
    if (day > U.dateKey(new Date())) return '';
    const rows = Planlar.questionEntries('day', day);
    const total = rows.reduce((n, x) => n + x.questions, 0);
    const { from, to } = Planlar.range('day', day);
    const inSessions = D().sessions.filter(s => s.start >= from && s.start < to).reduce((n, s) => n + (+s.questions || 0), 0);
    return `<section class="question-journal" aria-label="Soru günlüğü">
      <div class="mp-head"><h3>✍️ Soru günlüğü</h3><span class="journal-total">${total + inSessions} soru</span></div>
      <p class="hint">Günün sonunda hangi dersten, hangi konudan kaç soru çözdüğünü yaz. Süre eklenmez; önceden hedef belirlemen gerekmez.</p>
      ${inSessions ? `<p class="hint">${inSessions} soru oturumlarında zaten kayıtlı; aynı soruları yeniden ekleme. Günlükten eklenen: ${total}.</p>` : ''}
      ${rows.length ? `<ul class="question-list">${rows.map(x => `<li><button type="button" data-mp="question-edit" data-key="${esc(day)}" data-id="${esc(x.id)}" aria-label="Soru kaydını düzenle: ${esc(x.topic)}"><span><b>${esc(Store.subject(x.subjectId).name)}</b><small>${esc(x.topic)}</small></span><strong>${x.questions} <small>soru</small></strong><span aria-hidden="true">✎</span></button></li>`).join('')}</ul>` : '<p class="muted small">Bu gün için henüz konu kaydı yok.</p>'}
      <button type="button" class="btn soft" data-mp="question-add" data-key="${esc(day)}">＋ Çözdüğüm soruları ekle</button>
    </section>`;
  }
  function openQuestionForm(day, id = '') {
    const old = id ? (D().questionLogs || []).find(x => x.id === id && !x.del) : null;
    if (id && !old) return;
    const subs = D().subjects.slice();
    if (old && !subs.some(x => x.id === old.subjectId)) { const s = Store.subject(old.subjectId); if (s.id) subs.push(s); }
    const card = App.openModal(`<h3>✍️ ${old ? 'Soru kaydını düzenle' : 'Çözdüğüm sorular'}</h3>
      <p class="hint">Yalnızca gerçekten çözdüğün soruları yaz. Oturum bitişinde kaydettiklerini burada tekrar sayma.</p>
      <label class="field">Gün <input data-qlog="date" type="date" max="${U.dateKey(new Date())}" value="${esc(old ? old.date : day)}"></label>
      <label class="field">Ders <select data-qlog="subject"><option value="">Ders seç</option>${subs.map(x => `<option value="${esc(x.id)}"${old && x.id === old.subjectId ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
      <label class="field">Konu <input data-qlog="topic" maxlength="120" placeholder="Örn: Paragraf · ana düşünce" value="${esc(old ? old.topic : '')}"></label>
      <label class="field">Çözdüğüm soru sayısı <input data-qlog="count" type="number" min="1" max="9999" step="1" inputmode="numeric" value="${old ? old.questions : ''}" placeholder="Örn: 35"></label>
      <p class="hint" data-qlog="error" role="status"></p>
      <div class="modal-actions">${old ? '<button class="btn danger" data-qlog-act="delete">Sil</button>' : ''}<button class="btn soft" data-qlog-act="cancel">Vazgeç</button><button class="btn primary" data-qlog-act="save">Kaydet</button></div>`);
    const q = k => card.querySelector(`[data-qlog="${k}"]`);
    card.addEventListener('click', e => {
      const b = e.target.closest('[data-qlog-act]'); if (!b) return;
      if (b.dataset.qlogAct === 'cancel') { App.closeModal(); return; }
      if (b.dataset.qlogAct === 'delete') {
        if (!confirm('Bu soru kaydı silinsin mi?')) return;
        if (!Planlar.removeQuestions(id)) { q('error').textContent = 'Kayıt silinemedi; tekrar dene.'; return; }
      } else {
        const saved = Planlar.saveQuestions({ date: q('date').value, subjectId: q('subject').value, topic: q('topic').value, questions: q('count').value }, id);
        if (!saved) { q('error').textContent = 'Ders, konu, geçmiş veya bugüne ait gün ve 1–9999 arasında tam sayı gir. Kayıt alanı doluysa yer açıp tekrar dene.'; return; }
      }
      App.closeModal(); invalidate(); App.refresh(); App.toast('✍️', 'Soru günlüğün güncellendi');
    });
  }

  // ---------- Gün sonu kartı (gün görünümü) ----------
  function eodHtml(day, now) {
    const today = U.dateKey(now), eve = isEvening(now) && day === Messages.nightKey(now);
    if (!(day < today || eve)) return '';
    const v = Planlar.eodView(day, now), st = v.stats;
    if (!st.total && !st.moved) return '';
    const yesterday = U.dateKey(U.addDays(U.dayStart(now), -1));
    const w = sessionsIn('day', day);
    const next = Planlar.shift('day', day, 1);
    const to = eve ? next : Planlar.carryTarget('day', day, now);
    const hw = eve ? 'yarına' : hedefWord('day', to, now);
    const ring = st.total ? `<span class="mp-ring${st.pct === 100 ? ' full' : ''}" style="--p:${st.pct}"><b>%${st.pct}</b></span>` : '';
    const nums = st.total ? `${st.done}/${st.total} madde tamam${st.moved ? ` · ${st.moved} madde taşındı` : ''}` : `${st.moved} madde taşındı`;
    const when = eve ? 'Bugün' : day === yesterday ? 'Dün' : 'O gün';
    const writeLabel = eve ? 'Yarının' : next === today ? 'Bugünün' : 'Ertesi günün';
    return `<div class="mp-eod"><div class="mp-eod-head">${ring}
      <div><b>🌙 Gün sonu</b><small>${nums}</small>${w.minutes > 0 ? `<small>⏱️ ${when} ${U.fmtMin(w.minutes)} çalıştın${w.questions ? ` · ${w.questions} soru` : ''}</small>` : ''}</div></div>
      ${v.showText ? `<p class="mp-eod-text"><b>🐾 Luna:</b> ${esc(v.showText)}</p>` : ''}
      <div class="mp-tools">${st.remaining.length ? `<button type="button" class="btn primary small-btn" data-mp="carry" data-scope="day" data-key="${esc(day)}" data-to="${esc(to)}" data-hedef="${hw}">↪ Kalan ${st.remaining.length} maddeyi ${hw} taşı</button>` : ''}
        <button type="button" class="btn soft small-btn" data-mp="day" data-key="${esc(next)}" data-focus="1">✍️ ${writeLabel} planını yaz</button></div></div>`;
  }

  // ---------- Haftalık görünüm: 7 gün ----------
  function daysHtml(wk, now) {
    const today = U.dateKey(now);
    return `<div class="mp-days">${Planlar.daysOf('week', wk).map((k) => {
      const st = Planlar.stats(Planlar.list('day', k)), d = noon(k);
      const aria = `${d.getDate()} ${U.MONTHS[d.getMonth()]}: ${st.total ? `${st.total} maddeden ${st.done} tanesi tamam` : 'madde yok'}`;
      return `<button type="button" class="mp-day${k === today ? ' today' : ''}${st.total && st.pct === 100 ? ' full' : ''}" data-mp="day" data-key="${k}" style="--p:${st.pct || 0}" aria-label="${aria}">${U.DAYS_SHORT[d.getDay()]}<b>${d.getDate()}</b><small>${st.total ? `${st.done}/${st.total}` : '—'}</small><i></i></button>`;
    }).join('')}</div>`;
  }

  // ---------- Aylık görünüm: takvim ----------
  function calHtml(mk, now) {
    const today = U.dateKey(now), days = Planlar.daysOf('month', mk);
    const start = Planlar.keyOf('week', noon(days[0])), end = Planlar.shift('day', Planlar.keyOf('week', noon(days[days.length - 1])), 6);
    const cells = [];
    for (let k = start; k <= end; k = Planlar.shift('day', k, 1)) {
      const st = Planlar.stats(Planlar.list('day', k)), d = noon(k);
      const cls = st.total ? (st.pct === 100 ? ' full' : st.done ? ' part' : ' zero') : '';
      const aria = `${d.getDate()} ${U.MONTHS[d.getMonth()]}: ${st.total ? `${st.total} maddeden ${st.done} tanesi tamam` : 'madde yok'}`;
      cells.push(`<button type="button" class="mp-cal-cell${k.slice(0, 7) !== mk ? ' out' : ''}${k === today ? ' today' : ''}${cls}" data-mp="day" data-key="${k}" aria-label="${aria}">${d.getDate()}<small>${st.total ? `%${st.pct}` : ''}</small></button>`);
    }
    return `<div class="mp-cal">${['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((x) => `<span class="mp-cal-h">${x}</span>`).join('')}${cells.join('')}</div>`;
  }

  // ---------- Ana sayfa şeridi: akşam "gün sonu", sabah "dünden kalan" ----------
  const eodRec = (day) => { const p = D().plans; return p && p.eod && typeof p.eod === 'object' ? p.eod[day] : null; };
  function stripHtml(now) {
    const today = U.dateKey(now);
    if (isEvening(now)) {
      const day = Messages.nightKey(now), st = Planlar.stats(Planlar.list('day', day)), rec = eodRec(day);
      if (!st.remaining.length || (rec && rec.dismissed)) return '';
      const d = noon(day), lbl = day === today ? '🌙 Gün sonu' : `🌙 ${d.getDate()} ${U.MONTHS[d.getMonth()]}`;
      return `<div class="mp-strip"><span class="grow">${lbl}: %${st.pct} tamam</span><span class="mp-strip-acts">
        <button type="button" class="btn primary small-btn" data-mp="carry" data-scope="day" data-key="${day}" data-to="${Planlar.shift('day', day, 1)}" data-hedef="yarına">↪ Kalan ${st.remaining.length} maddeyi yarına taşı</button>
        <button type="button" class="btn soft small-btn" data-mp="dismiss" data-key="${day}">Gerek yok</button></span></div>`;
    }
    const y = U.dateKey(U.addDays(U.dayStart(now), -1)), st = Planlar.stats(Planlar.list('day', y)), rec = eodRec(y);
    if (!st.remaining.length || (rec && rec.dismissed)) return '';
    return `<div class="mp-strip"><span class="grow">🌅 Dünden kalan ${st.remaining.length} madde</span><span class="mp-strip-acts">
      <button type="button" class="btn primary small-btn" data-mp="carry" data-scope="day" data-key="${y}" data-to="${today}" data-hedef="bugüne">Bugüne al</button>
      <button type="button" class="btn soft small-btn" data-mp="dismiss" data-key="${y}">Gerek yok</button></span></div>`;
  }

  // ---------- Ana sayfa: "Bugünün planı" (YKS modu; kartın tamamı) ----------
  function renderToday(el) {
    if (!el || !window.Planlar) return;
    const now = new Date(), today = U.dateKey(now);
    paintedPhase = phaseOf(now);
    const items = Planlar.list('day', today), act = items.filter((x) => !x.moved), st = Planlar.stats(items);
    const strip = stripHtml(now);
    const morningStrip = strip && !isEvening(now);
    const pc = !act.length && !morningStrip ? Planlar.copyCount('day', today) : 0;
    const links = [];
    const wk = Planlar.keyOf('week', now), mk = Planlar.keyOf('month', now);
    const ws = Planlar.stats(Planlar.list('week', wk)), ms = Planlar.stats(Planlar.list('month', mk));
    if (ws.total || ws.moved) links.push(`<button type="button" class="link-btn" data-mp="open" data-scope="week">📅 Bu hafta ${ws.done}/${ws.total}</button>`);
    if (ms.total || ms.moved) links.push(`<button type="button" class="link-btn" data-mp="open" data-scope="month">🗓️ ${U.MONTHS[now.getMonth()]} ${ms.done}/${ms.total}</button>`);
    let hint = '';
    if (st.total && st.done === st.total) hint = '<p class="hint">Bugünün planı tamam! Harikasın 🌟</p>';
    else { const best = App && App.bestHours ? App.bestHours()[0] : null; if (best != null) hint = `<p class="hint">💡 En verimli saatin ${U.pad(best)}:00 civarı; zor konuyu o saate koy.</p>`; }
    const yks = !isProgram() && window.YKS && typeof YKS.field === 'function' && !YKS.field()
      ? '<p class="hint"><button type="button" class="link-btn" data-mp="to-yks">📚 Alanını seçersen YKS konularından da madde ekleyebilirsin</button></p>' : '';
    paint(el, `<h2>🗓️ Bugünün planı <span class="muted small">${st.done}/${st.total}</span></h2>
      ${st.total ? `<div class="track mp-track"><i style="width:${st.pct}%"></i></div>` : ''}
      ${act.length ? `<ul class="plan-list mp-list">${act.slice(0, 8).map((it) => itemHtml(it, 'day', today, now)).join('')}${act.length > 8 ? `<li class="mp-more"><button type="button" class="link-btn" data-mp="open" data-scope="day">… ${act.length - 8} madde daha</button></li>` : ''}</ul>`
        : `<p class="plan-empty">${items.length ? 'Bugünün maddelerini taşıdın. Yeni bir şey yazmak istersen buradayım 🐾' : 'Bugün için plan yok. Ne çalışmak istediğini sen yaz, ben takip edeyim 🐾'}</p>`}
      ${quickForm('day', today)}
      ${pc ? `<button type="button" class="btn soft small-btn" data-mp="copy" data-scope="day" data-key="${today}">⧉ Dünün planını kopyala (${pc})</button>` : ''}
      ${links.length ? `<p class="mp-roll mp-links">${links.join(' · ')}</p>` : ''}
      ${strip}
      ${hint}${yks}
      <button type="button" class="btn soft small-btn" data-mp="open" data-scope="day">Tüm planlarım →</button>`);
  }

  // ---------- Dönem / KPSS modu: UniUI kartının altına küçük blok (yalnızca elle yazılmış madde varsa) ----------
  function appendToday(el) {
    if (!el || !window.Planlar) return;
    const now = new Date(), today = U.dateKey(now);
    paintedPhase = phaseOf(now);
    const items = Planlar.list('day', today), strip = stripHtml(now);
    if (!items.length && !strip) return; // planı kullanmayan için kart eskisiyle birebir aynı kalır
    const act = items.filter((x) => !x.moved), st = Planlar.stats(items);
    // Dönem kartının "bugün plan maddesi yok" notu, altında Hazal'ın kendi maddeleri dururken çelişmesin
    if (act.length) { const rest = el.querySelector(':scope > p.muted.small'); if (rest && /^Bugün dersin ve plan maddesi yok/.test(rest.textContent)) rest.remove(); }
    el.insertAdjacentHTML('beforeend', `<div class="mp-mini"><h3 class="sub-h">🗓️ Planım <span class="muted small">${st.done}/${st.total}</span></h3>
      ${act.length ? `<ul class="plan-list mp-list">${act.slice(0, 8).map((it) => itemHtml(it, 'day', today, now)).join('')}${act.length > 8 ? `<li class="mp-more"><button type="button" class="link-btn" data-mp="open" data-scope="day">… ${act.length - 8} madde daha</button></li>` : ''}</ul>` : ''}${strip}</div>`);
  }

  // ---------- Ekle / düzenle penceresi ----------
  function topicPicker(it, prog) {
    if (!prog && window.YKS && typeof YKS.field === 'function' && YKS.field()) {
      const groups = YKS.subjectKeys().map((k) => {
        const s = YKS.SUBJECTS[k];
        return `<optgroup label="${esc(s.name)}">${s.topics.map((t) => `<option value="${esc(t.id)}"${it && it.topicId === t.id ? ' selected' : ''}>${STATUS_ICON[YKS.status(t.id)] || '○'} ${esc(t.name)}</option>`).join('')}</optgroup>`;
      }).join('');
      return { kind: 'yks', html: `<label class="field">Konudan seç (isteğe bağlı) <select data-f="topic"><option value="">—</option>${groups}</select></label>` };
    }
    const cs = prog && D().uni && Array.isArray(D().uni.courses) ? D().uni.courses.filter((c) => c && Array.isArray(c.topics) && c.topics.some((t) => t && t.title)) : [];
    if (cs.length) {
      const groups = cs.map((c) => `<optgroup label="${esc(c.name)}">${c.topics.map((t, i) => (t && t.title ? `<option value="u:${esc(c.id)}:${i}">${esc(t.title)}</option>` : '')).join('')}</optgroup>`).join('');
      return { kind: 'uni', html: `<label class="field">Konudan seç (isteğe bağlı) <select data-f="topic"><option value="">—</option>${groups}</select></label>` };
    }
    return { kind: '', html: '' };
  }
  // düzenleme penceresindeki "Bu madde … taşındı"
  function movedPhrase(scope, to, now) {
    const cur = Planlar.keyOf(scope, now);
    if (to === cur) return N[scope].hedef[0];
    if (to === Planlar.shift(scope, cur, 1)) return N[scope].hedef[1];
    const t = Planlar.label(scope, to, now).title;
    return scope === 'day' ? `${t} gününe` : scope === 'week' ? `${t} haftasına` : `${t} ayına`;
  }
  function position(id) {
    const f = Planlar.find(id);
    if (!f) return '';
    const act = Planlar.list(f.scope, f.key).filter((x) => !x.moved);
    const i = act.findIndex((x) => x.id === id);
    return i >= 0 ? `${act.length} maddeden ${i + 1}. sırada` : '';
  }
  function openForm(o) {
    const f = o.id ? Planlar.find(o.id) : null;
    if (o.id && !f) { invalidate(); App.refresh(); return; }
    const scope = f ? f.scope : o.scope, key = f ? f.key : o.key;
    if (!Planlar.isKey(scope, key)) return;
    const it = f ? f.item : null, now = new Date(), prog = isProgram();
    const lab = Planlar.label(scope, key, now);
    const subs = D().subjects.slice();
    if (it && it.subjectId && !subs.some((s) => s.id === it.subjectId)) { const s = subj(it.subjectId); if (s) subs.unshift(s); } // arşivdeki ders seçili kalsın
    const subjOpts = subs.map((s) => `<option value="${esc(s.id)}"${it && it.subjectId === s.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('');
    const topic = topicPicker(it, prog);
    const card = App.openModal(`<h3>${it ? '✏️ Maddeyi düzenle' : '＋ Yeni plan maddesi'}</h3><p class="muted small">${N[scope].seg} · ${esc(lab.title)}</p>
      <p class="hint">Her madde bir çalışma adımıdır. Ders seçersen o ders için, boş bırakırsan genel planın için kaydedilir. Günlük listene birden fazla madde ekleyebilirsin.</p>
      <label class="field">Bu maddede ne çalışacaksın? <input data-f="title" maxlength="120" placeholder="${esc(placeholder(scope))}" value="${it ? esc(it.title) : ''}"></label>
      <label class="field">Ders (isteğe bağlı) <select data-f="subject"><option value="">— Ders seçme —</option>${subjOpts}</select></label>
      ${topic.html}
      <label class="field">Hedef süre (saat, isteğe bağlı) <input type="text" data-f="hours" inputmode="decimal" placeholder="Örn: 1,5" value="${it && it.min ? U.num(Number((it.min / 60).toFixed(4))) : ''}"></label>
      <p class="hint">1,5 saat = 1 saat 30 dakika. Önceden soru hedefi belirlemene gerek yok; çözdüklerini gün sonunda Soru günlüğü'ne yazabilirsin.</p>
      ${it && scope === 'day' && !it.moved ? `<label class="field">Gün <input type="date" data-f="date" value="${esc(key)}"></label>` : ''}
      ${it && !it.moved ? `<div class="row mp-order"><button class="btn soft small-btn" data-act="up" type="button">⬆ Yukarı</button><button class="btn soft small-btn" data-act="down" type="button">⬇ Aşağı</button><span class="muted small" data-pos>${position(it.id)}</span></div>` : ''}
      ${it && it.moved ? `<p class="hint">Bu madde ${esc(movedPhrase(scope, it.moved, now))} taşındı.</p><button class="btn soft small-btn" data-act="uncarry" type="button">↩ Taşımayı geri al</button>` : ''}
      <div class="modal-actions">${it ? '<button class="btn danger" data-act="del" type="button">Sil</button><span style="flex:1"></span>' : ''}<button class="btn soft" data-act="cancel" type="button">Vazgeç</button><button class="btn primary" data-act="save" type="button">Kaydet</button></div>`);
    const q = (k) => card.querySelector(`[data-f="${k}"]`);
    let auto = ''; // konudan otomatik yazılan son başlık (Hazal değiştirdiyse dokunulmaz)
    const topicSel = q('topic');
    if (topicSel) topicSel.addEventListener('change', () => {
      const v = topicSel.value;
      if (!v) return;
      let name = '', sid = '';
      if (v.startsWith('u:')) {
        const [, cid, i] = v.split(':');
        const c = (D().uni.courses || []).find((x) => x && x.id === cid), t = c && c.topics[+i];
        if (!t) return;
        name = t.title; sid = c.subjectId;
      } else {
        const t = YKS.topic(v);
        if (!t) return;
        name = t.name; sid = App.subjectFor(t.subjectKey);
      }
      const ti = q('title');
      if (!ti.value.trim() || ti.value === auto) { ti.value = String(name).slice(0, 120); auto = ti.value; }
      if (sid && D().subjects.some((x) => x.id === sid)) q('subject').value = sid;
    });
    const done = () => { App.closeModal(); invalidate(); App.refresh(); };
    card.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'cancel') { App.closeModal(); return; }
      if (act === 'del') { if (!confirm(`"${it.title}" silinsin mi?`)) return; Planlar.remove(it.id); done(); return; }
      if (act === 'up' || act === 'down') {
        if (Planlar.reorder(it.id, act === 'up' ? -1 : 1)) { const p = card.querySelector('[data-pos]'); if (p) p.textContent = position(it.id); invalidate(); App.refresh(); }
        return;
      }
      if (act === 'uncarry') {
        if (!Planlar.uncarry(it.id)) { App.toast('↩️', 'Taşınan madde yapılmış, geri alınamaz'); return; }
        done(); return;
      }
      if (act !== 'save') return;
      const title = q('title').value.trim();
      if (!title) { App.toast('🗓️', 'Önce ne yapacağını yaz 🐾'); q('title').focus(); return; }
      const tv = topicSel ? topicSel.value : '';
      const minutes = Planlar.hoursToMinutes(q('hours').value, scope);
      if (minutes === null) { App.toast('⏱️', 'Geçerli bir saat gir', 'Günlük en fazla 24, haftalık 168, aylık 744 saat. Örnek: 1,5'); q('hours').focus(); return; }
      const data = { title, subjectId: q('subject').value, min: minutes,
        topicId: topic.kind === 'yks' ? tv : it ? it.topicId : '' }; // konu kimliği yalnızca YKS konuları için saklanır
      if (it) {
        Planlar.update(it.id, data);
        const dEl = q('date');
        if (dEl && dEl.value && dEl.value !== key && Planlar.isKey('day', dEl.value)) {
          if (Planlar.moveToDay(it.id, dEl.value)) App.toast('🗓️', 'Madde taşındı', Planlar.label('day', dEl.value).title);
          else App.toast('🗓️', 'Bu güne taşınamadı', 'O günün listesi dolu (en fazla 40 madde)');
        }
      } else {
        if (!Planlar.add(scope, key, data)) { App.toast('🗓️', 'Bu listeye en fazla 40 madde eklenebilir'); return; }
        intro();
      }
      done();
    });
  }
  // ilk madde eklenince bir kez
  function intro() {
    const p = D().plans;
    if (!p || p.intro) return;
    p.intro = true;
    Store.save();
    App.sayText(INTRO, { emotion: 'happy' });
  }

  // ---------- Olaylar ----------
  function open(scope, key) {
    if (!Planlar.SCOPES.includes(scope)) scope = 'day';
    const cur = Planlar.keyOf(scope);
    view.scope = scope;
    view.key = key && Planlar.isKey(scope, key) ? key : cur;
    view.follow = view.key === cur;
    saveScope();
    invalidate();
    App.showTab('plan');
    const root = $('#planner-root');
    if (root && root.getBoundingClientRect().top < 0) root.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  function onClick(ev) {
    const b = ev.target.closest('[data-mp]');
    if (!b || !ev.currentTarget.contains(b)) return;
    const a = b.dataset.mp, li = b.closest('[data-mp-id]'), id = li ? li.dataset.mpId : '';
    const now = new Date();
    invalidate();
    try {
      if (a === 'scope') { if (Planlar.SCOPES.includes(b.dataset.scope)) { view.scope = b.dataset.scope; view.follow = true; saveScope(); render(); } }
      else if (a === 'prev' || a === 'next') {
        if (!Planlar.isKey(view.scope, view.key)) view.key = Planlar.keyOf(view.scope, now);
        view.key = Planlar.shift(view.scope, view.key, a === 'prev' ? -1 : 1);
        view.follow = view.key === Planlar.keyOf(view.scope, now);
        render();
      } else if (a === 'today') { view.follow = true; render(); }
      else if (a === 'done') {
        const on = b.checked, r = Planlar.setDone(id, on);
        if (r && on) {
          if (r.fullDay) { App.sayText(U.pick(FULL), { emotion: 'proud' }); App.celebrate(); }
          else App.sayText(U.pick(TICK));
        }
        App.refresh();
      } else if (a === 'go') {
        const f = Planlar.find(id);
        if (f) App.startStudy({ subjectId: f.item.subjectId || undefined, intent: f.item.title });
      } else if (a === 'question-add') openQuestionForm(b.dataset.key);
      else if (a === 'question-edit') openQuestionForm(b.dataset.key, b.dataset.id);
      else if (a === 'edit') openForm({ id });
      else if (a === 'add') openForm({ scope: b.dataset.scope || view.scope, key: b.dataset.key || view.key });
      else if (a === 'carry') {
        const r = Planlar.carry(b.dataset.scope, b.dataset.key, { to: b.dataset.to });
        App.toast('↪', r.moved ? `${r.moved} madde ${b.dataset.hedef || hedefWord(b.dataset.scope, r.to, now)} taşındı` : 'Taşınacak madde kalmadı');
        App.refresh();
      } else if (a === 'copy') {
        const scope = b.dataset.scope || view.scope, key = b.dataset.key || view.key;
        const n = Planlar.copyCount(scope, key);
        if (Planlar.list(scope, key).length && !confirm(`Önceki listedeki ${n} madde bu listeye eklensin mi? Şimdiki maddelerin olduğu gibi kalır.`)) return;
        const added = Planlar.copyPrev(scope, key);
        App.toast('⧉', added ? `${added} madde kopyalandı` : 'Kopyalanacak yeni madde yok');
        App.refresh();
      } else if (a === 'day') {
        open('day', b.dataset.key);
        if (b.dataset.focus) { const q = $('#planner-root [data-mp-quick]'); if (q) q.focus(); }
      } else if (a === 'open') open(b.dataset.scope, b.dataset.key);
      else if (a === 'dismiss') { Planlar.dismissEod(b.dataset.key); App.refreshHome(); }
      else if (a === 'to-yks') App.showTab('plan');
    } catch (e) {
      ErrLog.add('Planlar: ' + ((e && e.message) || e), 'planlar-ui.js');
      App.toast('⚠️', 'Bu işlem şu an yapılamadı', 'Kayıtların güvende');
    }
  }
  function onSubmit(ev) {
    const form = ev.target.closest && ev.target.closest('form[data-mp-form]');
    if (!form) return;
    ev.preventDefault();
    const input = form.querySelector('[data-mp-quick]'), box = ev.currentTarget;
    try {
      const title = input.value.trim();
      if (!title) { App.toast('🗓️', 'Önce ne yapacağını yaz 🐾'); return; }
      if (!Planlar.add(form.dataset.scope, form.dataset.key, { title })) { App.toast('🗓️', 'Bu listeye en fazla 40 madde eklenebilir'); return; }
      input.value = '';
      intro();
      invalidate();
      App.refresh();
      // klavye açık kalsın: art arda birkaç madde yazılabilsin (iOS'ta odak aynı dokunuşun içinde verilmeli)
      const q = box.querySelector('[data-mp-quick]');
      if (q) q.focus({ preventScroll: true });
    } catch (e) {
      ErrLog.add('Planlar: ' + ((e && e.message) || e), 'planlar-ui.js');
      App.toast('⚠️', 'Madde eklenemedi', 'Kayıtların güvende');
    }
  }
  function bind() {
    for (const id of ['#planner-root', '#today-plan']) {
      const el = $(id);
      if (!el) continue;
      el.addEventListener('click', onClick);
      el.addEventListener('submit', onSubmit);
    }
    const root = $('#planner-root');
    if (root) root.addEventListener('toggle', (ev) => {
      const d = ev.target;
      if (!d.matches || !d.matches('details[data-mp-open]')) return;
      if (d.open) openDetails.add(d.dataset.mpOpen); else openDetails.delete(d.dataset.mpOpen);
      root.__mpHtml = ''; // açık / kapalı bilgisi bir sonraki çizimde doğru yazılsın
    }, true);
  }

  // ---------- Gün sonu: Luna'nın yorumu (günde bir kez) ----------
  function maybeComment(now = new Date()) {
    if (!App || document.hidden) return false;
    if (paintedPhase && phaseOf(now) !== paintedPhase) { App.refreshHome(); if (document.querySelector('#tab-plan.active')) render(); } // 20:00 / 05:00 geçişi
    if (App.isBusy() || App.quietFor(20000) || !Store.data.settings.msgInterval) return false;
    const due = Planlar.eodDue(now);
    if (!due) return false;
    const seq = Store.data.plans.eodSeq;
    const c = Messages.planComment(due.band, due.slot, due.vars, seq);
    if (!App.sayText(c.text, { emotion: c.emotion, ms: 12000 })) return false;
    seq[c.key] = (Number(seq[c.key]) || 0) + 1;
    Planlar.markEod(due.day, { pct: due.stats.pct, done: due.stats.done, total: due.stats.total, moved: due.stats.moved, band: due.band, slot: due.slot, text: c.text, at: Date.now() });
    invalidate();
    App.refreshHome();
    if (document.querySelector('#tab-plan.active')) render();
    return true;
  }

  return {
    init(app) { App = app; loadScope(); bind(); },
    render,
    renderToday,
    appendToday,
    onSession(session) { return Planlar.onSession(session); }, // sessiz: app.js zaten "tamam" der ve yeniden çizer
    maybeComment,
    open,
  };
})();

// app.js varlık kontrolü için (üst düzey const window'a eklenmez)
if (typeof window !== 'undefined') { window.PlanlarUI = PlanlarUI; }
