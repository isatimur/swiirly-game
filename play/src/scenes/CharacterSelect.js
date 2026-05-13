// Character select — pick your Swiirl variant.
// Reached from MenuScene after pressing SPACE. Confirms with SPACE → Game.
//
// Each character is a tinted variant of the base Swiirl with a small stat perk
// and a combat style (J key in-game).
// The selection persists in localStorage as "swiirl.character" so the next
// session opens with the same one preselected.

import { VIEW } from "../config.js";
import { SFX } from "../audio.js";
import { CHARACTERS } from "../characters.js";

export class CharacterSelectScene extends Phaser.Scene {
  constructor() { super("CharacterSelect"); }

  create() {
    const { width, height } = this.scale;

    // Background — same sky as menu for continuity.
    this.add.image(width / 2, height / 2, "bg_far").setDisplaySize(width, height);
    this.add.image(width / 2, height - 100, "bg_near")
      .setOrigin(0.5, 1).setScale(0.7).setAlpha(0.45);

    // Drifting clouds for atmosphere.
    for (let i = 0; i < 3; i++) {
      const c = this.add.image(Phaser.Math.Between(120, width - 120), Phaser.Math.Between(60, 180), "cloud")
        .setAlpha(0.65).setScale(Phaser.Math.FloatBetween(0.7, 1.2));
      this.tweens.add({
        targets: c, x: c.x + 60, duration: 12000 + Math.random() * 4000,
        yoyo: true, repeat: -1,
      });
    }

    // ----- TITLE -----
    const title = this.add.text(width / 2, 90, "CHOOSE YOUR SWIIRL", {
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "44px", fontStyle: "900",
      color: "#ffffff", stroke: "#5C3BA3", strokeThickness: 8,
      shadow: { offsetX: 0, offsetY: 6, color: "#1a0f2e", blur: 12, fill: true },
    }).setOrigin(0.5);
    this.tweens.add({ targets: title, y: 96, duration: 1800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    // ----- CHARACTER CARDS -----
    const cardWidth = 180;
    const cardSpacing = 32;
    const totalWidth = CHARACTERS.length * cardWidth + (CHARACTERS.length - 1) * cardSpacing;
    const startX = (width - totalWidth) / 2 + cardWidth / 2;
    const cardY = height / 2 + 30;

    this.cards = CHARACTERS.map((char, i) => {
      const cx = startX + i * (cardWidth + cardSpacing);
      const cardBg = this.add.rectangle(cx, cardY, cardWidth, 300, 0x1a0f2e, 0.55)
        .setStrokeStyle(3, 0x5C3BA3);
      // Each character now has its own sprite set, so the portrait is THAT
      // character's idle frame — no tint, no shared base image.
      const portraitKey = `${char.spriteKey}_idle`;
      const sprite = this.add.image(cx, cardY - 40, portraitKey).setScale(0.65);
      const name = this.add.text(cx, cardY + 60, char.name, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "20px", fontStyle: "900",
        color: "#ffffff", stroke: "#5C3BA3", strokeThickness: 4,
      }).setOrigin(0.5);
      const perk = this.add.text(cx, cardY + 90, char.perk, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px", fontStyle: "700",
        color: char.perkColor, letterSpacing: 1,
      }).setOrigin(0.5);
      const attackHint = this.add.text(cx, cardY + 120, char.attackHint, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "10px",
        color: "#dcc7f2", letterSpacing: 0,
        align: "center", wordWrap: { width: cardWidth - 16 },
      }).setOrigin(0.5);

      // Idle bob for sprites.
      this.tweens.add({
        targets: sprite, y: sprite.y - 8, duration: 900 + i * 100,
        yoyo: true, repeat: -1, ease: "Sine.easeInOut",
      });

      // Click to select.
      cardBg.setInteractive({ useHandCursor: true });
      cardBg.on("pointerdown", () => this.selectIndex(i, true));

      return { char, cardBg, sprite, name, perk, attackHint };
    });

    // ----- SELECTION HIGHLIGHT -----
    this.highlight = this.add.rectangle(0, cardY, cardWidth + 8, 308, 0xffd24a, 0)
      .setStrokeStyle(5, 0xffd24a);

    // Restore last selection.
    const lastId = localStorage.getItem("swiirl.character") ?? "swiirl";
    this.selectedIdx = Math.max(0, CHARACTERS.findIndex(c => c.id === lastId));
    this.applyHighlight();

    // ----- HINT -----
    this.add.text(width / 2, height - 80,
      "← →  to choose      J  to attack in-game      SPACE  to confirm", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px", color: "#dcc7f2", letterSpacing: 4,
    }).setOrigin(0.5);

    // ----- INPUT -----
    this.input.keyboard.on("keydown-LEFT",  () => this.selectIndex(this.selectedIdx - 1));
    this.input.keyboard.on("keydown-RIGHT", () => this.selectIndex(this.selectedIdx + 1));
    this.input.keyboard.on("keydown-A",     () => this.selectIndex(this.selectedIdx - 1));
    this.input.keyboard.on("keydown-D",     () => this.selectIndex(this.selectedIdx + 1));
    this.input.keyboard.once("keydown-SPACE", () => this.confirm());
    this.input.keyboard.once("keydown-ENTER", () => this.confirm());
  }

  selectIndex(idx, fromClick = false) {
    const n = CHARACTERS.length;
    this.selectedIdx = ((idx % n) + n) % n;
    SFX.collect();
    this.applyHighlight();
    if (fromClick) this.confirm();
  }

  applyHighlight() {
    const card = this.cards[this.selectedIdx];
    this.tweens.add({
      targets: this.highlight,
      x: card.cardBg.x,
      duration: 220, ease: "Cubic.easeOut",
    });
    // Pulse the selected sprite to confirm.
    this.tweens.add({
      targets: card.sprite,
      scale: 0.78, duration: 140, yoyo: true, ease: "Back.easeOut",
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
