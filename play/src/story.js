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

// --- THE HUSTLER ("Growth at any cost") ---------------------------------
const hustlerOpening = [
  { type: "line", speaker: "YOU", portrait: "player",
    text: "Forget slow. Forget safe. We're building a rocket and lighting it tonight." },
  { type: "line", speaker: "YOU", portrait: "player",
    text: "Every chart goes up and to the right — or we don't ship it." },
  { type: "line", speaker: "THE BRAND", portrait: "brand",
    text: "Just promise me there's still a 'me' left at apogee." },
];

const hustlerInterludes = {
  1: [
    { type: "line", speaker: "LAUNCH WAR ROOM", portrait: "enemy_jargon_blob",
      text: "Demo's at nine. Half the feature is held together with hope and a feature flag. Ship it anyway?" },
    { type: "choice", prompt: "Ship the half-built feature?", options: [
      { label: "Ship it tonight",     mission: -2 },
      { label: "Delay for quality",   mission: +2 },
    ] },
  ],
  2: [
    { type: "line", speaker: "GROWTH HACKER", portrait: "enemy_paperwork",
      text: "Slap a 'only 3 seats left!' countdown on it. There are nine thousand seats. Doubles conversions, guaranteed." },
    { type: "choice", prompt: "Fake the scarcity timer?", options: [
      { label: "Fake the urgency",    mission: -2 },
      { label: "Sell on real value",  mission: +2 },
    ] },
  ],
  3: [
    { type: "line", speaker: "HYPE STRATEGIST", portrait: "enemy_ghost",
      text: "One insane stunt. We torch a quarter of runway in 48 hours for a trending moment. Burn it all for hype?" },
    { type: "choice", prompt: "Torch the runway for a viral stunt?", options: [
      { label: "Burn it for hype",    mission: -2 },
      { label: "Burn steady",         mission: +2 },
    ] },
  ],
  4: [
    { type: "line", speaker: "THE DECK", portrait: "enemy_paperwork",
      text: "The raise deck needs to sing. Annualize the best week, hide the churn cohort. Investors never check. Juice it?" },
    { type: "choice", prompt: "Inflate the metrics?", options: [
      { label: "Juice the deck",      mission: -2 },
      { label: "Honest numbers",      mission: +2 },
    ] },
  ],
  5: [
    { type: "line", speaker: "THE ACQUIRER", portrait: "enemy_boss",
      text: "Acqui-hire. We flip you today, you cash out, the product becomes a tab nobody opens. Or you keep grinding alone." },
    { type: "choice", prompt: "Flip now or keep scaling?", options: [
      { label: "Flip for the bag",    mission: -3 },
      { label: "Keep building",       mission: +3 },
    ] },
  ],
};

const hustlerEndings = {
  sellout: [
    { type: "line", speaker: "THE ACQUIRER", portrait: "enemy_boss",
      text: "Great velocity. We'll sunset it next quarter. Your equity vests; the rocket was always a firework." },
    { type: "line", speaker: "YOU", portrait: "player",
      text: "Up and to the right — then straight down. Acquired, flamed out, forgotten by Q3." },
    { type: "line", speaker: "—", portrait: "brand", text: "ENDING:  ACQUIRED FLAMEOUT" },
  ],
  compromised: [
    { type: "line", speaker: "YOU", portrait: "player",
      text: "Billion-dollar valuation. Twelve thousand customers who can't say what we actually do." },
    { type: "line", speaker: "THE BRAND", portrait: "brand",
      text: "We're a unicorn. We're also hollow. Nobody loves a number." },
    { type: "line", speaker: "—", portrait: "brand", text: "ENDING:  SOULLESS UNICORN" },
  ],
  true: [
    { type: "line", speaker: "THE MIRROR", portrait: "mirror",
      text: "You wanted apogee. Funny — you got orbit instead. Stable. Recurring. Real." },
    { type: "line", speaker: "YOU", portrait: "player",
      text: "Grew it fast AND grew it true. Turns out the durable rocket beats the loud one." },
    { type: "line", speaker: "—", portrait: "brand", text: "ENDING:  SUSTAINABLE SCALE" },
  ],
};

// --- THE REBEL ("Tear down the incumbent") ------------------------------
const rebelOpening = [
  { type: "line", speaker: "YOU", portrait: "player",
    text: "The incumbent is bloated, dishonest, and decades overdue for a fall. I'm the one who pushes." },
  { type: "line", speaker: "YOU", portrait: "player",
    text: "The only ethic is the fight. Everything else is negotiable... right?" },
];

const rebelInterludes = {
  1: [
    { type: "line", speaker: "THE RIVAL'S ENVOY", portrait: "enemy_jargon_blob",
      text: "We hate the incumbent too. Here's a war chest — no strings, wink wink. Take the enemy's enemy's money?" },
    { type: "choice", prompt: "Take the dirty money?", options: [
      { label: "Take it",          mission: -2 },
      { label: "Stay clean",       mission: +2 },
    ] },
  ],
  2: [
    { type: "line", speaker: "THE PLAYBOOK", portrait: "enemy_paperwork",
      text: "We stole their manipulation playbook — the dark patterns, the manufactured FOMO. Beat them with their own tricks?" },
    { type: "choice", prompt: "Co-opt their playbook?", options: [
      { label: "Use their tricks", mission: -2 },
      { label: "Fight clean",      mission: +2 },
    ] },
  ],
  3: [
    { type: "line", speaker: "THE LEAK", portrait: "enemy_ghost",
      text: "Their CEO's private files just fell in our lap. Dox him, own the news cycle, end him by lunch. Burn him down?" },
    { type: "choice", prompt: "Dox the corrupt exec?", options: [
      { label: "Burn them",        mission: -2 },
      { label: "Take the higher road", mission: +2 },
    ] },
  ],
  4: [
    { type: "line", speaker: "THE WAR-CHEST", portrait: "enemy_paperwork",
      text: "We're out of runway. We're sitting on a user database worth millions. Sell it, fund the revolution. Cash out the people?" },
    { type: "choice", prompt: "Sell user data to fund the fight?", options: [
      { label: "Sell users out",   mission: -2 },
      { label: "Protect them",     mission: +2 },
    ] },
  ],
  5: [
    { type: "line", speaker: "THE THRONE", portrait: "enemy_boss",
      text: "The incumbent's falling. The seat is yours. Sit down, wear the crown, become the new king. Or burn the throne itself." },
    { type: "choice", prompt: "Take the throne?", options: [
      { label: "Seize power",      mission: -3 },
      { label: "Burn the throne",  mission: +3 },
    ] },
  ],
};

const rebelEndings = {
  sellout: [
    { type: "line", speaker: "THE THRONE", portrait: "enemy_boss",
      text: "You won. You also became exactly what you set out to kill. The throne fits you perfectly now." },
    { type: "line", speaker: "YOU", portrait: "player",
      text: "I tore down the system. Then I rebuilt it with my name on it. I AM the incumbent." },
    { type: "line", speaker: "—", portrait: "brand", text: "ENDING:  YOU ARE THE SYSTEM" },
  ],
  compromised: [
    { type: "line", speaker: "YOU", portrait: "player",
      text: "The incumbent's gone. So is the part of me that knew why it mattered." },
    { type: "line", speaker: "THE BRAND", portrait: "brand",
      text: "We won the war. We lost the reason we declared it. Corrupted, but standing." },
    { type: "line", speaker: "—", portrait: "brand", text: "ENDING:  WON BUT CORRUPTED" },
  ],
  true: [
    { type: "line", speaker: "THE MIRROR", portrait: "mirror",
      text: "You could have been king. Instead you burned the chair so no one ever sits there again." },
    { type: "line", speaker: "YOU", portrait: "player",
      text: "Clean hands, clean win. The fight was never about the throne — it was about ending it." },
    { type: "line", speaker: "—", portrait: "brand", text: "ENDING:  CLEAN REVOLUTION" },
  ],
};

// --- THE FOUNDER ("Legacy vs. liquidity") -------------------------------
const founderOpening = [
  { type: "line", speaker: "YOU", portrait: "player",
    text: "My name is on the door. Every decision from here is personal — legacy or liquidity, never both." },
  { type: "line", speaker: "YOU", portrait: "player",
    text: "I started this with people I trust. I'd like to still trust them when it's over." },
  { type: "line", speaker: "THE BRAND", portrait: "brand",
    text: "Then don't sell the parts of us that can't be bought back." },
];

const founderInterludes = {
  1: [
    { type: "line", speaker: "THE CAP TABLE", portrait: "enemy_paperwork",
      text: "Your co-founder's distracted lately. One clean re-grant and their stake shrinks, yours grows. Dilute them quietly?" },
    { type: "choice", prompt: "Dilute your co-founder?", options: [
      { label: "Dilute them",      mission: -2 },
      { label: "Keep it fair",     mission: +2 },
    ] },
  ],
  2: [
    { type: "line", speaker: "THE RECRUITER", portrait: "enemy_jargon_blob",
      text: "The scrappy early team got you here, but investors want 'real' execs with logos on their resumes. Swap them out?" },
    { type: "choice", prompt: "Replace the loyal team?", options: [
      { label: "Replace them",     mission: -2 },
      { label: "Promote from within", mission: +2 },
    ] },
  ],
  3: [
    { type: "line", speaker: "THE LEAD INVESTOR", portrait: "enemy_ghost",
      text: "Enormous check on the table. Price of entry: we control the board, and your votes. Sign away the wheel?" },
    { type: "choice", prompt: "Give up board control?", options: [
      { label: "Give up control",  mission: -2 },
      { label: "Keep control",     mission: +2 },
    ] },
  ],
  4: [
    { type: "line", speaker: "THE PRESS TOUR", portrait: "enemy_paperwork",
      text: "The breakthrough that's making headlines? It was the team's. The cameras only want one face — yours. Take the credit?" },
    { type: "choice", prompt: "Take sole credit?", options: [
      { label: "Take the spotlight", mission: -2 },
      { label: "Share the credit",   mission: +2 },
    ] },
  ],
  5: [
    { type: "line", speaker: "THE BOARD", portrait: "enemy_boss",
      text: "Golden parachute. Step down, take the payout, walk away rich while we steer your name. Or stay strapped to the ship." },
    { type: "choice", prompt: "Take the parachute?", options: [
      { label: "Take the chute",   mission: -3 },
      { label: "Stay with the ship", mission: +3 },
    ] },
  ],
};

const founderEndings = {
  sellout: [
    { type: "line", speaker: "THE BOARD", portrait: "enemy_boss",
      text: "Smart exit. The payout clears Friday. Your name stays on the door; you, however, do not." },
    { type: "line", speaker: "YOU", portrait: "player",
      text: "Rich and gone. They run my company now, with my face and none of my reasons." },
    { type: "line", speaker: "—", portrait: "brand", text: "ENDING:  GOLDEN PARACHUTE" },
  ],
  compromised: [
    { type: "line", speaker: "YOU", portrait: "player",
      text: "Still CEO. Still on the door. But the people who made it mine are gone, and so is the weight behind the title." },
    { type: "line", speaker: "THE BRAND", portrait: "brand",
      text: "You kept the chair. You hollowed out the room around it." },
    { type: "line", speaker: "—", portrait: "brand", text: "ENDING:  CEO OF A HOLLOW THING" },
  ],
  true: [
    { type: "line", speaker: "THE MIRROR", portrait: "mirror",
      text: "Legacy or liquidity — you found the third door. The team's still here. So am I." },
    { type: "line", speaker: "YOU", portrait: "player",
      text: "Founder-led and whole. My name on the door still means everyone who got us through it." },
    { type: "line", speaker: "—", portrait: "brand", text: "ENDING:  FOUNDER-LED AND WHOLE" },
  ],
};

// --- Per-path level flavor (banner overrides; data only) ----------------
const idealistFlavor = {
  1: { banner: "Act 1 — The Community Park",   acts: ["Act 2 — First Believers", "Act 3 — Hot-Money Hank"] },
  2: { banner: "Act 1 — Into the Corporate Maze", acts: ["Act 2 — Red Tape", "Act 3 — The Growth Lead"] },
  3: { banner: "Act 1 — Brand HQ",             acts: ["Act 2 — Optics Department", "Act 3 — The PR Chief"] },
  4: { banner: "Act 1 — The Data Lake",        acts: ["Act 2 — The Feed", "Act 3 — The Algorithm"] },
  5: { banner: "Act 1 — Executive Summit",     acts: ["Act 2 — The Antechamber", "Act 3 — The Board"] },
  6: { banner: "Act 1 — Up and to the Right",  acts: ["Act 2 — The Rooftop", "Act 3 — The Reckoning"] },
};

const hustlerFlavor = {
  1: { banner: "Act 1 — The Garage Launch",    acts: ["Act 2 — Ship It Tonight", "Act 3 — The War Room"] },
  2: { banner: "Act 1 — The Growth Funnel",    acts: ["Act 2 — Conversion Optimized", "Act 3 — The Growth Hacker"] },
  3: { banner: "Act 1 — The Hype Machine",     acts: ["Act 2 — Trending Now", "Act 3 — Burn the Runway"] },
  4: { banner: "Act 1 — The Raise",            acts: ["Act 2 — Annualize Everything", "Act 3 — The Deck"] },
  5: { banner: "Act 1 — The Term Sheet",       acts: ["Act 2 — Due Diligence", "Act 3 — The Acquirer"] },
  6: { banner: "Act 1 — Apogee",               acts: ["Act 2 — Terminal Velocity", "Act 3 — The Burnout"] },
};

const rebelFlavor = {
  1: { banner: "Act 1 — The Resistance",       acts: ["Act 2 — First Recruits", "Act 3 — The Rival's Envoy"] },
  2: { banner: "Act 1 — Behind Enemy Lines",   acts: ["Act 2 — The Stolen Playbook", "Act 3 — Their Own Tricks"] },
  3: { banner: "Act 1 — The Leak",             acts: ["Act 2 — News Cycle", "Act 3 — Burn Him Down"] },
  4: { banner: "Act 1 — Out of Runway",        acts: ["Act 2 — The User Database", "Act 3 — The War-Chest"] },
  5: { banner: "Act 1 — The Incumbent Falls",  acts: ["Act 2 — The Empty Throne", "Act 3 — The Crown"] },
  6: { banner: "Act 1 — The New Order",        acts: ["Act 2 — Who You Became", "Act 3 — The Sellout You"] },
};

const founderFlavor = {
  1: { banner: "Act 1 — Your Name on the Door", acts: ["Act 2 — The Cap Table", "Act 3 — The Co-Founder"] },
  2: { banner: "Act 1 — The Loyal Team",        acts: ["Act 2 — The Recruiter", "Act 3 — Real Execs"] },
  3: { banner: "Act 1 — The Big Check",         acts: ["Act 2 — The Term Sheet", "Act 3 — The Board Seat"] },
  4: { banner: "Act 1 — The Press Tour",        acts: ["Act 2 — One Face", "Act 3 — The Spotlight"] },
  5: { banner: "Act 1 — The Golden Parachute",  acts: ["Act 2 — The Payout", "Act 3 — The Board"] },
  6: { banner: "Act 1 — Legacy or Liquidity",   acts: ["Act 2 — The Hollow Chair", "Act 3 — The Founder You Were"] },
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
    flavor: idealistFlavor,
  },
  hustler: {
    id: "hustler", title: "THE HUSTLER",
    premise: "Growth at any cost — turn the brand into a rocket and see who's still strapped in at apogee.",
    accent: "#ffc24a",
    opening: hustlerOpening,
    interludes: hustlerInterludes,
    endings: hustlerEndings,
    finaleBoss: { variant: "termsheet" },
    finaleBossTrue: { variant: "burnout" },
    flavor: hustlerFlavor,
  },
  rebel: {
    id: "rebel", title: "THE REBEL",
    premise: "Tear down the incumbent — the only ethic is the fight.",
    accent: "#e0556b",
    opening: rebelOpening,
    interludes: rebelInterludes,
    endings: rebelEndings,
    finaleBoss: { variant: "incumbent" },
    finaleBossTrue: { variant: "selloutyou" },
    flavor: rebelFlavor,
  },
  founder: {
    id: "founder", title: "THE FOUNDER",
    premise: "It's personal — your name is on the door. Legacy vs. liquidity.",
    accent: "#6bb4ff",
    opening: founderOpening,
    interludes: founderInterludes,
    endings: founderEndings,
    finaleBoss: { variant: "directors" },
    finaleBossTrue: { variant: "founderyou" },
    flavor: founderFlavor,
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
  // Only level + character are required so legacy saves (made before the
  // story.path key existed) still resume. loadStory() defaults a missing/invalid
  // path to "idealist".
  return s.getItem(KEY.level) != null
    && s.getItem(KEY.character) != null;
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

export function markEndingSeen(pathOrId, maybeId) {
  // Two call styles:
  //   markEndingSeen(id)        -> legacy/bare id (current callers; idealist path)
  //   markEndingSeen(path, id)  -> namespaced "path:id" (used once consumers migrate)
  const s = store();
  if (!s) return;
  try {
    const entry = (maybeId === undefined) ? pathOrId : `${pathOrId}:${maybeId}`;
    const seen = getEndingsSeen();
    if (!seen.includes(entry)) {
      seen.push(entry);
      s.setItem(KEY.endings, JSON.stringify(seen));
    }
  } catch {}
}
