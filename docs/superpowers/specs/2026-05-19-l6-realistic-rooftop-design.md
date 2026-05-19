# L6 Realistic Rooftop — Design Spec

Date: 2026-05-19
Status: Approved, ready for implementation plan
Replaces: prior L6 arena iterations (shaft → staircase → roof → brand composition)

## Problem

Level 6 ends with a vertical climb that exits onto the top of a corporate
tower where **THE BOARD** boss waits. Six successive iterations of the arena
were rejected by the user — feedback in order: *"trash," "still trash," "still
trash because not realistic."* Root cause: the arena floor is rendered with
the steel-girder `tile_shaft_wall` texture (which reads as more shaft, not
roof), there are no rooftop props, and the floor is a floating 800-wide
brick rectangle in the sky with no architectural framing.

This spec replaces the rooftop arena with a flat, full-width concrete deck
furnished with industrial rooftop props (HVAC, water tower, helipad, antenna,
maintenance shed). The shaft climb below the rooftop is untouched.

## Goals

- A first-glance read of "office tower rooftop," not "stacked-brick platform"
- Player physically emerges from a maintenance shed instead of a hole in the
  middle of the arena
- Stay ~80% inside Swiirl's existing flat-vector / purple-palette idiom; bend
  20% toward steel-industrial grey for the props
- Keep the shaft climb experience (y=600..3104) unchanged
- Single-pass implementation — no further iteration on geometry

## Non-goals

- New boss attack pattern (see pending #2)
- Climb-feel polish for the shaft (pending #3)
- Payoff cinematic (pending #4)
- DEV-mode pause-menu row (pending #1)
- Music changes — L6's existing F-lydian track stays
- Mobile-specific UI changes
- New levels or boss
- Backend/leaderboard work

## Architecture summary

Three layers of change, in order of foundationality:

1. **Asset pipeline** (`tools/generate-world.mjs`): nine new SVG-to-PNG
   generators (one tile + eight props). Output to `play/assets/world/`.
2. **Asset registration** (`play/src/scenes/Boot.js`): add the nine new keys
   to `WORLD_IMAGES` and bump `ASSET_VERSION` from `"10"` to `"11"` so the
   immutable CDN cache surfaces the new art.
3. **Level data + scene wiring** (`play/src/levels/level6.js`,
   `play/src/scenes/Game.js`): rewrite the rooftop terrain, add a `props[]`
   field, replace the L6 dressing block with prop-image placements driven by
   `level.props`, and parameterize `buildOneWayFloor` so the rooftop uses the
   new concrete tile.

## Visual design

### Surface

Full-width poured-concrete deck `x=0..1600` at `y=600`. Mottled cool
grey-violet — a desaturated cousin of the existing lilac palette so the
rooftop reads as the same world as L1–L5. Expansion-joint grooves every
three tiles, drain stains, light gravel ballast specks. No brick courses, no
girder windows.

### Layout (top-down at y=600, left-to-right)

```
0           400         800        1200        1600
|=parapet========================================|
|  vent  HVAC  [SHED→]  helipad H   tower  ant   |
|              ▲shaft   ◯boss      ⚓brand   📡  |
|=parapet========================================|
```

| Prop | Position (x, anchor y=600) | Size px | Solid? | Notes |
|---|---|---|---|---|
| Parapet (tiled) | along x=0 and x=1600 edges + front band at y=600 | 64×48 repeating | no | decorative; level bounds already block player |
| Vent stack | 180 | 48×80 | no | cheap silhouette filler, far-left |
| HVAC condenser | 300 | 160×96 | yes | louvered sides, fan top; player can hide behind |
| Maintenance shed | 720 | 192×144 | yes | right-facing door; shaft top emerges inside |
| Helipad H decal | centered 800 (sprite spans 640..960) | 320×96 | no | floor paint, depth below boss |
| Water tower | 1280 | 192×260 | yes (legs collide, body decorative) | wood-stave cylinder, conical roof |
| Satellite dish | 1280, depth-mounted on tower top (~y=460) | 144×128 | no | tilted skyward |
| Antenna mast | 1500 | 64×220 | no | thin lattice, gold blinking tip |

**Boss spawn:** `(800, 600)` — directly on the painted helipad H.
**Brand position:** moves from `(1100, 600)` → `(1300, 600)` — intentionally
silhouetted against the **body** of the water tower (tower is depth -5, brand
sits at default depth above). The brand stands "in front of" the tower as a
composition; the tower's stilts/legs are off-axis so they don't collide
visually with the brand sprite at this x.

### Palette

| Element | Hex | Source |
|---|---|---|
| Concrete deck base | `#9a93a8` mid → `#7f7a90` shadow | new — desaturated lilac family |
| Expansion joints / drain stains | `#5C3BA3` low-alpha | existing deep grape |
| Industrial prop body | `#3A3D44` | existing enemy-industrial grey (cubicle/server-rack/shaft-wall family) |
| Prop deep shadow | `#1F2127` | existing |
| Prop outline | `#5C3BA3` `stroke-width="1.5–2"` | existing Swiirl signature |
| Warning stripe accent | `#FFD24A` | existing insight gold |
| Bubblegum easter-egg accent | `#FF8FBE` | existing |
| Helipad H paint | `#EEE6F5` faded | existing fog |
| Antenna blinking tip | `#FFD24A` | existing |

Every prop renders with origin `(0.5, 1.0)` and a drop-shadow ellipse beneath
its base (existing Swiirl convention).

### Skyline + easter eggs (carryover from current implementation)

- Distant city skyline silhouette graphics block (Game.js lines ~223–249):
  keep as-is, including the mobile skip. It already works.
- Sticky-note container (gold "Q4 plan"): re-anchor from the now-removed
  rooftop-door-pedestal position to the **maintenance shed door**.
- Floating "BOARD MEETING — postponed" memo drift tween: keep unchanged.
- Shooting-star random scheduler: keep unchanged.
- **New:** small vapor-wisp rising off the HVAC vent (rectangle tween,
  mobile-gated). Sells "this thing is running."

## Arrival flow (shaft → shed → rooftop)

The player climbs the shaft as today up to y≈600 (rooftop level). The
topmost shaft platform that previously sat at `GROUND_Y − 2720` (y=384,
above the arena floor) is **removed**. The shaft now terminates **inside the
maintenance shed footprint** at x=720..912, y=664 (one tile below the rooftop
deck). The shed sprite hides this geometry from view.

Mechanically:

- The rooftop concrete deck is a one-way floor: solid from above, passable
  from below — same collision flags as the current `oneWayFloor`. The player
  can rise through it inside the shed footprint.
- The shed sprite is a single image with no physics body — it's decoration.
  Solid collision comes from two short vertical wall columns at x=720 and
  x=912 from y=600 down to y=664, forming the shed's hidden interior.
- A new platform inside the shed at (x=816, y=664, w=2 tiles) gives the
  player a landing surface inside before stepping out the door.
- Once the player walks right past x=912 they emerge onto open concrete.
- Door art on the shed is drawn open (right-facing). No trigger logic, no
  cutscene — purely visual.

## Code changes (file → region)

| File | Region | Change |
|---|---|---|
| `tools/generate-world.mjs` | new section after line 278 (shaft tile) | nine new `svgToPng(...)` generators — one tile + eight props |
| `play/src/scenes/Boot.js` | `WORLD_IMAGES` array (line 30) | add 9 keys |
| `play/src/scenes/Boot.js` | `ASSET_VERSION` (line 11) | `"10"` → `"11"` |
| `play/src/levels/level6.js` | header comment + terrain block (lines 1–105) | rewrite arena: full-width concrete deck, shed shaft cap, prop placements |
| `play/src/levels/level6.js` | new top-level field `props: []` | declarative list of (key, x, y, depth?) for Game.js to render |
| `play/src/levels/level6.js` | `brandPos` | `(1100, 600)` → `(1300, 600)` |
| `play/src/scenes/Game.js` | `buildOneWayFloor` (line 687) | add optional `textureKey` arg, default `tile_shaft_wall` |
| `play/src/scenes/Game.js` | terrain dispatcher (line 147) | pass `t.textureKey` through if present |
| `play/src/scenes/Game.js` | L6 dressing block (lines 213–322) | iterate `level.props` placing images at each entry's depth; tile parapet sprites along edges (left edge, right edge, plus a continuous band at the front rooftop line y=600 — mobile-skip optional); keep skyline + memo + shooting-stars; re-anchor sticky note to shed door; add HVAC vapor wisp (rectangle tween, mobile-gated) |
| `play/src/scenes/Game.js` | Q dev cheat (line 504) | replace hardcoded `GROUND_TOP_Y` with `this.level.brandPos.y` (fixes L6 cosmetic bug noted in SESSION-NOTES) |

## Level data shape

```js
// play/src/levels/level6.js (post-rework)
export const level6 = {
  name: "Up and to the Right",
  width: 1600,
  height: 3200,
  groundY: GROUND_Y,
  spawn: { x: 800, y: GROUND_Y - 80 },
  brandPos: { x: 1300, y: 600 },
  miniBoss: { x: 800, y: 600, health: 18 },
  insightsRequired: 14,
  bossArenaTop: 700,
  bossArenaStart: 99999,
  actTriggers: [...unchanged],
  checkpoints: [],

  terrain: [
    ground(0, 1600),                              // bottom ground (unchanged)
    ...wallColumn(400, 664, GROUND_Y - 64),       // shaft walls (now stop at y=664)
    ...wallColumn(1136, 664, GROUND_Y - 64),
    // Rooftop concrete deck — full width, one-way (passable from below
    // inside the shed footprint).
    { kind: "oneWayFloor", x1: 0, x2: 1600, y: 600, textureKey: "tile_rooftop_concrete" },
    // Hidden shed interior walls + landing platform
    ...wallColumn(720, 600, 664),
    ...wallColumn(912, 600, 664),
    platform(816, 664, 2),
    // Existing shaft climb platforms (kept verbatim)
    platform(520, GROUND_Y - 220, 3),
    // ...through...
    platform(540, GROUND_Y - 2540, 3),
    // (the old top-of-shaft platform at GROUND_Y - 2720 is REMOVED)
    brick(580, GROUND_Y - 110),                   // warm-up bricks unchanged
    brick(960, GROUND_Y - 110),
  ],

  // NEW field — declarative discrete prop placements. Game.js iterates this
  // and adds a sprite per entry. Parapet is NOT here — it's rendered
  // programmatically by Game.js's L6 dressing block (tiled along the edges).
  // Depths: helipad -6, props -5, dish/antenna -7. Parapet (in dressing) -8.
  // Skyline (in dressing) -15.
  props: [
    { key: "prop_vent_stack",       x: 180,  y: 600, depth: -5 },
    { key: "prop_hvac",             x: 300,  y: 600, depth: -5 },
    { key: "prop_maintenance_shed", x: 816,  y: 600, depth: -5 },
    { key: "prop_helipad_h",        x: 800,  y: 600, depth: -6 },
    { key: "prop_water_tower",      x: 1280, y: 600, depth: -5 },
    { key: "prop_satellite_dish",   x: 1280, y: 460, depth: -7 },
    { key: "prop_antenna_mast",     x: 1500, y: 600, depth: -7 },
  ],

  enemies: [...unchanged],
  insights: [
    // ...existing 13 climb insights unchanged...
    // The 14th (final, arena-side) insight moves from (800, 320) — which
    // was floating in mid-air above the old arena — down onto the rooftop
    // plane, hovering between the helipad and the water tower so the
    // player has to walk past the boss to grab it.
    { x: 1100, y: 540 },
  ],
  signals: [...unchanged],
  clouds: [...unchanged],
};
```

## Implementation order

1. **Generate art first.** Add the 9 SVG generators to
   `tools/generate-world.mjs`; run `npm run generate-world`; eyeball the
   PNGs in `play/assets/world/`. Iterate on SVG until each prop reads
   correctly in isolation. (Concrete tile is the most important — get it
   right before placing it.)
2. **Register assets.** Add keys to `Boot.js` `WORLD_IMAGES`, bump
   `ASSET_VERSION`.
3. **Parameterize `buildOneWayFloor`.** Add optional `textureKey` arg,
   thread `t.textureKey` through the terrain dispatcher.
4. **Rewrite `level6.js` terrain.** Strip arena bricks, add full-width
   concrete band, shed interior walls, landing platform; add `props[]`.
5. **Rewrite Game.js L6 dressing.** Replace pedestal door graphic with a
   `level.props.forEach` loop; re-anchor sticky to shed; add HVAC vapor
   wisp; fix Q-cheat y-coordinate.
6. **Playtest.** `npm run dev`, `B`-cheat into L6, walk the rooftop. Verify
   parapet doesn't visually conflict with the shed/tower, helipad H
   readability under the boss sprite, that the shed-door arrival reads
   correctly (no visible hole), Q-cheat lands at the correct y.
7. **Mobile sanity check.** Confirm IS_MOBILE-gated skyline + HVAC vapor
   still skip; rooftop is performant.

## Testing & verification

There is no test runner — verification is manual at `http://localhost:3000/play/`.

- `B` cheat key teleports to L6 arena — eyeball-test rooftop composition
- `Q` cheat key — confirm player lands at the brand's actual y (no longer
  56px floating)
- Full climb from spawn to rooftop — verify nothing under y=600 changed,
  player emerges through the shed without seeing the shaft hole
- Boss fight on the helipad — visually centered, no prop-collision
  surprises
- Skyline + memo + shooting stars + sticky on shed door — easter eggs all
  fire as before
- Mobile (Chrome DevTools touch emulation): skyline + vapor wisp skipped,
  rooftop still readable

## Files touched

```
tools/generate-world.mjs
play/src/scenes/Boot.js
play/src/levels/level6.js
play/src/scenes/Game.js
play/assets/world/  (9 new PNGs generated)
```

## Risks

- **SVG iteration cost.** The concrete tile and HVAC/water-tower props are
  the highest-stakes pieces of art; if they don't land, the whole rooftop
  fails. Mitigation: render and review each prop in isolation before
  placing it in-game, and treat the concrete tile as a separate review
  loop from the props.
- **Helipad H readability under the boss.** The boss sprite is large
  (scale 1.6×). At default placement on x=800, the H may be fully covered.
  Mitigation: helipad H sprite is 320 wide so the circle extends well
  beyond the boss footprint; depth ordering puts H below the boss.
- **Parapet ↔ corner-prop collision.** The parapet runs along x=0/x=1600;
  the antenna sits at x=1500. Eyeball during playtest; if the parapet
  occludes the antenna base, drop the antenna depth below the parapet.

## Open follow-ups (deferred, not part of this spec)

- The `props[]` declarative format introduced here could later replace the
  hand-coded easter-egg containers (sticky note, memo, stars) for
  consistency — out of scope for this change.
- Boss new attack (pending #2) and climb-feel polish (pending #3) layer
  cleanly on top of this work without conflict.
