// Community Park — the only level shipped in v1.
//
// POSITIONING CONVENTION (read this before editing!):
//   * All sprites in the world use origin (0.5, 1.0) — the position is the FEET.
//   * GROUND_Y is the top edge of the ground band.
//   * An entity standing ON the ground has y = GROUND_Y.
//   * An entity floating ABOVE the ground at clearance N has y = GROUND_Y - N.
//   * Tile size is 64. A platform's y is the TOP of the tile.

const TILE = 64;
const GROUND_Y = 656;

// Helpers (level data stays declarative).
const ground   = (x1, x2)         => ({ kind: "ground", x: x1, w: x2 - x1 });
const platform = (x, y, wTiles)   => ({ kind: "platform", x, y, w: wTiles });
const brick    = (x, y)           => ({ kind: "brick", x, y });
const bouncePad = (x, y)          => ({ kind: "bouncePad", x, y });
// Themed ground-level obstacle. The level passes the texture key; Game.js
// places it with its base at GROUND_TOP_Y so the player needs a real jump
// to clear it. Bulletin boards are the L1 signature — community insights
// literally posted in the park.
const bulletin = (x)              => ({ kind: "obstacle", x, texture: "obstacle_bulletin_board" });

// Pickup-altitude shorthand. "low" = walk-through, "mid" = single jump,
// "high" = chain-jump from a platform.
const LOW  = 70;
const MID  = 200;
const HIGH = 320;

export const level1 = {
  name: "Community Park",
  width: 7400,
  height: 720,
  // Spawn 100px above the ground so the level intro shows Swiirl falling in.
  spawn: { x: 100, y: GROUND_Y - 100 },
  brandPos: { x: 7180, y: GROUND_Y },
  miniBoss: { x: 6500, y: GROUND_Y, health: 3 },
  insightsRequired: 12,
  bossArenaStart: 6200,

  actTriggers: [
    { x: 2700, banner: "Act 2 — Sharing Signals" },
    { x: 6000, banner: "Act 3 — Hot-Take Hank" },
  ],
  checkpoints: [
    { after: 1500, respawnX: 1500 },
    { after: 2700, respawnX: 3300 },
    { after: 5500, respawnX: 5900 },
  ],

  // ============================================================================
  // TERRAIN
  // ============================================================================
  terrain: [
    // ---- ACT 1 (intro) ----
    ground(0, 1280),
    bulletin(450),                     // first board — intro to the bulletin gimmick
    platform(900,  GROUND_Y - 150, 4),
    platform(1100, GROUND_Y - 260, 3),
    brick(1280, GROUND_Y - 130),
    brick(1344, GROUND_Y - 130),
    brick(1408, GROUND_Y - 130),
    // pit 1280–1500
    ground(1500, 2400),
    platform(2000, GROUND_Y - 170, 3),
    platform(2300, GROUND_Y - 290, 3),
    bouncePad(1640, GROUND_Y - 64),  // springboard up to the high platforms
    // pit 2400–3200
    ground(2600, 3200),
    bouncePad(2820, GROUND_Y - 64),  // alt-route up after the arch gate
    brick(2620, GROUND_Y - 120),
    brick(2780, GROUND_Y - 220),
    brick(2960, GROUND_Y - 120),
    bulletin(3080),                    // mid-game beat

    // ---- ACT 2 (vertical platforming) ----
    platform(3300, GROUND_Y - 100, 3),
    platform(3550, GROUND_Y - 220, 3),
    platform(3800, GROUND_Y - 320, 3),
    platform(4100, GROUND_Y - 240, 3),
    platform(4350, GROUND_Y - 130, 3),
    ground(4500, 5400),
    brick(4900, GROUND_Y - 220),
    brick(4964, GROUND_Y - 220),
    brick(5028, GROUND_Y - 220),
    brick(4836, GROUND_Y - 320),
    brick(5092, GROUND_Y - 320),

    // pit 5400–5800
    ground(5500, 5800),
    brick(5560, GROUND_Y - 130),
    brick(5710, GROUND_Y - 200),
    platform(5900, GROUND_Y - 200, 4),
    platform(6150, GROUND_Y - 320, 3),

    // ---- ACT 3 (boss arena → brand) ----
    ground(6300, 7400),
    bulletin(6360),                    // boss-arena entry beat
    bulletin(7020),                    // post-boss, en route to brand
  ],

  // ============================================================================
  // ENEMIES — feet at GROUND_Y means standing on the ground.
  // Ghosts float, so their y is the ghost's foot-level above ground.
  // ============================================================================
  enemies: [
    // Act 1
    { type: "jargon_blob", x:  700, y: GROUND_Y, range:  60 },
    { type: "jargon_blob", x: 1750, y: GROUND_Y, range:  90 },
    { type: "jargon_blob", x: 1900, y: GROUND_Y, range: 120 },

    // Act 2
    { type: "ghost",       x: 3700, y: GROUND_Y - 240, range: 100 },
    { type: "ghost",       x: 4250, y: GROUND_Y - 290, range:  80 },
    { type: "paperwork",   x: 4800, y: GROUND_Y },
    { type: "jargon_blob", x: 5050, y: GROUND_Y, range: 130 },
    { type: "ghost",       x: 6000, y: GROUND_Y - 290, range:  80 },

    // Act 3 (boss spawned separately at miniBoss)
    { type: "jargon_blob", x: 6350, y: GROUND_Y, range:  60 },
    { type: "paperwork",   x: 6720, y: GROUND_Y },
  ],

  // ============================================================================
  // INSIGHTS — y is the orb center. Bobs ±5px around this.
  // ============================================================================
  insights: [
    // act 1 (8)
    { x:  240, y: GROUND_Y - LOW },
    { x:  360, y: GROUND_Y - LOW },
    { x:  480, y: GROUND_Y - LOW },
    { x:  940, y: GROUND_Y - 190 },
    { x: 1010, y: GROUND_Y - 190 },
    { x: 1140, y: GROUND_Y - 300 },
    { x: 1700, y: GROUND_Y - LOW },
    { x: 1820, y: GROUND_Y - LOW },

    // act 2 (10)
    { x: 2050, y: GROUND_Y - 210 },
    { x: 2350, y: GROUND_Y - 330 },
    { x: 3340, y: GROUND_Y - 140 },
    { x: 3590, y: GROUND_Y - 260 },
    { x: 3840, y: GROUND_Y - 360 },
    { x: 4140, y: GROUND_Y - 280 },
    { x: 4960, y: GROUND_Y - 380 },
    { x: 4900, y: GROUND_Y - 250 },
    { x: 4964, y: GROUND_Y - 250 },
    { x: 5028, y: GROUND_Y - 250 },

    // act 3 (6)
    { x: 5950, y: GROUND_Y - 240 },
    { x: 6020, y: GROUND_Y - 240 },
    { x: 6190, y: GROUND_Y - 360 },
    { x: 6420, y: GROUND_Y - LOW },
    { x: 6850, y: GROUND_Y - LOW },
    { x: 6960, y: GROUND_Y - LOW },
  ],

  // ============================================================================
  // SIGNALS (power-ups)
  // ============================================================================
  signals: [
    { type: "speed",  x: 2330, y: GROUND_Y - 300 },
    { type: "shield", x: 4360, y: GROUND_Y - 180 },
    { type: "growth", x: 5950, y: GROUND_Y - HIGH },
  ],

  // ============================================================================
  // DECOR
  // ============================================================================
  clouds: [
    { x:  220, y: 130, scale: 1.1 },
    { x:  700, y:  90, scale: 0.8 },
    { x: 1400, y: 160, scale: 1.3 },
    { x: 2200, y: 110, scale: 0.9 },
    { x: 3000, y: 140, scale: 1.0 },
    { x: 3900, y: 100, scale: 1.2 },
    { x: 4800, y: 150, scale: 0.8 },
    { x: 5800, y: 110, scale: 1.1 },
    { x: 6600, y: 130, scale: 1.0 },
  ],

};

export const TILE_SIZE = TILE;
export const GROUND_TOP_Y = GROUND_Y;
