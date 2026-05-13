// Combo.js — small state holder for the combo/multiplier system.
// Owned by the Game scene: `this.combo = new Combo(this, 2000)`.
// Call `combo.bump("insight")` or `combo.bump("stomp")` on each event.
// Call `combo.update(time)` once per frame to handle decay.

export class Combo {
  constructor(scene, decayMs = 2000) {
    this.scene = scene;
    this.decayMs = decayMs;
    this.count = 0;
    this._lastBump = -Infinity;
  }

  get multiplier() {
    return Math.min(5, 1 + Math.floor(this.count / 3));
  }

  bump(/* kind */) {
    this.count += 1;
    this._lastBump = this.scene.time.now;
    this._emit();
  }

  reset() {
    if (this.count === 0) return;
    this.count = 0;
    this._emit();
  }

  update(time) {
    if (this.count > 0 && time - this._lastBump > this.decayMs) {
      this.reset();
    }
  }

  _emit() {
    this.scene.game.events.emit("combo-changed", {
      count: this.count,
      multiplier: this.multiplier,
    });
  }
}
