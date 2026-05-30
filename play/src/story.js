// play/src/story.js
// Single source of truth for Story Mode ("The Rise of Swiirl"): the narrative
// script (opening, inter-level interludes with moral choices, and the three
// endings), the Mission-score thresholds, ending resolution, and save/load.
//
// Pure data + functions — NO Phaser, and NO module-level localStorage access,
// so this file imports cleanly under Node for tools/story.test.mjs.

// --- Mission thresholds (tunable) ---------------------------------------
// Bands are contiguous (no gap / no overlap):
//   score <  compromised               -> "sellout"      (boss: board)
//   compromised <= score < trueBoss    -> "compromised"  (boss: board)
//   score >= trueBoss                  -> "true"          (boss: mirror)
export const THRESHOLDS = { compromised: -2, trueBoss: 5 };

export function resolveEnding(score) {
  const n = Number.isFinite(score) ? score : 0;
  if (n >= THRESHOLDS.trueBoss)     return { endingId: "true",        bossVariant: "mirror" };
  if (n >= THRESHOLDS.compromised)  return { endingId: "compromised", bossVariant: "board"  };
  return { endingId: "sellout", bossVariant: "board" };
}

// --- Narrative content --------------------------------------------------
// Beat types:
//   { type: "line",   speaker, portrait, text }
//   { type: "choice", prompt, options: [{ label, mission }, { label, mission }] }
// `portrait` is a token resolved by Cutscene.js:
//   "player" -> chosen skin's idle frame, "brand" -> brand_happy,
//   "mirror" -> chosen skin idle, dark-tinted; any other string -> literal
//   texture key (e.g. "enemy_jargon_blob"), falling back to "cloud".
export const STORY = {
  opening: [
    { type: "line", speaker: "YOU", portrait: "player",
      text: "One brand. One mission. A community that actually believes in something." },
    { type: "line", speaker: "YOU", portrait: "player",
      text: "Let's build something real — before the suits show up." },
  ],

  // keyed by the level JUST completed (1..5)
  interludes: {
    1: [
      { type: "line", speaker: "HOT-MONEY VC", portrait: "enemy_jargon_blob",
        text: "Cute little park. Here's a seven-figure check — just drop the 'community' stuff and optimize for growth." },
      { type: "choice", prompt: "Take the check?", options: [
        { label: "Take the check", mission: -2 },
        { label: "Bootstrap it",   mission: +2 },
      ] },
    ],
    2: [
      { type: "line", speaker: "GROWTH LEAD", portrait: "enemy_paperwork",
        text: "Competitor's running a fake-scarcity dark pattern. Conversions up 40%. We could ship the same by Friday." },
      { type: "choice", prompt: "Ship the dark pattern?", options: [
        { label: "Ship it",     mission: -2 },
        { label: "Do it clean", mission: +2 },
      ] },
    ],
    3: [
      { type: "line", speaker: "PR CHIEF", portrait: "brand",
        text: "Your loudest early supporter went 'off-brand' online. Optics are bad. We should quietly cut them loose." },
      { type: "choice", prompt: "Cut them loose?", options: [
        { label: "Cut them loose", mission: -2 },
        { label: "Stand by them",  mission: +2 },
      ] },
    ],
    4: [
      { type: "line", speaker: "THE ALGORITHM", portrait: "enemy_ghost",
        text: "The data is clear: outrage spikes engagement. Feed the feed. Trust is a slower curve." },
      { type: "choice", prompt: "Feed the outrage?", options: [
        { label: "Feed the outrage",    mission: -2 },
        { label: "Optimize for trust",  mission: +2 },
      ] },
    ],
    5: [
      { type: "line", speaker: "THE BOARD", portrait: "enemy_boss",
        text: "Final offer. We acquire you, you get rich, and the mission becomes... a line in the deck. Sign here." },
      { type: "choice", prompt: "Sign the term sheet?", options: [
        { label: "Sign the term sheet", mission: -3 },
        { label: "Walk away",           mission: +3 },
      ] },
    ],
  },

  endings: {
    sellout: [
      { type: "line", speaker: "THE BOARD", portrait: "enemy_boss",
        text: "Welcome aboard. The logo stays; everything you meant by it does not." },
      { type: "line", speaker: "YOU", portrait: "player",
        text: "Rich. Done. Hollow. The community moved on the day the term sheet did." },
      { type: "line", speaker: "—", portrait: "brand", text: "ENDING:  SELLOUT" },
    ],
    compromised: [
      { type: "line", speaker: "YOU", portrait: "player",
        text: "We won. We scaled. We survived. Somewhere in the charts, the reason we started became a footnote." },
      { type: "line", speaker: "—", portrait: "brand", text: "ENDING:  COMPROMISED" },
    ],
    true: [
      { type: "line", speaker: "THE MIRROR", portrait: "mirror",
        text: "You could have taken the deal. I'm what's left if you had." },
      { type: "line", speaker: "YOU", portrait: "player",
        text: "Smaller. Real. Ours. The community's still here — and so are we." },
      { type: "line", speaker: "—", portrait: "brand", text: "ENDING:  TRUE BELIEVER" },
    ],
  },
};

// --- Persistence (guarded; safe under Node where localStorage is absent) ---
const KEY = {
  mission:   "swiirl.story.mission",
  level:     "swiirl.story.level",
  character: "swiirl.story.character",
  endings:   "swiirl.story.endingsSeen",
};

function store() {
  try { return (typeof localStorage !== "undefined") ? localStorage : null; }
  catch { return null; }
}

export function hasStorySave() {
  const s = store();
  if (!s) return false;
  return s.getItem(KEY.level) != null && s.getItem(KEY.character) != null;
}

export function loadStory() {
  const fallback = { mission: 0, level: 1, character: null };
  const s = store();
  if (!s) return fallback;
  try {
    const level = parseInt(s.getItem(KEY.level), 10);
    const mission = parseInt(s.getItem(KEY.mission), 10);
    const character = s.getItem(KEY.character);
    // Upper bound is 6 (the bonus/final rooftop level) — a run resumed past
    // level 5 is still valid and should resolve, not reset to the fallback.
    if (!Number.isFinite(level) || level < 1 || level > 6) return fallback;
    return {
      mission: Number.isFinite(mission) ? mission : 0,
      level,
      character: character || null,
    };
  } catch { return fallback; }
}

export function saveStory({ mission, level, character }) {
  const s = store();
  if (!s) return;
  try {
    s.setItem(KEY.mission, String(mission ?? 0));
    s.setItem(KEY.level, String(level ?? 1));
    // Only overwrite the character when one is supplied — a null/omitted
    // character preserves the previously-saved skin, so a mid-run progress
    // save (mission/level only) doesn't wipe the chosen character.
    if (character) s.setItem(KEY.character, String(character));
  } catch {}
}

export function clearStory() {
  const s = store();
  if (!s) return;
  try {
    s.removeItem(KEY.mission);
    s.removeItem(KEY.level);
    s.removeItem(KEY.character);
  } catch {}
}

export function getEndingsSeen() {
  const s = store();
  if (!s) return [];
  try {
    const raw = s.getItem(KEY.endings);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function markEndingSeen(id) {
  const s = store();
  if (!s) return;
  try {
    const seen = getEndingsSeen();
    if (!seen.includes(id)) {
      seen.push(id);
      s.setItem(KEY.endings, JSON.stringify(seen));
    }
  } catch {}
}
