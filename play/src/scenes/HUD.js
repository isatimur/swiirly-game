// HUD overlay: insights counter, lives, brand-meter, active signals.

import { VIEW } from "../config.js";

export class HUDScene extends Phaser.Scene {
  constructor() { super("HUD"); }

  create() {
    this.scene.bringToTop();

    // ----- INSIGHTS -----
    this.add.image(36, 36, "insight").setScale(0.75).setScrollFactor(0);
    this.insightText = this.add.text(64, 22, "× 0", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "26px",
      fontStyle: "700",
      color: "#ffffff",
      stroke: "#5C3BA3",
      strokeThickness: 5,
    }).setScrollFactor(0);

    // ----- LIVES (heart icons) -----
    this.livesGroup = this.add.container(VIEW.width - 32, 30);
    this.renderLives(3);

    // ----- BRAND METER -----
    const meterX = VIEW.width / 2 - 140;
    const meterY = 32;
    this.add.text(VIEW.width / 2, meterY - 20, "BRAND  METER", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "12px",
      color: "#dcc7f2",
      letterSpacing: 4,
    }).setOrigin(0.5).setScrollFactor(0);

    this.add.rectangle(VIEW.width / 2, meterY, 280, 16, 0x000000, 0.35)
      .setStrokeStyle(2, 0xb892e0).setScrollFactor(0);
    this.brandFill = this.add.rectangle(meterX, meterY, 0, 12, 0xffd24a)
      .setOrigin(0, 0.5).setScrollFactor(0);
    this.brandFillTarget = 0;
    this.brandText = this.add.text(VIEW.width / 2, meterY + 14, "0 / 12", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "11px",
      color: "#ffffff",
      letterSpacing: 2,
    }).setOrigin(0.5).setScrollFactor(0);

    // ----- ACTIVE SIGNAL ICONS -----
    this.signalIcons = {};
    this.signalY = 80;

    // ----- HOOKS -----
    // All HUD-bound events travel on this.game.events (the persistent Phaser.Game
    // bus) so they survive Game scene restarts without HUD losing its listeners.
    const handlers = {
      "level-loaded": (data) => {
        this.brandThreshold = data.brandThreshold;
        this.brandText.setText(`0 / ${data.brandThreshold}`);
        this.renderLives(data.lives);
        this.insightText.setText("× 0");
      },
      "insight-changed": (count) => {
        this.insightText.setText(`× ${count}`);
        this.tweens.add({ targets: this.insightText, scale: 1.2, duration: 100, yoyo: true });
      },
      "life-gained": (lives) => this.renderLives(lives),
      "player-hurt": (lives) => this.renderLives(lives),
      "brand-meter": (ratio, current, total) => {
        this.brandFillTarget = Math.min(280 - 4, ratio * 276);
        this.brandText.setText(`${current} / ${total}`);
        if (ratio >= 1) {
          this.brandFill.fillColor = 0x7bd389;
          this.brandText.setText("READY · DELIVER!").setColor("#ffe9a8");
        }
      },
      "signal-active": (kind, durMs) => this.addSignalIcon(kind, durMs),
      "signal-broken": (kind) => this.removeSignalIcon(kind),
      "muted-changed": (muted) => this.flashCenter(muted ? "MUTED" : "SOUND ON"),
    };
    for (const [evt, fn] of Object.entries(handlers)) this.game.events.on(evt, fn);
    this.events.once("shutdown", () => {
      for (const [evt, fn] of Object.entries(handlers)) this.game.events.off(evt, fn);
    });
  }

  renderLives(n) {
    this.livesGroup.removeAll(true);
    for (let i = 0; i < n; i++) {
      const heart = this.makeHeart(-i * 30, 0);
      this.livesGroup.add(heart);
    }
  }

  makeHeart(x, y) {
    // Phaser Graphics has no bezier — draw a heart as 2 circles + triangle.
    const g = this.add.graphics();
    g.lineStyle(3, 0x5c3ba3, 1);
    g.fillStyle(0xff6b9d, 1);
    g.fillCircle(x - 7, y, 8);
    g.fillCircle(x + 7, y, 8);
    g.fillTriangle(x - 13, y + 3, x + 13, y + 3, x, y + 18);
    g.strokeCircle(x - 7, y, 8);
    g.strokeCircle(x + 7, y, 8);
    g.strokeTriangle(x - 13, y + 3, x + 13, y + 3, x, y + 18);
    // Cover the triangle's top edges where they cross the circles.
    g.fillStyle(0xff6b9d, 1);
    g.fillRect(x - 13, y - 1, 26, 6);
    return g;
  }

  addSignalIcon(kind, durMs) {
    if (this.signalIcons[kind]) {
      this.signalIcons[kind].destroy();
      delete this.signalIcons[kind];
    }
    const idx = Object.keys(this.signalIcons).length;
    const x = 36 + idx * 56;
    const c = this.add.container(x, this.signalY).setScrollFactor(0);
    const ring = this.add.circle(0, 0, 22, 0x000000, 0.4).setStrokeStyle(2, 0xffffff);
    const icon = this.add.image(0, 0, `signal_${kind}`).setScale(0.6);
    const arc = this.add.graphics();
    c.add([ring, icon, arc]);
    c.kind = kind;
    c.startTime = this.time.now;
    c.duration = durMs;
    c.arc = arc;
    this.signalIcons[kind] = c;
  }

  removeSignalIcon(kind) {
    const c = this.signalIcons[kind];
    if (!c) return;
    this.tweens.add({
      targets: c, alpha: 0, scale: 0.3, duration: 250, onComplete: () => c.destroy(),
    });
    delete this.signalIcons[kind];
    // Re-layout.
    Object.values(this.signalIcons).forEach((c2, idx) => c2.x = 36 + idx * 56);
  }

  flashCenter(text) {
    const t = this.add.text(VIEW.width / 2, VIEW.height / 2 + 80, text, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "24px",
      color: "#ffffff",
      stroke: "#5C3BA3",
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0);
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 20, duration: 800, onComplete: () => t.destroy() });
  }

  update(time, dt) {
    if (Math.abs(this.brandFill.width - this.brandFillTarget) > 0.5) {
      this.brandFill.width = Phaser.Math.Linear(this.brandFill.width, this.brandFillTarget, dt / 1000 * 6);
    }
    // Cooldown rings on signal icons.
    for (const c of Object.values(this.signalIcons)) {
      const ratio = Math.max(0, 1 - (time - c.startTime) / c.duration);
      c.arc.clear();
      c.arc.lineStyle(3, 0xffffff, 0.9);
      c.arc.beginPath();
      c.arc.arc(0, 0, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio, false);
      c.arc.strokePath();
    }
  }
}
