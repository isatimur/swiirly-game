// Bonus — "Up and to the Right". A vertical climb that finally puts the
// wall-jump and double-jump to work. Two brick columns form a 3200-tall
// shaft; alternating platforms zig-zag up the gap. Player climbs from
// floor (y=3100) to brand (y=80). Falling = restart at bottom.
//
// Theme: the corporate ladder, literalized. Reached by beating L5.
//
// POSITIONING CONVENTION (same as horizontal levels):
//   * Origin (0.5, 1.0) on world sprites — y is the feet.
//   * Tile size 64. GROUND_Y = 3104 (floor of the shaft).
//   * Camera follows the player vertically (Phaser handles this once we
//     set bounds via lvl.height = 3200).

const TILE = 64;
const GROUND_Y = 3104;

const ground   = (x1, x2)       => ({ kind: "ground", x: x1, w: x2 - x1 });
const platform = (x, y, wTiles) => ({ kind: "platform", x, y, w: wTiles });
const brick    = (x, y)         => ({ kind: "brick", x, y });

// Vertical wall = stacked bricks at a fixed x column from y1 down to y2.
// Bricks are 64×64; player wall-jumps off the side. Intermediate ledges
// double as rest stops if you need to pause and look up.
function wallColumn(x, yTop, yBottom) {
  const out = [];
  for (let y = yTop; y < yBottom; y += TILE) {
    out.push(brick(x, y));
  }
  return out;
}

export const level6 = {
  name: "Up and to the Right",
  width: 800,
  height: 3200,
  // Spawn at the bottom-center, falling in from just above the floor.
  spawn: { x: 400, y: GROUND_Y - 80 },
  brandPos: { x: 400, y: 120 },
  // No boss in the bonus run — the climb itself is the boss.
  miniBoss: null,
  insightsRequired: 14,
  // Pushed above the world height so the boss-arena trigger never fires.
  bossArenaStart: 99999,

  // Act banners trigger as the player passes vertical milestones.
  actTriggers: [
    { x: 0, y: 2200, banner: "Act 2 — Middle Management" },
    { x: 0, y: 1100, banner: "Act 3 — Executive Floor" },
  ],
  checkpoints: [],

  terrain: [
    // Floor strip.
    ground(0, 800),
    // Left + right walls. y starts at 120 so the very top is clear for
    // the brand reveal. Bricks fill from 120 down to GROUND_Y-64.
    ...wallColumn(0, 120, GROUND_Y - 64),
    ...wallColumn(736, 120, GROUND_Y - 64),

    // Climbing platforms, zig-zagging up the shaft. Each pair (left/right)
    // is roughly 200 px apart vertically — within a chained double-jump
    // (~329 px) so a clean run reads as a rhythm.
    platform(120, GROUND_Y - 220, 3),
    platform(500, GROUND_Y - 380, 3),
    platform(160, GROUND_Y - 560, 3),
    platform(500, GROUND_Y - 760, 3),
    platform(140, GROUND_Y - 940, 3),
    platform(500, GROUND_Y - 1140, 3),
    platform(160, GROUND_Y - 1340, 3),
    platform(500, GROUND_Y - 1540, 3),
    platform(140, GROUND_Y - 1740, 3),
    platform(500, GROUND_Y - 1940, 3),
    platform(160, GROUND_Y - 2140, 3),
    platform(500, GROUND_Y - 2340, 3),
    platform(140, GROUND_Y - 2540, 3),
    platform(280, GROUND_Y - 2720, 4),  // wider — final rest stop
    platform(280, GROUND_Y - 2900, 4),  // approach to the brand
  ],

  enemies: [
    // Floating ghosts patrol horizontally at altitude — force the player
    // to time their wall-jumps. Three checkpoints, one per "act."
    { type: "ghost",       x: 400, y: GROUND_Y - 580, range: 200 },
    { type: "ghost",       x: 400, y: GROUND_Y - 1180, range: 200 },
    { type: "ghost",       x: 400, y: GROUND_Y - 1780, range: 200 },
    { type: "ghost",       x: 400, y: GROUND_Y - 2380, range: 200 },
    // One paperwork pile on the floor — first taste of combat.
    { type: "paperwork",   x: 600, y: GROUND_Y },
  ],

  // Insights line the climbing path so following the visual breadcrumb is
  // the same as following the optimal climb route. 14 total (matches
  // insightsRequired so a clean run delivers the brand at the top).
  insights: [
    { x: 200, y: GROUND_Y - 260 },
    { x: 560, y: GROUND_Y - 420 },
    { x: 220, y: GROUND_Y - 600 },
    { x: 560, y: GROUND_Y - 800 },
    { x: 200, y: GROUND_Y - 980 },
    { x: 560, y: GROUND_Y - 1180 },
    { x: 220, y: GROUND_Y - 1380 },
    { x: 560, y: GROUND_Y - 1580 },
    { x: 200, y: GROUND_Y - 1780 },
    { x: 560, y: GROUND_Y - 1980 },
    { x: 220, y: GROUND_Y - 2180 },
    { x: 560, y: GROUND_Y - 2380 },
    { x: 350, y: GROUND_Y - 2760 },
    { x: 350, y: GROUND_Y - 2940 },
  ],

  signals: [
    // Speed boost at mid-climb to telegraph "you're halfway."
    { type: "speed",  x: 400, y: GROUND_Y - 1440 },
    // Growth signal near the top for the final push.
    { type: "growth", x: 400, y: GROUND_Y - 2640 },
  ],

  clouds: [
    // Sparse — the climb gets quieter as you go up. Clouds drift past
    // the windows at the top giving a sense of altitude.
    { x: 200, y: 280, scale: 0.7 },
    { x: 580, y: 480, scale: 0.9 },
    { x: 260, y: 760, scale: 0.6 },
  ],
};
