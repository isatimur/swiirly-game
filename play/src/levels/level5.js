// Executive Summit — level 5 (final).
// Blue-gray steel atmosphere. All 4 enemy types. Maximum pressure.

const TILE = 64;
const GROUND_Y = 656;

const ground   = (x1, x2)       => ({ kind: "ground",   x: x1, w: x2 - x1 });
const platform = (x, y, wTiles) => ({ kind: "platform",  x, y,  w: wTiles  });
const brick    = (x, y)         => ({ kind: "brick",     x, y               });
const fallingShards = (x1, x2, interval) => ({ kind: "fallingShards", x1, x2, interval });
const pillar   = (x)            => ({ kind: "obstacle", x, texture: "obstacle_marble_pillar" });

const LOW  = 70;
const MID  = 200;
const HIGH = 320;

export const level5 = {
  name: "Executive Summit",
  width: 11500,
  height: 720,
  spawn: { x: 100, y: GROUND_Y - 100 },
  brandPos: { x: 11280, y: GROUND_Y },
  miniBoss: { x: 10600, y: GROUND_Y, health: 6 },
  insightsRequired: 22,
  bossArenaStart: 10100,

  actTriggers: [
    { x: 3800, banner: "Act 2 — The Boardroom" },
    { x: 8200, banner: "Act 3 — The C-Suite" },
  ],
  checkpoints: [
    { after: 2000, respawnX: 2200 },
    { after: 3900, respawnX: 4100 },
    { after: 8300, respawnX: 8500 },
  ],

  // ============================================================
  // TERRAIN
  // ============================================================
  terrain: [
    // --- Act 1 ---
    ground(0, 1900),
    pillar(440),                      // lobby pillar — intro
    platform(500,  GROUND_Y - 150, 3),
    platform(800,  GROUND_Y - 280, 4),
    platform(1200, GROUND_Y - 360, 3),
    platform(1500, GROUND_Y - 250, 3),
    brick(1750, GROUND_Y - 220),
    brick(1814, GROUND_Y - 320),
    // pit 1900–2300
    ground(2300, 3600),
    platform(2500, GROUND_Y - 170, 4),
    platform(2800, GROUND_Y - 310, 3),
    brick(3050, GROUND_Y - 220),
    brick(3114, GROUND_Y - 220),
    brick(3178, GROUND_Y - 220),
    platform(3300, GROUND_Y - 240, 3),

    // --- Act 2 ---
    // pit 3600–4100
    ground(4100, 5600),
    pillar(4200),                     // boardroom entrance
    platform(4300, GROUND_Y - 140, 3),
    platform(4600, GROUND_Y - 270, 4),
    platform(4950, GROUND_Y - 380, 3),
    brick(5200, GROUND_Y - 220),
    brick(5264, GROUND_Y - 220),
    brick(5328, GROUND_Y - 220),
    brick(5136, GROUND_Y - 360),
    brick(5392, GROUND_Y - 360),
    // pit 5600–6200
    ground(6200, 7400),
    platform(6400, GROUND_Y - 220, 3),
    platform(6700, GROUND_Y - 350, 4),
    brick(6550, GROUND_Y - 220),
    brick(6614, GROUND_Y - 300),
    brick(7000, GROUND_Y - 220),
    brick(7064, GROUND_Y - 220),
    // pit 7400–7900
    ground(7900, 8600),
    platform(8000, GROUND_Y - 200, 3),
    platform(8300, GROUND_Y - 350, 4),
    pillar(8520),                     // C-Suite threshold

    // --- Act 3 ---
    // pit 8600–9200
    ground(9200, 11500),
    pillar(9700),                     // shard-zone tactical cover
    // C-suite chaos: glass shards rain down on the final approach.
    fallingShards(9300, 10200, 1800),
  ],

  // ============================================================
  // ENEMIES
  // ============================================================
  enemies: [
    // Act 1
    { type: "jargon_blob",   x:  550, y: GROUND_Y, range: 140 },
    { type: "deadline_bot",  x:  850, y: GROUND_Y, range: 100 },
    { type: "ghost",         x: 1250, y: GROUND_Y - 220, range: 80  },
    { type: "jargon_blob",   x: 1550, y: GROUND_Y, range: 120 },
    { type: "deadline_bot",  x: 2450, y: GROUND_Y, range: 140 },
    { type: "jargon_blob",   x: 2850, y: GROUND_Y, range: 100 },
    { type: "paperwork",     x: 3100, y: GROUND_Y },
    { type: "ghost",         x: 3400, y: GROUND_Y - 260, range: 120 },

    // Act 2
    { type: "deadline_bot",  x: 4400, y: GROUND_Y, range: 120 },
    { type: "ghost",         x: 4700, y: GROUND_Y - 300, range: 100 },
    { type: "paperwork",     x: 5000, y: GROUND_Y },
    { type: "jargon_blob",   x: 5300, y: GROUND_Y, range: 160 },
    { type: "ghost",         x: 5400, y: GROUND_Y - 380, range:  80 },
    { type: "deadline_bot",  x: 6500, y: GROUND_Y, range: 180 },
    { type: "ghost",         x: 6800, y: GROUND_Y - 350, range: 100 },
    { type: "paperwork",     x: 7100, y: GROUND_Y },
    { type: "deadline_bot",  x: 7200, y: GROUND_Y, range:  80 },
    { type: "ghost",         x: 8050, y: GROUND_Y - 200, range:  80 },
    { type: "paperwork",     x: 8350, y: GROUND_Y },

    // Act 3
    { type: "jargon_blob",   x: 9300, y: GROUND_Y, range: 100 },
    { type: "deadline_bot",  x: 9600, y: GROUND_Y, range: 120 },
    { type: "ghost",         x: 9900, y: GROUND_Y - 220, range:  80 },
    { type: "jargon_blob",   x: 10200, y: GROUND_Y, range:  60 },
    { type: "deadline_bot",  x: 10400, y: GROUND_Y, range:  80 },
  ],

  // ============================================================
  // INSIGHTS
  // ============================================================
  insights: [
    // Act 1 (8)
    { x:  250, y: GROUND_Y - LOW },
    { x:  400, y: GROUND_Y - LOW },
    { x:  560, y: GROUND_Y - 190 },
    { x:  860, y: GROUND_Y - 320 },
    { x: 1260, y: GROUND_Y - 260 },
    { x: 1540, y: GROUND_Y - 290 },
    { x: 2550, y: GROUND_Y - 210 },
    { x: 2840, y: GROUND_Y - 350 },

    // Act 2 (10)
    { x: 3090, y: GROUND_Y - 260 },
    { x: 4360, y: GROUND_Y - 180 },
    { x: 4650, y: GROUND_Y - 310 },
    { x: 4990, y: GROUND_Y - 420 },
    { x: 5240, y: GROUND_Y - 260 },
    { x: 5240, y: GROUND_Y - 400 },
    { x: 5328, y: GROUND_Y - 400 },
    { x: 6450, y: GROUND_Y - 260 },
    { x: 6750, y: GROUND_Y - 390 },
    { x: 8040, y: GROUND_Y - 240 },

    // Act 3 (4)
    { x: 9350, y: GROUND_Y - LOW },
    { x: 9600, y: GROUND_Y - LOW },
    { x: 10000, y: GROUND_Y - LOW },
    { x: 10250, y: GROUND_Y - LOW },
  ],

  // ============================================================
  // SIGNALS
  // ============================================================
  signals: [
    { type: "speed",  x: 2950, y: GROUND_Y - MID  },
    { type: "shield", x: 5400, y: GROUND_Y - 180  },
    { type: "growth", x: 8400, y: GROUND_Y - HIGH },
  ],

  // ============================================================
  // DECOR
  // ============================================================
  clouds: [
    { x:  450, y: 105, scale: 0.9 },
    { x: 1100, y:  80, scale: 1.1 },
    { x: 2300, y: 135, scale: 0.8 },
    { x: 3700, y:  90, scale: 1.0 },
    { x: 5200, y: 115, scale: 1.2 },
    { x: 6500, y:  75, scale: 0.9 },
    { x: 7800, y: 105, scale: 1.0 },
    { x: 9100, y:  85, scale: 1.1 },
    { x: 10400, y: 100, scale: 0.8 },
  ],
};

export const TILE_SIZE    = TILE;
export const GROUND_TOP_Y = GROUND_Y;
