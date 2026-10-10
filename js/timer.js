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
    persist();
  }

  function finishFocus(sec, endTime, endReason = 'manual') {
    const x = st();
    rememberContinuous(endTime);
    const session = {
      start: x.firstStart || endTime - sec * 1000,
      end: endTime,
      minutes: sec < 60 ? sec / 60 : Math.round(sec / 60),
      seconds: sec,
      subjectId: x.subjectId,
      intent: x.intent || '',
      kind: x.kind,
      exam: x.exam || null,
      endReason,
      continuousSeconds: Math.min(sec, continuous(endTime)),
    };
    const keep = { cycle: x.cycle + 1, subjectId: x.subjectId, exam: x.exam };
    const kind = x.kind;
    Store.data.timer = fresh(kind, keep);
    if (kind === 'pomodoro') {
      const nx = st();
      nx.phase = nx.cycle % S().longEvery === 0 ? 'long' : 'short';
      if (S().autoBreak) startPhase(endTime);
    }
    persist();
    h.onFocusDone && h.onFocusDone(session);
    if (kind === 'pomodoro' && st().phase !== 'focus') h.onBreakStart && h.onBreakStart(st().running);
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
        const resumed = x.accum > 0;
        startPhase();
        h.onStart && h.onStart(x.phase, resumed);
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
      Store.data.timer = fresh(x.kind, { cycle: x.cycle, subjectId: x.subjectId, intent: x.intent, exam: x.exam });
      persist();
      h.onReset && h.onReset();
      tick();
    },
    setKind(kind, exam = null) {
      if (!['countdown','free'].includes(kind)) return;
      if (exam != null && (kind !== 'countdown' || !Object.hasOwn(EXAM_MINUTES, exam))) return;
      rememberContinuous();
      const x = st();
      Store.data.timer = fresh(kind, { subjectId: x.subjectId, intent: x.intent, exam });
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
    duration,
  };
  return api;
})();

