// Per-persona combat behaviors.
//
// Each handler is called from Player.attack(time) when the attack input is
// pressed and the cooldown has elapsed. The handler spawns the right kind of
// short-lived sprite into scene.playerAttacks (an arcade physics group) and
// sets the player's _attackUntil window for VFX / state-machine purposes.
//
// Spawned objects MUST set:
//   - body sized to the hit volume
//   - body.allowGravity = false (Phaser default is true for dynamic bodies)
//   - .damage  number          — how much HP to subtract per overlap
//   - .pierce  boolean=false   — true means it stays alive after hitting
//   - .friendly = true         — for any future filtering
//
// scene.physics.add.overlap() between playerAttacks and enemies/boss runs the
// damage path in Game.js — these functions do not deal damage themselves.

import { SFX } from "../audio.js";
import { ATTACK_TUNING } from "../characters.js";

// Globally-unique attack instance ID. Each ATTACKS.xxx call mints one; every
// hitbox/projectile spawned by that call shares it. This is what we dedupe on
// in EnemyBase.takePlayerHit, so two SEPARATE attacks (e.g. consecutive
// swipes 320ms apart) never collide in the dedupe window — only multi-hitbox
// strikes from the same press (e.g. ground-pound's two side waves) do.
let _attackUid = 0;
function nextAttackId(base) { return `${base}#${++_attackUid}`; }

function spawnHitbox(scene, x, y, w, h, ms, damage, opts = {}) {
  // A rectangle is the cheapest way to get a short-lived physics body that
  // overlaps with the enemy group. The rectangle is fully transparent — the
  // visual feedback is the VFX layer (slash arc, shockwave ring, etc.).
  const rect = scene.add.rectangle(x, y, w, h, 0xffffff, 0);
  scene.physics.add.existing(rect);
  rect.body.setAllowGravity(false);
  rect.body.setImmovable(true);
  rect.damage   = damage;
  rect.knockbackX = opts.knockbackX ?? 200;
  rect.pierce   = opts.pierce ?? false;
  rect.friendly = true;
  rect.attackId = opts.attackId ?? "hitbox";
  scene.playerAttacks.add(rect);
  scene.time.delayedCall(ms, () => { if (rect && rect.active) rect.destroy(); });
  return rect;
}

function spawnProjectile(scene, x, y, vx, vy, lifeMs, damage, tint, opts = {}) {
  // Prefer the painted vfx_bolt flipbook (looping animation, baked-in trail).
  // The art is directional, so we flip horizontally for left-bound shots
  // instead of spinning the sprite.
  const useVfx = scene.textures.exists("vfx_bolt_1") && scene.anims.exists("vfx_bolt_anim");
  const tex = useVfx ? "vfx_bolt_1" : "insight";
  const p = scene.playerAttacks.create(x, y, tex);
  if (useVfx) {
    p.setBlendMode(Phaser.BlendModes.ADD);
    p.setScale(0.42);
    p.setFlipX(vx < 0);
    p.play("vfx_bolt_anim");
  } else {
    p.setScale(0.65);
    p.setTint(tint);
    scene.tweens.add({ targets: p, angle: 360, duration: 500, repeat: -1 });
  }
  p.body.setAllowGravity(false);
  // Tall body so the projectile reaches both standing AND ground-level
  // enemies (paperwork piles are short — a 28×28 box flew over them).
  p.body.setSize(28, 56);
  p.setVelocity(vx, vy);
  p.damage = damage;
  p.knockbackX = opts.knockbackX ?? 180;
  p.pierce = opts.pierce ?? false;
  p.friendly = true;
  p.attackId = "bolt";
  scene.time.delayedCall(lifeMs, () => { if (p && p.active) p.destroy(); });
  return p;
}

// ============================================================================
// VFX HELPERS — visual flair only, no damage logic
// ============================================================================

// Slash arc — uses the vfx_swipe_anim sprite flipbook when loaded (gold
// crescent with sparkles and streaks baked in), or falls back to the
// programmatic crescent + hit-flash + motion-streak combo.
function slashArc(scene, x, y, facing, color = 0xffd24a, size = 1.0) {
  if (scene.textures.exists("vfx_swipe_1") && scene.anims.exists("vfx_swipe_anim")) {
    const slash = scene.add.sprite(
      x + facing * 50 * size,
      y - 64,
      "vfx_swipe_1"
    ).setDepth(18);
    slash.setBlendMode(Phaser.BlendModes.ADD);
    slash.setScale(size * 1.25);
    slash.setFlipX(facing < 0);
    // Heavy chain still passes a pink tint — preserve it.
    if (color !== 0xffd24a && color !== 0xffffff) slash.setTint(color);
    slash.play("vfx_swipe_anim");
    slash.once("animationcomplete", () => slash.destroy());
    return;
  }
  // ----- fallback (graphics-based) -----
  const cx = x + facing * 16 * size;
  const cy = y - 64;
  const R1 = 62 * size;        // outer radius of the crescent
  const R2 = 30 * size;        // inner radius — the "cut-out"

  // Angle band relative to facing axis. baseStart is -60° (top-front),
  // baseEnd is +60° (bottom-front). For left-facing we mirror through π.
  const baseStart = -Math.PI / 3;
  const baseEnd   =  Math.PI / 3;
  const startA = facing > 0 ? baseStart : Math.PI - baseStart;
  const endA   = facing > 0 ? baseEnd   : Math.PI - baseEnd;
  const ccw    = facing > 0 ? false : true;

  // 1) Filled crescent body — bright, semi-transparent, scales up + fades.
  const body = scene.add.graphics().setDepth(18);
  body.fillStyle(color, 0.85);
  body.beginPath();
  body.arc(cx, cy, R1, startA, endA, ccw);
  body.arc(cx, cy, R2, endA, startA, !ccw);
  body.closePath();
  body.fillPath();
  // Bright leading edge highlight.
  body.lineStyle(3, 0xffffff, 0.95);
  body.beginPath();
  body.arc(cx, cy, R1, startA, endA, ccw);
  body.strokePath();
  scene.tweens.add({
    targets: body,
    alpha: 0,
    scaleX: 1.18, scaleY: 1.18,
    duration: 200,
    ease: "Quad.easeOut",
    onComplete: () => body.destroy(),
  });

  // 2) Hit-flash starburst at the leading tip of the swing (front-center).
  const tipX = cx + Math.cos(facing > 0 ? 0 : Math.PI) * R1 * 0.85;
  const tipY = cy + Math.sin(facing > 0 ? 0 : Math.PI) * R1 * 0.85;
  const flash = scene.add.star(tipX, tipY, 5, 4, 14, 0xffffff, 0.95)
    .setDepth(19).setRotation(facing > 0 ? 0 : Math.PI);
  scene.tweens.add({
    targets: flash,
    scale: 1.6, alpha: 0,
    duration: 220, ease: "Quad.easeOut",
    onComplete: () => flash.destroy(),
  });

  // 3) Two motion streaks trailing behind the swing direction.
  for (let i = 0; i < 2; i++) {
    const offset = (i === 0 ? -1 : 1) * 14;
    const streak = scene.add.rectangle(
      cx + facing * (R1 * 0.55), cy + offset,
      R1 * 1.05, 3, color, 0.7
    ).setOrigin(0, 0.5).setDepth(17);
    streak.setRotation(facing > 0 ? 0 : Math.PI);
    if (facing < 0) streak.x -= R1 * 1.05; // re-anchor for left-facing
    scene.tweens.add({
      targets: streak,
      x: streak.x + facing * 28,
      scaleX: 1.4, alpha: 0,
      duration: 220 + i * 40,
      ease: "Quad.easeOut",
      onComplete: () => streak.destroy(),
    });
  }
}

// Two concentric scaling rings — used for ground-pound + heavy-chain impact.
function shockwaveRing(scene, x, y, radius, color, ms = 360) {
  // Outer ring.
  const outer = scene.add.circle(x, y, radius, color, 0).setStrokeStyle(5, color, 1).setDepth(17);
  outer.setScale(0.1);
  scene.tweens.add({
    targets: outer, scale: 1.0, alpha: { from: 0.95, to: 0 },
    duration: ms, ease: "Quad.easeOut", onComplete: () => outer.destroy(),
  });
  // Inner ring — staggered + brighter for layered feel.
  const inner = scene.add.circle(x, y, radius * 0.7, 0xffffff, 0).setStrokeStyle(3, 0xffffff, 1).setDepth(18);
  inner.setScale(0.1);
  scene.tweens.add({
    targets: inner, scale: 1.0, alpha: { from: 0.85, to: 0 },
    duration: ms * 0.85, delay: 40, ease: "Quad.easeOut",
    onComplete: () => inner.destroy(),
  });
}

// Glowing trail behind a projectile — call every frame from the projectile's
// tween or once at spawn. We use the simpler "spawn once" form: 4 fading
// after-images at the spawn point, each puffing outward slightly.
function projectileTrail(scene, x, y, color) {
  for (let i = 0; i < 4; i++) {
    const glow = scene.add.circle(x, y, 10 - i * 1.5, color, 0.5 - i * 0.1).setDepth(15);
    scene.tweens.add({
      targets: glow, alpha: 0, scale: 0.4,
      duration: 220 + i * 60, ease: "Quad.easeOut",
      onComplete: () => glow.destroy(),
    });
  }
}

// Ground impact: cracks radiating + dust ring. Used for ground-pound.
function groundCracks(scene, x, y, range, color) {
  // Painted sprite version. ADD blend mode means dark pixels are invisible
  // (no rectangular halo around the glow), and the scale is capped so the
  // ring isn't bigger than the actual gameplay range it represents.
  if (scene.textures.exists("vfx_pound_1") && scene.anims.exists("vfx_pound_anim")) {
    const shock = scene.add.sprite(x, y - 8, "vfx_pound_1").setDepth(17);
    shock.setBlendMode(Phaser.BlendModes.ADD);
    shock.setScale(1.2);
    shock.play("vfx_pound_anim");
    shock.once("animationcomplete", () => shock.destroy());
    return;
  }
  // Fallback — programmatic ring + cracks.
  shockwaveRing(scene, x, y, range, color, 420);
  // Radial cracks — 5 jagged lines outward at random angles in a forward fan.
  const g = scene.add.graphics().setDepth(16);
  g.lineStyle(3, 0x1a0f2e, 0.9);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI + (i / 4) * Math.PI; // 180° fan above the ground line
    const len = range * (0.55 + Math.random() * 0.35);
    const midX = x + Math.cos(a) * len * 0.5;
    const midY = y + Math.sin(a) * len * 0.5 + 4;
    const endX = x + Math.cos(a) * len;
    const endY = y + Math.sin(a) * len;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(midX, midY);
    g.lineTo(endX, endY);
    g.strokePath();
  }
  scene.tweens.add({
    targets: g, alpha: 0,
    duration: 500, ease: "Quad.easeIn",
    onComplete: () => g.destroy(),
  });
}

// Shield held in front of the player during a shieldBash. Returns the object
// so the caller can clean it up when the dash window ends.
function shieldGraphic(scene, player, facing, durationMs, color = 0xffd24a) {
  // Clean drawn kite-shield. The painted vfx_bash sprite carried too many
  // surrounding effects + leftover background bleed; the simple shape
  // reads more clearly as "shield" during the dash.
  const g = scene.add.graphics().setDepth(20);
  // Kite shield profile: wide top, pointed bottom.
  g.fillStyle(color, 0.85);
  g.lineStyle(3, 0x1a0f2e, 1);
  g.beginPath();
  g.moveTo(-18, -32);
  g.lineTo(18, -32);
  g.lineTo(22, 6);
  g.lineTo(0, 36);
  g.lineTo(-22, 6);
  g.closePath();
  g.fillPath();
  g.strokePath();
  // Cross emblem.
  g.lineStyle(3, 0x1a0f2e, 0.7);
  g.beginPath();
  g.moveTo(0, -24); g.lineTo(0, 24);
  g.moveTo(-14, 0); g.lineTo(14, 0);
  g.strokePath();
  g._followPlayer = player;
  g._followOffsetX = facing * 36;
  g._followOffsetY = -72;
  g.x = player.x + g._followOffsetX;
  g.y = player.y + g._followOffsetY;
  // Pulse + fade-out at the end of the dash window.
  scene.tweens.add({
    targets: g,
    scale: 1.1,
    duration: durationMs * 0.5,
    yoyo: true,
    ease: "Sine.easeInOut",
  });
  scene.time.delayedCall(durationMs, () => {
    scene.tweens.add({
      targets: g, alpha: 0, scale: 1.3,
      duration: 140, ease: "Quad.easeOut",
      onComplete: () => g.destroy(),
    });
  });
  return g;
}

// Upward streak when the player jumps for ground-pound. Quick vertical line.
function leapStreak(scene, x, y, color) {
  const s = scene.add.rectangle(x, y - 30, 6, 60, color, 0.6).setDepth(15);
  scene.tweens.add({
    targets: s, scaleY: 1.6, alpha: 0,
    duration: 240, ease: "Quad.easeOut",
    onComplete: () => s.destroy(),
  });
}

// ============================================================================
// PER-PERSONA HANDLERS
// ============================================================================

export const ATTACKS = {
  // SWIIRL — single arc swipe in front, deals 1 damage.
  // Crouched: hitbox drops from chest (-80) to crouched-torso (-36) so short
  // enemies (DeadlineBot, PaperworkPile) sit inside the arc reliably.
  swipe(player, time) {
    const t = ATTACK_TUNING.swipe;
    const scene = player.scene;
    const x = player.x + player.facing * (t.range / 2 + 8);
    const y = player.y + (player.state === "crouch" ? -36 : -80);
    spawnHitbox(scene, x, y, t.range, t.height, t.hitboxMs, t.damage, {
      knockbackX: t.knockbackX, attackId: nextAttackId("swipe"),
    });
    slashArc(scene, player.x, player.y, player.facing, 0xffd24a);
    SFX.attackSwipe?.();
    player._attackUntil = time + t.hitboxMs;
    return t.cooldown;
  },

  // SCOUT — ranged bolt traveling in facing direction.
  bolt(player, time) {
    const t = ATTACK_TUNING.bolt;
    const scene = player.scene;
    const vx = player.facing * t.projectileSpeed;
    const startX = player.x + player.facing * 18;
    // Bolt origin: mid-torso (-56) when standing so the 56-tall body covers
    // both standing and short enemies. Crouched, it drops to -36 so the shot
    // passes THROUGH short enemies (DeadlineBot) instead of over their heads.
    const startY = player.y + (player.state === "crouch" ? -36 : -56);
    const boltP = spawnProjectile(scene, startX, startY, vx, 0, t.projectileLife, t.damage, 0x9adcff);
    boltP.attackId = nextAttackId("bolt");
    projectileTrail(scene, startX, startY, 0x9adcff);
    // Small "throw" puff at the player's hand.
    scene.effects?.dustPuff?.(startX, startY, { color: 0xcfe9ff, count: 3, scale: 0.5, ms: 240 });
    SFX.attackBolt?.();
    player._attackUntil = time + 140;
    return t.cooldown;
  },

  // BRUISER — leap-and-slam. Air: snap down + shockwave on land.
  //          Ground: short hop + shockwave on land.
  groundPound(player, time) {
    const t = ATTACK_TUNING.groundPound;
    const scene = player.scene;
    const grounded = player.body.blocked.down || player.body.touching.down;
    // Tag this pound with one shared attack-id so both side-hitboxes that
    // spawn on landing dedupe to a single strike against any one target.
    player._poundInstanceId = nextAttackId("ground_pound");
    leapStreak(scene, player.x, player.y, 0xff6b6b);
    if (grounded) {
      player.setVelocityY(t.leapVy);
      player._isJumping = true;
      // After a brief upward window, slam downward.
      scene.time.delayedCall(180, () => {
        if (!player.active) return;
        player.setVelocityY(t.slamVy);
        player._pendingPound = true;
      });
    } else {
      player.setVelocityY(t.slamVy);
      player._pendingPound = true;
    }
    SFX.attackPound?.();
    player._attackUntil = time + 240;
    return t.cooldown;
  },

  // SPARK — light swipe that chains. Hold-then-release triggers a heavy hit.
  // Crouched: same hitbox-y drop as swipe so the chain combo works from low pose.
  chain(player, time) {
    const t = ATTACK_TUNING.chain;
    const scene = player.scene;
    const heavy = player._heavyCharging && (time - player._heavyChargeStart) >= t.heavyChargeMs;
    const range  = heavy ? t.heavyRange : t.range;
    const damage = heavy ? t.heavyDamage : t.damage;
    const x = player.x + player.facing * (range / 2 + 6);
    const y = player.y + (player.state === "crouch" ? -36 : -80);
    spawnHitbox(scene, x, y, range, t.height, t.hitboxMs, damage, {
      knockbackX: t.knockbackX, attackId: nextAttackId(heavy ? "chain_heavy" : "chain_light"),
    });
    // Heavy swing reads as bigger + tinted pink.
    slashArc(scene, player.x, player.y, player.facing,
             heavy ? 0xff8fbe : 0xffffff, heavy ? 1.25 : 0.9);
    if (heavy) {
      shockwaveRing(scene, x, player.y - 30, 90, 0xff8fbe);
      SFX.attackHeavy?.();
    } else {
      SFX.attackSwipe?.();
    }
    player._heavyCharging = false;
    player._heavyChargeStart = 0;
    player._attackUntil = time + t.hitboxMs;
    return heavy ? t.cooldown + 120 : t.cooldown;
  },

  // WHIRLWIND — 360° spin striking both sides simultaneously.
  whirlwind(player, time) {
    const t = ATTACK_TUNING.whirlwind;
    const scene = player.scene;
    const y = player.y + (player.state === "crouch" ? -36 : -80);
    const id = nextAttackId("whirlwind");
    spawnHitbox(scene, player.x + (t.range / 2 + 8), y, t.range, t.height, t.hitboxMs, t.damage, {
      knockbackX: t.knockbackX, attackId: id,
    });
    spawnHitbox(scene, player.x - (t.range / 2 + 8), y, t.range, t.height, t.hitboxMs, t.damage, {
      knockbackX: t.knockbackX, attackId: id,
    });
    slashArc(scene, player.x, player.y, +1, 0xc77dff);
    slashArc(scene, player.x, player.y, -1, 0xc77dff);
    shockwaveRing(scene, player.x, y, 80, 0xc77dff);
    SFX.attackHeavy?.();
    player._attackUntil = time + t.hitboxMs;
    return t.cooldown;
  },

  // BOOMERANG — thrown projectile that reverses and flies back through the player.
  // pierce: true so it hits on the way out AND on the return pass; dedup window
  // (~200ms in EnemyBase) means each enemy still takes at most one hit per pass.
  boomerang(player, time) {
    const t = ATTACK_TUNING.boomerang;
    const scene = player.scene;
    const vx = player.facing * t.projectileSpeed;
    const startX = player.x + player.facing * 18;
    const startY = player.y + (player.state === "crouch" ? -36 : -56);
    const p = spawnProjectile(scene, startX, startY, vx, 0, t.projectileLife, t.damage, 0xff8f9c, {
      knockbackX: t.knockbackX, pierce: true,
    });
    p.attackId = nextAttackId("boomerang");
    // Force spin so it reads as a thrown disc regardless of which texture branch loaded.
    scene.tweens.add({ targets: p, angle: 360, duration: 400, repeat: -1 });
    // Reverse direction after outMs — guard against body being gone if enemy
    // destroyed the projectile or it hit its lifeMs timer first.
    scene.time.delayedCall(t.outMs, () => {
      if (p && p.active && p.body) p.body.setVelocityX(-vx);
    });
    projectileTrail(scene, startX, startY, 0xff8f9c);
    SFX.attackBolt?.();
    player._attackUntil = time + 140;
    return t.cooldown;
  },

  // GUARDIAN — short dash with a forward hitbox that also doubles as a parry.
  // Crouched: shield arc drops to crouched-torso height so a bash from crouch
  // hits low enemies and parries low projectiles.
  shieldBash(player, time) {
    const t = ATTACK_TUNING.shieldBash;
    const scene = player.scene;
    const yOffset = player.state === "crouch" ? -36 : -80;
    player.setVelocityX(player.facing * t.dashSpeed);
    player._bashEndAt = time + t.dashMs;
    const x = player.x + player.facing * (t.range / 2 + 6);
    const y = player.y + yOffset;
    const hb = spawnHitbox(scene, x, y, t.range, t.height, t.hitboxMs, t.damage, {
      knockbackX: 280, attackId: nextAttackId("shield_bash"), pierce: true,
    });
    hb.parry = !!t.parry;
    hb._followPlayer = player;
    hb._followOffsetX = player.facing * (t.range / 2 + 6);
    hb._followOffsetY = yOffset;
    // Big visible shield held in front during the dash.
    shieldGraphic(scene, player, player.facing, t.dashMs, 0xffd24a);
    // A small leading swipe arc to sell the impact moment.
    slashArc(scene, player.x, player.y, player.facing, 0xffd24a, 0.85);
    SFX.attackBash?.();
    player._attackUntil = time + t.dashMs;
    return t.cooldown;
  },
};

// Called from Player.preUpdate to keep follow-attached hitboxes glued to the
// player (used by Guardian's shield bash during the dash window). Also moves
// any follow-attached display objects we tagged outside the playerAttacks
// group (currently the shield-bash shield graphic).
export function tickFollowingHitboxes(scene) {
  if (scene.playerAttacks) {
    scene.playerAttacks.getChildren().forEach((a) => {
      if (a._followPlayer && a.active) {
        a.x = a._followPlayer.x + a._followOffsetX;
        a.y = a._followPlayer.y + a._followOffsetY;
      }
    });
  }
  // Visual followers (not in playerAttacks group). We walk scene's display list
  // once and only act on objects we tagged with _followPlayer.
  scene.children.list.forEach((obj) => {
    if (obj._followPlayer && obj.active && !scene.playerAttacks?.contains?.(obj)) {
      obj.x = obj._followPlayer.x + obj._followOffsetX;
      obj.y = obj._followPlayer.y + obj._followOffsetY;
    }
  });
}

// Public so Player.js can call this on ground-pound landing.
export function poundImpactVFX(scene, x, y, range) {
  groundCracks(scene, x, y, range, 0xff8866);
}
