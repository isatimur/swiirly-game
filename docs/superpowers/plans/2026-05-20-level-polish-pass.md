# Level Polish Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply 15 audit-verified polish fixes across Levels 1–6 — pacing dead-stretches, missing boss telegraphs, the L5 finale skyline, and signal/checkpoint/tint/dev-cheat details.

**Architecture:** Mostly declarative level-data edits (add/move/delete entries in `level{1,2,3,5}.js` exported objects) plus four `Game.js` dressing additions, two `Enemies.js` boss-telegraph tweaks, and one `Game.js` dev-cheat fix. No new assets, no `ASSET_VERSION` bump, no new files.

**Tech Stack:** Phaser 3 (CDN, ES modules, no bundler), manual browser verification (no test runner).

**Spec:** `docs/superpowers/specs/2026-05-20-level-polish-pass-design.md`

**Verification model:** No test runner exists. Each task: apply the edit, run `node --check <file>` for syntax, then `npm run dev` (dev server runs on **port 3100** — 3000 is occupied) and exercise the affected level in the browser. Use DevTools console `window.game.scene.start("Game",{level:N})` to jump to a level. Commit per task.

---

## File map

| File | Tasks | Responsibility |
|---|---|---|
| `play/src/levels/level1.js` | T1 (H1), T2 (L_4), T3 (L_5) | Add filler enemy, move speed signal, nudge checkpoint |
| `play/src/levels/level2.js` | T4 (H3), T5 (L_6) | Spread Act 3 gauntlet, delete 2 filler insights |
| `play/src/levels/level3.js` | T6 (M5), T7 (M7) | Pre-arena enemy, fill sparse stretch |
| `play/src/levels/level5.js` | T8 (M10), T9 (M11) | Shard-zone signal, mid-Act-3 checkpoint |
| `play/src/objects/Enemies.js` | T10 (M3), T11 (M9) | Mike summon ring, Algorithm telegraph lengthen |
| `play/src/scenes/Game.js` | T12 (L_1), T13 (H4), T14 (L_2), T15 (L_7) | L1 tint, L5 skyline, L1 patrol flags, B-cheat fix |

15 tasks, ~15 atomic commits.

---

## Task 1 (H1): L1 — add Act 1 filler enemy

**Files:**
- Modify: `play/src/levels/level1.js` (enemies array, lines 106–121)

- [ ] **Step 1: Add the enemy**

In `play/src/levels/level1.js`, find the Act 1 enemy block:

```js
  enemies: [
    // Act 1
    { type: "jargon_blob", x:  700, y: GROUND_Y, range:  60 },
    { type: "jargon_blob", x: 1900, y: GROUND_Y, range: 120 },
```

Insert a new enemy between the two:

```js
  enemies: [
    // Act 1
    { type: "jargon_blob", x:  700, y: GROUND_Y, range:  60 },
    { type: "jargon_blob", x: 1750, y: GROUND_Y, range:  90 },
    { type: "jargon_blob", x: 1900, y: GROUND_Y, range: 120 },
```

x=1750 sits on the solid `ground(1500,2400)` span (NOT the pit 1280–1500). This
fills the 400px coast between the x=700 and x=1900 enemies.

- [ ] **Step 2: Syntax check**

Run: `node --check play/src/levels/level1.js`
Expected: no output (exit 0).

- [ ] **Step 3: Browser check**

Run `npm run dev`, open `http://localhost:3100/play/`, DevTools console:
`window.game.scene.start("Game",{level:1})`. Walk right through Act 1. Expected:
a third jargon_blob patrols on the ground around x=1750, before the x=1900 one.
It stands on solid ground and patrols without falling.

- [ ] **Step 4: Commit**

```bash
git add play/src/levels/level1.js
git commit -m "level1: add Act 1 filler enemy to close the dead stretch"
```

---

## Task 2 (L_4): L1 — move speed signal onto the high platform

**Files:**
- Modify: `play/src/levels/level1.js` (signals array, line ~162)

- [ ] **Step 1: Move the signal**

In `play/src/levels/level1.js`, find the signals array:

```js
  signals: [
    { type: "speed",  x: 2050, y: GROUND_Y - MID },
    { type: "shield", x: 4360, y: GROUND_Y - 180 },
    { type: "growth", x: 5950, y: GROUND_Y - HIGH },
  ],
```

Change the speed signal line:

```js
  signals: [
    { type: "speed",  x: 2330, y: GROUND_Y - 300 },
    { type: "shield", x: 4360, y: GROUND_Y - 180 },
    { type: "growth", x: 5950, y: GROUND_Y - HIGH },
  ],
```

x=2330 sits near `platform(2300, GROUND_Y-290, 3)` so the player earns the
speed buff after a platform climb. (No overlap with the insight at x=2350,
y=GROUND_Y-330 — different x and y.)

- [ ] **Step 2: Syntax check**

Run: `node --check play/src/levels/level1.js`
Expected: no output.

- [ ] **Step 3: Browser check**

`npm run dev`, `window.game.scene.start("Game",{level:1})`. Climb to the
platform around x=2300. Expected: the speed signal hovers near that platform,
collectable after the climb.

- [ ] **Step 4: Commit**

```bash
git add play/src/levels/level1.js
git commit -m "level1: move speed signal onto the high platform run"
```

---

## Task 3 (L_5): L1 — nudge the third checkpoint toward the boss

**Files:**
- Modify: `play/src/levels/level1.js` (checkpoints array, line 48)

- [ ] **Step 1: Change the respawn x**

In `play/src/levels/level1.js`, find the checkpoints array:

```js
  checkpoints: [
    { after: 1500, respawnX: 1500 },
    { after: 2700, respawnX: 3300 },
    { after: 5500, respawnX: 5800 },
  ],
```

Change the third entry's `respawnX`:

```js
  checkpoints: [
    { after: 1500, respawnX: 1500 },
    { after: 2700, respawnX: 3300 },
    { after: 5500, respawnX: 5900 },
  ],
```

The boss arena starts at x=6200; 5900 trims 100px of replayed platforming per
boss retry.

- [ ] **Step 2: Syntax check**

Run: `node --check play/src/levels/level1.js`
Expected: no output.

- [ ] **Step 3: Browser check**

`npm run dev`, play L1 to the boss, let the player die to Hot-Take Hank.
Expected: respawn at x=5900 (slightly closer to the boss arena than before).

- [ ] **Step 4: Commit**

```bash
git add play/src/levels/level1.js
git commit -m "level1: nudge third checkpoint respawn closer to the boss"
```

---

## Task 4 (H3): L2 — spread the Act 3 boss-approach gauntlet

**Files:**
- Modify: `play/src/levels/level2.js` (enemies array, lines 110–114)

- [ ] **Step 1: Rewrite the Act 3 enemy block**

In `play/src/levels/level2.js`, find the Act 3 enemy block:

```js
    // Act 3
    { type: "jargon_blob", x: 7100, y: GROUND_Y, range: 80  },
    { type: "ghost",       x: 7300, y: GROUND_Y - 200, range: 100 },
    { type: "paperwork",   x: 7600, y: GROUND_Y },
    { type: "jargon_blob", x: 8100, y: GROUND_Y, range: 60  },
```

Replace it with:

```js
    // Act 3
    { type: "jargon_blob", x: 7000, y: GROUND_Y, range: 90  },
    { type: "ghost",       x: 7200, y: GROUND_Y - 200, range: 100 },
    { type: "jargon_blob", x: 7320, y: GROUND_Y, range: 70  },
    { type: "paperwork",   x: 7600, y: GROUND_Y },
    { type: "jargon_blob", x: 8100, y: GROUND_Y, range: 60  },
```

This spreads three encounters across the 6950–7400 pre-arena runway
(`ground(6950,8800)`) instead of cramming two at 7100/7300. One enemy added
(the x=7320 blob).

- [ ] **Step 2: Syntax check**

Run: `node --check play/src/levels/level2.js`
Expected: no output.

- [ ] **Step 3: Browser check**

`npm run dev`, `window.game.scene.start("Game",{level:2})`, walk through Act 3
toward the boss. Expected: three enemies (blob, ghost, blob) staggered across
the run-up before the boss arena, all on solid ground / floating in place.

- [ ] **Step 4: Commit**

```bash
git add play/src/levels/level2.js
git commit -m "level2: spread the Act 3 boss-approach gauntlet"
```

---

## Task 5 (L_6): L2 — delete two filler post-boss insights

**Files:**
- Modify: `play/src/levels/level2.js` (insights array, lines 143–149)

- [ ] **Step 1: Delete the two outer trailing insights**

In `play/src/levels/level2.js`, find the Act 3 insight block:

```js
    // Act 3 (6)
    { x: 7150, y: GROUND_Y - LOW },
    { x: 7350, y: GROUND_Y - LOW },
    { x: 7550, y: GROUND_Y - LOW },
    { x: 8150, y: GROUND_Y - LOW },
    { x: 8280, y: GROUND_Y - LOW },
    { x: 8420, y: GROUND_Y - LOW },
  ],
```

Delete the x=8150 and x=8420 lines and update the count comment:

```js
    // Act 3 (4)
    { x: 7150, y: GROUND_Y - LOW },
    { x: 7350, y: GROUND_Y - LOW },
    { x: 7550, y: GROUND_Y - LOW },
    { x: 8280, y: GROUND_Y - LOW },
  ],
```

L2 had 24 insights for `insightsRequired: 15`; after this it has 22 — still
ample slack. x=8280 stays as a single gentle post-boss pickup.

- [ ] **Step 2: Syntax check**

Run: `node --check play/src/levels/level2.js`
Expected: no output.

- [ ] **Step 3: Browser check**

`npm run dev`, `window.game.scene.start("Game",{level:2})`, beat the boss and
walk to the brand. Expected: one insight (x=8280) between the boss arena and
the brand, not three.

- [ ] **Step 4: Commit**

```bash
git add play/src/levels/level2.js
git commit -m "level2: trim two filler post-boss insights"
```

---

## Task 6 (M5): L3 — add a pre-arena enemy

**Files:**
- Modify: `play/src/levels/level3.js` (enemies array, lines 116–121)

- [ ] **Step 1: Add the enemy at the top of the Act 3 group**

In `play/src/levels/level3.js`, find the Act 3 enemy block:

```js
    // Act 3
    { type: "jargon_blob", x: 8400, y: GROUND_Y, range:  80 },
    { type: "ghost",       x: 8600, y: GROUND_Y - 200, range:  80 },
    { type: "paperwork",   x: 8750, y: GROUND_Y },
    { type: "jargon_blob", x: 9200, y: GROUND_Y, range:  60 },
```

Insert a new enemy as the first Act 3 entry:

```js
    // Act 3
    { type: "jargon_blob", x: 8350, y: GROUND_Y, range:  80 },
    { type: "jargon_blob", x: 8400, y: GROUND_Y, range:  80 },
    { type: "ghost",       x: 8600, y: GROUND_Y - 200, range:  80 },
    { type: "paperwork",   x: 8750, y: GROUND_Y },
    { type: "jargon_blob", x: 9200, y: GROUND_Y, range:  60 },
```

x=8350 is on `ground(8300,9800)`. The boss-arena trigger is at x=8400; this
puts an encounter right at the threshold so the arena entrance is guarded.

- [ ] **Step 2: Syntax check**

Run: `node --check play/src/levels/level3.js`
Expected: no output.

- [ ] **Step 3: Browser check**

`npm run dev`, `window.game.scene.start("Game",{level:3})`, walk toward the
Act 3 boss arena. Expected: an enemy guards the arena entrance around x=8350.

- [ ] **Step 4: Commit**

```bash
git add play/src/levels/level3.js
git commit -m "level3: add a pre-arena enemy at the boss threshold"
```

---

## Task 7 (M7): L3 — fill the sparse x=7500–8400 stretch

**Files:**
- Modify: `play/src/levels/level3.js` (enemies array, lines 104–114)

- [ ] **Step 1: Add two enemies at the end of the Act 2 group**

In `play/src/levels/level3.js`, find the end of the Act 2 enemy block (the
x=7500 ghost is the last Act 2 entry):

```js
    { type: "jargon_blob", x: 6600, y: GROUND_Y, range: 180 },
    { type: "paperwork",   x: 6900, y: GROUND_Y },
    { type: "ghost",       x: 7500, y: GROUND_Y - 200, range:  80 },

    // Act 3
```

Insert two enemies after the x=7500 ghost:

```js
    { type: "jargon_blob", x: 6600, y: GROUND_Y, range: 180 },
    { type: "paperwork",   x: 6900, y: GROUND_Y },
    { type: "ghost",       x: 7500, y: GROUND_Y - 200, range:  80 },
    { type: "paperwork",   x: 7700, y: GROUND_Y },
    { type: "ghost",       x: 7950, y: GROUND_Y - 200, range:  90 },

    // Act 3
```

x=7700 paperwork sits on `ground(7400,7800)`. The x=7950 ghost floats
(GROUND_Y-200) so it doesn't need ground under it — it patrols above the
platform-only zone. Together they fill the ~900px dead stretch between the
x=7500 ghost and the Act 3 enemies.

- [ ] **Step 2: Syntax check**

Run: `node --check play/src/levels/level3.js`
Expected: no output.

- [ ] **Step 3: Browser check**

`npm run dev`, `window.game.scene.start("Game",{level:3})`, traverse x=7500–
8400. Expected: a paperwork pile (~7700) and a floating ghost (~7950) break up
what was an empty stretch.

- [ ] **Step 4: Commit**

```bash
git add play/src/levels/level3.js
git commit -m "level3: fill the sparse stretch before the Act 3 arena"
```

---

## Task 8 (M10): L5 — add a shield signal before the shard gauntlet

**Files:**
- Modify: `play/src/levels/level5.js` (signals array, lines 164–168)

- [ ] **Step 1: Add the signal**

In `play/src/levels/level5.js`, find the signals array:

```js
  signals: [
    { type: "speed",  x: 2950, y: GROUND_Y - MID  },
    { type: "shield", x: 5400, y: GROUND_Y - 180  },
    { type: "growth", x: 8400, y: GROUND_Y - HIGH },
  ],
```

Add a fourth signal:

```js
  signals: [
    { type: "speed",  x: 2950, y: GROUND_Y - MID  },
    { type: "shield", x: 5400, y: GROUND_Y - 180  },
    { type: "growth", x: 8400, y: GROUND_Y - HIGH },
    { type: "shield", x: 9250, y: GROUND_Y - MID  },
  ],
```

x=9250 is on `ground(9200,11500)`, just before the falling-shards zone (starts
x=9300). The player grabs the shield and enters the gauntlet buffed.

- [ ] **Step 2: Syntax check**

Run: `node --check play/src/levels/level5.js`
Expected: no output.

- [ ] **Step 3: Browser check**

`npm run dev`, `window.game.scene.start("Game",{level:5})`, reach the C-Suite
finale (x≈9200). Expected: a shield signal hovers just before the glass-shard
zone.

- [ ] **Step 4: Commit**

```bash
git add play/src/levels/level5.js
git commit -m "level5: add a shield signal before the shard gauntlet"
```

---

## Task 9 (M11): L5 — add a mid-Act-3 checkpoint

**Files:**
- Modify: `play/src/levels/level5.js` (checkpoints array, lines 31–35)

- [ ] **Step 1: Append a checkpoint**

In `play/src/levels/level5.js`, find the checkpoints array:

```js
  checkpoints: [
    { after: 2000, respawnX: 2200 },
    { after: 3900, respawnX: 4100 },
    { after: 8300, respawnX: 8500 },
  ],
```

Append a fourth entry (keep the array sorted by `after`):

```js
  checkpoints: [
    { after: 2000, respawnX: 2200 },
    { after: 3900, respawnX: 4100 },
    { after: 8300, respawnX: 8500 },
    { after: 8900, respawnX: 9100 },
  ],
```

This gives the player a respawn point at x=9100 — just before the shard zone
(x=9300) — instead of replaying from x=8500 on every shard-zone death.

- [ ] **Step 2: Syntax check**

Run: `node --check play/src/levels/level5.js`
Expected: no output.

- [ ] **Step 3: Browser check**

`npm run dev`, `window.game.scene.start("Game",{level:5})`, walk past x=8900,
then die in the shard zone. Expected: respawn at x=9100, not x=8500.

- [ ] **Step 4: Commit**

```bash
git add play/src/levels/level5.js
git commit -m "level5: add a mid-Act-3 checkpoint before the shard zone"
```

---

## Task 10 (M3): L2 boss — add a summon-telegraph ring

**Files:**
- Modify: `play/src/objects/Enemies.js` (`ManagerMike.preUpdate`, lines 339–349)

- [ ] **Step 1: Add a ring effect to the telegraph window**

In `play/src/objects/Enemies.js`, find `ManagerMike.preUpdate`:

```js
  preUpdate(time, dt) {
    super.preUpdate(time, dt);
    if (this.dead) return;
    if (time - this.lastAttackAt > this.summonInterval) {
      this.lastAttackAt = time;
      this.telegraph(280);
      this.scene.time.delayedCall(280, () => {
        if (!this.dead) this.summonJargonBlob();
      });
    }
  }
```

Replace with:

```js
  preUpdate(time, dt) {
    super.preUpdate(time, dt);
    if (this.dead) return;
    if (time - this.lastAttackAt > this.summonInterval) {
      this.lastAttackAt = time;
      this.telegraph(280);
      // Expanding red ring at Mike's feet so the summon reads during a
      // busy fight — the tint flash alone is easy to miss.
      const ring = this.scene.add.circle(this.x, this.y, 14, 0xff5c5c, 0)
        .setStrokeStyle(4, 0xff5c5c, 0.9).setDepth(this.depth - 1);
      this.scene.tweens.add({
        targets: ring,
        radius: 70,
        alpha: 0,
        duration: 280,
        ease: "Quad.easeOut",
        onUpdate: (_, t) => ring.setRadius(14 + (70 - 14) * t.progress),
        onComplete: () => ring.destroy(),
      });
      this.scene.time.delayedCall(280, () => {
        if (!this.dead) this.summonJargonBlob();
      });
    }
  }
```

The ring expands and fades over the same 280ms as the existing telegraph.
`this.y` is Mike's feet (enemy origin is `(0.5, 1)`), so the ring sits on the
ground at his base.

- [ ] **Step 2: Syntax check**

Run: `node --check play/src/objects/Enemies.js`
Expected: no output.

- [ ] **Step 3: Browser check**

`npm run dev`, `window.game.scene.start("Game",{level:2})`, reach and fight
Middle Manager Mike. Expected: every ~4.2s before he summons a blob, a red
ring pulses out from his feet.

- [ ] **Step 4: Commit**

```bash
git add play/src/objects/Enemies.js
git commit -m "enemies: add a summon-telegraph ring to Manager Mike"
```

---

## Task 11 (M9): L4 boss — lengthen the projectile-fan telegraph

**Files:**
- Modify: `play/src/objects/Enemies.js` (`TheAlgorithm.preUpdate`, lines 399–412)

- [ ] **Step 1: Lengthen the telegraph from 280ms to 480ms**

In `play/src/objects/Enemies.js`, find `TheAlgorithm.preUpdate`:

```js
  preUpdate(time, dt) {
    EnemyBase.prototype.preUpdate.call(this, time, dt);
    if (this.dead) return;
    this.setVelocity(0, 0);
    if (time - this.lastAttackAt > this.spreadInterval) {
      this.lastAttackAt = time;
      this.telegraph(280);
      this.scene.time.delayedCall(280, () => {
        if (this.dead) return;
        const p = this.scene.player;
        if (p) this.fireProjectileFan(p.x, p.y, 5, 0.18, 240, 0x40c0e0);
      });
    }
  }
```

Replace both `280` values with `480`:

```js
  preUpdate(time, dt) {
    EnemyBase.prototype.preUpdate.call(this, time, dt);
    if (this.dead) return;
    this.setVelocity(0, 0);
    if (time - this.lastAttackAt > this.spreadInterval) {
      this.lastAttackAt = time;
      this.telegraph(480);
      this.scene.time.delayedCall(480, () => {
        if (this.dead) return;
        const p = this.scene.player;
        if (p) this.fireProjectileFan(p.x, p.y, 5, 0.18, 240, 0x40c0e0);
      });
    }
  }
```

The 3.2s `spreadInterval` is unchanged — only the pre-fire warning window
lengthens, giving the player a clearer read before the 5-projectile fan.

- [ ] **Step 2: Syntax check**

Run: `node --check play/src/objects/Enemies.js`
Expected: no output.

- [ ] **Step 3: Browser check**

`npm run dev`, `window.game.scene.start("Game",{level:4})`, reach The
Algorithm boss. Expected: the red telegraph flash before each projectile fan
is now a clearly longer (~480ms) warning.

- [ ] **Step 4: Commit**

```bash
git add play/src/objects/Enemies.js
git commit -m "enemies: lengthen The Algorithm projectile-fan telegraph"
```

---

## Task 12 (L_1): L1 — apply a warm tile tint

**Files:**
- Modify: `play/src/scenes/Game.js` (tint chain, lines 156–161)

- [ ] **Step 1: Add the L1 tint branch**

In `play/src/scenes/Game.js`, find the tint chain:

```js
    const tintTiles = (color) =>
      this.platforms.getChildren().forEach(tile => tile.setTint(color));
    if (this.levelNum === 2)      tintTiles(0x9ab0cc);
    else if (this.levelNum === 3) tintTiles(0xcc9070);
    else if (this.levelNum === 4) tintTiles(0x60a0b0);
    else if (this.levelNum === 5) tintTiles(0x8090c8);
```

Add an L1 branch at the top of the chain:

```js
    const tintTiles = (color) =>
      this.platforms.getChildren().forEach(tile => tile.setTint(color));
    if (this.levelNum === 1)      tintTiles(0xf5ecd0);
    else if (this.levelNum === 2) tintTiles(0x9ab0cc);
    else if (this.levelNum === 3) tintTiles(0xcc9070);
    else if (this.levelNum === 4) tintTiles(0x60a0b0);
    else if (this.levelNum === 5) tintTiles(0x8090c8);
```

`0xf5ecd0` is a pale warm wash — tint multiplies, so a near-white value keeps
tiles bright while adding a subtle golden-hour warmth. L6 deliberately gets no
tint (its tiles are the realistic concrete deck) — leave the chain ending at
level 5.

- [ ] **Step 2: Syntax check**

Run: `node --check play/src/scenes/Game.js`
Expected: no output.

- [ ] **Step 3: Browser check**

`npm run dev`, `window.game.scene.start("Game",{level:1})`. Expected: L1 tiles
read slightly warmer/golden. Compare against L2 (`{level:2}`) — both now
tinted, L1 warm, L2 cool-blue.

- [ ] **Step 4: Commit**

```bash
git add play/src/scenes/Game.js
git commit -m "game: warm tile tint for L1 to match the tinted later levels"
```

---

## Task 13 (H4): L5 — add a city-skyline backdrop to the finale

**Files:**
- Modify: `play/src/scenes/Game.js` (after the tint chain / before the world floor, around line 162)

- [ ] **Step 1: Add an L5 skyline dressing block**

In `play/src/scenes/Game.js`, immediately after the tint chain (the
`else if (this.levelNum === 5) tintTiles(0x8090c8);` line) and before the
`// World floor` comment, insert:

```js
    // L5 finale — distant city skyline behind the C-Suite arena (x≈9000–
    // 11500). Staggered dark buildings with lit windows, depth -15, no
    // physics, no parallax. Modeled on the L6 rooftop skyline. Mobile-skip:
    // per-rect graphics calls cost real GPU when the shard zone is active.
    if (this.levelNum === 5 && !IS_MOBILE) {
      const skyline = this.add.graphics().setDepth(-15);
      const skyBuildings = [
        { x:  9050, w: 110, h: 240, c: 0x1a1f2a },
        { x:  9200, w: 150, h: 320, c: 0x0e1320 },
        { x:  9400, w:  90, h: 210, c: 0x161b26 },
        { x:  9540, w: 130, h: 290, c: 0x0e1320 },
        { x:  9720, w:  80, h: 180, c: 0x1a1f2a },
        { x:  9850, w: 120, h: 270, c: 0x0e1320 },
        { x: 10020, w: 100, h: 230, c: 0x161b26 },
        { x: 10170, w: 140, h: 340, c: 0x0e1320 },
        { x: 10360, w:  90, h: 200, c: 0x1a1f2a },
        { x: 10500, w: 130, h: 300, c: 0x0e1320 },
        { x: 10690, w: 100, h: 220, c: 0x161b26 },
        { x: 10840, w: 150, h: 330, c: 0x0e1320 },
        { x: 11040, w:  90, h: 210, c: 0x1a1f2a },
        { x: 11180, w: 130, h: 280, c: 0x0e1320 },
        { x: 11370, w: 100, h: 240, c: 0x161b26 },
      ];
      for (const b of skyBuildings) {
        const top = GROUND_TOP_Y - b.h;
        skyline.fillStyle(b.c, 1);
        skyline.fillRect(b.x, top, b.w, b.h);
        skyline.fillStyle(0xffd28a, 0.55);
        const rows = Math.floor(b.h / 24);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < 3; c++) {
            if (((r * 3 + c + b.x) % 5) === 0) continue;
            skyline.fillRect(b.x + 8 + c * (b.w - 16) / 2.4, top + 8 + r * 24, 6, 5);
          }
        }
      }
    }
```

This mirrors the L6 skyline (Game.js ~244–272) but uses `GROUND_TOP_Y` as the
baseline (656, vs L6's 600 deck) and places buildings across x=9050–11470 —
the C-Suite finale region. Depth -15 keeps it behind everything. `IS_MOBILE`
and `GROUND_TOP_Y` are already in scope in `create()`.

- [ ] **Step 2: Syntax check**

Run: `node --check play/src/scenes/Game.js`
Expected: no output.

- [ ] **Step 3: Browser check**

`npm run dev`, `window.game.scene.start("Game",{level:5})`. Use the console to
jump the camera: `window.game.scene.getScene('Game').player.setPosition(9600,656)`.
Expected: a dark city-skyline silhouette with lit gold windows stands behind
the C-Suite finale. Confirm it does NOT appear on L1–L4.

- [ ] **Step 4: Commit**

```bash
git add play/src/scenes/Game.js
git commit -m "game: city-skyline backdrop for the L5 finale"
```

---

## Task 14 (L_2): L1 — draw enemy patrol-bound markers

**Files:**
- Modify: `play/src/scenes/Game.js` (after the tint chain — see Step 1)

- [ ] **Step 1: Insert the patrol-marker block after the tint chain**

The block MUST run after the terrain (ground tiles) is built, otherwise the
markers render behind the ground and are invisible. The tint chain
(`if (this.levelNum === 5) tintTiles(0x8090c8);`, around line 161) runs after
terrain build — anchor there.

In `play/src/scenes/Game.js`, immediately after the tint chain's last line
(`else if (this.levelNum === 5) tintTiles(0x8090c8);`) — and after the Task 13
L5-skyline block if that task is already done — insert:

```js
    // L1 ONLY — teaching aid: mark each patrolling jargon_blob's range bounds
    // with two faint pulsing ground decals so a new player reads the patrol
    // extent without learning it by collision. Later levels don't need this.
    // No setDepth: created after the ground tiles (so it draws on top of them)
    // and before the player (so the player draws on top of it).
    if (this.levelNum === 1) {
      for (const e of lvl.enemies) {
        if (e.type !== "jargon_blob" || !e.range) continue;
        for (const mx of [e.x - e.range, e.x + e.range]) {
          const dot = this.add.circle(mx, GROUND_TOP_Y - 6, 5, 0xffd24a, 0.30);
          this.tweens.add({
            targets: dot, alpha: 0.12, scale: 1.4,
            duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
          });
        }
      }
    }
```

`lvl` is the level-data object already in scope in `create()` (`const lvl =
LEVELS[this.levelNum] ?? level1;`). `GROUND_TOP_Y` is imported at the top of
the file. No `setDepth` call — Phaser draws objects in creation order within
the default depth, so a marker created after the ground tiles sits visibly on
top of them, and the player (created later in `create()`) draws over it.

- [ ] **Step 2: Syntax check**

Run: `node --check play/src/scenes/Game.js`
Expected: no output.

- [ ] **Step 3: Browser check**

`npm run dev`, `window.game.scene.start("Game",{level:1})`. Expected: faint
pulsing gold dots ON the ground surface (visible, not hidden behind tiles) at
each jargon_blob's left/right patrol limits. Confirm they do NOT appear on L2
(`{level:2}`). If the dots are hidden or clash with the player, adjust per the
Risks note.

- [ ] **Step 4: Commit**

```bash
git add play/src/scenes/Game.js
git commit -m "game: L1 patrol-bound markers as an intro teaching aid"
```

---

## Task 15 (L_7): fix the `B` dev-cheat off-world teleport on L6

**Files:**
- Modify: `play/src/scenes/Game.js` (`keydown-B` handler, lines 536–542)

- [ ] **Step 1: Rewrite the B-cheat handler**

In `play/src/scenes/Game.js`, find the `B` dev shortcut:

```js
    // Hidden dev shortcut: B teleports player into the boss arena (boss alive).
    this.input.keyboard.on("keydown-B", () => {
      const arenaX = this.level.bossArenaStart + 100;
      this.player.setPosition(arenaX, GROUND_TOP_Y - 100);
      this.player.setVelocity(0, 0);
      this.player._invulnUntil = this.time.now + 1500;
    });
```

Replace with:

```js
    // Hidden dev shortcut: B teleports player into the boss arena (boss alive).
    // Prefer the boss's own spawn — L6's bossArenaStart is a sentinel (99999)
    // because its arena is vertical, so the old bossArenaStart+100 sent the
    // player off-world. Every level defines miniBoss { x, y }.
    this.input.keyboard.on("keydown-B", () => {
      const mb = this.level.miniBoss;
      const arenaX = mb ? mb.x - 140 : this.level.bossArenaStart + 100;
      const arenaY = mb ? mb.y - 80  : GROUND_TOP_Y - 100;
      this.player.setPosition(arenaX, arenaY);
      this.player.setVelocity(0, 0);
      this.player._invulnUntil = this.time.now + 1500;
    });
```

This lands the player just left of and above the boss on every level —
including L6, where it now teleports onto the rooftop next to THE BOARD
instead of to x=100099 in the void.

- [ ] **Step 2: Syntax check**

Run: `node --check play/src/scenes/Game.js`
Expected: no output.

- [ ] **Step 3: Browser check**

`npm run dev`. On L6 (`window.game.scene.start("Game",{level:6})`), press `B`.
Expected: the player teleports onto the rooftop next to THE BOARD — not
off-world to a death. Spot-check `B` on L1 (`{level:1}`) — it should still
land the player in the boss arena near Hot-Take Hank.

- [ ] **Step 4: Commit**

```bash
git add play/src/scenes/Game.js
git commit -m "game: fix B dev-cheat off-world teleport on L6"
```

---

## Final verification (after all 15 tasks)

Run `npm run dev` and play each level start-to-finish (or use the `B`/`Q`
cheats and `scene.start` jumps):

- **L1** — warm tint, three Act 1 enemies, speed signal on the high platform,
  patrol-bound dots, checkpoint respawn at 5900.
- **L2** — three-enemy Act 3 run-up, Mike's summon ring, one trailing insight.
- **L3** — pre-arena enemy at 8350, filled x=7500–8400 stretch.
- **L4** — The Algorithm's longer projectile-fan telegraph.
- **L5** — city skyline behind the finale, shield signal before the shards,
  mid-Act-3 checkpoint.
- **L6** — `B` cheat lands on the rooftop, not the void. (No content change.)

Confirm every level is still completable, no console errors, enemies collide
and patrol correctly, all signals/insights collectable.

## Files touched

```
play/src/levels/level1.js   — T1, T2, T3
play/src/levels/level2.js   — T4, T5
play/src/levels/level3.js   — T6, T7
play/src/levels/level5.js   — T8, T9
play/src/objects/Enemies.js — T10, T11
play/src/scenes/Game.js     — T12, T13, T14, T15
```

No new assets, no `ASSET_VERSION` bump.

## Risks

- **Enemy-count balance** — T1, T4, T6, T7 add 6 enemies across L1–L3 with
  `insightsRequired` unchanged, so difficulty rises slightly. Intended (the
  audit flagged these stretches as too easy). Final playtest must confirm no
  level becomes unfair.
- **L5 skyline x-coords** — the building array is authored for the x=9050–
  11470 finale region. If it renders in the wrong place, recheck `GROUND_TOP_Y`
  is the baseline and the level is actually 11500 wide.
- **T14 patrol markers** — the most code-heavy LOW task. If it looks cluttered
  in-game, reduce marker alpha or draw one marker per enemy instead of two.
