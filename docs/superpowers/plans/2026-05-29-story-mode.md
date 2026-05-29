# Story Mode — "The Rise of Swiirl" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a parallel Story Mode that threads the existing 6 levels into a startup arc with between-level moral-choice cutscenes, a hidden Mission score, three endings (Sellout / Compromised / True Believer), and a secret final boss (THE MIRROR) — without altering the existing arcade flow.

**Architecture:** Two new files — `play/src/story.js` (pure data + Mission/threshold/resolve/save-load helpers, no Phaser, no top-level `localStorage`) and `play/src/scenes/Cutscene.js` (a lightweight dialogue+choice scene). Everything else is small edits to `main.js`, `Menu.js`, `CharacterSelect.js`, `LevelComplete.js`, `Game.js`, and `objects/Enemies.js`. Story state lives in the Phaser registry during a run (`storyMode`, `storyMission`, `character`) and mirrors to `localStorage` (`swiirl.story.*`) for save/resume. The finale branch only swaps the L6 boss variant and routes the ending cutscene through `LevelComplete` (the existing single hop point).

**Tech Stack:** Plain ES modules, Phaser 3 (CDN global `window.Phaser`), no bundler/test-runner/linter. Verification = `node --check` (syntax), one Node smoke test (`tools/story.test.mjs`), and manual browser testing at `http://localhost:3100/play/`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `play/src/story.js` (new) | Single source of truth: `STORY` content, `THRESHOLDS`, `resolveEnding`, save/load/gallery helpers. Pure — imports cleanly under Node. |
| `play/src/scenes/Cutscene.js` (new) | One scene: backdrop + portrait + typewriter dialogue + choice buttons; on finish starts `next` scene. |
| `tools/story.test.mjs` (new) | Node smoke test for `story.js` pure logic. |
| `play/src/main.js` (edit) | Register `CutsceneScene`. |
| `play/src/scenes/Menu.js` (edit) | Story/Continue entry, endings gallery, set `storyMode` flag (arcade sets it false). |
| `play/src/scenes/CharacterSelect.js` (edit) | In story mode, route confirm → opening Cutscene → Game(1). |
| `play/src/scenes/LevelComplete.js` (edit) | In story mode, route to interlude Cutscene between levels and ending Cutscene at the finale. |
| `play/src/scenes/Game.js` (edit) | At L6 in story mode, pass resolved `bossVariant` to `makeBoss`. |
| `play/src/objects/Enemies.js` (edit) | `makeBoss` gains `variant`; add `TheMirror` boss class. |

---

## Task 1: `story.js` — content, thresholds, resolution, persistence

**Files:**
- Create: `play/src/story.js`
- Test: `tools/story.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `tools/story.test.mjs`:

```js
// Node smoke test for the pure logic in play/src/story.js.
// Run: node tools/story.test.mjs   (exit 0 = pass)
import assert from "node:assert/strict";
import { STORY, THRESHOLDS, resolveEnding } from "../play/src/story.js";

// --- resolveEnding bands (contiguous, boundaries inclusive at the low edge) ---
assert.deepEqual(resolveEnding(-11), { endingId: "sellout", bossVariant: "board" });
assert.deepEqual(resolveEnding(-3),  { endingId: "sellout", bossVariant: "board" });
assert.deepEqual(resolveEnding(THRESHOLDS.compromised),     { endingId: "compromised", bossVariant: "board" }); // -2 inclusive
assert.deepEqual(resolveEnding(0),   { endingId: "compromised", bossVariant: "board" });
assert.deepEqual(resolveEnding(THRESHOLDS.trueBoss - 1),    { endingId: "compromised", bossVariant: "board" }); // 4
assert.deepEqual(resolveEnding(THRESHOLDS.trueBoss),        { endingId: "true", bossVariant: "mirror" });        // 5 inclusive
assert.deepEqual(resolveEnding(11), { endingId: "true", bossVariant: "mirror" });

// --- content shape: 5 interludes, each exactly one 2-option choice ---
for (let lvl = 1; lvl <= 5; lvl++) {
  const beats = STORY.interludes[lvl];
  assert.ok(Array.isArray(beats) && beats.length > 0, `interlude ${lvl} exists`);
  const choices = beats.filter(b => b.type === "choice");
  assert.equal(choices.length, 1, `interlude ${lvl} has exactly one choice`);
  assert.equal(choices[0].options.length, 2, `interlude ${lvl} choice has 2 options`);
  const deltas = choices[0].options.map(o => o.mission);
  assert.ok(deltas.some(d => d < 0) && deltas.some(d => d > 0),
    `interlude ${lvl} has a sell (<0) and a true (>0) option`);
}

// --- all three endings have content ---
for (const id of ["sellout", "compromised", "true"]) {
  assert.ok(Array.isArray(STORY.endings[id]) && STORY.endings[id].length > 0, `ending ${id} has beats`);
}

// --- reachability: all-sell lands sellout, all-true lands true ---
const choiceOf = lvl => STORY.interludes[lvl].find(b => b.type === "choice");
const allSell = [1,2,3,4,5].reduce((s, l) => s + Math.min(...choiceOf(l).options.map(o => o.mission)), 0);
const allTrue = [1,2,3,4,5].reduce((s, l) => s + Math.max(...choiceOf(l).options.map(o => o.mission)), 0);
assert.equal(resolveEnding(allSell).endingId, "sellout");
assert.equal(resolveEnding(allTrue).endingId, "true");

console.log("story.js smoke tests passed");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tools/story.test.mjs`
Expected: FAIL — `Cannot find module '.../play/src/story.js'` (file not created yet).

- [ ] **Step 3: Create `play/src/story.js`**

```js
// play/src/story.js
// Single source of truth for Story Mode ("The Rise of Swiirl"): the narrative
// script (opening, inter-level interludes with moral choices, and the three
// endings), the Mission-score thresholds, ending resolution, and save/load.
//
// Pure data + functions — NO Phaser, and NO module-level localStorage access,
// so this file imports cleanly under Node for tools/story.test.mjs.

// --- Mission thresholds (tunable) ---------------------------------------
// Bands are contiguous (no gap / no overlap):
//   score <  compromised               -> "sellout"      (boss: board)
//   compromised <= score < trueBoss    -> "compromised"  (boss: board)
//   score >= trueBoss                  -> "true"          (boss: mirror)
export const THRESHOLDS = { compromised: -2, trueBoss: 5 };

export function resolveEnding(score) {
  const n = Number.isFinite(score) ? score : 0;
  if (n >= THRESHOLDS.trueBoss)     return { endingId: "true",        bossVariant: "mirror" };
  if (n >= THRESHOLDS.compromised)  return { endingId: "compromised", bossVariant: "board"  };
  return { endingId: "sellout", bossVariant: "board" };
}

// --- Narrative content --------------------------------------------------
// Beat types:
//   { type: "line",   speaker, portrait, text }
//   { type: "choice", prompt, options: [{ label, mission }, { label, mission }] }
// `portrait` is a token resolved by Cutscene.js:
//   "player" -> chosen skin's idle frame, "brand" -> brand_happy,
//   "mirror" -> chosen skin idle, dark-tinted; any other string -> literal
//   texture key (e.g. "enemy_jargon_blob"), falling back to "cloud".
export const STORY = {
  opening: [
    { type: "line", speaker: "YOU", portrait: "player",
      text: "One brand. One mission. A community that actually believes in something." },
    { type: "line", speaker: "YOU", portrait: "player",
      text: "Let's build something real — before the suits show up." },
  ],

  // keyed by the level JUST completed (1..5)
  interludes: {
    1: [
      { type: "line", speaker: "HOT-MONEY VC", portrait: "enemy_jargon_blob",
        text: "Cute little park. Here's a seven-figure check — just drop the 'community' stuff and optimize for growth." },
      { type: "choice", prompt: "Take the check?", options: [
        { label: "Take the check", mission: -2 },
        { label: "Bootstrap it",   mission: +2 },
      ] },
    ],
    2: [
      { type: "line", speaker: "GROWTH LEAD", portrait: "enemy_paperwork",
        text: "Competitor's running a fake-scarcity dark pattern. Conversions up 40%. We could ship the same by Friday." },
      { type: "choice", prompt: "Ship the dark pattern?", options: [
        { label: "Ship it",     mission: -2 },
        { label: "Do it clean", mission: +2 },
      ] },
    ],
    3: [
      { type: "line", speaker: "PR CHIEF", portrait: "brand",
        text: "Your loudest early supporter went 'off-brand' online. Optics are bad. We should quietly cut them loose." },
      { type: "choice", prompt: "Cut them loose?", options: [
        { label: "Cut them loose", mission: -2 },
        { label: "Stand by them",  mission: +2 },
      ] },
    ],
    4: [
      { type: "line", speaker: "THE ALGORITHM", portrait: "enemy_ghost",
        text: "The data is clear: outrage spikes engagement. Feed the feed. Trust is a slower curve." },
      { type: "choice", prompt: "Feed the outrage?", options: [
        { label: "Feed the outrage",    mission: -2 },
        { label: "Optimize for trust",  mission: +2 },
      ] },
    ],
    5: [
      { type: "line", speaker: "THE BOARD", portrait: "boss",
        text: "Final offer. We acquire you, you get rich, and the mission becomes... a line in the deck. Sign here." },
      { type: "choice", prompt: "Sign the term sheet?", options: [
        { label: "Sign the term sheet", mission: -3 },
        { label: "Walk away",           mission: +3 },
      ] },
    ],
  },

  endings: {
    sellout: [
      { type: "line", speaker: "THE BOARD", portrait: "boss",
        text: "Welcome aboard. The logo stays; everything you meant by it does not." },
      { type: "line", speaker: "YOU", portrait: "player",
        text: "Rich. Done. Hollow. The community moved on the day the term sheet did." },
      { type: "line", speaker: "—", portrait: "brand", text: "ENDING:  SELLOUT" },
    ],
    compromised: [
      { type: "line", speaker: "YOU", portrait: "player",
        text: "We won. We scaled. We survived. Somewhere in the charts, the reason we started became a footnote." },
      { type: "line", speaker: "—", portrait: "brand", text: "ENDING:  COMPROMISED" },
    ],
    true: [
      { type: "line", speaker: "THE MIRROR", portrait: "mirror",
        text: "You could have taken the deal. I'm what's left if you had." },
      { type: "line", speaker: "YOU", portrait: "player",
        text: "Smaller. Real. Ours. The community's still here — and so are we." },
      { type: "line", speaker: "—", portrait: "brand", text: "ENDING:  TRUE BELIEVER" },
    ],
  },
};

// --- Persistence (guarded; safe under Node where localStorage is absent) ---
const KEY = {
  mission:   "swiirl.story.mission",
  level:     "swiirl.story.level",
  character: "swiirl.story.character",
  endings:   "swiirl.story.endingsSeen",
};

function store() {
  try { return (typeof localStorage !== "undefined") ? localStorage : null; }
  catch { return null; }
}

export function hasStorySave() {
  const s = store();
  if (!s) return false;
  return s.getItem(KEY.level) != null && s.getItem(KEY.character) != null;
}

export function loadStory() {
  const fallback = { mission: 0, level: 1, character: null };
  const s = store();
  if (!s) return fallback;
  try {
    const level = parseInt(s.getItem(KEY.level), 10);
    const mission = parseInt(s.getItem(KEY.mission), 10);
    const character = s.getItem(KEY.character);
    if (!Number.isFinite(level) || level < 1 || level > 6) return fallback;
    return {
      mission: Number.isFinite(mission) ? mission : 0,
      level,
      character: character || null,
    };
  } catch { return fallback; }
}

export function saveStory({ mission, level, character }) {
  const s = store();
  if (!s) return;
  try {
    s.setItem(KEY.mission, String(mission ?? 0));
    s.setItem(KEY.level, String(level ?? 1));
    if (character) s.setItem(KEY.character, String(character));
  } catch {}
}

export function clearStory() {
  const s = store();
  if (!s) return;
  try {
    s.removeItem(KEY.mission);
    s.removeItem(KEY.level);
    s.removeItem(KEY.character);
  } catch {}
}

export function getEndingsSeen() {
  const s = store();
  if (!s) return [];
  try {
    const raw = s.getItem(KEY.endings);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function markEndingSeen(id) {
  const s = store();
  if (!s) return;
  try {
    const seen = getEndingsSeen();
    if (!seen.includes(id)) {
      seen.push(id);
      s.setItem(KEY.endings, JSON.stringify(seen));
    }
  } catch {}
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tools/story.test.mjs`
Expected: prints `story.js smoke tests passed`, exit 0.

- [ ] **Step 5: Syntax-check the module**

Run: `node --check play/src/story.js`
Expected: no output, exit 0.

- [ ] **Step 6: Commit**

```bash
git add play/src/story.js tools/story.test.mjs
git commit -m "story: add Story Mode content, thresholds, and persistence"
```

---

## Task 2: `Cutscene.js` scene + register in `main.js`

**Files:**
- Create: `play/src/scenes/Cutscene.js`
- Modify: `play/src/main.js` (imports + `scene` array, lines 1-37)

- [ ] **Step 1: Create `play/src/scenes/Cutscene.js`**

```js
// play/src/scenes/Cutscene.js
// Lightweight story scene: backdrop + tinted portrait + typewriter dialogue
// box, advanced by tap / SPACE / gamepad. A "choice" beat renders two buttons;
// picking one applies its Mission delta, persists, and advances. When the beat
// list is exhausted, starts `next` (and launches HUD when next is "Game").
//
// init({ beats, next, nextData }):
//   beats    - array of beats from STORY (see story.js)
//   next     - scene key to start at the end ("Game" or "Credits")
//   nextData - payload forwarded to `next` (e.g. { level: 2 })

import { SFX, Music } from "../audio.js";
import { saveStory } from "../story.js";

export class CutsceneScene extends Phaser.Scene {
  constructor() { super("Cutscene"); }

  init(data) {
    this.beats = data?.beats ?? [];
    this.nextScene = data?.next ?? "Menu";
    this.nextData = data?.nextData ?? {};
    this.idx = 0;
    this.typing = false;
    this.choiceButtons = [];
    this.typeEvent = null;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.fadeIn(300, 26, 15, 46);
    Music.setIntensity(0.3);

    // Backdrop (reuse world art).
    this.add.image(width / 2, height / 2, "bg_far").setDisplaySize(width, height);
    this.add.image(width / 2, height - 100, "bg_near")
      .setOrigin(0.5, 1).setScale(0.7).setAlpha(0.4);

    // Portrait (left of the dialogue panel).
    this.portrait = this.add.image(width * 0.26, height * 0.5, "cloud").setScale(0.7);

    // Dialogue panel (bottom band).
    const panelTop = height - 190;
    const panel = this.add.graphics();
    panel.fillStyle(0x1a0f2e, 0.92);
    panel.lineStyle(3, 0x5C3BA3, 1);
    panel.fillRoundedRect(60, panelTop, width - 120, 150, 16);
    panel.strokeRoundedRect(60, panelTop, width - 120, 150, 16);

    this.speakerText = this.add.text(86, panelTop + 16, "", {
      fontFamily: "system-ui, sans-serif", fontSize: "16px", fontStyle: "900",
      color: "#ffd24a", letterSpacing: 3,
    });
    this.bodyText = this.add.text(86, panelTop + 48, "", {
      fontFamily: "system-ui, sans-serif", fontSize: "19px", color: "#ffffff",
      wordWrap: { width: width - 200 }, lineSpacing: 6,
    });
    this.hint = this.add.text(width - 96, panelTop + 124, "▶  tap / SPACE", {
      fontFamily: "system-ui, sans-serif", fontSize: "13px", color: "#dcc7f2",
    }).setOrigin(1, 0.5).setAlpha(0);

    // Advance handlers.
    const advance = () => this.onAdvance();
    this.input.keyboard.on("keydown-SPACE", advance);
    this.input.keyboard.on("keydown-ENTER", advance);
    // Ignore clicks that land on a choice button (they have their own handler).
    this.input.on("pointerdown", (pointer, currentlyOver) => {
      if (currentlyOver && currentlyOver.length) return;
      this.onAdvance();
    });
    const padAdvance = () => { if (!window.__pauseModalOpen) this.onAdvance(); };
    this.game.events.on("gamepad-cross", padAdvance);
    this.events.once("shutdown", () => this.game.events.off("gamepad-cross", padAdvance));

    this.showBeat();
  }

  portraitTexture(portrait) {
    const skin = this.registry.get("character")?.spriteKey ?? "beanie";
    if (portrait === "player" || portrait === "mirror") {
      return this.textures.exists(`${skin}_idle`) ? `${skin}_idle` : "idle";
    }
    if (portrait === "brand") return "brand_happy";
    return this.textures.exists(portrait) ? portrait : "cloud";
  }

  showBeat() {
    const beat = this.beats[this.idx];
    if (!beat) { this.finish(); return; }

    const key = this.portraitTexture(beat.portrait);
    this.portrait.setTexture(key);
    this.portrait.clearTint();
    if (beat.portrait === "mirror") this.portrait.setTint(0x444466);
    this.portrait.setScale(key === "brand_happy" ? 0.9 : 0.7);

    if (beat.type === "choice") { this.showChoice(beat); return; }

    // line beat: typewriter reveal.
    this.clearChoices();
    this.speakerText.setText(beat.speaker ?? "");
    this.bodyText.setText("");
    this.hint.setAlpha(0);
    this.typing = true;
    this.fullText = beat.text ?? "";
    this.charIdx = 0;
    if (this.typeEvent) this.typeEvent.remove();
    this.typeEvent = this.time.addEvent({
      delay: 22, repeat: Math.max(0, this.fullText.length - 1),
      callback: () => {
        this.charIdx++;
        this.bodyText.setText(this.fullText.slice(0, this.charIdx));
        if (this.charIdx % 3 === 0) SFX.collect();
        if (this.charIdx >= this.fullText.length) { this.typing = false; this.hint.setAlpha(1); }
      },
    });
    if (this.fullText.length === 0) { this.typing = false; this.hint.setAlpha(1); }
  }

  showChoice(beat) {
    this.typing = false;
    this.speakerText.setText("");
    this.bodyText.setText(beat.prompt ?? "");
    this.hint.setAlpha(0);
    this.clearChoices();

    const { width, height } = this.scale;
    const btnW = 300, gap = 40, btnY = height - 250;
    const totalW = 2 * btnW + gap;
    const startX = (width - totalW) / 2 + btnW / 2;
    beat.options.forEach((opt, i) => {
      const bx = startX + i * (btnW + gap);
      const bg = this.add.rectangle(bx, btnY, btnW, 64, 0x2a1850, 0.95)
        .setStrokeStyle(3, 0xffd24a).setInteractive({ useHandCursor: true });
      const label = this.add.text(bx, btnY, opt.label, {
        fontFamily: "system-ui, sans-serif", fontSize: "17px", fontStyle: "700",
        color: "#ffffff", align: "center", wordWrap: { width: btnW - 24 },
      }).setOrigin(0.5);
      bg.on("pointerover", () => bg.setFillStyle(0x3a2470, 1));
      bg.on("pointerout",  () => bg.setFillStyle(0x2a1850, 0.95));
      bg.on("pointerdown", () => this.pickChoice(opt));
      this.choiceButtons.push(bg, label);
    });
  }

  pickChoice(opt) {
    SFX.win();
    const mission = (this.registry.get("storyMission") ?? 0) + (opt.mission ?? 0);
    this.registry.set("storyMission", mission);
    const level = this.nextData?.level ?? 1;       // the level this cutscene leads into
    const character = this.registry.get("character")?.id ?? null;
    saveStory({ mission, level, character });
    this.clearChoices();
    this.idx++;
    this.showBeat();
  }

  clearChoices() {
    this.choiceButtons.forEach(o => o.destroy());
    this.choiceButtons = [];
  }

  onAdvance() {
    if (window.__pauseModalOpen) return;
    const beat = this.beats[this.idx];
    if (beat?.type === "choice") return;            // choices need a button click
    if (this.typing) {                               // fast-forward typewriter
      if (this.typeEvent) this.typeEvent.remove();
      this.bodyText.setText(this.fullText);
      this.typing = false;
      this.hint.setAlpha(1);
      return;
    }
    this.idx++;
    this.showBeat();
  }

  finish() {
    this.cameras.main.fadeOut(300, 26, 15, 46);
    this.time.delayedCall(320, () => {
      if (this.nextScene === "Game") {
        this.scene.start("Game", this.nextData);
        this.scene.launch("HUD");
      } else {
        this.scene.start(this.nextScene, this.nextData);
      }
    });
  }
}
```

- [ ] **Step 2: Syntax-check the new scene**

Run: `node --check play/src/scenes/Cutscene.js`
Expected: no output, exit 0.

- [ ] **Step 3: Register the scene in `main.js`**

In `play/src/main.js`, add the import alongside the other scene imports (after the `CreditsScene` import line):

```js
import { CutsceneScene } from "./scenes/Cutscene.js";
```

Then add `CutsceneScene` to the `scene` array (currently line 37). Replace:

```js
  scene: [BootScene, MenuScene, CharacterSelectScene, GameScene, HUDScene, LevelCompleteScene, GameOverScene, CreditsScene],
```

with:

```js
  scene: [BootScene, MenuScene, CharacterSelectScene, CutsceneScene, GameScene, HUDScene, LevelCompleteScene, GameOverScene, CreditsScene],
```

- [ ] **Step 4: Syntax-check main.js**

Run: `node --check play/src/main.js`
Expected: no output, exit 0.

- [ ] **Step 5: Commit**

```bash
git add play/src/scenes/Cutscene.js play/src/main.js
git commit -m "story: add Cutscene scene and register it"
```

---

## Task 3: Menu — Story/Continue entry, endings gallery, storyMode flag

**Files:**
- Modify: `play/src/scenes/Menu.js` (imports at top; `start` block lines 158-174; add UI)

- [ ] **Step 1: Add the story import**

In `play/src/scenes/Menu.js`, after the existing imports (line 5), add:

```js
import { hasStorySave, loadStory, clearStory, getEndingsSeen } from "../story.js";
import { getCharacter } from "../characters.js";
```

- [ ] **Step 2: Replace the `start` block with arcade + story starters**

Replace the entire block (lines 158-174, from `const start = () => {` through the `this.events.once("shutdown", ...)` line that unsubscribes `start`):

```js
    // --- Arcade start (existing behavior) ---
    let starting = false;
    const startArcade = () => {
      if (window.__pauseModalOpen || starting) return;
      starting = true;
      this.registry.set("storyMode", false);
      SFX.collect();
      this.cameras.main.fadeOut(420, 26, 15, 46);
      this.time.delayedCall(440, () => this.scene.start("CharacterSelect"));
    };

    // --- Story start / continue ---
    const startStory = () => {
      if (window.__pauseModalOpen || starting) return;
      starting = true;
      this.registry.set("storyMode", true);
      SFX.collect();
      if (hasStorySave()) {
        const s = loadStory();
        this.registry.set("storyMission", s.mission);
        this.registry.set("character", getCharacter(s.character));
        this.cameras.main.fadeOut(420, 26, 15, 46);
        this.time.delayedCall(440, () => {
          this.scene.start("Game", { level: s.level });
          this.scene.launch("HUD");
        });
      } else {
        clearStory();
        this.registry.set("storyMission", 0);
        this.cameras.main.fadeOut(420, 26, 15, 46);
        this.time.delayedCall(440, () => this.scene.start("CharacterSelect"));
      }
    };

    // SPACE / ENTER / gamepad-× = arcade. A pointer click counts as arcade
    // ONLY when it doesn't land on an interactive button (e.g. the Story
    // button or feedback prompt have their own handlers).
    this.input.keyboard.once("keydown-SPACE", startArcade);
    this.input.keyboard.once("keydown-ENTER", startArcade);
    this.input.on("pointerdown", (pointer, currentlyOver) => {
      if (currentlyOver && currentlyOver.length) return;
      startArcade();
    });
    this.game.events.once("gamepad-cross", startArcade);
    this.events.once("shutdown", () => this.game.events.off("gamepad-cross", startArcade));

    // --- Story Mode button ---
    const storyLabel = hasStorySave() ? "▶  CONTINUE  STORY" : "▶  STORY  MODE";
    const sBtnY = height - 150;
    const sBtn = this.add.rectangle(width / 2, sBtnY, 320, 52, 0x2a1850, 0.95)
      .setStrokeStyle(3, 0xffd24a).setInteractive({ useHandCursor: true });
    const sTxt = this.add.text(width / 2, sBtnY, storyLabel, {
      fontFamily: "system-ui, sans-serif", fontSize: "18px", fontStyle: "900",
      color: "#ffd24a", letterSpacing: 3,
    }).setOrigin(0.5);
    sBtn.on("pointerover", () => sBtn.setFillStyle(0x3a2470, 1));
    sBtn.on("pointerout",  () => sBtn.setFillStyle(0x2a1850, 0.95));
    sBtn.on("pointerdown", startStory);

    // --- Endings gallery (3 badges, locked until earned) ---
    const seen = getEndingsSeen();
    const endingDefs = [
      { id: "sellout",     label: "SELLOUT",       color: "#e0556b" },
      { id: "compromised", label: "COMPROMISED",   color: "#e8c98a" },
      { id: "true",        label: "TRUE BELIEVER", color: "#7bd389" },
    ];
    const galleryY = height - 100;
    this.add.text(width / 2, galleryY - 18, "ENDINGS", {
      fontFamily: "system-ui, sans-serif", fontSize: "10px",
      color: "#b892e0", letterSpacing: 5,
    }).setOrigin(0.5);
    const badgeW = 130, bgap = 10;
    const gTotalW = endingDefs.length * badgeW + (endingDefs.length - 1) * bgap;
    const gStartX = (width - gTotalW) / 2 + badgeW / 2;
    endingDefs.forEach((e, i) => {
      const cx = gStartX + i * (badgeW + bgap);
      const unlocked = seen.includes(e.id);
      const color = unlocked ? e.color : "#3a2860";
      this.add.rectangle(cx, galleryY + 6, badgeW, 26, 0x1a0f2e, 0.55)
        .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(color).color);
      this.add.text(cx, galleryY + 6, unlocked ? e.label : "🔒", {
        fontFamily: "system-ui, sans-serif",
        fontSize: unlocked ? "11px" : "13px",
        fontStyle: "700",
        color: unlocked ? color : "#5C3BA3",
        letterSpacing: 2,
      }).setOrigin(0.5);
    });
```

- [ ] **Step 3: Syntax-check Menu.js**

Run: `node --check play/src/scenes/Menu.js`
Expected: no output, exit 0.

- [ ] **Step 4: Manual browser verification**

Start the dev server if not running: `npm run dev` (serves on port 3000) — or the project's preferred `:3100` if configured. Open `http://localhost:3100/play/`.

Verify:
- The title screen shows a **STORY MODE** button and an **ENDINGS** row with 3 locked (🔒) badges.
- Pressing **SPACE** still goes to CharacterSelect (arcade) exactly as before.
- Clicking the **STORY MODE** button goes to CharacterSelect (no save yet) and does **not** also trigger the arcade path.

- [ ] **Step 5: Commit**

```bash
git add play/src/scenes/Menu.js
git commit -m "story: add Story Mode menu entry, continue, and endings gallery"
```

---

## Task 4: CharacterSelect — story branch into the opening cutscene

**Files:**
- Modify: `play/src/scenes/CharacterSelect.js` (imports at top; `confirm()` lines 175-185)

- [ ] **Step 1: Add the story import**

In `play/src/scenes/CharacterSelect.js`, after the existing imports (line 13), add:

```js
import { STORY, saveStory } from "../story.js";
```

- [ ] **Step 2: Branch `confirm()` on story mode**

Replace the `confirm()` method body (lines 175-185):

```js
  confirm() {
    const chosen = CHARACTERS[this.selectedIdx];
    localStorage.setItem("swiirl.character", chosen.id);
    this.registry.set("character", chosen);
    SFX.win();
    this.cameras.main.fadeOut(450, 26, 15, 46);
    this.time.delayedCall(470, () => {
      if (this.registry.get("storyMode")) {
        // Begin a fresh story run: persist the starting state and play the
        // opening cutscene, which then starts Game level 1 (+ HUD).
        saveStory({ mission: 0, level: 1, character: chosen.id });
        this.registry.set("storyMission", 0);
        this.scene.start("Cutscene", {
          beats: STORY.opening, next: "Game", nextData: { level: 1 },
        });
      } else {
        this.scene.start("Game");
        this.scene.launch("HUD");
      }
    });
  }
```

- [ ] **Step 3: Syntax-check CharacterSelect.js**

Run: `node --check play/src/scenes/CharacterSelect.js`
Expected: no output, exit 0.

- [ ] **Step 4: Manual browser verification**

At `http://localhost:3100/play/`:
- Click **STORY MODE** → pick a character → confirm.
- Expected: the **opening cutscene** plays (two "YOU" lines, typewriter, tap/SPACE to advance), then fades into **level 1** with the HUD visible.
- Confirm **arcade** (SPACE from menu → pick → confirm) still jumps straight into the game with **no** cutscene.

- [ ] **Step 5: Commit**

```bash
git add play/src/scenes/CharacterSelect.js
git commit -m "story: route character select into the opening cutscene"
```

---

## Task 5: LevelComplete — interlude cutscenes between levels 1–5

**Files:**
- Modify: `play/src/scenes/LevelComplete.js` (import at top; `restart` block lines 400-414)

- [ ] **Step 1: Add the story import**

In `play/src/scenes/LevelComplete.js`, after the existing imports (line 17), add:

```js
import { STORY, resolveEnding, markEndingSeen, clearStory, saveStory } from "../story.js";
```

- [ ] **Step 2: Replace the `restart` handler with a story-aware version**

Replace the `restart` function (lines 400-414, from `const restart = () => {` through its closing `};`):

```js
    const restart = () => {
      if (window.__pauseModalOpen) return;
      this.cameras.main.fadeOut(400, 26, 15, 46);
      this.time.delayedCall(420, () => {
        const storyMode = this.registry.get("storyMode");
        const levelNum = this.payload.levelNum ?? 1;

        if (storyMode) {
          this.scene.stop("HUD");
          if (levelNum >= 6) {
            // Finale: resolve the ending from the Mission score, play it,
            // record it, clear the run save, then roll credits.
            const mission = this.registry.get("storyMission") ?? 0;
            const { endingId } = resolveEnding(mission);
            markEndingSeen(endingId);
            clearStory();
            this.scene.start("Cutscene", {
              beats: STORY.endings[endingId], next: "Credits", nextData: {},
            });
            return;
          }
          // Between levels: play this level's interlude (with its moral
          // choice), which then starts the next level (+ HUD).
          const nextLevel = levelNum + 1;
          saveStory({
            mission: this.registry.get("storyMission") ?? 0,
            level: nextLevel,
            character: this.registry.get("character")?.id ?? null,
          });
          this.scene.start("Cutscene", {
            beats: STORY.interludes[levelNum], next: "Game", nextData: { level: nextLevel },
          });
          return;
        }

        // --- Arcade (unchanged) ---
        if (levelNum === 6) {
          this.scene.stop("HUD");
          this.scene.start("Credits");
          return;
        }
        const nextLevel = isLastLevel ? 1 : levelNum + 1;
        this.scene.start("Game", { level: nextLevel });
        this.scene.launch("HUD");
      });
    };
```

- [ ] **Step 3: Syntax-check LevelComplete.js**

Run: `node --check play/src/scenes/LevelComplete.js`
Expected: no output, exit 0.

- [ ] **Step 4: Manual browser verification**

At `http://localhost:3100/play/`, start a Story run and beat level 1 (tip: collect the required insights and reach the Brand to trigger LevelComplete).
- Expected on the LevelComplete "continue": the **level-1 interlude** plays — the HOT-MONEY VC line, then a **two-button choice** ("Take the check" / "Bootstrap it"). Picking one fades into **level 2** with the HUD.
- Confirm **arcade** level transitions are unchanged (beat arcade level 1 → straight to level 2, no cutscene).

- [ ] **Step 5: Commit**

```bash
git add play/src/scenes/LevelComplete.js
git commit -m "story: play inter-level interludes with moral choices"
```

---

## Task 6: Finale boss branch — `TheMirror` + Game L6 variant + ending cutscene

The ending-cutscene routing already landed in Task 5. This task adds the boss branch so the True path fights THE MIRROR and the other paths fight THE BOARD.

**Files:**
- Modify: `play/src/objects/Enemies.js` (`makeBoss` + new `TheMirror` class, near lines 508-537)
- Modify: `play/src/scenes/Game.js` (import at top; boss spawn at line 259-265)

- [ ] **Step 1: Add the `TheMirror` boss class**

In `play/src/objects/Enemies.js`, immediately after the `TheBoard` class (it ends just before `export function makeBoss`), add:

```js
/** THE MIRROR — true-path secret final boss: your own would-be-sellout self.
 *  Reuses THE BOARD's relentless always-phase-3 cadence; distinct name and a
 *  cold mirror tint. (Stretch goal, not in v1: render the player's chosen skin
 *  and mimic their attack style via ATTACK_TUNING.) */
export class TheMirror extends TheBoard {
  constructor(scene, x, y, health = 18) {
    super(scene, x, y, health);
    this.displayName = "THE MIRROR";
    this.bossTint = 0x6a7bbf;
    this.setTint(this.bossTint);
  }
}
```

- [ ] **Step 2: Give `makeBoss` a `variant` parameter**

In the same file, replace the `makeBoss` function:

```js
export function makeBoss(scene, levelNum, x, y, health, variant = "board") {
  switch (levelNum) {
    case 1: return new HotTakeHank(scene, x, y, health);
    case 2: return new ManagerMike(scene, x, y, health);
    case 3: return new VPVibes(scene, x, y, health);
    case 4: return new TheAlgorithm(scene, x, y, health);
    case 5: return new TheCEO(scene, x, y, health);
    case 6: return variant === "mirror"
      ? new TheMirror(scene, x, y, health)
      : new TheBoard(scene, x, y, health);
    default: return new BossBase(scene, x, y, health);
  }
}
```

- [ ] **Step 3: Syntax-check Enemies.js**

Run: `node --check play/src/objects/Enemies.js`
Expected: no output, exit 0.

- [ ] **Step 4: Pass the resolved variant from Game.js**

In `play/src/scenes/Game.js`, add the import after the existing `Enemies.js` import (line 6):

```js
import { resolveEnding } from "../story.js";
```

Then replace the boss-spawn block (lines 259-265):

```js
    if (lvl.miniBoss) {
      // Story mode picks the L6 boss from the Mission score: True path
      // (mirror) unlocks THE MIRROR; every other path faces THE BOARD.
      let variant = "board";
      if (this.registry.get("storyMode") && this.levelNum === 6) {
        variant = resolveEnding(this.registry.get("storyMission") ?? 0).bossVariant;
      }
      this.boss = makeBoss(this, this.levelNum, lvl.miniBoss.x, lvl.miniBoss.y, lvl.miniBoss.health ?? 3, variant);
      this.boss.setVisible(false);
      this.boss.body.enable = false;
    }
```

- [ ] **Step 5: Syntax-check Game.js**

Run: `node --check play/src/scenes/Game.js`
Expected: no output, exit 0.

- [ ] **Step 6: Manual browser verification**

This is the full end-to-end pass. At `http://localhost:3100/play/`, open DevTools to set the score quickly without playing all 5 levels:

*True path (mirror + true ending):*
1. From the menu, click **STORY MODE**, pick a character — you'll land in the opening cutscene. Before advancing into level 1, in the console run:
   `game.registry.set("storyMode", true); game.registry.set("storyMission", 11);`
2. Use the console to jump to the finale: `game.scene.start("Game", { level: 6 }); game.scene.launch("HUD");`
3. Expected: the L6 boss is **THE MIRROR** (name in HUD, cold blue tint). Beat it → LevelComplete → continue → **TRUE BELIEVER** ending cutscene → Credits.

*Sellout path (board + sellout ending):*
1. Repeat but set `game.registry.set("storyMission", -11);` then start level 6.
2. Expected: boss is **THE BOARD** (crimson). Beat it → **SELLOUT** ending → Credits.

*Compromised path:* set `storyMission` to `0`, start level 6 → **THE BOARD** → **COMPROMISED** ending.

*Persistence + gallery:* after each finish, return to the menu and confirm the matching **endings gallery badge** is now unlocked, and that it persists after a page reload. Confirm a mid-run reload offers **CONTINUE STORY** and resumes at the saved level with the saved character.

*Arcade regression:* play arcade to level 6 → confirm boss is **THE BOARD** and finishing rolls **Credits** with no story cutscene.

- [ ] **Step 7: Commit**

```bash
git add play/src/objects/Enemies.js play/src/scenes/Game.js
git commit -m "story: add THE MIRROR finale boss and Mission-driven L6 branch"
```

---

## Self-Review

**Spec coverage:**
- §Architecture two new files → Tasks 1, 2. ✅
- §"new parallel mode, arcade untouched" → `storyMode` registry flag gates every branch; arcade paths left intact (Tasks 3, 5, 6). ✅
- §Mission score + 3 contiguous bands → `THRESHOLDS` + `resolveEnding`, tested at boundaries (Task 1). ✅
- §Cutscene delivery (portrait + typed dialogue + choice buttons) → Task 2. ✅
- §5 interlude forks + opening + 3 endings (concrete content) → `STORY` in Task 1, content-shape test. ✅
- §Finale: score picks boss (board vs mirror) + ending → Tasks 5 (ending routing) + 6 (boss). ✅
- §`TheMirror` reuses boss system; stretch (mimic attacks) deferred → Task 6 comment. ✅
- §Persistence: save + resume + endings gallery → save/load/clear/markEndingSeen (Task 1), Menu Continue + gallery (Task 3). ✅
- §Error handling: guarded `localStorage`, shape-validated `loadStory`, try/catch writes → Task 1. ✅

**Placeholder scan:** No "TBD"/"handle errors"/"similar to Task N" — every code step is complete. ✅

**Type/name consistency:** `resolveEnding` returns `{ endingId, bossVariant }` used identically in Game.js and LevelComplete.js; `bossVariant` values `"board"`/`"mirror"` match `makeBoss`'s `variant`; registry keys `storyMode`/`storyMission`/`character` consistent across Menu/CharacterSelect/Game/LevelComplete/Cutscene; `STORY.interludes` keyed `1..5`, `STORY.endings` keyed by the exact `endingId`s `resolveEnding` returns. ✅

**Known accepted v1 edge:** quitting *during* an interlude cutscene before picking the choice resumes at the next level with that one fork's delta unapplied (the level was pre-saved in LevelComplete). Documented in the design's edge-cases; acceptable for v1.
