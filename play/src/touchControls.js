// Virtual gamepad for touch-screen devices.
// Injects on-screen buttons only when a coarse pointer is detected.
// Exports a TOUCH state object read by Player.js each preUpdate frame.
//
// Touch handling uses Pointer Events on each button, not raw touchstart/end.
// Pointer Events properly capture a pointer to the element that started the
// press, so dragging a finger OFF the button still fires pointerup → no
// stuck-down state. We also listen on `pointercancel` and a global window
// `pointerup`/`blur` as belt-and-braces — if the OS yanks the pointer (alert,
// app switch, second finger), everything releases.

export const TOUCH = {
  left:           false,
  right:          false,
  down:           false, // crouch + slide trigger
  jumpDown:       false, // currently held
  jumpJustDown:   false, // set on press, cleared by Player after one frame
  attackDown:     false, // currently held (used for Spark's heavy charge)
  attackJustDown: false, // set on press, cleared by Player after one frame
  downJustDown:   false, // edge — for slide trigger (one-frame pulse)
};

// Registry of all active touch buttons so a global "release everything"
// signal (visibilitychange, window blur, pagehide) can force-clear.
const _allReleases = new Set();

export function initTouchControls() {
  if (!isTouchLikely()) return;

  const overlay = document.createElement("div");
  overlay.id = "tc";
  document.body.appendChild(overlay);

  const dpad = document.createElement("div");
  dpad.className = "tc-dpad";

  const btnL    = mkBtn("tc-btn tc-l",    "◀", "Move left");
  const btnR    = mkBtn("tc-btn tc-r",    "▶", "Move right");
  const btnDown = mkBtn("tc-btn tc-down", "▼", "Crouch / slide");
  const btnJ    = mkBtn("tc-btn tc-j",    "▲", "Jump");
  const btnA    = mkBtn("tc-btn tc-atk",  "✦", "Attack");

  dpad.appendChild(btnL);
  dpad.appendChild(btnR);
  dpad.appendChild(btnDown);
  overlay.appendChild(dpad);
  overlay.appendChild(btnJ);
  overlay.appendChild(btnA);

  // ---- Top-right utility row: mute + pause ----
  const top = document.createElement("div");
  top.className = "tc-top";
  const btnMute  = mkIcon("tc-icon tc-mute",  "🔊", "Toggle sound");
  const btnPause = mkIcon("tc-icon tc-pause", "⏸",  "Pause");
  top.appendChild(btnMute);
  top.appendChild(btnPause);
  overlay.appendChild(top);

  // ---- Pause overlay (DOM, so we don't need to touch every scene) ----
  const pauseOverlay = document.createElement("div");
  pauseOverlay.className = "tc-pause-overlay";
  const pauseTitle = document.createElement("h2");
  pauseTitle.textContent = "PAUSED";
  const resumeBtn = document.createElement("button");
  resumeBtn.type = "button";
  resumeBtn.className = "tc-pause-resume";
  resumeBtn.textContent = "RESUME";
  pauseOverlay.appendChild(pauseTitle);
  pauseOverlay.appendChild(resumeBtn);
  document.body.appendChild(pauseOverlay);

  const setPaused = (p) => {
    pauseOverlay.classList.toggle("visible", p);
    btnPause.textContent = p ? "▶" : "⏸";
    const g = window.game;
    if (!g) return;
    // Toggle Phaser's main loop. Cheaper than fiddling with each scene.
    if (p && !g.loop.paused) g.loop.sleep();
    else if (!p && g.loop.paused) g.loop.wake();
  };
  let paused = false;
  const togglePause = () => { paused = !paused; setPaused(paused); };
  btnPause.addEventListener("click", togglePause);
  resumeBtn.addEventListener("click", () => { paused = false; setPaused(false); });

  // Mute icon — dynamically imports audio.js to avoid touching boot order.
  const refreshMuteIcon = (m) => { btnMute.textContent = m ? "🔇" : "🔊"; };
  btnMute.addEventListener("click", async () => {
    const m = await import("./audio.js");
    const muted = m.toggleMuted();
    refreshMuteIcon(muted);
    window.game?.events?.emit("muted-changed", muted);
  });

  wire(btnL,
    () => { TOUCH.left = true; },
    () => { TOUCH.left = false; }
  );
  wire(btnR,
    () => { TOUCH.right = true; },
    () => { TOUCH.right = false; }
  );
  wire(btnDown,
    () => { TOUCH.down = true; TOUCH.downJustDown = true; },
    () => { TOUCH.down = false; }
  );
  wire(btnJ,
    () => { TOUCH.jumpDown = true; TOUCH.jumpJustDown = true; },
    () => { TOUCH.jumpDown = false; }
  );
  wire(btnA,
    () => { TOUCH.attackDown = true; TOUCH.attackJustDown = true; },
    () => { TOUCH.attackDown = false; }
  );

  // Belt-and-braces: any time the page loses focus or visibility, force all
  // held buttons to release. Prevents the "switched apps with finger down,
  // came back stuck running right" bug.
  const releaseAll = () => { for (const fn of _allReleases) fn(); };
  window.addEventListener("blur", releaseAll);
  window.addEventListener("pagehide", releaseAll);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) releaseAll();
  });
}

function isTouchLikely() {
  // matchMedia coarse-pointer is the gold standard, but Chrome on some
  // hybrid laptops reports both. We OR with `ontouchstart` as a fallback.
  return window.matchMedia?.("(pointer: coarse)").matches
      || "ontouchstart" in window;
}

function mkBtn(cls, label, aria) {
  const b = document.createElement("button");
  b.className = cls;
  b.textContent = label;
  b.setAttribute("aria-label", aria);
  b.setAttribute("type", "button");
  return b;
}

function mkIcon(cls, label, aria) {
  // Same as mkBtn but click-driven, not pointer-tracked. No multitouch concern.
  return mkBtn(cls, label, aria);
}

function wire(btn, onDown, onUp) {
  // Track all pointer-ids currently pressing this button. The button stays
  // "down" while any pointer is on it; only releases when the last one lifts.
  // Using a Set instead of a single bool means multitouch (two fingers on
  // jump) doesn't desync the held state when one of them lifts.
  const active = new Set();

  const press = (e) => {
    e.preventDefault();
    if (active.size === 0) { btn.classList.add("tc-active"); onDown(); }
    active.add(e.pointerId);
    // Capture the pointer to THIS element. Drags off the button still fire
    // pointerup on this element — fixes the classic stuck-button bug.
    try { btn.setPointerCapture(e.pointerId); } catch {}
  };
  const release = (e) => {
    if (!active.has(e.pointerId)) return;
    active.delete(e.pointerId);
    if (active.size === 0) { btn.classList.remove("tc-active"); onUp(); }
    try { btn.releasePointerCapture(e.pointerId); } catch {}
  };
  const releaseAll = () => {
    if (active.size === 0) return;
    active.clear();
    btn.classList.remove("tc-active");
    onUp();
  };

  btn.addEventListener("pointerdown",   press,   { passive: false });
  btn.addEventListener("pointerup",     release, { passive: false });
  btn.addEventListener("pointercancel", release, { passive: false });
  // Some browsers fire pointerleave instead of pointerup when a pointer
  // capture is lost (e.g. system gesture intercepts). Treat it as release.
  btn.addEventListener("pointerleave",  release, { passive: false });

  _allReleases.add(releaseAll);
}
