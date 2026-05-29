// Character select — pick your Swiirl variant.
// Reached from MenuScene after pressing SPACE. Confirms with SPACE → Game.
//
// Each character has its own sprite set, a small stat perk, and a combat
// style (J key in-game). The roster is laid out as a responsive grid so it
// scales as characters are added.
// The selection persists in localStorage as "swiirl.character" so the next
// session opens with the same one preselected.

import { VIEW } from "../config.js";
import { SFX, Music } from "../audio.js";
import { CHARACTERS } from "../characters.js";
import { PAD } from "../gamepad.js";

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

    const title = this.add.text(width / 2, 90, "CHOOSE YOUR SWIIRL", {
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "44px", fontStyle: "900",
      color: "#ffffff", stroke: "#5C3BA3", strokeThickness: 8,
      shadow: { offsetX: 0, offsetY: 6, color: "#1a0f2e", blur: 12, fill: true },
    }).setOrigin(0.5);
    this.tweens.add({ targets: title, y: 96, duration: 1800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const COLS = Math.min(6, CHARACTERS.length);
    const ROWS = Math.ceil(CHARACTERS.length / COLS);
    this.cols = COLS;

    const cardWidth = 178;
    const cardHeight = 232;
    const hSpacing = 18;
    const vSpacing = 22;

    const gridHeight = ROWS * cardHeight + (ROWS - 1) * vSpacing;
    const centerY = height / 2 + 18;
    const firstRowY = centerY - gridHeight / 2 + cardHeight / 2;

    this.cards = CHARACTERS.map((char, i) => {
      const row = Math.floor(i / COLS);
      const col = i % COLS;

      // Last row may hold fewer than COLS cards — center it on its own count.
      const itemsInRow = Math.min(COLS, CHARACTERS.length - row * COLS);
      const rowWidth = itemsInRow * cardWidth + (itemsInRow - 1) * hSpacing;
      const rowStartX = (width - rowWidth) / 2 + cardWidth / 2;

      const cx = rowStartX + col * (cardWidth + hSpacing);
      const cy = firstRowY + row * (cardHeight + vSpacing);

      const cardBg = this.add.rectangle(cx, cy, cardWidth, cardHeight, 0x1a0f2e, 0.55)
        .setStrokeStyle(3, 0x5C3BA3);
      const portraitKey = `${char.spriteKey}_idle`;
      const sprite = this.add.image(cx, cy - cardHeight / 2 + 64, portraitKey).setScale(0.42);
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
        align: "center", wordWrap: { width: cardWidth - 14 },
      }).setOrigin(0.5);

      this.tweens.add({
        targets: sprite, y: sprite.y - 8, duration: 900 + i * 100,
        yoyo: true, repeat: -1, ease: "Sine.easeInOut",
      });

      cardBg.setInteractive({ useHandCursor: true });
      cardBg.on("pointerdown", () => this.selectIndex(i, true));

      return { char, cardBg, sprite, name, perk, attackHint };
    });

    this.highlight = this.add.rectangle(0, 0, cardWidth + 8, cardHeight + 8, 0xffd24a, 0)
      .setStrokeStyle(5, 0xffd24a);

    const lastId = localStorage.getItem("swiirl.character") ?? "swiirl";
    this.selectedIdx = Math.max(0, CHARACTERS.findIndex(c => c.id === lastId));
    this.applyHighlight();

    this.add.text(width / 2, height - 80,
      "↑ ↓ ← →  /  D-pad  to choose      J  /  □  attack      SPACE  /  ×  confirm", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px", color: "#dcc7f2", letterSpacing: 4,
    }).setOrigin(0.5);

    this.input.keyboard.on("keydown-LEFT",  () => this.selectIndex(this.selectedIdx - 1));
    this.input.keyboard.on("keydown-RIGHT", () => this.selectIndex(this.selectedIdx + 1));
    this.input.keyboard.on("keydown-A",     () => this.selectIndex(this.selectedIdx - 1));
    this.input.keyboard.on("keydown-D",     () => this.selectIndex(this.selectedIdx + 1));
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
    if (PAD.left && !this._padPrevLeft)   this.selectIndex(this.selectedIdx - 1);
    if (PAD.right && !this._padPrevRight) this.selectIndex(this.selectedIdx + 1);
    if (PAD.up && !this._padPrevUp)       this.moveVertical(-1);
    if (PAD.down && !this._padPrevDown)   this.moveVertical(1);
    this._padPrevLeft  = PAD.left;
    this._padPrevRight = PAD.right;
    this._padPrevUp    = PAD.up;
    this._padPrevDown  = PAD.down;
  }

  selectIndex(idx, fromClick = false) {
    const n = CHARACTERS.length;
    this.selectedIdx = ((idx % n) + n) % n;
    SFX.collect();
    this.applyHighlight();
    if (fromClick) this.confirm();
  }

  // Vertical nav clamps at the grid edges — no wrap, unlike horizontal.
  moveVertical(delta) {
    const next = this.selectedIdx + delta * this.cols;
    if (next < 0 || next >= CHARACTERS.length) return;
    this.selectIndex(next);
  }

  applyHighlight() {
    const card = this.cards[this.selectedIdx];
    this.tweens.add({
      targets: this.highlight,
      x: card.cardBg.x,
      y: card.cardBg.y,
      duration: 220, ease: "Cubic.easeOut",
    });
    this.tweens.add({
      targets: card.sprite,
      scale: 0.50, duration: 140, yoyo: true, ease: "Back.easeOut",
    });
  }

  confirm() {
    const chosen = CHARACTERS[this.selectedIdx];
    localStorage.setItem("swiirl.character", chosen.id);
    this.registry.set("character", chosen);
    SFX.win();
    this.cameras.main.fadeOut(450, 26, 15, 46);
    this.time.delayedCall(470, () => {
      this.scene.start("Game");
      this.scene.launch("HUD");
    });
  }
}
