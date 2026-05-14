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
    color: 0x6bb4ff,
    perk: "+1 starting heart",
    perkColor: "#7dc4ff",
    attack: "shieldBash",
    attackHint: "Shield Bash — dash forward, parries projectiles",
    physics: { startLives: 4 },
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
};
