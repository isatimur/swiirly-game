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
}

export class JargonBlob extends EnemyBase {
  constructor(scene, x, y, range = 120) {
    super(scene, x, y, "enemy_jargon_blob");
    // Sprite 80x64, origin (0.5, 1). Body anchored to sprite bottom so the
    // blob actually rests on the ground (body bottom == sprite bottom).
    this.body.setSize(60, 44).setOffset(10, 20);
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
    // Sprite 64x80. Body bottom-aligned to sprite bottom.
    this.body.setSize(48, 60).setOffset(8, 20);
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

export class IncompetenceManager extends EnemyBase {
  constructor(scene, x, y) {
    super(scene, x, y, "enemy_boss");
    this.setScale(1.05);
    // Sprite 120x140. Body 80x110, bottom-aligned.
    this.body.setSize(80, 110).setOffset(20, 30);
    this.body.setMaxVelocity(180, 1400);
    this.health = 3;
    this.scoreValue = 0;
    this.facing = -1;
    this.setVelocityX(-90);
    this.startX = x;
    this.lastJumpAt = 0;
  }

  preUpdate(time, dt) {
    super.preUpdate(time, dt);
    if (this.dead) return;

    // Patrol within ±220 of start, jump occasionally.
    if (this.x < this.startX - 220) { this.facing = 1; this.setFlipX(false); }
    if (this.x > this.startX + 220) { this.facing = -1; this.setFlipX(true); }
    this.setVelocityX(this.facing * 100);

    if ((this.body.blocked.down || this.body.touching.down) && time - this.lastJumpAt > 2200) {
      this.setVelocityY(-540);
      this.lastJumpAt = time;
    }
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
      onComplete: () => this.clearTint(),
    });
    if (this.health <= 0) {
      this.defeat();
      return true; // boss defeated
    }
    return false;
  }
}
