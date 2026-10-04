/* Web Audio ile üretilen sesler: zil, miyav-blip ve odak ortam sesleri (dosya gerektirmez). */

const Sound = (() => {
  let ctx = null;
  const ambient = {};

  function ac() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
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
    chime() {
      if (!Store.data.settings.sound) return;
      [659.25, 783.99, 987.77, 1318.5].forEach((f, i) => tone(f, i * 0.14, 0.9));
    },
    soft() {
      if (!Store.data.settings.sound) return;
      tone(880, 0, 0.25, 'sine', 0.08);
    },
    meow() {
      if (!Store.data.settings.sound) return;
      const c = ac(); if (!c) return;
      const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
      o.type = 'sawtooth'; f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 3;
      const t = c.currentTime;
      o.frequency.setValueAtTime(520, t);
      o.frequency.linearRampToValueAtTime(820, t + 0.12);
      o.frequency.linearRampToValueAtTime(480, t + 0.42);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      o.connect(f).connect(g).connect(c.destination);
      o.start(t); o.stop(t + 0.5);
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
