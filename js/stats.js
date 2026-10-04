/* İstatistikler ve Luna'nın raporu (kural tabanlı analiz). */

const Stats = (() => {
  const D = () => Store.data;

  function inRange(days) {
    if (!days) return D().sessions.slice();
    const from = U.addDays(U.dayStart(new Date()), -(days - 1)).getTime();
    return D().sessions.filter((s) => s.start >= from);
  }
  function between(from, to) {
    return D().sessions.filter((s) => s.start >= from && s.start < to);
  }
  const sum = (arr) => arr.reduce((a, s) => a + s.minutes, 0);

  function minutesOn(date) {
    const k = U.dateKey(date);
    return sum(D().sessions.filter((s) => U.dateKey(s.start) === k));
  }

  function byDay(days) {
    const out = [];
    const map = {};
    for (const s of D().sessions) { const k = U.dateKey(s.start); map[k] = (map[k] || 0) + s.minutes; }
    for (let i = days - 1; i >= 0; i--) {
      const d = U.addDays(U.dayStart(new Date()), -i);
      out.push({ date: d, key: U.dateKey(d), minutes: map[U.dateKey(d)] || 0 });
    }
    return out;
  }

  function streak() {
    const set = new Set(D().sessions.map((s) => U.dateKey(s.start)));
    let d = U.dayStart(new Date());
    if (!set.has(U.dateKey(d))) d = U.addDays(d, -1);
    let n = 0;
    while (set.has(U.dateKey(d))) { n++; d = U.addDays(d, -1); }
    return n;
  }
  function bestStreak() {
    const keys = [...new Set(D().sessions.map((s) => U.dateKey(s.start)))].sort();
    let best = 0, cur = 0, prev = null;
    for (const k of keys) {
      const d = new Date(k + 'T12:00:00');
      cur = prev && Math.round((d - prev) / 864e5) === 1 ? cur + 1 : 1;
      best = Math.max(best, cur);
      prev = d;
    }
    return best;
  }

  // Oturumları saat dilimlerine dağıt
  function byHour(list) {
    const mins = Array(24).fill(0), rw = Array(24).fill(0), rm = Array(24).fill(0), cnt = Array(24).fill(0);
    for (const s of list) {
      const start = s.start, end = Math.max(s.end || start + s.minutes * 60000, start + 60000);
      const real = (end - start) / 60000;
      const k = s.minutes / real; // manuel düzeltmeleri oranla
      const seen = new Set();
      let t = start;
      while (t < end) {
        const d = new Date(t);
        const hEnd = new Date(d); hEnd.setMinutes(60, 0, 0);
        const chunkEnd = Math.min(end, hEnd.getTime());
        const m = ((chunkEnd - t) / 60000) * k;
        const hr = d.getHours();
        mins[hr] += m;
        if (s.rating) { rw[hr] += s.rating * m; rm[hr] += m; }
        if (!seen.has(hr)) { cnt[hr]++; seen.add(hr); }
        t = chunkEnd;
      }
    }
    return mins.map((m, i) => ({ hour: i, minutes: m, rating: rm[i] ? rw[i] / rm[i] : null, count: cnt[i] }));
  }

  function bySubject(list) {
    const map = {};
    for (const s of list) {
      const id = s.subjectId || '';
      map[id] = map[id] || { id, minutes: 0, count: 0, rsum: 0, rcnt: 0 };
      map[id].minutes += s.minutes; map[id].count++;
      if (s.rating) { map[id].rsum += s.rating; map[id].rcnt++; }
    }
    return Object.values(map)
      .map((x) => ({ ...x, subject: Store.subject(x.id), rating: x.rcnt ? x.rsum / x.rcnt : null }))
      .sort((a, b) => b.minutes - a.minutes);
  }

  function byWeekday(list) {
    const arr = Array.from({ length: 7 }, (_, i) => ({ day: i, minutes: 0, rsum: 0, rcnt: 0, days: new Set() }));
    for (const s of list) {
      const d = new Date(s.start);
      const w = arr[d.getDay()];
      w.minutes += s.minutes; w.days.add(U.dateKey(d));
      if (s.rating) { w.rsum += s.rating; w.rcnt++; }
    }
    return arr.map((w) => ({ day: w.day, minutes: w.minutes, avg: w.days.size ? w.minutes / w.days.size : 0, rating: w.rcnt ? w.rsum / w.rcnt : null }));
  }

  function avgRating(list) {
    const r = list.filter((s) => s.rating);
    return r.length ? r.reduce((a, s) => a + s.rating, 0) / r.length : null;
  }

  function summary(days) {
    const list = inRange(days);
    const total = sum(list);
    const activeDays = new Set(list.map((s) => U.dateKey(s.start))).size;
    const spanDays = days || Math.max(1, activeDays);
    return {
      list,
      total,
      count: list.length,
      perDay: total / spanDays,
      activeDays,
      rating: avgRating(list),
      streak: streak(),
      bestStreak: bestStreak(),
    };
  }

  const hr = (h) => `${U.pad(h)}:00`;
  const star = (r) => `${r.toFixed(1)}⭐`;

  // ---------- Luna'nın raporu ----------
  function report(days) {
    const out = { highlights: [], strengths: [], improve: [], tips: [] };
    const list = inRange(days);
    const name = D().settings.name || 'canım';
    const goal = D().settings.dailyGoal;
    const span = days || 30;

    if (list.length === 0) {
      out.tips.push('Bu dönemde henüz kayıtlı oturum yok. İlk oturumu başlat, raporun burada belirsin 🐾');
      return out;
    }

    const total = sum(list);
    out.highlights.push({ icon: '⏱️', label: 'Toplam çalışma', value: U.fmtMin(total) });
    out.highlights.push({ icon: '📅', label: 'Günlük ortalama', value: U.fmtMin(total / (days || Math.max(1, new Set(list.map((s) => U.dateKey(s.start))).size))) });
    out.highlights.push({ icon: '🍅', label: 'Oturum', value: String(list.length) });
    const ar = avgRating(list);
    if (ar) out.highlights.push({ icon: '⭐', label: 'Ortalama verim', value: ar.toFixed(1) + ' / 5' });

    // Önceki dönemle kıyas
    if (days) {
      const curFrom = U.addDays(U.dayStart(new Date()), -(days - 1)).getTime();
      const prevFrom = U.addDays(new Date(curFrom), -days).getTime();
      const prev = sum(between(prevFrom, curFrom));
      if (prev > 0) {
        const ch = Math.round(((total - prev) / prev) * 100);
        if (ch >= 10) out.strengths.push(`Önceki ${days} güne göre %${ch} daha fazla çalıştın! Yükseliştesin 📈`);
        else if (ch <= -15) out.improve.push('Bu dönem biraz daha sakin geçti, bu da normal 💛 Günde bir kısa oturumla ritmi kolayca yeniden yakalarsın.');
        else out.highlights.push({ icon: '↔️', label: 'Önceki döneme göre', value: (ch >= 0 ? '+' : '') + ch + '%' });
      }
    }

    // Seri ve düzenlilik
    const sk = streak();
    if (sk >= 3) out.strengths.push(`${sk} gündür aralıksız çalışıyorsun, harika bir seri! 🔥`);
    const last7 = byDay(7);
    const active7 = last7.filter((d) => d.minutes > 0).length;
    if (active7 >= 5) out.strengths.push(`Son 7 günün ${active7}'inde çalıştın, çok düzenlisin.`);
    else if (active7 <= 2) out.improve.push('Her gün küçük bir oturum bile (25 dk) en güçlü alışkanlıktır. Yarın kısa bir tane deneyelim mi? 🐾');
    const goalDays = byDay(Math.min(span, 30)).filter((d) => d.minutes >= goal).length;
    if (goalDays) out.highlights.push({ icon: '🎯', label: 'Hedefe ulaşılan gün', value: String(goalDays) });

    // Saatlere göre verim
    const hours = byHour(list);
    const rated = hours.filter((h) => h.rating && h.minutes >= 20);
    if (rated.length >= 2) {
      let best = null, worst = null;
      for (const h of rated) {
        const nx = hours[(h.hour + 1) % 24];
        const r2 = nx.rating && nx.minutes >= 15 ? (h.rating * h.minutes + nx.rating * nx.minutes) / (h.minutes + nx.minutes) : h.rating;
        const span2 = nx.rating && nx.minutes >= 15 ? 2 : 1;
        const cand = { from: h.hour, to: (h.hour + span2) % 24, r: r2 };
        if (!best || cand.r > best.r) best = cand;
        if (!worst || cand.r < worst.r) worst = cand;
      }
      out.strengths.push(`En verimli saatlerin ${hr(best.from)}–${hr(best.to)} arası (${star(best.r)}). Zor konuları bu saatlere koy.`);
      if (worst && worst.r < best.r - 0.6 && worst.r <= 3.5) {
        out.improve.push(`${hr(worst.from)}–${hr(worst.to)} arası enerjin biraz daha düşük (${star(worst.r)}). Bu saatleri tekrar ve hafif soru çözümüne ayırırsan daha rahat geçer.`);
      }
    } else {
      out.tips.push('Oturum sonlarında verimini yıldızla puanlarsan, en verimli saatlerini bulabilirim ⭐');
    }
    const most = hours.reduce((a, b) => (b.minutes > a.minutes ? b : a));
    out.highlights.push({ icon: '🕰️', label: 'En çok çalışılan saat', value: hr(most.hour) });

    // Gece çalışması
    const lateList = list.filter((s) => { const h = new Date(s.start).getHours(); return h >= 0 && h < 5; });
    if (lateList.length >= 2) {
      const lr = avgRating(lateList);
      if (lr && ar && lr < ar - 0.3) out.improve.push(`Gece yarısından sonra verimin biraz düşüyor (${star(lr)}). Biraz erken uyursan sabah çok daha parlak olursun 🌙`);
      else out.tips.push('Gece geç saatlerde de çalışmışsın; öğrendiklerin uykuda pekişir, uykuna da iyi bak 💤');
    }

    // Oturum uzunluğu
    const buckets = [
      { label: '20 dk altı', test: (m) => m < 20 },
      { label: '20–40 dk', test: (m) => m >= 20 && m < 40 },
      { label: '40–60 dk', test: (m) => m >= 40 && m <= 60 },
      { label: '60 dk üstü', test: (m) => m > 60 },
    ].map((b) => { const l = list.filter((s) => s.rating && b.test(s.minutes)); return { ...b, n: l.length, r: avgRating(l) }; })
      .filter((b) => b.n >= 2);
    if (buckets.length >= 2) {
      const bb = buckets.reduce((a, b) => (b.r > a.r ? b : a));
      const wb = buckets.reduce((a, b) => (b.r < a.r ? b : a));
      out.tips.push(`En iyi odaklandığın oturum süresi: ${bb.label} (${star(bb.r)}).`);
      if (wb.label === '60 dk üstü' && wb.r < bb.r - 0.5) out.improve.push('Bir saati aşan oturumlarda araya kısa bir mola koyarsan odağın daha uzun süre taze kalır.');
    }
    const longNoBreak = list.filter((s) => s.minutes >= 90).length;
    if (longNoBreak >= 2) out.tips.push(`${longNoBreak} oturum 90 dakikayı geçmiş. Uzun oturumlarda her 45–50 dakikada bir 5 dakika mola beynini tazeler.`);

    // Dersler
    const subs = bySubject(list);
    if (subs.length) {
      const top = subs[0];
      const share = top.minutes / total;
      if (subs.length >= 2 && share > 0.55) out.improve.push(`${top.subject.name} dersine çok emek verdin (%${Math.round(share * 100)}) 👏 Diğer derslere de küçük bloklar eklersen denge harika olur.`);
      out.highlights.push({ icon: '📚', label: 'En çok çalışılan', value: top.subject.name });
      const ratedSubs = subs.filter((s) => s.rating && s.rcnt >= 2);
      if (ratedSubs.length >= 2) {
        const bs = ratedSubs.reduce((a, b) => (b.rating > a.rating ? b : a));
        const ws = ratedSubs.reduce((a, b) => (b.rating < a.rating ? b : a));
        if (bs.rating >= 3.8) out.strengths.push(`${bs.subject.name} oturumlarında çok verimlisin (${star(bs.rating)}).`);
        if (ws.id !== bs.id && ws.rating <= 3.2) out.improve.push(`${ws.subject.name} biraz daha zorlayıcı geliyor gibi (${star(ws.rating)}). Konuyu küçük parçalara bölmek ya da farklı bir kaynakla denemek çok iyi gelebilir.`);
      }
    }
    // Bir süredir bakılmayan dersler (en fazla 2 tane, nazikçe)
    const now = Date.now();
    const gaps = [];
    for (const sub of D().subjects) {
      let last = 0;
      for (const x of D().sessions) if (x.subjectId === sub.id && x.start > last) last = x.start;
      if (!last) continue;
      const gap = Math.floor((now - last) / 864e5);
      if (gap >= 4) gaps.push({ sub, gap });
    }
    gaps.sort((a, b) => b.gap - a.gap).slice(0, 2).forEach(({ sub, gap }) => {
      out.improve.push(`${sub.name} seni ${gap} gündür bekliyor 📖 Kısa bir tekrar, öğrendiklerini taze tutar.`);
    });

    // Haftanın günleri
    const wd = byWeekday(list).filter((w) => w.minutes > 0);
    if (wd.length >= 3) {
      const bw = wd.reduce((a, b) => (b.avg > a.avg ? b : a));
      out.tips.push(`En çok ${U.DAYS[bw.day]} günleri çalışıyorsun (ortalama ${U.fmtMin(bw.avg)}).`);
    }

    // Ruh hali
    const moods = list.filter((s) => s.mood);
    if (moods.length >= 3) {
      const tired = moods.filter((s) => s.mood === '😴' || s.mood === '😣').length;
      if (tired / moods.length > 0.4) out.improve.push('Son zamanlarda biraz yorgun hissediyorsun gibi 💛 Uyku, su ve molalar en iyi yardımcıların; kendine nazik ol.');
      else if (moods.filter((s) => s.mood === '🤩' || s.mood === '🙂').length / moods.length > 0.6) out.strengths.push('Oturumlarını çoğunlukla iyi hissederek bitiriyorsun, bu harika!');
    }

    // Tekrar listesi ve görevler
    const pend = D().review.filter((r) => !r.done);
    if (pend.length) out.improve.push(`Tekrar listende ${pend.length} konu var: ${pend.slice(0, 3).map((r) => r.text).join(', ')}${pend.length > 3 ? '…' : ''}. Her birini kapatmak bir adım daha 📌`);
    const overdue = D().tasks.filter((t) => !t.done && t.due && new Date(t.due + 'T23:59:59') < new Date());
    if (overdue.length) out.improve.push(`${overdue.length} görev seni bekliyor. Bugün en kolayından biriyle başlamaya ne dersin?`);

    if (!out.strengths.length) out.strengths.push(`Başlamış olman bile büyük adım ${name}. Her oturum seni ileri taşıyor ⭐`);
    if (!out.improve.length) out.improve.push('Şu an her şey yolunda görünüyor, böyle devam! 🌟');
    return out;
  }

  return { inRange, byDay, byHour, bySubject, byWeekday, summary, streak, bestStreak, minutesOn, report, avgRating };
})();
