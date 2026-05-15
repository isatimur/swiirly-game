import { VIEW } from "../config.js";

export class GameOverScene extends Phaser.Scene {
  constructor() { super("GameOver"); }

  init(data) {
    this.payload = data || { insights: 0 };
  }

  create() {
    const { width, height } = this.scale;

    // Dark bg with red-tinted vignette.
    this.add.rectangle(width / 2, height / 2, width, height, 0x100814);
    // Radial vignette — 3 concentric translucent ellipses darkening edges.
    this.add.ellipse(width / 2, height / 2, width * 1.4, height * 1.4, 0x000000, 0.0);
    this.add.ellipse(width / 2, height / 2, width * 0.9, height * 0.9, 0x400010, 0.18);
    this.add.ellipse(width / 2, height / 2, width * 0.45, height * 0.45, 0x800020, 0.10);

    // Title — slams down with ease-out bounce.
    const title = this.add.text(width / 2, height / 2 - 200, "INCOMPETENCE  WINS", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "52px",
      fontStyle: "900",
      color: "#ff6b9d",
      stroke: "#1a0f2e",
      strokeThickness: 10,
      shadow: { offsetX: 0, offsetY: 8, color: "#ff0040", blur: 18, fill: true },
    }).setOrigin(0.5).setAlpha(0).setY(height / 2 - 260);

    this.tweens.add({
      targets: title, alpha: 1, y: height / 2 - 190,
      duration: 320, ease: "Back.easeOut", delay: 80,
    });
    // Subtle shake after slam.
    this.time.delayedCall(420, () => {
      this.cameras.main.shake(200, 0.007);
    });

    // Show the SELECTED character's hurt pose, not the default Swiirl,
    // so losing with Ninja shows Ninja crying, etc.
    const chosen = this.registry.get("character");
    const skin = chosen?.spriteKey ?? "beanie";
    const hurtKey = this.textures.exists(`${skin}_hurt`) ? `${skin}_hurt` : "hurt";
    const hero = this.add.image(width / 2, height / 2 + 40, hurtKey)
      .setScale(1.4).setAlpha(0).setY(height / 2 + 120);
    this.tweens.add({
      targets: hero, alpha: 1, y: height / 2 + 30,
      duration: 400, ease: "Back.easeOut", delay: 260,
    });
    // Wobble.
    this.time.delayedCall(700, () => {
      this.tweens.add({ targets: hero, angle: -6, duration: 220, yoyo: true, repeat: 2, ease: "Sine.easeInOut" });
    });

    // Stats.
    const n = this.payload.insights;
    const statsText = this.add.text(width / 2, height / 2 + 140,
      `${n}  insight${n === 1 ? "" : "s"}  delivered`, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "22px",
      fontStyle: "700",
      color: "#dcc7f2",
      stroke: "#1a0f2e",
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);

    const flavour = this.add.text(width / 2, height / 2 + 184,
      "the brand still doesn't get it.", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "16px",
      color: "#666",
      fontStyle: "italic",
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({ targets: statsText, alpha: 1, duration: 280, ease: "Quad.easeOut", delay: 520 });
    this.tweens.add({ targets: flavour,   alpha: 1, duration: 280, ease: "Quad.easeOut", delay: 650 });

    // Retry prompt.
    const press = this.add.text(width / 2, height - 90,
      "press   SPACE   to try again", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "20px",
      color: "#ffffff",
      stroke: "#5C3BA3",
      strokeThickness: 4,
      letterSpacing: 4,
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: press, alpha: 0.9, duration: 260, ease: "Quad.easeOut", delay: 800 });
    this.tweens.add({ targets: press, alpha: 0.25, duration: 700, yoyo: true, repeat: -1, delay: 1100 });

    // Fade in the camera.
    this.cameras.main.fadeIn(300, 16, 8, 20);

    const restart = () => {
      this.cameras.main.fadeOut(400, 26, 15, 46);
      this.time.delayedCall(420, () => {
        this.scene.start("Game");
        this.scene.launch("HUD");
      });
    };
    this.input.keyboard.once("keydown-SPACE", restart);
    this.input.keyboard.once("keydown-ENTER", restart);
    this.input.once("pointerdown", restart);
    // Gamepad: × confirms.
    this.game.events.once("gamepad-cross", restart);
    this.events.once("shutdown", () => this.game.events.off("gamepad-cross", restart));
  }
}
