// The Brand — level-end NPC. Gated by insight count: needs the brand-meter full
// before Swiirl can "deliver". Otherwise, walking up to it just shows a hint.

export class Brand extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "brand");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.setSize(80, 130).setOffset(20, 30);
    this.delivered = false;
  }

  becomeHappy() {
    this.setTexture("brand_happy");
  }
}
