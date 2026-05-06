// Main gameplay scene — Community Park.
// Builds the world from level1 data, runs physics, dispatches collisions.

import { VIEW, PHYSICS, PLAYER } from "../config.js";
import { Player } from "../objects/Player.js";
import { JargonBlob, GutFeelGhost, PaperworkPile, IncompetenceManager } from "../objects/Enemies.js";
import { Insight, CommunitySignal } from "../objects/Collectibles.js";
import { Brand } from "../objects/Brand.js";
import { level1, TILE_SIZE, GROUND_TOP_Y } from "../levels/level1.js";
import { SFX } from "../audio.js";

export class GameScene extends Phaser.Scene {
  constructor() { super("Game"); }

  create() {
    this.cameras.main.fadeIn(400, 26, 15, 46);
    const lvl = level1;
    this.level = lvl;

    this.physics.world.setBounds(0, 0, lvl.width, lvl.height);
    this.cameras.main.setBounds(0, 0, lvl.width, lvl.height);

    // ----- PARALLAX BACKGROUND -----
    this.bgFar = this.add.tileSprite(0, 0, VIEW.width, VIEW.height, "bg_far")
      .setOrigin(0).setScrollFactor(0).setDepth(-100);

    this.bgMid = this.add.tileSprite(0, 0, VIEW.width, VIEW.height, "bg_mid")
      .setOrigin(0).setScrollFactor(0).setDepth(-90);

    this.bgNear = this.add.tileSprite(0, 0, VIEW.width, VIEW.height, "bg_near")
      .setOrigin(0).setScrollFactor(0).setDepth(-80);

    // Tower bg fades in over the boss arena.
    this.bgTower = this.add.tileSprite(0, 0, VIEW.width, VIEW.height, "bg_tower")
      .setOrigin(0).setScrollFactor(0).setDepth(-85).setAlpha(0);

    // Drifting clouds (in-world, not scroll-fixed).
    for (const c of lvl.clouds) {
      const cloud = this.add.image(c.x, c.y, "cloud").setScale(c.scale).setAlpha(0.85).setDepth(-50);
      this.tweens.add({
        targets: cloud,
        x: cloud.x + 80,
        duration: 12000 + Math.random() * 8000,
        yoyo: true,
        repeat: -1,
      });
    }

    // ----- TERRAIN -----
    this.platforms = this.physics.add.staticGroup();
    for (const t of lvl.terrain) {
      if (t.kind === "ground") {
        this.buildGround(t.x, t.w);
      } else if (t.kind === "platform") {
        this.buildPlatform(t.x, t.y, t.w);
      } else if (t.kind === "brick") {
        this.buildBrick(t.x, t.y);
      }
    }

    // World floor (catch falls into pits).
    this.physics.world.setBoundsCollision(true, true, false, false);
    this.deathLine = lvl.height + 80;

    // ----- COLLECTIBLES -----
    // Plain groups (no physics group config) so the per-instance body settings
    // set inside Insight/CommunitySignal constructors aren't overwritten.
    // Each pickup brings its own arcade body; the group is just for iteration.
    this.insights = this.add.group();
    for (const c of lvl.insights) {
      this.insights.add(new Insight(this, c.x, c.y));
    }

    this.signals = this.add.group();
    for (const s of lvl.signals) {
      this.signals.add(new CommunitySignal(this, s.x, s.y, s.type));
    }

    // ----- ENEMIES -----
    this.enemies = this.physics.add.group();
    this.projectiles = this.physics.add.group({ allowGravity: false });

    for (const e of lvl.enemies) {
      let enemy;
      if (e.type === "jargon_blob") enemy = new JargonBlob(this, e.x, e.y, e.range);
      else if (e.type === "ghost") enemy = new GutFeelGhost(this, e.x, e.y, e.range);
      else if (e.type === "paperwork") enemy = new PaperworkPile(this, e.x, e.y, this.projectiles);
      if (enemy) this.enemies.add(enemy);
    }

    // Mini-boss (spawned but inactive until player crosses arena boundary).
    this.boss = new IncompetenceManager(this, lvl.miniBoss.x, lvl.miniBoss.y);
    this.bossActive = false;
    this.boss.setVisible(false);
    this.boss.body.enable = false;

    // ----- BRAND -----
    // Brand sprite is 120x160, origin (0.5, 1) — feet on the ground.
    // The question mark hovers ABOVE the brand's head.
    this.brand = new Brand(this, lvl.brandPos.x, lvl.brandPos.y);

    const qmY = this.brand.y - 200; // 40px above the brand's head
    this.brandQuestionMark = this.add.text(this.brand.x, qmY, "?", {
      fontFamily: "serif",
      fontSize: "48px",
      fontStyle: "bold",
      color: "#7d4f00",
      stroke: "#fff8d8",
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.tweens.add({
      targets: this.brandQuestionMark,
      y: qmY - 8,
      yoyo: true,
      repeat: -1,
      duration: 900,
      ease: "Sine.easeInOut",
    });

    // ----- PLAYER -----
    this.player = new Player(this, lvl.spawn.x, lvl.spawn.y);

    // ----- COLLISIONS -----
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.boss, this.platforms);
    this.physics.add.collider(this.projectiles, this.platforms, (p) => p.destroy());

    this.physics.add.overlap(this.player, this.insights, (player, insight) => {
      this.spawnSparkles(insight.x, insight.y);
      insight.destroy();
      this.player.collectInsight(1);
      this.updateBrandMeter();
    });
    this.physics.add.overlap(this.player, this.signals, (player, sig) => {
      sig.destroy();
      this.player.setSignal(sig.kind);
      this.spawnSparkles(sig.x, sig.y, 18);
    });
    this.physics.add.overlap(this.player, this.enemies, (player, enemy) => this.handleEnemyCollision(enemy));
    this.physics.add.overlap(this.player, this.boss, () => this.handleBossCollision());
    this.physics.add.overlap(this.player, this.projectiles, (player, p) => {
      p.destroy();
      this.player.takeDamage(p.x);
    });
    this.physics.add.overlap(this.player, this.brand, () => this.handleBrandTouch());

    // ----- CAMERA -----
    this.cameras.main.startFollow(this.player, true, 0.15, 0.1);
    this.cameras.main.setDeadzone(VIEW.width * 0.3, VIEW.height * 0.4);
    this.cameras.main.setLerp(0.18, 0.12);

    // ----- KEYS -----
    this.keys = this.input.keyboard.addKeys({
      R: Phaser.Input.Keyboard.KeyCodes.R,
      P: Phaser.Input.Keyboard.KeyCodes.P,
      M: Phaser.Input.Keyboard.KeyCodes.M,
    });

    // Hidden dev shortcut: Q jumps right next to the brand with the meter full.
    this.input.keyboard.on("keydown-Q", () => {
      this.player.insights = this.level.insightsRequired;
      this.game.events.emit("insight-changed", this.player.insights);
      this.game.events.emit("brand-meter", 1, this.player.insights, this.level.insightsRequired);
      // Place Swiirl directly inside the brand's body so the next overlap
      // check fires the cutscene immediately.
      this.player.setPosition(this.level.brandPos.x, GROUND_TOP_Y - 60);
      this.player.setVelocity(0, 0);
      this.player._invulnUntil = this.time.now + 5000;
      this.boss.dead = true;
      this.boss.body.enable = false;
      this.boss.setVisible(false);
      this.brand.becomeHappy();
      this.brandQuestionMark.setText("!").setColor("#3a7c47");
    });

    // ----- HUD wire-up -----
    // Events emitted on this.game.events (persistent Phaser-level bus) so HUD
    // survives scene restarts without losing its listeners.
    this.game.events.emit("level-loaded", {
      level: lvl.name,
      lives: this.player.lives,
      insights: this.player.insights,
      brandThreshold: lvl.insightsRequired,
    });

    // Launch HUD if it was stopped (e.g. by the R-restart path), otherwise bring to front.
    if (!this.scene.isActive("HUD")) {
      this.scene.launch("HUD");
    }
    this.scene.bringToTop("HUD");

    // Internal camera reactions to player events (also on the global bus).
    const onPlayerHurt = (lives) => {
      if (!this.cameras?.main) return;
      this.cameras.main.shake(160, 0.006);
      if (lives > 0) this.cameras.main.flash(180, 255, 60, 60);
    };
    const onPlayerDied = () => this.gameOver();
    this.game.events.on("player-hurt", onPlayerHurt);
    this.game.events.once("player-died", onPlayerDied);
    // Clean up when this scene instance shuts down so stale handlers don't fire.
    this.events.once("shutdown", () => {
      this.game.events.off("player-hurt", onPlayerHurt);
      this.game.events.off("player-died", onPlayerDied);
    });

    // ----- LEVEL TITLE banner -----
    this.showActBanner("Act 1 — Community Park");

    this.act = 1;

    // Restart hooks
    this.input.keyboard.on("keydown-R", () => {
      // Stop HUD before restarting so it launches fresh and re-wires listeners.
      this.scene.stop("HUD");
      this.scene.restart();
    });
    this.input.keyboard.on("keydown-M", () => {
      import("../audio.js").then((m) => {
        const muted = m.toggleMuted();
        this.game.events.emit("muted-changed", muted);
      });
    });
  }

  buildGround(x, w) {
    // Top "grass" tile band with darker tiles below.
    const tilesAcross = Math.ceil(w / TILE_SIZE);
    for (let i = 0; i < tilesAcross; i++) {
      const tx = x + i * TILE_SIZE;
      const top = this.platforms.create(tx + TILE_SIZE / 2, GROUND_TOP_Y + TILE_SIZE / 2, "tile_grass");
      top.refreshBody();
      // Add 1-2 rows of "dirt" tiles below for visual depth (not collidable).
      this.add.image(tx + TILE_SIZE / 2, GROUND_TOP_Y + TILE_SIZE * 1.5, "tile_ground").setDepth(-1);
      this.add.image(tx + TILE_SIZE / 2, GROUND_TOP_Y + TILE_SIZE * 2.5, "tile_ground").setDepth(-1);
    }
  }

  buildPlatform(x, y, wTiles) {
    for (let i = 0; i < wTiles; i++) {
      const tx = x + i * TILE_SIZE;
      const p = this.platforms.create(tx + TILE_SIZE / 2, y + TILE_SIZE / 2, "tile_platform");
      p.refreshBody();
    }
  }

  buildBrick(x, y) {
    const b = this.platforms.create(x + TILE_SIZE / 2, y + TILE_SIZE / 2, "tile_brick");
    b.refreshBody();
  }

  spawnSparkles(x, y, count = 6) {
    for (let i = 0; i < count; i++) {
      const s = this.add.image(x, y, "sparkle").setDepth(20).setScale(0.6 + Math.random());
      this.tweens.add({
        targets: s,
        x: x + Phaser.Math.Between(-30, 30),
        y: y + Phaser.Math.Between(-50, -10),
        alpha: 0,
        scale: 0,
        duration: 600 + Math.random() * 400,
        ease: "Quad.easeOut",
        onComplete: () => s.destroy(),
      });
    }
  }

  updateBrandMeter() {
    const ratio = Math.min(1, this.player.insights / this.level.insightsRequired);
    this.game.events.emit("brand-meter", ratio, this.player.insights, this.level.insightsRequired);
    if (ratio >= 1 && this.brandQuestionMark.text === "?") {
      this.brandQuestionMark.setText("!");
      this.brandQuestionMark.setColor("#3a7c47");
      this.brand.becomeHappy();
    }
  }

  handleEnemyCollision(enemy) {
    if (enemy.dead) return;
    const player = this.player;
    const stomping = player.body.velocity.y > 80 &&
      (player.y - 8) < (enemy.y - enemy.displayHeight * 0.4);
    if (stomping) {
      this.spawnSparkles(enemy.x, enemy.y - 30, 10);
      enemy.defeat();
      player.bounceOnEnemy();
      return;
    }
    // While invulnerable, just nudge the player away — don't try to damage.
    if (this.time.now < player._invulnUntil) {
      const dir = (player.x < enemy.x) ? -1 : 1;
      player.setVelocityX(dir * 220);
      return;
    }
    player.takeDamage(enemy.x);
  }

  handleBossCollision() {
    if (this.boss.dead) return;
    const player = this.player;
    const stomping = player.body.velocity.y > 80 &&
      (player.y - 8) < (this.boss.y - this.boss.displayHeight * 0.5);
    if (stomping) {
      this.spawnSparkles(this.boss.x, this.boss.y - 60, 14);
      const defeated = this.boss.takeStompHit();
      player.bounceOnEnemy();
      if (defeated) {
        this.showActBanner("Incompetence defeated. Insights ready.");
      }
    } else {
      player.takeDamage(this.boss.x);
    }
  }

  handleBrandTouch() {
    if (this.brand.delivered) return;
    if (this.player.insights < this.level.insightsRequired) {
      // Show a brief hint above brand.
      if (!this._brandHintShown) {
        this._brandHintShown = true;
        const hint = this.add.text(this.brand.x, this.brand.y - 200,
          `gather ${this.level.insightsRequired - this.player.insights} more insight${this.level.insightsRequired - this.player.insights === 1 ? "" : "s"}`, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "20px",
          color: "#ffffff",
          stroke: "#5C3BA3",
          strokeThickness: 4,
        }).setOrigin(0.5);
        this.tweens.add({
          targets: hint,
          y: hint.y - 30,
          alpha: 0,
          duration: 1800,
          onComplete: () => { hint.destroy(); this._brandHintShown = false; },
        });
      }
      return;
    }
    if (this.boss && !this.boss.dead && this.bossActive) return; // must defeat boss first
    this.brand.delivered = true;
    this.beginBrandReveal();
  }

  beginBrandReveal() {
    this.player.body.setVelocity(0, 0);
    this.player.celebrate();
    SFX.win();
    this.cameras.main.flash(800, 255, 240, 200);

    // Draw insight orbs flying from player to brand.
    for (let i = 0; i < 12; i++) {
      const orb = this.add.image(this.player.x, this.player.y - 40, "insight").setDepth(40);
      this.time.delayedCall(80 * i, () => {
        this.tweens.add({
          targets: orb,
          x: this.brand.x,
          y: this.brand.y - 80,
          scale: 0.4,
          duration: 700,
          ease: "Quad.easeIn",
          onComplete: () => {
            orb.destroy();
            this.spawnSparkles(this.brand.x, this.brand.y - 80, 6);
          },
        });
      });
    }

    this.brand.becomeHappy();

    this.time.delayedCall(2200, () => {
      this.scene.stop("HUD");
      this.scene.start("LevelComplete", {
        insights: this.player.insights,
        lives: this.player.lives,
        levelName: this.level.name,
      });
    });
  }

  gameOver() {
    SFX.death();
    this.cameras.main.fadeOut(700, 26, 15, 46);
    this.time.delayedCall(750, () => {
      this.scene.stop("HUD");
      this.scene.start("GameOver", { insights: this.player.insights });
    });
  }

  showActBanner(text) {
    const banner = this.add.text(this.scale.width / 2, 90, text, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "28px",
      color: "#ffffff",
      stroke: "#5C3BA3",
      strokeThickness: 6,
      shadow: { offsetY: 4, color: "#1a0f2e", blur: 10, fill: true },
    }).setScrollFactor(0).setOrigin(0.5).setDepth(100).setAlpha(0);
    this.tweens.add({ targets: banner, alpha: 1, y: 110, duration: 400, ease: "Back.easeOut" });
    this.time.delayedCall(1800, () => {
      this.tweens.add({ targets: banner, alpha: 0, y: 80, duration: 400, onComplete: () => banner.destroy() });
    });
  }

  update(time, dt) {
    // Parallax scroll factors via tilePosition.
    const cam = this.cameras.main;
    this.bgFar.tilePositionX = cam.scrollX * 0.05;
    this.bgMid.tilePositionX = cam.scrollX * 0.25;
    this.bgNear.tilePositionX = cam.scrollX * 0.5;
    this.bgTower.tilePositionX = cam.scrollX * 0.4;

    // Crossfade to tower bg when entering the boss arena.
    if (this.player.x > this.level.bossArenaStart) {
      this.bgTower.setAlpha(Math.min(1, this.bgTower.alpha + 0.01));
      this.bgNear.setAlpha(Math.max(0.3, this.bgNear.alpha - 0.005));
      if (!this.bossActive && !this.boss.dead) {
        this.bossActive = true;
        this.boss.setVisible(true);
        this.boss.body.enable = true;
        this.showActBanner("Act 3 — The Incompetence Manager");
      }
    }

    // Act banners.
    if (this.act === 1 && this.player.x > 2700) {
      this.act = 2;
      this.showActBanner("Act 2 — Sharing Signals");
    }

    // Pit / fall-out.
    if (this.player.y > this.deathLine && this.player.body.enable) {
      this.player.body.enable = false;
      this.player.setAlpha(0);
      this.cameras.main.flash(120, 255, 60, 60);
      this.player.lives = Math.max(0, this.player.lives - 1);
      this.game.events.emit("player-hurt", this.player.lives);
      if (this.player.lives <= 0) {
        this.gameOver();
      } else {
        // Respawn at last reasonable checkpoint (act start).
        this.time.delayedCall(500, () => {
          let respawnX = this.level.spawn.x;
          if (this.player.x > 5500) respawnX = 5800;
          else if (this.player.x > 2700) respawnX = 3300;
          else if (this.player.x > 1500) respawnX = 1500;
          this.player.setPosition(respawnX, GROUND_TOP_Y - 100);
          this.player.setVelocity(0, 0);
          this.player.body.enable = true;
          this.player.setAlpha(1);
          this.player._invulnUntil = this.time.now + 1500;
          this.cameras.main.fadeIn(300, 26, 15, 46);
        });
      }
    }
  }
}
