/* Zamanlayıcı: zaman damgalarıyla çalışır, sayfa yenilense/kapansa bile doğru sayar. */

const Timer = (() => {
  let h = {};
  const EXAM_MINUTES = Object.freeze({ tyt: 165, ayt: 180 });

  const st = () => Store.data.timer || (Store.data.timer = fresh()); // sıfırlama/içe aktarma sonrası boş kalmasın
  const S = () => Store.data.settings;

  function fresh(kind = 'countdown', keep = {}) {
    return {
      kind,                 // countdown | free (pomodoro: eski kayıtlar)
      exam: kind === 'countdown' && Object.hasOwn(EXAM_MINUTES, keep.exam) ? keep.exam : null,
      targetSeconds: null,
      continuousStart: null,
      continuousBest: 0,
      phase: 'focus',       // focus | short | long
      running: false,
      accum: 0,             // önceki çalışma parçalarının ms toplamı
      resumedAt: null,
      firstStart: null,
      cycle: keep.cycle || 0,
      subjectId: keep.subjectId != null ? keep.subjectId : '', // '' = Genel, bilerek seçilebilir
      intent: keep.intent || '',  // "bu oturumda ne yapacağım?"
      planId: keep.planId || '',  // Bugün kartında seçilen plan maddesi: süre ona yazılır (seçim oturumlar arasında kalır)
      segs: [],             // oturum sürerken başka maddeye geçildiyse biten parçalar {planId, subjectId, start, end, sec}
      segAt: 0,             // şimdiki parçanın başladığı an (çalışılan saniye cinsinden)
      segStart: null,       // şimdiki parçanın başladığı saat (duraklatılmışken geçildiyse devam edince yazılır)
    };
  }

  function duration(phase = st().phase) {
    const s = S();
    if (phase === 'focus' && st().targetSeconds) return st().targetSeconds;
    if (phase === 'focus' && st().exam) return EXAM_MINUTES[st().exam] * 60;
    if (phase === 'focus' && Number.isInteger(s.countdownSeconds) && s.countdownSeconds >= 1 && s.countdownSeconds <= 86399) return s.countdownSeconds;
    return (phase === 'focus' ? s.focus : phase === 'short' ? s.short : s.long) * 60;
  }
  function elapsed() {
    const x = st();
    return (x.accum + (x.running ? Date.now() - x.resumedAt : 0)) / 1000;
  }
  const countdown = () => st().kind === 'countdown' || st().kind === 'pomodoro' || st().phase !== 'focus';
  const remaining = () => duration() - elapsed();

  function persist() { Store.save(); }
  function continuous(at = Date.now()) {
    const x = st();
    return Math.max(x.continuousBest || 0, x.running && x.phase === 'focus' && x.continuousStart != null ? Math.max(0, (at - x.continuousStart) / 1000) : 0);
  }
  function rememberContinuous(at = Date.now()) {
    const x = st(); x.continuousBest = continuous(at);
    const stats = Store.data.stats || (Store.data.stats = {});
    stats.longestContinuousSeconds = Math.max(stats.longestContinuousSeconds || 0, x.continuousBest);
  }

  function startPhase(at = Date.now()) {
    const x = st();
    x.running = true;
    x.continuousStart = at;
    if (x.phase === 'focus' && !x.targetSeconds) x.targetSeconds = Math.max(1, Math.min(86399, Number(duration()) || 1500));
    x.resumedAt = at;
    x.pausedAt = null;
    if (!x.firstStart) x.firstStart = at;
    if (x.phase === 'focus' && x.segAt > 0 && x.segStart == null) x.segStart = at;
    persist();
  }

  function finishFocus(sec, endTime, endReason = 'manual') {
    const x = st();
    rememberContinuous(endTime);
    const make = (p, s, start, end, reason) => ({
      start,
      end,
      minutes: s < 60 ? s / 60 : Math.round(s / 60),
      seconds: s,
      subjectId: p.subjectId,
      intent: x.intent || '',
      ...(p.planId ? { planId: p.planId } : {}),
      kind: x.kind,
      exam: x.exam || null,
      endReason: reason,
      continuousSeconds: Math.min(s, continuous(endTime)),
    });
    // oturum sürerken başka maddeye geçildiyse her madde kendi oturumu olarak kaydedilir (sayaç hiç sıfırlanmadan)
    const parts = (Array.isArray(x.segs) ? x.segs : []).filter((p) => p && p.sec >= 1)
      .map((p) => make(p, p.sec, p.start, p.end, 'part'));
    const lastSec = sec - (parts.length ? x.segAt || 0 : 0);
    let session = make(x, lastSec, parts.length ? x.segStart || endTime - lastSec * 1000 : x.firstStart || endTime - sec * 1000, endTime, endReason);
    if (parts.length && lastSec < 60) { session = { ...parts.pop(), endReason }; } // son maddeye bir dakika bile kalmadıysa önceki parça son oturumdur
    const keep = { cycle: x.cycle + 1, subjectId: x.subjectId, exam: x.exam, planId: x.planId };
    const kind = x.kind;
    Store.data.timer = fresh(kind, keep);
    if (kind === 'pomodoro') {
      const nx = st();
      nx.phase = nx.cycle % S().longEvery === 0 ? 'long' : 'short';
      if (S().autoBreak) startPhase(endTime);
    }
    persist();
    for (const p of parts) h.onFocusPart && h.onFocusPart(p);
    h.onFocusDone && h.onFocusDone(session);
    if (kind === 'pomodoro' && st().phase !== 'focus') h.onBreakStart && h.onBreakStart(st().running);
  }

  const dayOf = (t) => new Date(t).toDateString(); // yerel takvim günü
  // Dün (ya da daha önce) duraklatılmış oturuma bugün devam edilirse: çalışılan kısım duraklatıldığı güne kaydedilir,
  // devamı bugün aynı ders ve hedefle, kalan süreyle yeni oturum olarak başlar (bugünün dakikaları bugüne yazılır).
  function splitAtPause() {
    const x = st(), left = countdown() ? Math.max(1, Math.round(duration() - x.accum / 1000)) : null;
    const carry = { intent: x.intent, exam: x.exam };
    finishFocus(x.accum / 1000, x.pausedAt, 'split');
    const nx = st();
    nx.intent = carry.intent;
    if (left) { nx.targetSeconds = Math.min(86399, left); nx.exam = carry.exam; }
  }

  function finishBreak(endTime) {
    const x = st();
    Store.data.timer = fresh(x.kind, { cycle: x.phase === 'long' ? 0 : x.cycle, subjectId: x.subjectId });
    // uygulama kapalıyken/arka plandayken odak kendiliğinden başlamasın: yoksa geri dönünce
    // hiç çalışılmamış oturumlar art arda kaydedilir. Sayaç yeni odakta bekler.
    const away = typeof document !== 'undefined' && document.hidden;
    if (S().autoFocus && !away && Date.now() - endTime < 60000) startPhase(endTime);
    persist();
    h.onBreakDone && h.onBreakDone(st().running);
  }

  function tick() {
    const x = st();
    if (x.running && countdown() && remaining() <= 0) {
      // tam odak: bitirmeden önce uygulama dışında geçen süre kontrol edilsin (sayaç duraklatılabilir)
      if (x.phase === 'focus' && h.beforeFinish && h.beforeFinish()) { h.onTick && h.onTick(api.state()); return; }
      const endTime = x.resumedAt + (duration() * 1000 - x.accum);
      if (x.phase === 'focus') finishFocus(duration(), endTime, 'elapsed');
      else finishBreak(endTime);
    }
    h.onTick && h.onTick(api.state());
  }

  const api = {
    init(handlers) {
      h = handlers;
      if (!st() || !st().phase) Store.data.timer = fresh();
      if (!Object.hasOwn(EXAM_MINUTES, st().exam) || st().kind !== 'countdown') st().exam = null;
      if (st().kind === 'pomodoro') {
        if (st().phase === 'focus') st().kind = 'countdown';
        else Store.data.timer = fresh('countdown', {subjectId:st().subjectId});
      }
      // Historical sessions have no interruption record; begin measuring now.
      if (st().running && st().continuousStart == null) st().continuousStart = Date.now();
      persist();
      setInterval(tick, 250);
      tick();
    },
    state() {
      const x = st();
      const total = countdown() ? duration() : 0;
      return {
        ...x,
        elapsed: elapsed(),
        continuousSeconds: continuous(),
        remaining: countdown() ? Math.max(0, remaining()) : null,
        total,
        progress: total ? U.clamp(elapsed() / total, 0, 1) : (elapsed() % 3600) / 3600,
        countdown: countdown(),
        fresh: x.accum === 0 && !x.running,
      };
    },
    toggle() {
      const x = st();
      if (x.running && countdown() && remaining() <= 0) { tick(); return; }
      if (x.running) {
        rememberContinuous();
        x.continuousStart = null;
        x.accum += Date.now() - x.resumedAt;
        x.running = false;
        x.resumedAt = null;
        x.pausedAt = Date.now();
        persist();
        h.onPause && h.onPause();
      } else {
        if (x.phase === 'focus' && x.pausedAt && x.accum >= 60000 && dayOf(x.pausedAt) !== dayOf(Date.now())) splitAtPause();
        const resumed = st().accum > 0;
        startPhase();
        h.onStart && h.onStart(st().phase, resumed);
      }
      tick();
    },
    // geçmiş bir anda duraklat (tam odakta uygulamadan çıkılan an); süre o ana kadar dolmuşsa dokunmaz
    pauseAt(t) {
      const x = st();
      if (!x.running) return false;
      t = Math.min(t, Date.now());
      const run = Math.max(0, t - x.resumedAt);
      if (countdown() && duration() * 1000 - (x.accum + run) <= 0) return false;
      rememberContinuous(t);
      x.previousContinuousStart = x.continuousStart;
      x.continuousStart = null;
      x.accum += run;
      x.running = false;
      x.resumedAt = null;
      x.pausedAt = t;
      persist();
      h.onPause && h.onPause();
      tick();
      return true;
    },
    // izinli bir uygulamadaydı: tam odağın duraklatması geri alınır, aradaki süre çalışmaya sayılır
    // (süre o arada dolduysa oturum dolduğu anda kaydedilir)
    resumeFrom(t) {
      const x = st();
      if (x.running || x.phase !== 'focus' || !x.pausedAt || !(x.accum > 0)) return false;
      x.running = true;
      x.resumedAt = Math.min(t, Date.now());
      x.continuousStart = x.previousContinuousStart ?? x.resumedAt;
      x.pausedAt = null;
      persist();
      tick();
      return true;
    },
    // "Bitir": odakta oturumu kaydeder; molada molayı bitirir
    finish() {
      const x = st();
      if (x.running && countdown() && remaining() <= 0) { tick(); return; }
      if (x.phase === 'focus') {
        const sec = elapsed();
        if (sec < 60) { h.onTooShort && h.onTooShort(); api.reset(); return; }
        // duraklatılmış oturum duraklatıldığı anda biter (bekleme süresi oturuma eklenmez)
        finishFocus(sec, x.running ? Date.now() : (x.pausedAt || Date.now()));
      } else {
        finishBreak(Date.now());
      }
      tick();
    },
    reset() {
      rememberContinuous();
      const x = st();
      Store.data.timer = fresh(x.kind, { cycle: x.cycle, subjectId: x.subjectId, exam: x.exam, planId: x.planId }); // hedef taşınmaz: yoksa sonraki alakasız oturum eski plan maddesini işaretler; seçili madde kalır
      persist();
      h.onReset && h.onReset();
      tick();
    },
    setKind(kind, exam = null) {
      if (!['countdown','free'].includes(kind)) return;
      if (exam != null && (kind !== 'countdown' || !Object.hasOwn(EXAM_MINUTES, exam))) return;
      rememberContinuous();
      const x = st();
      Store.data.timer = fresh(kind, { subjectId: x.subjectId, exam, planId: x.planId });
      persist();
      tick();
    },
    setCountdownMinutes(value) {
      const minutes = Number(value);
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 900 || !api.state().fresh) return false;
      S().countdownSeconds = null; S().focus = minutes; st().targetSeconds = null; st().exam = null; persist(); tick(); return true;
    },
    setCountdownTime(hours, minutes, seconds) {
      const parts = [hours, minutes, seconds].map(v => v === '' ? 0 : Number(v));
      if (!parts.every(Number.isInteger) || parts[0] < 0 || parts[0] > 23 || parts[1] < 0 || parts[1] > 59 || parts[2] < 0 || parts[2] > 59 || !api.state().fresh || st().kind !== 'countdown' || st().exam) return false;
      const total = parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (total < 1) return false;
      S().countdownSeconds = total; st().targetSeconds = null;
      persist(); tick(); return true;
    },
    setSubject(id) { st().subjectId = id; persist(); },
    setIntent(text) { st().intent = String(text || '').slice(0, 80); persist(); },
    // Bugün kartında maddeye dokununca: sayaç o maddeye (ve dersine) sayar. Oturum sürerken başka maddeye geçilirse
    // o ana kadarki süre önceki maddeye yazılır, sayaç sıfırlanmadan devam eder (bir dakikadan kısa parça ayrılmaz).
    setPlan(id, subjectId) {
      const x = st();
      id = typeof id === 'string' ? id.slice(0, 40) : '';
      const sid = typeof subjectId === 'string' ? subjectId : x.subjectId;
      if (id === (x.planId || '') && sid === x.subjectId) return;
      if (x.phase === 'focus' && (x.running || x.accum > 0)) {
        const now = Date.now(), e = elapsed(), from = x.segAt || 0;
        if (e - from >= 60) {
          if (!Array.isArray(x.segs)) x.segs = [];
          x.segs.push({ planId: x.planId || '', subjectId: x.subjectId, start: x.segStart || x.firstStart || now, end: x.running ? now : x.pausedAt || now, sec: e - from });
          x.segAt = e;
          x.segStart = x.running ? now : null;
        }
      }
      x.planId = id; x.subjectId = sid;
      persist();
    },
    duration,
  };
  return api;
})();

