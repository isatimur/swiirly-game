// All enemy classes for Community Park. Each enemy:
//   - has a body that can be stomped (player hits its head from above)
//   - hurts the player on side contact
//   - on stomp: dies (or, for the boss: takes a hit)

import { SFX } from "../audio.js";

class EnemyBase extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.health = 1;
    this.dead = false;
    this.scoreValue = 1;
    // Per-attack cooldown so a pierced attack hitbox doesn't tick damage every
    // frame on the same enemy.
    this._lastHitByAttackAt = new Map();
  }

  defeat() {
    if (this.dead) return;
    this.dead = true;
    this.body.enable = false;
    this.scene.tweens.add({
      targets: this,
      angle: 180,
      y: this.y + 80,
      alpha: 0,
      duration: 600,
      ease: "Quad.easeIn",
      onComplete: () => this.destroy(),
    });
  }

  // Damage from a player attack hitbox (melee swipe, projectile, shockwave).
  // Returns one of: null (no-op / dedupe'd / dead), "hit", or "killed".
  // Callers check truthiness before firing VFX so piercing hitboxes don't
  // spam side-effects every frame.
  takePlayerHit(damage = 1, fromX = this.x, attackId = "generic") {
    if (this.dead) return null;
    // Dedupe per-(attack-instance, target) within 200ms — keeps pierce/multi-
    // hitboxes from chunking the same enemy in one frame.
    const now = this.scene.time.now;
    const last = this._lastHitByAttackAt.get(attackId) ?? -Infinity;
    if (now - last < 200) return null;
    this._lastHitByAttackAt.set(attackId, now);

    this.health -= damage;
    this.setTint(0xff5c5c);
    this.scene.time.delayedCall(90, () => { if (this.active) this.clearTint(); });
    const dir = Math.sign(this.x - fromX) || 1;
    if (this.body && this.body.velocity) {
      this.body.velocity.x = dir * 180;
      this.body.velocity.y = Math.min(this.body.velocity.y, -120);
    }
    if (this.health <= 0) {
      this.defeat();
      return "killed";
    }
    return "hit";
  }
}

export class JargonBlob extends EnemyBase {
  constructor(scene, x, y, range = 120) {
    super(scene, x, y, "enemy_jargon_blob");
    // Sprite 80x64, origin (0.5, 1). Trimmed hitbox keeps collision fair and
    // leaves headroom so the player can just-barely jump over from ground.
    this.body.setSize(52, 36).setOffset(14, 28);
    this.setVelocityX(-60);
    this.minX = x - range;
    this.maxX = x + range;
    this.body.setMaxVelocity(120, 1400);
  }

  preUpdate(time, dt) {
    super.preUpdate(time, dt);
    if (this.dead) return;
    if (this.x < this.minX) {
      this.setVelocityX(60);
      this.setFlipX(true);
    } else if (this.x > this.maxX) {
      this.setVelocityX(-60);
      this.setFlipX(false);
    }
    // Reverse if blocked by a wall.
    if (this.body.blocked.left) { this.setVelocityX(60); this.setFlipX(true); }
    if (this.body.blocked.right) { this.setVelocityX(-60); this.setFlipX(false); }
  }
}

export class GutFeelGhost extends EnemyBase {
  constructor(scene, x, y, range = 80) {
    super(scene, x, y, "enemy_ghost");
    // Sprite 64x80. Trimmed hitbox so player can hop over from below.
    this.body.setSize(40, 48).setOffset(12, 32);
    this.body.setAllowGravity(false);
    this.startX = x;
    this.startY = y;
    this.range = range;
    this.t = Math.random() * Math.PI * 2;
    this.driftDir = Math.random() < 0.5 ? -1 : 1;

    // Drive bob/drift via tweens so we don't fight the physics step.
    scene.tweens.add({
      targets: this,
      y: y - 28,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: Math.random() * 800,
    });
  }

  preUpdate(time, dt) {
    super.preUpdate(time, dt);
    if (this.dead) return;
    // Horizontal drift only — the bob is handled by the tween above.
    this.x += this.driftDir * (dt / 1000) * 30;
    if (this.x > this.startX + this.range) this.driftDir = -1;
    if (this.x < this.startX - this.range) this.driftDir = 1;
    this.setFlipX(this.driftDir < 0);
  }
}

export class PaperworkPile extends EnemyBase {
  constructor(scene, x, y, projectileGroup) {
    super(scene, x, y, "enemy_paperwork");
    // Sprite 80x80. Body bottom-aligned: top y=20, bottom y=80.
    this.body.setSize(60, 60).setOffset(10, 20);
    this.body.setImmovable(true);
    this.body.setAllowGravity(false);
    this.projectileGroup = projectileGroup;
    this.nextFireAt = scene.time.now + 1800;
  }

  preUpdate(time, dt) {
    super.preUpdate(time, dt);
    if (this.dead) return;
    if (time > this.nextFireAt) {
      this.fire();
      this.nextFireAt = time + 2400;
    }
  }

  fire() {
    if (!this.projectileGroup) return;
    const p = this.projectileGroup.create(this.x - 28, this.y - 50, "projectile_paper");
    p.setVelocityX(-180);
    p.setVelocityY(-220);
    p.body.setAllowGravity(true);
    p.body.setSize(28, 16);
    this.scene.tweens.add({ targets: p, angle: 360, duration: 800, repeat: -1 });
    this.scene.time.delayedCall(4000, () => p.destroy());
  }
}

// Base class for all bosses. Provides common patrol + stomp-damage behavior.
// Subclasses override preUpdate to add unique attack patterns.
export class BossBase extends EnemyBase {
  constructor(scene, x, y, health = 3, texture = "enemy_boss") {
    super(scene, x, y, texture);
    this.setScale(1.05);
    // Sprite 120x140. Body 80x110, bottom-aligned.
    this.body.setSize(80, 110).setOffset(20, 30);
    this.body.setMaxVelocity(180, 1400);
    this.health = health;
    this.maxHealth = health;
    this.scoreValue = 0;
    this.facing = -1;
    this.setVelocityX(-90);
    this.startX = x;
    this.lastJumpAt = 0;
    this.lastAttackAt = 0;
    this.displayName = "INCOMPETENCE MANAGER";
    this.bossTint = 0xffffff;
  }

  applyVisualTint() {
    if (this.bossTint !== 0xffffff) this.setTint(this.bossTint);
  }

  preUpdate(time, dt) {
    super.preUpdate(time, dt);
    if (this.dead) return;
    this.basePatrol(time);
  }

  /** Walk back-and-forth within ±220 of spawn, occasional jump. */
  basePatrol(time) {
    if (this.x < this.startX - 220) { this.facing = 1; this.setFlipX(false); }
    if (this.x > this.startX + 220) { this.facing = -1; this.setFlipX(true); }
    this.setVelocityX(this.facing * 100);
    if ((this.body.blocked.down || this.body.touching.down) && time - this.lastJumpAt > 2200) {
      this.setVelocityY(-540);
      this.lastJumpAt = time;
    }
  }

  /** Brief red telegraph flash before a special attack. */
  telegraph(ms = 320) {
    this.setTint(0xff5c5c);
    this.scene.time.delayedCall(ms, () => {
      if (this.bossTint !== 0xffffff) this.setTint(this.bossTint);
      else this.clearTint();
    });
  }

  /** Throws an arcing projectile toward (tx, ty). */
  throwClipboard(tx, ty, opts = {}) {
    const projGroup = this.scene.projectiles;
    if (!projGroup) return;
    const p = projGroup.create(this.x, this.y - 90, "projectile_paper");
    if (opts.tint) p.setTint(opts.tint);
    const dx = tx - this.x;
    p.setVelocityX(Phaser.Math.Clamp(dx * 1.4, -340, 340));
    p.setVelocityY(-340);
    p.body.setAllowGravity(true);
    p.body.setSize(28, 16);
    this.scene.tweens.add({ targets: p, angle: 360, duration: 700, repeat: -1 });
    this.scene.time.delayedCall(3500, () => { if (p.active) p.destroy(); });
  }

  /** Spawns a JargonBlob that fades in next to the boss. */
  summonJargonBlob() {
    if (!this.scene.enemies) return;
    const blob = new JargonBlob(this.scene, this.x, this.y, 60);
    blob.setAlpha(0).setScale(0);
    this.scene.enemies.add(blob);
    if (this.scene.platforms) this.scene.physics.add.collider(blob, this.scene.platforms);
    this.scene.tweens.add({ targets: blob, alpha: 1, scale: 1, duration: 240, ease: "Back.easeOut" });
    this.scene.effects?.sparkleBurst(this.x, this.y - 40, 14, 0xb892e0);
  }

  /** Fires N projectiles in a fan toward (tx, ty). */
  fireProjectileFan(tx, ty, count = 5, spread = 0.18, speed = 240, tint = 0xffffff) {
    const projGroup = this.scene.projectiles;
    if (!projGroup) return;
    const baseAngle = Math.atan2(ty - this.y, tx - this.x);
    const half = (count - 1) / 2;
    for (let i = 0; i < count; i++) {
      const a = baseAngle + (i - half) * spread;
      const p = projGroup.create(this.x, this.y - 50, "projectile_paper");
      p.setTint(tint);
      p.setVelocityX(Math.cos(a) * speed);
      p.setVelocityY(Math.sin(a) * speed);
      p.body.setAllowGravity(false);
      p.body.setSize(20, 12);
      this.scene.tweens.add({ targets: p, angle: 360, duration: 500, repeat: -1 });
      this.scene.time.delayedCall(3500, () => { if (p.active) p.destroy(); });
    }
  }

  // Player melee/projectile damage path for bosses. Mirrors takeStompHit but
  // dedupes per attack instance so a pierce attack doesn't drain the bar.
  // Returns null (dedupe'd / dead), "hit" (alive), or "killed".
  takePlayerHit(damage = 1, fromX = this.x, attackId = "generic") {
    if (this.dead) return null;
    const now = this.scene.time.now;
    const last = this._lastHitByAttackAt.get(attackId) ?? -Infinity;
    if (now - last < 250) return null;
    this._lastHitByAttackAt.set(attackId, now);
    this.health -= damage;
    SFX.bossHit();
    this.scene.cameras.main.shake(160, 0.006);
    this.setTint(0xff5c5c);
    this.scene.time.delayedCall(120, () => {
      if (!this.active) return;
      if (this.bossTint !== 0xffffff) this.setTint(this.bossTint);
      else this.clearTint();
    });
    this.scene.game.events.emit("boss-health", { current: this.health, max: this.maxHealth });
    if (this.health <= 0) {
      this.scene.game.events.emit("boss-defeated", { x: this.x, y: this.y });
      this.defeat();
      return "killed";
    }
    return "hit";
  }

  takeStompHit() {
    if (this.dead) return false;
    this.health -= 1;
    SFX.bossHit();
    this.scene.cameras.main.shake(180, 0.008);
    this.scene.tweens.add({
      targets: this,
      tint: 0xff5c5c,
      duration: 100,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        if (this.bossTint !== 0xffffff) this.setTint(this.bossTint);
        else this.clearTint();
      },
    });
    this.scene.game.events.emit("boss-health", { current: this.health, max: this.maxHealth });
    if (this.health <= 0) {
      this.scene.game.events.emit("boss-defeated", { x: this.x, y: this.y });
      this.defeat();
      return true;
    }
    return false;
  }
}

// L1 — Hot-Take Hank: throws clipboards in arcs every 2.4s.
export class HotTakeHank extends BossBase {
  constructor(scene, x, y, health = 3) {
    super(scene, x, y, health, "enemy_boss_l1");
    this.displayName = "HOT-TAKE HANK";
    this.attackInterval = 2400;
  }
  preUpdate(time, dt) {
    super.preUpdate(time, dt);
    if (this.dead) return;
    if (time - this.lastAttackAt > this.attackInterval) {
      this.lastAttackAt = time;
      this.telegraph(220);
      this.scene.time.delayedCall(220, () => {
        if (this.dead) return;
        const p = this.scene.player;
        if (p) this.throwClipboard(p.x, p.y);
      });
    }
  }
}

// L2 — Middle Manager Mike: summons JargonBlobs every ~4s.
export class ManagerMike extends BossBase {
  constructor(scene, x, y, health = 4) {
    super(scene, x, y, health, "enemy_boss_l2");
    this.displayName = "MIDDLE MANAGER MIKE";
    this.summonInterval = 4200;
  }
  preUpdate(time, dt) {
    super.preUpdate(time, dt);
    if (this.dead) return;
    if (time - this.lastAttackAt > this.summonInterval) {
      this.lastAttackAt = time;
      this.telegraph(280);
      this.scene.time.delayedCall(280, () => {
        if (!this.dead) this.summonJargonBlob();
      });
    }
  }
}

// L3 — VP of Vibes: high-speed dash attack with telegraph.
export class VPVibes extends BossBase {
  constructor(scene, x, y, health = 5) {
    super(scene, x, y, health, "enemy_boss_l3");
    this.displayName = "VP OF VIBES";
    this.dashInterval = 3500;
    this.dashing = false;
    this.dashEndAt = 0;
  }
  preUpdate(time, dt) {
    EnemyBase.prototype.preUpdate.call(this, time, dt);
    if (this.dead) return;
    if (this.dashing) {
      if (time >= this.dashEndAt) this.dashing = false;
      return; // hold dash velocity, skip patrol logic
    }
    this.basePatrol(time);
    if (time - this.lastAttackAt > this.dashInterval) {
      this.lastAttackAt = time;
      this.telegraph(420);
      const player = this.scene.player;
      const dir = player ? (Math.sign(player.x - this.x) || 1) : 1;
      this.scene.time.delayedCall(420, () => {
        if (this.dead) return;
        this.dashing = true;
        this.dashEndAt = this.scene.time.now + 600;
        this.setVelocityX(dir * 480);
        this.setFlipX(dir < 0);
      });
    }
  }
}

// L4 — The Algorithm: stationary, fires projectile fans every 3.2s.
export class TheAlgorithm extends BossBase {
  constructor(scene, x, y, health = 5) {
    super(scene, x, y, health, "enemy_boss_l4");
    this.displayName = "THE ALGORITHM";
    this.body.setAllowGravity(false);
    this.body.setVelocity(0, 0);
    this.spreadInterval = 3200;
    // Float bob via tween (avoids fighting physics step).
    scene.tweens.add({
      targets: this, y: y - 28,
      duration: 1900, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });
  }
  preUpdate(time, dt) {
    EnemyBase.prototype.preUpdate.call(this, time, dt);
    if (this.dead) return;
    this.setVelocity(0, 0);
    if (time - this.lastAttackAt > this.spreadInterval) {
      this.lastAttackAt = time;
      this.telegraph(280);
      this.scene.time.delayedCall(280, () => {
        if (this.dead) return;
        const p = this.scene.player;
        if (p) this.fireProjectileFan(p.x, p.y, 5, 0.18, 240, 0x40c0e0);
      });
    }
  }
}

// L5 — The CEO: three-phase final boss combining all attack patterns.
export class TheCEO extends BossBase {
  constructor(scene, x, y, health = 8) {
    super(scene, x, y, health, "enemy_boss_l5");
    this.displayName = "THE CEO";
    // CEO keeps phase-based tint shifts (gold → orange → red) — those are
    // an intentional damage-progression cue, not just identification.
    this.summonInterval = 5000;
    this.dashInterval = 4200;
    this.spreadInterval = 3600;
    this.lastSummonAt = 0;
    this.lastDashAt = 0;
    this.lastSpreadAt = 0;
    this.dashing = false;
    this.dashEndAt = 0;
    this._lastPhase = 1;
  }
  get phase() {
    const r = this.health / this.maxHealth;
    if (r > 0.66) return 1;
    if (r > 0.33) return 2;
    return 3;
  }
  preUpdate(time, dt) {
    EnemyBase.prototype.preUpdate.call(this, time, dt);
    if (this.dead) return;

    // Phase transitions: visual punctuation when crossing a threshold.
    const ph = this.phase;
    if (ph !== this._lastPhase) {
      this._lastPhase = ph;
      this.scene.cameras.main.shake(220, 0.01);
      this.scene.effects?.radialFlash(0xffd24a, 0.3, 280);
      // Tint shifts redder per phase.
      this.bossTint = ph === 2 ? 0xd06a40 : (ph === 3 ? 0xff4040 : 0xc0a040);
      this.setTint(this.bossTint);
    }

    if (this.dashing) {
      if (time >= this.dashEndAt) this.dashing = false;
      return;
    }
    this.basePatrol(time);

    // Phase 2+: summon
    if (ph >= 2 && time - this.lastSummonAt > this.summonInterval) {
      this.lastSummonAt = time;
      this.summonJargonBlob();
    }
    // Phase 3: dash + spread
    if (ph >= 3) {
      if (time - this.lastDashAt > this.dashInterval) {
        this.lastDashAt = time;
        this.telegraph(360);
        const player = this.scene.player;
        const dir = player ? (Math.sign(player.x - this.x) || 1) : 1;
        this.scene.time.delayedCall(360, () => {
          if (this.dead) return;
          this.dashing = true;
          this.dashEndAt = this.scene.time.now + 520;
          this.setVelocityX(dir * 440);
          this.setFlipX(dir < 0);
        });
      }
      if (time - this.lastSpreadAt > this.spreadInterval) {
        this.lastSpreadAt = time;
        const p = this.scene.player;
        if (p) this.fireProjectileFan(p.x, p.y, 3, 0.22, 220, 0xffd24a);
      }
    }
  }
}

// Backward-compat alias — old code referenced IncompetenceManager directly.
export const IncompetenceManager = BossBase;

// Factory: pick the right boss subclass for a given level number.
/** THE BOARD — bonus-level mega-boss. Scaled-up CEO with all three phases
 *  active from the start, larger sprite, more HP. Sits in an open arena
 *  at the top of the L6 shaft. */
export class TheBoard extends TheCEO {
  constructor(scene, x, y, health = 14) {
    super(scene, x, y, health);
    this.displayName = "THE BOARD";
    this.setScale((this.scaleX || 1) * 1.6);
    // Tighter attack cadence than the CEO — every phase fires faster.
    this.summonInterval = 3800;
    this.dashInterval   = 3200;
    this.spreadInterval = 2600;
  }
  // All phases active immediately — there's no soft start in a boardroom.
  get phase() {
    const r = this.health / this.maxHealth;
    if (r > 0.66) return 2;  // start at phase 2 (summon + base attacks)
    return 3;                // bottom 2/3 of HP runs the full phase-3 kit
  }
}

export function makeBoss(scene, levelNum, x, y, health) {
  switch (levelNum) {
    case 1: return new HotTakeHank(scene, x, y, health);
    case 2: return new ManagerMike(scene, x, y, health);
    case 3: return new VPVibes(scene, x, y, health);
    case 4: return new TheAlgorithm(scene, x, y, health);
    case 5: return new TheCEO(scene, x, y, health);
    case 6: return new TheBoard(scene, x, y, health);
    default: return new BossBase(scene, x, y, health);
  }
}

export class DeadlineBot extends EnemyBase {
  constructor(scene, x, y, player, range = 80) {
    super(scene, x, y, "enemy_deadline_bot");
    this.body.setSize(56, 52).setOffset(12, 28);
    this.body.setMaxVelocity(200, 1400);
    this.player = player;
    this.patrolMinX = x - range;
    this.patrolMaxX = x + range;
    this.charging = false;
    this._patrolDir = -1;
    this.setVelocityX(-60);
  }

  preUpdate(time, dt) {
    super.preUpdate(time, dt);
    if (this.dead) return;

    const px = this.player?.x ?? Infinity;
    const py = this.player?.y ?? Infinity;
    const dx = px - this.x;
    const horizDist = Math.abs(dx);
    const vertDist  = Math.abs(py - this.y);

    // Hysteresis: enter charge at 300px, exit at 340px (prevents flip-flopping).
    if (!this.charging && horizDist <= 300 && vertDist <= 120) this.charging = true;
    else if (this.charging && horizDist > 340)                 this.charging = false;

    if (this.charging) {
      const dir = Math.sign(dx) || 1;
      this.setVelocityX(dir * 160);
      this.setFlipX(dir < 0);
    } else {
      if (this.x <= this.patrolMinX) { this._patrolDir =  1; }
      if (this.x >= this.patrolMaxX) { this._patrolDir = -1; }
      if (this.body.blocked.left)    { this._patrolDir =  1; }
      if (this.body.blocked.right)   { this._patrolDir = -1; }
      this.setVelocityX(this._patrolDir * 60);
      this.setFlipX(this._patrolDir < 0);
    }
  }
}
