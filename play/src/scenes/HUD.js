// HUD overlay: insights counter, lives, brand-meter, active signals.

import { VIEW } from "../config.js";

export class HUDScene extends Phaser.Scene {
  constructor() { super("HUD"); }

  create() {
    this.scene.bringToTop();

    // ----- INSIGHTS -----
    this.add.image(36, 36, "insight").setScale(0.75).setScrollFactor(0);
    // SCORE — shareable, brag-worthy tally.
    this.scoreText = this.add.text(VIEW.width / 2, 78, "SCORE  0", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "13px",
      fontStyle: "900",
      color: "#ffd24a",
      letterSpacing: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(60);

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
    const meterY = 30;
    this.brandLabel = this.add.text(VIEW.width / 2, meterY - 18, "BRAND  METER", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "11px",
      color: "#dcc7f2",
      letterSpacing: 4,
    }).setOrigin(0.5).setScrollFactor(0);

    // Track + fill (taller = more visible).
    this.add.rectangle(VIEW.width / 2, meterY, 280, 20, 0x000000, 0.45)
      .setStrokeStyle(2, 0xb892e0).setScrollFactor(0);
    this.brandFill = this.add.rectangle(meterX, meterY, 0, 16, 0xffd24a)
      .setOrigin(0, 0.5).setScrollFactor(0);
    this.brandFillTarget = 0;
    this.brandText = this.add.text(VIEW.width / 2, meterY + 16, "0 / 12", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "11px",
      color: "#ffffff",
      letterSpacing: 2,
    }).setOrigin(0.5).setScrollFactor(0);

    // Level name — shown below the meter, fades in on level-loaded.
    this.levelNameText = this.add.text(VIEW.width / 2, meterY + 30, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "10px",
      color: "#b892e0",
      letterSpacing: 5,
    }).setOrigin(0.5).setScrollFactor(0).setAlpha(0.8);

    // ----- ACTIVE SIGNAL ICONS -----
    this.signalIcons = {};
    this.signalY = 88;

    // ----- PERSONA / ATTACK BADGE -----
    // Bottom-left corner. Shows the persona portrait + a ring that fills
    // back to full as the attack cooldown elapses.
    this.personaBadgeX = 56;
    this.personaBadgeY = VIEW.height - 56;
    this.personaRingBg = this.add.circle(this.personaBadgeX, this.personaBadgeY, 28, 0x000000, 0.4)
      .setStrokeStyle(2, 0xb892e0).setScrollFactor(0);
    this.personaPortrait = this.add.image(this.personaBadgeX, this.personaBadgeY, "idle")
      .setScale(0.18).setScrollFactor(0);
    this.personaCooldownArc = this.add.graphics().setScrollFactor(0);
    this.personaNameText = this.add.text(this.personaBadgeX + 38, this.personaBadgeY - 8, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "13px", fontStyle: "900",
      color: "#ffffff", stroke: "#5C3BA3", strokeThickness: 3,
      letterSpacing: 2,
    }).setOrigin(0, 0.5).setScrollFactor(0);
    this.personaAttackText = this.add.text(this.personaBadgeX + 38, this.personaBadgeY + 8, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "10px",
      color: "#dcc7f2", letterSpacing: 1,
    }).setOrigin(0, 0.5).setScrollFactor(0);
    this._attackCooldownEndAt = 0;
    this._attackCooldownTotal = 1;

    // ----- COMBO DISPLAY -----
    // Anchored to right side so it doesn't collide with center act banners.
    this.comboText = this.add.text(VIEW.width - 36, 80, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "20px",
      fontStyle: "900",
      color: "#ffd24a",
      stroke: "#5C3BA3",
      strokeThickness: 4,
      letterSpacing: 2,
      align: "right",
    }).setOrigin(1, 0.5).setScrollFactor(0).setAlpha(0);

    // ----- BOSS HEALTH BAR (hidden by default) -----
    this.bossBarBG = this.add.rectangle(VIEW.width / 2, VIEW.height - 36, 320, 16, 0x000000, 0.55)
      .setStrokeStyle(2, 0xff5c5c).setScrollFactor(0).setAlpha(0);
    this.bossBarFill = this.add.rectangle(VIEW.width / 2 - 158, VIEW.height - 36, 316, 12, 0xff5c5c)
      .setOrigin(0, 0.5).setScrollFactor(0).setAlpha(0);
    this.bossBarLabel = this.add.text(VIEW.width / 2, VIEW.height - 56, "INCOMPETENCE MANAGER", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "11px",
      fontStyle: "700",
      color: "#ff5c5c",
      letterSpacing: 4,
    }).setOrigin(0.5).setScrollFactor(0).setAlpha(0);

    // ----- DAMAGE VIGNETTE (full-screen red overlay) -----
    this.damageVignette = this.add.rectangle(
      VIEW.width / 2, VIEW.height / 2,
      VIEW.width, VIEW.height,
      0xff3060, 0
    ).setScrollFactor(0).setDepth(95);

    // ----- HOOKS -----
    // All HUD-bound events travel on this.game.events (the persistent Phaser.Game
    // bus) so they survive Game scene restarts without HUD losing its listeners.
    const handlers = {
      "level-loaded": (data) => {
        this.brandThreshold = data.brandThreshold;
        this.brandText.setText(`0 / ${data.brandThreshold}`);
        this.brandFill.fillColor = 0xffd24a;
        this.brandFill.width = 0;
        this.brandFillTarget = 0;
        this.renderLives(data.lives);
        this.insightText.setText("× 0");
        if (this.scoreText) this.scoreText.setText("SCORE  0");
        // Show level name with a brief slide-in.
        this.levelNameText.setText(data.level?.toUpperCase() ?? "");
        this.tweens.add({ targets: this.levelNameText, alpha: 0.8, y: 60, duration: 280, ease: "Quad.easeOut", from: 0, fromY: 70 });
      },
      "insight-changed": (count) => {
        this.insightText.setText(`× ${count}`);
        this.tweens.add({ targets: this.insightText, scale: 1.25, duration: 90, yoyo: true, ease: "Back.easeOut" });
      },
      "life-gained": (lives) => {
        this.renderLives(lives);
        this.flashCenter("♥ EXTRA LIFE!");
      },
      "player-hurt": (lives) => this.renderLives(lives),
      "brand-meter": (ratio, current, total) => {
        this.brandFillTarget = Math.min(280 - 4, ratio * 276);
        this.brandText.setText(`${current} / ${total}`);
        if (ratio >= 1) {
          this.brandFill.fillColor = 0x7bd389;
          this.brandText.setText("READY · DELIVER!").setColor("#ffe9a8");
          // Pulse the meter once to draw attention.
          this.tweens.add({ targets: this.brandFill, scaleY: 1.4, duration: 140, yoyo: true, ease: "Quad.easeOut" });
        }
      },
      "signal-active": (kind, durMs) => this.addSignalIcon(kind, durMs),
      "signal-broken": (kind) => this.removeSignalIcon(kind),
      "muted-changed": (muted) => this.flashCenter(muted ? "MUTED" : "SOUND ON"),
      "checkpoint": () => this.flashCenter("✓ CHECKPOINT"),
      "combo-changed": ({ count, multiplier }) => {
        if (count <= 1) {
          this.tweens.add({ targets: this.comboText, alpha: 0, duration: 200 });
          return;
        }
        this.comboText.setText(`COMBO ×${count}  ·  ${multiplier}× INSIGHT`);
        this.comboText.setAlpha(1);
        this.tweens.add({
          targets: this.comboText,
          scale: 1.3, duration: 90, yoyo: true, ease: "Back.easeOut",
        });
        // Tier callouts at threshold counts.
        const tiers = {
          3:  { label: "GOOD!",     color: "#ffd24a", scale: 1.15 },
          5:  { label: "GREAT!",    color: "#7dc4ff", scale: 1.30 },
          8:  { label: "INSANE!",   color: "#ff8866", scale: 1.45 },
          12: { label: "GODLIKE!",  color: "#ff5cb0", scale: 1.65 },
          16: { label: "UNREAL!!",  color: "#ffffff", scale: 1.85 },
        };
        const tier = tiers[count];
        if (tier) this.spawnTierCallout(tier);
      },
      "damage-flash": () => {
        // Brief, less obtrusive flash — fades in then out so it doesn't blank the screen.
        this.damageVignette.alpha = 0;
        this.tweens.add({
          targets: this.damageVignette, alpha: 0.22,
          duration: 80, ease: "Quad.easeOut",
          yoyo: true, hold: 0,
          onComplete: () => { this.damageVignette.alpha = 0; },
        });
      },
      "boss-health": ({ current, max }) => {
        if (this.bossBarBG.alpha === 0 && current > 0) {
          this.tweens.add({ targets: [this.bossBarBG, this.bossBarFill, this.bossBarLabel], alpha: 1, duration: 240 });
        }
        const ratio = Math.max(0, current / max);
        this.tweens.add({
          targets: this.bossBarFill,
          displayWidth: 316 * ratio,
          duration: 220, ease: "Quad.easeOut",
        });
        if (current <= 0) {
          this.tweens.add({
            targets: [this.bossBarBG, this.bossBarFill, this.bossBarLabel],
            alpha: 0, delay: 700, duration: 380,
          });
        }
      },
      "boss-name": (name) => {
        this.bossBarLabel.setText(String(name).toUpperCase());
      },
      "level-intro": ({ name, num, quote }) => this.showLevelIntro({ name, num, quote }),
      "frenzy-start": ({ duration }) => this.startFrenzy(duration),
      "frenzy-end": () => this.endFrenzy(),
      "score-changed": ({ score }) => {
        this.scoreText.setText(`SCORE  ${score.toLocaleString()}`);
        this.tweens.add({ targets: this.scoreText, scale: 1.18, duration: 80, yoyo: true, ease: "Back.easeOut" });
      },
      "hud-insight-arrived": () => {
        this.tweens.add({
          targets: this.insightText, scale: 1.4,
          duration: 90, yoyo: true, ease: "Back.easeOut",
        });
      },
      "persona-bind": ({ name, attackHint, spriteKey }) => {
        // Portrait uses the selected character's own idle frame — no tint,
        // each skin's art has its own colors.
        const key = spriteKey ? `${spriteKey}_idle` : "idle";
        if (this.textures.exists(key)) this.personaPortrait.setTexture(key);
        else this.personaPortrait.setTexture("idle");
        this.personaPortrait.clearTint();
        this.personaNameText.setText(name?.toUpperCase() ?? "");
        this.personaAttackText.setText(attackHint ?? "");
      },
      "attack-cooldown": ({ duration }) => {
        this._attackCooldownEndAt = this.time.now + duration;
        this._attackCooldownTotal = Math.max(1, duration);
      },
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

  showLevelIntro({ name, num, quote }) {
    const cx = VIEW.width / 2;
    const cy = VIEW.height / 2;
    const bg = this.add.rectangle(cx, cy, VIEW.width, 200, 0x1a0f2e, 0)
      .setScrollFactor(0).setDepth(96);
    const num$ = this.add.text(cx, cy - 30, `LEVEL ${num}`, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "16px",
      fontStyle: "700",
      color: "#b892e0",
      letterSpacing: 8,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(97).setAlpha(0);
    const name$ = this.add.text(cx, cy + 14, name.toUpperCase(), {
      fontFamily: "system-ui, sans-serif",
      fontSize: "44px",
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#5C3BA3",
      strokeThickness: 6,
      shadow: { offsetX: 0, offsetY: 6, color: "#1a0f2e", blur: 10, fill: true },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(97).setAlpha(0).setY(cy + 30);
    const quote$ = this.add.text(cx, cy + 60, `"${quote}"`, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "15px",
      fontStyle: "italic",
      color: "#dcc7f2",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(97).setAlpha(0);

    this.tweens.add({ targets: bg, fillAlpha: 0.85, duration: 240 });
    this.tweens.add({ targets: num$, alpha: 1, duration: 280, delay: 120 });
    this.tweens.add({ targets: name$, alpha: 1, y: cy + 14, duration: 360, delay: 200, ease: "Back.easeOut" });
    this.tweens.add({ targets: quote$, alpha: 1, duration: 280, delay: 480 });

    this.time.delayedCall(1300, () => {
      [bg, num$, name$, quote$].forEach(o =>
        this.tweens.add({ targets: o, alpha: 0, duration: 280, onComplete: () => o.destroy() })
      );
    });
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

  // FRENZY mode: gold full-screen tint + big banner + draining timer bar.
  // Auto-cleans on endFrenzy(), or if the scene shuts down (handlers off).
  startFrenzy(duration) {
    if (this._frenzyGroup) this.endFrenzy(); // safety re-entry
    const overlay = this.add.rectangle(
      VIEW.width / 2, VIEW.height / 2, VIEW.width, VIEW.height,
      0xffd24a, 0.10,
    ).setScrollFactor(0).setDepth(94);
    this.tweens.add({ targets: overlay, alpha: 0.14, yoyo: true, repeat: -1, duration: 380, ease: "Sine.easeInOut" });

    const banner = this.add.text(VIEW.width / 2, 220, "FRENZY!", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "96px",
      fontStyle: "900",
      color: "#ffd24a",
      stroke: "#1a0f2e",
      strokeThickness: 10,
      shadow: { offsetX: 0, offsetY: 8, color: "#1a0f2e", blur: 18, fill: true },
      letterSpacing: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(121).setScale(0).setAlpha(0);
    this.tweens.add({ targets: banner, scale: 1, alpha: 1, duration: 320, ease: "Back.easeOut" });
    this.tweens.add({ targets: banner, alpha: 0, y: 180, delay: 900, duration: 500, ease: "Quad.easeIn" });

    // Drain timer bar at top.
    const barW = 280;
    const barX = VIEW.width / 2 - barW / 2;
    const barY = 110;
    const barBg = this.add.rectangle(VIEW.width / 2, barY, barW, 10, 0x1a0f2e, 0.7)
      .setStrokeStyle(2, 0xffd24a).setScrollFactor(0).setDepth(95);
    const barFill = this.add.rectangle(barX, barY, barW, 6, 0xffd24a)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(96);
    this.tweens.add({
      targets: barFill, width: 0,
      duration, ease: "Linear",
    });

    // Tiny "FRENZY ×2 INSIGHT" caption above the bar.
    const caption = this.add.text(VIEW.width / 2, barY - 14, "FRENZY  ×2  INSIGHT", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "11px",
      fontStyle: "900",
      color: "#ffd24a",
      letterSpacing: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(96);

    this._frenzyGroup = [overlay, banner, barBg, barFill, caption];
  }

  endFrenzy() {
    const group = this._frenzyGroup;
    if (!group) return;
    this._frenzyGroup = null;
    this.tweens.add({
      targets: group, alpha: 0,
      duration: 280,
      onComplete: () => group.forEach(o => o.destroy?.()),
    });
  }

  // Big mid-screen tier callout, scales in with bounce then fades up + out.
  spawnTierCallout({ label, color, scale = 1.3 }) {
    const t = this.add.text(VIEW.width / 2, VIEW.height / 2 - 60, label, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "64px",
      fontStyle: "900",
      color,
      stroke: "#1a0f2e",
      strokeThickness: 8,
      shadow: { offsetX: 0, offsetY: 6, color: "#1a0f2e", blur: 14, fill: true },
      letterSpacing: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(120).setScale(0).setAlpha(0);
    // Pop in.
    this.tweens.add({
      targets: t, scale, alpha: 1,
      duration: 260, ease: "Back.easeOut",
    });
    // Drift up + fade out.
    this.tweens.add({
      targets: t,
      y: t.y - 50,
      alpha: 0,
      delay: 420,
      duration: 600,
      ease: "Quad.easeIn",
      onComplete: () => t.destroy(),
    });
    // Brief camera shake on the bigger tiers.
    if (scale >= 1.45) this.cameras.main.shake(160, 0.005);
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
    // Persona attack cooldown ring (drained on attack, refills to a full circle when ready).
    if (this.personaCooldownArc) {
      this.personaCooldownArc.clear();
      const remaining = Math.max(0, this._attackCooldownEndAt - time);
      const ratio = remaining > 0 ? 1 - (remaining / this._attackCooldownTotal) : 1;
      this.personaCooldownArc.lineStyle(3, ratio >= 1 ? 0xffd24a : 0xffffff, 0.9);
      this.personaCooldownArc.beginPath();
      this.personaCooldownArc.arc(
        this.personaBadgeX, this.personaBadgeY, 32,
        -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio, false);
      this.personaCooldownArc.strokePath();
    }
  }
}
