// Swiirl — player character.
//
// Movement model (deliberate, classic platformer):
//   - Acceleration + drag instead of lerp. Snappier and more legible.
//   - Air control is reduced (separate accel/decel) so jumps feel intentional.
//   - Variable jump = "cut on release". Press jump for full velocity; release
//     before the apex and we cap upward velocity to a short-hop value.
//   - Coyote time + jump buffer = forgiveness windows that real platformers ship.
//
// State machine drives texture/animation. State is recomputed each frame from
// physics state, NOT mutated by ad-hoc setTexture calls (which is what made the
// older version feel jittery — texture would change before the next frame
// reset it).

import { PHYSICS, PLAYER, SIGNAL_DURATIONS } from "../config.js";
import { SFX } from "../audio.js";

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "idle");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Sprites are 280x320 with the character pose anchored bottom-center.
    // Origin (0.5, 1.0) means player.y === character feet world y.
    this.setOrigin(0.5, 1.0);
    this.setScale(PLAYER.spriteScale);
    this.body.setSize(PLAYER.hitbox.width, PLAYER.hitbox.height, false);
    this.body.setOffset(PLAYER.hitbox.offsetX, PLAYER.hitbox.offsetY);
    this.setCollideWorldBounds(true);
    this.setMaxVelocity(PHYSICS.runSpeed * 1.6, 1500);

    this.lives = PLAYER.startLives;
    this.insights = 0;

    this.facing = 1;
    this.state = "idle";
    this._lastGroundedAt = -Infinity;
    this._jumpRequestedAt = -Infinity;
    this._isJumping = false; // true between jump press and apex/cut
    // Double-jump bookkeeping. Refilled on every ground-touch; consumed once
    // per jump press. Coyote time only applies to the FIRST jump.
    this._jumpsRemaining = PHYSICS.maxJumps ?? 2;
    // Brief grace period at level start so players can read the banner.
    // We protect internally but don't visually flicker — the spawn flicker
    // looked like a bug.
    this._invulnUntil = scene.time.now + 1500;
    this._spawnGraceUntil = scene.time.now + 1500;
    this._hurtUntil = 0;

    this.signals = { speed: 0, shield: 0, growth: 0 };

    this._cursors = scene.input.keyboard.createCursorKeys();
    this._keys = scene.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      SHIFT: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    // Reduce sub-pixel jitter when the camera lerps.
    this.setRoundPixels?.(true);
  }

  setSignal(kind) {
    const dur = SIGNAL_DURATIONS[kind] ?? 8000;
    this.signals[kind] = this.scene.time.now + dur;
    if (kind === "growth") {
      this.scene.tweens.add({
        targets: this,
        scale: PLAYER.spriteScale * 1.35,
        duration: 220,
        ease: "Back.easeOut",
      });
    }
    SFX.signal();
    this.scene.events.emit("signal-active", kind, dur);
  }

  hasSignal(kind) {
    return (this.signals[kind] ?? 0) > this.scene.time.now;
  }

  takeDamage(fromX) {
    const now = this.scene.time.now;
    if (now < this._invulnUntil) return false;

    if (this.hasSignal("shield")) {
      this.signals.shield = 0;
      this.scene.events.emit("signal-broken", "shield");
      this.flash(0x7dc4ff);
      this._invulnUntil = now + 600;
      return false;
    }
    if (this.hasSignal("growth")) {
      this.signals.growth = 0;
      this.scene.events.emit("signal-broken", "growth");
      this.scene.tweens.add({ targets: this, scale: PLAYER.spriteScale, duration: 150, ease: "Quad.easeOut" });
      this.flash(0x7bd389);
      this._invulnUntil = now + 800;
      return false;
    }

    this.lives = Math.max(0, this.lives - 1);
    this._invulnUntil = now + PHYSICS.invulnDuration;
    this._hurtUntil = now + PHYSICS.hurtStunDuration;
    this._isJumping = false;
    SFX.hurt();
    const dir = (this.x < fromX) ? -1 : 1;
    this.setVelocity(PHYSICS.knockback.x * dir, PHYSICS.knockback.y);
    this.scene.events.emit("player-hurt", this.lives);
    if (this.lives <= 0) {
      this.scene.events.emit("player-died");
    }
    return true;
  }

  flash(color) {
    if (!this.scene) return;
    this.setTint(color);
    this.scene.time.delayedCall(150, () => this.clearTint());
  }

  collectInsight(amount = 1) {
    this.insights += amount;
    SFX.collect();
    if (this.insights > 0 && this.insights % PLAYER.insightToLife === 0) {
      this.lives += 1;
      this.scene.events.emit("life-gained", this.lives);
    }
    this.scene.events.emit("insight-changed", this.insights);
  }

  bounceOnEnemy() {
    this.setVelocityY(-540);
    this._isJumping = true;
    // Bouncing on an enemy refunds your jumps so you can chain stomps.
    this._jumpsRemaining = PHYSICS.maxJumps ?? 2;
    SFX.stomp();
  }

  spawnLandingDust() {
    if (!this.scene || !this.scene.add) return;
    for (let i = 0; i < 6; i++) {
      const side = i < 3 ? -1 : 1;
      const dust = this.scene.add.circle(
        this.x + side * (4 + Math.random() * 6),
        this.y - 3,
        3 + Math.random() * 2,
        0xffffff, 0.7
      ).setDepth(15);
      this.scene.tweens.add({
        targets: dust,
        x: dust.x + side * (16 + Math.random() * 14),
        y: dust.y - 4 - Math.random() * 4,
        alpha: 0,
        scale: 0.2,
        duration: 360,
        ease: "Quad.easeOut",
        onComplete: () => dust.destroy(),
      });
    }
  }

  spawnDoubleJumpFlair() {
    // Small puff ring at the player's feet to signal the air-jump.
    if (!this.scene || !this.scene.add) return;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dx = Math.cos(angle) * 4;
      const dy = Math.sin(angle) * 4;
      const ring = this.scene.add.circle(this.x + dx, this.y - 6 + dy, 4, 0xffffff, 0.9)
        .setDepth(15);
      this.scene.tweens.add({
        targets: ring,
        x: ring.x + Math.cos(angle) * 36,
        y: ring.y + Math.sin(angle) * 36,
        alpha: 0,
        scale: 0,
        duration: 400,
        ease: "Quad.easeOut",
        onComplete: () => ring.destroy(),
      });
    }
  }

  preUpdate(time, dt) {
    super.preUpdate(time, dt);

    // Expire signals.
    for (const k of Object.keys(this.signals)) {
      if (this.signals[k] && this.signals[k] <= time) {
        this.signals[k] = 0;
        if (k === "growth") {
          this.scene.tweens.add({ targets: this, scale: PLAYER.spriteScale, duration: 200 });
        }
        this.scene.events.emit("signal-broken", k);
      }
    }

    // Hurt-stun lockout: keep knockback velocity, no input.
    if (time < this._hurtUntil) {
      this.setAlpha(0.55);
      this.applyState("hurt");
      return;
    }

    // i-frame flicker — only AFTER an actual hit, not at level spawn.
    // Use a slow sine fade (not on/off blink) so it reads as "phasing", not glitch.
    if (time < this._invulnUntil && time > this._spawnGraceUntil) {
      const phase = (time % 360) / 360; // 0..1 every 360ms
      this.setAlpha(0.55 + 0.45 * Math.abs(Math.sin(phase * Math.PI)));
    } else {
      this.setAlpha(1);
    }

    const grounded = this.body.blocked.down || this.body.touching.down;
    const wasAirborne = !this._wasGrounded;
    if (grounded) {
      this._lastGroundedAt = time;
      if (this.body.velocity.y >= 0) {
        this._isJumping = false;
        this._jumpsRemaining = PHYSICS.maxJumps ?? 2;
      }
      // Landing puff: when going from airborne to grounded with a real fall.
      if (wasAirborne && this._lastFallSpeed > 240) {
        this.spawnLandingDust();
      }
      this._lastFallSpeed = 0;
    } else {
      this._lastFallSpeed = Math.max(this._lastFallSpeed ?? 0, this.body.velocity.y);
    }
    this._wasGrounded = grounded;

    // ---- INPUT ----
    const left = this._cursors.left.isDown || this._keys.A.isDown;
    const right = this._cursors.right.isDown || this._keys.D.isDown;
    const down = this._cursors.down.isDown || this._keys.S.isDown;
    const running = this._cursors.shift.isDown || this._keys.SHIFT.isDown;
    const jumpJustPressed =
      Phaser.Input.Keyboard.JustDown(this._cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this._cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this._keys.W) ||
      Phaser.Input.Keyboard.JustDown(this._keys.SPACE);
    const jumpHeld = this._cursors.space.isDown || this._cursors.up.isDown ||
                     this._keys.W.isDown || this._keys.SPACE.isDown;
    const jumpJustReleased =
      Phaser.Input.Keyboard.JustUp(this._cursors.space) ||
      Phaser.Input.Keyboard.JustUp(this._cursors.up) ||
      Phaser.Input.Keyboard.JustUp(this._keys.W) ||
      Phaser.Input.Keyboard.JustUp(this._keys.SPACE);

    if (jumpJustPressed) this._jumpRequestedAt = time;

    // ---- HORIZONTAL: acceleration + drag ----
    const speedCap = (running ? PHYSICS.runSpeed : PHYSICS.walkSpeed) *
      (this.hasSignal("speed") ? 1.45 : 1);

    let intendedDir = 0;
    if (left && !right) intendedDir = -1;
    else if (right && !left) intendedDir = 1;

    const crouching = down && grounded;
    const dtSec = dt / 1000;
    const vx = this.body.velocity.x;

    if (intendedDir !== 0 && !crouching) {
      this.facing = intendedDir;
      this.setFlipX(intendedDir < 0);
      const target = intendedDir * speedCap;
      const accel = (Math.sign(vx) === intendedDir || vx === 0)
        ? (grounded ? PHYSICS.groundAccel : PHYSICS.airAccel)
        : (grounded ? PHYSICS.groundDecel : PHYSICS.airDecel); // reversing → faster
      const newVx = Phaser.Math.Linear(vx, target, Math.min(1, accel * dtSec / Math.max(1, Math.abs(target - vx))));
      this.setVelocityX(Phaser.Math.Clamp(newVx, -speedCap, speedCap));
    } else {
      // Drag toward zero.
      const decel = (grounded ? PHYSICS.groundDecel : PHYSICS.airDecel);
      const step = decel * dtSec;
      let newVx = vx;
      if (Math.abs(vx) <= step) newVx = 0;
      else newVx = vx - Math.sign(vx) * step;
      this.setVelocityX(newVx);
    }

    // ---- JUMP: press to launch, release-before-apex shortens it ----
    // First jump uses coyote time. Subsequent jumps (double-jump) consume a
    // remaining-jump slot regardless of grounding.
    const canCoyote = (time - this._lastGroundedAt) <= PHYSICS.coyoteTime;
    const buffered = (time - this._jumpRequestedAt) <= PHYSICS.jumpBuffer;
    const max = PHYSICS.maxJumps ?? 2;
    const isFirstJump = this._jumpsRemaining === max;

    let didJump = false;
    if (buffered && isFirstJump && canCoyote && !this._isJumping) {
      this.setVelocityY(PHYSICS.jumpVelocity);
      this._jumpsRemaining -= 1;
      didJump = true;
    } else if (buffered && !isFirstJump && this._jumpsRemaining > 0 && !grounded) {
      // Double-jump (or third, if max > 2). Slightly weaker so it reads as a
      // distinct mid-air boost rather than a second full jump.
      this.setVelocityY(PHYSICS.doubleJumpVelocity ?? PHYSICS.jumpVelocity);
      this._jumpsRemaining -= 1;
      didJump = true;
      this.spawnDoubleJumpFlair();
    }
    if (didJump) {
      this._jumpRequestedAt = -Infinity;
      this._lastGroundedAt = -Infinity;
      this._isJumping = true;
      SFX.jump();
    }

    // Cut-on-release for variable height: if mid-rise and player let go of jump,
    // clamp upward velocity to short-hop max.
    if (this._isJumping && !jumpHeld && this.body.velocity.y < PHYSICS.shortHopVelocityCap) {
      this.setVelocityY(PHYSICS.shortHopVelocityCap);
    }
    if (jumpJustReleased && this._isJumping && this.body.velocity.y < PHYSICS.shortHopVelocityCap) {
      this.setVelocityY(PHYSICS.shortHopVelocityCap);
    }

    // ---- STATE / TEXTURE ----
    // Input-driven (not velocity-driven) so the animation doesn't flicker
    // when velocity hovers near a threshold. Skid only triggers when there's
    // both intent to reverse AND meaningful inertia in the wrong direction.
    let next = "idle";
    if (!grounded) {
      next = this.body.velocity.y < -40 ? "jump" : "fall";
    } else if (crouching) {
      next = "crouch";
    } else if (intendedDir !== 0) {
      const reversing = Math.sign(this.body.velocity.x) !== 0 &&
                        Math.sign(this.body.velocity.x) !== intendedDir;
      const fastEnoughToSkid = Math.abs(this.body.velocity.x) > 200;
      next = (reversing && fastEnoughToSkid) ? "skid" : (running ? "run" : "walk");
    } else {
      next = "idle";
    }
    this.applyState(next);
  }

  applyState(s) {
    if (this.state === s) return;
    this.state = s;
    switch (s) {
      case "idle":      this.anims.stop(); this.setTexture("idle"); break;
      case "walk":      this.anims.play("walk", true); break;
      case "run":       this.anims.play("run", true); break;
      case "jump":      this.anims.stop(); this.setTexture("jump"); break;
      case "fall":      this.anims.stop(); this.setTexture("fall"); break;
      case "skid":      this.anims.stop(); this.setTexture("skid"); break;
      case "crouch":    this.anims.stop(); this.setTexture("crouch"); break;
      case "hurt":      this.anims.stop(); this.setTexture("hurt"); break;
      case "celebrate": this.anims.stop(); this.setTexture("celebrate"); break;
    }
  }

  celebrate() {
    this.applyState("celebrate");
    this.body.enable = false;
  }
}
