# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run build-assets    # extract sprites + generate world art + build sprite guide
npm run dev             # serves repo root at http://localhost:3000  (alias: npm start)
```

There is **no bundler, no test runner, and no linter** — Phaser 3 is loaded from a CDN and all gameplay code is plain ES modules served as static files. Editing anything under `play/src/` requires only a browser reload.

Asset sub-pipelines (re-run after editing the relevant tool / source PNG):

| Script | Reads | Writes |
| --- | --- | --- |
| `npm run extract-sprites` | `play/assets/source/swiirl-sheet.png` + `FRAMES` table in `tools/extract-sprites.mjs` | `play/assets/sprites/*.png` (17 frames + `atlas.json`) |
| `npm run generate-world`  | inline SVG strings in `tools/generate-world.mjs` | `play/assets/world/*.png` |
| `npm run build-sprite-guide` | sprite atlas | sprite-guide overlay |
| `node tools/debug-crops.mjs` | `swiirl-sheet.png` + `FRAMES` | overlay PNG for crop tuning |

There is no single-test command because there are no tests. If you need to verify behavior, run `npm run dev` and exercise the feature at `http://localhost:3000/play/`.

Deploy is `npx vercel --prod` (static; `vercel.json` rewrites `/play` → `/play/index.html` and pins cache headers).

## Architecture

The repo ships two co-located static products:

- **`/` (root)** — marketing landing page (`index.html`, fully self-contained).
- **`/play/`** — the Phaser 3 game. Entry point is `play/index.html`, which loads Phaser from CDN and `play/src/main.js` as an ES module.

Everything below describes the game.

### Scene graph and cross-scene communication

`play/src/main.js` registers scenes in this order: **Boot → Menu → CharacterSelect → Game → HUD → LevelComplete → GameOver**. Boot preloads every sprite and world image listed in its top-of-file arrays (`SWIIRL_FRAMES`, `WORLD_IMAGES`) — **adding a new texture means adding it to one of those arrays**, otherwise `this.textures.get(key)` will return the missing-texture placeholder.

The HUD runs as a parallel scene launched alongside Game (`scene.launch("HUD")`). Scenes communicate via the **global** event bus `this.game.events` — Game emits, HUD listens. Known events: `insight-changed`, `brand-meter`, `damage-flash`, `level-intro`, `level-loaded`, `player-hurt`, `player-died`, `boss-defeated`, `boss-name`, `boss-health`, `muted-changed`. Always pair `game.events.on(...)` with `this.events.once("shutdown", ...)` to unsubscribe — without this you'll get duplicate handlers across level restarts. There's a 2025-05 fix commit (`6d31e49`) covering this exact regression.

### Level data is declarative

Levels live in `play/src/levels/level{1..5}.js` and export a plain object (`name`, `width`, `spawn`, `brandPos`, `miniBoss`, `insightsRequired`, `actTriggers`, `checkpoints`, `terrain[]`, `enemies[]`, `pickups[]`, `clouds[]`, …). `Game.js` keeps a `LEVELS = { 1: level1, … 5: level5 }` map and selects via `scene.start("Game", { level: N })`. To add a level: create the data file, import + add to the `LEVELS` map in `Game.js`, and add a flavor quote to `FLAVOR_QUOTES`.

### Positioning convention (read before touching levels)

- All world sprites use origin `(0.5, 1.0)` — **the y-coordinate is the FEET, not the center**.
- `GROUND_Y = 656` is the top of the ground band. Standing on ground means `y = GROUND_Y`.
- Tile size is `64`. A platform's `y` is the top of the tile.
- With the tuned physics (gravity 2200, jump -880), a single jump clears ~176 px and a chained double-jump clears ~329 px. Use those numbers when placing platforms; anything taller is unreachable.

### Tunables

`play/src/config.js` is the **single source of truth** for gameplay numbers — physics (gravity/jump/accel/coyote/buffer), `PLAYER` (lives, hitbox, slide hitbox, sprite scale, brand threshold), `SIGNAL_DURATIONS`, and `PALETTE`. Adjust here, reload the browser — no rebuild. The hitbox is intentionally tighter than the rendered sprite so the fluffy hat doesn't trigger hits.

### Characters + combat

`play/src/characters.js` is the **single source of truth** for the 5 playable characters — five tinted Swiirl variants (`swiirl`, `crimson`, `mint`, `ocean`, `honey`). Each declares a `color` (tint applied to the base sprite), a `physics` overrides block applied on top of `PLAYER`/`PHYSICS`, an `attack` style id, a `perk` blurb, and an `attackHint` blurb. The same file exports `ATTACK_TUNING` for combat numbers (cooldown, damage, range, projectile speed).

Combat styles (in `play/src/objects/PlayerAttacks.js`): `swipe` (melee arc), `bolt` (ranged projectile), `groundPound` (leap-then-slam shockwave), `chain` (tap-light / hold-heavy combo), `shieldBash` (forward dash hitbox that also parries projectiles).

Input: `J` on keyboard, a separate touch button on mobile. The `chain` style is hold-and-release (≥380 ms triggers heavy); every other style is single-tap. `Player.tryAttack` dispatches to `ATTACKS[style]`, which spawns a short-lived sprite into `scene.playerAttacks` (a physics group created in Game.js). Game.js wires overlap handlers from `playerAttacks` to `enemies`, `boss`, and `projectiles` (the projectile overlap implements `shieldBash`'s parry — only fires when `atk.parry` is truthy).

Damage entry points on the enemy side are `EnemyBase.takePlayerHit(damage, fromX, attackId)` and `BossBase.takePlayerHit(...)`. Both dedupe per-`attackId` for 200–250 ms so a piercing hitbox (shield bash, ground-pound shockwave) doesn't chunk the same target every frame. The old `takeStompHit` path is untouched — Mario-style head-stomps still work as before.

HUD shows a tinted portrait + cooldown ring in the bottom-left; Game.js emits `persona-bind` once per level and Player emits `attack-cooldown` per attack.

### Audio and input

- `play/src/audio.js` synthesizes every SFX through the Web Audio API. **No audio files ship.** Add new sounds by adding methods to `SFX`, not by loading assets.
- `play/src/touchControls.js` injects a virtual D-pad/jump button into the page on touch devices and exposes a shared `TOUCH` state object that `Player.js` reads in addition to the keyboard. The portrait-mode rotate hint is CSS-only in `play/index.html`.

### Caching contract (deploy-affecting)

`vercel.json` marks `play/assets/*` as `max-age=31536000, immutable` but `play/src/*` as `must-revalidate`. **Don't overwrite an existing asset filename** — bump the filename (and update Boot's array) so the immutable cache doesn't serve stale art. Editing `play/src/*.js` is always safe.

## Conventions

- Commit messages: short imperative subject; no AI attribution / Co-Authored-By lines (per global instructions).
- Phaser is loaded as a global (`window.Phaser`) — game files use `Phaser.Scene` etc. without imports; only project-local modules use `import`.
- Player state is a state machine driven by physics each frame (see header comment in `play/src/objects/Player.js`). Don't `setTexture` directly from gameplay code — set state and let the next frame's resolver pick the texture, or jitter returns.
