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
import { TOUCH } from "../touchControls.js";
import { ATTACKS, tickFollowingHitboxes, poundImpactVFX } from "./PlayerAttacks.js";
import { ATTACK_TUNING, getCharacter } from "../characters.js";

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, character = null) {
    // Default to Swiirl if no character was selected (e.g. dev shortcut into Game).
    const ch = character ?? getCharacter("swiirl");
    super(scene, x, y, "idle");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Character config — tint + per-character physics + combat style.
    this.character = ch;
    if (ch.color && ch.color !== 0xffffff) this.setTint(ch.color);
    const cphys = ch.physics ?? {};
    this._charJumpMul = cphys.jumpVelocityMul ?? 1;
    this._charRunMul  = cphys.runSpeedMul ?? 1;
    this._charMagnetMul = cphys.magnetRadiusMul ?? 1;
    this._autoShieldAvailable = !!cphys.autoShieldPerLife;

    // Attack state.
    this._attackCooldownUntil = 0;
    this._attackUntil = 0;            // window where the attack-pose frame shows
    this._heavyCharging = false;       // Spark's hold-charge state
    this._heavyChargeStart = 0;
    this._bashEndAt = 0;               // Guardian's dash end timestamp
    this._pendingPound = false;        // Bruiser slam → land shockwave on next ground touch

    // Sprites are 280x320 with the character pose anchored bottom-center.
    // Origin (0.5, 1.0) means player.y === character feet world y.
    this.setOrigin(0.5, 1.0);
    this.setScale(PLAYER.spriteScale);
    this.body.setSize(PLAYER.hitbox.width, PLAYER.hitbox.height, false);
    this.body.setOffset(PLAYER.hitbox.offsetX, PLAYER.hitbox.offsetY);
    this.setCollideWorldBounds(true);
    this.setMaxVelocity(PHYSICS.runSpeed * 1.6 * this._charRunMul, 1500);

    this.lives = cphys.startLives ?? PLAYER.startLives;
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

    this._sliding    = false;
    this._slideEndAt = 0;

    // "wow" hooks — idle entertainer + run trail.
    this._idleTimer = 0;
    this._entertainerActive = false;
    this._trailTimer = 0;
    this._prevState = "idle";

    this._cursors = scene.input.keyboard.createCursorKeys();
    this._keys = scene.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      SHIFT: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      J: Phaser.Input.Keyboard.KeyCodes.J,
      K: Phaser.Input.Keyboard.KeyCodes.K,
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
    this.scene.game.events.emit("signal-active", kind, dur);
  }

  hasSignal(kind) {
    return (this.signals[kind] ?? 0) > this.scene.time.now;
  }

  takeDamage(fromX) {
    const now = this.scene.time.now;
    if (now < this._invulnUntil) return false;

    if (this.hasSignal("shield")) {
      this.signals.shield = 0;
      this.scene.game.events.emit("signal-broken", "shield");
      this.flash(0x7dc4ff);
      this._invulnUntil = now + 600;
      return false;
    }
    if (this.hasSignal("growth")) {
      this.signals.growth = 0;
      this.scene.game.events.emit("signal-broken", "growth");
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
    this.scene.game.events.emit("player-hurt", this.lives);
    if (this.lives <= 0) {
      this.scene.game.events.emit("player-died");
    }
    return true;
  }

  flash(color) {
    if (!this.scene) return;
    this.setTint(color);
    this.scene.time.delayedCall(150, () => this.clearTint());
  }

  collectInsight(amount = 1) {
    const prev = this.insights;
    this.insights += amount;
    // Audio is played by Game.js (combo-aware via SFX.collectAt). No SFX here.
    // Award an extra life when crossing a multiple of insightToLife.
    const threshold = PLAYER.insightToLife;
    if (Math.floor(this.insights / threshold) > Math.floor(prev / threshold)) {
      this.lives += 1;
      this.scene.game.events.emit("life-gained", this.lives);
    }
    this.scene.game.events.emit("insight-changed", this.insights);
  }

  bounceOnEnemy() {
    this.setVelocityY(-540);
    this._isJumping = true;
    // Bouncing on an enemy refunds your jumps so you can chain stomps.
    this._jumpsRemaining = PHYSICS.maxJumps ?? 2;
    // Audio is played by Game.js (combo-aware via SFX.stompAt).
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
        this.scene.game.events.emit("signal-broken", k);
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
        this.scene.effects?.squashAndStretch(this, "land");
        this.scene.effects?.dustPuff(this.x, this.y - 2, { color: 0xb892e0, count: 5, ms: 320 });
      }
      this._lastFallSpeed = 0;
    } else {
      this._lastFallSpeed = Math.max(this._lastFallSpeed ?? 0, this.body.velocity.y);
    }
    this._wasGrounded = grounded;

    // ---- INPUT ----
    const left    = this._cursors.left.isDown  || this._keys.A.isDown || TOUCH.left;
    const right   = this._cursors.right.isDown || this._keys.D.isDown || TOUCH.right;
    const down    = this._cursors.down.isDown  || this._keys.S.isDown;
    const downJustPressed =
      Phaser.Input.Keyboard.JustDown(this._cursors.down) ||
      Phaser.Input.Keyboard.JustDown(this._keys.S);
    // Touch always runs (no Shift key on mobile).
    const running = this._cursors.shift.isDown || this._keys.SHIFT.isDown || (TOUCH.left || TOUCH.right);
    const jumpJustPressed =
      Phaser.Input.Keyboard.JustDown(this._cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this._cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this._keys.W) ||
      Phaser.Input.Keyboard.JustDown(this._keys.SPACE) ||
      TOUCH.jumpJustDown;
    const jumpHeld = this._cursors.space.isDown || this._cursors.up.isDown ||
                     this._keys.W.isDown || this._keys.SPACE.isDown ||
                     TOUCH.jumpDown;
    const jumpJustReleased =
      Phaser.Input.Keyboard.JustUp(this._cursors.space) ||
      Phaser.Input.Keyboard.JustUp(this._cursors.up) ||
      Phaser.Input.Keyboard.JustUp(this._keys.W) ||
      Phaser.Input.Keyboard.JustUp(this._keys.SPACE);

    // Consume touch jump-just-down after reading so it fires for exactly one frame.
    if (TOUCH.jumpJustDown) TOUCH.jumpJustDown = false;

    if (jumpJustPressed) this._jumpRequestedAt = time;

    // ---- ATTACK INPUT ----
    const attackJustPressed =
      Phaser.Input.Keyboard.JustDown(this._keys.J) ||
      TOUCH.attackJustDown;
    const attackHeld = this._keys.J.isDown || TOUCH.attackDown;
    const attackJustReleased = Phaser.Input.Keyboard.JustUp(this._keys.J);
    if (TOUCH.attackJustDown) TOUCH.attackJustDown = false;

    this.tryAttack(time, attackJustPressed, attackHeld, attackJustReleased);

    // Keep Guardian's bash hitboxes glued to the player while the dash is live.
    if (this.scene.playerAttacks) tickFollowingHitboxes(this.scene);

    // Bruiser ground-pound: detect landing while a slam is queued.
    if (this._pendingPound && (this.body.blocked.down || this.body.touching.down)) {
      this._pendingPound = false;
      this._spawnPoundShockwave();
    }

    // ---- HORIZONTAL: acceleration + drag ----
    const speedCap = (running ? PHYSICS.runSpeed : PHYSICS.walkSpeed) *
      this._charRunMul *
      (this.hasSignal("speed") ? 1.45 : 1);

    let intendedDir = 0;
    if (left && !right) intendedDir = -1;
    else if (right && !left) intendedDir = 1;

    const crouching = down && grounded;
    const dtSec = dt / 1000;
    const vx = this.body.velocity.x;

    // ---- SLIDE ----
    const slideThreshold = PHYSICS.walkSpeed * 0.65;
    if (!this._sliding && grounded && downJustPressed && running &&
        Math.abs(vx) > slideThreshold) {
      this._sliding = true;
      this._slideEndAt = time + PHYSICS.slideDuration;
      this.body.setSize(PLAYER.slideHitbox.width, PLAYER.slideHitbox.height);
      this.body.setOffset(PLAYER.slideHitbox.offsetX, PLAYER.slideHitbox.offsetY);
    }

    // Slide-jump: cancel slide and launch.
    if (this._sliding && jumpJustPressed) {
      this._sliding = false;
      this._restoreHitbox();
      this.setVelocityY(PHYSICS.jumpVelocity * this._charJumpMul);
      this._jumpsRemaining -= 1;
      this._isJumping = true;
      this._jumpRequestedAt = -Infinity;
      this._lastGroundedAt  = -Infinity;
      SFX.jump();
    }

    // Slide expiry or left ground.
    if (this._sliding && (time >= this._slideEndAt || !grounded)) {
      this._sliding = false;
      this._restoreHitbox();
    }

    // Slide deceleration (replaces normal horizontal movement while sliding).
    if (this._sliding) {
      const step = PHYSICS.slideDecel * dtSec;
      const vx2  = this.body.velocity.x;
      this.setVelocityX(Math.abs(vx2) <= step ? 0 : vx2 - Math.sign(vx2) * step);
    }

    if (!this._sliding) {
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
    } // end !this._sliding

    // ---- JUMP: press to launch, release-before-apex shortens it ----
    // First jump uses coyote time. Subsequent jumps (double-jump) consume a
    // remaining-jump slot regardless of grounding.
    const canCoyote = (time - this._lastGroundedAt) <= PHYSICS.coyoteTime;
    const buffered = (time - this._jumpRequestedAt) <= PHYSICS.jumpBuffer;
    const max = PHYSICS.maxJumps ?? 2;
    const isFirstJump = this._jumpsRemaining === max;

    let didJump = false;
    if (buffered && isFirstJump && canCoyote && !this._isJumping) {
      this.setVelocityY(PHYSICS.jumpVelocity * this._charJumpMul);
      this._jumpsRemaining -= 1;
      didJump = true;
    } else if (buffered && !isFirstJump && this._jumpsRemaining > 0 && !grounded) {
      // Double-jump (or third, if max > 2). Slightly weaker so it reads as a
      // distinct mid-air boost rather than a second full jump.
      this.setVelocityY((PHYSICS.doubleJumpVelocity ?? PHYSICS.jumpVelocity) * this._charJumpMul);
      this._jumpsRemaining -= 1;
      didJump = true;
      this.spawnDoubleJumpFlair();
    }
    if (didJump) {
      this._jumpRequestedAt = -Infinity;
      this._lastGroundedAt = -Infinity;
      this._isJumping = true;
      SFX.jump();
      this.scene.effects?.squashAndStretch(this, "jump");
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
    if (this._sliding) {
      next = "slide";
    } else if (!grounded) {
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

    // Run trail: faint dust puffs at high speed.
    if (grounded && Math.abs(this.body.velocity.x) > PHYSICS.runSpeed * 0.85) {
      this._trailTimer += dt;
      if (this._trailTimer >= 90) {
        this._trailTimer = 0;
        this.scene.effects?.dustPuff(this.x - this.facing * 6, this.y - 4, {
          color: 0xdcc7f2, count: 2, scale: 0.4, ms: 260,
        });
      }
    } else {
      this._trailTimer = 0;
    }

    // Idle entertainer: subtle stretch animation after 3s of idle.
    if (next === "idle" && grounded && !this._sliding) {
      this._idleTimer += dt;
      if (this._idleTimer > 3000 && !this._entertainerActive) {
        this._entertainerActive = true;
        const baseScale = PLAYER.spriteScale;
        this.scene.tweens.add({
          targets: this,
          scaleX: baseScale * 1.06,
          scaleY: baseScale * 0.94,
          duration: 320,
          yoyo: true,
          repeat: 1,
          ease: "Sine.easeInOut",
          onComplete: () => {
            this.scaleX = baseScale;
            this.scaleY = baseScale;
            this._entertainerActive = false;
            this._idleTimer = 0;
          },
        });
      }
    } else {
      this._idleTimer = 0;
    }

    this.applyState(next);
    this._prevState = next;
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
      case "slide":     this.anims.stop(); this.setTexture("crouch"); break;
      case "hurt":      this.anims.stop(); this.setTexture("hurt"); break;
      case "celebrate": this.anims.stop(); this.setTexture("celebrate"); break;
    }
  }

  // ----- COMBAT -----
  tryAttack(time, justPressed, held, justReleased) {
    if (time < this._hurtUntil) return;
    if (this._sliding) return;
    const style = this.character?.attack;
    if (!style) return;

    // Spark's chain has a hold-charge for the heavy variant.
    if (style === "chain") {
      if (justPressed) {
        this._heavyCharging = true;
        this._heavyChargeStart = time;
        return; // wait for release; tapping triggers light on release
      }
      if (justReleased && this._heavyCharging) {
        if (time < this._attackCooldownUntil) {
          this._heavyCharging = false;
          return;
        }
        const cd = ATTACKS.chain(this, time);
        this._attackCooldownUntil = time + cd;
        this.scene.game.events.emit("attack-cooldown", { duration: cd });
        return;
      }
      return;
    }

    if (!justPressed) return;
    if (time < this._attackCooldownUntil) return;
    const fn = ATTACKS[style];
    if (!fn) return;
    const cd = fn(this, time);
    this._attackCooldownUntil = time + cd;
    this.scene.game.events.emit("attack-cooldown", { duration: cd });
  }

  _spawnPoundShockwave() {
    const t = ATTACK_TUNING.groundPound;
    const scene = this.scene;
    // Camera + freeze frame so the impact reads.
    scene.cameras.main.shake(180, 0.012);
    scene.effects?.freezeFrame?.(70);
    scene.effects?.dustPuff?.(this.x, this.y - 4, { color: 0xff6b6b, count: 12, scale: 1.0, ms: 420 });
    // Cracks + dust ring at impact for visible feedback.
    poundImpactVFX(scene, this.x, this.y - 4, t.shockwaveRange);
    // Two hitboxes, one each side, so the wave damages enemies in a range.
    this._spawnPoundHitbox(-1, t);
    this._spawnPoundHitbox( 1, t);
    SFX.attackPoundLand?.();
  }
  _spawnPoundHitbox(dir, t) {
    const scene = this.scene;
    const rect = scene.add.rectangle(this.x + dir * (t.shockwaveRange / 2), this.y - 30,
      t.shockwaveRange, 50, 0xff6b6b, 0);
    scene.physics.add.existing(rect);
    rect.body.setAllowGravity(false);
    rect.body.setImmovable(true);
    rect.damage = t.damage;
    rect.knockbackX = 280;
    rect.pierce = true;
    rect.friendly = true;
    // Use the per-pound shared id so both side waves count as one strike per target.
    rect.attackId = this._poundInstanceId ?? "ground_pound";
    scene.playerAttacks.add(rect);
    // Visual: expanding crescent on each side.
    const vis = scene.add.rectangle(this.x + dir * 24, this.y - 8, 12, 6, 0xff8866, 0.85);
    scene.tweens.add({
      targets: vis,
      x: vis.x + dir * t.shockwaveRange,
      scaleX: 6, scaleY: 3, alpha: 0,
      duration: 320, ease: "Quad.easeOut",
      onComplete: () => vis.destroy(),
    });
    scene.time.delayedCall(160, () => rect.active && rect.destroy());
  }

  // Called by overlap handlers in Game.js when an attack lands on an enemy or
  // a projectile is parried.
  onAttackConfirm(targetX) {
    if (!this.scene) return;
    this.scene.effects?.punchZoom?.(0.03, 140);
    this.scene.effects?.freezeFrame?.(45);
    // A small bump back so attacks feel weighty — only for ground-based melee.
    if (this.body?.blocked?.down || this.body?.touching?.down) {
      const dir = Math.sign(this.x - targetX) || -this.facing;
      this.setVelocityX(this.body.velocity.x + dir * 60);
    }
  }

  celebrate() {
    this.applyState("celebrate");
    this.body.enable = false;
  }

  _restoreHitbox() {
    this.body.setSize(PLAYER.hitbox.width, PLAYER.hitbox.height);
    this.body.setOffset(PLAYER.hitbox.offsetX, PLAYER.hitbox.offsetY);
  }
}
