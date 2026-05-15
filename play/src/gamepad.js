// Gamepad support — PS5 DualSense and any standard-layout pad.
// Polls the browser's Gamepad API every animation frame and exposes a
// PAD state object that mirrors TOUCH's shape, so Player.js can simply
// OR them together alongside the keyboard reads.
//
// Mapping (PS5 DualSense via the standard layout):
//   buttons[0]  ×  (Cross)    → jump            + emits "gamepad-cross"
//   buttons[1]  ○  (Circle)   → emits "gamepad-circle" (back/cancel)
//   buttons[2]  □  (Square)   → attack
//   buttons[3]  △  (Triangle) → attack (alt)
//   buttons[4]  L1            → run modifier
//   buttons[7]  R2 (analog)   → attack (heavy)
//   buttons[9]  Options       → emits "gamepad-options"
//   buttons[12-15] D-pad      → movement
//   axes[0/1]   Left stick    → movement (deadzone 0.30, sprint past 0.75)
//
// justDown flags are STICKY: set on the press-edge and only cleared by
// the consumer (Player.js does `PAD.jumpJustDown = false` after read).
// This prevents the poll loop from clobbering an unread press when it
// runs faster than Phaser's preUpdate.

const DEADZONE = 0.30;
const SPRINT_THRESHOLD = 0.75;

export const PAD = {
  connected:      false,
  left:           false,
  right:          false,
  up:             false,
  down:           false,
  runDown:        false,
  jumpDown:       false,
  jumpJustDown:   false,
  attackDown:     false,
  attackJustDown: false,
};

// Edge-detection memory — buttons that were pressed on the PREVIOUS poll.
// Used to fire emit-events exactly once per press.
const _prev = {
  cross: false, circle: false, square: false, triangle: false,
  options: false, jump: false, attack: false,
};

let _gameEvents = null;
let _toast = null;

export function initGamepad(game) {
  _gameEvents = game?.events ?? null;

  window.addEventListener("gamepadconnected", (e) => {
    const id = (e.gamepad?.id || "Gamepad").split("(")[0].trim();
    showToast(`🎮  ${id} connected`);
    rumble(0.4, 0.5, 220);
  });
  window.addEventListener("gamepaddisconnected", () => {
    if (!anyPadConnected()) showToast("🎮  Gamepad disconnected");
  });

  const tick = () => {
    pollOnce();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function firstConnectedPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const p of pads) if (p && p.connected) return p;
  return null;
}

function anyPadConnected() {
  return !!firstConnectedPad();
}

function pollOnce() {
  const p = firstConnectedPad();
  if (!p) {
    PAD.connected = false;
    PAD.left = PAD.right = PAD.up = PAD.down = false;
    PAD.runDown = PAD.jumpDown = PAD.attackDown = false;
    // Don't clear justDown flags here — let the consumer drain them.
    return;
  }
  PAD.connected = true;

  const b = p.buttons || [];
  const a = p.axes || [];
  const ax = a[0] ?? 0;
  const ay = a[1] ?? 0;

  PAD.left  = !!(b[14]?.pressed) || ax < -DEADZONE;
  PAD.right = !!(b[15]?.pressed) || ax >  DEADZONE;
  PAD.up    = !!(b[12]?.pressed) || ay < -DEADZONE;
  PAD.down  = !!(b[13]?.pressed) || ay >  DEADZONE;
  PAD.runDown = !!(b[4]?.pressed) || Math.abs(ax) > SPRINT_THRESHOLD;

  const jumpDown   = !!(b[0]?.pressed);
  const r2Active   = (b[7]?.value ?? 0) > 0.5;
  const attackDown = !!(b[2]?.pressed) || !!(b[3]?.pressed) || r2Active;

  // Sticky press-edge → only consumer clears.
  if (jumpDown && !_prev.jump)     PAD.jumpJustDown = true;
  if (attackDown && !_prev.attack) PAD.attackJustDown = true;
  PAD.jumpDown   = jumpDown;
  PAD.attackDown = attackDown;
  _prev.jump   = jumpDown;
  _prev.attack = attackDown;

  // Menu/UI edge-events on the global bus.
  emitEdge(b, 0,  "gamepad-cross",    "cross");
  emitEdge(b, 1,  "gamepad-circle",   "circle");
  emitEdge(b, 9,  "gamepad-options",  "options");
}

function emitEdge(buttons, idx, evtName, prevKey) {
  const pressed = !!(buttons[idx]?.pressed);
  if (pressed && !_prev[prevKey]) {
    _gameEvents?.emit(evtName);
  }
  _prev[prevKey] = pressed;
}

/** Rumble all connected pads. weak/strong 0..1, ms duration. */
export function rumble(weak = 0.4, strong = 0.6, ms = 200) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const p of pads) {
    if (!p || !p.connected) continue;
    const va = p.vibrationActuator;
    if (!va || !va.playEffect) continue;
    try {
      va.playEffect("dual-rumble", {
        startDelay: 0,
        duration: ms,
        weakMagnitude: weak,
        strongMagnitude: strong,
      });
    } catch { /* unsupported effect type — silently skip */ }
  }
}

function showToast(msg) {
  if (_toast) _toast.remove();
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText =
    "position:fixed;left:50%;top:24px;transform:translateX(-50%);" +
    "background:#1a0f2e;color:#ffd24a;padding:8px 18px;border-radius:10px;" +
    "border:2px solid #b892e0;font:600 14px system-ui,sans-serif;" +
    "letter-spacing:2px;z-index:99999;pointer-events:none;" +
    "opacity:0;transition:opacity 240ms ease;";
  document.body.appendChild(t);
  _toast = t;
  requestAnimationFrame(() => { t.style.opacity = "1"; });
  setTimeout(() => {
    t.style.opacity = "0";
    setTimeout(() => { t.remove(); if (_toast === t) _toast = null; }, 280);
  }, 2400);
}
