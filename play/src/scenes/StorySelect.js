// Story path picker — the first screen of a fresh Story Mode run.
// Reached from MenuScene when starting a NEW story (Continue skips straight to
// Game). Four paths (idealist / hustler / rebel / founder) are shown as a 2×2
// card grid; the chosen path is stashed in the registry as "storyPath" and the
// flow advances to CharacterSelect (which writes the first save once a
// character is chosen).
//
// Modeled on CharacterSelect: card grid + keyboard arrows / WASD + gamepad
// d-pad (via PAD) + pointer click + SPACE/ENTER/gamepad-cross to confirm,
// camera fades, and a shutdown unsubscribe for the global gamepad handler.

import { SFX, Music } from "../audio.js";
import { PAD } from "../gamepad.js";
import { PATHS, STORYLINES } from "../story.js";

// Card geometry — shared between layout and highlight.
const CARD_W = 392;
const CARD_H = 192;
const H_SPACING = 44;
const V_SPACING = 34;
const COLS = 2;

// A glyph per path, themed to the premise.
const ICONS = { idealist: "🌱", hustler: "🚀", rebel: "🔥", founder: "👑" };

export class StorySelectScene extends Phaser.Scene {
  constructor() { super("StorySelect"); }

  create() {
    const { width, height } = this.scale;

    Music.play("menu");

    this.add.image(width / 2, height / 2, "bg_far").setDisplaySize(width, height);
    this.add.image(width / 2, height - 100, "bg_near")
      .setOrigin(0.5, 1).setScale(0.7).setAlpha(0.45);

    for (let i = 0; i < 3; i++) {
      const c = this.add.image(Phaser.Math.Between(120, width - 120), Phaser.Math.Between(60, 180), "cloud")
        .setAlpha(0.6).setScale(Phaser.Math.FloatBetween(0.7, 1.2));
      this.tweens.add({
        targets: c, x: c.x + 60, duration: 12000 + Math.random() * 4000,
        yoyo: true, repeat: -1,
      });
    }

    const title = this.add.text(width / 2, 74, "CHOOSE YOUR PATH", {
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "46px", fontStyle: "900",
      color: "#ffffff", stroke: "#5C3BA3", strokeThickness: 8,
      shadow: { offsetX: 0, offsetY: 6, color: "#1a0f2e", blur: 14, fill: true },
    }).setOrigin(0.5);
    this.tweens.add({ targets: title, y: 80, duration: 1800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    this.add.text(width / 2, 118, "Four ways to build a brand. Same six levels — a different soul.", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "16px", fontStyle: "600", color: "#dcc7f2", letterSpacing: 1,
    }).setOrigin(0.5).setAlpha(0.92);

    this.buildCards();

    this.selectedIdx = 0;
    this.applyHighlight();

    this.add.text(width / 2, height - 52,
      "↑ ↓ ← →  /  D-pad  choose      SPACE  /  ENTER  /  ×  confirm", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "13px", color: "#b892e0", letterSpacing: 3,
    }).setOrigin(0.5);

    this.input.keyboard.on("keydown-LEFT",  () => this.moveHorizontal(-1));
    this.input.keyboard.on("keydown-RIGHT", () => this.moveHorizontal(1));
    this.input.keyboard.on("keydown-A",     () => this.moveHorizontal(-1));
    this.input.keyboard.on("keydown-D",     () => this.moveHorizontal(1));
    this.input.keyboard.on("keydown-UP",    () => this.moveVertical(-1));
    this.input.keyboard.on("keydown-DOWN",  () => this.moveVertical(1));
    this.input.keyboard.on("keydown-W",     () => this.moveVertical(-1));
    this.input.keyboard.on("keydown-S",     () => this.moveVertical(1));
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
    if (PAD.left && !this._padPrevLeft)   this.moveHorizontal(-1);
    if (PAD.right && !this._padPrevRight) this.moveHorizontal(1);
    if (PAD.up && !this._padPrevUp)       this.moveVertical(-1);
    if (PAD.down && !this._padPrevDown)   this.moveVertical(1);
    this._padPrevLeft  = PAD.left;
    this._padPrevRight = PAD.right;
    this._padPrevUp    = PAD.up;
    this._padPrevDown  = PAD.down;
  }

  // One card = a container (so it can scale/dim as a unit) holding an accent
  // glow (shown only when selected), a rounded body with an accent header bar,
  // a themed glyph, the path title, and the premise.
  buildCards() {
    const { width, height } = this.scale;
    const ROWS = Math.ceil(PATHS.length / COLS);

    const gridWidth = COLS * CARD_W + (COLS - 1) * H_SPACING;
    const gridHeight = ROWS * CARD_H + (ROWS - 1) * V_SPACING;
    const startX = (width - gridWidth) / 2 + CARD_W / 2;
    const centerY = height / 2 + 48;
    const firstRowY = centerY - gridHeight / 2 + CARD_H / 2;

    const hw = CARD_W / 2, hh = CARD_H / 2;

    this.cards = PATHS.map((pathId, i) => {
      const row = Math.floor(i / COLS);
      const col = i % COLS;
      const cx = startX + col * (CARD_W + H_SPACING);
      const cy = firstRowY + row * (CARD_H + V_SPACING);

      const sl = STORYLINES[pathId];
      const accent = Phaser.Display.Color.HexStringToColor(sl.accent).color;

      const container = this.add.container(cx, cy);

      const glow = this.add.graphics();
      glow.fillStyle(accent, 0.18);
      glow.fillRoundedRect(-hw - 11, -hh - 11, CARD_W + 22, CARD_H + 22, 24);
      glow.setVisible(false);

      const body = this.add.graphics();
      body.fillStyle(0x140a26, 0.94);
      body.fillRoundedRect(-hw, -hh, CARD_W, CARD_H, 18);
      // accent header bar
      body.fillStyle(accent, 1);
      body.fillRoundedRect(-hw + 20, -hh + 16, CARD_W - 40, 4, 2);
      body.lineStyle(2, accent, 0.7);
      body.strokeRoundedRect(-hw, -hh, CARD_W, CARD_H, 18);

      const icon = this.add.text(0, -hh + 50, ICONS[pathId] ?? "•", {
        fontSize: "34px",
      }).setOrigin(0.5);
      const titleTxt = this.add.text(0, -hh + 92, sl.title, {
        fontFamily: "system-ui, sans-serif", fontSize: "27px", fontStyle: "900",
        color: sl.accent, stroke: "#1a0f2e", strokeThickness: 4, letterSpacing: 2,
      }).setOrigin(0.5);
      const premiseTxt = this.add.text(0, 38, sl.premise, {
        fontFamily: "system-ui, sans-serif", fontSize: "14px", color: "#cdbce8",
        align: "center", lineSpacing: 5, wordWrap: { width: CARD_W - 56 },
      }).setOrigin(0.5);

      // Invisible hit zone (graphics aren't interactive; a transparent rect is).
      const hit = this.add.rectangle(0, 0, CARD_W, CARD_H, 0xffffff, 0)
        .setInteractive({ useHandCursor: true });
      hit.on("pointerover", () => { if (this.selectedIdx !== i) this.selectIndex(i); });
      hit.on("pointerdown", () => this.selectIndex(i, true));

      container.add([glow, body, icon, titleTxt, premiseTxt, hit]);
      return { pathId, container, glow };
    });
  }

  moveHorizontal(delta) {
    this.selectIndex(this.selectedIdx + delta);
  }

  moveVertical(delta) {
    const next = this.selectedIdx + delta * COLS;
    if (next < 0 || next >= this.cards.length) return;
    this.selectIndex(next);
  }

  selectIndex(idx, fromClick = false) {
    const n = this.cards.length;
    this.selectedIdx = ((idx % n) + n) % n;
    SFX.collect();
    this.applyHighlight();
    if (fromClick) this.confirm();
  }

  applyHighlight() {
    this.cards.forEach((card, i) => {
      const sel = i === this.selectedIdx;
      card.glow.setVisible(sel);
      card.container.setAlpha(sel ? 1 : 0.82);
      this.tweens.add({
        targets: card.container, scale: sel ? 1.04 : 1.0,
        duration: 180, ease: "Cubic.easeOut",
      });
    });
  }

  confirm() {
    if (this._confirming) return;
    this._confirming = true;
    const path = PATHS[this.selectedIdx];
    this.registry.set("storyPath", path);
    SFX.win();
    this.cameras.main.fadeOut(450, 26, 15, 46);
    this.time.delayedCall(470, () => this.scene.start("CharacterSelect"));
  }
}
