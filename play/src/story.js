// play/src/story.js
// Single source of truth for Story Mode ("The Rise of Swiirl"): the narrative
// script (opening, inter-level interludes with moral choices, and the three
// endings) organized into FOUR selectable paths, the Mission-score thresholds,
// ending resolution, and save/load.
//
// Pure data + functions — NO Phaser, and NO module-level localStorage access,
// so this file imports cleanly under Node for tools/story.test.mjs.

// --- Paths --------------------------------------------------------------
export const PATHS = ["idealist", "hustler", "rebel", "founder"];

// --- Mission thresholds (per-path, tunable) -----------------------------
// Bands are contiguous (no gap / no overlap):
//   score <  compromised               -> "sellout"      (boss: finaleBoss)
//   compromised <= score < trueBoss    -> "compromised"  (boss: finaleBoss)
//   score >= trueBoss                  -> "true"          (boss: finaleBossTrue)
// For now only idealist is tuned; the other three reuse the same numbers
// until their content lands in a later phase.
export const THRESHOLDS = {
  idealist: { compromised: -2, trueBoss: 5 },
  hustler:  { compromised: -2, trueBoss: 5 },
  rebel:    { compromised: -2, trueBoss: 5 },
  founder:  { compromised: -2, trueBoss: 5 },
};

// --- Narrative content --------------------------------------------------
// Beat types:
//   { type: "line",   speaker, portrait, text }
//   { type: "choice", prompt, options: [{ label, mission }, { label, mission }] }
// `portrait` is a token resolved by Cutscene.js:
//   "player" -> chosen skin's idle frame, "brand" -> brand_happy,
//   "mirror" -> chosen skin idle, dark-tinted; any other string -> literal
//   texture key (e.g. "enemy_jargon_blob"), falling back to "cloud".

// The original (idealist) opening / interludes / endings, kept verbatim.
const idealistOpening = [
  { type: "line", speaker: "YOU", portrait: "player",
    text: "One brand. One mission. A community that actually believes in something." },
  { type: "line", speaker: "YOU", portrait: "player",
    text: "Let's build something real — before the suits show up." },
];

// keyed by the level JUST completed (1..5)
const idealistInterludes = {
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
};

const idealistEndings = {
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
};

export const STORYLINES = {
  idealist: {
    id: "idealist", title: "THE IDEALIST",
    premise: "Build a brand the community actually believes in — before the suits arrive.",
    accent: "#7bd389",
    opening: idealistOpening,
    interludes: idealistInterludes,
    endings: idealistEndings,
    finaleBoss: { variant: "board" },
    finaleBossTrue: { variant: "mirror" },
    flavor: {},          // filled in a later phase
  },

  // Placeholder paths — same shape, minimal stub content so the data is valid.
  // They reuse the idealist beats by reference as temporary stubs; real content
  // (distinct dialogue + flavor) is authored in a later phase. The shape still
  // satisfies the test (opening + interludes 1..5 with one 2-option choice
  // each, and three non-empty endings) per path.
  hustler: {
    id: "hustler", title: "THE HUSTLER",
    premise: "Growth at any cost — turn the brand into a rocket and see who's still strapped in at apogee.",
    accent: "#ffc24a",
    opening: idealistOpening,
    interludes: idealistInterludes,
    endings: idealistEndings,
    finaleBoss: { variant: "termsheet" },
    finaleBossTrue: { variant: "burnout" },
    flavor: {},
  },
  rebel: {
    id: "rebel", title: "THE REBEL",
    premise: "Tear down the incumbent — the only ethic is the fight.",
    accent: "#e0556b",
    opening: idealistOpening,
    interludes: idealistInterludes,
    endings: idealistEndings,
    finaleBoss: { variant: "incumbent" },
    finaleBossTrue: { variant: "selloutyou" },
    flavor: {},
  },
  founder: {
    id: "founder", title: "THE FOUNDER",
    premise: "It's personal — your name is on the door. Legacy vs. liquidity.",
    accent: "#6bb4ff",
    opening: idealistOpening,
    interludes: idealistInterludes,
    endings: idealistEndings,
    finaleBoss: { variant: "directors" },
    finaleBossTrue: { variant: "founderyou" },
    flavor: {},
  },
};

// Back-compat alias so existing importers (CharacterSelect/LevelComplete) that
// reference STORY.opening / STORY.interludes / STORY.endings keep working until
// they are migrated to STORYLINES[path] in the next phase.
export const STORY = STORYLINES.idealist;

export function resolveEnding(path, score) {
  // Back-compat: old callers pass a single number. Detect and treat as idealist.
  if (typeof path === "number") { score = path; path = "idealist"; }
  const t = THRESHOLDS[path] ?? THRESHOLDS.idealist;
  const sl = STORYLINES[path] ?? STORYLINES.idealist;
  const n = Number.isFinite(score) ? score : 0;
  if (n >= t.trueBoss)    return { endingId: "true",        bossVariant: sl.finaleBossTrue.variant };
  if (n >= t.compromised) return { endingId: "compromised", bossVariant: sl.finaleBoss.variant };
  return { endingId: "sellout", bossVariant: sl.finaleBoss.variant };
}

// --- Persistence (guarded; safe under Node where localStorage is absent) ---
const KEY = {
  path:      "swiirl.story.path",
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
  return s.getItem(KEY.level) != null
    && s.getItem(KEY.character) != null
    && s.getItem(KEY.path) != null;
}

export function loadStory() {
  const fallback = { path: "idealist", mission: 0, level: 1, character: null };
  const s = store();
  if (!s) return fallback;
  try {
    const level = parseInt(s.getItem(KEY.level), 10);
    const mission = parseInt(s.getItem(KEY.mission), 10);
    const character = s.getItem(KEY.character);
    const rawPath = s.getItem(KEY.path);
    const path = PATHS.includes(rawPath) ? rawPath : "idealist";
    // Upper bound is 6 (the bonus/final rooftop level) — a run resumed past
    // level 5 is still valid and should resolve, not reset to the fallback.
    if (!Number.isFinite(level) || level < 1 || level > 6) return fallback;
    return {
      path,
      mission: Number.isFinite(mission) ? mission : 0,
      level,
      character: character || null,
    };
  } catch { return fallback; }
}

export function saveStory({ path, mission, level, character }) {
  const s = store();
  if (!s) return;
  try {
    s.setItem(KEY.mission, String(mission ?? 0));
    s.setItem(KEY.level, String(level ?? 1));
    // Only overwrite the character / path when one is supplied — a null/omitted
    // value preserves the previously-saved choice, so a mid-run progress save
    // (mission/level only) doesn't wipe the chosen character or path.
    if (character) s.setItem(KEY.character, String(character));
    if (path) s.setItem(KEY.path, String(path));
  } catch {}
}

export function clearStory() {
  const s = store();
  if (!s) return;
  try {
    s.removeItem(KEY.path);
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
    // May contain namespaced ids ("idealist:true") and/or legacy bare ids
    // ("true"). Legacy bare ids correspond to the idealist path.
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function markEndingSeen(path, id) {
  const s = store();
  if (!s) return;
  try {
    const key = `${path}:${id}`;
    const seen = getEndingsSeen();
    if (!seen.includes(key)) {
      seen.push(key);
      s.setItem(KEY.endings, JSON.stringify(seen));
    }
  } catch {}
}
