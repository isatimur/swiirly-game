# Level Polish Pass — Design Spec

Date: 2026-05-20
Status: Approved, ready for implementation plan
Scope: 15 verified fixes across Levels 1–5 (audit-driven)

## Problem

A 6-agent per-level audit surfaced 20 candidate issues. Verification against
the actual level files cut 5 as bogus (left/right confusion, a non-existent
"death pit," already-implemented conveyor arrows, an insight-math error, an
"insight floats" non-issue). The 15 survivors are real and each has an exact
file:line and a concrete fix. This spec consolidates them so they ship as one
coherent polish pass.

## Verification notes (why these 15, not 20)

Dropped on inspection:
- **L1 "backwards telegraph"** — signal x=2050 is right of enemy x=1900; ordering is correct.
- **L4 "stepping-stone death-pit"** — `ground(8000,8500)` is solid continuous ground; bricks are optional elevation. A stale `// pit 8000 partial` comment misled the audit.
- **L6 "14th insight floats"** — insights float 60–400px above ground in every level by design.
- **L3 "Act 3 insights non-optional"** — Act1+Act2 = 21 insights ≥ 18 required, so Act 3's are skippable.
- **L2 "conveyors need direction arrows"** — `buildConveyor` (Game.js:865) already renders animated marching ▶/◀ arrows.

## Goals

- Remove dead stretches and thin gauntlets (pacing)
- Add missing boss/hazard telegraphs (fairness)
- Give the L5 finale a sense of place (skyline backdrop)
- Polish signal/checkpoint/tint details that lift overall cohesion

## Non-goals

- L5 marble-prop overhaul + brand pedestal — deferred to its own design pass
- L5 falling-shard haptic/audio cue (audit item "M12") — deferred; not part of the approved 15
- New enemies, new bosses, new mechanics
- Any L6 change — L6 just shipped and audited clean
- Firestore leaderboard (separate spec, paused)

## The 15 fixes

Severity: **High** = materially changes pacing/fairness. **Medium** = noticeable
polish. **Low** = cosmetic / minor tuning.

### HIGH

#### H1 — L1 Act 1 dead stretch
`play/src/levels/level1.js` enemies array (lines 106–121). Act 1 has a 400px
coast between the enemy at x=700 and the next at x=1900, across the empty
`ground(1500,2400)` span.
**Fix:** add one enemy on the solid `ground(1500,2400)` span:
```js
{ type: "jargon_blob", x: 1750, y: GROUND_Y, range: 90 },
```
Insert it in the Act 1 group (after the x=700 blob). NOT x=1400 — that x is
inside the pit (1280–1500) and an enemy there would fall.

#### H3 — L2 Act 3 gauntlet too compressed
`play/src/levels/level2.js` enemies array (lines 110–114). The pre-boss-arena
runway (boss arena starts x=7400) has only two enemies crammed at x=7100 and
x=7300. Act 3 ground is `ground(6950,8800)`.
**Fix:** spread the runway enemies across x=6950–7350. Replace lines 111–114
Act 3 block with:
```js
// Act 3
{ type: "jargon_blob", x: 7000, y: GROUND_Y, range: 90  },
{ type: "ghost",       x: 7200, y: GROUND_Y - 200, range: 100 },
{ type: "jargon_blob", x: 7320, y: GROUND_Y, range: 70  },
{ type: "paperwork",   x: 7600, y: GROUND_Y },
{ type: "jargon_blob", x: 8100, y: GROUND_Y, range: 60  },
```
(One enemy added — the x=7320 blob — and the first two shifted left so the
6950–7400 runway holds three encounters instead of two.)

#### H4 — L5 finale has no sense of place
`play/src/scenes/Game.js`. The L5 C-Suite finale (x ≥ 9200) is flat ground
with one isolated marble pillar. SESSION-NOTES pending #7 flagged this.
**Fix (skyline backdrop only):** add an L5-specific dressing block modeled on
the L6 skyline graphics (Game.js lines ~223–249). Inside a new
`if (this.levelNum === 5) { ... }` block:
- Draw a city-skyline silhouette — staggered dark rectangles with lit gold
  windows — as a depth -15 graphics object, mobile-gated (`!IS_MOBILE`).
- Building x-coordinates span the C-Suite finale region: world x ≈ 9000–11500
  (offset the L6 building array by +9000, or author a fresh array for that
  range). Buildings drawn from a baseline `y = GROUND_TOP_Y` upward.
- This is purely decorative — no physics, no parallax.

The marble-prop kit + brand pedestal is explicitly OUT of this spec (deferred
to a dedicated L5-arena design pass — L6's industrial props would clash with
L5's marble-luxury theme).

### MEDIUM

#### M3 — L2 boss summon has a weak telegraph
`play/src/objects/Enemies.js` `ManagerMike.preUpdate` (lines 339–349). Mike
summons a JargonBlob every 4.2s after a `telegraph(280)` red tint flash. The
tint flash alone is easy to miss during a busy fight.
**Fix:** during the 280ms telegraph window, also draw a brief expanding ring
at Mike's feet (use the existing `scene.effects` helper — e.g. a
`shockwaveRing`-style pulse, or a tinted ring tween). Keep the existing
`telegraph(280)` call; add the ring alongside it. Ring color: a warning red
(`0xff5c5c`), fading over the 280ms window.

#### M5 — L3 boss arena has no run-up
`play/src/levels/level3.js` enemies array (lines 116–121). All four Act 3
enemies sit at x ≥ 8400, at or past the boss arena start (8400). The approach
to the arena is empty.
**Fix:** add one enemy on the pre-arena ground (`ground(8300,9800)` starts at
8300):
```js
{ type: "jargon_blob", x: 8350, y: GROUND_Y, range: 80 },
```
Insert at the top of the Act 3 enemy group.

#### M7 — L3 sparse stretch x=7500–8400
`play/src/levels/level3.js`. Between the ghost at x=7500 and the first Act 3
enemy at x=8400 there is a ~900px stretch with nothing. Terrain there:
`ground(7400,7800)`, `platform(7850,GROUND_Y-200,4)`, `platform(8100,GROUND_Y-340,3)`.
**Fix:** add one ground enemy and one platform enemy in the gap:
```js
{ type: "paperwork", x: 7700, y: GROUND_Y },
{ type: "ghost",     x: 7950, y: GROUND_Y - 200, range: 90 },
```
Insert in the Act 2 enemy group (the x=7500 ghost is the last Act 2 entry).

#### M9 — L4 boss telegraph too brief
`play/src/objects/Enemies.js` `TheAlgorithm.preUpdate` (lines 399–412). The
boss fires a 5-projectile fan every 3.2s after only a `telegraph(280)` flash.
280ms is too short to read reliably.
**Fix:** lengthen the telegraph window from 280ms to 480ms — change BOTH the
`telegraph(280)` call AND the `delayedCall(280, …)` to 480. This gives the
player a longer, clearer warning before the fan fires. (The 3.2s interval
stays unchanged; only the pre-fire telegraph lengthens.)

#### M10 — L5 finale has no buff support
`play/src/levels/level5.js` signals array (lines 164–168). The three signals
sit at x=2950, 5400, 8400. The C-Suite chaos (falling shards x=9300–10200 +
the CEO at x=10600) has no signal.
**Fix:** add a shield signal just before the shard gauntlet. The falling-shards
zone starts at x=9300 and `ground(9200,11500)` starts at 9200, so place it at:
```js
{ type: "shield", x: 9250, y: GROUND_Y - MID },
```
The player grabs it and enters the gauntlet buffed.

#### M11 — L5 has no mid-Act-3 checkpoint
`play/src/levels/level5.js` checkpoints array (lines 31–35). The last
checkpoint is `{ after: 8300, respawnX: 8500 }`. Dying anywhere in the shard
zone (9300–10200) or the CEO fight (boss at 10600) respawns the player back
at x=8500 — replaying the whole Act 3 approach.
**Fix:** add a checkpoint after the shard zone entry:
```js
{ after: 8900, respawnX: 9100 },
```
Append to the checkpoints array (keep array sorted by `after`).

### LOW

#### L_1 — L1 has no tile tint
`play/src/scenes/Game.js` lines 158–161. Levels 2–5 each get a `tintTiles()`
atmosphere wash; L1 gets none, so it reads slightly flat next to the others.
**Fix:** add an L1 branch with a warm near-white park tint:
```js
if (this.levelNum === 1)      tintTiles(0xf5ecd0);
else if (this.levelNum === 2) tintTiles(0x9ab0cc);
```
`0xf5ecd0` is a pale warm wash — tint multiplies, so a near-white value keeps
the tiles bright while adding a subtle golden-hour warmth.

#### L_2 — L1 enemy patrol bounds are invisible
`play/src/scenes/Game.js` + `play/src/levels/level1.js`. L1's patrolling
enemies (`jargon_blob` with a `range`) give no visual hint of their patrol
extent — a new player learns the bounds by collision.
**Fix:** in the L1 dressing path, for each `jargon_blob` enemy that has a
`range`, draw two small static decal markers (low-alpha tinted dots or small
flag graphics, depth -10) at `enemy.x ± range` on the ground line. L1 ONLY —
this is a teaching aid for the intro level; later levels don't need it.

#### L_3 — L3 wind zone has no telegraph
`play/src/levels/level3.js` line 58 — `windZone(3000, …, -280)` shoves the
player backward with no warning. `play/src/scenes/Game.js` `buildWindZone`.
**Fix:** in `buildWindZone` (or an L3 dressing path), spawn a few drifting
directional particle streaks just before the zone's left edge (x ≈ 2700–3000)
so the player sees the gust coming. Reuse the existing wind-particle system
`buildWindZone` already sets up (`windZones[].particles`) — just extend the
spawn region ~300px left of the zone, or add a one-off telegraph puff.

#### L_4 — L1 speed signal placed before its lesson
`play/src/levels/level1.js` line 162 — `{ type: "speed", x: 2050, y: GROUND_Y - MID }`.
The speed signal sits at x=2050, low on a platform section, before the player
has hit any challenge that rewards speed.
**Fix:** move it onto the higher platform run so the player earns it after a
climb:
```js
{ type: "speed", x: 2330, y: GROUND_Y - 300 },
```
x=2330 sits near `platform(2300, GROUND_Y-290, 3)`. (Distinct from the insight
already at x=2350, y=GROUND_Y-330 — different x and y, no overlap.)

#### L_5 — L1 third checkpoint respawn is far from the boss
`play/src/levels/level1.js` line 48 — `{ after: 5500, respawnX: 5800 }`. The
boss arena starts at x=6200; respawning at 5800 replays 400px of platforming
before every boss retry.
**Fix:** nudge the respawn closer:
```js
{ after: 5500, respawnX: 5900 },
```

#### L_6 — L2 Act 3 trailing insights are post-boss filler
`play/src/levels/level2.js` insights array lines 147–149 — three insights at
x=8150, 8280, 8420 sit between the boss arena and the brand (x=8580), all at
ground level (`GROUND_Y - LOW`). They're trivial walk-over pickups with no
challenge. L2 has 24 insights total for `insightsRequired: 15`, so the count
has plenty of slack.
**Fix:** delete the two outermost trailing insights (x=8150 and x=8420), keep
x=8280 as a single gentle post-boss "cool-down" pickup. Pure deletion — no
relocation, no coordinate collisions. This is the lowest-priority item — drop
it entirely if the implementation plan is getting long.

## Implementation order

Group by file to minimise context-switching:

1. **`level1.js`** — H1, L_4, L_5 (enemy add, signal move, checkpoint nudge)
2. **`level2.js`** — H3, L_6 (Act 3 enemy spread, insight relocation)
3. **`level3.js`** — M5, M7 (boss run-up enemy, sparse-stretch enemies)
4. **`level5.js`** — M10, M11 (shard-zone signal, mid-Act-3 checkpoint)
5. **`Enemies.js`** — M3, M9 (Mike summon ring, Algorithm telegraph lengthen)
6. **`Game.js`** — L_1, H4, L_2, L_3 (L1 tint, L5 skyline, L1 patrol flags, L3 wind telegraph)

Each fix is its own atomic commit.

## Testing & verification

No test runner — manual at `http://localhost:3100/play/` (dev server on 3100;
3000 is occupied by another project). Per fix:

- **H1 / H3 / M5 / M7** — `npm run dev`, play the affected level (or use the
  `B` boss-arena cheat / DevTools `window.game.scene.start("Game",{level:N})`),
  confirm the new enemies spawn on solid ground and patrol without falling.
- **H4** — start L5, walk to the C-Suite finale (x ≥ 9200), confirm the
  skyline silhouette renders behind the action and is mobile-skipped.
- **M3** — fight Mike (L2), confirm a red ring pulses at his feet before each
  summon.
- **M9** — fight The Algorithm (L4), confirm the pre-fan telegraph is now a
  clearly longer (~480ms) flash.
- **M10 / M11** — play L5 Act 3, confirm the shield signal is grabbable before
  the shards and that dying in the shard zone respawns at x=9100.
- **L_1** — L1 tiles read warmer; compare side-by-side with L2.
- **L_2** — L1 patrol markers appear at each jargon_blob's range bounds.
- **L_3** — approaching the L3 wind zone shows a gust telegraph.
- **L_4 / L_5 / L_6** — verify signal/checkpoint/insight positions in-game.

For each level, also confirm nothing else regressed (enemies still collide,
insights still collectible, level still completable).

## Files touched

```
play/src/levels/level1.js   — H1, L_4, L_5
play/src/levels/level2.js   — H3, L_6
play/src/levels/level3.js   — M5, M7
play/src/levels/level5.js   — M10, M11
play/src/objects/Enemies.js — M3, M9
play/src/scenes/Game.js     — L_1, H4, L_2, L_3
```

No new assets, no `ASSET_VERSION` bump (no HTML/asset changes — the L5 skyline
is drawn with `graphics()`, like L6's).

## Risks

- **H4 skyline placement** — the L6 skyline uses fixed world coords for a
  1600-wide arena. L5 is 11500 wide; the building array must be authored for
  the x=9000–11500 finale region specifically, or it'll render in the wrong
  place. The plan must give exact building coordinates.
- **M3 ring effect** — depends on what `scene.effects` exposes. The plan
  should confirm the helper API (`shockwaveRing`, `sparkleBurst`, etc.) before
  specifying the exact call.
- **Enemy-count balance** — H1, H3, M5, M7 add 6 enemies total across 3
  levels. Each level's `insightsRequired` is unchanged, so difficulty rises
  slightly. This is intended (the audit flagged these stretches as too easy),
  but playtest should confirm no level becomes unfair.
- **L_2 patrol flags** — drawing per-enemy decals is the most code-heavy LOW
  item. If the implementation plan runs long, L_2 and L_6 are the first cuts.

## Deferred (not in this spec)

- L5 marble-prop overhaul + brand pedestal — own design pass
- L5 falling-shard haptic/audio cue
- L6 boss 4th attack, DEV mode, payoff cinematic, climb-feel polish (pending #1–4)
- Firestore leaderboard (separate committed spec, paused)
