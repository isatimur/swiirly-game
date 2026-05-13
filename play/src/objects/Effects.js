// Effects.js — unified VFX & camera juice manager.
// One instance per Game scene: `this.effects = new Effects(this)`.
// All methods are safe to call without preconditions and clean up automatically.

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this._punchActive = false;
    this._slowMoActive = false;
  }

  // -------------------------------------------------------------------------
  // PARTICLES
  // -------------------------------------------------------------------------

  /** Soft gray dust puff — for landing, running. */
  dustPuff(x, y, opts = {}) {
    const { color = 0xb892e0, scale = 0.6, ms = 360, count = 4 } = opts;
    for (let i = 0; i < count; i++) {
      const px = x + Phaser.Math.Between(-10, 10);
      const py = y + Phaser.Math.Between(-4, 4);
      const c = this.scene.add.circle(px, py, 6, color, 0.55).setDepth(50);
      this.scene.tweens.add({
        targets: c,
        scale: scale * 1.6,
        alpha: 0,
        x: px + Phaser.Math.Between(-12, 12),
        y: py - Phaser.Math.Between(4, 14),
        duration: ms,
        ease: "Quad.easeOut",
        onComplete: () => c.destroy(),
      });
    }
  }

  /** Radial sparkle burst — for collects, milestones. */
  sparkleBurst(x, y, count = 8, color = 0xffd24a) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.2, 0.2);
      const dist = Phaser.Math.Between(28, 60);
      const c = this.scene.add.circle(x, y, 3, color, 1).setDepth(60);
      this.scene.tweens.add({
        targets: c,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: 460,
        ease: "Cubic.easeOut",
        onComplete: () => c.destroy(),
      });
    }
  }

  /** Big purple smoke + star burst — enemy stomp. */
  stompPoof(x, y) {
    // Smoke ring.
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const c = this.scene.add.circle(x, y, 8, 0x8b63c9, 0.7).setDepth(55);
      this.scene.tweens.add({
        targets: c,
        x: x + Math.cos(angle) * 50,
        y: y + Math.sin(angle) * 35,
        scale: 1.8,
        alpha: 0,
        duration: 320,
        ease: "Quad.easeOut",
        onComplete: () => c.destroy(),
      });
    }
    // Star burst.
    for (let i = 0; i < 5; i++) {
      const s = this.scene.add.text(x, y, "★", {
        fontSize: "14px",
        color: "#ffd24a",
      }).setOrigin(0.5).setDepth(61);
      const angle = -Math.PI / 2 + Phaser.Math.FloatBetween(-1, 1);
      this.scene.tweens.add({
        targets: s,
        x: x + Math.cos(angle) * Phaser.Math.Between(40, 80),
        y: y + Math.sin(angle) * Phaser.Math.Between(30, 60),
        scale: 0.4,
        alpha: 0,
        rotation: Phaser.Math.FloatBetween(-1, 1),
        duration: 440,
        ease: "Quad.easeOut",
        onComplete: () => s.destroy(),
      });
    }
  }

  /** Smaller poof for non-boss defeats. */
  defeatPoof(x, y) {
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const c = this.scene.add.circle(x, y, 6, 0x5c3ba3, 0.6).setDepth(55);
      this.scene.tweens.add({
        targets: c,
        x: x + Math.cos(angle) * 32,
        y: y + Math.sin(angle) * 24,
        scale: 1.4,
        alpha: 0,
        duration: 280,
        ease: "Quad.easeOut",
        onComplete: () => c.destroy(),
      });
    }
  }

  /** Boss shockwave — expanding ring on final hit. */
  bossShockwave(x, y) {
    const ring = this.scene.add.circle(x, y, 12, 0xffffff, 0).setStrokeStyle(6, 0xff6b9d, 1).setDepth(70);
    this.scene.tweens.add({
      targets: ring,
      radius: 240,
      alpha: 0,
      duration: 600,
      ease: "Cubic.easeOut",
      onUpdate: (_, t) => {
        ring.setRadius(12 + (240 - 12) * t.progress);
      },
      onComplete: () => ring.destroy(),
    });
    // Inner flash.
    const flash = this.scene.add.circle(x, y, 80, 0xffffff, 0.8).setDepth(69);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2.2,
      duration: 380,
      ease: "Quad.easeOut",
      onComplete: () => flash.destroy(),
    });
  }

  /** Floating combo / chain text. */
  comboFloat(x, y, text, colorHex = "#ffd24a") {
    const t = this.scene.add.text(x, y, text, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "20px",
      fontStyle: "900",
      color: colorHex,
      stroke: "#1a0f2e",
      strokeThickness: 4,
    }).setOrigin(0.5).setScale(0.6).setDepth(80);

    this.scene.tweens.add({
      targets: t,
      scale: 1.2,
      duration: 110,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens.add({ targets: t, scale: 1.0, duration: 90 });
      },
    });
    this.scene.tweens.add({
      targets: t,
      y: y - 70,
      alpha: 0,
      duration: 760,
      ease: "Quad.easeOut",
      onComplete: () => t.destroy(),
    });
  }

  /** Brief horizontal speed line trailing a moving object. */
  speedLine(x, y, dir = 1) {
    const line = this.scene.add.rectangle(x, y, 28, 2, 0xffffff, 0.6).setDepth(50);
    this.scene.tweens.add({
      targets: line,
      x: x - dir * 60,
      alpha: 0,
      scaleX: 0.2,
      duration: 240,
      ease: "Quad.easeOut",
      onComplete: () => line.destroy(),
    });
  }

  /** Insight orb flies from world position to HUD pickup anchor. */
  insightFlyToHUD(worldX, worldY, hudScreenX, hudScreenY) {
    const cam = this.scene.cameras.main;
    // Convert HUD screen coords back to world coords (so target tracks camera).
    const targetWorldX = cam.worldView.x + hudScreenX / cam.zoom;
    const targetWorldY = cam.worldView.y + hudScreenY / cam.zoom;

    const orb = this.scene.add.image(worldX, worldY, "insight")
      .setScale(0.9)
      .setDepth(75);

    // Slight arc via control point above.
    const controlY = Math.min(worldY, targetWorldY) - 80;

    const startTime = this.scene.time.now;
    const duration = 380;

    // Trailing sparkles.
    let lastTrail = 0;
    const tweenTracker = this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration,
      ease: "Quad.easeIn",
      onUpdate: (tw) => {
        const t = tw.getValue();
        // Quadratic bezier (start → control → end).
        const omt = 1 - t;
        const bx = omt * omt * worldX + 2 * omt * t * ((worldX + targetWorldX) / 2) + t * t * targetWorldX;
        const by = omt * omt * worldY + 2 * omt * t * controlY + t * t * targetWorldY;
        orb.x = bx; orb.y = by;
        orb.setScale(0.9 - 0.5 * t);

        const now = this.scene.time.now;
        if (now - lastTrail > 38) {
          lastTrail = now;
          const sp = this.scene.add.circle(bx, by, 3, 0xffd24a, 1).setDepth(74);
          this.scene.tweens.add({
            targets: sp, alpha: 0, scale: 0.2,
            duration: 240, ease: "Quad.easeOut",
            onComplete: () => sp.destroy(),
          });
        }
      },
      onComplete: () => {
        orb.destroy();
        this.scene.game.events.emit("hud-insight-arrived");
      },
    });
  }

  /** Pull an active orb toward a target (per-frame, called from update). */
  insightMagnetize(orb, targetX, targetY, strength = 0.18) {
    const dx = targetX - orb.x, dy = targetY - orb.y;
    orb.x += dx * strength;
    orb.y += dy * strength;
  }

  // -------------------------------------------------------------------------
  // CAMERA JUICE
  // -------------------------------------------------------------------------

  /** Punch zoom: pop + return. Doesn't stack. */
  punchZoom(amount = 0.04, totalMs = 200) {
    if (this._punchActive) return;
    this._punchActive = true;
    const cam = this.scene.cameras.main;
    const baseZoom = cam.zoom;
    this.scene.tweens.add({
      targets: cam,
      zoom: baseZoom + amount,
      duration: totalMs * 0.4,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: cam,
          zoom: baseZoom,
          duration: totalMs * 0.6,
          ease: "Quad.easeIn",
          onComplete: () => { this._punchActive = false; },
        });
      },
    });
  }

  /** Freeze physics for N ms — stomp impact tactile feel. */
  freezeFrame(ms = 60) {
    const phys = this.scene.physics.world;
    if (phys.isPaused) return;
    phys.pause();
    this.scene.time.delayedCall(ms, () => phys.resume());
  }

  /** Slow-motion ramp: down → hold → up. */
  slowMo(scale = 0.3, msDown = 200, msHold = 300, msUp = 600) {
    if (this._slowMoActive) return;
    this._slowMoActive = true;
    const phys = this.scene.physics.world;
    this.scene.tweens.addCounter({
      from: 1, to: scale, duration: msDown, ease: "Quad.easeOut",
      onUpdate: (tw) => { phys.timeScale = 1 / tw.getValue(); },
      onComplete: () => {
        this.scene.time.delayedCall(msHold, () => {
          this.scene.tweens.addCounter({
            from: scale, to: 1, duration: msUp, ease: "Quad.easeIn",
            onUpdate: (tw) => { phys.timeScale = 1 / tw.getValue(); },
            onComplete: () => {
              phys.timeScale = 1;
              this._slowMoActive = false;
            },
          });
        });
      },
    });
  }

  /** Full-screen colored flash overlay. */
  radialFlash(color = 0xff3060, alpha = 0.4, ms = 240) {
    const cam = this.scene.cameras.main;
    const overlay = this.scene.add.rectangle(
      cam.worldView.x + cam.worldView.width / 2,
      cam.worldView.y + cam.worldView.height / 2,
      cam.worldView.width,
      cam.worldView.height,
      color,
      alpha
    ).setDepth(100).setScrollFactor(0);
    this.scene.tweens.add({
      targets: overlay,
      alpha: 0,
      duration: ms,
      ease: "Quad.easeOut",
      onComplete: () => overlay.destroy(),
    });
  }

  /** Wraps cameras.main.shake with consistent defaults. */
  shake(intensity = 0.005, ms = 120) {
    this.scene.cameras.main.shake(ms, intensity);
  }

  // -------------------------------------------------------------------------
  // PLAYER FEEL — squash & stretch
  // -------------------------------------------------------------------------

  /**
   * Apply a squash/stretch tween to a target sprite.
   * mode: "land" | "jump" | "stomp" | "hurt"
   */
  squashAndStretch(target, mode) {
    if (!target || !target.scene) return;
    const baseScale = target._baseScale ?? target.scaleX;
    target._baseScale = baseScale;

    let sx, sy, ms;
    switch (mode) {
      case "land":  sx = baseScale * 1.20; sy = baseScale * 0.78; ms = 110; break;
      case "jump":  sx = baseScale * 0.85; sy = baseScale * 1.18; ms = 140; break;
      case "stomp": sx = baseScale * 1.30; sy = baseScale * 0.70; ms = 90;  break;
      case "hurt":  sx = baseScale * 0.92; sy = baseScale * 1.08; ms = 100; break;
      default: return;
    }

    // Cancel any previous ss tween on this target.
    if (target._ssTween) target._ssTween.stop();

    target._ssTween = this.scene.tweens.add({
      targets: target,
      scaleX: sx, scaleY: sy,
      duration: ms,
      ease: "Quad.easeOut",
      onComplete: () => {
        target._ssTween = this.scene.tweens.add({
          targets: target,
          scaleX: baseScale, scaleY: baseScale,
          duration: ms * 1.2,
          ease: "Quad.easeIn",
        });
      },
    });
  }
}
