// Bonus — "Up and to the Right". A vertical climb up a centered shaft
// (x=400..1136, y=600..3104) that ends inside a maintenance shed at the
// top. The player emerges from the shed door onto a full-width concrete
// rooftop where THE BOARD waits on a painted helipad H.
//
//   y=0    sky + distant skyline silhouette
//   y=600  CONCRETE ROOFTOP DECK (x=0..1600, one-way from below)
//          props sit on the deck — see `props` field below
//          BOARD boss on helipad H, brand silhouetted against water tower
//   y=600..664   shed interior — shaft cap is hidden here
//   y=664..3040  climbing shaft (zig-zag platforms, ghosts patrol)
//   y=3104       building ground floor — player spawns at (800, 3024)

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
  // Brand sits at the right edge of the arena floor — reachable just by
  // walking once the boss is down. No climbing puzzle.
  brandPos: { x: 1300, y: 600 },
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
    // ---- BUILDING GROUND FLOOR (full width) ----
    ground(0, 1600),

    // ---- SHAFT WALLS — centered, x=400 and x=1136, run from y=664 (just
    // below the rooftop deck) down to ground level. Players climb between
    // these walls. They stop at y=664 (one tile below the deck) so the
    // shed at the top can hide the hole. ----
    ...wallColumn(400,  664, GROUND_Y - 64),
    ...wallColumn(1136, 664, GROUND_Y - 64),

    // ---- ROOFTOP CONCRETE DECK — full width, one-way (player rises
    // through it inside the shed footprint). ----
    { kind: "oneWayFloor", x1: 0, x2: 1600, y: 600, textureKey: "tile_rooftop_concrete" },

    // ---- HIDDEN SHED INTERIOR — two short walls forming the shed's
    // interior + a landing platform inside. Once the player lands on the
    // platform they walk right past x=912 and emerge out the shed door. ----
    ...wallColumn(720, 600, 664),
    ...wallColumn(912, 600, 664),
    platform(816, 664, 2),

    // ---- SHAFT CLIMB PLATFORMS — zig-zag between the shaft walls.
    // The old topmost platform at GROUND_Y-2720 (y=384) is REMOVED — the
    // new arrival point is the landing platform inside the shed (y=664). ----
    platform(520, GROUND_Y - 220,  3),
    platform(900, GROUND_Y - 380,  3),
    platform(560, GROUND_Y - 560,  3),
    platform(900, GROUND_Y - 760,  3),
    platform(540, GROUND_Y - 940,  3),
    platform(900, GROUND_Y - 1140, 3),
    platform(560, GROUND_Y - 1340, 3),
    platform(900, GROUND_Y - 1540, 3),
    platform(540, GROUND_Y - 1740, 3),
    platform(900, GROUND_Y - 1940, 3),
    platform(560, GROUND_Y - 2140, 3),
    platform(900, GROUND_Y - 2340, 3),
    platform(540, GROUND_Y - 2540, 3),

    // ---- BOTTOM WARM-UP BRICKS ----
    brick(580, GROUND_Y - 110),
    brick(960, GROUND_Y - 110),
  ],

  // Declarative rooftop-prop placements. Game.js iterates this and adds an
  // image per entry. All entries use the default origin (0.5, 1.0) so the
  // y-coordinate is the feet on the deck (y=600). Helipad H is NOT here —
  // it's a floor decal rendered separately in the Game.js dressing block.
  // Depths: tower/shed/HVAC/vent -5, dish/antenna -7. Skyline -15, parapet
  // -8 are owned by the dressing block.
  props: [
    { key: "prop_vent_stack",       x: 180,  y: 600, depth: -5 },
    { key: "prop_hvac",             x: 300,  y: 600, depth: -5 },
    { key: "prop_maintenance_shed", x: 816,  y: 600, depth: -5 },
    { key: "prop_water_tower",      x: 1280, y: 600, depth: -5 },
    { key: "prop_satellite_dish",   x: 1280, y: 460, depth: -7 },
    { key: "prop_antenna_mast",     x: 1500, y: 600, depth: -7 },
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
    { x: 1100, y: 540 },  // arena insight — between helipad H and water tower, just above deck
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
