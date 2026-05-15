// Tunable game constants. Edit these and reload — no rebuild required.

export const VIEW = {
  width: 1280,
  height: 720,
};

// Mobile detection — read ONCE at module load (coarse pointer = touch device).
// Used to dial down particle counts, skip combo ghost trail, and otherwise
// keep the frame budget under control on phone GPUs. Desktop stays untouched.
export const IS_MOBILE = (typeof window !== "undefined")
  && (window.matchMedia?.("(pointer: coarse)").matches
      || (window.innerWidth ?? 9999) < 820);

export const PALETTE = {
  deep: 0x5c3ba3,
  mid: 0x8b63c9,
  lilac: 0xb892e0,
  mist: 0xdcc7f2,
  fog: 0xeee6f5,
  white: 0xffffff,
  insight: 0xffd24a,
  insightLight: 0xfff6cc,
  shield: 0x7dc4ff,
  growth: 0x7bd389,
  speed: 0xff8fbe,
  brandYellow: 0xffd24a,
  enemyDark: 0x3a3d44,
  hurt: 0xff5c5c,
};

export const PHYSICS = {
  // World gravity. Faster than realistic — platformers want a snappy fall.
  gravity: 2200,

  // Movement.
  walkSpeed: 280,
  runSpeed: 460,
  groundAccel: 2400,   // px/s² when input matches velocity direction (snappy stop/start)
  groundDecel: 3000,   // px/s² when no input or reversing (faster stop than start)
  airAccel: 1400,      // smaller mid-air control to keep jumps deliberate
  airDecel: 800,

  // Jump — classic Mario-style "cut on release":
  // Press = full jumpVelocity. Release before apex = velocity halved (short hop).
  // First jump and double-jump use the same impulse so the chain is predictable.
  // With gravity 2200, max single height = vy²/(2g) = 880²/4400 ≈ 176 px.
  // Double-jumped chain reaches ~352 px — clears every platform in level1.
  jumpVelocity: -880,
  doubleJumpVelocity: -840, // slightly weaker so the second hop is recognizable
  maxJumps: 2,              // 1 = single-jump only, 2 = double-jump
  shortHopVelocityCap: -380,
  coyoteTime: 110,
  jumpBuffer: 130,

  slideDuration: 400,   // ms — how long a slide lasts
  slideDecel: 1800,     // px/s² — friction during slide

  // Damage feedback.
  knockback: { x: 360, y: -520 },
  invulnDuration: 1300,
  hurtStunDuration: 280,
};

export const PLAYER = {
  startLives: 3,
  brandThreshold: 12,
  insightToLife: 50,
  // The uniform 280x320 sprite displayed at 0.55 puts the visible character
  // back to the same size as the v1 sprites (~70x100 on screen).
  spriteScale: 0.55,
  // Hitbox in source-image pixels (the 280x320 canvas), bottom-center.
  // Tighter than the visible character so the fluffy hat doesn't trigger hits.
  hitbox: { width: 110, height: 200, offsetX: 85, offsetY: 120 },
  slideHitbox: { width: 110, height: 100, offsetX: 85, offsetY: 220 },
};

export const SIGNAL_DURATIONS = {
  speed: 9000,
  shield: 12000,
  growth: 11000,
};
