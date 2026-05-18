# Swiirl — Session Handoff

Last working commit: `2577c87` (rooftop easter eggs). Production:
https://swiirly-game.vercel.app/play/

## What shipped this session

**Bug fixes**
- Wall-jump → air-jump now works (refresh to max-1 instead of max)
- Slide trigger no longer requires SHIFT (velocity-only)
- Crouch state pins scale to base (no more inflate during entertainer tween)
- Bolt projectile reaches low enemies (28×56 body, spawn at `player.y-56`)
- Conveyors actually push the player (snap to belt speed unless fighting)
- Pause menu wake() now actually fires (`game.loop.paused` doesn't exist in
  Phaser 3, the guard was unreachable)
- L6 loads (every `this.boss` reference null-guarded for the bossless level)
- L6 ground tiles use `level.groundY`, not the L1-imported constant
- Enemy art reverted + protected behind `REGEN_ENEMIES=1` env flag

**Features**
- Universal pause menu (Esc / P / Options / touch ⏸), arrow/D-pad nav,
  Enter / × confirm, Backspace / ○ back, gold focus ring, About sub-panel
- Per-scene gamepad-cross handlers guard `window.__pauseModalOpen`
- Settings: SFX + Music toggles, two-step Reset Progress, About
- Procedural chiptune music — 7 tracks via Web Audio sequencer (menu +
  level1–5 + boss + bonus L6 in F-lydian)
- Per-level rank persistence (`swiirl.bestRank.{1..5}`), ranks recap row
  on Menu, one-time 👍/👎 feedback prompt after 3 full runs
- Polish batch — hit-stop on heavy hits (60–80ms), coyote dust telegraph
- Mobile polish — pointer-capture buttons (no stuck press), slide button,
  pause/mute icons, navigator.vibrate haptics, scaled tap targets,
  backdrop-filter dropped on phone GPUs
- PS5 DualSense gamepad support with rumble (`gamepad.js`)

**Content**
- Themed obstacles per level (bulletin board, cubicle wall, velvet rope,
  server rack, marble pillar) in their own `playerObstacles` group so
  enemies pass through
- Bonus Level 6 — "Up and to the Right." Centered 800-wide shaft inside
  a 1600-wide level, wall-jump + double-jump climb, arena bowl at top.
- THE BOARD mega-boss — TheCEO subclass, scale 1.6×, 18 HP, always
  phase-3 attacks (summon 2600ms / dash 2200ms / spread 1800ms)
- L6 arena layout (current): one-way arena floor at y=600 (x=320–1280),
  center staircase (560,460,4 → 560,320,4), one-way roof segments at
  y=200 with a 256-wide hole at x=560–816, brand at (688, 200) with
  rooftop-door pedestal graphic, city skyline silhouette behind
- L6 easter eggs: Q4-plan sticky note on the door, BOARD MEETING memo
  drifting across the rooftop every 22s, shooting stars on a 8–16s
  schedule
- Credits scene (`Credits.js`) — scrolling column triggered after L6
  brand delivery. Edit `{your_team_member_*}` placeholders to taste.
- Bulletin-read Pascal surprise (1 of 12 from the brainstorm)
- One-way platforms via `oneWayFloor` terrain kind + `buildOneWayFloor`

## Cheat / dev shortcuts (in-game keyboard)

| Key | What it does |
| --- | --- |
| `B` | Teleport into the current level's boss arena |
| `Q` | Fill brand meter + teleport to brand + kill boss = instant win |
| `R` | Restart current level |
| `M` | Toggle mute |

DevTools console:

```js
window.game.scene.start("Game", { level: 6 })   // any level
window.game.scene.start("Credits")              // preview credits
localStorage.setItem("swiirl.runsCompleted", "3"); location.reload()  // unlock feedback prompt
```

## Pending — pick from this list to start the next thread

1. **Proper DEV mode** — Konami code `↑↑↓↓←→←→ J SPACE` on Menu unlocks
   a "🔧 DEV" pause-menu row that persists in localStorage. Items:
   level select 1–6, infinite lives toggle, no-clip toggle, FPS overlay.
   (Spec'd in the brainstorm doc as Pascal surprise #10; not implemented.)

2. **THE BOARD's new attack** — currently recycles TheCEO's
   summon/dash/spread. Add a 4th: aerial slam where boss leaps and
   ground-pounds a shockwave across the arena floor. Telegraphed with a
   red ring before impact.

3. **Climb-feel polish (L6 shaft)** — wall-jump dust trail upgrade
   (currently same as ground), altitude indicator in HUD ("FLOOR 12"
   etc.), screen tint shifts brighter as `player.y` decreases.

4. **Payoff cinematic after THE BOARD** — slow-mo, screen-fill of
   confetti + score multiplier rain + "ROOFTOP CONQUEROR" badge on
   the run card before Credits.

5. **Daily Swiirl wow feature** — the original brainstorm anchor. Spec
   below. Local-only first ship, optional backend layer later.

6. **11 remaining Pascal surprises** — Konami unlock, click-the-moon
   ×10 rotation, hold-mute secret chiptune, pet the SYNERGY, follow
   the ghost, wall-jump streak glitter, stomp-the-stack TPS bonus,
   Pacifist Hank, Flawless Mike, Parry the Vibes, Eye of the Algorithm.

7. **CEO arena (L5)** — original "Executive Summit" boss arena could
   borrow the L6 cleanup: trim cover, paint a city skyline backdrop,
   add a rooftop-door equivalent for the brand placement.

8. **Mobile-first run** — re-test prod on actual phone after all the
   recent platform/level changes. The cover-platform removals on L6
   and the wider 1600-wide arena may need touch-control retuning.

## Daily Swiirl spec (snake-sized first cut)

Brainstorm-approved earlier in this session. Not implemented.

- 60–90 second one-shot per day. Date-seeded with `mulberry32` from UTC
  date so everyone gets the same run.
- Rotation: Mon=L1, Tue=L2, …, Sat=L5, Sun=Boss Rush.
- Seed re-rolls: enemy + signal + insight + obstacle positions on the
  rotating level. Boss identity + insightsRequired stay fixed.
- One daily "twist card" from a pool of 8 (Featherweight, Lead Boots,
  Hot Take, Cold Take, One-Pump, Doubletime, Cash Cow, Vault).
- **One-and-done**: first attempt commits the score.
- Downloadable run card PNG: date, level + twist, character, rank,
  time, score, emoji summary (e.g. "🏞️ Tue · S · 1:14 · 🪙 Cash Cow").
- Local-only layer first (no backend); Vercel KV leaderboard is the
  follow-up.

## Files of note

- `play/src/scenes/Game.js` — main scene, ~1100 lines now
- `play/src/levels/level6.js` — bonus arena
- `play/src/scenes/Credits.js` — credit roll, edit placeholders
- `play/src/objects/Enemies.js` — `TheBoard` extends `TheCEO`, see line 488ish
- `play/src/touchControls.js` — pause menu + nav lives here
- `play/src/audio.js` — `Music` module + 7 chiptune tracks at the bottom
- `tools/generate-world.mjs` — SVG → PNG pipeline. `REGEN_ENEMIES=1`
  env flag to overwrite enemy art (default off; protects against
  sharp/librsvg version drift)
- `play/src/scenes/Boot.js` — `ASSET_VERSION` bumps cache-bust the CDN

## Brainstorm artifacts

- `.superpowers/brainstorm/*/content/*.html` — visual mockups from the
  brainstorm sessions (Wow direction, daily-size, L1 obstacle options,
  arena bowl vs stepped pyramid). Path may differ; check the directory.
- `.claude/plans/whener-you-jumoing-from-smooth-torvalds.md` — final
  approved design doc for the Pause + Settings + Rating + Music bundle
  (already shipped).

## Known issues / quirks

- `Q` dev-cheat teleports player using L1's `GROUND_TOP_Y` (656) —
  wrong y for L6. Cosmetic, not critical.
- Camera lean was removed (was sickening), but if you want a subtle
  speed effect, try `camera.zoom *= 1.02` during sprint instead.
- L6 act triggers use `next.y != null` for vertical mode — works, but
  if you add new horizontal levels later, the trigger logic in
  `update()` handles both.
- Music tracks use `setInterval(25ms)` scheduler for sample-accurate
  scheduling. Don't replace with `setTimeout` chains; they drift.
