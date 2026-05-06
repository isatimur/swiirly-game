// Title screen. Shows Swiirl bobbing in front of a Mario-ish title bar.
// Press Space / click to enter the level.

import { VIEW } from "../config.js";
import { SFX } from "../audio.js";

export class MenuScene extends Phaser.Scene {
  constructor() { super("Menu"); }

  create() {
    const { width, height } = this.scale;

    // Sky background.
    this.add.image(width / 2, height / 2, "bg_far").setDisplaySize(width, height);
    this.add.image(width / 2, height - 100, "bg_near")
      .setOrigin(0.5, 1)
      .setScale(0.7, 0.7)
      .setAlpha(0.55);

    // A few drifting clouds.
    for (let i = 0; i < 4; i++) {
      const c = this.add.image(Phaser.Math.Between(120, width - 120), Phaser.Math.Between(80, 220), "cloud")
        .setAlpha(0.7).setScale(Phaser.Math.FloatBetween(0.8, 1.4));
      this.tweens.add({
        targets: c,
        x: c.x + Phaser.Math.Between(40, 120),
        duration: Phaser.Math.Between(8000, 16000),
        yoyo: true,
        repeat: -1,
      });
    }

    // Title.
    const title = this.add.text(width / 2, 160, "SWIIRL", {
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "108px",
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#5C3BA3",
      strokeThickness: 10,
      shadow: { offsetX: 0, offsetY: 10, color: "#1a0f2e", blur: 20, fill: true },
    }).setOrigin(0.5);

    const subtitle = this.add.text(width / 2, 240, "COMMUNITY  PARK", {
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "28px",
      fontStyle: "700",
      color: "#FFD24A",
      stroke: "#5C3BA3",
      strokeThickness: 4,
      letterSpacing: 6,
    }).setOrigin(0.5);

    const tagline = this.add.text(width / 2, 290,
      "Fight incompetence. Bring insights to brands.", {
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "18px",
      color: "#dcc7f2",
    }).setOrigin(0.5);

    this.tweens.add({ targets: title, y: 160 + 6, duration: 1800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    // Hero in the center.
    const hero = this.add.image(width / 2, height / 2 + 80, "idle").setScale(0.75);
    this.tweens.add({ targets: hero, y: hero.y - 14, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    // Press-to-start prompt.
    const press = this.add.text(width / 2, height - 110,
      "press   SPACE   or   click   to   begin", {
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "20px",
      color: "#ffffff",
      letterSpacing: 4,
    }).setOrigin(0.5).setAlpha(0.7);
    this.tweens.add({ targets: press, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 });

    const help = this.add.text(width / 2, height - 60,
      "← → move    SHIFT run    SPACE jump  (×2 for double-jump)    ↓ crouch    R restart    M mute", {
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "13px",
      color: "#b892e0",
      letterSpacing: 2,
    }).setOrigin(0.5);

    // Best run from previous sessions (localStorage).
    const best = +(localStorage.getItem("swiirl.bestInsights") || 0);
    if (best > 0) {
      this.add.text(width / 2, 330, `BEST RUN  ·  ${best}  insights delivered`, {
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: "14px",
        color: "#FFD24A",
        letterSpacing: 4,
      }).setOrigin(0.5);
    }

    const start = () => {
      SFX.collect();
      this.cameras.main.fadeOut(500, 26, 15, 46);
      this.time.delayedCall(500, () => {
        this.scene.start("Game");
        this.scene.launch("HUD");
      });
    };

    this.input.keyboard.once("keydown-SPACE", start);
    this.input.keyboard.once("keydown-ENTER", start);
    this.input.once("pointerdown", start);
  }
}
