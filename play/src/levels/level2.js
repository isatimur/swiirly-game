// Corporate Maze — level 2.
// Higher difficulty: wider pits, denser enemies, 4-stomp boss.

const TILE = 64;
const GROUND_Y = 656;

const ground   = (x1, x2)       => ({ kind: "ground",   x: x1, w: x2 - x1 });
const platform = (x, y, wTiles) => ({ kind: "platform",  x, y,  w: wTiles  });
const brick    = (x, y)         => ({ kind: "brick",     x, y               });
const bouncePad = (x, y)        => ({ kind: "bouncePad", x, y               });
const conveyor = (x, y, wTiles, dir) => ({ kind: "conveyor", x, y, w: wTiles, dir });
// Vertical fast-track lift: dir -1 carries up, +1 carries down. y = top of the
// topmost tile; column spans hTiles*64 downward. Ride-through (not solid).
const lift = (x, y, hTiles, dir) => ({ kind: "lift", x, y, h: hTiles, dir });
const cubicle  = (x)            => ({ kind: "obstacle", x, texture: "obstacle_cubicle_wall" });

const LOW  = 70;
const MID  = 200;
const HIGH = 320;

export const level2 = {
  name: "Corporate Maze",
  width: 8800,
  height: 720,
  spawn: { x: 100, y: GROUND_Y - 100 },
  brandPos: { x: 8580, y: GROUND_Y },
  miniBoss: { x: 7800, y: GROUND_Y, health: 4 },
  insightsRequired: 15,
  bossArenaStart: 7400,

  actTriggers: [
    { x: 3000, banner: "Act 2 — Cubicle Maze" },
    { x: 6500, banner: "Act 3 — Executive Floor" },
  ],
  checkpoints: [
    { after: 1600, respawnX: 1800 },
    { after: 3100, respawnX: 3200 },
    { after: 6200, respawnX: 6400 },
  ],

  // ============================================================
  // TERRAIN
  // ============================================================
  terrain: [
    // --- Act 1 ---
    ground(0, 1500),
    cubicle(380),                   // first office cubicle — intro
    platform(550, GROUND_Y - 150, 3),
    platform(850, GROUND_Y - 280, 3),
    brick(1100, GROUND_Y - 120),
    brick(1164, GROUND_Y - 180),
    brick(1228, GROUND_Y - 240),
    brick(1292, GROUND_Y - 300),
    // pit 1500–1800 — FAST TRACK "Boost Bridge": run across low, OR take the
    // high express → down-lift elevator onto solid ground (both forward = safe).
    conveyor(1510, GROUND_Y - 70, 4, 1),    // low bridge across the pit
    conveyor(1550, GROUND_Y - 250, 4, 1),   // high express lane → feeds the down-lift
    lift(1820, GROUND_Y - 250, 3, 1),       // down-lift elevator, lands on ground(1800–2800)
    ground(1800, 2800),
    platform(2100, GROUND_Y - 170, 4),
    platform(2400, GROUND_Y - 320, 3),
    bouncePad(1900, GROUND_Y - 64),  // helps reach the high platform at -320
    conveyor(2300, GROUND_Y - 250, 4, 1),   // forward-pushing belt at altitude
    brick(2600, GROUND_Y - 140),
    brick(2664, GROUND_Y - 140),

    // --- Act 2 ---
    // pit 2800–3200 — FAST TRACK "Double-Decker Express" (both forward = safe over a pit)
    conveyor(2810, GROUND_Y - 70, 5, 1),    // low bridge across the pit
    conveyor(2870, GROUND_Y - 250, 4, 1),   // high express skyway / reward lane
    ground(3200, 4400),
    cubicle(3320),                  // cubicle maze entry
    conveyor(3700, GROUND_Y - 200, 3, -1),  // BACKWARD belt — challenge!
    platform(3350, GROUND_Y - 140, 3),
    platform(3650, GROUND_Y - 260, 4),
    platform(4000, GROUND_Y - 360, 3),
    platform(4300, GROUND_Y - 260, 3),
    brick(3850, GROUND_Y - 220),
    brick(3914, GROUND_Y - 300),
    ground(4500, 5800),
    brick(4800, GROUND_Y - 220),
    brick(4864, GROUND_Y - 220),
    brick(4928, GROUND_Y - 220),
    brick(4736, GROUND_Y - 360),
    brick(4992, GROUND_Y - 360),
    lift(5080, GROUND_Y - 300, 4, -1),       // FAST TRACK up-lift — elevator to the upper route (over solid ground)
    platform(5200, GROUND_Y - 230, 3),
    platform(5500, GROUND_Y - 340, 3),
    cubicle(5360),                  // mid-act navigation beat

    // pit 5800–6200
    ground(6000, 6400),
    brick(6050, GROUND_Y - 140),
    brick(6200, GROUND_Y - 220),
    platform(6450, GROUND_Y - 210, 4),
    platform(6750, GROUND_Y - 330, 3),

    // --- Act 3 ---
    ground(6950, 8800),
    cubicle(8180),                  // post-Mike, en route to brand
  ],

  // ============================================================
  // ENEMIES
  // ============================================================
  enemies: [
    // Act 1
    { type: "jargon_blob", x:  620, y: GROUND_Y, range: 160 },
    { type: "jargon_blob", x: 1200, y: GROUND_Y, range:  80 },
    { type: "jargon_blob", x: 2150, y: GROUND_Y, range: 140 },

    // Act 2
    { type: "ghost",       x: 3700, y: GROUND_Y - 260, range: 130 },
    { type: "ghost",       x: 4100, y: GROUND_Y - 320, range: 100 },
    { type: "ghost",       x: 4600, y: GROUND_Y - 200, range:  80 },
    { type: "paperwork",   x: 4900, y: GROUND_Y },
    { type: "jargon_blob", x: 5200, y: GROUND_Y, range: 180 },
    { type: "paperwork",   x: 5500, y: GROUND_Y },

    // Act 3
    { type: "jargon_blob", x: 7000, y: GROUND_Y, range: 90  },
    { type: "ghost",       x: 7200, y: GROUND_Y - 200, range: 100 },
    { type: "jargon_blob", x: 7320, y: GROUND_Y, range: 70  },
    { type: "paperwork",   x: 7600, y: GROUND_Y },
    { type: "jargon_blob", x: 8100, y: GROUND_Y, range: 60  },
  ],

  // ============================================================
  // INSIGHTS
  // ============================================================
  insights: [
    // Act 1 (7)
    { x:  280, y: GROUND_Y - LOW },
    { x:  420, y: GROUND_Y - LOW },
    { x:  600, y: GROUND_Y - 190 },
    { x:  880, y: GROUND_Y - 320 },
    { x: 1150, y: GROUND_Y - 160 },
    { x: 2000, y: GROUND_Y - LOW },
    { x: 2450, y: GROUND_Y - 360 },

    // Act 2 (11)
    { x: 3400, y: GROUND_Y - 170 },
    { x: 3700, y: GROUND_Y - 300 },
    { x: 4050, y: GROUND_Y - 400 },
    { x: 4350, y: GROUND_Y - 300 },
    { x: 4850, y: GROUND_Y - 240 },
    { x: 4800, y: GROUND_Y - 400 },
    { x: 4928, y: GROUND_Y - 400 },
    { x: 5250, y: GROUND_Y - 270 },
    { x: 5550, y: GROUND_Y - 380 },
    { x: 6490, y: GROUND_Y - 250 },
    { x: 6800, y: GROUND_Y - 370 },

    // Act 3 (4)
    { x: 7150, y: GROUND_Y - LOW },
    { x: 7350, y: GROUND_Y - LOW },
    { x: 7550, y: GROUND_Y - LOW },
    { x: 8280, y: GROUND_Y - LOW },
  ],

  // ============================================================
  // SIGNALS
  // ============================================================
  signals: [
    { type: "speed",  x: 2200, y: GROUND_Y - MID  },
    { type: "shield", x: 4550, y: GROUND_Y - 180  },
    { type: "growth", x: 6800, y: GROUND_Y - HIGH },
  ],

  // ============================================================
  // DECOR
  // ============================================================
  clouds: [
    { x:  300, y: 120, scale: 0.9 },
    { x:  900, y:  80, scale: 1.1 },
    { x: 1800, y: 140, scale: 0.8 },
    { x: 2800, y: 100, scale: 1.2 },
    { x: 3800, y: 130, scale: 0.9 },
    { x: 5000, y:  90, scale: 1.0 },
    { x: 6200, y: 120, scale: 1.1 },
    { x: 7400, y:  80, scale: 0.9 },
  ],
};

export const TILE_SIZE   = TILE;
export const GROUND_TOP_Y = GROUND_Y;
