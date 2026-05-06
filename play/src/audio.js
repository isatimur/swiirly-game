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
};

export function setMuted(m) { muted = m; }
export function toggleMuted() { muted = !muted; return muted; }
export function isMuted() { return muted; }
