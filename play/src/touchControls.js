// Virtual gamepad for touch-screen devices.
// Injects on-screen buttons only when a coarse pointer is detected.
// Exports a TOUCH state object read by Player.js each preUpdate frame.

export const TOUCH = {
  left:           false,
  right:          false,
  jumpDown:       false, // currently held
  jumpJustDown:   false, // set on press, cleared by Player after one frame
  attackDown:     false, // currently held (used for Spark's heavy charge)
  attackJustDown: false, // set on press, cleared by Player after one frame
};

export function initTouchControls() {
  if (!window.matchMedia("(pointer: coarse)").matches) return;

  const overlay = document.createElement("div");
  overlay.id = "tc";
  document.body.appendChild(overlay);

  const dpad = document.createElement("div");
  dpad.className = "tc-dpad";

  const btnL = mkBtn("tc-btn tc-l", "←", "Move left");
  const btnR = mkBtn("tc-btn tc-r", "→", "Move right");
  const btnJ = mkBtn("tc-btn tc-j", "▲", "Jump");
  const btnA = mkBtn("tc-btn tc-atk", "✦", "Attack");

  dpad.appendChild(btnL);
  dpad.appendChild(btnR);
  overlay.appendChild(dpad);
  overlay.appendChild(btnJ);
  overlay.appendChild(btnA);

  wire(btnL,
    () => { TOUCH.left = true; },
    () => { TOUCH.left = false; }
  );
  wire(btnR,
    () => { TOUCH.right = true; },
    () => { TOUCH.right = false; }
  );
  wire(btnJ,
    () => { TOUCH.jumpDown = true; TOUCH.jumpJustDown = true; },
    () => { TOUCH.jumpDown = false; }
  );
  wire(btnA,
    () => { TOUCH.attackDown = true; TOUCH.attackJustDown = true; },
    () => { TOUCH.attackDown = false; }
  );
}

function mkBtn(cls, label, aria) {
  const b = document.createElement("button");
  b.className = cls;
  b.textContent = label;
  b.setAttribute("aria-label", aria);
  return b;
}

function wire(btn, onDown, onUp) {
  const pd = (e) => e.preventDefault();
  btn.addEventListener("touchstart",  (e) => { pd(e); btn.classList.add("tc-active");    onDown(); }, { passive: false });
  btn.addEventListener("touchend",    (e) => { pd(e); btn.classList.remove("tc-active");  onUp(); },   { passive: false });
  btn.addEventListener("touchcancel", (e) => { pd(e); btn.classList.remove("tc-active");  onUp(); },   { passive: false });
}
