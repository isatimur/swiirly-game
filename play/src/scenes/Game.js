// Main gameplay scene — Community Park.
// Builds the world from level1 data, runs physics, dispatches collisions.

import { VIEW, PHYSICS, PLAYER, IS_MOBILE } from "../config.js";
import { Player } from "../objects/Player.js";
import { JargonBlob, GutFeelGhost, PaperworkPile, IncompetenceManager, DeadlineBot, BossBase, makeBoss } from "../objects/Enemies.js";
import { Insight, CommunitySignal } from "../objects/Collectibles.js";
import { Brand } from "../objects/Brand.js";
import { Effects } from "../objects/Effects.js";
import { Combo } from "../objects/Combo.js";
import { level1, TILE_SIZE, GROUND_TOP_Y } from "../levels/level1.js";
import { level2 } from "../levels/level2.js";
import { level3 } from "../levels/level3.js";
import { level4 } from "../levels/level4.js";
import { level5 } from "../levels/level5.js";
import { level6 } from "../levels/level6.js";
import { SFX } from "../audio.js";

const FLAVOR_QUOTES = {
  "Community Park":     "Where ideas first take root.",
  "Corporate Maze":     "Bureaucracy fights back.",
  "Brand HQ":           "Inside every decision, a deadline.",
  "Boardroom Battle":   "Every meeting is a maze.",
  "Data Lake":          "Drown the noise. Surface the signal.",
  "Executive Summit":   "The final pitch. No second drafts.",
  "Up and to the Right": "There is no top, only higher.",
};

const LEVELS = { 1: level1, 2: level2, 3: level3, 4: level4, 5: level5, 6: level6 };

export class GameScene extends Phaser.Scene {
  constructor() { super("Game"); }

  init(data) {
    this.levelNum = data?.level ?? 1;
  }

  create() {
    this.cameras.main.fadeIn(400, 26, 15, 46);
    const lvl = LEVELS[this.levelNum] ?? level1;
    this.level = lvl;
    this._levelStartTime = this.time.now;

    // VFX manager + combo state.
    this.effects = new Effects(this);
    this.combo = new Combo(this, 2200);
    // Score system — accumulates across the level, persists best in
    // localStorage. addScore() emits "score-changed" so HUD updates and
    // a floating "+N" pop spawns at the event's world coords.
    this.score = 0;

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

    this.bgDataLake = this.add.tileSprite(0, 0, VIEW.width, VIEW.height, "bg_data_lake")
      .setOrigin(0).setScrollFactor(0).setDepth(-80).setAlpha(0);
    this.bgExecutive = this.add.tileSprite(0, 0, VIEW.width, VIEW.height, "bg_executive")
      .setOrigin(0).setScrollFactor(0).setDepth(-80).setAlpha(0);

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

    // ----- AMBIENT PARTICLES (per-level flair) -----
    this.spawnAmbientParticles(this.levelNum);

    // ----- LEVEL ATMOSPHERE -----
    if (this.levelNum === 2) {
      // Corporate Maze — cool blue-gray office tone
      this.cameras.main.setBackgroundColor("#0d1825");
      [this.bgFar, this.bgMid, this.bgNear, this.bgTower].forEach(bg => bg.setTint(0x7090c0));
    } else if (this.levelNum === 3) {
      // Brand HQ — warm amber/red high-stakes tone
      this.cameras.main.setBackgroundColor("#1a0805");
      [this.bgFar, this.bgMid, this.bgNear, this.bgTower].forEach(bg => bg.setTint(0xc08060));
    } else if (this.levelNum === 4) {
      // Data Lake — dark teal server-room
      this.cameras.main.setBackgroundColor("#050e12");
      [this.bgFar, this.bgMid, this.bgTower].forEach(bg => bg.setTint(0x408090));
      this.bgNear.setAlpha(0);
      this.bgDataLake.setAlpha(1).setTint(0x40a0a8);
    } else if (this.levelNum === 5) {
      // Executive Summit — dark blue-gray steel
      this.cameras.main.setBackgroundColor("#080a14");
      [this.bgFar, this.bgMid, this.bgTower].forEach(bg => bg.setTint(0x6070c0));
      this.bgNear.setAlpha(0);
      this.bgExecutive.setAlpha(1).setTint(0x9090b8);
    }

    // ----- TERRAIN -----
    this.platforms = this.physics.add.staticGroup();
    this.bouncePads = this.physics.add.staticGroup();
    this.conveyors = this.physics.add.staticGroup();
    // Themed obstacles (bulletin / cubicle / rope / rack / pillar) live in
    // their own group — only the player collides with them. Enemies pass
    // straight through so an obstacle never traps a patrolling jargon-blob.
    this.playerObstacles = this.physics.add.staticGroup();
    this.windZones = [];        // Array of { x, y, w, h, force, particles[] }
    this.fallingShardSpawners = []; // Array of { interval, lastSpawn, xRange }
    for (const t of lvl.terrain) {
      if (t.kind === "ground") {
        this.buildGround(t.x, t.w);
      } else if (t.kind === "platform") {
        this.buildPlatform(t.x, t.y, t.w);
      } else if (t.kind === "brick") {
        this.buildBrick(t.x, t.y);
      } else if (t.kind === "bouncePad") {
        this.buildBouncePad(t.x, t.y);
      } else if (t.kind === "conveyor") {
        this.buildConveyor(t.x, t.y, t.w, t.dir ?? 1);
      } else if (t.kind === "windZone") {
        this.buildWindZone(t.x, t.y, t.w, t.h, t.force ?? 220);
      } else if (t.kind === "fallingShards") {
        this.fallingShardSpawners.push({
          x1: t.x1, x2: t.x2,
          interval: t.interval ?? 2200,
          lastSpawn: 0,
        });
      } else if (t.kind === "obstacle") {
        this.buildObstacle(t.x, t.texture);
      } else if (t.kind === "shaftBrick") {
        // Like a brick, but uses the shaft-wall texture for the bonus
        // level. Same 64×64 collision footprint as a regular brick.
        this.buildShaftBrick(t.x, t.y);
      } else if (t.kind === "oneWayFloor") {
        // Jump-through brick floor for the L6 arena cap — the player
        // rises up through it from the shaft, then lands on top.
        this.buildOneWayFloor(t.x1, t.x2, t.y, t.textureKey);
      }
    }

    // Tint tiles to match the level's atmosphere. Obstacles live in their
    // own group so they're already excluded from this pass.
    const tintTiles = (color) =>
      this.platforms.getChildren().forEach(tile => tile.setTint(color));
    if (this.levelNum === 1)      tintTiles(0xf5ecd0);
    else if (this.levelNum === 2) tintTiles(0x9ab0cc);
    else if (this.levelNum === 3) tintTiles(0xcc9070);
    else if (this.levelNum === 4) tintTiles(0x60a0b0);
    else if (this.levelNum === 5) tintTiles(0x8090c8);

    // L5 finale — distant city skyline behind the C-Suite arena (x≈9000–
    // 11500). Staggered dark buildings with lit windows, depth -15, no
    // physics, no parallax. Modeled on the L6 rooftop skyline. Mobile-skip:
    // per-rect graphics calls cost real GPU when the shard zone is active.
    if (this.levelNum === 5 && !IS_MOBILE) {
      const skyline = this.add.graphics().setDepth(-15);
      const skyBuildings = [
        { x:  9050, w: 110, h: 240, c: 0x1a1f2a },
        { x:  9200, w: 150, h: 320, c: 0x0e1320 },
        { x:  9400, w:  90, h: 210, c: 0x161b26 },
        { x:  9540, w: 130, h: 290, c: 0x0e1320 },
        { x:  9720, w:  80, h: 180, c: 0x1a1f2a },
        { x:  9850, w: 120, h: 270, c: 0x0e1320 },
        { x: 10020, w: 100, h: 230, c: 0x161b26 },
        { x: 10170, w: 140, h: 340, c: 0x0e1320 },
        { x: 10360, w:  90, h: 200, c: 0x1a1f2a },
        { x: 10500, w: 130, h: 300, c: 0x0e1320 },
        { x: 10690, w: 100, h: 220, c: 0x161b26 },
        { x: 10840, w: 150, h: 330, c: 0x0e1320 },
        { x: 11040, w:  90, h: 210, c: 0x1a1f2a },
        { x: 11180, w: 130, h: 280, c: 0x0e1320 },
        { x: 11370, w: 100, h: 240, c: 0x161b26 },
      ];
      for (const b of skyBuildings) {
        const top = GROUND_TOP_Y - b.h;
        skyline.fillStyle(b.c, 1);
        skyline.fillRect(b.x, top, b.w, b.h);
        skyline.fillStyle(0xffd28a, 0.55);
        const rows = Math.floor(b.h / 24);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < 3; c++) {
            if (((r * 3 + c + b.x) % 5) === 0) continue;
            skyline.fillRect(b.x + 8 + c * (b.w - 16) / 2.4, top + 8 + r * 24, 6, 5);
          }
        }
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
    // Player-side attacks (melee hitboxes + thrown bolts). Kept in their own
    // group so we can route them through overlap handlers against the enemy
    // and boss groups independently from incoming projectiles.
    this.playerAttacks = this.physics.add.group({ allowGravity: false });

    for (const e of lvl.enemies) {
      let enemy;
      if (e.type === "jargon_blob") enemy = new JargonBlob(this, e.x, e.y, e.range);
      else if (e.type === "ghost") enemy = new GutFeelGhost(this, e.x, e.y, e.range);
      else if (e.type === "paperwork") enemy = new PaperworkPile(this, e.x, e.y, this.projectiles);
      else if (e.type === "deadline_bot") enemy = new DeadlineBot(this, e.x, e.y, null, e.range);
      if (enemy) this.enemies.add(enemy);
    }

    // Mini-boss (spawned but inactive until player crosses arena boundary).
    // Optional — the bonus level (L6) has no boss, lvl.miniBoss is null.
    this.boss = null;
    this.bossActive = false;
    if (lvl.miniBoss) {
      this.boss = makeBoss(this, this.levelNum, lvl.miniBoss.x, lvl.miniBoss.y, lvl.miniBoss.health ?? 3);
      this.boss.setVisible(false);
      this.boss.body.enable = false;
    }

    // ----- BRAND -----
    // Brand sprite is 120x160, origin (0.5, 1) — feet on the ground.
    // The question mark hovers ABOVE the brand's head.
    this.brand = new Brand(this, lvl.brandPos.x, lvl.brandPos.y);

    // L6 rooftop dressing — city skyline silhouette far behind, then the
    // rooftop-door pedestal painted right behind the brand. Sells "this
    // is the top of a building" instead of "a figure floating in sky."
    if (this.levelNum === 6) {
      const bx = this.brand.x, by = this.brand.y;
      // Render declarative rooftop props (level.props). Each entry has
      // key/x/y/depth — origin (0.5, 1.0) so y is the feet on the deck.
      if (Array.isArray(lvl.props)) {
        for (const p of lvl.props) {
          this.add.image(p.x, p.y, p.key).setOrigin(0.5, 1.0).setDepth(p.depth ?? -5);
        }
      }
      // Tile the parapet sprite along the rooftop's front edge so the
      // parapet reads as one continuous wall + rail. 64×48 image, anchored
      // (0, 1.0) so each tile's bottom edge sits at y=600 (the deck top).
      // Mobile-skip to keep the foreground sprite count lean.
      if (!IS_MOBILE) {
        for (let px = 0; px < 1600; px += 64) {
          this.add.image(px, 600, "prop_parapet").setOrigin(0, 1.0).setDepth(-8);
        }
      }

      // Painted helipad H — wide thin floor decal centered on the deck at
      // x=800. Origin (0.5, 0.0) so the TOP of the sprite sits at y=600
      // (the deck line) and the H paints downward into the visible deck
      // band. Depth -6 puts it above the concrete tiles but below the boss.
      this.add.image(800, 600, "prop_helipad_h").setOrigin(0.5, 0.0).setDepth(-6);
      // Distant city skyline behind the rooftop — staggered dark
      // rectangles with lit windows, parallax-free (just decor).
      // Skipped on mobile: the per-rect graphics calls add real GPU cost
      // when combined with the rest of the L6 effects.
      if (!IS_MOBILE) {
        const skyline = this.add.graphics().setDepth(-15);
        const skyBuildings = [
          { x:  120, w:  90, h: 200, c: 0x1a1f2a },
          { x:  220, w: 130, h: 260, c: 0x0e1320 },
          { x:  370, w:  80, h: 180, c: 0x161b26 },
          { x:  480, w: 110, h: 240, c: 0x0e1320 },
          { x:  620, w:  70, h: 160, c: 0x1a1f2a },
          { x:  720, w: 100, h: 220, c: 0x0e1320 },
          { x:  860, w:  90, h: 200, c: 0x161b26 },
          { x:  980, w: 120, h: 280, c: 0x0e1320 },
          { x: 1130, w:  80, h: 190, c: 0x1a1f2a },
          { x: 1240, w: 110, h: 240, c: 0x0e1320 },
          { x: 1380, w:  80, h: 170, c: 0x161b26 },
        ];
        for (const b of skyBuildings) {
          const top = 600 - b.h;
          skyline.fillStyle(b.c, 1);
          skyline.fillRect(b.x, top, b.w, b.h);
          skyline.fillStyle(0xffd28a, 0.55);
          const rows = Math.floor(b.h / 24);
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < 3; c++) {
              if (((r * 3 + c + b.x) % 5) === 0) continue;
              skyline.fillRect(b.x + 8 + c * (b.w - 16) / 2.4, top + 8 + r * 24, 6, 5);
            }
          }
        }
      }

      // (Door pedestal removed — brand sits on the arena floor now.)

      // ----- L6 EASTER EGGS -----
      // 1. Sticky note on the maintenance shed door — gold paper stuck
      //    slightly off-square, just above the door handle.
      const sticky = this.add.container(870, 540);
      const sg = this.add.graphics();
      sg.fillStyle(0xffd24a, 1);
      sg.fillRect(-10, -10, 20, 18);
      sg.lineStyle(0.6, 0xa07820, 1);
      sg.strokeRect(-10, -10, 20, 18);
      const st = this.add.text(0, -2, "Q4\nplan", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "5px", fontStyle: "700",
        color: "#5C3BA3", align: "center",
      }).setOrigin(0.5);
      sticky.add([sg, st]);
      sticky.setAngle(-8).setDepth(this.brand.depth);

      // 2. Floating "BOARD MEETING — postponed" memo drifting past the
      //    skyline. Anyone watching for more than 6 seconds will notice
      //    one slow-drift past the right-roof segment.
      const memo = this.add.container(1280 + 80, 320);
      const mg = this.add.graphics();
      mg.fillStyle(0xf8efdc, 0.9);
      mg.fillRect(-32, -22, 64, 44);
      mg.lineStyle(1, 0x5C3BA3, 0.8);
      mg.strokeRect(-32, -22, 64, 44);
      const mt = this.add.text(0, -8, "BOARD\nMEETING", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "7px", fontStyle: "900",
        color: "#5C3BA3", align: "center", letterSpacing: 1,
      }).setOrigin(0.5);
      const mt2 = this.add.text(0, 9, "postponed.", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "6px", fontStyle: "italic",
        color: "#8B63C9", align: "center",
      }).setOrigin(0.5);
      memo.add([mg, mt, mt2]);
      memo.setDepth(-10).setAngle(-3);
      this.tweens.add({
        targets: memo,
        x: -120, y: 380,
        angle: 8,
        duration: 22000,
        repeat: -1,
        ease: "Linear",
      });

      // 3. Shooting star — arcs across the sky on a random schedule, low
       //    depth so it's clearly background. Whole arc takes ~1.4s.
      const fireShootingStar = () => {
        const sx = Phaser.Math.Between(40, 200);
        const sy = Phaser.Math.Between(80, 220);
        const star = this.add.rectangle(sx, sy, 3, 3, 0xffffff, 1).setDepth(-12);
        const trail = this.add.rectangle(sx - 18, sy - 8, 32, 2, 0xffe0a0, 0.7).setDepth(-12);
        this.tweens.add({
          targets: [star, trail],
          x: "+=420", y: "+=180", alpha: 0,
          duration: 1400, ease: "Quad.easeIn",
          onComplete: () => { star.destroy(); trail.destroy(); },
        });
      };
      const scheduleStar = () => {
        this.time.delayedCall(Phaser.Math.Between(8000, 16000), () => {
          fireShootingStar();
          scheduleStar();
        });
      };
      scheduleStar();

      // 4. HVAC vapor wisp — small upward-drifting rectangle off the fan
      //    grate at x=300, y=590 (just above the deck-anchored HVAC top).
      //    Repeats every 1800ms. Mobile-skip to keep the GPU load down.
      if (!IS_MOBILE) {
        const spawnVapor = () => {
          const v = this.add.rectangle(300 + Phaser.Math.Between(-6, 6), 510, 12, 8, 0xeeeaf5, 0.55).setDepth(-6);
          this.tweens.add({
            targets: v,
            y: 460,
            alpha: 0,
            scaleX: 1.6, scaleY: 1.6,
            duration: 1800,
            ease: "Sine.easeOut",
            onComplete: () => v.destroy(),
          });
        };
        const scheduleVapor = () => {
          this.time.delayedCall(Phaser.Math.Between(1400, 2200), () => {
            spawnVapor();
            scheduleVapor();
          });
        };
        scheduleVapor();
      }
    }

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
    // Pick up the character chosen on the Select screen (or fall back to default).
    const chosenChar = this.registry.get("character") ?? null;
    this.player = new Player(this, lvl.spawn.x, lvl.spawn.y, chosenChar);

    // Inject player reference into DeadlineBots (spawned before player existed).
    this.enemies.getChildren().forEach(e => {
      if (e instanceof DeadlineBot) e.player = this.player;
    });

    // ----- COLLISIONS -----
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    if (this.boss) this.physics.add.collider(this.boss, this.platforms);
    this.physics.add.collider(this.projectiles, this.platforms, (p) => p.destroy());
    // Player-only obstacle collisions. Enemies and projectiles ignore.
    this.physics.add.collider(this.player, this.playerObstacles);

    // Bouncy mushrooms — boost the player's jump when landed on from above.
    this.physics.add.collider(this.player, this.bouncePads, (player, pad) => {
      // Only trigger when landing (not when grazing the side).
      if (player.body.velocity.y >= 0 && player.body.touching.down) {
        player.setVelocityY(-820);
        player._isJumping = true;
        player._jumpsRemaining = (PHYSICS.maxJumps ?? 2);
        SFX.jump();
        this.effects.dustPuff(pad.x, pad.y - 14, { color: 0x7bd389, count: 6, scale: 0.9, ms: 380 });
        this.effects.squashAndStretch(player, "jump");
        // Squash the pad as feedback.
        this.tweens.add({
          targets: pad, scaleY: 0.55, duration: 80, yoyo: true, ease: "Quad.easeOut",
        });
      }
    });
    this.physics.add.collider(this.enemies, this.bouncePads);
    if (this.boss) this.physics.add.collider(this.boss, this.bouncePads);

    // Conveyors are solid platforms — collide normally. Force is applied in update().
    this.physics.add.collider(this.player, this.conveyors);
    this.physics.add.collider(this.enemies, this.conveyors);
    if (this.boss) this.physics.add.collider(this.boss, this.conveyors);
    this.physics.add.collider(this.projectiles, this.conveyors, (p) => p.destroy());

    this.physics.add.overlap(this.player, this.insights, (player, insight) => {
      this.combo.bump("insight");
      const c = this.combo.count;
      this.effects.sparkleBurst(insight.x, insight.y, 8 + Math.min(c, 8), 0xffd24a);
      this.effects.insightFlyToHUD(insight.x, insight.y, 64, 22);
      const ix = insight.x, iy = insight.y;
      insight.destroy();
      // Multiplier-aware collect — falls back to 1 if combo is fresh.
      this.player.collectInsight(this.combo.multiplier);
      this.addScore(100 * this.combo.multiplier, ix, iy);
      this.updateBrandMeter();
      // Custom audio replaces the default chord on first collect.
      SFX.collectAt(c);
      if (c >= 3) {
        this.effects.comboFloat(ix, iy - 24, `+${this.combo.multiplier} ×${c}!`, "#ffd24a");
      }
    });
    this.physics.add.overlap(this.player, this.signals, (player, sig) => {
      sig.destroy();
      this.player.setSignal(sig.kind);
      this.spawnSparkles(sig.x, sig.y, 18);
    });
    this.physics.add.overlap(this.player, this.enemies, (player, enemy) => this.handleEnemyCollision(enemy));
    if (this.boss) this.physics.add.overlap(this.player, this.boss, () => this.handleBossCollision());
    this.physics.add.overlap(this.player, this.projectiles, (player, p) => {
      p.destroy();
      this.player.takeDamage(p.x);
    });
    this.physics.add.overlap(this.player, this.brand, () => this.handleBrandTouch());

    // ----- PLAYER ATTACKS → ENEMIES / BOSS / PROJECTILES -----
    // CRITICAL: side-effects (VFX, SFX, freezeFrame) ONLY run when the
    // damage call returns a real hit. Piercing hitboxes overlap every frame
    // for their lifetime; without this gate, 14+ freezeFrame calls per attack
    // would re-pause physics on every resume and hang the boss fight.
    this.physics.add.overlap(this.playerAttacks, this.enemies, (atk, enemy) => {
      if (!atk.active || !enemy.active || enemy.dead) return;
      const result = enemy.takePlayerHit(atk.damage ?? 1, this.player.x, atk.attackId ?? "atk");
      if (!result) {
        // Pierce hitbox that's already hit this enemy — destroy non-pierce as before.
        if (!atk.pierce) atk.destroy();
        return;
      }
      const killed = result === "killed";
      this.effects.stompPoof(enemy.x, enemy.y - 24);
      this.combo.bump(killed ? "stomp" : "hit");
      const c = this.combo.count;
      if (killed) SFX.stompAt(c);
      else SFX.attackConfirm?.();
      this.addScore((killed ? 80 : 30) * this.combo.multiplier, enemy.x, enemy.y - 24);
      this.player.onAttackConfirm(enemy.x);
      // Hit-stop on heavy hits — brief freeze sells the impact. Damage >= 2
      // catches chain-heavy and ground-pound; the pierce flag catches the
      // shockwave. Light attacks stay snappy.
      if ((atk.damage ?? 1) >= 2 || atk.pierce) this.effects.freezeFrame(60);
      if (!atk.pierce) atk.destroy();
    });
    if (this.boss) this.physics.add.overlap(this.playerAttacks, this.boss, (a, b) => {
      // Phaser optimizes group-vs-single-sprite as collideSpriteVsGroup, which
      // SWAPS the callback args (sprite first, group child second). So `a` may
      // be the boss and `b` the hitbox, or vice versa depending on Phaser
      // internals. Disambiguate by the .friendly tag we set on every hitbox.
      const atk  = a?.friendly ? a : b;
      const boss = atk === a ? b : a;
      if (!atk || !atk.active || !boss || boss.dead || !this.bossActive) return;
      if (typeof boss.takePlayerHit !== "function") return; // defensive
      const result = boss.takePlayerHit(atk.damage ?? 1, this.player.x, atk.attackId ?? "atk");
      if (!result) {
        if (!atk.pierce) atk.destroy();
        return;
      }
      this.effects.sparkleBurst(boss.x, boss.y - 60, 5, 0xffd24a);
      this.effects.punchZoom(0.04, 180);
      // Heavy hits chunk the boss with hit-stop on top of punchZoom.
      if ((atk.damage ?? 1) >= 2 || atk.pierce) this.effects.freezeFrame(70);
      SFX.attackConfirm?.();
      this.addScore(result === "killed" ? 2000 : 250, boss.x, boss.y - 60);
      this.player.onAttackConfirm(boss.x);
      if (!atk.pierce) atk.destroy();
    });
    // Guardian parry: shieldBash hitboxes destroy incoming projectiles on touch.
    this.physics.add.overlap(this.playerAttacks, this.projectiles, (atk, proj) => {
      if (!atk.parry || !atk.active || !proj.active) return;
      this.effects.sparkleBurst(proj.x, proj.y, 8, 0xffd24a);
      proj.destroy();
      SFX.parry?.();
    });
    // Stop player attacks at solid walls (looks unfair if they pass through).
    this.physics.add.collider(this.playerAttacks, this.platforms, (atk) => {
      if (atk.attackId === "bolt") atk.destroy();
    });

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

    // Hidden dev shortcut: B teleports player into the boss arena (boss alive).
    this.input.keyboard.on("keydown-B", () => {
      const arenaX = this.level.bossArenaStart + 100;
      this.player.setPosition(arenaX, GROUND_TOP_Y - 100);
      this.player.setVelocity(0, 0);
      this.player._invulnUntil = this.time.now + 1500;
    });

    // Hidden dev shortcut: Q jumps right next to the brand with the meter full.
    this.input.keyboard.on("keydown-Q", () => {
      this.player.insights = this.level.insightsRequired;
      this.game.events.emit("insight-changed", this.player.insights);
      this.game.events.emit("brand-meter", 1, this.player.insights, this.level.insightsRequired);
      // Place Swiirl directly inside the brand's body so the next overlap
      // check fires the cutscene immediately.
      this.player.setPosition(this.level.brandPos.x, this.level.brandPos.y - 60);
      this.player.setVelocity(0, 0);
      this.player._invulnUntil = this.time.now + 5000;
      if (this.boss) {
        this.boss.dead = true;
        this.boss.body.enable = false;
        this.boss.setVisible(false);
      }
      this.brand.becomeHappy();
      this.brandQuestionMark.setText("!").setColor("#3a7c47");
    });

    // ----- HUD wire-up -----
    // Launch HUD first so its create() runs and registers event listeners before
    // we emit level-loaded. The 50ms delay ensures the HUD scene has fully created.
    if (!this.scene.isActive("HUD")) {
      this.scene.launch("HUD");
    }
    this.scene.bringToTop("HUD");

    // Start the level's chiptune track. Music.play is a no-op if already
    // playing the same track, so re-running create() (restart) won't restart
    // the music mid-bar. Intensity is restored to full (LevelComplete dims
    // it for the celebration; this brings it back up for the new run).
    import("../audio.js").then(m => {
      m.Music.play("level" + this.levelNum);
      m.Music.setIntensity(1.0);
    });

    // Deferred so HUD's create() has finished registering game.events listeners.
    this.time.delayedCall(50, () => {
      this.game.events.emit("level-loaded", {
        level: lvl.name,
        lives: this.player.lives,
        insights: this.player.insights,
        brandThreshold: lvl.insightsRequired,
      });
      const ch = this.player.character;
      if (ch) {
        this.game.events.emit("persona-bind", {
          name: ch.name,
          attackHint: ch.attackHint,
          spriteKey: ch.spriteKey,
        });
      }
    });

    // Internal camera reactions to player events (also on the global bus).
    const onPlayerHurt = (lives) => {
      if (!this.cameras?.main) return;
      this.cameras.main.shake(220, 0.008);
      if (lives > 0) this.cameras.main.flash(180, 255, 60, 60);
      this.combo?.reset();
      this.game.events.emit("damage-flash");
    };
    const onPlayerDied = () => this.gameOver();
    const onBossDefeated = ({ x, y }) => {
      this.effects.slowMo(0.25, 180, 320, 700);
      this.effects.bossShockwave(x, y);
      this.time.delayedCall(120, () => this.effects.stompPoof(x - 30, y - 20));
      this.time.delayedCall(220, () => this.effects.stompPoof(x + 40, y - 40));
      this.time.delayedCall(360, () => this.effects.sparkleBurst(x, y, 24, 0xffd24a));
      this.time.delayedCall(420, () => this.effects.radialFlash(0xffd24a, 0.35, 480));
      SFX.bossKill();
      // Boss music → level music, dim while the celebration plays.
      import("../audio.js").then(m => {
        m.Music.play("level" + this.levelNum);
        m.Music.setIntensity(0.45);
      });
      // Brand "go-touch-me" glow — pulsing yellow halo behind the brand
      // once the boss is down, so the player knows where to go next.
      if (this.brand && !this._brandHalo) {
        this._brandHalo = this.add.circle(this.brand.x, this.brand.y - 60, 90, 0xffd24a, 0.25)
          .setDepth(this.brand.depth - 1)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: this._brandHalo,
          alpha: 0.55, scale: 1.3,
          duration: 700, yoyo: true, repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
    };
    this.game.events.on("player-hurt", onPlayerHurt);
    this.game.events.once("player-died", onPlayerDied);
    this.game.events.once("boss-defeated", onBossDefeated);

    // Pause-menu actions — only valid while a game is in progress.
    const onRestart = () => {
      this.scene.stop("HUD");
      this.scene.restart({ level: this.levelNum });
    };
    const onQuit = () => {
      this.scene.stop("HUD");
      import("../audio.js").then(m => m.Music.stop());
      this.scene.start("Menu");
    };
    this.game.events.on("request-restart", onRestart);
    this.game.events.on("request-quit", onQuit);

    // Clean up when this scene instance shuts down so stale handlers don't fire.
    this.events.once("shutdown", () => {
      this.game.events.off("player-hurt", onPlayerHurt);
      this.game.events.off("player-died", onPlayerDied);
      this.game.events.off("boss-defeated", onBossDefeated);
      this.game.events.off("request-restart", onRestart);
      this.game.events.off("request-quit", onQuit);
    });

    // ----- LEVEL INTRO CINEMATIC -----
    const cam = this.cameras.main;
    cam.setZoom(0.92);
    this.physics.pause();
    this.player.body.allowGravity = false;
    this.tweens.add({ targets: cam, zoom: 1.0, duration: 700, ease: "Quad.easeOut" });

    this.time.delayedCall(220, () => {
      const quote = FLAVOR_QUOTES[lvl.name] ?? "Deliver the insight.";
      this.game.events.emit("level-intro", { name: lvl.name, num: this.levelNum, quote });
      SFX.levelStart();
    });
    this.time.delayedCall(1500, () => {
      this.physics.resume();
      this.player.body.allowGravity = true;
      this.showActBanner("Act 1 — " + lvl.name);
    });

    this.actTriggerIdx = 0;

    // Restart hooks
    this.input.keyboard.on("keydown-R", () => {
      // Stop HUD before restarting so it launches fresh and re-wires listeners.
      this.scene.stop("HUD");
      this.scene.restart({ level: this.levelNum });
    });
    this.input.keyboard.on("keydown-M", () => {
      import("../audio.js").then((m) => {
        const muted = m.toggleMuted();
        this.game.events.emit("muted-changed", muted);
      });
    });
  }

  buildGround(x, w) {
    // Top "grass" tile band with darker tiles below. The ground band lives
    // at the level's groundY (defaults to L1's GROUND_TOP_Y) — vertical
    // levels like L6 use a different floor line, so reading from the level
    // data instead of the imported constant matters.
    const groundY = this.level.groundY ?? GROUND_TOP_Y;
    const tilesAcross = Math.ceil(w / TILE_SIZE);
    for (let i = 0; i < tilesAcross; i++) {
      const tx = x + i * TILE_SIZE;
      const top = this.platforms.create(tx + TILE_SIZE / 2, groundY + TILE_SIZE / 2, "tile_grass");
      top.refreshBody();
      // Add 1-2 rows of "dirt" tiles below for visual depth (not collidable).
      this.add.image(tx + TILE_SIZE / 2, groundY + TILE_SIZE * 1.5, "tile_ground").setDepth(-1);
      this.add.image(tx + TILE_SIZE / 2, groundY + TILE_SIZE * 2.5, "tile_ground").setDepth(-1);
    }
  }

  buildPlatform(x, y, wTiles) {
    for (let i = 0; i < wTiles; i++) {
      const tx = x + i * TILE_SIZE;
      const p = this.platforms.create(tx + TILE_SIZE / 2, y + TILE_SIZE / 2, "tile_platform");
      p.body.setSize(TILE_SIZE, 10);
      p.body.setOffset(0, 14);
      p.refreshBody();
    }
  }

  buildBrick(x, y) {
    const b = this.platforms.create(x + TILE_SIZE / 2, y + TILE_SIZE / 2, "tile_brick");
    b.refreshBody();
  }

  buildShaftBrick(x, y) {
    const b = this.platforms.create(x + TILE_SIZE / 2, y + TILE_SIZE / 2, "tile_shaft_wall");
    b.refreshBody();
  }

  /** Jump-through floor — only the TOP of each brick is solid. Player rising
   *  from below passes straight through; player falling lands on top. Used
   *  for the L6 arena cap so the shaft player can enter the bowl. */
  buildOneWayFloor(x1, x2, y, textureKey = "tile_shaft_wall") {
    for (let x = x1; x < x2; x += TILE_SIZE) {
      const b = this.platforms.create(x + TILE_SIZE / 2, y + TILE_SIZE / 2, textureKey);
      b.body.checkCollision.down  = false;
      b.body.checkCollision.left  = false;
      b.body.checkCollision.right = false;
      b.refreshBody();
    }
  }

  /** Themed obstacle — 96×96 sprite with a slightly tighter hitbox so the
   *  pointy tops (picket-fence spikes, marble capital flourish, rope arc)
   *  don't unfairly block jumps. Sits at ground level with the bottom of
   *  the sprite touching GROUND_TOP_Y. */
  buildObstacle(x, key) {
    // Lives in the player-only obstacle group so enemies pass through.
    // Center at GROUND_TOP_Y - 48 so the bottom edge of the 96-tall sprite
    // lands on the ground band, matching every other ground-level entity.
    const o = this.playerObstacles.create(x, GROUND_TOP_Y - 48, key);
    // Tighter hitbox: 80×72 centered horizontally, top 16px non-colliding.
    o.body.setSize(80, 72);
    o.body.setOffset(8, 22);
    o.refreshBody();
    o.isObstacle = true;
    // Texture key cached for the Pascal-surprise check (bulletin board has
    // a "Read the bulletin" interaction; other obstacles ignored).
    o.obstacleKey = key;
    o.standTime = 0;
    o.readDone = false;
    return o;
  }

  /** Pascal surprise — "Read the bulletin." Walk-by trigger: the moment
   *  the player passes within 80 px of a bulletin board, the flyer
   *  tooltip pops above it. Each board fires exactly once per level.
   *  A subtle yellow glow telegraphs proximity from 140 px so the player
   *  notices something's interactive before triggering it. */
  _tickBulletinRead(time, dt) {
    if (!this.player || !this.playerObstacles) return;
    const px = this.player.x, py = this.player.y;
    this.playerObstacles.getChildren().forEach((o) => {
      if (o.obstacleKey !== "obstacle_bulletin_board" || o.readDone) return;
      const dx = Math.abs(px - o.x);
      const dy = Math.abs(py - o.y);
      // Telegraph glow when getting close — yellow tint scaled by distance.
      if (dx < 140 && dy < 140) {
        const t = 1 - (dx / 140);
        o.setTint(Phaser.Display.Color.GetColor(255, 255, 255 * (1 - t * 0.4)));
      } else if (o.tintTopLeft !== 0xffffff) {
        o.clearTint();
      }
      // Walk-by trigger — fire as soon as the player is in proximity.
      if (dx < 80 && dy < 140) {
        o.readDone = true;
        o.clearTint();
        this._spawnBulletinTooltip(o);
      }
    });
  }

  _spawnBulletinTooltip(bulletin) {
    const x = bulletin.x;
    const y = bulletin.y - 70;
    // Tooltip card with the SWIIRL FOR HIRE flyer text.
    const container = this.add.container(x, y).setDepth(60).setAlpha(0);
    const bg = this.add.graphics();
    bg.fillStyle(0xffd24a, 1);
    bg.lineStyle(2, 0x5C3BA3, 1);
    bg.fillRoundedRect(-90, -36, 180, 64, 8);
    bg.strokeRoundedRect(-90, -36, 180, 64, 8);
    // Little arrow pointing down to the board.
    bg.fillStyle(0xffd24a, 1);
    bg.fillTriangle(-8, 28, 8, 28, 0, 40);
    bg.lineStyle(2, 0x5C3BA3, 1);
    bg.lineBetween(-8, 28, 0, 40);
    bg.lineBetween(0, 40, 8, 28);
    const title = this.add.text(0, -22, "SWIIRL  FOR  HIRE", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "12px", fontStyle: "900",
      color: "#5C3BA3", letterSpacing: 2,
    }).setOrigin(0.5);
    const sub = this.add.text(0, -4, "callbacks in < 24h", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "10px",
      color: "#5C3BA3",
    }).setOrigin(0.5);
    const tag = this.add.text(0, 14, "✦  community  insights  ✦", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "9px", fontStyle: "700",
      color: "#5C3BA3", letterSpacing: 2,
    }).setOrigin(0.5);
    container.add([bg, title, sub, tag]);
    // Pop in, hold, fade out.
    this.tweens.add({
      targets: container,
      alpha: 1, y: y - 8,
      duration: 280, ease: "Back.easeOut",
      onComplete: () => {
        this.time.delayedCall(2200, () => {
          this.tweens.add({
            targets: container,
            alpha: 0, y: y - 20,
            duration: 320, ease: "Quad.easeIn",
            onComplete: () => container.destroy(),
          });
        });
      },
    });
    // Tiny audio + score reward so it feels earned.
    import("../audio.js").then(m => m.SFX.collect?.());
    this.addScore?.(50, x, y);
  }

  buildBouncePad(x, y) {
    const p = this.bouncePads.create(x + TILE_SIZE / 2, y + TILE_SIZE / 2, "tile_platform");
    p.setTint(0x7bd389);  // signature green
    p.body.setSize(TILE_SIZE, 14);
    p.body.setOffset(0, 10);
    p.refreshBody();
    // Idle pulse animation so the player can recognize it at a glance.
    this.tweens.add({
      targets: p,
      scaleY: 1.08,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  /** Conveyor belt — orange platform that pushes anything standing on it horizontally. */
  buildConveyor(x, y, wTiles, dir) {
    for (let i = 0; i < wTiles; i++) {
      const tx = x + i * TILE_SIZE;
      const p = this.conveyors.create(tx + TILE_SIZE / 2, y + TILE_SIZE / 2, "tile_platform");
      p.setTint(0xff9d4a);  // orange — signature for "industrial"
      p.body.setSize(TILE_SIZE, 12);
      p.body.setOffset(0, 12);
      p.refreshBody();
      p.beltDir = dir;
      // Marching-arrow visual on top so the direction is unmistakable.
      const arrowChar = dir > 0 ? "▶" : "◀";
      const arrow = this.add.text(tx + TILE_SIZE / 2, y + 18, arrowChar, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        fontStyle: "900",
        color: "#ffffff",
      }).setOrigin(0.5).setDepth(3).setAlpha(0.85);
      // Slide the arrow in its tile direction, looping for a "moving belt" feel.
      this.tweens.add({
        targets: arrow,
        x: arrow.x + dir * 24,
        duration: 600,
        repeat: -1,
        ease: "Linear",
        onRepeat: () => { arrow.x = tx + TILE_SIZE / 2 - dir * 12; },
      });
    }
  }

  /**
   * Per-level ambient particle effects (atmospheric flair, screen-fixed).
   * Each level gets a distinct vibe through drifting visual elements.
   */
  spawnAmbientParticles(levelNum) {
    const VIEW_W = this.cameras.main.width;
    const VIEW_H = this.cameras.main.height;
    const cfg = ({
      1: { color: 0xffe6a0, count: 22, shape: "dot",   size: 3, speed: 30, msMin: 8000, msMax: 14000, dirX: 1, gravity: 18 },   // pollen drifting right
      2: { color: 0xdcc7f2, count: 18, shape: "rect",  size: 6, speed: 50, msMin: 9000, msMax: 14000, dirX: 1, gravity: 12 },   // floating papers
      3: { color: 0xffe6a0, count: 11, shape: "ray",   size: 80, speed: 0,  msMin: 4000, msMax: 7000,  dirX: 0, gravity: 0  },   // god rays
      4: { color: 0x40e0c0, count: 32, shape: "dot",   size: 2, speed: 55, msMin: 4000, msMax: 8000,  dirX: 1, gravity: -30 }, // data bits rising
      5: { color: 0xffd24a, count: 26, shape: "spark", size: 3, speed: 40, msMin: 3000, msMax: 6000,  dirX: 0, gravity: 60 },   // sparks falling
    })[levelNum];
    if (!cfg) return;
    // Mobile budget: each ambient is a tween + game object that respawns on
    // complete, so the cost compounds with count. 40% feels equally lively
    // but lets the frame loop breathe on phone GPUs.
    if (IS_MOBILE) cfg.count = Math.max(3, Math.round(cfg.count * 0.4));

    // Per-level atmospheric haze — a wide tinted overlay that slowly breathes
    // in opacity, giving each environment a distinct "mood" beyond particles.
    const hazeCfg = ({
      1: { color: 0xffe6a0, alpha: 0.05 },  // golden hour park
      2: { color: 0x4060a0, alpha: 0.08 },  // cold office
      3: { color: 0xff8866, alpha: 0.07 },  // amber boardroom
      4: { color: 0x40a0a0, alpha: 0.09 },  // teal server room
      5: { color: 0x8090c8, alpha: 0.07 },  // steel summit
    })[levelNum];
    if (hazeCfg) {
      const haze = this.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, hazeCfg.color, hazeCfg.alpha)
        .setScrollFactor(0).setDepth(-25);
      this.tweens.add({
        targets: haze,
        alpha: hazeCfg.alpha * 1.7,
        duration: 3200,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    const spawn = (initial = false) => {
      const p = (() => {
        if (cfg.shape === "rect") {
          return this.add.rectangle(0, 0, cfg.size, cfg.size * 0.6, cfg.color, 0.6);
        } else if (cfg.shape === "ray") {
          return this.add.rectangle(0, 0, 4, cfg.size, cfg.color, 0.18).setRotation(0.18);
        }
        return this.add.circle(0, 0, cfg.size, cfg.color, 0.8);
      })().setScrollFactor(0).setDepth(-30);

      const startX = initial ? Phaser.Math.Between(0, VIEW_W) : (cfg.dirX > 0 ? -20 : VIEW_W + 20);
      const startY = Phaser.Math.Between(20, VIEW_H - 60);
      p.x = startX; p.y = startY;
      const ms = Phaser.Math.Between(cfg.msMin, cfg.msMax);
      const endX = cfg.dirX > 0 ? VIEW_W + 30 : (cfg.dirX < 0 ? -30 : startX + Phaser.Math.Between(-40, 40));
      const endY = startY + (cfg.gravity ?? 0) * (ms / 1000);
      this.tweens.add({
        targets: p,
        x: endX, y: endY,
        alpha: { from: 0.0, to: 0.7, ease: "Sine.easeInOut" },
        duration: ms,
        ease: "Linear",
        onComplete: () => { p.destroy(); spawn(false); },
      });
    };
    for (let i = 0; i < cfg.count; i++) spawn(true);
  }

  /** L5 — falling glass shard. Telegraphs with ground marker, then crashes down.
   *  Damages on contact, dissolves with sparks on impact. */
  spawnFallingShard(spawner) {
    const px = Phaser.Math.Between(spawner.x1, spawner.x2);
    // Only spawn near the player so off-screen shards aren't wasted.
    if (Math.abs(px - this.player.x) > this.cameras.main.width * 0.7) return;
    const startY = Math.max(0, this.cameras.main.worldView.y - 40);
    // Ground marker telegraph — red dot pulsing where the shard will land.
    const marker = this.add.circle(px, GROUND_TOP_Y - 4, 8, 0xff5c5c, 0.9).setDepth(40);
    this.tweens.add({
      targets: marker, scale: 1.6, alpha: 0.3,
      duration: 280, yoyo: true, repeat: 2,
      onComplete: () => marker.destroy(),
    });
    // Spawn shard projectile after telegraph.
    this.time.delayedCall(700, () => {
      if (!this.projectiles || this.player.body.enable === false) return;
      const shard = this.projectiles.create(px, startY, "projectile_paper");
      shard.setTint(0xc0e0ff);
      shard.setScale(0.7);
      shard.body.setAllowGravity(true);
      shard.body.setVelocityY(380);
      shard.body.setSize(20, 24);
      this.tweens.add({ targets: shard, angle: 720, duration: 1200, repeat: -1 });
      this.time.delayedCall(2400, () => { if (shard.active) shard.destroy(); });
    });
  }

  /** Wind zone — visibly tinted rectangle that pushes the player horizontally
   *  while inside. Animated streaks + arrow tags telegraph the direction. */
  buildWindZone(x, y, w, h, force) {
    const zone = { x, y, w, h, force };
    this.windZones.push(zone);
    const dir = Math.sign(force) || 1;
    // Headwind = warm red tint, tailwind = cool cyan tint. Player reads
    // direction without thinking about it.
    const colorHex = dir > 0 ? 0x9adcff : 0xff8f9a;
    // Tinted fill + visible border (was 0.04 / 0.18 — practically invisible).
    const fill = this.add.rectangle(x + w / 2, y + h / 2, w, h, colorHex, 0.18).setDepth(2);
    fill.setStrokeStyle(2, colorHex, 0.7);
    // Directional arrows tiled across the zone — players can't miss it.
    const arrowChar = dir > 0 ? "▶" : "◀";
    const cols = Math.max(2, Math.floor(w / 120));
    const rows = Math.max(2, Math.floor(h / 120));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ax = x + (c + 0.5) * (w / cols);
        const ay = y + (r + 0.5) * (h / rows);
        const arrow = this.add.text(ax, ay, arrowChar, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "32px", fontStyle: "900",
          color: dir > 0 ? "#9adcff" : "#ff8f9a",
        }).setOrigin(0.5).setDepth(3).setAlpha(0.55);
        // Subtle pulse so the zone reads as ACTIVE, not decorative.
        this.tweens.add({
          targets: arrow, alpha: 0.85, scale: 1.08,
          duration: 600 + Math.random() * 400,
          yoyo: true, repeat: -1,
          delay: (r + c) * 120,
          ease: "Sine.easeInOut",
        });
      }
    }
    // Drifting streak particles for motion.
    for (let i = 0; i < 12; i++) {
      const px = x + Math.random() * w;
      const py = y + Math.random() * h;
      const streak = this.add.rectangle(px, py, 24, 2, colorHex, 0.7).setDepth(4);
      this.tweens.add({
        targets: streak,
        x: dir > 0 ? x + w + 30 : x - 30,
        alpha: 0,
        duration: 1000 + Math.random() * 600,
        repeat: -1,
        delay: Math.random() * 1200,
        onRepeat: () => {
          streak.x = dir > 0 ? x - 30 : x + w + 30;
          streak.y = y + Math.random() * h;
          streak.alpha = 0.7;
        },
      });
    }
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

  addScore(amount, x, y) {
    if (!amount) return;
    const before = this.score;
    this.score += amount;
    this.game.events.emit("score-changed", { score: this.score, delta: amount });
    if (x != null && y != null) {
      this.effects?.comboFloat?.(x, y - 18, `+${amount}`, "#ffd24a");
    }
    // Score milestone celebration — every 5000 points crossed.
    const prevTier = Math.floor(before / 5000);
    const newTier  = Math.floor(this.score / 5000);
    if (newTier > prevTier && newTier > 0) {
      this._celebrateScoreMilestone(newTier * 5000, x, y);
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
    // Stomp rule: position-only — if your feet are above the enemy's upper half,
    // you stomp. No velocity gate (apex-of-jump no longer hurts you when you're
    // clearly above the target). Predictable and readable.
    const stomping = (player.y - 4) < (enemy.y - enemy.displayHeight * 0.5);
    // Active-attack grace: skip CONTACT damage during a swing, but never the
    // stomp resolution — players still want to head-stomp while attacking.
    if (!stomping && this.time.now < (player._attackUntil ?? 0)) return;
    if (stomping) {
      this.combo.bump("stomp");
      const c = this.combo.count;
      this.effects.stompPoof(enemy.x, enemy.y - 30);
      this.effects.punchZoom(0.04, 200);
      this.effects.freezeFrame(60);
      this.effects.shake(0.005, 100);
      enemy.defeat();
      player.bounceOnEnemy();
      SFX.stompAt(c);
      this.effects.squashAndStretch(player, "stomp");
      if (c >= 2) {
        this.effects.comboFloat(enemy.x, enemy.y - 50, `${c}× CHAIN!`, "#ff6b9d");
      }
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
    // Position-only stomp rule (matches handleEnemyCollision).
    const stomping = (player.y - 4) < (this.boss.y - this.boss.displayHeight * 0.55);
    // Active-attack grace: skip CONTACT damage during a swing, but never the
    // stomp resolution — players still want to head-stomp while attacking.
    if (!stomping && this.time.now < (player._attackUntil ?? 0)) return;
    // While invulnerable, nudge away but don't try to damage.
    if (!stomping && this.time.now < player._invulnUntil) {
      const dir = (player.x < this.boss.x) ? -1 : 1;
      player.setVelocityX(dir * 220);
      return;
    }
    if (stomping) {
      this.effects.sparkleBurst(this.boss.x, this.boss.y - 60, 14, 0xffd24a);
      this.effects.stompPoof(this.boss.x, this.boss.y - 60);
      this.effects.punchZoom(0.05, 220);
      this.effects.freezeFrame(80);
      const defeated = this.boss.takeStompHit();
      player.bounceOnEnemy();
      this.effects.squashAndStretch(player, "stomp");
      if (defeated) {
        // boss-defeated event is emitted from takeStompHit() which triggers
        // the cinematic sequence below (subscribed in create()).
        this.time.delayedCall(900, () => this.showActBanner("INSIGHTS UNLOCKED!"));
      } else {
        SFX.stompAt(0);
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

    // Brand-delivery bonus — big payoff at level end.
    this.addScore(2500 + this.player.lives * 500);
    this.time.delayedCall(2200, () => {
      this.scene.stop("HUD");
      this.scene.start("LevelComplete", {
        insights: this.player.insights,
        lives: this.player.lives,
        levelName: this.level.name,
        levelNum: this.levelNum,
        insightsCollected: this.player.insights,
        totalInsights: this.level.insights.length,
        time: Math.floor((this.time.now - this._levelStartTime) / 1000),
        score: this.score,
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

  /**
   * Multi-phase dramatic entrance when the player first enters the boss arena.
   * Replaces the old "snap to visible + show banner" with: slow-mo, camera
   * pull-back, red radial flash, ground tremor, and a swarm of dark motes
   * converging on the boss before it actually becomes hittable.
   */
  triggerBossEntrance() {
    const boss = this.boss;
    const cam = this.cameras.main;
    const name = boss.displayName ?? "BOSS";

    // Boss is visible but not yet active during the cinematic.
    boss.setVisible(true);
    boss.body.enable = false;

    // Swap to the boss chiptune theme.
    import("../audio.js").then(m => m.Music.play("boss"));

    // Phase 1 — instant: stinger shake + red wash + slow-mo dip.
    cam.shake(320, 0.014);
    this.effects.radialFlash(0xff3060, 0.35, 420);
    this.effects.slowMo(0.4, 160, 280, 520);
    SFX.attackConfirm?.();

    // Phase 1b — camera pulls back a touch to reveal the arena.
    const baseZoom = cam.zoom;
    this.tweens.add({
      targets: cam, zoom: baseZoom - 0.05,
      duration: 240, ease: "Quad.easeOut",
      yoyo: true, hold: 320,
    });

    // Phase 2 — boss aura: dark motes converge on the boss, then a single
    // bright pulse fires outward as it "wakes up".
    this.time.delayedCall(280, () => {
      if (!boss.active) return;
      const bx = boss.x, by = boss.y - boss.displayHeight * 0.35;
      for (let i = 0; i < 22; i++) {
        const angle = (i / 22) * Math.PI * 2;
        const r = 220 + Math.random() * 60;
        const sx = bx + Math.cos(angle) * r;
        const sy = by + Math.sin(angle) * r * 0.6;
        const dot = this.add.circle(sx, sy, 4, 0xff5c5c, 1).setDepth(50);
        this.tweens.add({
          targets: dot,
          x: bx, y: by,
          alpha: 0, scale: 0.3,
          duration: 520 + Math.random() * 180,
          ease: "Quad.easeIn",
          onComplete: () => dot.destroy(),
        });
      }
      // Outward pulse ring on arrival.
      this.time.delayedCall(560, () => {
        if (!boss.active) return;
        this.effects.bossShockwave(bx, by);
      });
    });

    // Phase 3 — announce + HUD bar + activate hitbox.
    this.time.delayedCall(820, () => {
      this.game.events.emit("boss-name", name);
      this.showActBanner(name);
      this.game.events.emit("boss-health", { current: boss.health, max: boss.maxHealth });
      if (boss.active) boss.body.enable = true;
    });
  }

  /** Celebrates crossing every 5000-point threshold with a screen flash,
   *  big sparkle burst, comboFloat, and a satisfying chord. */
  _celebrateScoreMilestone(milestone, x, y) {
    const cam = this.cameras.main;
    cam.flash(260, 255, 235, 170);
    cam.shake(220, 0.008);
    const px = x ?? this.player.x;
    const py = (y ?? this.player.y) - 40;
    this.effects.sparkleBurst(px, py, 24, 0xffd24a);
    this.effects.comboFloat(px, py - 32, `${(milestone / 1000).toFixed(0)}K!`, "#ffd24a");
    SFX.collectAt?.(8);
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
    if (this.bgDataLake.alpha > 0)  this.bgDataLake.tilePositionX  = cam.scrollX * 0.5;
    if (this.bgExecutive.alpha > 0) this.bgExecutive.tilePositionX = cam.scrollX * 0.5;

    // Camera stays level — the previous "lean into direction" experiment
    // read as motion-sickness, not speed. Removed.
    if (cam.rotation !== 0) cam.rotation = 0;

    // Crossfade to tower bg when entering the boss arena.
    // Horizontal levels trigger the boss arena when player.x crosses
    // bossArenaStart; vertical levels (L6) use bossArenaTop and trigger
    // when player.y rises ABOVE it (smaller y = higher up).
    const inBossArena = this.boss && (
      this.level.bossArenaTop != null
        ? this.player.y < this.level.bossArenaTop
        : this.player.x > this.level.bossArenaStart
    );
    if (inBossArena) {
      this.bgTower.setAlpha(Math.min(1, this.bgTower.alpha + 0.01));
      this.bgNear.setAlpha(Math.max(0.3, this.bgNear.alpha - 0.005));
      if (!this.bossActive && !this.boss.dead) {
        this.bossActive = true;
        this.triggerBossEntrance();
      }
    }

    // Act banners from level data. Horizontal triggers compare player.x to
    // the trigger's .x; vertical triggers (act-marker has a .y) fire when
    // the player has climbed PAST the y (lower y = higher up). This lets
    // the bonus level fire act banners as the player ascends the shaft.
    if (this.level.actTriggers && this.actTriggerIdx < this.level.actTriggers.length) {
      const next = this.level.actTriggers[this.actTriggerIdx];
      const fired = (next.y != null)
        ? (this.player.y < next.y)
        : (this.player.x > next.x);
      if (fired) {
        this.actTriggerIdx++;
        this.showActBanner(next.banner);
      }
    }

    // Pascal surprise — "Read the bulletin." Standing still next to a
    // community bulletin board for ~1.5 s reveals a tooltip with the
    // SWIIRL FOR HIRE flyer. Each board fires once per level. Spike v1.
    this._tickBulletinRead(time, dt);

    // Insight magnetism — orbs gravitate toward the player when nearby.
    if (this.insights && this.player.body.enable) {
      const px = this.player.x, py = this.player.y - 30;
      const R = 130 * (this.player._charMagnetMul ?? 1), R2 = R * R;
      this.insights.getChildren().forEach(orb => {
        if (!orb.active) return;
        const dx = px - orb.x, dy = py - orb.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < R2 && d2 > 64) {
          const f = (1 - Math.sqrt(d2) / R) * 0.22;
          orb.x += dx * f;
          orb.y += dy * f;
        }
      });
    }

    // Combo decay (auto-resets after inactivity).
    this.combo?.update(time);

    // ----- HAZARDS -----
    // Conveyor belts: push anything standing on them.
    if (this.conveyors && this.player.body.enable) {
      const px = this.player.x;
      const py = this.player.y;
      const grounded = this.player.body.blocked.down || this.player.body.touching.down;
      if (grounded) {
        for (const belt of this.conveyors.getChildren()) {
          if (!belt.body) continue;
          const left = belt.body.x;
          const right = belt.body.x + belt.body.width;
          const beltTop = belt.body.y;
          if (px < left - 4 || px > right + 4) continue;
          if (Math.abs(py - beltTop) > 12) continue;
          // Snap player to belt speed unless they're actively fighting it.
          // Previous additive force was overwritten by Player.preUpdate's
          // own velocity logic each frame — net push was ~22 px/s, nowhere
          // near "conveyor" feel. Now: if player's velocity in the belt
          // direction is below belt speed AND they're not pressing the
          // opposite direction (>40 px/s opposing), force vx to belt speed.
          const beltSpeed = belt.beltDir * 220;
          const vx = this.player.body.velocity.x;
          if (belt.beltDir > 0 && vx < beltSpeed && vx > -40) {
            this.player.body.velocity.x = beltSpeed;
          } else if (belt.beltDir < 0 && vx > beltSpeed && vx < 40) {
            this.player.body.velocity.x = beltSpeed;
          }
          break;
        }
      }
    }

    // Wind zones: continuously push the player while they're inside the zone.
    if (this.windZones && this.windZones.length > 0 && this.player.body.enable) {
      const px = this.player.x;
      const py = this.player.y;
      for (const w of this.windZones) {
        if (px >= w.x && px <= w.x + w.w && py >= w.y && py <= w.y + w.h) {
          this.player.body.velocity.x += w.force * (dt / 1000);
          this.player.body.velocity.x = Phaser.Math.Clamp(this.player.body.velocity.x, -640, 640);
        }
      }
    }

    // Falling shard spawners (L5).
    if (this.fallingShardSpawners && this.fallingShardSpawners.length > 0) {
      for (const sp of this.fallingShardSpawners) {
        if (time - sp.lastSpawn > sp.interval) {
          sp.lastSpawn = time;
          this.spawnFallingShard(sp);
        }
      }
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
        // Respawn at last reached checkpoint.
        this.time.delayedCall(500, () => {
          let respawnX = this.level.spawn.x;
          if (this.level.checkpoints) {
            for (const cp of this.level.checkpoints) {
              if (this.player.x > cp.after) respawnX = cp.respawnX;
            }
          }
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
