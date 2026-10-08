/* Planlarım: Hazal'ın elle yazdığı günlük, haftalık ve aylık planlar (yalnızca mantık; sayfaya dokunmaz).
   Uygulama hiçbir maddeyi kendiliğinden oluşturmaz, önermez, karıştırmaz: her madde Hazal'ın yazdığıdır.
   Kopyalama ve taşıma da yalnızca onun dokunuşuyla olur. Gün sonu yorumu kurallara dayanır (ağ ve yapay zekâ yok).
   Anahtarlar: gün "YYYY-AA-GG", hafta o haftanın pazartesisi "YYYY-AA-GG", ay "YYYY-AA". */

const Planlar = (() => {
  const SCOPES = ['day', 'week', 'month'], MAX_ITEMS = 40, MAX_TITLE = 120;
  const EOD_HOUR = 20, NIGHT_HOUR = 22, RECAP_END = 18; // akşam yorumu 20:00'den, gece dili 22:00'den; sabah özeti 18:00'e kadar
  const RE = { day: /^\d{4}-\d{2}-\d{2}$/, week: /^\d{4}-\d{2}-\d{2}$/, month: /^\d{4}-\d{2}$/ };
  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  // eski ya da bozuk bir kayıtta yapı eksikse burada tamamlanır (var olan hiçbir şey silinmez)
  const P = () => {
    const d = Store.data;
    if (!isObj(d.plans)) d.plans = {};
    for (const k of ['day', 'week', 'month', 'eod', 'eodSeq']) if (!isObj(d.plans[k])) d.plans[k] = {};
    return d.plans;
  };
  const noon = (k) => new Date(k + 'T12:00:00'); // hep yerel öğlen; new Date('YYYY-AA-GG') UTC sayılır, gün kayar
  const clean = (v) => (typeof v === 'string' ? v.replace(/[^\w:.-]/g, '') : '');
  const num = (v, max) => { const n = Math.round(Number(v) || 0); return n > 0 ? Math.min(n, max) : 0; };
  const live = (x) => isObj(x) && !x.del;
  const ms = (t) => { const n = +new Date(t == null ? Date.now() : t); return isNaN(n) ? Date.now() : n; };

  // ---------- Anahtarlar ----------
  function keyOf(scope, date = new Date()) {
    const d = new Date(date);
    if (scope === 'week') return U.dateKey(U.addDays(U.dayStart(d), -((d.getDay() + 6) % 7))); // pazartesi
    if (scope === 'month') return `${d.getFullYear()}-${U.pad(d.getMonth() + 1)}`;
    return U.dateKey(d);
  }
  function isKey(scope, key) {
    if (typeof key !== 'string' || !RE[scope] || !RE[scope].test(key)) return false;
    if (scope === 'month') { const m = +key.slice(5); return m >= 1 && m <= 12; }
    const d = noon(key);
    if (isNaN(d) || U.dateKey(d) !== key) return false;
    return scope !== 'week' || d.getDay() === 1;
  }
  function shift(scope, key, n) {
    if (scope === 'month') { const [y, m] = key.split('-').map(Number); return keyOf('month', new Date(y, m - 1 + n, 1)); }
    return U.dateKey(U.addDays(noon(key), scope === 'week' ? 7 * n : n));
  }
  // [from, to) milisaniye: oturumlar başladıkları güne sayılır (istatistiklerdeki gibi)
  function range(scope, key) {
    if (scope === 'month') { const [y, m] = key.split('-').map(Number); return { from: new Date(y, m - 1, 1).getTime(), to: new Date(y, m, 1).getTime() }; }
    const from = U.dayStart(noon(key)).getTime();
    return { from, to: U.dayStart(U.addDays(noon(key), scope === 'week' ? 7 : 1)).getTime() };
  }
  function label(scope, key, now = new Date()) {
    const cur = keyOf(scope, now);
    const rel = (names) => (key === cur ? names[0] : key === shift(scope, cur, 1) ? names[1] : key === shift(scope, cur, -1) ? names[2] : '');
    if (scope === 'month') {
      const [y, m] = key.split('-').map(Number);
      return { title: `${U.MONTHS[m - 1]} ${y}`, rel: rel(['Bu ay', 'Gelecek ay', 'Geçen ay']) };
    }
    const d = noon(key);
    if (scope === 'week') {
      const e = U.addDays(d, 6);
      const title = d.getMonth() === e.getMonth() ? `${d.getDate()}–${e.getDate()} ${U.MONTHS[e.getMonth()]}` : `${d.getDate()} ${U.MONTHS[d.getMonth()]} – ${e.getDate()} ${U.MONTHS[e.getMonth()]}`;
      return { title, rel: rel(['Bu hafta', 'Gelecek hafta', 'Geçen hafta']) };
    }
    return { title: `${d.getDate()} ${U.MONTHS[d.getMonth()]} ${U.DAYS[d.getDay()]}`, rel: rel(['Bugün', 'Yarın', 'Dün']) };
  }
  // haftanın 7 günü ya da ayın bütün günleri
  function daysOf(scope, key) {
    const { from, to } = range(scope, key), out = [];
    for (let d = new Date(from + 12 * 3600e3); d.getTime() < to; d = U.addDays(d, 1)) out.push(U.dateKey(d));
    return out;
  }
  // Kural: bir hafta, pazartesisinin düştüğü aya sayılır (ay sınırında haftalık hedefler önceki ayda görünebilir)
  function weeksOfMonth(mk) { return daysOf('month', mk).filter((k) => noon(k).getDay() === 1); }

  // ---------- Okuma (okurken hiçbir anahtar ya da madde oluşturulmaz) ----------
  function arr(scope, key, create) {
    if (!SCOPES.includes(scope) || !isKey(scope, key)) return null;
    const m = P()[scope];
    if (!Array.isArray(m[key])) { if (!create) return null; m[key] = []; }
    return m[key];
  }
  function list(scope, key) { const a = arr(scope, key); return a ? a.filter(live) : []; }
  // { item, scope, key, arr } — silinmiş (del) kayıtlar atlanır
  function loc(id) {
    if (!id) return null;
    for (const scope of SCOPES) {
      const m = P()[scope];
      for (const key of Object.keys(m)) {
        const a = m[key];
        if (!Array.isArray(a)) continue;
        const item = a.find((x) => live(x) && x.id === id);
        if (item) return { item, scope, key, arr: a };
      }
    }
    return null;
  }
  function find(id) { const f = loc(id); return f ? { item: f.item, scope: f.scope, key: f.key } : null; }
  // silinen madde iz olarak kalır: eski bir yedekle birleştirince geri gelmesin
  function tomb(a, item, now) { const i = a.indexOf(item); if (i >= 0) a[i] = { id: item.id, del: true, updated: now }; }

  // ---------- Yazma (her değişiklik "updated"ı yeniler: yedek birleştirmede yenisi kalır) ----------
  function mkItem(data, now) {
    return {
      id: 'p' + U.uid(), title: String(data.title == null ? '' : data.title).trim().slice(0, MAX_TITLE),
      subjectId: clean(data.subjectId), topicId: clean(data.topicId), min: num(data.min, 600), q: num(data.q, 999),
      done: false, doneAt: 0, moved: '', from: '', src: '', counted: false, created: now, updated: now,
    };
  }
  function add(scope, key, data = {}, now = Date.now()) {
    const title = String((data && data.title) || '').trim().slice(0, MAX_TITLE);
    if (!title || !isKey(scope, key)) return null;
    if (list(scope, key).length >= MAX_ITEMS) return null;
    const it = mkItem({ ...data, title }, ms(now));
    arr(scope, key, true).push(it);
    Store.save();
    return it;
  }
  function update(id, patch = {}, now = Date.now()) {
    const f = loc(id);
    if (!f || !isObj(patch)) return null;
    let title = null;
    if ('title' in patch) { title = String(patch.title == null ? '' : patch.title).trim().slice(0, MAX_TITLE); if (!title) return null; }
    const it = f.item;
    if (title !== null) it.title = title;
    if ('subjectId' in patch) it.subjectId = clean(patch.subjectId);
    if ('topicId' in patch) it.topicId = clean(patch.topicId);
    if ('min' in patch) it.min = num(patch.min, 600);
    if ('q' in patch) it.q = num(patch.q, 999);
    it.updated = ms(now);
    Store.save();
    return it;
  }
  function remove(id, now = Date.now()) {
    const f = loc(id);
    if (!f) return false;
    tomb(f.arr, f.item, ms(now));
    Store.save();
    return true;
  }
  // komşu maddeyle yer değiştirir (silinenler atlanır; taşınmış maddeler listenin sonunda ayrı durduğu için onlar da)
  function reorder(id, dir, now = Date.now()) {
    const f = loc(id);
    if (!f) return false;
    const a = f.arr, i = a.indexOf(f.item), step = dir < 0 ? -1 : 1, grp = !!f.item.moved;
    let j = i + step;
    while (j >= 0 && j < a.length && (!live(a[j]) || !!a[j].moved !== grp)) j += step;
    if (j < 0 || j >= a.length) return false;
    [a[i], a[j]] = [a[j], a[i]];
    a[i].updated = a[j].updated = ms(now);
    Store.save();
    return true;
  }
  // düzenleme penceresindeki "Gün": madde başka güne geçer (yapıldı bilgisi korunur)
  function moveToDay(id, newKey, now = Date.now()) {
    const f = loc(id);
    if (!f || f.scope !== 'day' || f.item.moved || !isKey('day', newKey)) return null;
    if (newKey === f.key) return f.item;
    if (list('day', newKey).length >= MAX_ITEMS) return null;
    const t = ms(now), copy = { ...f.item, id: 'p' + U.uid(), updated: t };
    arr('day', newKey, true).push(copy);
    tomb(f.arr, f.item, t);
    Store.save();
    return copy;
  }
  function setDone(id, on, now = Date.now()) {
    const f = loc(id);
    if (!f || f.item.moved) return null;
    const it = f.item, t = ms(now);
    const was = it.done;
    it.done = !!on; it.doneAt = on ? (was && it.doneAt ? it.doneAt : t) : 0; it.updated = t;
    const st = Store.data.stats;
    if (!Array.isArray(st.planFullDates)) st.planFullDates = [];
    if (on && !was && !it.counted) { it.counted = true; st.planItems = (st.planItems || 0) + 1; } // "Plancı" rozeti tik-kaldır-tik ile şişmesin
    let fullDay = false;
    if (on && !was && f.scope === 'day') {
      const s = stats(list('day', f.key));
      if (s.total > 0 && s.done === s.total && s.moved === 0) {
        fullDay = true;
        if (!st.planFullDates.includes(f.key)) {
          st.planFullDates.push(f.key);
          if (st.planFullDates.length > 400) st.planFullDates.splice(0, st.planFullDates.length - 400);
          st.planFull = (st.planFull || 0) + 1;
        }
      }
    }
    Store.save();
    return { item: it, fullDay };
  }

  // ---------- İlerleme ----------
  // Yapılan madde / etkin madde, aşağı yuvarlanır: %100 ancak hepsi bitince. Taşınan maddeler paydadan çıkar
  // (yeni yerinde bir kez sayılır). Dakika ve soru hedefleri yalnızca bilgi içindir, yüzdeye girmez.
  const pctOf = (done, total) => (total ? (done === total ? 100 : Math.max(done ? 1 : 0, Math.floor((done * 100) / total))) : null);
  function stats(items) {
    const lv = (items || []).filter(live), act = lv.filter((x) => !x.moved);
    const done = act.filter((x) => x.done).length, total = act.length;
    return { total, done, moved: lv.length - total, remaining: act.filter((x) => !x.done), movedItems: lv.filter((x) => x.moved), pct: pctOf(done, total) };
  }
  function combine(...sts) {
    let total = 0, done = 0, moved = 0;
    for (const s of sts) { total += s.total; done += s.done; moved += s.moved; }
    return { total, done, moved, pct: pctOf(done, total) };
  }
  // Günün yüzdesi yalnızca o günün maddeleridir; hafta ve ay kendi hedefleriyle birlikte altındakileri de toplar
  function roll(scope, key) {
    const own = stats(list(scope, key));
    if (scope === 'day') return { own, all: own };
    const dayItems = (keys) => [].concat(...keys.map((k) => list('day', k)));
    if (scope === 'week') { const days = stats(dayItems(daysOf('week', key))); return { own, days, all: combine(own, days) }; }
    const weeks = stats([].concat(...weeksOfMonth(key).map((k) => list('week', k))));
    const days = stats(dayItems(daysOf('month', key)));
    return { own, weeks, days, all: combine(own, weeks, days) };
  }
  function subjectWork(subjectId, scope, key) {
    if (!subjectId) return null;
    const { from, to } = range(scope, key);
    let minutes = 0, questions = 0;
    for (const s of Store.data.sessions) {
      if (!s || s.subjectId !== subjectId || !(s.start >= from && s.start < to)) continue;
      minutes += Math.max(0, Number(s.minutes) || 0);
      questions += +s.questions || 0;
    }
    return { minutes: Math.round(minutes), questions };
  }
  // Yalnızca gösterim: hedefe ulaşıldığı söylenir, madde hiçbir zaman kendiliğinden işaretlenmez.
  // Aynı derste bitmemiş ikinci bir hedefli madde varsa süre hangisine ait bilinemez: ipucu çıkmaz.
  function targetReached(item, scope, key) {
    if (!live(item) || item.done || item.moved || !(item.min || item.q) || !item.subjectId) return false;
    const w = subjectWork(item.subjectId, scope, key);
    if (!w || (item.min && w.minutes < item.min) || (item.q && w.questions < item.q)) return false;
    return list(scope, key).filter((x) => !x.done && !x.moved && (x.min || x.q) && x.subjectId === item.subjectId).length === 1;
  }

  // ---------- Taşıma ve kopyalama (yalnızca Hazal dokununca) ----------
  // geçmiş bir dönem bugüne / bu haftaya / bu aya, şimdiki dönem bir sonrakine taşınır
  function carryTarget(scope, key, now = new Date()) { const cur = keyOf(scope, now); return key < cur ? cur : shift(scope, key, 1); }
  function carry(scope, key, opts = {}) {
    const t = ms(opts.now), to = opts.to && isKey(scope, opts.to) && opts.to !== key ? opts.to : carryTarget(scope, key, t);
    const src = arr(scope, key);
    let count = 0, moved = 0;
    if (src) {
      for (const it of src.filter((x) => live(x) && !x.done && !x.moved)) {
        const dest = list(scope, to);
        const dup = dest.some((x) => !x.done && !x.moved && x.title === it.title && x.subjectId === it.subjectId); // ör. önce kopyalanmışsa
        if (!dup) {
          if (dest.length >= MAX_ITEMS) continue; // hedef liste dolu: madde yerinde kalır, kaybolmaz
          arr(scope, to, true).push({ ...mkItem(it, t), from: key, src: it.id });
          count++;
        }
        it.moved = to; it.updated = t; moved++;
      }
    }
    if (moved) Store.save();
    return { count, moved, to };
  }
  // taşımayı geri al: kopya henüz yapılmadıysa silinir, madde eski yerinde yeniden etkin olur
  function uncarry(id, now = Date.now()) {
    const f = loc(id);
    if (!f || !f.item.moved) return false;
    const t = ms(now), m = P()[f.scope];
    const look = (a) => (Array.isArray(a) ? a.find((x) => live(x) && x.src === id) : null);
    let hit = look(m[f.item.moved]), hitArr = m[f.item.moved];
    if (!hit) for (const k of Object.keys(m)) { hit = look(m[k]); if (hit) { hitArr = m[k]; break; } } // kopya başka bir güne alınmış olabilir
    if (hit) {
      if (hit.done) return false;
      if (hit.moved && !uncarry(hit.id, t)) return false; // kopya da taşınmışsa önce o geri alınır
      tomb(hitArr, hit, t);
    }
    f.item.moved = ''; f.item.updated = t;
    Store.save();
    return true;
  }
  // kopyalanacak maddeler: listede aynısı (başlık + ders) olmayanlar, 40 madde sınırına kadar
  function copyable(scope, key) {
    if (!isKey(scope, key)) return [];
    const dest = list(scope, key), seen = new Set(dest.map((x) => x.title + '\u0000' + x.subjectId)), out = [];
    for (const it of list(scope, shift(scope, key, -1)).filter((x) => !x.moved)) {
      if (dest.length + out.length >= MAX_ITEMS) break;
      const k = it.title + '\u0000' + it.subjectId;
      if (seen.has(k)) continue;
      seen.add(k); out.push(it);
    }
    return out;
  }
  // bir önceki listeyi başlangıç olarak ekler (yapılmışlar da yapılmamış olarak); aynı madde ikinci kez eklenmez
  function copyPrev(scope, key, now = Date.now()) {
    const items = copyable(scope, key), t = ms(now);
    for (const it of items) arr(scope, key, true).push(mkItem(it, t));
    if (items.length) Store.save();
    return items.length;
  }
  function prevCount(scope, key) { return isKey(scope, key) ? list(scope, shift(scope, key, -1)).filter((x) => !x.moved).length : 0; }
  // kopyala düğmesi için: gerçekten eklenecek madde sayısı (hepsi zaten listedeyse düğme görünmez)
  function copyCount(scope, key) { return copyable(scope, key).length; }

  // ---------- Oturum bitince (eski kural) ----------
  // ▶ ile hedefsiz bir maddeden başlatılan oturum bitince o madde yapıldı sayılır. Hedefli maddeler hiç kendiliğinden işaretlenmez.
  function onSession(session) {
    if (!session || !session.intent) return null;
    const t = session.start || Date.now();
    for (const scope of SCOPES) {
      const it = list(scope, keyOf(scope, t)).find((x) => !x.done && !x.moved && !x.min && !x.q && x.title.slice(0, 80) === session.intent); // sayaçtaki hedef 80 karakterde kesilir
      if (it) { setDone(it.id, true); return it; }
    }
    return null;
  }

  // ---------- Gün sonu ----------
  function bandOf(st) {
    if (!st.total) return st.moved ? 'hepsiTasindi' : 'bos';
    if (!st.done) return 'sifir';
    if (st.pct < 40) return 'az';
    if (st.pct < 70) return 'orta';
    if (st.pct < 100) return 'cok';
    return 'tam';
  }
  // kalanların en kısası (hedef dakikası en az olan; eşitse listedeki ilk)
  function smallest(st) {
    const pool = bandOf(st) === 'hepsiTasindi' ? st.movedItems : st.remaining;
    let best = null;
    for (const x of pool || []) if (!best || (x.min || 999) < (best.min || 999)) best = x;
    return best;
  }
  const shortTitle = (t) => { t = String(t || ''); return t.length > 40 ? t.slice(0, 39).trim() + '…' : t; };
  // son günlerde plan defteri kullanıldı mı (hiç kullanmayana "plan yazmadın" denmez)
  function usedRecently(now = new Date()) {
    const lo = U.dateKey(U.addDays(U.dayStart(now), -14)), hi = U.dateKey(U.addDays(U.dayStart(now), 7));
    const has = (a) => Array.isArray(a) && a.some(live);
    const p = P();
    for (const k of Object.keys(p.day)) if (k >= lo && k <= hi && has(p.day[k])) return true;
    const wk = keyOf('week', now), mk = keyOf('month', now);
    return [wk, shift('week', wk, -1)].some((k) => has(p.week[k])) || [mk, shift('month', mk, -1)].some((k) => has(p.month[k]));
  }
  function minutesOn(day) {
    const { from, to } = range('day', day);
    let m = 0;
    for (const s of Store.data.sessions) if (s && s.start >= from && s.start < to) m += Math.max(0, Number(s.minutes) || 0);
    return Math.round(m);
  }
  function varsOf(st, day) {
    const sm = smallest(st), minutes = minutesOn(day);
    return { yuzde: st.pct == null ? 0 : st.pct, yapilan: st.done, toplam: st.total, kalan: st.remaining.length, tasinan: st.moved,
      kucuk: sm ? shortTitle(sm.title) : '', sure: U.fmtMin(minutes), dakika: minutes };
  }
  // yorgun / zor bir gün dediyse akşam da yumuşak gece dili (oturum önerisi yok, yalnızca taşı ve dinlen)
  function softSlot(slot, band, now) {
    if (slot !== 'aksam' || !['sifir', 'az', 'orta'].includes(band)) return slot;
    // yalnızca okunur (companionState gün değişince kaydı sıfırladığı için burada çağrılmaz)
    const c = Store.data.lunaConversation, feel = isObj(c) && c.day === Messages.nightKey(now) ? c.feeling : '';
    return feel === 'Tired' || feel === 'Hard' ? 'gece' : slot;
  }
  // Gece yarısından 05:00'e kadar hâlâ "bu akşam" sayılır (Luna'nın günü gibi): 00:30'daki yorum önceki günün,
  // "yarın" da takvimdeki bugündür. Akşam açılmadıysa ertesi gün ilk açılışta (05:00–17:59) dün özetlenir.
  function eodDue(now = new Date()) {
    now = new Date(now);
    const h = now.getHours(), today = U.dateKey(now);
    let day, slot;
    if (h >= EOD_HOUR || h < 5) { day = Messages.nightKey(now); slot = h >= NIGHT_HOUR || h < 5 ? 'gece' : 'aksam'; }
    else if (h < RECAP_END) { day = U.dateKey(U.addDays(U.dayStart(now), -1)); slot = 'sabah'; }
    else return null;
    const rec = P().eod[day];
    if (rec && rec.at) return null; // günde bir kez
    const st = stats(list('day', day)), band = bandOf(st);
    if (slot === 'sabah' && st.total === 0) return null; // boş ya da tamamen taşınmış gün için sabah özeti yok
    if (band === 'bos' && (slot !== 'aksam' || !usedRecently(now))) return null; // plan defterini kullanmayana hiç, gece de değil
    if (band === 'hepsiTasindi' && slot === 'sabah') return null;
    slot = softSlot(slot, band, now);
    return { day, slot, band, stats: st, target: slot === 'sabah' ? today : shift('day', day, 1), vars: varsOf(st, day) };
  }
  function markEod(day, rec = {}) {
    if (!isKey('day', day)) return null;
    const e = P().eod, r = { ...(isObj(e[day]) ? e[day] : {}), ...rec };
    r.text = typeof r.text === 'string' ? r.text.slice(0, 400) : '';
    e[day] = r;
    const cut = U.dateKey(U.addDays(U.dayStart(new Date()), -120)); // eski gün sonu notları birikmesin
    for (const k of Object.keys(e)) if (k < cut) delete e[k];
    Store.save();
    return r;
  }
  function dismissEod(day) {
    if (!isKey('day', day)) return;
    const e = P().eod;
    e[day] = { ...(isObj(e[day]) ? e[day] : {}), dismissed: true };
    Store.save();
  }
  // Gün sonu kartı ve ana sayfa şeridi için: sayılar, söylenen (ya da söylenecek) Luna cümlesi
  function eodView(day, now = new Date()) {
    now = new Date(now);
    const st = stats(list('day', day)), band = bandOf(st), h = now.getHours();
    const stored = isObj(P().eod[day]) ? P().eod[day] : null;
    const yesterday = U.dateKey(U.addDays(U.dayStart(now), -1));
    let slot = null;
    if ((h >= EOD_HOUR || h < 5) && day === Messages.nightKey(now)) slot = h >= NIGHT_HOUR || h < 5 ? 'gece' : 'aksam';
    else if (day === yesterday && st.total > 0) slot = 'sabah';
    if (slot) slot = softSlot(slot, band, now);
    const vars = varsOf(st, day);
    let showText = '';
    if (stored && stored.text && stored.done === st.done && stored.total === st.total) showText = stored.text;
    else if (slot && band !== 'bos') showText = Messages.planComment(band, slot, vars, P().eodSeq).text;
    return { stats: st, band, slot, vars, stored, showText };
  }

  return {
    SCOPES, MAX_ITEMS, keyOf, isKey, shift, range, label, daysOf, weeksOfMonth, list, find, add, update, remove,
    reorder, moveToDay, setDone, stats, roll, subjectWork, targetReached, carryTarget, carry, uncarry,
    copyPrev, prevCount, copyCount, bandOf, smallest, usedRecently, eodDue, eodView, markEod, dismissEod, onSession,
  };
})();

// app.js varlık kontrolü için (üst düzey const window'a eklenmez)
if (typeof window !== 'undefined') { window.Planlar = Planlar; }
