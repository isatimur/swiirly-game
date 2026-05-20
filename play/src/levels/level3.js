// Brand HQ — level 3 (final).
// Maximum difficulty: dense enemies, long pits, 5-stomp boss, grand finale.

const TILE = 64;
const GROUND_Y = 656;

const ground   = (x1, x2)       => ({ kind: "ground",   x: x1, w: x2 - x1 });
const platform = (x, y, wTiles) => ({ kind: "platform",  x, y,  w: wTiles  });
const brick    = (x, y)         => ({ kind: "brick",     x, y               });
const windZone = (x, y, w, h, force) => ({ kind: "windZone", x, y, w, h, force });
const rope     = (x)            => ({ kind: "obstacle", x, texture: "obstacle_velvet_rope" });

const LOW  = 70;
const MID  = 200;
const HIGH = 320;

export const level3 = {
  name: "Brand HQ",
  width: 9800,
  height: 720,
  spawn: { x: 100, y: GROUND_Y - 100 },
  brandPos: { x: 9600, y: GROUND_Y },
  miniBoss: { x: 8900, y: GROUND_Y, health: 5 },
  insightsRequired: 18,
  bossArenaStart: 8400,

  actTriggers: [
    { x: 3200, banner: "Act 2 — The Insight Vault" },
    { x: 7000, banner: "Act 3 — The CMO's Office" },
  ],
  checkpoints: [
    { after: 1700, respawnX: 1900 },
    { after: 3300, respawnX: 3500 },
    { after: 7100, respawnX: 7300 },
  ],

  // ============================================================
  // TERRAIN
  // ============================================================
  terrain: [
    // --- Act 1 ---
    ground(0, 1700),
    rope(420),                       // reception line — intro
    platform(450, GROUND_Y - 140, 3),
    platform(700, GROUND_Y - 260, 4),
    platform(1100, GROUND_Y - 180, 3),
    brick(1350, GROUND_Y - 110),
    brick(1414, GROUND_Y - 170),
    brick(1478, GROUND_Y - 230),
    brick(1542, GROUND_Y - 290),
    // pit 1700–2100
    ground(2100, 3000),
    platform(2300, GROUND_Y - 160, 3),
    platform(2600, GROUND_Y - 300, 4),
    brick(2850, GROUND_Y - 130),
    brick(2914, GROUND_Y - 130),
    // pit 3000–3400 — gusty winds blowing BACKWARD make this a real test
    windZone(3000, GROUND_Y - 360, 400, 360, -280),
    ground(3400, 4600),
    rope(3520),                      // post-wind landing zone beat
    platform(3600, GROUND_Y - 140, 3),
    platform(3900, GROUND_Y - 280, 4),
    platform(4300, GROUND_Y - 360, 3),

    // --- Act 2 ---
    // pit 4600–5100 — tailwind to help cross the gap
    windZone(4600, GROUND_Y - 360, 500, 360, 240),
    ground(5100, 6400),
    platform(5300, GROUND_Y - 160, 3),
    platform(5600, GROUND_Y - 300, 4),
    platform(5950, GROUND_Y - 360, 3),
    brick(5200, GROUND_Y - 220),
    brick(5264, GROUND_Y - 220),
    brick(5200, GROUND_Y - 360),
    brick(5264, GROUND_Y - 360),
    ground(6400, 7200),
    platform(6600, GROUND_Y - 220, 3),
    platform(6900, GROUND_Y - 340, 4),
    brick(6750, GROUND_Y - 220),
    brick(6814, GROUND_Y - 300),

    // pit 7200–7600
    ground(7400, 7800),
    platform(7850, GROUND_Y - 200, 4),
    platform(8100, GROUND_Y - 340, 3),

    // --- Act 3 ---
    ground(8300, 9800),
    rope(8460),                      // CMO's office threshold
  ],

  // ============================================================
  // ENEMIES
  // ============================================================
  enemies: [
    // Act 1
    { type: "jargon_blob", x:  500, y: GROUND_Y, range: 120 },
    { type: "jargon_blob", x:  900, y: GROUND_Y, range: 200 },
    { type: "ghost",       x: 1200, y: GROUND_Y - 200, range:  80 },
    { type: "jargon_blob", x: 2200, y: GROUND_Y, range: 150 },
    { type: "jargon_blob", x: 2700, y: GROUND_Y, range: 100 },
    { type: "paperwork",   x: 2900, y: GROUND_Y },

    // Act 2
    { type: "ghost",       x: 3700, y: GROUND_Y - 250, range: 150 },
    { type: "ghost",       x: 4000, y: GROUND_Y - 360, range: 100 },
    { type: "paperwork",   x: 4300, y: GROUND_Y },
    { type: "jargon_blob", x: 5400, y: GROUND_Y, range: 160 },
    { type: "ghost",       x: 5700, y: GROUND_Y - 280, range: 120 },
    { type: "ghost",       x: 6100, y: GROUND_Y - 360, range:  80 },
    { type: "paperwork",   x: 5900, y: GROUND_Y },
    { type: "jargon_blob", x: 6600, y: GROUND_Y, range: 180 },
    { type: "paperwork",   x: 6900, y: GROUND_Y },
    { type: "ghost",       x: 7500, y: GROUND_Y - 200, range:  80 },
    { type: "paperwork",   x: 7700, y: GROUND_Y },
    { type: "ghost",       x: 7950, y: GROUND_Y - 200, range:  90 },

    // Act 3
    { type: "jargon_blob", x: 8350, y: GROUND_Y, range:  80 },
    { type: "jargon_blob", x: 8400, y: GROUND_Y, range:  80 },
    { type: "ghost",       x: 8600, y: GROUND_Y - 200, range:  80 },
    { type: "paperwork",   x: 8750, y: GROUND_Y },
    { type: "jargon_blob", x: 9200, y: GROUND_Y, range:  60 },
  ],

  // ============================================================
  // INSIGHTS
  // ============================================================
  insights: [
    // Act 1 (8)
    { x:  240, y: GROUND_Y - LOW },
    { x:  480, y: GROUND_Y - LOW },
    { x:  720, y: GROUND_Y - 300 },
    { x: 1130, y: GROUND_Y - 220 },
    { x: 1450, y: GROUND_Y - 170 },
    { x: 2350, y: GROUND_Y - 200 },
    { x: 2640, y: GROUND_Y - 340 },
    { x: 2950, y: GROUND_Y - LOW },

    // Act 2 (13)
    { x: 3640, y: GROUND_Y - 180 },
    { x: 3940, y: GROUND_Y - 320 },
    { x: 4340, y: GROUND_Y - 400 },
    { x: 5200, y: GROUND_Y - 240 },
    { x: 5200, y: GROUND_Y - 400 },
    { x: 5264, y: GROUND_Y - 400 },
    { x: 5350, y: GROUND_Y - LOW },
    { x: 5650, y: GROUND_Y - 340 },
    { x: 5990, y: GROUND_Y - 400 },
    { x: 6640, y: GROUND_Y - 260 },
    { x: 6940, y: GROUND_Y - 380 },
    { x: 7890, y: GROUND_Y - 240 },
    { x: 8140, y: GROUND_Y - 380 },

    // Act 3 (5)
    { x: 8450, y: GROUND_Y - LOW },
    { x: 8600, y: GROUND_Y - LOW },
    { x: 9000, y: GROUND_Y - LOW },
    { x: 9200, y: GROUND_Y - LOW },
    { x: 9400, y: GROUND_Y - LOW },
  ],

  // ============================================================
  // SIGNALS
  // ============================================================
  signals: [
    { type: "speed",  x: 2400, y: GROUND_Y - MID  },
    { type: "shield", x: 5000, y: GROUND_Y - 180  },
    { type: "growth", x: 7500, y: GROUND_Y - HIGH },
  ],

  // ============================================================
  // DECOR
  // ============================================================
  clouds: [
    { x:  350, y: 110, scale: 1.0 },
    { x:  900, y:  85, scale: 0.9 },
    { x: 2000, y: 130, scale: 1.2 },
    { x: 3300, y:  95, scale: 0.8 },
    { x: 4500, y: 120, scale: 1.1 },
    { x: 5800, y:  80, scale: 0.9 },
    { x: 7000, y: 115, scale: 1.0 },
    { x: 8200, y:  90, scale: 1.2 },
  ],
};

export const TILE_SIZE    = TILE;
export const GROUND_TOP_Y = GROUND_Y;
