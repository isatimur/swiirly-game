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

    // Drifting clouds.
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

    // Title — slides down from above on enter.
    const title = this.add.text(width / 2, 160, "SWIIRL", {
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "108px",
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#5C3BA3",
      strokeThickness: 10,
      shadow: { offsetX: 0, offsetY: 10, color: "#1a0f2e", blur: 20, fill: true },
    }).setOrigin(0.5).setAlpha(0).setY(100);

    const subtitle = this.add.text(width / 2, 248, "5  LEVELS  ·  DELIVER  INSIGHTS", {
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "22px",
      fontStyle: "700",
      color: "#FFD24A",
      stroke: "#5C3BA3",
      strokeThickness: 4,
      letterSpacing: 6,
    }).setOrigin(0.5).setAlpha(0);

    this.add.text(width / 2, 292,
      "Fight incompetence. Bring insights to brands.", {
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "18px",
      color: "#dcc7f2",
    }).setOrigin(0.5).setAlpha(0.85);

    // Entrance animations — staggered slide-in (150–300ms each, ease-out).
    this.tweens.add({ targets: title,    alpha: 1, y: 160, duration: 350, ease: "Back.easeOut" });
    this.tweens.add({ targets: subtitle, alpha: 1,         duration: 260, ease: "Quad.easeOut", delay: 120 });

    // Idle bob after entrance.
    this.time.delayedCall(400, () => {
      this.tweens.add({ targets: title, y: 166, duration: 1800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    });

    // Hero in the center.
    const hero = this.add.image(width / 2, height / 2 + 70, "idle").setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: hero, alpha: 1, duration: 280, ease: "Quad.easeOut", delay: 200 });
    this.tweens.add({ targets: hero, y: hero.y - 14, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: 280 });

    // Sparkles around hero.
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const sx = width / 2 + Math.cos(angle) * 70;
      const sy = height / 2 + 70 + Math.sin(angle) * 50;
      const sp = this.add.image(sx, sy, "sparkle").setScale(0.5).setAlpha(0);
      this.tweens.add({
        targets: sp, alpha: 0.8, scale: 0.9,
        duration: 800 + i * 200,
        yoyo: true, repeat: -1, ease: "Sine.easeInOut",
        delay: i * 180,
      });
    }

    // Press-to-start prompt.
    const press = this.add.text(width / 2, height - 110,
      "press   SPACE   or   click   to   begin", {
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "20px",
      color: "#ffffff",
      letterSpacing: 4,
    }).setOrigin(0.5).setAlpha(0.7);
    this.tweens.add({ targets: press, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 });

    // Controls — updated to include slide.
    this.add.text(width / 2, height - 58,
      "← → move    SHIFT run    SPACE jump (×2 double)    SHIFT+↓ slide    R restart    M mute", {
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "13px",
      color: "#b892e0",
      letterSpacing: 2,
    }).setOrigin(0.5);

    // Best run badge.
    const best = +(localStorage.getItem("swiirl.bestInsights") || 0);
    if (best > 0) {
      const badge = this.add.text(width / 2, height / 2 + 180,
        `★  BEST  ${best}  insights  ★`, {
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: "14px",
        color: "#FFD24A",
        stroke: "#5C3BA3",
        strokeThickness: 3,
        letterSpacing: 4,
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: badge, alpha: 1, duration: 300, ease: "Quad.easeOut", delay: 350 });
    }

    const start = () => {
      SFX.collect();
      this.cameras.main.fadeOut(420, 26, 15, 46);
      this.time.delayedCall(440, () => {
        this.scene.start("CharacterSelect");
      });
    };

    this.input.keyboard.once("keydown-SPACE", start);
    this.input.keyboard.once("keydown-ENTER", start);
    this.input.once("pointerdown", start);
  }
}
