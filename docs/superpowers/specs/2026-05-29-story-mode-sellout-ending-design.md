# Story Mode — "The Rise of Swiirl" (with a sellout fork)

**Date:** 2026-05-29
**Status:** Approved design, pending implementation plan
**Author:** brainstormed with Claude

## Summary

Add a **Story Mode** to the Swiirl platformer that threads the existing 6 levels
(Community Park → Up and to the Right) into a single satirical startup arc. Between
levels, lightweight **cutscene cards** (tinted portrait + typed dialogue) deliver
narrative beats, several of which pose a binary **moral choice**. Choices accumulate
a hidden **Mission score** that, at the finale, resolves to **one of three endings**
(Sellout / Compromised / True Believer) and selects the **final boss** (THE BOARD for
the non-true paths, the secret **THE MIRROR** for the true path).

Story Mode is a **new, parallel mode** — it does *not* replace the existing arcade
flow (score / ranks / daily-best), which stays exactly as shipped.

## Goals

- Give the already-strong satirical theme a real narrative spine without touching
  gameplay/physics code.
- One player-facing decision (the moral forks) that meaningfully changes the climax.
- Three distinct endings + a secret boss to reward replay.
- Save + resume a story run; a permanent "endings seen" gallery.
- Reuse existing assets (portrait sprite frames, brand sprites, boss tints, synth SFX) —
  **no new art**.

## Non-goals (YAGNI)

- No new physics, no new player abilities, no new level geometry.
- No branching *levels* — every story run plays the same 6 levels in order; only the
  finale boss and the ending cutscene differ.
- THE MIRROR copying the player's exact attack style is a **stretch goal**, explicitly
  out of v1 (see §6).
- No localization, no settings for text speed beyond a single tap-to-skip.

## Architecture

Two new files; everything else is small edits to existing files. Follows the existing
"single source of truth" convention (`config.js`, `characters.js`, `levels/*`).

### New: `play/src/story.js` (pure data + helpers, no Phaser)

Single source of truth for all story content and Mission-score logic. Exports:

- `STORY` — declarative content:
  - `opening` — the beat list shown after CharacterSelect, before level 1.
  - `interludes` — map keyed by the level just completed (`1..5`) → beat list, where
    one beat in each is a `choice`.
  - `endings` — map keyed by ending id (`sellout` / `compromised` / `true`) → beat list.
- A **beat** is one of:
  - `{ type: "line", speaker, portrait, text }` — typed dialogue, tap to advance.
  - `{ type: "choice", prompt, options: [{ label, mission }, { label, mission }] }` —
    two buttons; selecting applies `mission` delta.
- Mission helpers:
  - `THRESHOLDS = { trueBoss: +5, compromised: -2 }` (tunable).
  - `resolveEnding(score)` → `{ endingId, bossVariant }` where
    `bossVariant ∈ { "board", "mirror" }`.
    - `score < THRESHOLDS.compromised` → `sellout`, boss `board`.
    - `compromised ≤ score < trueBoss` → `compromised`, boss `board`.
    - `score ≥ trueBoss` → `true`, boss `mirror`.
- Save/load (localStorage, namespaced `swiirl.story.*`):
  - `loadStory()` / `saveStory(state)` / `clearStory()` — run state
    `{ mission, level, character }`.
  - `hasStorySave()` → boolean (drives Menu "Continue").
  - `markEndingSeen(id)` / `getEndingsSeen()` → `Set`-like array (drives gallery;
    persists across runs, never cleared by `clearStory`).

### New: `play/src/scenes/Cutscene.js`

One lightweight Phaser scene. Registered in `main.js`.

- `init({ beats, next, nextData })`:
  - `beats` — a beat list (from `STORY`).
  - `next` — scene key to start when beats are exhausted (`"Game"` or `"Credits"`).
  - `nextData` — payload forwarded to `next` (e.g. `{ level }`).
- Renders: reuse `bg_far` / `bg_near` for backdrop; a tinted portrait
  (`<skin>_celebrate` or `<skin>_idle` for the player, `brand_happy` for the Brand,
  boss textures/tints for antagonists); a rounded dialogue box with typewriter text
  (advance line on SPACE / pointer / gamepad cross).
- `choice` beats render two option buttons; selecting one:
  1. applies `option.mission` to the in-memory Mission score,
  2. calls `saveStory(...)`,
  3. advances to the next beat.
- SFX: reuse `audio.js` for a per-character typewriter blip + a confirm sound on
  choice. No new audio assets (synth only).
- Always pair any `game.events.on` with `this.events.once("shutdown", ...)` per the
  project's event-bus contract (none expected here, but follow the rule if added).

### Edits to existing files (small)

- **`main.js`** — import + register `CutsceneScene` in the `scene` array.
- **`scenes/Menu.js`** — add a **Story** entry alongside the existing Play/arcade entry.
  - "Story" with no save → start fresh (clear run state, mission 0) → CharacterSelect
    (story flag set).
  - "Story" with a save (`hasStorySave()`) → show **Continue** → resume at saved level
    with saved character + mission.
  - Render the **3-badge endings gallery** (locked/unlocked from `getEndingsSeen()`).
- **`scenes/CharacterSelect.js`** — when entered in story mode, after the player picks a
  character, persist it to story state and route to `Cutscene` with `STORY.opening`,
  `next: "Game"`, `nextData: { level: 1 }` (instead of straight to `Game`). Arcade path
  unchanged.
- **`scenes/LevelComplete.js`** — when in a story run and there is a *next* level, route
  the SPACE/continue handler through `Cutscene` (beats = `STORY.interludes[levelNum]`,
  `next: "Game"`, `nextData: { level: levelNum + 1 }`) instead of starting `Game`
  directly. Persist `{ mission, level }` here. Arcade path (`410`) unchanged.
- **`scenes/Game.js`** — on a story run at level 6, read resolved story state and pass
  the `bossVariant` to `makeBoss`. After the level-6 boss is defeated, route to
  `Cutscene` with the resolved ending beats, `next: "Credits"`; mark the ending seen
  and `clearStory()` (run save only — gallery persists).
- **`objects/Enemies.js`** — `makeBoss(scene, levelNum, x, y, health, variant)` gains an
  optional `variant`. For level 6: `variant === "mirror"` → new `TheMirror` class; else
  → existing `TheBoard`. `TheMirror` extends `TheBoard`/`TheCEO` with a distinct
  `displayName` ("THE MIRROR"), a mirror/desaturated tint, and the hardest cadence.

## Data flow

```
Menu ──"Story"──▶ CharacterSelect ──pick──▶ Cutscene(opening) ──▶ Game(1)
                                                                    │
Game(N) ──complete──▶ LevelComplete ──▶ Cutscene(interlude N, choice±) ──▶ Game(N+1)
                          (save mission, level)                              │
                                                                    ... up to Game(6)
Game(6) ──boss(variant from resolveEnding)── defeated ──▶ Cutscene(ending) ──▶ Credits
                                                  │
                                          markEndingSeen(id); clearStory()
```

Mission score lives in memory during a run and is written to `localStorage` on every
choice and every level transition, so a closed tab resumes at the last completed level
with the score intact.

## Content (concrete draft — wording is tunable in `story.js`)

**Opening:** You + a brand you believe in, walking into the Community Park to meet your
first real fans. ("Let's build something that actually means something.")

**Interlude forks** (one `choice` beat each; deltas tunable):

| After level | Fork | Sell ↓ | True ↑ |
|---|---|---|---|
| 1 Community Park | VC check that demands dropping the community mission | "Take the check" −2 | "Bootstrap it" +2 |
| 2 Corporate Maze | A competitor's dark pattern that demonstrably works | "Ship the dark pattern" −2 | "Do it clean" +2 |
| 3 Executive Summit | Loudest early fan is now "off-brand"; PR says cut them | "Cut them loose" −2 | "Stand by them" +2 |
| 4 Brand HQ | Data shows outrage spikes engagement | "Feed the outrage" −2 | "Optimize for trust" +2 |
| 5 Data Lake | The Board offers an acquisition that guts the mission | "Sign the term sheet" −3 | "Walk away" +3 |

Score range: −11 … +11. Default thresholds: `trueBoss = +5`, `compromised = −2`.

**Endings:**
- **Sellout** (score < −2): You sold. The brand is a logo on someone else's slide.
  Rich and hollow. Final boss was THE BOARD.
- **Compromised** (−2 ≤ score < +5): You "won" — grew, survived — but the mission you
  started with is a footnote. Bittersweet. Final boss was THE BOARD.
- **True Believer** (score ≥ +5): You stayed true. Smaller, real, yours; the community
  endures. Final boss was THE MIRROR (you refused the sale, so you had to face the
  version of yourself that would have caved).

## Error handling & edge cases

- **Corrupt/partial save:** `loadStory()` validates shape and falls back to a fresh run
  (mission 0, level 1) on any parse error; never throws into a scene.
- **localStorage unavailable / quota:** all writes wrapped in `try/catch` (matches the
  existing `LevelComplete.js` pattern); story still works in-session, just won't resume.
- **Resume with no character saved:** route through CharacterSelect first.
- **Player dies mid-run:** existing GameOver flow; on retry, resume from the saved level
  with the saved mission score (death does not alter Mission score).
- **Skipping/replaying:** an already-completed run leaves the run save cleared but
  `endingsSeen` intact, so the gallery reflects all endings ever reached.
- **Threshold edge values** are inclusive/exclusive exactly as written in
  `resolveEnding` so the three bands are contiguous with no gap or overlap.

## Testing

No automated test runner exists (per CLAUDE.md). Manual verification at
`http://localhost:3100/play/` (port 3100 per project workflow):

1. Start a Story run; confirm opening cutscene → level 1.
2. Make all **Sell** choices → confirm `sellout` ending + THE BOARD.
3. Make all **True** choices → confirm `true` ending + THE MIRROR.
4. Make a mix landing in `[-2, +5)` → confirm `compromised` ending + THE BOARD.
5. Close the tab mid-run; reopen → Menu shows **Continue**; resume at the right level
   with the right character and score.
6. Confirm arcade mode is byte-for-byte unchanged in behavior.
7. Confirm endings gallery lights up the badge for each ending reached and persists
   across a fresh run.
8. Verify threshold boundaries (exactly −2 and exactly +5) land in the intended bands.

## Build sequence (incrementally shippable)

1. `story.js` — data + Mission/threshold/resolve + save/load helpers (no UI).
2. `Cutscene.js` — dialogue rendering + choice buttons + advance; register in `main.js`.
3. Wire CharacterSelect → opening → Game(1), and LevelComplete → interlude → Game(N+1);
   persist on transitions.
4. Finale: `resolveEnding` → `makeBoss` variant + `TheMirror`; post-boss ending cutscene
   → Credits; `markEndingSeen` + `clearStory`.
5. Menu: Story entry + Continue + 3-badge endings gallery.

## Open / deferred

- **Stretch:** THE MIRROR mimics the player's chosen attack style (reuses
  `ATTACK_TUNING`). Out of v1; revisit after the core ships.
- Exact dialogue wording and Mission deltas are tunable in `story.js` after playtest.
