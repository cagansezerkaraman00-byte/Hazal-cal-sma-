/* Zamanlayıcı: zaman damgalarıyla çalışır, sayfa yenilense/kapansa bile doğru sayar. */

const Timer = (() => {
  let h = {};

  const st = () => Store.data.timer || (Store.data.timer = fresh()); // sıfırlama/içe aktarma sonrası boş kalmasın
  const S = () => Store.data.settings;

  function fresh(kind = 'pomodoro', keep = {}) {
    return {
      kind,                 // pomodoro | free
      phase: 'focus',       // focus | short | long
      running: false,
      accum: 0,             // önceki çalışma parçalarının ms toplamı
      resumedAt: null,
      firstStart: null,
      cycle: keep.cycle || 0,
      subjectId: keep.subjectId != null ? keep.subjectId : ((Store.data.subjects[0] && Store.data.subjects[0].id) || ''), // '' = Genel, bilerek seçilebilir
      intent: keep.intent || '',  // "bu oturumda ne yapacağım?"
    };
  }

  function duration(phase = st().phase) {
    const s = S();
    return (phase === 'focus' ? s.focus : phase === 'short' ? s.short : s.long) * 60;
  }
  function elapsed() {
    const x = st();
    return (x.accum + (x.running ? Date.now() - x.resumedAt : 0)) / 1000;
  }
  const countdown = () => st().kind === 'pomodoro' || st().phase !== 'focus';
  const remaining = () => duration() - elapsed();

  function persist() { Store.save(); }

  function startPhase(at = Date.now()) {
    const x = st();
    x.running = true;
    x.resumedAt = at;
    x.pausedAt = null;
    if (!x.firstStart) x.firstStart = at;
    persist();
  }

  function finishFocus(sec, endTime) {
    const x = st();
    const session = {
      start: x.firstStart || endTime - sec * 1000,
      end: endTime,
      minutes: Math.max(1, Math.round(sec / 60)),
      subjectId: x.subjectId,
      intent: x.intent || '',
      kind: x.kind,
    };
    const keep = { cycle: x.cycle + 1, subjectId: x.subjectId };
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
      if (x.phase === 'focus') finishFocus(duration(), endTime);
      else finishBreak(endTime);
    }
    h.onTick && h.onTick(api.state());
  }

  const api = {
    init(handlers) {
      h = handlers;
      if (!st() || !st().phase) Store.data.timer = fresh();
      setInterval(tick, 250);
      tick();
    },
    state() {
      const x = st();
      const total = countdown() ? duration() : 0;
      return {
        ...x,
        elapsed: elapsed(),
        remaining: countdown() ? Math.max(0, remaining()) : null,
        total,
        progress: total ? U.clamp(elapsed() / total, 0, 1) : (elapsed() % 3600) / 3600,
        countdown: countdown(),
        fresh: x.accum === 0 && !x.running,
      };
    },
    toggle() {
      const x = st();
      if (x.running) {
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
      x.pausedAt = null;
      persist();
      tick();
      return true;
    },
    // "Bitir": odakta oturumu kaydeder; molada molayı bitirir
    finish() {
      const x = st();
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
      const x = st();
      Store.data.timer = fresh(x.kind, { cycle: x.cycle, subjectId: x.subjectId, intent: x.intent });
      persist();
      h.onReset && h.onReset();
      tick();
    },
    setKind(kind) {
      const x = st();
      Store.data.timer = fresh(kind, { subjectId: x.subjectId, intent: x.intent });
      persist();
      tick();
    },
    setSubject(id) { st().subjectId = id; persist(); },
    setIntent(text) { st().intent = String(text || '').slice(0, 80); persist(); },
    duration,
  };
  return api;
})();

