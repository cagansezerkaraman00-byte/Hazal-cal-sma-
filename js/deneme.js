/* Deneme takibi: net hesabı, gelişim grafiği ve eksik konu analizi.
   Deneme: {id, date: 'YYYY-AA-GG', type: 'TYT'|'AYT'|'BRANS', brans?, name, scores: {dersAnahtarı: {d, y}}, eksik: [konuId], note, created} */

const Deneme = (() => {
  const D = () => Store.data;
  const r2 = (x) => Math.round(x * 100) / 100;
  const fmt = (x) => r2(x).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
  // YKS kuralı: 4 yanlış 1 doğruyu götürür
  const net = (d, y) => r2((+d || 0) - (+y || 0) / 4);

  const sub = (k) => YKS.SUBJECTS[k];
  function rowKeys(type, field, brans) {
    if (type === 'TYT') return YKS.TYT_KEYS.filter(sub);
    if (type === 'AYT') return ((YKS.FIELDS[field] || YKS.FIELDS.SAY).ayt).filter(sub);
    return brans && sub(brans) ? [brans] : [];
  }
  function total(e) {
    let t = 0;
    for (const k of Object.keys(e.scores || {})) t += net(e.scores[k].d, e.scores[k].y);
    return r2(t);
  }
  function maxQ(e) {
    let q = 0;
    for (const k of Object.keys(e.scores || {})) if (sub(k)) q += sub(k).total;
    return q;
  }
  // DİL alanının ikinci oturumu YDT'dir; kayıt 'AYT' türünde tutulur, görünen ad içeriğe göre belirlenir
  const isYdt = (e) => e.type === 'AYT' && !!e.scores && 'ydt' in e.scores && Object.keys(e.scores).every((k) => k === 'ydt');
  const kind = (e) => (isYdt(e) ? 'YDT' : e.type); // TYT | AYT | YDT | BRANS
  const typeName = (t) => (t === 'AYT' && YKS.field() === 'DIL' ? 'YDT' : t);
  const label = (e) => (e.type === 'BRANS' ? (sub(e.brans) ? sub(e.brans).short : 'Branş') : kind(e));
  const sameKind = (a, b) => kind(a) === kind(b) && (a.type !== 'BRANS' || a.brans === b.brans);
  const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.created || 0) - (b.created || 0));

  function list() { return D().denemeler.slice().sort(byDate); }
  function kindList(e) { return list().filter((x) => sameKind(x, e)); }
  function previous(e) {
    const l = kindList(e);
    const i = l.findIndex((x) => x.id === e.id);
    return i > 0 ? l[i - 1] : null;
  }
  // En son denemenin kısa özeti (karşılama kartı için)
  function lastSummary() {
    const l = list();
    if (!l.length) return null;
    const e = l[l.length - 1];
    const p = previous(e);
    return { type: label(e), net: fmt(total(e)), delta: p ? r2(total(e) - total(p)) : 0 };
  }
  function hasRise(n) {
    const l = list();
    return l.some((e) => { const p = previous(e); return p && total(e) - total(p) >= n; });
  }
  // Son N denemede işaretlenen eksik konular → {konuId: kaç kez}
  function eksikCounts(lastN = 6) {
    const out = {};
    for (const e of list().slice(-lastN)) for (const id of e.eksik || []) out[id] = (out[id] || 0) + 1;
    return out;
  }
  // Öncelikli eksikler: tekrar sayısı × YKS'deki ortalama soru ağırlığı
  function weakTopics(lastN = 6, limit = 8) {
    const c = eksikCounts(lastN);
    return Object.keys(c)
      .map((id) => ({ topic: YKS.topic(id), count: c[id] }))
      .filter((x) => x.topic)
      .map((x) => ({ ...x, score: x.count * Math.max(x.topic.avg, 0.5) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // Olumlu, yol gösteren gözlemler
  function insights() {
    const out = [];
    const l = list();
    if (!l.length) return out;
    for (const type of ['TYT', 'AYT', 'YDT']) {
      const t = l.filter((e) => kind(e) === type);
      if (t.length >= 2) {
        const diff = r2(total(t[t.length - 1]) - total(t[0]));
        if (diff > 0) out.push(`İlk ${type} denemenden bu yana +${fmt(diff)} net kazandın 📈`);
      }
      if (t.length) {
        const best = t.reduce((a, b) => (total(b) > total(a) ? b : a));
        if (t.length >= 3 && best === t[t.length - 1]) out.push(`Son ${type} denemen şimdiye kadarki en iyin! 🌟`);
      }
    }
    // en çok yükselen ders (aynı türdeki son iki deneme)
    const last = l[l.length - 1];
    const prev = previous(last);
    if (prev) {
      let bestK = null, bestD = 0;
      for (const k of Object.keys(last.scores)) {
        if (!prev.scores[k]) continue;
        const d = net(last.scores[k].d, last.scores[k].y) - net(prev.scores[k].d, prev.scores[k].y);
        if (d > bestD) { bestD = d; bestK = k; }
      }
      if (bestK) out.push(`En çok yükselen dersin ${sub(bestK).short} (+${fmt(bestD)} net) 👏`);
    }
    // sağlam olduğun ve en çok net kazanabileceğin ders
    const ratios = Object.keys(last.scores).filter(sub).map((k) => ({ k, r: net(last.scores[k].d, last.scores[k].y) / sub(k).total, left: sub(k).total - (+last.scores[k].d || 0) }));
    const strong = ratios.filter((x) => x.r >= 0.8).sort((a, b) => b.r - a.r)[0];
    if (strong) out.push(`${sub(strong.k).short} dersinde çok sağlamsın 💪`);
    const chance = ratios.filter((x) => x.r < 0.8 && x.left >= 3).sort((a, b) => b.left - a.left)[0];
    if (chance) out.push(`En çok net kazanabileceğin ders: ${sub(chance.k).short} (${chance.left} soru fırsat) 🧭`);
    if (!out.length) out.push('Her deneme sana yol gösteren bir harita. Eksik konuları işaretledikçe sana özel öncelik listesi çıkaracağım 🐾');
    return out;
  }

  // Hafif SVG çizgi grafik (kütüphanesiz)
  // width: kutunun piksel genişliği (yazılar büyüyüp küçülmesin diye viewBox = gerçek boyut)
  function chart(type, width = 600) {
    const t = list().filter((e) => kind(e) === type);
    if (!t.length) return '';
    const W = Math.max(280, Math.round(width)), H = 190, P = { l: 34, r: 14, t: 12, b: 26 };
    const maxY = Math.max(...t.map(maxQ), 1);
    const x = (i) => P.l + (t.length === 1 ? (W - P.l - P.r) / 2 : (i * (W - P.l - P.r)) / (t.length - 1));
    const y = (v) => P.t + (1 - Math.max(0, v) / maxY) * (H - P.t - P.b);
    let g = '';
    for (const f of [0, 0.25, 0.5, 0.75, 1]) {
      const v = Math.round(maxY * f);
      g += `<line class="grid-line" x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}"/><text class="axis-label" x="${P.l - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    }
    const pts = t.map((e, i) => `${x(i).toFixed(1)},${y(total(e)).toFixed(1)}`).join(' ');
    const step = Math.max(1, Math.ceil(t.length / Math.max(2, Math.floor(W / 90))));
    const dots = t.map((e, i) => {
      const dd = e.date.slice(8, 10) + '.' + e.date.slice(5, 7);
      const lab = i % step === 0 || i === t.length - 1 ? `<text class="axis-label" x="${x(i)}" y="${H - 8}" text-anchor="middle">${dd}</text>` : '';
      return `<circle class="dot" cx="${x(i).toFixed(1)}" cy="${y(total(e)).toFixed(1)}" r="4"><title>${U.esc(e.name || type)} · ${dd} · ${fmt(total(e))} net</title></circle>${lab}`;
    }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${type} net gelişimi">${g}<polyline class="line-${type.toLowerCase()}" fill="none" points="${pts}"/>${dots}</svg>`;
  }

  return { net, fmt, total, maxQ, rowKeys, label, kind, typeName, list, previous, lastSummary, hasRise, eksikCounts, weakTopics, insights, chart };
})();

const DenemeUI = (() => {
  let App = null;
  let tableType = 'TYT';
  const $ = (s, el = document) => el.querySelector(s);
  const D = () => Store.data;
  const field = () => YKS.field() || 'SAY';

  function render() {
    const root = $('#deneme-root');
    if (!root) return;
    const l = Deneme.list();
    const head = `<div class="deneme-actions"><button class="btn primary" data-act="add">＋ Deneme ekle</button>${window.Asistan && l.length ? '<button class="btn soft" data-act="ai">🎓 Asistanla analiz et</button>' : ''}<span class="hint">Net = Doğru − Yanlış ÷ 4</span></div>`;
    if (!l.length) {
      root.innerHTML = head + `<div class="card empty-state"><div style="font-size:2rem">📝</div>
        <p><b>Henüz deneme yok.</b></p>
        <p class="muted">Deneme çözdükten sonra doğru ve yanlışlarını gir; eksik çıkan konuları işaretle. Luna netlerini çizer, hangi konulara öncelik vermen gerektiğini YKS'deki soru ağırlıklarına göre sıralar.</p></div>`;
      return;
    }
    const KINDS = ['TYT', 'AYT', 'YDT'];
    const lastOf = (type) => l.filter((e) => Deneme.kind(e) === type).pop();
    const tile = (ic, v, lab, extra = '') => `<div class="tile"><div class="ic">${ic}</div><div class="v">${v}${extra}</div><div class="l">${lab}</div></div>`;
    const deltaTxt = (e) => { const p = e && Deneme.previous(e); if (!p) return ''; const d = Deneme.total(e) - Deneme.total(p); return d > 0 ? ` <small class="pos">+${Deneme.fmt(d)}</small>` : ''; };
    const tTyt = lastOf('TYT'), tAyt = lastOf('AYT'), tYdt = lastOf('YDT');
    const bestTyt = l.filter((e) => e.type === 'TYT').reduce((a, b) => (!a || Deneme.total(b) > Deneme.total(a) ? b : a), null);
    let tiles = '';
    if (tTyt) tiles += tile('📘', Deneme.fmt(Deneme.total(tTyt)), 'Son TYT neti', deltaTxt(tTyt));
    if (tAyt) tiles += tile('📗', Deneme.fmt(Deneme.total(tAyt)), 'Son AYT neti', deltaTxt(tAyt));
    if (tYdt) tiles += tile('📙', Deneme.fmt(Deneme.total(tYdt)), 'Son YDT neti', deltaTxt(tYdt));
    if (bestTyt) tiles += tile('🏆', Deneme.fmt(Deneme.total(bestTyt)), 'En iyi TYT');
    tiles += tile('🗂️', String(l.length), 'Deneme sayısı');

    const cw = Math.min(1100, (root.clientWidth || 600) - 40);
    const charts = KINDS.map((t) => { const c = Deneme.chart(t, cw); return c ? `<div class="chart-card"><h3 class="sub-h">${t} netlerin</h3><div class="chart">${c}</div></div>` : ''; }).join('');
    const weak = Deneme.weakTopics();
    const types = KINDS.filter((t) => lastOf(t));
    if (!types.includes(tableType)) tableType = types[0] || 'TYT';

    root.innerHTML = head + `
      <div class="tiles">${tiles}</div>
      <div class="grid">
        <div class="card good"><h2>⭐ Gelişimin</h2><ul class="insights">${Deneme.insights().map((x) => `<li>${U.esc(x)}</li>`).join('')}</ul></div>
        <div class="card">
          <h2>🎯 Öncelikli konular</h2>
          <p class="hint">Denemelerde eksik çıkan konular, YKS'de ortalama kaç soru geldiğine göre sıralandı.</p>
          ${weak.length ? `<ul class="weak-list">${weak.map((w, i) => {
            const maxS = weak[0].score || 1;
            return `<li class="weak-item" data-topic="${w.topic.id}">
              <span class="rank">${i + 1}</span>
              <div class="weak-topic">${U.esc(w.topic.name)}<small>${U.esc(YKS.SUBJECTS[w.topic.subjectKey].name)} · ≈${w.topic.avg} soru · ${w.count}× eksik</small></div>
              <div class="wbar" title="Öncelik"><i style="width:${Math.round((w.score / maxS) * 100)}%"></i></div>
              <span class="weak-acts"><button class="icon-btn" data-act="review" title="Tekrar listesine ekle">📌</button><button class="btn soft small-btn" data-act="study">Çalış ▶</button></span>
            </li>`;
          }).join('')}</ul>` : '<p class="empty-state">Deneme eklerken eksik konuları işaretlersen burada sana özel öncelik listesi oluşur 🧭</p>'}
        </div>
        ${charts ? `<div class="card wide-card">${charts}</div>` : ''}
        ${types.length ? `<div class="card wide-card">
          <h2>📊 Ders ders netlerin</h2>
          ${types.length > 1 ? `<div class="seg" data-role="table-seg">${types.map((t) => `<button data-type="${t}" class="${t === tableType ? 'active' : ''}">${t}</button>`).join('')}</div>` : ''}
          ${subjectTable(tableType)}
        </div>` : ''}
        <div class="card wide-card">
          <h2>🗂️ Denemelerin</h2>
          <ul class="deneme-list">${l.slice().reverse().map(item).join('')}</ul>
        </div>
      </div>`;
  }

  function subjectTable(type) {
    const t = Deneme.list().filter((e) => Deneme.kind(e) === type);
    const last = t[t.length - 1];
    if (!last) return '';
    const prev = Deneme.previous(last);
    const rows = Object.keys(last.scores).filter((k) => YKS.SUBJECTS[k]).map((k) => {
      const s = last.scores[k];
      const n = Deneme.net(s.d, s.y);
      const pn = prev && prev.scores[k] ? Deneme.net(prev.scores[k].d, prev.scores[k].y) : null;
      const best = Math.max(...t.filter((e) => e.scores[k]).map((e) => Deneme.net(e.scores[k].d, e.scores[k].y)));
      const ch = pn == null ? '' : n - pn;
      return `<tr><td>${U.esc(YKS.SUBJECTS[k].short)}</td><td>${s.d || 0}</td><td>${s.y || 0}</td><td><b>${Deneme.fmt(n)}</b> <span class="muted small">/ ${YKS.SUBJECTS[k].total}</span></td>
        <td class="${ch === '' ? '' : ch > 0 ? 'pos' : ch < 0 ? 'neg' : ''}">${ch === '' ? '—' : (ch > 0 ? '+' : '') + Deneme.fmt(ch)}</td><td>${Deneme.fmt(best)}</td></tr>`;
    }).join('');
    return `<div class="table-wrap"><table class="net-table"><thead><tr><th>Ders</th><th>D</th><th>Y</th><th>Net</th><th>Değişim</th><th>En iyi</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="hint">Son ${type} denemesi: ${U.esc(last.name || '')} ${last.date.split('-').reverse().join('.')}</p>`;
  }

  function item(e) {
    const p = Deneme.previous(e);
    const d = p ? Deneme.total(e) - Deneme.total(p) : 0;
    const eks = (e.eksik || []).map((id) => YKS.topic(id)).filter(Boolean);
    return `<li><details class="deneme-item" data-id="${e.id}">
        <summary>
          <span class="d-date">${e.date.split('-').reverse().join('.')}</span>
          <span class="type-tag" data-type="${Deneme.kind(e)}">${U.esc(Deneme.label(e))}</span>
          <span class="d-name">${U.esc(e.name || 'Deneme')}</span>
          <span class="d-net">${Deneme.fmt(Deneme.total(e))} <small>net</small></span>${d > 0 ? `<small class="pos">+${Deneme.fmt(d)}</small>` : ''}
          <span class="chev">▾</span>
        </summary>
        <div class="deneme-detail">
          <div class="table-wrap"><table class="net-table"><tbody>${Object.keys(e.scores).filter((k) => YKS.SUBJECTS[k]).map((k) => `<tr><td>${U.esc(YKS.SUBJECTS[k].short)}</td><td>${e.scores[k].d || 0} D</td><td>${e.scores[k].y || 0} Y</td><td><b>${Deneme.fmt(Deneme.net(e.scores[k].d, e.scores[k].y))}</b></td></tr>`).join('')}</tbody></table></div>
          ${eks.length ? `<p class="small"><b>Eksik konular:</b> ${eks.map((t) => U.esc(t.name)).join(', ')}</p>` : ''}
          ${e.note ? `<p class="small">📝 ${U.esc(e.note)}</p>` : ''}
          <div class="row"><button class="btn soft small-btn" data-act="edit">Düzenle</button><button class="btn danger small-btn" data-act="del">Sil</button></div>
        </div>
      </details></li>`;
  }

  // ---------- Deneme ekleme / düzenleme penceresi ----------
  function openForm(existing) {
    const e = existing ? JSON.parse(JSON.stringify(existing)) : { type: 'TYT', date: U.dateKey(new Date()), name: '', scores: {}, eksik: [], note: '', brans: '' };
    const allKeys = YKS.subjectKeys(field());
    let type = e.type, brans = e.brans || allKeys[0];
    const picked = new Set(e.eksik || []);

    const card = App.openModal(`
      <h3>${existing ? '✏️ Denemeyi düzenle' : '📝 Deneme ekle'}</h3>
      <p class="sub">Doğru ve yanlış sayılarını gir; netin otomatik hesaplanır.</p>
      <div class="seg" data-role="type">${['TYT', 'AYT', 'BRANS'].map((t) => `<button type="button" data-type="${t}">${t === 'BRANS' ? 'Branş' : Deneme.typeName(t)}</button>`).join('')}</div>
      <div class="form-row two">
        <div><label>Tarih</label><input type="date" data-f="date" value="${e.date}"></div>
        <div><label>Adı / yayın</label><input data-f="name" maxlength="40" placeholder="Örn: 3D Türkiye geneli" value="${U.esc(e.name)}"></div>
      </div>
      <div data-role="brans-row" class="form-row"><label>Ders</label><select data-f="brans">${allKeys.map((k) => `<option value="${k}" ${k === brans ? 'selected' : ''}>${U.esc(YKS.SUBJECTS[k].name)}</option>`).join('')}</select></div>
      <div class="net-grid" data-role="rows"></div>
      <div class="net-total" data-role="total"></div>
      <label>Eksik çıkan konular <span class="muted small">(isteğe bağlı, öncelik listesi bunlardan oluşur)</span></label>
      <input data-f="filter" placeholder="Konu ara…">
      <div data-role="picks"></div>
      <label>Not</label>
      <textarea data-f="note" rows="2" placeholder="Örn: Paragrafta zaman yetmedi">${U.esc(e.note || '')}</textarea>
      <p class="hint" data-role="err" style="color:var(--red)"></p>
      <div class="modal-actions"><button class="btn soft" data-act="cancel">Vazgeç</button><button class="btn primary" data-act="save">Kaydet</button></div>`);

    const q = (s) => card.querySelector(s);
    const keys = () => Deneme.rowKeys(type, field(), brans);

    function drawRows() {
      card.querySelectorAll('[data-role="type"] button').forEach((b) => b.classList.toggle('active', b.dataset.type === type));
      q('[data-role="brans-row"]').classList.toggle('hidden', type !== 'BRANS');
      q('[data-role="rows"]').innerHTML = `<div class="net-head"><span>Ders</span><span>D</span><span>Y</span><span>Net</span></div>` + keys().map((k) => {
        const s = e.scores[k] || {};
        return `<div class="net-row" data-k="${k}"><span>${U.esc(YKS.SUBJECTS[k].short)} <small class="muted">${YKS.SUBJECTS[k].total}</small></span>
          <input type="number" inputmode="numeric" min="0" max="${YKS.SUBJECTS[k].total}" data-v="d" value="${s.d ?? ''}" aria-label="${U.esc(YKS.SUBJECTS[k].short)} doğru">
          <input type="number" inputmode="numeric" min="0" max="${YKS.SUBJECTS[k].total}" data-v="y" value="${s.y ?? ''}" aria-label="${U.esc(YKS.SUBJECTS[k].short)} yanlış">
          <span class="net-out">—</span></div>`;
      }).join('');
      drawPicks();
      recalc();
    }
    function drawPicks() {
      const f = (q('[data-f="filter"]').value || '').toLocaleLowerCase('tr-TR');
      q('[data-role="picks"]').innerHTML = keys().map((k) => {
        const topics = YKS.SUBJECTS[k].topics.filter((t) => !f || t.name.toLocaleLowerCase('tr-TR').includes(f));
        if (!topics.length) return '';
        const n = YKS.SUBJECTS[k].topics.filter((t) => picked.has(t.id)).length;
        return `<details class="pick-group" ${f || n ? 'open' : ''}><summary>${U.esc(YKS.SUBJECTS[k].short)}${n ? ` · ${n} seçili` : ''}</summary>
          <div class="chips">${topics.map((t) => `<button type="button" class="topic-pick ${picked.has(t.id) ? 'on' : ''}" data-id="${t.id}">${U.esc(t.name)}</button>`).join('')}</div></details>`;
      }).join('');
    }
    function readRow(row) {
      const max = YKS.SUBJECTS[row.dataset.k].total;
      const d = row.querySelector('[data-v="d"]').value, y = row.querySelector('[data-v="y"]').value;
      return { d: d === '' ? null : Math.max(0, Math.floor(+d)), y: y === '' ? null : Math.max(0, Math.floor(+y)), max };
    }
    function recalc() {
      let t = 0, any = false, bad = false;
      card.querySelectorAll('.net-row').forEach((row) => {
        const v = readRow(row);
        const filled = v.d != null || v.y != null;
        const over = (v.d || 0) + (v.y || 0) > v.max;
        row.classList.toggle('bad', over);
        bad = bad || over;
        const n = Deneme.net(v.d, v.y);
        row.querySelector('.net-out').textContent = filled ? Deneme.fmt(n) : '—';
        if (filled) { t += n; any = true; }
      });
      q('[data-role="total"]').innerHTML = any ? `Toplam: <b>${Deneme.fmt(t)} net</b>` : '';
      q('[data-role="err"]').textContent = bad ? 'Doğru + yanlış, dersin soru sayısını geçemez.' : '';
      return { any, bad };
    }

    card.addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.dataset.type) {
        // tür değişirken girilen değerleri koru
        card.querySelectorAll('.net-row').forEach((row) => { const v = readRow(row); if (v.d != null || v.y != null) e.scores[row.dataset.k] = { d: v.d || 0, y: v.y || 0 }; });
        type = b.dataset.type;
        drawRows();
      } else if (b.classList.contains('topic-pick')) {
        picked.has(b.dataset.id) ? picked.delete(b.dataset.id) : picked.add(b.dataset.id);
        b.classList.toggle('on');
        const grp = b.closest('.pick-group');
        if (grp) {
          const k = b.dataset.id.split(':')[0];
          const n = YKS.SUBJECTS[k].topics.filter((t) => picked.has(t.id)).length;
          grp.querySelector('summary').textContent = YKS.SUBJECTS[k].short + (n ? ` · ${n} seçili` : '');
        }
      } else if (b.dataset.act === 'cancel') App.closeModal();
      else if (b.dataset.act === 'save') save();
    });
    card.addEventListener('input', (ev) => {
      if (ev.target.dataset.v) recalc();
      else if (ev.target.dataset.f === 'filter') drawPicks();
    });
    card.addEventListener('change', (ev) => {
      if (ev.target.dataset.f === 'brans') { brans = ev.target.value; drawRows(); }
    });

    function save() {
      const st = recalc();
      if (st.bad) return;
      if (!st.any) { q('[data-role="err"]').textContent = 'En az bir dersin doğru/yanlış sayısını gir.'; return; }
      const scores = {};
      card.querySelectorAll('.net-row').forEach((row) => {
        const v = readRow(row);
        if (v.d != null || v.y != null) scores[row.dataset.k] = { d: v.d || 0, y: v.y || 0 };
      });
      const valid = new Set(keys().flatMap((k) => YKS.SUBJECTS[k].topics.map((t) => t.id)));
      const rec = {
        id: existing ? existing.id : U.uid(),
        date: q('[data-f="date"]').value || U.dateKey(new Date()),
        type,
        brans: type === 'BRANS' ? brans : undefined,
        name: q('[data-f="name"]').value.trim().slice(0, 40),
        scores,
        eksik: [...picked].filter((id) => valid.has(id)),
        note: q('[data-f="note"]').value.trim().slice(0, 300),
        created: existing ? existing.created : Date.now(),
      };
      const arr = D().denemeler;
      const i = arr.findIndex((x) => x.id === rec.id);
      if (i >= 0) arr[i] = rec; else arr.push(rec);
      App.save();
      App.closeModal();
      const p = Deneme.previous(rec);
      if (!existing && p && Deneme.total(rec) > Deneme.total(p)) { App.say('denemeUp'); App.celebrate(); }
      else if (!existing) App.say('denemeAny');
      App.refresh();
      render();
    }

    drawRows();
  }

  function bind() {
    const root = $('#deneme-root');
    root.addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.dataset.act === 'add') return openForm(null);
      if (b.dataset.act === 'ai' && window.Asistan) return Asistan.askDeneme();
      if (b.dataset.type && b.closest('[data-role="table-seg"]')) { tableType = b.dataset.type; render(); return; }
      const li = b.closest('.deneme-item');
      if (li) {
        const e = D().denemeler.find((x) => x.id === li.dataset.id);
        if (!e) return;
        if (b.dataset.act === 'edit') openForm(e);
        if (b.dataset.act === 'del' && confirm('Bu deneme silinsin mi?')) {
          D().denemeler = D().denemeler.filter((x) => x.id !== e.id);
          App.save(); App.refresh(); render();
        }
        return;
      }
      const w = b.closest('.weak-item');
      if (w) {
        const t = YKS.topic(w.dataset.topic);
        if (!t) return;
        if (b.dataset.act === 'study') App.startStudy({ subjectId: App.subjectFor(t.subjectKey), intent: `Eksik: ${t.name}` });
        if (b.dataset.act === 'review') {
          if (!D().review.some((r) => !r.done && r.text === t.name)) {
            D().review.unshift({ id: U.uid(), text: t.name, subjectId: App.subjectFor(t.subjectKey), created: Date.now(), done: false });
            App.save();
          }
          App.toast('📌', 'Tekrar listesine eklendi', t.name);
        }
      }
    });
  }

  return {
    init(app) { App = app; bind(); },
    render,
  };
})();

// app.js varlık kontrolü için (üst düzey const window'a eklenmez)
if (typeof window !== 'undefined') { window.Deneme = Deneme; window.DenemeUI = DenemeUI; }
