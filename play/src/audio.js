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

export function setMuted(m) { muted = m; refreshFileMute(); }
export function toggleMuted() { muted = !muted; refreshFileMute(); return muted; }
export function isMuted() { return muted; }

// ============================================================================
// MUSIC — procedural chiptune background tracks. No audio files; everything is
// synthesized through `OscillatorNode` + a tiny step sequencer. Per-level
// themes plus a boss theme. Notes are encoded as semitones from A4
// (e.g. 0 = A4 / 440 Hz, 12 = A5 / 880 Hz, -12 = A3 / 220 Hz). `null` = rest.
// Each track is one bar of 16 steps (16th-notes at the given BPM); the bar
// loops indefinitely.
// ============================================================================

const MUSIC_MASTER = 0.18;       // sits under SFX (0.45) — Mario-style mix
const SCHED_INTERVAL_MS = 25;    // scheduler tick rate
const SCHED_LOOKAHEAD_S = 0.10;  // schedule notes up to 100 ms ahead
// Shuffle: how far the off-beat 16th notes are nudged late, as a fraction of a
// step. Downbeats (kick + walking bass land on even steps) stay locked, so the
// groove reads "measured but lively" — the Mario overworld bounce. Per-track
// `swing` overrides this. 0 = straight/robotic, ~0.25 = a relaxed shuffle.
const DEFAULT_SWING = 0.22;

let musicGain = null;
let musicLowpass = null;
let musicMuted = false;
let currentTrackId = null;
let currentTrack = null;
let nextStepTime = 0;
let stepIndex = 0;
let schedulerId = null;

// File-backed tracks (Suno exports) override the step-sequencer for these ids.
// Any track id WITHOUT a file here falls back to the synth above, so the game
// stays fully playable while only some tracks have real music.
const FILES = {
  menu:   "assets/audio/menu.mp3",
  level1: "assets/audio/level1.mp3",
  level2: "assets/audio/level2.mp3",
  level3: "assets/audio/level3.mp3",
  level4: "assets/audio/level4.mp3",
  // No dedicated tracks yet for these — reuse mood-matched files so the whole
  // game stays on real music (no synth pop-in). Swap to dedicated exports later.
  level5: "assets/audio/level3.mp3",  // tense, pre-summit
  boss:   "assets/audio/level4.mp3",  // edgy / menacing
  level6: "assets/audio/level1.mp3",  // bright finale callback
};
const MUSIC_FILE_LEVEL = 1.0;  // file loudness vs the music bus (tunable by ear)
const fileBuffers = {};        // trackId -> decoded AudioBuffer (cached)
let fileGain = null;           // mute gate: source -> fileGain -> musicGain
let fileSource = null;         // current looping AudioBufferSourceNode
let filePending = false;       // a file track is fetching/decoding/starting

// Persist music-mute preference across sessions.
try { musicMuted = localStorage.getItem("swiirl.musicMuted") === "1"; } catch {}

function ensureMusicGraph() {
  ensureCtx();
  if (musicGain) return;
  musicGain = ctx.createGain();
  musicGain.gain.value = 0;
  musicLowpass = ctx.createBiquadFilter();
  musicLowpass.type = "lowpass";
  musicLowpass.frequency.value = 6000;
  musicGain.connect(musicLowpass).connect(ctx.destination);
}

function pitchHz(semis) { return 440 * Math.pow(2, semis / 12); }

function scheduleVoice(when, semis, voice, duration) {
  if (semis == null) return;
  const c = ctx;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = voice.type;
  osc.frequency.value = pitchHz(semis);
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(voice.gain, when + voice.attack);
  g.gain.exponentialRampToValueAtTime(0.0001, when + voice.attack + duration);
  osc.connect(g).connect(musicGain);
  osc.start(when);
  osc.stop(when + voice.attack + duration + 0.05);
}

function scheduleDrum(when, kind) {
  if (!kind) return;
  const c = ctx;
  const dur = kind === "kick" ? 0.10 : 0.04;
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * (1 - t);
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = kind === "kick" ? "lowpass" : "bandpass";
  filter.frequency.value = kind === "kick" ? 140 : 4200;
  const g = c.createGain();
  g.gain.value = kind === "kick" ? 0.30 : 0.14;
  src.connect(filter).connect(g).connect(musicGain);
  src.start(when);
}

// Voice presets — quieter than SFX so they blend under the action.
const V_LEAD = { type: "square",   gain: 0.16, attack: 0.005 };
const V_HARM = { type: "triangle", gain: 0.09, attack: 0.005 };
const V_BASS = { type: "triangle", gain: 0.20, attack: 0.005 };

// All tracks are 16 steps (one bar of 16th notes). Note values = semitones
// from A4. Composed to fit each level's mood — see header for the legend.
const TRACKS = {
  // Mellow C-major loop for the title / character select. Walking bass.
  menu: {
    bpm: 74,
    lead:    [0, null, 4, null, 7, null, 12, null,    11, null, 7, null, 4, null, 0, null],
    harmony: [null, null, null, 4, null, null, 9, null,  null, null, null, 4, null, null, 5, null],
    bass:    [-12, null, null, null, -8, null, null, null, -5, null, null, null, -8, null, null, null],
    drum:    [null, null, "hat", null, "kick", null, "hat", null,    null, null, "hat", null, "kick", null, "hat", null],
  },
  // Bright F-major overworld bounce.
  level1: {
    bpm: 98,
    lead:    [8, null, 12, 15, 12, null, 8, 12,    15, 17, 15, 12, 8, null, 5, null],
    harmony: [null, null, null, null, 5, null, null, null,    null, null, 3, null, null, null, null, null],
    bass:    [-16, null, null, null, -16, null, null, null,    -9, null, null, null, -9, null, null, null],
    drum:    ["kick", null, "hat", null, null, null, "hat", null, "kick", null, "hat", null, null, null, "hat", null],
  },
  // Cool A-minor — slower, mellow with quarter-note hits.
  level2: {
    bpm: 90,
    lead:    [0, null, 3, null, 7, null, 12, null,    10, null, 7, null, 3, null, 0, null],
    harmony: [-5, null, null, null, 3, null, null, null,  -7, null, null, null, 0, null, null, null],
    bass:    [-12, null, null, null, -10, null, null, null, -17, null, null, null, -10, null, null, null],
    drum:    ["kick", null, null, null, "hat", null, null, null, "kick", null, null, null, "hat", null, null, null],
  },
  // D-dorian, pulsing arpeggios — tense.
  level3: {
    bpm: 108,
    lead:    [5, 8, 12, 14, 12, 8, 5, 8,    7, 10, 14, 17, 14, 10, 7, 10],
    harmony: [null, null, null, null, 12, null, null, null,    null, null, null, null, 14, null, null, null],
    bass:    [-7, null, null, null, -7, null, null, null,  -5, null, null, null, -5, null, null, null],
    drum:    ["kick", null, "hat", null, "kick", null, "hat", "hat", "kick", null, "hat", null, "kick", null, "hat", null],
  },
  // E-phrygian, syncopated, stuttering.
  level4: {
    bpm: 116,
    lead:    [7, null, 7, 8, 10, null, 12, null,    14, 12, 10, 8, 7, null, 5, 7],
    harmony: [null, null, null, null, null, null, 15, null,    null, null, null, null, 12, null, null, null],
    bass:    [-5, null, -5, null, -5, null, -5, null,  -10, null, -10, null, -10, null, -10, null],
    drum:    ["kick", null, "hat", "hat", "kick", null, "hat", null, "kick", "hat", "hat", null, "kick", null, "hat", "hat"],
  },
  // G-minor, broad chord stabs — summit / ominous.
  level5: {
    bpm: 112,
    lead:    [10, null, 13, null, 17, null, 22, null,    20, null, 17, null, 13, null, 10, null],
    harmony: [10, null, null, null, 13, null, null, null,  10, null, null, null, 13, null, null, null],
    bass:    [-14, null, null, null, -14, null, null, null,    -7, null, null, null, -7, null, null, null],
    drum:    ["kick", null, "kick", null, "hat", null, "hat", null, "kick", null, "kick", null, "hat", null, "hat", null],
  },
  // Boss — chromatic descent, heavy bass on every beat.
  boss: {
    bpm: 132,
    swing: 0.08,
    lead:    [12, 11, 10, 9, 8, 7, 6, 5,    4, 3, 4, 5, 6, 7, 8, 9],
    harmony: [null, null, null, null, 3, null, null, null,    null, null, null, null, 0, null, null, null],
    bass:    [-12, null, -12, null, -12, null, -12, null,  -14, null, -14, null, -14, null, -14, null],
    drum:    ["kick", "hat", "kick", "hat", "kick", "hat", "kick", "hat", "kick", "hat", "kick", "hat", "kick", "hat", "kick", "hat"],
  },
  // Bonus — fast ascending arpeggios, F-lydian. Reflects the climb.
  level6: {
    bpm: 116,
    swing: 0.12,
    lead:    [8, 12, 15, 19, 22, 19, 15, 12,   10, 14, 17, 21, 24, 21, 17, 14],
    harmony: [null, null, null, 8, null, null, null, null,    null, null, null, 10, null, null, null, null],
    bass:    [-16, null, null, null, -9, null, null, null,    -14, null, null, null, -7, null, null, null],
    drum:    ["kick", "hat", "kick", "hat", "kick", "hat", "kick", "hat", "kick", "hat", "kick", "hat", "kick", "hat", "kick", "hat"],
  },
};

function tickScheduler() {
  if (!currentTrack || !ctx) return;
  const stepDur = 60 / currentTrack.bpm / 4;
  const swing = currentTrack.swing ?? DEFAULT_SWING;
  while (nextStepTime < ctx.currentTime + SCHED_LOOKAHEAD_S) {
    const step = stepIndex % currentTrack.lead.length;
    // Shuffle: delay the off-beat 16ths (odd steps) a touch. The grid
    // (nextStepTime) still advances by a full step, so downbeats never drift —
    // only the note's start within its step is nudged late, giving the bounce.
    const when = nextStepTime + ((step % 2 === 1) ? stepDur * swing : 0);
    // Mute check is per-tick so toggling pauses audio mid-bar without
    // tearing down the schedule. Re-unmute resumes mid-bar (correct).
    if (!muted && !musicMuted) {
      const noteDur = stepDur * 0.9;
      scheduleVoice(when, currentTrack.lead[step],    V_LEAD, noteDur);
      scheduleVoice(when, currentTrack.harmony[step], V_HARM, noteDur * 1.3);
      scheduleVoice(when, currentTrack.bass[step],    V_BASS, noteDur * 1.5);
      scheduleDrum(when, currentTrack.drum[step]);
    }
    nextStepTime += stepDur;
    stepIndex++;
  }
}

// --- File-backed playback (decoded mp3 looped through the music bus) ---------

function refreshFileMute() {
  if (fileGain) fileGain.gain.value = (muted || musicMuted) ? 0 : MUSIC_FILE_LEVEL;
}

function stopFileSource() {
  if (fileSource) {
    try { fileSource.stop(); } catch {}
    try { fileSource.disconnect(); } catch {}
    fileSource = null;
  }
}

// Start (or queue) the looping buffer for a file-backed track. Decodes on first
// use and caches. Guards against a track switch mid-decode.
function startFileTrack(trackId) {
  if (!fileGain) {
    fileGain = ctx.createGain();
    fileGain.connect(musicGain);
  }
  refreshFileMute();
  filePending = true;
  const url = FILES[trackId];   // cache by URL so aliased tracks share a decode
  const begin = (buf) => {
    if (currentTrackId !== trackId) { filePending = false; return; }
    stopFileSource();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(fileGain);
    src.start();
    fileSource = src;
    filePending = false;
  };
  if (fileBuffers[url]) { begin(fileBuffers[url]); return; }
  fetch(url)
    .then(r => r.arrayBuffer())
    .then(arr => ctx.decodeAudioData(arr))
    .then(buf => { fileBuffers[url] = buf; begin(buf); })
    .catch(() => { filePending = false; });
}

export const Music = {
  /** Start (or switch to) a track. No-op if same track already playing. */
  play(trackId) {
    if (!TRACKS[trackId] && !FILES[trackId]) return;
    ensureMusicGraph();
    if (currentTrackId === trackId && (schedulerId || fileSource || filePending)) return;
    currentTrackId = trackId;
    currentTrack = TRACKS[trackId] || null;
    // Fade the shared music bus in (covers the file's decode latency too).
    const t = ctx.currentTime;
    musicGain.gain.cancelScheduledValues(t);
    musicGain.gain.setValueAtTime(musicGain.gain.value, t);
    musicGain.gain.linearRampToValueAtTime(MUSIC_MASTER, t + 0.6);
    if (FILES[trackId]) {
      // File-backed: stop the synth sequencer, start the looping buffer.
      if (schedulerId) { clearInterval(schedulerId); schedulerId = null; }
      startFileTrack(trackId);
    } else {
      // Synth track: stop any file loop, run the step sequencer.
      stopFileSource();
      filePending = false;
      stepIndex = 0;
      nextStepTime = ctx.currentTime + 0.08;
      if (!schedulerId) schedulerId = setInterval(tickScheduler, SCHED_INTERVAL_MS);
    }
  },
  /** Fade out and stop the scheduler. */
  stop() {
    if (!musicGain || !ctx) return;
    const t = ctx.currentTime;
    musicGain.gain.cancelScheduledValues(t);
    musicGain.gain.setValueAtTime(musicGain.gain.value, t);
    musicGain.gain.linearRampToValueAtTime(0, t + 0.5);
    setTimeout(() => {
      if (schedulerId) { clearInterval(schedulerId); schedulerId = null; }
      stopFileSource();
      filePending = false;
      currentTrack = null;
      currentTrackId = null;
    }, 540);
  },
  /** 0..1 — drives lowpass cutoff. 0.3 = muffled, 1 = bright. */
  setIntensity(x) {
    if (!musicLowpass || !ctx) return;
    const v = Math.max(0.1, Math.min(1, x));
    const cutoff = 600 + (6000 - 600) * v;
    const t = ctx.currentTime;
    musicLowpass.frequency.cancelScheduledValues(t);
    musicLowpass.frequency.setValueAtTime(musicLowpass.frequency.value, t);
    musicLowpass.frequency.exponentialRampToValueAtTime(cutoff, t + 0.6);
  },
};

export function setMusicMuted(m) {
  musicMuted = !!m;
  refreshFileMute();
  try { localStorage.setItem("swiirl.musicMuted", musicMuted ? "1" : "0"); } catch {}
  return musicMuted;
}
export function toggleMusicMuted() { return setMusicMuted(!musicMuted); }
export function isMusicMuted() { return musicMuted; }
