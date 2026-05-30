// Playable characters — each is a complete Swiirl variant with its own
// sprite set (loaded by Boot.js under the `<spriteKey>_<frame>` namespace),
// stat overrides, and combat style.
//
// To ship a new variant:
//   1. Drop the 17-frame sheet through tools/extract-character-sheet.mjs
//      with prefix `<spriteKey>` and outDir play/assets/sprites/ — see
//      the user's third-character workflow.
//   2. Add the spriteKey to SKINS in Boot.js so the frames preload.
//   3. Append an entry below.

export const CHARACTERS = [
  {
    id: "beanie",
    name: "SWIIRL CLASSIC",
    role: "The classic",
    spriteKey: "beanie",
    board: "original",
    color: 0xff8fbe,
    perk: "+15% run speed",
    perkColor: "#ff8fbe",
    attack: "chain",
    attackHint: "Light-Heavy Chain — tap chains, hold heavy",
    physics: { runSpeedMul: 1.15 },
  },
  {
    id: "classic",
    name: "SWIIRL ITTY",
    role: "The chibi original",
    spriteKey: "classic",
    board: "original",
    color: 0xb892e0,
    perk: "Heavy hits, slower swings",
    perkColor: "#dcc7f2",
    attack: "groundPound",
    attackHint: "Ground Pound — air-slam shockwave",
    physics: {},
  },
  {
    id: "ninja",
    name: "SWIIRL NINJA",
    role: "The shadow",
    spriteKey: "ninja",
    board: "original",
    color: 0x8b63c9,
    perk: "Higher jump",
    perkColor: "#b892e0",
    attack: "bolt",
    attackHint: "Insight Bolt — ranged shuriken throw",
    physics: { jumpVelocityMul: 1.12 },
  },
  {
    id: "rookie",
    name: "SWIIRL EXEC",
    role: "The executive",
    spriteKey: "rookie",
    board: "swiirl",
    color: 0x6bb4ff,
    perk: "+1 starting heart",
    perkColor: "#7dc4ff",
    attack: "shieldBash",
    attackHint: "Shield Bash — dash forward, parries projectiles",
    physics: { startLives: 4 },
  },
  {
    id: "breeze",
    name: "SWIIRL BREEZE",
    role: "The naturals",
    spriteKey: "breeze",
    board: "swiirl",
    color: 0x5fa8e8,
    perk: "+10% run speed",
    perkColor: "#9ad0ff",
    attack: "swipe",
    attackHint: "Swipe — quick melee arc",
    physics: { runSpeedMul: 1.1 },
  },
  {
    id: "closer",
    name: "SWIIRL CLOSER",
    role: "The dealmaker",
    spriteKey: "closer",
    board: "swiirl",
    color: 0xe0556b,
    perk: "Returning throw",
    perkColor: "#ff8f9c",
    attack: "boomerang",
    attackHint: "Boomerang — flies out, hits on the way back",
    physics: {},
  },
  {
    id: "glitz",
    name: "SWIIRL GLITZ",
    role: "The headliner",
    spriteKey: "glitz",
    board: "swiirl",
    color: 0xc77dff,
    perk: "Hits both sides",
    perkColor: "#e0b6ff",
    attack: "whirlwind",
    attackHint: "Whirlwind — 360° spin strike",
    physics: {},
  },
  {
    id: "denim",
    name: "SWIIRL DENIM",
    role: "The maverick",
    spriteKey: "denim",
    board: "swiirl",
    color: 0x3b6fb5,
    perk: "Heavy slam, +2 dmg",
    perkColor: "#8fc0ff",
    attack: "groundPound",
    attackHint: "Ground Pound — air-slam shockwave",
    physics: {},
  },
  {
    id: "noir",
    name: "SWIIRL NOIR",
    role: "The night-shift",
    spriteKey: "noir",
    board: "swiirl",
    color: 0x6b7280,
    perk: "Light-heavy combo",
    perkColor: "#c9ccd6",
    attack: "chain",
    attackHint: "Light-Heavy Chain — tap chains, hold heavy",
    physics: { runSpeedMul: 1.08 },
  },
  {
    id: "cozy",
    name: "SWIIRL COZY",
    role: "The steady hand",
    spriteKey: "cozy",
    board: "swiirl",
    color: 0xe8c98a,
    perk: "+1 starting heart",
    perkColor: "#f3dca8",
    attack: "shieldBash",
    attackHint: "Shield Bash — dash forward, parries projectiles",
    physics: { startLives: 4 },
  },
  {
    id: "specs",
    name: "SWIIRL SPECS",
    role: "The analyst",
    spriteKey: "specs",
    board: "swiirl",
    color: 0x3fc7b0,
    perk: "Higher jump",
    perkColor: "#7fe0d0",
    attack: "bolt",
    attackHint: "Insight Bolt — ranged shot",
    physics: { jumpVelocityMul: 1.12 },
  },
  {
    id: "navy",
    name: "SWIIRL NAVY",
    role: "The founder",
    spriteKey: "navy",
    board: "swiirl",
    color: 0x34539e,
    perk: "Returning throw",
    perkColor: "#8fa8e0",
    attack: "boomerang",
    attackHint: "Boomerang — flies out, hits on the way back",
    physics: { runSpeedMul: 1.05 },
  },
];

// Per-character art is shipped as sprite frames, not generated portraits,
// so the persona portrait/attack-frame keys system is empty here. Boot.js
// still spreads this list — we just don't push any entries.
export const PERSONA_ASSET_KEYS = [];

export function getCharacter(id) {
  return CHARACTERS.find(c => c.id === id) ?? CHARACTERS[0];
}

// Attack tuning shared across characters. Adjust here, reload — no rebuild.
// Cooldowns are in ms.
//
// Widened ranges so the hitboxes line up with the painted vfx_swipe arc,
// which visually extends further than the previous programmatic crescent.
// Height also bumped so ground enemies (paperwork, jargon blobs) get
// covered when the player is standing at normal range.
export const ATTACK_TUNING = {
  swipe:       { cooldown: 320, damage: 1, hitboxMs: 160, range: 140, height: 130, knockbackX: 240 },
  bolt:        { cooldown: 380, damage: 1, projectileSpeed: 600, projectileLife: 900 },
  groundPound: { cooldown: 720, damage: 2, shockwaveRange: 200, slamVy: 1200, leapVy: -340 },
  chain:       { cooldown: 180, damage: 1, hitboxMs: 130, range: 120, height: 120, knockbackX: 200, heavyChargeMs: 380, heavyDamage: 2, heavyRange: 180 },
  shieldBash:  { cooldown: 600, damage: 1, dashSpeed: 540, dashMs: 240, hitboxMs: 260, range: 150, height: 140, parry: true },
  whirlwind:   { cooldown: 520, damage: 1, hitboxMs: 200, range: 120, height: 130, knockbackX: 220 },
  boomerang:   { cooldown: 560, damage: 1, projectileSpeed: 520, projectileLife: 1300, outMs: 560, knockbackX: 180 },
};
