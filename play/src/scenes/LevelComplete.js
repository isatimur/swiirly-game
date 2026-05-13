// "Brand reveal" screen — Swiirl celebrates, brand sign updates, score totals up.

import { VIEW } from "../config.js";

export class LevelCompleteScene extends Phaser.Scene {
  constructor() { super("LevelComplete"); }

  init(data) {
    this.payload = data || { insights: 0, lives: 3, levelName: "Community Park", levelNum: 1 };
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.fadeIn(500, 26, 15, 46);

    // Persist best run.
    const prevBest = +(localStorage.getItem("swiirl.bestInsights") || 0);
    const isNewBest = this.payload.insights > prevBest;
    if (isNewBest) localStorage.setItem("swiirl.bestInsights", String(this.payload.insights));
    this._isNewBest = isNewBest;

    this.add.image(width / 2, height / 2, "bg_far").setDisplaySize(width, height);
    this.add.image(width / 2, height - 100, "bg_near").setOrigin(0.5, 1).setScale(0.7).setAlpha(0.55);

    // Confetti.
    for (let i = 0; i < 50; i++) {
      const col = [0xffd24a, 0xff8fbe, 0xb892e0, 0x7bd389, 0x7dc4ff][i % 5];
      const r = this.add.rectangle(Phaser.Math.Between(0, width), -20,
        Phaser.Math.Between(6, 10), Phaser.Math.Between(10, 18), col).setRotation(Math.random() * Math.PI);
      this.tweens.add({
        targets: r,
        y: height + 30,
        rotation: r.rotation + Math.PI * 4,
        x: r.x + Phaser.Math.Between(-100, 100),
        duration: Phaser.Math.Between(2400, 4200),
        ease: "Quad.easeIn",
        delay: Math.random() * 1500,
        repeat: -1,
      });
    }

    this.add.text(width / 2, 110, "INSIGHTS  DELIVERED", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "20px",
      color: "#FFD24A",
      letterSpacing: 8,
    }).setOrigin(0.5);

    this.add.text(width / 2, 170, this.payload.levelName, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "60px",
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#5C3BA3",
      strokeThickness: 8,
    }).setOrigin(0.5);

    // Swiirl + Brand together.
    const swiirl = this.add.image(width / 2 - 140, height / 2 + 30, "celebrate").setScale(1.1);
    const brand = this.add.image(width / 2 + 140, height / 2 + 80, "brand_happy").setScale(1.0).setOrigin(0.5, 1);
    this.tweens.add({ targets: swiirl, y: swiirl.y - 14, duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    // A speech bubble pointing to the brand from the upper-right.
    const bubbleX = brand.x + 220;
    const bubbleY = brand.y - 220;
    const bubble = this.add.container(bubbleX, bubbleY);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.95);
    bg.lineStyle(3, 0x5C3BA3, 1);
    bg.fillRoundedRect(-160, -56, 320, 100, 16);
    bg.strokeRoundedRect(-160, -56, 320, 100, 16);
    // Tail pointing down-left toward the brand.
    bg.fillTriangle(-110, 30, -90, 50, -70, 30);
    bg.strokeTriangle(-110, 30, -90, 50, -70, 30);
    // Cover the segment of the bubble border where the tail meets it.
    bg.fillStyle(0xffffff, 0.95);
    bg.fillRect(-110, 28, 42, 5);
    const bubbleText = this.add.text(0, -6,
      "Oh!  THAT'S\nwhat the community wants.", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "16px",
      color: "#5C3BA3",
      align: "center",
      lineSpacing: 4,
    }).setOrigin(0.5);
    bubble.add([bg, bubbleText]);
    bubble.setAlpha(0);
    this.tweens.add({ targets: bubble, alpha: 1, y: bubbleY - 10, duration: 600, delay: 600, ease: "Back.easeOut" });

    // ----- RANK -----
    const collected = this.payload.insightsCollected ?? this.payload.insights ?? 0;
    const total = this.payload.totalInsights ?? collected;
    const lives = this.payload.lives ?? 0;
    const time = this.payload.time ?? null;
    const ratio = total > 0 ? collected / total : 0;

    let rank, rankColor, rankBg;
    if (ratio >= 0.95 && lives >= 3) { rank = "S"; rankColor = "#ffd24a"; rankBg = "#5C3BA3"; }
    else if (ratio >= 0.80)          { rank = "A"; rankColor = "#7bd389"; rankBg = "#1a4d2e"; }
    else if (ratio >= 0.60)          { rank = "B"; rankColor = "#7dc4ff"; rankBg = "#1a3d5c"; }
    else                             { rank = "C"; rankColor = "#dcc7f2"; rankBg = "#3a2a55"; }

    // Rank badge — circle with letter, scales in with bounce. Placed above
    // the stats line so it never overlaps.
    const rankCenterY = height / 2 + 150;
    const rankCircle = this.add.circle(width / 2, rankCenterY, 52, Phaser.Display.Color.HexStringToColor(rankBg).color, 1)
      .setStrokeStyle(5, 0xffffff).setScale(0).setAlpha(0);
    const rankText = this.add.text(width / 2, rankCenterY, rank, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "64px",
      fontStyle: "900",
      color: rankColor,
    }).setOrigin(0.5).setScale(0).setAlpha(0);
    const rankLabel = this.add.text(width / 2, rankCenterY - 64, "RANK", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "11px",
      fontStyle: "700",
      color: "#dcc7f2",
      letterSpacing: 6,
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: [rankCircle, rankText],
      scale: 1.4, alpha: 1,
      duration: 380, delay: 1100, ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({ targets: [rankCircle, rankText], scale: 1.0, duration: 180, ease: "Quad.easeOut" });
      },
    });
    this.tweens.add({ targets: rankLabel, alpha: 0.9, duration: 280, delay: 1480 });

    // S-rank confetti bonus.
    if (rank === "S") {
      this.time.delayedCall(1300, () => {
        for (let i = 0; i < 24; i++) {
          const angle = (i / 24) * Math.PI * 2;
          const dist = Phaser.Math.Between(40, 160);
          const c = this.add.circle(width / 2, rankCenterY, 4, 0xffd24a, 1);
          this.tweens.add({
            targets: c,
            x: width / 2 + Math.cos(angle) * dist,
            y: rankCenterY + Math.sin(angle) * dist,
            scale: 0.2, alpha: 0,
            duration: 700, ease: "Cubic.easeOut",
            onComplete: () => c.destroy(),
          });
        }
      });
    }

    // Stats panel — moved up, includes time + insights ratio.
    const panelY = height - 130;
    const timeStr = time != null ? `${Math.floor(time / 60)}:${String(time % 60).padStart(2, "0")}` : "--:--";
    this.add.text(width / 2, panelY,
      `${collected}/${total}  insights     ${timeStr}  time     ${lives}  ♥  remaining`, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "18px",
      color: "#ffffff",
      stroke: "#5C3BA3",
      strokeThickness: 4,
    }).setOrigin(0.5);

    if (this._isNewBest) {
      this.add.text(width / 2, height - 105, "★  NEW BEST  ★", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "18px",
        color: "#FFD24A",
        stroke: "#5C3BA3",
        strokeThickness: 4,
        letterSpacing: 6,
      }).setOrigin(0.5);
    }

    const isLastLevel = !this.payload.levelNum || this.payload.levelNum >= 5;
    const press = this.add.text(width / 2, height - 80,
      isLastLevel ? "press   SPACE   to play again" : "press   SPACE   for next level", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "16px",
      color: "#dcc7f2",
      letterSpacing: 4,
    }).setOrigin(0.5);
    this.tweens.add({ targets: press, alpha: 0.3, yoyo: true, repeat: -1, duration: 700 });

    const restart = () => {
      this.cameras.main.fadeOut(400, 26, 15, 46);
      this.time.delayedCall(420, () => {
        const nextLevel = isLastLevel ? 1 : this.payload.levelNum + 1;
        this.scene.start("Game", { level: nextLevel });
        this.scene.launch("HUD");
      });
    };
    this.input.keyboard.once("keydown-SPACE", restart);
    this.input.keyboard.once("keydown-ENTER", restart);
    this.input.once("pointerdown", restart);
  }
}
