// Bonus — "Up and to the Right". A vertical climb that ends in a wide
// boss arena ("Arena Bowl" layout):
//
//   x:    0 .................. 400 ... 1200 .................. 1600
//   y=0   |   sky    |          | brand   |          |   sky    |
//                                  ↑
//                              ARENA  (full 1600 wide, floor at y=600)
//   y=600                          ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
//   y=600                          █ shaft walls (x=400 + x=1136)
//   y=...                          █                █
//   y=...                          █  climb route  █
//   y=...                          █                █
//   y=3040                         █                █
//   y=3104                ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
//                                       FLOOR
//
// THE BOARD waits on the arena floor (y=600). Two approach platforms
// stagger the way to the brand at the top center. Decorative shaft-wall
// pillars at the outer edges (x=64, x=1472) frame the arena.

const TILE = 64;
const GROUND_Y = 3104;

const ground   = (x1, x2)       => ({ kind: "ground", x: x1, w: x2 - x1 });
const platform = (x, y, wTiles) => ({ kind: "platform", x, y, w: wTiles });
const brick    = (x, y)         => ({ kind: "brick", x, y });

// Vertical wall column of shaftBrick tiles between y1 and y2 at fixed x.
function wallColumn(x, yTop, yBottom) {
  const out = [];
  for (let y = yTop; y < yBottom; y += TILE) {
    out.push({ kind: "shaftBrick", x, y });
  }
  return out;
}

// Horizontal floor strip of shaftBrick tiles between x1 and x2 at fixed y.
// Used for the arena floor (caps the shaft + extends sideways into the bowl).
function floorStrip(x1, x2, y) {
  const out = [];
  for (let x = x1; x < x2; x += TILE) {
    out.push({ kind: "shaftBrick", x, y });
  }
  return out;
}

export const level6 = {
  name: "Up and to the Right",
  width: 1600,
  height: 3200,
  groundY: GROUND_Y,
  // Spawn inside the centered shaft (x=464–1136 interior, center=800).
  spawn: { x: 800, y: GROUND_Y - 80 },
  // Brand sits on the rooftop above the center staircase hole.
  brandPos: { x: 688, y: 200 },
  miniBoss: { x: 800, y: 600, health: 18 },
  insightsRequired: 14,
  bossArenaTop: 700,
  bossArenaStart: 99999,

  actTriggers: [
    { x: 0, y: 2200, banner: "Act 2 — Middle Management" },
    { x: 0, y: 1100, banner: "Act 3 — Executive Floor" },
  ],
  checkpoints: [],

  terrain: [
    // ---- BOTTOM FLOOR (full width) ----
    ground(0, 1600),

    // ---- SHAFT WALLS (centered, x=400 and x=1136, from arena down to floor) ----
    ...wallColumn(400, 600, GROUND_Y - 64),
    ...wallColumn(1136, 600, GROUND_Y - 64),

    // ---- ARENA FLOOR — trimmed centered band x=400-1200 (~800 wide).
    // Boss has plenty of room; less brick clutter at the edges.
    { kind: "oneWayFloor", x1: 400, x2: 1200, y: 600 },

    // (No roof — open sky above. Player jumps from the upper staircase
    // step directly to the brand.)

    // ---- STAIRCASE TO THE ROOF — two centered steps stacked directly
    // under the roof hole. Same x range so the climb reads as 'stairs'
    // not 'scattered platforms.' Each drop = 140px (single-jump 176px
    // covers cleanly). Player walks the arena floor, jumps up onto step
    // one, then step two, then straight up through the hole to brand.
    platform(560, 460, 4),               // step 1 — middle stair (y=460, x=560-816)
    platform(560, 320, 4),               // step 2 — top stair under hole (y=320, x=560-816)

    // ---- SHAFT CLIMB PLATFORMS (zig-zag inside the shaft interior, x 464–1136) ----
    platform(520, GROUND_Y - 220, 3),
    platform(900, GROUND_Y - 380, 3),
    platform(560, GROUND_Y - 560, 3),
    platform(900, GROUND_Y - 760, 3),
    platform(540, GROUND_Y - 940, 3),
    platform(900, GROUND_Y - 1140, 3),
    platform(560, GROUND_Y - 1340, 3),
    platform(900, GROUND_Y - 1540, 3),
    platform(540, GROUND_Y - 1740, 3),
    platform(900, GROUND_Y - 1940, 3),
    platform(560, GROUND_Y - 2140, 3),
    platform(900, GROUND_Y - 2340, 3),
    platform(540, GROUND_Y - 2540, 3),
    platform(680, GROUND_Y - 2720, 4),

    // ---- BOTTOM WARM-UP ----
    brick(580, GROUND_Y - 110),
    brick(960, GROUND_Y - 110),
  ],

  enemies: [
    // Ghosts patrol horizontally inside the climbing shaft (x 464–1136).
    { type: "ghost", x: 800, y: GROUND_Y - 580, range: 200 },
    { type: "ghost", x: 800, y: GROUND_Y - 1180, range: 200 },
    { type: "ghost", x: 800, y: GROUND_Y - 1780, range: 200 },
    { type: "ghost", x: 800, y: GROUND_Y - 2380, range: 200 },
    // Paperwork pile on the floor — first taste of combat.
    { type: "paperwork", x: 1000, y: GROUND_Y },
  ],

  // Insights line the climbing path (centered around x=800 with side offsets).
  insights: [
    { x: 600, y: GROUND_Y - 260 },
    { x: 960, y: GROUND_Y - 420 },
    { x: 620, y: GROUND_Y - 600 },
    { x: 960, y: GROUND_Y - 800 },
    { x: 600, y: GROUND_Y - 980 },
    { x: 960, y: GROUND_Y - 1180 },
    { x: 620, y: GROUND_Y - 1380 },
    { x: 960, y: GROUND_Y - 1580 },
    { x: 600, y: GROUND_Y - 1780 },
    { x: 960, y: GROUND_Y - 1980 },
    { x: 620, y: GROUND_Y - 2180 },
    { x: 960, y: GROUND_Y - 2380 },
    { x: 750, y: GROUND_Y - 2760 },
    { x: 800, y: 320 },  // inside the arena, between approach platforms
  ],

  signals: [
    { type: "speed",  x: 800, y: GROUND_Y - 1440 },
    { type: "growth", x: 800, y: GROUND_Y - 2640 },
  ],

  clouds: [
    { x: 200, y: 280, scale: 0.7 },
    { x: 1280, y: 360, scale: 0.9 },
    { x: 480, y: 180, scale: 0.8 },
    { x: 1100, y: 240, scale: 0.7 },
  ],
};
