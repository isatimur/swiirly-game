// Procedural sound effects via Web Audio API. No audio files required.
// Each function plays a short envelope-shaped tone or chord.
// Audio context is lazily created on first play to satisfy browser autoplay policies.

let ctx = null;
let masterGain = null;
let muted = false;

function ensureCtx() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  ctx = new Ctor();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.45;
  masterGain.connect(ctx.destination);
  return ctx;
}

function blip({ freq, type = "square", duration = 0.12, attack = 0.005, decay = null, gain = 0.3, slideTo = null }) {
  if (muted) return;
  const c = ensureCtx();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + duration);
  }
  const dec = decay ?? duration;
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + attack + dec);
  osc.connect(g).connect(masterGain);
  osc.start();
  osc.stop(c.currentTime + attack + dec + 0.02);
}

function chord(freqs, opts = {}) {
  freqs.forEach((f, i) => setTimeout(() => blip({ freq: f, ...opts }), i * 35));
}

function noiseBurst({ duration = 0.18, gain = 0.25, lpFreq = 1500 } = {}) {
  if (muted) return;
  const c = ensureCtx();
  const buf = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * (1 - t);
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = lpFreq;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(masterGain);
  src.start();
  src.stop(c.currentTime + duration + 0.05);
}

export const SFX = {
  jump:    () => blip({ freq: 520, slideTo: 880, type: "square", duration: 0.16, gain: 0.22 }),
  land:    () => noiseBurst({ duration: 0.08, gain: 0.18, lpFreq: 600 }),
  collect: () => chord([880, 1320, 1760], { type: "triangle", duration: 0.18, gain: 0.22 }),
  signal:  () => chord([660, 880, 1100, 1320], { type: "sine", duration: 0.22, gain: 0.24 }),
  stomp:   () => { blip({ freq: 220, slideTo: 80, type: "sawtooth", duration: 0.18, gain: 0.3 }); noiseBurst({ duration: 0.12, gain: 0.15 }); },
  hurt:    () => { blip({ freq: 320, slideTo: 90, type: "square", duration: 0.4, gain: 0.32 }); noiseBurst({ duration: 0.25, gain: 0.18, lpFreq: 800 }); },
  win:     () => chord([523, 659, 784, 1047], { type: "triangle", duration: 0.32, gain: 0.28 }),
  death:   () => chord([523, 415, 311, 196], { type: "sawtooth", duration: 0.32, gain: 0.3 }),
  bossHit: () => { blip({ freq: 180, slideTo: 60, type: "square", duration: 0.22, gain: 0.32 }); noiseBurst({ duration: 0.18, gain: 0.22 }); },

  // Combo-aware variants — pitch + texture escalate with consecutive collects/stomps.
  collectAt: (combo = 0) => {
    const semis = Math.min(combo, 12);
    const freq = 880 * Math.pow(1.0594, semis);
    blip({ freq, type: "triangle", duration: 0.15, gain: 0.22 });
    if (combo >= 3) blip({ freq: freq * 1.5, type: "sine", duration: 0.18, gain: 0.14, attack: 0.01 });
    if (combo >= 6) blip({ freq: freq * 2.0, type: "sine", duration: 0.22, gain: 0.10, attack: 0.01 });
  },

  stompAt: (combo = 0) => {
    const slide = Math.max(40, 80 - combo * 5);
    blip({ freq: 220, slideTo: slide, type: "sawtooth", duration: 0.18 + combo * 0.015, gain: 0.3 });
    noiseBurst({ duration: 0.06 + combo * 0.01, gain: 0.18, lpFreq: 800 + combo * 100 });
    if (combo >= 2) blip({ freq: 660 + combo * 60, type: "triangle", duration: 0.14, gain: 0.16, attack: 0.005 });
  },

  bossKill: () => {
    // Layered impact + shimmer + chord.
    blip({ freq: 90, slideTo: 40, type: "sawtooth", duration: 0.5, gain: 0.36 });
    setTimeout(() => blip({ freq: 660, type: "triangle", duration: 0.4, gain: 0.22 }), 80);
    setTimeout(() => noiseBurst({ duration: 0.3, gain: 0.25, lpFreq: 400 }), 180);
    setTimeout(() => chord([523, 659, 784, 1047], { type: "sine", duration: 0.4, gain: 0.2 }), 320);
  },

  levelStart: () => {
    [440, 660, 880].forEach((f, i) => setTimeout(() =>
      blip({ freq: f, type: "triangle", duration: 0.18, gain: 0.22 }), i * 130));
  },

  // ----- COMBAT -----
  attackSwipe: () => {
    blip({ freq: 980, slideTo: 1480, type: "square",   duration: 0.08, gain: 0.18 });
    noiseBurst({ duration: 0.05, gain: 0.10, lpFreq: 2400 });
  },
  attackBolt: () => {
    blip({ freq: 660, slideTo: 880, type: "triangle", duration: 0.10, gain: 0.18 });
    blip({ freq: 1320, type: "sine", duration: 0.10, gain: 0.10, attack: 0.005 });
  },
  attackHeavy: () => {
    blip({ freq: 200, slideTo: 520, type: "sawtooth", duration: 0.18, gain: 0.26 });
    blip({ freq: 880, type: "triangle", duration: 0.12, gain: 0.16, attack: 0.01 });
    noiseBurst({ duration: 0.10, gain: 0.16, lpFreq: 1600 });
  },
  attackPound: () => {
    // Wind-up — short rising sweep before the slam.
    blip({ freq: 220, slideTo: 580, type: "square", duration: 0.18, gain: 0.18 });
  },
  attackPoundLand: () => {
    // The impact.
    blip({ freq: 110, slideTo: 40, type: "sawtooth", duration: 0.32, gain: 0.34 });
    noiseBurst({ duration: 0.22, gain: 0.26, lpFreq: 500 });
    setTimeout(() => blip({ freq: 80, type: "sine", duration: 0.2, gain: 0.18 }), 60);
  },
  attackBash: () => {
    blip({ freq: 320, slideTo: 460, type: "square", duration: 0.16, gain: 0.22 });
    noiseBurst({ duration: 0.10, gain: 0.14, lpFreq: 1200 });
  },
  attackConfirm: () => {
    // Tight hit-confirm click + chime — fires on every successful attack overlap.
    blip({ freq: 1200, type: "square", duration: 0.05, gain: 0.14 });
    blip({ freq: 1760, type: "triangle", duration: 0.10, gain: 0.10, attack: 0.005 });
  },
  parry: () => {
    blip({ freq: 1760, slideTo: 2200, type: "triangle", duration: 0.14, gain: 0.22, attack: 0.005 });
    blip({ freq: 880,  type: "sine",   duration: 0.10, gain: 0.12, attack: 0.005 });
  },
};

// Direct access for advanced callers (kept stable as part of the public surface).
export { blip as _blip, noiseBurst as _noiseBurst, chord as _chord };

export function setMuted(m) { muted = m; }
export function toggleMuted() { muted = !muted; return muted; }
export function isMuted() { return muted; }
