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
    name: "SWIIRL BEANIE",
    role: "The 3D remix",
    spriteKey: "classic",
    color: 0xb892e0,
    perk: "Balanced",
    perkColor: "#dcc7f2",
    attack: "swipe",
    attackHint: "Insight Swipe — arc strike in front",
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
export const ATTACK_TUNING = {
  swipe:       { cooldown: 320, damage: 1, hitboxMs: 140, range: 78,  height: 90,  knockbackX: 220 },
  bolt:        { cooldown: 380, damage: 1, projectileSpeed: 520, projectileLife: 700 },
  groundPound: { cooldown: 720, damage: 2, shockwaveRange: 140, slamVy: 1200, leapVy: -340 },
  chain:       { cooldown: 180, damage: 1, hitboxMs: 110, range: 70,  height: 80,  knockbackX: 160, heavyChargeMs: 380, heavyDamage: 2, heavyRange: 110 },
  shieldBash:  { cooldown: 600, damage: 1, dashSpeed: 520, dashMs: 220, hitboxMs: 240, range: 84, height: 100, parry: true },
};
