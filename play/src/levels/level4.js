// Data Lake — level 4.
// Cyan/teal atmosphere. Introduces DeadlineBot. Dense server-room theme.

const TILE = 64;
const GROUND_Y = 656;

const ground   = (x1, x2)       => ({ kind: "ground",   x: x1, w: x2 - x1 });
const platform = (x, y, wTiles) => ({ kind: "platform",  x, y,  w: wTiles  });
const brick    = (x, y)         => ({ kind: "brick",     x, y               });
const rack     = (x)            => ({ kind: "obstacle", x, texture: "obstacle_server_rack" });

const LOW  = 70;
const MID  = 200;
const HIGH = 320;

export const level4 = {
  name: "Data Lake",
  width: 10500,
  height: 720,
  spawn: { x: 100, y: GROUND_Y - 100 },
  brandPos: { x: 10280, y: GROUND_Y },
  miniBoss: { x: 9500, y: GROUND_Y, health: 5 },
  insightsRequired: 20,
  bossArenaStart: 9100,

  actTriggers: [
    { x: 3500, banner: "Act 2 — The Data Swamp" },
    { x: 7500, banner: "Act 3 — Core Processor" },
  ],
  checkpoints: [
    { after: 1800, respawnX: 2000 },
    { after: 3600, respawnX: 3800 },
    { after: 7600, respawnX: 7800 },
  ],

  // ============================================================
  // TERRAIN
  // ============================================================
  terrain: [
    // --- Act 1 ---
    ground(0, 1600),
    rack(400),                        // first server rack on the floor
    platform(500,  GROUND_Y - 160, 3),
    platform(800,  GROUND_Y - 290, 4),
    platform(1200, GROUND_Y - 190, 3),
    brick(1400, GROUND_Y - 220),
    brick(1464, GROUND_Y - 320),
    rack(1280),                       // mid-act rack lane
    // pit 1600–2000
    ground(2000, 3200),
    rack(2120),                       // post-pit landing
    platform(2200, GROUND_Y - 150, 3),
    platform(2500, GROUND_Y - 280, 4),
    brick(2750, GROUND_Y - 220),
    brick(2814, GROUND_Y - 220),
    brick(2878, GROUND_Y - 220),
    rack(3020),                       // pre-pit obstacle
    // pit 3200–3700
    ground(3700, 5200),
    platform(3900, GROUND_Y - 180, 3),
    platform(4200, GROUND_Y - 320, 4),
    brick(4500, GROUND_Y - 220),
    brick(4564, GROUND_Y - 220),
    brick(4628, GROUND_Y - 220),
    brick(4436, GROUND_Y - 360),
    brick(4692, GROUND_Y - 360),
    rack(4920),                       // mid-act rack
    rack(5060),                       // double — server hallway feel

    // --- Act 2 ---
    // pit 5200–5700
    ground(5700, 7000),
    rack(5820),                       // post-pit entry
    platform(5900, GROUND_Y - 160, 3),
    platform(6200, GROUND_Y - 300, 4),
    platform(6600, GROUND_Y - 220, 3),
    brick(5800, GROUND_Y - 220),
    brick(5864, GROUND_Y - 220),
    brick(6800, GROUND_Y - 220),
    brick(6864, GROUND_Y - 300),
    rack(6940),                       // pre-pit
    // pit 7000–7500
    ground(7500, 8000),
    platform(7600, GROUND_Y - 200, 3),
    platform(7900, GROUND_Y - 340, 4),

    // pit 8000 partial — stepping stones
    ground(8000, 8500),
    brick(8100, GROUND_Y - 220),
    brick(8300, GROUND_Y - 220),

    // --- Act 3 ---
    ground(8500, 10500),
    rack(8620),                       // Core Processor arena entry
    rack(10080),                      // post-Algorithm cooldown
  ],

  // ============================================================
  // ENEMIES
  // ============================================================
  enemies: [
    // Act 1 — introduce DeadlineBot
    { type: "jargon_blob",   x:  550, y: GROUND_Y, range: 130 },
    { type: "deadline_bot",  x:  900, y: GROUND_Y, range:  80 },
    { type: "jargon_blob",   x: 1300, y: GROUND_Y, range: 100 },
    { type: "deadline_bot",  x: 2300, y: GROUND_Y, range: 120 },
    { type: "ghost",         x: 2700, y: GROUND_Y - 240, range: 100 },
    { type: "jargon_blob",   x: 3000, y: GROUND_Y, range:  80 },

    // Act 2
    { type: "deadline_bot",  x: 4000, y: GROUND_Y, range: 150 },
    { type: "ghost",         x: 4300, y: GROUND_Y - 360, range: 100 },
    { type: "paperwork",     x: 4600, y: GROUND_Y },
    { type: "jargon_blob",   x: 5000, y: GROUND_Y, range: 160 },
    { type: "deadline_bot",  x: 5900, y: GROUND_Y, range: 100 },
    { type: "ghost",         x: 6300, y: GROUND_Y - 280, range: 120 },
    { type: "paperwork",     x: 6700, y: GROUND_Y },
    { type: "ghost",         x: 7600, y: GROUND_Y - 200, range:  80 },
    { type: "paperwork",     x: 7900, y: GROUND_Y },

    // Act 3
    { type: "jargon_blob",   x: 8600, y: GROUND_Y, range: 80  },
    { type: "deadline_bot",  x: 8900, y: GROUND_Y, range: 100 },
    { type: "ghost",         x: 9200, y: GROUND_Y - 200, range:  80 },
    { type: "jargon_blob",   x: 9700, y: GROUND_Y, range:  60 },
  ],

  // ============================================================
  // INSIGHTS
  // ============================================================
  insights: [
    // Act 1 (7)
    { x:  240, y: GROUND_Y - LOW },
    { x:  380, y: GROUND_Y - LOW },
    { x:  540, y: GROUND_Y - 200 },
    { x:  840, y: GROUND_Y - 330 },
    { x: 1230, y: GROUND_Y - 230 },
    { x: 2250, y: GROUND_Y - 190 },
    { x: 2540, y: GROUND_Y - 320 },

    // Act 2 (9)
    { x: 3750, y: GROUND_Y - 220 },
    { x: 3940, y: GROUND_Y - LOW },
    { x: 4240, y: GROUND_Y - 360 },
    { x: 4540, y: GROUND_Y - 260 },
    { x: 4540, y: GROUND_Y - 400 },
    { x: 4628, y: GROUND_Y - 400 },
    { x: 5960, y: GROUND_Y - 200 },
    { x: 6240, y: GROUND_Y - 340 },
    { x: 7630, y: GROUND_Y - 240 },

    // Act 3 (4)
    { x: 8650, y: GROUND_Y - LOW },
    { x: 8800, y: GROUND_Y - LOW },
    { x: 9100, y: GROUND_Y - LOW },
    { x: 9300, y: GROUND_Y - LOW },
  ],

  // ============================================================
  // SIGNALS
  // ============================================================
  signals: [
    { type: "speed",  x: 2600, y: GROUND_Y - MID  },
    { type: "shield", x: 5100, y: GROUND_Y - 180  },
    { type: "growth", x: 7900, y: GROUND_Y - HIGH },
  ],

  // ============================================================
  // DECOR
  // ============================================================
  clouds: [
    { x:  400, y: 100, scale: 0.9 },
    { x: 1000, y:  80, scale: 1.1 },
    { x: 2100, y: 130, scale: 0.8 },
    { x: 3400, y:  90, scale: 1.0 },
    { x: 4700, y: 120, scale: 1.2 },
    { x: 6000, y:  75, scale: 0.9 },
    { x: 7200, y: 110, scale: 1.0 },
    { x: 8400, y:  85, scale: 1.1 },
    { x: 9500, y: 100, scale: 0.8 },
  ],
};

export const TILE_SIZE    = TILE;
export const GROUND_TOP_Y = GROUND_Y;
