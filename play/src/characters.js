// Playable characters — five tinted Swiirl variants.
//
// Each character is a recolor of the base Swiirl sprite (NOT a separate sprite
// set), with a small stat perk AND a combat style. Selection persists in
// localStorage as "swiirl.character" so the next session opens with the same
// one preselected.
//
// Combat styles live in play/src/objects/PlayerAttacks.js. Tuning numbers
// (cooldown, damage, range, projectile speed) are in ATTACK_TUNING below —
// adjust here, reload, no rebuild needed.

export const CHARACTERS = [
  {
    id: "swiirl",
    name: "SWIIRL",
    color: 0xffffff,
    perk: "Balanced",
    perkColor: "#dcc7f2",
    attack: "swipe",
    attackHint: "Insight Swipe — arc strike in front",
    physics: {},
  },
  {
    id: "crimson",
    name: "CRIMSON",
    color: 0xff6b6b,
    perk: "+1 starting heart",
    perkColor: "#ff8fbe",
    attack: "groundPound",
    attackHint: "Ground Pound — air-slam shockwave",
    physics: { startLives: 4 },
  },
  {
    id: "mint",
    name: "MINT",
    color: 0x6bd4a4,
    perk: "+15% run speed",
    perkColor: "#7bd389",
    attack: "bolt",
    attackHint: "Insight Bolt — ranged throw",
    physics: { runSpeedMul: 1.15 },
  },
  {
    id: "ocean",
    name: "OCEAN",
    color: 0x6bb4ff,
    perk: "Higher jump",
    perkColor: "#7dc4ff",
    attack: "shieldBash",
    attackHint: "Shield Bash — dash forward, parries projectiles",
    physics: { jumpVelocityMul: 1.12 },
  },
  {
    id: "honey",
    name: "HONEY",
    color: 0xffd24a,
    perk: "Insight magnet ×2",
    perkColor: "#FFD24A",
    attack: "chain",
    attackHint: "Light-Heavy Chain — tap chains, hold heavy",
    physics: { magnetRadiusMul: 1.5 },
  },
];

// Kept for Boot.js compatibility — the original roster ships no per-character
// art, so there's nothing extra to preload.
export const PERSONA_ASSET_KEYS = [];

export function getCharacter(id) {
  return CHARACTERS.find(c => c.id === id) ?? CHARACTERS[0];
}

// Attack tuning shared across characters. Adjust here, reload — no rebuild.
// Cooldowns are in ms. Damage scales: 1 = standard enemy kill, 2 = mini-boss
// hit equivalent. Bosses use takePlayerHit() which respects damage.
export const ATTACK_TUNING = {
  swipe:       { cooldown: 320, damage: 1, hitboxMs: 140, range: 78,  height: 90,  knockbackX: 220 },
  bolt:        { cooldown: 380, damage: 1, projectileSpeed: 520, projectileLife: 700 },
  groundPound: { cooldown: 720, damage: 2, shockwaveRange: 140, slamVy: 1200, leapVy: -340 },
  chain:       { cooldown: 180, damage: 1, hitboxMs: 110, range: 70,  height: 80,  knockbackX: 160, heavyChargeMs: 380, heavyDamage: 2, heavyRange: 110 },
  shieldBash:  { cooldown: 600, damage: 1, dashSpeed: 520, dashMs: 220, hitboxMs: 240, range: 84, height: 100, parry: true },
};
