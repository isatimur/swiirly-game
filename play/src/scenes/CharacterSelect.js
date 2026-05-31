// Character select — pick your Swiirl variant.
// Reached from MenuScene after pressing SPACE. Confirms with SPACE → Game.
//
// Each character has its own sprite set, a small stat perk, and a combat
// style (J key in-game). The roster is split into two boards — "ORIGINAL"
// (the 3 mascots) and "SWIIRL" (the other 9) — shown one at a time behind a
// segmented tab control. The grid is laid out responsively so each board
// centers its own card count.
// The selection persists in localStorage as "swiirl.character" so the next
// session opens with the same one preselected (and on the right board).

import { VIEW } from "../config.js";
import { SFX, Music } from "../audio.js";
import { CHARACTERS } from "../characters.js";
import { PAD } from "../gamepad.js";
import { STORYLINES, saveStory } from "../story.js";

const BOARDS = ["original", "swiirl"];
const BOARD_LABELS = { original: "ORIGINAL", swiirl: "SWIIRL" };

// Card geometry — shared between layout and highlight.
const CARD_W = 178;
const CARD_H = 232;
const H_SPACING = 18;
const V_SPACING = 22;

export class CharacterSelectScene extends Phaser.Scene {
  constructor() { super("CharacterSelect"); }

  create() {
    const { width, height } = this.scale;

    Music.play("menu");

    this.add.image(width / 2, height / 2, "bg_far").setDisplaySize(width, height);
    this.add.image(width / 2, height - 100, "bg_near")
      .setOrigin(0.5, 1).setScale(0.7).setAlpha(0.45);

    for (let i = 0; i < 3; i++) {
      const c = this.add.image(Phaser.Math.Between(120, width - 120), Phaser.Math.Between(60, 180), "cloud")
        .setAlpha(0.65).setScale(Phaser.Math.FloatBetween(0.7, 1.2));
      this.tweens.add({
        targets: c, x: c.x + 60, duration: 12000 + Math.random() * 4000,
        yoyo: true, repeat: -1,
      });
    }

    const title = this.add.text(width / 2, 78, "CHOOSE YOUR SWIIRL", {
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "44px", fontStyle: "900",
      color: "#ffffff", stroke: "#5C3BA3", strokeThickness: 8,
      shadow: { offsetX: 0, offsetY: 6, color: "#1a0f2e", blur: 12, fill: true },
    }).setOrigin(0.5);
    this.tweens.add({ targets: title, y: 84, duration: 1800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    // Pick the starting board from the last-used character.
    const lastId = localStorage.getItem("swiirl.character") ?? "swiirl";
    const lastChar = CHARACTERS.find(c => c.id === lastId);
    this.activeBoard = lastChar ? lastChar.board : "original";

    this.buildTabs();

    // Persistent highlight — a rounded gold outline that tweens to the
    // selected card; drawn centered at (0,0) and moved via setPosition.
    this.highlight = this.add.graphics();
    this.highlight.lineStyle(4, 0xffd24a, 1);
    this.highlight.strokeRoundedRect(-(CARD_W + 10) / 2, -(CARD_H + 10) / 2, CARD_W + 10, CARD_H + 10, 18);

    this.cards = [];
    this.buildBoard();

    // Preselect the last-used character within its board if present.
    const localIdx = this.visibleChars.findIndex(c => c.id === lastId);
    this.selectedIdx = localIdx >= 0 ? localIdx : 0;
    this.applyHighlight();

    this.add.text(width / 2, height - 76,
      "↑ ↓ ← →  /  D-pad  choose      Q / E  switch board      J  /  □  attack      SPACE  /  ×  confirm", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "13px", color: "#dcc7f2", letterSpacing: 3,
    }).setOrigin(0.5);

    this.input.keyboard.on("keydown-LEFT",  () => this.selectIndex(this.selectedIdx - 1));
    this.input.keyboard.on("keydown-RIGHT", () => this.selectIndex(this.selectedIdx + 1));
    this.input.keyboard.on("keydown-A",     () => this.selectIndex(this.selectedIdx - 1));
    this.input.keyboard.on("keydown-D",     () => this.selectIndex(this.selectedIdx + 1));
    this.input.keyboard.on("keydown-UP",    () => this.moveVertical(-1));
    this.input.keyboard.on("keydown-DOWN",  () => this.moveVertical(1));
    this.input.keyboard.on("keydown-W",     () => this.moveVertical(-1));
    this.input.keyboard.on("keydown-S",     () => this.moveVertical(1));
    this.input.keyboard.on("keydown-Q",     () => this.cycleBoard(-1));
    this.input.keyboard.on("keydown-E",     () => this.cycleBoard(1));
    this.input.keyboard.once("keydown-SPACE", () => this.confirm());
    this.input.keyboard.once("keydown-ENTER", () => this.confirm());

    this._padPrevLeft = false;
    this._padPrevRight = false;
    this._padPrevUp = false;
    this._padPrevDown = false;
    const padConfirm = () => { if (!window.__pauseModalOpen) this.confirm(); };
    this.game.events.once("gamepad-cross", padConfirm);
    this.events.once("shutdown", () => this.game.events.off("gamepad-cross", padConfirm));
  }

  update() {
    if (!PAD.connected) return;
    if (PAD.left && !this._padPrevLeft)   this.selectIndex(this.selectedIdx - 1);
    if (PAD.right && !this._padPrevRight) this.selectIndex(this.selectedIdx + 1);
    if (PAD.up && !this._padPrevUp)       this.moveVertical(-1);
    if (PAD.down && !this._padPrevDown)   this.moveVertical(1);
    this._padPrevLeft  = PAD.left;
    this._padPrevRight = PAD.right;
    this._padPrevUp    = PAD.up;
    this._padPrevDown  = PAD.down;
  }

  // Segmented tab control under the title: a rounded track with a sliding
  // gold "active pill" behind the two labels (each shows its card count).
  buildTabs() {
    const { width } = this.scale;
    const tabW = 196, tabH = 48, tabY = 140;
    const trackW = tabW * BOARDS.length;
    const startX = (width - trackW) / 2;     // left edge of the track
    this.tabW = tabW; this.tabH = tabH; this.tabY = tabY;

    const track = this.add.graphics();
    track.fillStyle(0x140a26, 0.9);
    track.fillRoundedRect(startX - 6, tabY - tabH / 2 - 6, trackW + 12, tabH + 12, 16);
    track.lineStyle(2, 0x5C3BA3, 0.8);
    track.strokeRoundedRect(startX - 6, tabY - tabH / 2 - 6, trackW + 12, tabH + 12, 16);

    // Sliding active-pill indicator (positioned in updateTabVisuals).
    this.tabPill = this.add.graphics();

    this.tabs = BOARDS.map((boardId, i) => {
      const cxTab = startX + i * tabW + tabW / 2;
      const count = CHARACTERS.filter(c => c.board === boardId).length;
      const label = this.add.text(cxTab, tabY, `${BOARD_LABELS[boardId]}   ${count}`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "18px", fontStyle: "900",
        color: "#dcc7f2", letterSpacing: 3,
      }).setOrigin(0.5);

      const hit = this.add.rectangle(cxTab, tabY, tabW, tabH, 0xffffff, 0)
        .setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => this.switchBoard(boardId));

      return { boardId, label, hit, cxTab };
    });

    this.updateTabVisuals();
  }

  updateTabVisuals() {
    const { tabW, tabH, tabY } = this;
    const active = this.tabs.find(t => t.boardId === this.activeBoard);
    this.tabPill.clear();
    if (active) {
      this.tabPill.fillStyle(0xffd24a, 0.95);
      this.tabPill.fillRoundedRect(active.cxTab - tabW / 2 + 4, tabY - tabH / 2 + 4, tabW - 8, tabH - 8, 12);
    }
    for (const t of this.tabs) {
      t.label.setColor(t.boardId === this.activeBoard ? "#1a0f2e" : "#dcc7f2");
    }
  }

  // Build the card grid for the active board. Destroys any existing cards
  // (and their bob tweens) first so repeated switches don't leak sprites.
  buildBoard() {
    this.destroyCards();

    const { width, height } = this.scale;
    this.visibleChars = CHARACTERS.filter(c => c.board === this.activeBoard);

    const list = this.visibleChars;
    const COLS = Math.min(6, list.length);
    const ROWS = Math.ceil(list.length / COLS);
    this.cols = COLS;

    const gridHeight = ROWS * CARD_H + (ROWS - 1) * V_SPACING;
    // Nudge grid below the tab strip; centred in the remaining space.
    const centerY = height / 2 + 36;
    const firstRowY = centerY - gridHeight / 2 + CARD_H / 2;

    this.cards = list.map((char, i) => {
      const row = Math.floor(i / COLS);
      const col = i % COLS;

      // Last row may hold fewer than COLS cards — center it on its own count.
      const itemsInRow = Math.min(COLS, list.length - row * COLS);
      const rowWidth = itemsInRow * CARD_W + (itemsInRow - 1) * H_SPACING;
      const rowStartX = (width - rowWidth) / 2 + CARD_W / 2;

      const cx = rowStartX + col * (CARD_W + H_SPACING);
      const cy = firstRowY + row * (CARD_H + V_SPACING);

      // Rounded card panel (graphics) with a character-accent header bar; a
      // transparent rect supplies the click hit-area (graphics aren't interactive).
      const accent = char.color;
      const body = this.add.graphics();
      body.fillStyle(0x140a26, 0.9);
      body.fillRoundedRect(cx - CARD_W / 2, cy - CARD_H / 2, CARD_W, CARD_H, 14);
      body.fillStyle(accent, 1);
      body.fillRoundedRect(cx - CARD_W / 2 + 12, cy - CARD_H / 2 + 10, CARD_W - 24, 3, 2);
      body.lineStyle(2, 0x5C3BA3, 0.8);
      body.strokeRoundedRect(cx - CARD_W / 2, cy - CARD_H / 2, CARD_W, CARD_H, 14);

      const portraitKey = `${char.spriteKey}_idle`;
      const sprite = this.add.image(cx, cy - CARD_H / 2 + 70, portraitKey).setScale(0.42);
      const name = this.add.text(cx, cy + 28, char.name, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "15px", fontStyle: "900",
        color: "#ffffff", stroke: "#5C3BA3", strokeThickness: 4,
      }).setOrigin(0.5);
      const perk = this.add.text(cx, cy + 54, char.perk, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "11px", fontStyle: "700",
        color: char.perkColor, letterSpacing: 1,
      }).setOrigin(0.5);
      const attackHint = this.add.text(cx, cy + 84, char.attackHint, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "9px",
        color: "#dcc7f2", letterSpacing: 0,
        align: "center", wordWrap: { width: CARD_W - 14 },
      }).setOrigin(0.5);

      const bob = this.tweens.add({
        targets: sprite, y: sprite.y - 8, duration: 900 + i * 100,
        yoyo: true, repeat: -1, ease: "Sine.easeInOut",
      });

      const hit = this.add.rectangle(cx, cy, CARD_W, CARD_H, 0xffffff, 0)
        .setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => this.selectIndex(i, true));

      return { char, body, hit, sprite, name, perk, attackHint, bob, cx, cy };
    });

    // Keep the highlight drawn above the freshly created cards.
    if (this.highlight) this.children.bringToTop(this.highlight);
  }

  destroyCards() {
    if (!this.cards) return;
    for (const card of this.cards) {
      card.bob?.remove();
      this.tweens.killTweensOf(card.sprite);
      card.body.destroy();
      card.hit.destroy();
      card.sprite.destroy();
      card.name.destroy();
      card.perk.destroy();
      card.attackHint.destroy();
    }
    this.cards = [];
  }

  cycleBoard(delta) {
    const i = BOARDS.indexOf(this.activeBoard);
    const next = BOARDS[((i + delta) % BOARDS.length + BOARDS.length) % BOARDS.length];
    this.switchBoard(next);
  }

  switchBoard(boardId) {
    if (boardId === this.activeBoard || !BOARDS.includes(boardId)) return;
    this.activeBoard = boardId;
    // Snap the highlight off-screen so it doesn't tween across the gap;
    // applyHighlight re-tweens it to the new first card.
    this.tweens.killTweensOf(this.highlight);
    this.buildBoard();
    this.selectedIdx = 0;
    this.updateTabVisuals();
    this.highlight.setPosition(this.cards[0].cx, this.cards[0].cy);
    this.applyHighlight();
    SFX.collect();
  }

  selectIndex(idx, fromClick = false) {
    const n = this.visibleChars.length;
    this.selectedIdx = ((idx % n) + n) % n;
    SFX.collect();
    this.applyHighlight();
    if (fromClick) this.confirm();
  }

  // Vertical nav clamps at the grid edges — no wrap, unlike horizontal.
  moveVertical(delta) {
    const next = this.selectedIdx + delta * this.cols;
    if (next < 0 || next >= this.visibleChars.length) return;
    this.selectIndex(next);
  }

  applyHighlight() {
    const card = this.cards[this.selectedIdx];
    this.tweens.add({
      targets: this.highlight,
      x: card.cx,
      y: card.cy,
      duration: 220, ease: "Cubic.easeOut",
    });
    this.tweens.add({
      targets: card.sprite,
      scale: 0.50, duration: 140, yoyo: true, ease: "Back.easeOut",
    });
  }

  confirm() {
    const chosen = this.visibleChars[this.selectedIdx];
    localStorage.setItem("swiirl.character", chosen.id);
    this.registry.set("character", chosen);
    SFX.win();
    this.cameras.main.fadeOut(450, 26, 15, 46);
    this.time.delayedCall(470, () => {
      if (this.registry.get("storyMode")) {
        // Begin a fresh story run: persist the starting state and play the
        // opening cutscene, which then starts Game level 1 (+ HUD).
        const path = this.registry.get("storyPath") ?? "idealist";
        saveStory({ path, mission: 0, level: 1, character: chosen.id });
        this.registry.set("storyMission", 0);
        this.scene.start("Cutscene", {
          beats: STORYLINES[path].opening, next: "Game", nextData: { level: 1, path },
        });
      } else {
        this.scene.start("Game");
        this.scene.launch("HUD");
      }
    });
  }
}
