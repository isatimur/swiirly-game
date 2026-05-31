// Combo.js — combo/multiplier state holder + Frenzy escalation.
// Owned by the Game scene: `this.combo = new Combo(this, 2000)`.
// Call `combo.bump("insight"|"stomp"|"hit")` on each scoring event,
// `combo.update(time)` once per frame to handle decay and frenzy timer.

import { COMBO_POWER } from "../config.js";

const FRENZY_THRESHOLD = 10;   // count at which Frenzy fires
const FRENZY_DURATION  = 5000; // ms — duration after entering Frenzy
const FRENZY_COOLDOWN  = 8000; // ms — block re-trigger right after a Frenzy ends

export class Combo {
  constructor(scene, decayMs = 2000) {
    this.scene = scene;
    this.decayMs = decayMs;
    this.count = 0;
    this._lastBump = -Infinity;
    this._frenzyEndsAt   = -Infinity;
    this._frenzyArmedAt  = -Infinity;
    this.frenzyActive    = false;
  }

  // While Frenzy is active, the multiplier is doubled (capped) — turns the
  // peak combo state into a tangible score reward, not just visual drama.
  get multiplier() {
    const base = Math.min(5, 1 + Math.floor(this.count / 3));
    return this.frenzyActive ? Math.min(10, base * 2) : base;
  }

  // ----- Combo → power (pure: no Phaser, no side effects) -----
  // Power scales off the live `count`, so a decayed/reset combo (count → 0)
  // automatically drops power back to tier 0. Frenzy implies at least tier 2.
  get powerTier() {
    if (this.frenzyActive) return 2;
    if (this.count >= COMBO_POWER.tier2) return 2;
    if (this.count >= COMBO_POWER.tier1) return 1;
    return 0;
  }

  // +bonusDamageT1 once we hit tier 1 or higher; otherwise none.
  get bonusDamage() {
    return this.powerTier >= 1 ? COMBO_POWER.bonusDamageT1 : 0;
  }

  // Tier 2 lets attacks chunk through the per-attackId hit dedupe.
  get pierce() {
    return this.powerTier >= 2;
  }

  bump(/* kind */) {
    this.count += 1;
    this._lastBump = this.scene.time.now;
    // Cross the Frenzy threshold from below → enter Frenzy (with cooldown).
    if (this.count === FRENZY_THRESHOLD && !this.frenzyActive) {
      const now = this.scene.time.now;
      if (now - this._frenzyArmedAt > FRENZY_COOLDOWN) {
        this._enterFrenzy(now);
      }
    }
    this._emit();
  }

  reset() {
    if (this.count === 0 && !this.frenzyActive) return;
    this.count = 0;
    if (this.frenzyActive) this._exitFrenzy(); // hard-cut on damage
    this._emit();
  }

  update(time) {
    // Frenzy ends naturally after its duration regardless of combo.
    if (this.frenzyActive && time >= this._frenzyEndsAt) {
      this._exitFrenzy();
      this._emit();
    }
    // Combo decays after inactivity. Don't decay during Frenzy — give the
    // player breathing room to keep chaining without auto-resetting.
    if (this.count > 0 && !this.frenzyActive && time - this._lastBump > this.decayMs) {
      this.reset();
    }
  }

  _enterFrenzy(now) {
    this.frenzyActive = true;
    this._frenzyEndsAt = now + FRENZY_DURATION;
    this._frenzyArmedAt = this._frenzyEndsAt; // for cooldown gate
    this.scene.game.events.emit("frenzy-start", { duration: FRENZY_DURATION });
  }

  _exitFrenzy() {
    this.frenzyActive = false;
    this._frenzyEndsAt = -Infinity;
    this.scene.game.events.emit("frenzy-end");
  }

  _emit() {
    this.scene.game.events.emit("combo-changed", {
      count: this.count,
      multiplier: this.multiplier,
      frenzy: this.frenzyActive,
    });
  }
}
