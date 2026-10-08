/* Gerçek kedi kayıtları; zil ve odak ortam sesleri Web Audio ile üretilir. */

const Sound = (() => {
  let ctx = null;
  const ambient = {};
  const alarmVoices = new Set();
  const recordings = new Map();
  let alarmEpoch = 0;
  const MEOWS = Object.freeze([
    { id: 'luna', label: 'Luna · tatlı miyav', file: 'assets/meows/cat-voice.mp3', offset: .9, duration: 1 },
    { id: 'vesper', label: 'Vesper · sakin miyav', file: 'assets/meows/cat-meow.mp3', offset: .9, duration: 1.2 },
    { id: 'guclu', label: 'Güçlü · yavru miyavı', file: 'assets/meows/kitten.mp3', offset: .05, duration: .85 },
    { id: 'merak', label: 'Meraklı · uzun miyav', file: 'assets/meows/cat-voice.mp3', offset: 2.35, duration: 1.4 },
    { id: 'uykucu', label: 'Minik patiler · çift miyav', file: 'assets/meows/kitten.mp3', offset: 1.35, duration: 2.45 },
  ].map(Object.freeze));
  const VIBRATIONS = Object.freeze([
    { id: 'double', label: 'Çift pati', pattern: [220, 160, 220] },
    { id: 'triple', label: 'Üç minik pati', pattern: [100, 110, 100, 110, 100] },
    { id: 'heartbeat', label: 'Kalp atışı', pattern: [100, 90, 250, 380, 100, 90, 250] },
    { id: 'wave', label: 'Dalga', pattern: [120, 130, 240, 130, 420] },
    { id: 'insistent', label: 'Beni fark et', pattern: [400, 200, 400, 200, 400] },
  ].map(v => Object.freeze({ ...v, pattern: Object.freeze(v.pattern) })));
  const vibrationSupported = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  function vibrate(pattern) {
    try { return vibrationSupported() && navigator.vibrate(pattern) === true; } catch (e) { return false; }
  }

  function ac() {
    try {
      if (!ctx || ctx.state === 'closed') {
        const C = window.AudioContext || window.webkitAudioContext;
        if (!C) return null;
        ctx = new C();
      }
      if (ctx.state === 'suspended') Promise.resolve(ctx.resume()).catch(() => {});
      return ctx;
    } catch (e) { return null; }
  }

  async function resumeAudio() {
    const c = ac(); if (!c) return false;
    try { if (c.state === 'suspended') await c.resume(); return c.state === 'running'; } catch (e) { return false; }
  }
  const selectedMeow = () => MEOWS.find(v => v.id === Store.data.settings.timerMeow) || MEOWS[0];
  async function recording(c, file) {
    if (recordings.has(file)) return recordings.get(file);
    const pending = (async () => {
      const version = typeof SURUMLER !== 'undefined' ? SURUMLER[0].surum : '';
      const response = await fetch(file + (version ? '?v=' + encodeURIComponent(version) : ''));
      if (!response.ok) throw new Error('Kedi kaydı yüklenemedi');
      const bytes = await response.arrayBuffer();
      // Safari'nin callback biçimi de desteklenir; kayıt özgün hızında çözülür.
      return new Promise((resolve, reject) => {
        const decoded = c.decodeAudioData(bytes, resolve, reject);
        if (decoded && decoded.catch) decoded.catch(reject);
      });
    })();
    recordings.set(file, pending);
    try { return await pending; } catch (e) { recordings.delete(file); throw e; }
  }
  async function unlock() {
    const ready = await resumeAudio();
    if (ready && Store.data.settings.sound) {
      // Sayaç başlarken kayıtları hazırla; bitiş anında ağ beklenmesin.
      await Promise.allSettled([...new Set(MEOWS.map(v => v.file))].map(file => recording(ctx, file)));
    }
    return ready;
  }
  function catRecording(c, buffer, voice, delay = 0, tracked = false) {
    let source, gain;
    const cleanup = () => { try { source?.disconnect(); gain?.disconnect(); } catch (e) {} alarmVoices.delete(record); };
    const record = { stop() { try { source?.stop(); } catch (e) {} cleanup(); } };
    try {
      const t = c.currentTime + delay, d = Math.min(voice.duration, buffer.duration - voice.offset);
      if (!(d > .05)) return false;
      source = c.createBufferSource(); source.buffer = buffer; source.playbackRate.value = 1;
      gain = c.createGain();
      // Kesim sınırlarında tık oluşmasın; perdesi ve konuşma hızı değiştirilmez.
      gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(.9, t + .01);
      gain.gain.setValueAtTime(.9, t + d - .015); gain.gain.linearRampToValueAtTime(0, t + d);
      source.connect(gain).connect(c.destination); source.onended = cleanup;
      if (tracked) alarmVoices.add(record);
      source.start(t, voice.offset, d);
      return true;
    } catch (e) { record.stop(); return false; }
  }
  function stopTimerAlarm() {
    alarmEpoch++;
    [...alarmVoices].forEach(v => v.stop());
    vibrate(0);
  }
  async function timerEnd() {
    stopTimerAlarm();
    const epoch = alarmEpoch;
    const settings = Store.data.settings;
    const voice = selectedMeow();
    const rhythm = VIBRATIONS.find(v => v.id === settings.timerVibration) || VIBRATIONS[0];
    const result = { sound: false, vibration: settings.timerVibrate !== false && vibrate([...rhythm.pattern]), vibrationSupported: vibrationSupported(), cancelled: false };
    if (settings.sound) {
      try {
        if (await resumeAudio()) {
          const c = ctx, buffer = await recording(c, voice.file);
          if (epoch !== alarmEpoch || !Store.data.settings.sound) return { ...result, cancelled: true };
          if (c.state === 'running') {
            const count = Math.max(1, Math.min(3, Math.floor(5.5 / (voice.duration + .45))));
            for (let i = 0; i < count; i++) result.sound = catRecording(c, buffer, voice, i * (voice.duration + .45), true) || result.sound;
          }
        }
      } catch (e) { /* Ses yüklenemese bile titreşim ve bitiş kaydı çalışmaya devam eder. */ }
    }
    result.cancelled = epoch !== alarmEpoch;
    return result;
  }

  function tone(freq, start, dur, type = 'triangle', vol = 0.18) {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, c.currentTime + start);
    g.gain.linearRampToValueAtTime(vol, c.currentTime + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
    o.connect(g).connect(c.destination);
    o.start(c.currentTime + start);
    o.stop(c.currentTime + start + dur + 0.05);
  }

  function noiseBuffer(kind) {
    const c = ac();
    const len = c.sampleRate * 4;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0, b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'brown') {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      } else if (kind === 'pink') {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      } else d[i] = w * 0.5;
    }
    return buf;
  }

  const RECIPES = {
    yagmur: (c, out) => {
      const src = c.createBufferSource(); src.buffer = noiseBuffer('pink'); src.loop = true;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 400;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
      src.connect(hp).connect(lp).connect(out); src.start();
      return [src];
    },
    dalga: (c, out) => {
      const src = c.createBufferSource(); src.buffer = noiseBuffer('brown'); src.loop = true;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      const g = c.createGain(); g.gain.value = 0.5;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.09;
      const lg = c.createGain(); lg.gain.value = 0.45;
      lfo.connect(lg).connect(g.gain);
      src.connect(lp).connect(g).connect(out); src.start(); lfo.start();
      return [src, lfo];
    },
    kahverengi: (c, out) => {
      const src = c.createBufferSource(); src.buffer = noiseBuffer('brown'); src.loop = true;
      src.connect(out); src.start();
      return [src];
    },
    beyaz: (c, out) => {
      const src = c.createBufferSource(); src.buffer = noiseBuffer('white'); src.loop = true;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5000;
      src.connect(lp).connect(out); src.start();
      return [src];
    },
    somine: (c, out) => {
      const src = c.createBufferSource(); src.buffer = noiseBuffer('brown'); src.loop = true;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
      const g = c.createGain(); g.gain.value = 0.6;
      src.connect(lp).connect(g).connect(out); src.start();
      // çıtırtılar
      const crackle = c.createBufferSource();
      const len = c.sampleRate * 3, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) if (Math.random() < 0.0004) { const n = 60 + Math.random() * 300; for (let j = 0; j < n && i + j < len; j++) d[i + j] = (Math.random() * 2 - 1) * Math.exp(-j / (n / 5)) * 0.9; }
      crackle.buffer = buf; crackle.loop = true;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500;
      crackle.connect(hp).connect(out); crackle.start();
      return [src, crackle];
    },
    // Kütüphane: alçak oda uğultusu + arada sayfa çevirme sesleri (zamanlayıcı yok, döngülü tampon)
    kutuphane: (c, out) => {
      const room = c.createBufferSource(); room.buffer = noiseBuffer('brown'); room.loop = true;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 350;
      const g = c.createGain(); g.gain.value = 0.35;
      room.connect(lp).connect(g).connect(out); room.start();
      const len = c.sampleRate * 14, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (const at of [1.2, 5.8, 9.1, 12.4]) {
        const i0 = Math.floor(at * c.sampleRate), n = Math.floor(0.22 * c.sampleRate);
        for (let j = 0; j < n && i0 + j < len; j++) {
          const env = Math.sin((Math.PI * j) / n) * (0.6 + 0.4 * Math.sin(j / 900));
          d[i0 + j] = (Math.random() * 2 - 1) * env * 0.5;
        }
      }
      const pages = c.createBufferSource(); pages.buffer = buf; pages.loop = true;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 0.7;
      pages.connect(bp).connect(out); pages.start();
      return [room, pages];
    },
  };

  return {
    meows: MEOWS,
    vibrations: VIBRATIONS.map(({ id, label }) => Object.freeze({ id, label })),
    unlock, timerEnd, stopTimerAlarm, vibrationSupported,
    chime() {
      if (!Store.data.settings.sound) return;
      [659.25, 783.99, 987.77, 1318.5].forEach((f, i) => tone(f, i * 0.14, 0.9));
    },
    soft() {
      if (!Store.data.settings.sound) return;
      tone(880, 0, 0.25, 'sine', 0.08);
    },
    async meow() {
      if (!Store.data.settings.sound) return;
      try {
        if (!(await resumeAudio())) return;
        const c = ctx, voice = selectedMeow(), buffer = await recording(c, voice.file);
        if (Store.data.settings.sound && c.state === 'running') catRecording(c, buffer, voice);
      } catch (e) { /* Kayıt hatası besleme ve sahne etkileşimini durdurmasın. */ }
    },
    setAmbient(kind, vol) {
      const c = ac(); if (!c) return;
      let a = ambient[kind];
      if (!a && vol > 0) {
        const gain = c.createGain(); gain.gain.value = 0; gain.connect(c.destination);
        a = ambient[kind] = { gain, nodes: RECIPES[kind](c, gain) };
      }
      if (a) a.gain.gain.setTargetAtTime(vol * 0.6, c.currentTime, 0.25);
    },
    kinds: Object.keys(RECIPES),
  };
})();

