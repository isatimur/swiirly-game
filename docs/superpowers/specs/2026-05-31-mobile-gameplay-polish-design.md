# Mobile Gameplay Polish — Design

**Date:** 2026-05-31
**Status:** Approved design, pending implementation plan

## Context

The game runs on mobile today (touch detection, a basic d-pad + jump/attack, safe-area
insets, a pause menu, a portrait→landscape rotate hint, reduced particles, lazy audio
unlock). But a live phone review (landscape 812×375, with touch emulation) surfaced real
gaps between "works on mobile" and "polished on mobile":

1. **Touch controls overlay every scene** — the injected d-pad/jump/attack buttons sit on
   top of the Menu (colliding with the endings gallery), StorySelect, and CharacterSelect,
   where they do nothing.
2. **In-game d-pad overlaps the HUD persona badge** — the ▶ button sits on the bottom-left
   "SWIIRL CLASSIC" portrait + cooldown ring (`HUD.js` persona badge at ~`(56, 664)`).
3. **Touch jump is always full-height** — `Player.js` reads `TOUCH.jumpDown` but variable
   jump height (short-hop) is gated on keyboard `JustUp` only, so platforming feels worse
   on touch.
4. **Instruction text is keyboard-only** — Menu/StorySelect/CharacterSelect show
   "SHIFT run / R restart / M mute / Q-E switch board" etc., none of which applies to touch,
   and there are no "tap" hints.
5. **No fast mid-game mute on touch** — `M` is keyboard-only; verify whether the existing
   top-right 🔊 icon already toggles mute or is only a status indicator.

Goal: make mobile gameplay maximally polished — ergonomic thumb-zone controls that never
overlap the HUD, real jump feel (short-hop), controls scoped to gameplay only, and
touch-aware UI text — without changing the desktop experience.

## Goals
- Redesigned, thumb-friendly touch controls (bigger movement pad + stacked jump/attack;
  slide via swipe-down) that are reachable and never overlap HUD/menu content.
- Touch controls (and pause/mute icons) visible **only during gameplay**.
- Short-hop / variable jump height on touch (parity with keyboard feel).
- Mobile-aware HUD layout (persona badge, combo, pause/mute don't collide with controls).
- Touch-aware instruction/hint text across Menu, StorySelect, CharacterSelect, and in-game.
- Fast in-game mute on touch.

## Non-goals (YAGNI)
- No analog virtual stick / swipe-to-move gesture scheme (chosen layout is discrete buttons
  + swipe-down slide).
- No new levels, characters, story content, or desktop layout changes.
- No portrait-mode gameplay (the rotate hint stays as-is).
- No native app packaging.

## Architecture

The touch overlay is **DOM-based** (`touchControls.js` injects HTML buttons into the page;
`Player.js` reads a shared `TOUCH` state object). Keep that architecture. All work lands in
existing files:

| File | Responsibility |
| --- | --- |
| `play/src/touchControls.js` | Rebuild the injected layout into thumb zones; add `TouchControls.show()/hide()`; add `TOUCH.jumpJustReleased`; swipe-down→slide gesture; ensure the 🔊 icon toggles mute. |
| `play/index.html` | CSS for the new control zones (sizes via `clamp()`, safe-area offsets, pressed states) and the controls-hidden default. |
| `play/src/objects/Player.js` | Read `TOUCH.jumpJustReleased` in the existing variable-jump-height block. |
| `play/src/scenes/HUD.js` | Mobile-aware positions for the persona badge (and combo if it collides), gated on `IS_MOBILE` from `config.js`. |
| `play/src/scenes/Game.js` | `TouchControls.show()` on create, `hide()` on shutdown. |
| `play/src/scenes/Menu.js`, `StorySelect.js`, `CharacterSelect.js` | Touch-variant instruction/hint text when on a touch device. |

### Component details

**A. Scene-scoped control visibility.**
The injected control root defaults to hidden (a CSS class, e.g. `touch-controls--hidden`).
`touchControls.js` exports `show()`/`hide()` that toggle it. `Game.create()` calls `show()`;
the scene's `shutdown` handler calls `hide()`. The top-right pause/mute icons follow the same
gameplay-only visibility. No other scene shows the controls. Non-touch devices never inject
the overlay (unchanged), so `show()/hide()` are safe no-ops there.

**B. Redesigned thumb zones.**
- **Left zone (movement):** two large rounded buttons **◀ ▶** side by side, low base opacity
  with a clear pressed-state. A **swipe-down within the left zone sets `TOUCH.downJustDown`**
  (slide), with a small "⤓" affordance label. Keep an explicit down-press fallback so a tap
  on a small down target also slides.
- **Right zone (actions):** a large primary **JUMP** button (lowest/closest to the thumb) and
  an **ATTACK** button stacked just above/inboard. Existing `TOUCH.jumpDown/jumpJustDown` and
  `TOUCH.attackDown/attackJustDown` semantics preserved.
- Sizes via `clamp(min, vmin, max)`; both clusters offset from the edges with
  `env(safe-area-inset-bottom/left/right)`. Tuned so the left cluster clears the (relocated)
  HUD badge and the right cluster clears the pause/mute icons.

**C. Short-hop on touch.**
Add `TOUCH.jumpJustReleased` (set on the jump button's `pointerup`/cancel, cleared each frame
after `Player` reads it, mirroring `jumpJustDown`). In `Player.js`'s variable-jump-height
block (currently keyboard `JustUp` only), also honor `TOUCH.jumpJustReleased` so releasing the
touch jump early produces a short hop.

**D. No-overlap HUD (mobile only).**
When `IS_MOBILE`, `HUD.js` repositions the **persona badge** out of the bottom-left (under the
movement pad) to a top-left slot near the insight counter; verify **combo** text and the
**pause/mute** icons (top-right) don't collide and nudge if needed. Desktop positions
unchanged (gate every change on `IS_MOBILE`).

**E. Touch-aware text.**
Where instruction/hint strings are built, branch on a touch check (reuse `IS_MOBILE` or the
existing touch detection) to show a touch variant:
- Menu: "Tap **STORY MODE** or the screen to play" (keep the keyboard line on desktop).
- StorySelect / CharacterSelect: "Tap a card to choose · tap tabs to switch board" (desktop
  keeps the arrow/Q-E line).
- In-game: pause/mute discoverable via the top-right icons (no text needed).
Cutscene already fast-forwards on tap (a tap during typing completes the line, the next tap
advances) and choice buttons are large enough — no change needed there beyond confirming.

**F. In-game mute on touch.**
Confirm the top-right 🔊 icon's handler: if it already toggles mute (and emits
`muted-changed`), just ensure it's visible in-game; if it's only a status indicator, wire its
`pointerdown` to the same mute toggle the `M` key uses.

## Error handling / edge cases
- Non-touch desktop: overlay never injected; `show()/hide()` and `jumpJustReleased` are inert.
- Very small landscape (≈667×375) and tablets: `clamp()` sizing + safe-area keep clusters
  reachable and non-overlapping; verified by screenshots at multiple sizes.
- Swipe-down slide must not fire on a simple tap or a left/right drag — use a downward-delta +
  threshold so horizontal movement presses don't trigger slides.
- Scene transitions: `hide()` on Game shutdown so controls never linger on results/menu; the
  shared `TOUCH` state is reset on hide so a held button can't "stick" across scenes.

## Testing / verification
No automated runner exists. Verify with Playwright in real phone viewports (with
`hasTouch:true, isMobile:true`):
1. **Landscape 812×375** and **small 667×375** and a **tablet (1024×768)**:
   - Menu / StorySelect / CharacterSelect show **no** gameplay controls; endings gallery and
     cards are unobstructed.
   - In-game: controls render, thumb clusters reachable, and **no overlap** with the persona
     badge, combo, or pause/mute icons.
2. Gameplay feel: tapping-and-releasing jump quickly yields a **short hop**; holding yields a
   **full jump** (compare apex heights). Swipe-down in the left zone triggers a **slide**.
3. The 🔊 icon **toggles mute** in-game.
4. **Portrait** still shows the rotate hint.
5. Desktop (no touch) unchanged; **zero console errors** across all scenes.

## Build sequence (incremental)
1. `touchControls.js` + `index.html`: new thumb-zone layout + `show()/hide()` + hidden default.
2. Scope visibility: Game shows/hides controls; verify menus are clean.
3. Short-hop: `jumpJustReleased` wired through to `Player.js`.
4. Swipe-down slide gesture.
5. Mobile HUD repositioning (`HUD.js`, `IS_MOBILE`-gated).
6. Touch-aware instruction text (Menu/StorySelect/CharacterSelect) + confirm/wire in-game mute.
7. Multi-viewport Playwright verification pass.
