// Virtual gamepad + universal pause menu.
//
// Two responsibilities, kept in one module because they share the DOM
// overlay container (#tc) and the same release-everything safety net:
//
//   1. Virtual gamepad — d-pad / jump / attack buttons, injected only on
//      touch devices. Reads via the TOUCH state object that Player.js polls.
//   2. Pause menu — top-right pause + mute icons and the full-screen pause
//      overlay (Resume / Restart / Back to Menu / Sound). Injected on EVERY
//      device so keyboard / gamepad users can pause too. Reachable via:
//        - Touch: tap ⏸
//        - Keyboard: Esc or P
//        - Gamepad: Options (wired by main.js via wireGamepadPause)
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

// Public pause API — initialized by initTouchControls(), wired by main.js
// after Phaser boot (wireGamepadPause).
let _togglePauseFn = () => {};
export function togglePause() { _togglePauseFn(); }
export function wireGamepadPause(game) {
  // Gamepad-options button (PS5 = Options) toggles pause from any scene.
  game.events.on("gamepad-options", () => _togglePauseFn());
}

export function initTouchControls() {
  // Build the wrapper for ALL injected UI. Visible on every device — the
  // touch-only buttons inside it gate themselves below.
  const overlay = document.createElement("div");
  overlay.id = "tc";
  document.body.appendChild(overlay);

  // ---- Touch-only virtual gamepad ----
  // The d-pad, jump, and attack buttons only make sense on a coarse-pointer
  // device. Skipping this block on desktop also means no stray clickable
  // overlays floating over the game on mouse-only machines.
  if (isTouchLikely()) {
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

    wire(btnL,    () => { TOUCH.left = true; },  () => { TOUCH.left = false; });
    wire(btnR,    () => { TOUCH.right = true; }, () => { TOUCH.right = false; });
    wire(btnDown, () => { TOUCH.down = true; TOUCH.downJustDown = true; }, () => { TOUCH.down = false; });
    wire(btnJ,    () => { TOUCH.jumpDown = true; TOUCH.jumpJustDown = true; }, () => { TOUCH.jumpDown = false; });
    wire(btnA,    () => { TOUCH.attackDown = true; TOUCH.attackJustDown = true; }, () => { TOUCH.attackDown = false; });
  }

  // ---- Top-right utility icons: mute + pause (ALWAYS visible) ----
  const top = document.createElement("div");
  top.className = "tc-top";
  const btnMute  = mkIcon("tc-icon tc-mute",  "🔊", "Toggle sound");
  const btnPause = mkIcon("tc-icon tc-pause", "⏸",  "Pause");
  top.appendChild(btnMute);
  top.appendChild(btnPause);
  overlay.appendChild(top);

  // ---- Pause overlay — full-screen modal with 4 menu items ----
  const pauseOverlay = document.createElement("div");
  pauseOverlay.className = "tc-pause-overlay";

  const pauseTitle = document.createElement("h2");
  pauseTitle.textContent = "PAUSED";
  pauseOverlay.appendChild(pauseTitle);

  // Each menu item is a pill button. Items marked .game-only show only when
  // paused from inside Game; .menu-only items show only when paused from
  // Menu / CharacterSelect. Resume + Sound show everywhere.
  const btnResume  = mkPill("tc-pause-resume",            "RESUME");
  const btnRestart = mkPill("tc-pause-restart game-only", "RESTART LEVEL");
  const btnQuit    = mkPill("tc-pause-quit game-only",    "BACK TO MENU");
  const btnSound   = mkPill("tc-pause-sound",             "🔊 SOUND");
  const btnMusic   = mkPill("tc-pause-music",             "🎵 MUSIC");
  const btnReset   = mkPill("tc-pause-reset menu-only",   "↻ RESET PROGRESS");
  const btnAbout   = mkPill("tc-pause-about menu-only",   "ⓘ ABOUT");
  pauseOverlay.appendChild(btnResume);
  pauseOverlay.appendChild(btnRestart);
  pauseOverlay.appendChild(btnQuit);
  pauseOverlay.appendChild(btnSound);
  pauseOverlay.appendChild(btnMusic);
  pauseOverlay.appendChild(btnReset);
  pauseOverlay.appendChild(btnAbout);

  const hint = document.createElement("div");
  hint.className = "tc-pause-hint";
  hint.textContent = "Esc / Options to toggle";
  pauseOverlay.appendChild(hint);

  // ABOUT sub-panel — replaces the pill list when opened. A small <- back
  // button returns to the main pause menu.
  const aboutPanel = document.createElement("div");
  aboutPanel.className = "tc-about-panel";
  const aboutTitle = document.createElement("h3");
  aboutTitle.textContent = "ABOUT";
  const aboutText = document.createElement("p");
  aboutText.textContent =
    "Swiirl — fight incompetence, deliver community insights to brands. " +
    "A handcrafted Phaser 3 platformer. SFX and music are fully procedural " +
    "Web Audio — no audio files were harmed in the making of this game.";
  const aboutBack = mkPill("tc-about-back", "← BACK");
  aboutPanel.appendChild(aboutTitle);
  aboutPanel.appendChild(aboutText);
  aboutPanel.appendChild(aboutBack);
  pauseOverlay.appendChild(aboutPanel);

  document.body.appendChild(pauseOverlay);

  let paused = false;

  const refreshSoundLabel = async () => {
    const m = await import("./audio.js");
    btnSound.textContent = m.isMuted() ? "🔇 SOUND" : "🔊 SOUND";
    btnMusic.textContent = m.isMusicMuted() ? "🎵 MUSIC  OFF" : "🎵 MUSIC  ON";
    btnMute.textContent  = m.isMuted() ? "🔇" : "🔊";
  };

  // Menu-pill navigation state. Arrow keys / D-pad move focus through the
  // currently-visible pills; Enter / × confirms by synthesizing a click.
  // window.__pauseModalOpen is read by per-scene listeners (Menu, GameOver,
  // LevelComplete, CharacterSelect) so they stop responding to gamepad-cross
  // and Enter while the overlay is up.
  // aboutBack is appended so when the About sub-panel opens, the visible
  // pill set collapses to just [aboutBack] and nav reaches it.
  const allPills = [btnResume, btnRestart, btnQuit, btnSound, btnMusic, btnReset, btnAbout, aboutBack];
  let focusIdx = 0;
  const visiblePills = () =>
    allPills.filter(p => p.offsetParent !== null && getComputedStyle(p).display !== "none");
  const applyFocus = () => {
    const visible = visiblePills();
    if (!visible.length) return;
    focusIdx = ((focusIdx % visible.length) + visible.length) % visible.length;
    allPills.forEach(p => p.classList.remove("focused"));
    visible[focusIdx].classList.add("focused");
  };
  const moveFocus = (dir) => {
    const visible = visiblePills();
    if (!visible.length) return;
    focusIdx += dir;
    applyFocus();
  };
  const confirmFocus = () => {
    const visible = visiblePills();
    visible[focusIdx]?.click();
  };

  const setPaused = (p) => {
    paused = p;
    pauseOverlay.classList.toggle("visible", p);
    btnPause.textContent = p ? "▶" : "⏸";
    window.__pauseModalOpen = p;
    const g = window.game;
    if (!g) return;
    // Tag the overlay so CSS can hide game-only items when paused from Menu.
    if (p) {
      const inGame = g.scene?.isActive?.("Game");
      pauseOverlay.classList.toggle("menu-scope", !inGame);
      // Reset focus to RESUME (always-visible, always-safe) each time the
      // menu opens.
      focusIdx = 0;
      // Defer one frame so DOM .visible class settles before computing
      // offsetParent for visibility filtering.
      setTimeout(() => applyFocus(), 0);
    } else {
      allPills.forEach(pill => pill.classList.remove("focused"));
    }
    // Toggle Phaser's main loop. `game.loop.paused` doesn't exist in
    // Phaser 3 (the TimeStep tracks `.running` instead), so guarding on it
    // means wake() never fires. Both calls are idempotent — sleep() when
    // already asleep, wake() when already awake, are no-ops.
    if (p) g.loop.sleep();
    else g.loop.wake();
  };
  _togglePauseFn = () => setPaused(!paused);

  // ---- Pause menu actions ----
  btnResume.addEventListener("click", () => setPaused(false));
  btnRestart.addEventListener("click", () => {
    setPaused(false);
    window.game?.events?.emit("request-restart");
  });
  btnQuit.addEventListener("click", () => {
    setPaused(false);
    window.game?.events?.emit("request-quit");
  });
  btnSound.addEventListener("click", async () => {
    const m = await import("./audio.js");
    const muted = m.toggleMuted();
    refreshSoundLabel();
    window.game?.events?.emit("muted-changed", muted);
  });
  btnMusic.addEventListener("click", async () => {
    const m = await import("./audio.js");
    m.toggleMusicMuted();
    refreshSoundLabel();
  });
  btnPause.addEventListener("click", () => _togglePauseFn());
  btnMute.addEventListener("click", async () => {
    const m = await import("./audio.js");
    const muted = m.toggleMuted();
    refreshSoundLabel();
    window.game?.events?.emit("muted-changed", muted);
  });

  // Reset progress — two-step confirm. First click flips the label to
  // "TAP AGAIN" and arms a 2-second window; second click wipes every
  // swiirl.* key and reloads the Menu scene.
  let _resetArmed = false;
  let _resetTimer = null;
  btnReset.addEventListener("click", () => {
    if (!_resetArmed) {
      _resetArmed = true;
      btnReset.classList.add("danger");
      btnReset.textContent = "TAP AGAIN TO CONFIRM";
      _resetTimer = setTimeout(() => {
        _resetArmed = false;
        btnReset.classList.remove("danger");
        btnReset.textContent = "↻ RESET PROGRESS";
      }, 2000);
      return;
    }
    clearTimeout(_resetTimer);
    _resetArmed = false;
    btnReset.classList.remove("danger");
    btnReset.textContent = "↻ RESET PROGRESS";
    // Wipe every swiirl.* localStorage key.
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith("swiirl.")) localStorage.removeItem(k);
      }
    } catch {}
    // Close the overlay and restart the Menu so cleared state is reflected.
    setPaused(false);
    const g = window.game;
    if (g?.scene?.isActive?.("Menu")) g.scene.getScene("Menu").scene.restart();
    else g?.scene?.start?.("Menu");
  });

  // About — toggle the about sub-panel. Focus needs to follow the visible
  // pill set so keyboard/gamepad nav reaches the BACK pill inside, and
  // returns to the ABOUT pill when leaving.
  btnAbout.addEventListener("click", () => {
    pauseOverlay.classList.add("about-open");
    setTimeout(() => {
      const visible = visiblePills();
      const i = visible.indexOf(aboutBack);
      if (i !== -1) { focusIdx = i; applyFocus(); }
    }, 0);
  });
  aboutBack.addEventListener("click", () => {
    pauseOverlay.classList.remove("about-open");
    setTimeout(() => {
      const visible = visiblePills();
      const i = visible.indexOf(btnAbout);
      if (i !== -1) { focusIdx = i; applyFocus(); }
    }, 0);
  });

  // Initial label sync.
  refreshSoundLabel();

  // ---- Global keyboard: Esc or P pauses; arrow keys / Enter navigate ----
  // Listening on window means pause works in every scene, including Menu /
  // CharacterSelect / LevelComplete — not just Game.
  window.addEventListener("keydown", (e) => {
    const k = (e.key || "").toLowerCase();
    if (k === "escape" || k === "p") {
      if (window.__settingsOpen) return;
      e.preventDefault();
      // Backstep — Esc inside the About sub-panel closes About, not pause.
      if (paused && pauseOverlay.classList.contains("about-open")) {
        aboutBack.click();
        return;
      }
      _togglePauseFn();
      return;
    }
    // Pause-menu nav (only when the overlay is open).
    if (!paused) return;
    if (k === "arrowup" || k === "w") {
      e.preventDefault();
      moveFocus(-1);
    } else if (k === "arrowdown" || k === "s") {
      e.preventDefault();
      moveFocus(1);
    } else if (k === "enter" || k === " " || k === "spacebar") {
      e.preventDefault();
      confirmFocus();
    } else if (k === "backspace") {
      e.preventDefault();
      if (pauseOverlay.classList.contains("about-open")) aboutBack.click();
      else _togglePauseFn();
    }
  });

  // Gamepad-driven pause-menu nav. The same gamepad-cross event is also
  // used by scene listeners (Menu, GameOver, LevelComplete) for "advance"
  // — but those listeners check window.__pauseModalOpen and short-circuit
  // when the overlay is up.
  const wireWhenGameReady = () => {
    const g = window.game;
    if (!g?.events) { setTimeout(wireWhenGameReady, 30); return; }
    g.events.on("gamepad-up",    () => { if (paused) moveFocus(-1); });
    g.events.on("gamepad-down",  () => { if (paused) moveFocus(1); });
    g.events.on("gamepad-cross", () => { if (paused) confirmFocus(); });
    // Circle (○) is the universal cancel/back on PS pads. Closes the About
    // sub-panel if it's open, otherwise closes the whole pause overlay.
    g.events.on("gamepad-circle", () => {
      if (!paused) return;
      if (pauseOverlay.classList.contains("about-open")) aboutBack.click();
      else setPaused(false);
    });
  };
  wireWhenGameReady();

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
  preventFocusSteal(b);
  return b;
}

// Keep injected control buttons from grabbing keyboard focus on click. A
// focused <button> is activated by Space/Enter natively — which, with Space
// also being the jump key, meant clicking the 🔊/⏸ icon left it focused and
// every jump re-fired it (sound flipping on/off). preventDefault on mousedown
// stops the click from moving focus off the game; the click still fires.
function preventFocusSteal(b) {
  b.addEventListener("mousedown", (e) => e.preventDefault());
  b.setAttribute("tabindex", "-1");
}

function mkIcon(cls, label, aria) {
  // Same as mkBtn but click-driven, not pointer-tracked. No multitouch concern.
  return mkBtn(cls, label, aria);
}

function mkPill(cls, label) {
  // Vertical pause-menu pill button. Click-only — no pointer capture.
  const b = document.createElement("button");
  b.type = "button";
  b.className = "tc-pill " + cls;
  b.textContent = label;
  preventFocusSteal(b);
  return b;
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
