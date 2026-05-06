// Insights (the basic coin) and Community Signals (the power-ups).
//
// Both are kinematic — gravity off, position driven by tweens only.
// Tween-based animation means they NEVER fall and the bob is perfectly smooth.

export class Insight extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "insight");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(0.95);
    this.setOrigin(0.5, 0.5);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.setSize(34, 34).setOffset(3, 3);

    // Idle bob — small vertical sine. Tween targets the sprite so the
    // body follows automatically; no manual y-mutation in preUpdate that could
    // race with physics integration.
    this._baseY = y;
    scene.tweens.add({
      targets: this,
      y: y - 5,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: Math.random() * 800,
    });
    // Subtle wobble.
    scene.tweens.add({
      targets: this,
      angle: 6,
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: Math.random() * 1000,
    });
  }
}

export class CommunitySignal extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, kind) {
    super(scene, x, y, `signal_${kind}`);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.kind = kind;
    this.setScale(0.95);
    this.setOrigin(0.5, 0.5);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.setSize(40, 40).setOffset(4, 4);

    // Slow float.
    scene.tweens.add({
      targets: this,
      y: y - 8,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: Math.random() * 600,
    });
    // Gentle pulse.
    scene.tweens.add({
      targets: this,
      scale: 1.05,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }
}
