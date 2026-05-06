import { VIEW } from "../config.js";

export class GameOverScene extends Phaser.Scene {
  constructor() { super("GameOver"); }

  init(data) {
    this.payload = data || { insights: 0 };
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.fadeIn(500, 26, 15, 46);

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a0f2e);

    this.add.text(width / 2, height / 2 - 100, "INCOMPETENCE  WINS", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "44px",
      fontStyle: "900",
      color: "#ff6b9d",
      stroke: "#5C3BA3",
      strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.image(width / 2, height / 2, "hurt").setScale(1.2);

    this.add.text(width / 2, height / 2 + 100,
      `you  collected  ${this.payload.insights}  insight${this.payload.insights === 1 ? "" : "s"}`, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "20px",
      color: "#dcc7f2",
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 140,
      "the brand still doesn't get it.", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "16px",
      color: "#888",
      fontStyle: "italic",
    }).setOrigin(0.5);

    const press = this.add.text(width / 2, height - 100,
      "press   SPACE   to try again", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "20px",
      color: "#ffffff",
    }).setOrigin(0.5);
    this.tweens.add({ targets: press, alpha: 0.3, yoyo: true, repeat: -1, duration: 700 });

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
  }
}
