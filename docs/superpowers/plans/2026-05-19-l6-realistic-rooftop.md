# L6 Realistic Rooftop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace L6's stacked-brick boss arena with a realistic, flat poured-concrete rooftop dressed with industrial props (HVAC, water tower, helipad H, antenna, satellite dish, maintenance shed, parapet, vent stack). Player emerges through a maintenance-shed door instead of a hole in the middle of the arena.

**Architecture:** Three-layer change — (1) generate nine new world-art PNGs from inline SVG in `tools/generate-world.mjs`; (2) register them in `Boot.js` and bump `ASSET_VERSION`; (3) rewrite the L6 terrain in `level6.js` to add a full-width concrete deck + shed interior geometry, add a declarative `props[]` field, and rewrite the L6 dressing block in `Game.js` to render props by depth, tile the parapet, place the helipad H decal, re-anchor the sticky-note easter egg to the shed, and add an HVAC vapor wisp.

**Tech Stack:** Phaser 3 (CDN, ES modules, no bundler), Node + sharp for SVG→PNG, manual browser verification (no test runner exists).

**Spec:** `docs/superpowers/specs/2026-05-19-l6-realistic-rooftop-design.md`

**Verification model:** This repo has no test runner. Every art task verifies by opening the generated PNG file; every code task verifies by running `npm run dev` and exercising L6 via the `B` dev-cheat key (teleport to boss arena). Commits happen per task.

---

## File map

| File | New / Modify | Responsibility |
|---|---|---|
| `tools/generate-world.mjs` | Modify | Add nine SVG-to-PNG generators in a new "ROOFTOP — L6" section |
| `play/assets/world/tile_rooftop_concrete.png` | New (generated) | 64×64 concrete deck tile |
| `play/assets/world/prop_parapet.png` | New (generated) | 64×48 parapet+rail tile |
| `play/assets/world/prop_hvac.png` | New (generated) | 160×96 HVAC condenser |
| `play/assets/world/prop_maintenance_shed.png` | New (generated) | 192×144 shed with right-facing door |
| `play/assets/world/prop_water_tower.png` | New (generated) | 192×260 water tower |
| `play/assets/world/prop_satellite_dish.png` | New (generated) | 144×128 dish on tripod |
| `play/assets/world/prop_antenna_mast.png` | New (generated) | 64×220 lattice mast |
| `play/assets/world/prop_helipad_h.png` | New (generated) | 320×32 painted helipad H decal |
| `play/assets/world/prop_vent_stack.png` | New (generated) | 48×80 mushroom-cap vent pipe |
| `play/src/scenes/Boot.js` | Modify | Add 9 keys to `WORLD_IMAGES`, bump `ASSET_VERSION` 10→11 |
| `play/src/levels/level6.js` | Modify | Rewrite terrain to use concrete deck + shed interior; remove top platform; add `props[]`; move `brandPos`; move 14th insight |
| `play/src/scenes/Game.js` | Modify | Parameterize `buildOneWayFloor`; iterate `level.props`; tile parapet; place helipad H decal; re-anchor sticky to shed door; add HVAC vapor wisp; fix Q-cheat L6 y-offset |

---

## Conventions

**Origin convention:** every rooftop prop uses Phaser default origin `(0.5, 1.0)` so the y-coordinate is the **feet** on the deck (existing Swiirl convention). Exceptions explicitly noted: `prop_helipad_h` is rendered separately in the dressing block (it's a floor decal, not a stand-on prop).

**Palette references:**
- Concrete deck: `#a39bb5` top → `#7f7a90` bottom (desaturated lilac family)
- Industrial body: `#3A3D44` (mid steel grey, matches existing cubicle/server-rack family)
- Industrial deep shadow: `#1F2127`
- Mid steel highlight: `#5a5d64`
- Wood (water tower): `#7a5a3a` body, `#5a3a20` staves
- Swiirl outline: `#5C3BA3`
- Insight gold accent / warning stripes: `#FFD24A`
- Bubblegum accent: `#FF8FBE`
- Faded paint white: `#EEE6F5`
- Drop-shadow ellipse: `#1A0F2E` opacity 0.32

**Commit messages:** short imperative subject, no AI attribution lines (per `~/.claude/CLAUDE.md` and project convention).

**Asset regeneration after editing SVG:** `npm run generate-world` (writes to `play/assets/world/`).

---

## Task 1: Generate concrete deck tile

**Files:**
- Modify: `tools/generate-world.mjs` (add new section after line 278)
- Output: `play/assets/world/tile_rooftop_concrete.png` (64×64)

- [ ] **Step 1: Insert generator section header**

Open `tools/generate-world.mjs`. After the `await svgToPng(shaftWallSvg, "tile_shaft_wall.png", TILE, TILE);` line (line 278), add a new section header:

```js
// ============================================================================
// L6 ROOFTOP — concrete deck tile + 8 industrial props for the bonus level
// boss arena. The deck is tileable horizontally; right-edge joint creates a
// slab-edge line every 64px when laid in a row. All props use origin (0.5, 1.0)
// — the y-coordinate is the feet on the deck.
// ============================================================================
```

- [ ] **Step 2: Add the concrete deck SVG**

Below the section header, add:

```js
const rooftopConcreteSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="rc" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#a39bb5"/>
      <stop offset="1" stop-color="#7f7a90"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" fill="url(#rc)"/>
  <!-- Faint drain stain -->
  <ellipse cx="22" cy="44" rx="11" ry="3" fill="#5C3BA3" opacity="0.12"/>
  <!-- Gravel ballast specks -->
  <circle cx="9"  cy="14" r="1" fill="#5C3BA3" opacity="0.25"/>
  <circle cx="38" cy="11" r="1" fill="#1F2127" opacity="0.30"/>
  <circle cx="52" cy="28" r="1" fill="#5C3BA3" opacity="0.20"/>
  <circle cx="17" cy="33" r="1" fill="#1F2127" opacity="0.25"/>
  <circle cx="44" cy="48" r="1" fill="#5C3BA3" opacity="0.20"/>
  <circle cx="29" cy="56" r="1" fill="#1F2127" opacity="0.25"/>
  <circle cx="58" cy="52" r="1" fill="#5C3BA3" opacity="0.20"/>
  <!-- Top expansion-joint groove + highlight (creates a horizontal joint line at every tile boundary when stacked) -->
  <rect x="0" y="0" width="64" height="2" fill="#5C3BA3" opacity="0.45"/>
  <rect x="0" y="2" width="64" height="2" fill="#bdb5cf" opacity="0.5"/>
  <!-- Right-edge vertical joint (creates a slab boundary every 64px when tiled horizontally) -->
  <rect x="62" y="0" width="2" height="64" fill="#5C3BA3" opacity="0.35"/>
</svg>`;
await svgToPng(rooftopConcreteSvg, "tile_rooftop_concrete.png", TILE, TILE);
```

- [ ] **Step 3: Generate the asset**

Run from repo root:

```bash
npm run generate-world
```

Expected: output includes `World assets generated:` and prints existing tile catalog. Confirm file appears:

```bash
ls -la play/assets/world/tile_rooftop_concrete.png
```

- [ ] **Step 4: Visually verify the PNG**

Open `play/assets/world/tile_rooftop_concrete.png`. Expected: a desaturated grey-violet square with 6–7 small dark/violet specks, a faint drain stain ellipse in the lower-left, a dark line + a lighter highlight stripe at the top, and a thin dark stripe on the right edge. If it reads as "brick courses" or "girder windows" — reject and revisit the SVG.

- [ ] **Step 5: Commit**

```bash
git add tools/generate-world.mjs play/assets/world/tile_rooftop_concrete.png
git commit -m "art: L6 concrete deck tile"
```

---

## Task 2: Generate parapet tile

**Files:**
- Modify: `tools/generate-world.mjs`
- Output: `play/assets/world/prop_parapet.png` (64×48)

- [ ] **Step 1: Add parapet SVG**

In `tools/generate-world.mjs`, immediately after the `await svgToPng(rooftopConcreteSvg, ...)` line (added in Task 1), append:

```js
const parapetSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="48" viewBox="0 0 64 48">
  <!-- Concrete wall body -->
  <rect x="0" y="14" width="64" height="34" fill="#8a8398"/>
  <!-- Top coping (darker cap) -->
  <rect x="0" y="14" width="64" height="6" fill="#5a536b"/>
  <!-- Steel pipe handrail floating above the coping -->
  <rect x="0" y="6" width="64" height="4" fill="#3A3D44"/>
  <!-- Posts at left and right edges connecting rail to coping -->
  <rect x="2" y="10" width="3" height="6" fill="#3A3D44"/>
  <rect x="59" y="10" width="3" height="6" fill="#3A3D44"/>
  <!-- Yellow warning stripe along the inside lip -->
  <rect x="0" y="20" width="64" height="2" fill="#FFD24A" opacity="0.7"/>
  <!-- Drain stains -->
  <ellipse cx="18" cy="34" rx="6" ry="1.5" fill="#5C3BA3" opacity="0.20"/>
  <ellipse cx="48" cy="40" rx="5" ry="1.2" fill="#5C3BA3" opacity="0.18"/>
  <!-- Outline -->
  <rect x="0" y="14" width="64" height="34" fill="none" stroke="#5C3BA3" stroke-width="1.5" opacity="0.5"/>
</svg>`;
await svgToPng(parapetSvg, "prop_parapet.png", 64, 48);
```

- [ ] **Step 2: Generate and verify**

```bash
npm run generate-world
ls -la play/assets/world/prop_parapet.png
```

Open the PNG. Expected: a horizontal segment with a steel pipe rail at top, concrete wall body below, a darker coping band where the rail meets the wall, a faint yellow warning stripe, drain stains. When mentally tiled horizontally, posts at both ends visually merge into a continuous post-every-64px rail.

- [ ] **Step 3: Commit**

```bash
git add tools/generate-world.mjs play/assets/world/prop_parapet.png
git commit -m "art: L6 parapet tile"
```

---

## Task 3: Generate HVAC condenser

**Files:**
- Modify: `tools/generate-world.mjs`
- Output: `play/assets/world/prop_hvac.png` (160×96)

- [ ] **Step 1: Add HVAC SVG**

In `tools/generate-world.mjs`, after the parapet generator, append:

```js
const hvacSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="96" viewBox="0 0 160 96">
  <!-- Drop shadow on the deck beneath -->
  <ellipse cx="80" cy="93" rx="74" ry="3" fill="#1A0F2E" opacity="0.32"/>
  <!-- Mounting frame -->
  <rect x="4" y="84" width="152" height="8" fill="#1F2127"/>
  <!-- Body -->
  <rect x="8" y="20" width="144" height="68" fill="#3A3D44" stroke="#5C3BA3" stroke-width="2"/>
  <!-- Top fan housing -->
  <rect x="20" y="10" width="120" height="14" fill="#5a5d64" stroke="#1F2127" stroke-width="1.5"/>
  <!-- Three fan grates -->
  <circle cx="56" cy="17" r="5" fill="none" stroke="#1F2127" stroke-width="1"/>
  <circle cx="80" cy="17" r="5" fill="none" stroke="#1F2127" stroke-width="1"/>
  <circle cx="104" cy="17" r="5" fill="none" stroke="#1F2127" stroke-width="1"/>
  <!-- Side louvers (horizontal lines across the body) -->
  ${[28, 36, 44, 52, 60, 68, 76].map(y => `<line x1="14" y1="${y}" x2="146" y2="${y}" stroke="#1F2127" stroke-width="1.5"/>`).join("")}
  <!-- Branding sticker (bubblegum-pink Swiirl easter egg) -->
  <rect x="56" y="32" width="48" height="14" fill="#FF8FBE" opacity="0.85" rx="2"/>
  <text x="80" y="42" font-family="system-ui, sans-serif" font-size="7" fill="#5C3BA3" text-anchor="middle" font-weight="900">PROP OF THE BOARD</text>
  <!-- Yellow warning stripe across the base -->
  <rect x="8" y="80" width="144" height="3" fill="#FFD24A" opacity="0.8"/>
  <!-- Side bevels -->
  <rect x="8" y="24" width="3" height="60" fill="#1F2127" opacity="0.6"/>
  <rect x="149" y="24" width="3" height="60" fill="#1F2127" opacity="0.6"/>
</svg>`;
await svgToPng(hvacSvg, "prop_hvac.png", 160, 96);
```

- [ ] **Step 2: Generate and verify**

```bash
npm run generate-world
```

Open `play/assets/world/prop_hvac.png`. Expected: a chunky boxy AC condenser, fan grate on top with three circles, horizontal louver lines on the body, bubblegum-pink "PROP OF THE BOARD" sticker mid-front, yellow warning stripe at the base, drop shadow at the bottom edge. Reads as "HVAC unit on a roof," not "abstract box."

- [ ] **Step 3: Commit**

```bash
git add tools/generate-world.mjs play/assets/world/prop_hvac.png
git commit -m "art: L6 HVAC condenser prop"
```

---

## Task 4: Generate maintenance shed

**Files:**
- Modify: `tools/generate-world.mjs`
- Output: `play/assets/world/prop_maintenance_shed.png` (192×144)

- [ ] **Step 1: Add shed SVG**

Append to `tools/generate-world.mjs`:

```js
const maintenanceShedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="144" viewBox="0 0 192 144">
  <!-- Drop shadow -->
  <ellipse cx="96" cy="141" rx="88" ry="3" fill="#1A0F2E" opacity="0.32"/>
  <!-- Vent pipe poking out the top -->
  <rect x="40" y="0" width="14" height="38" fill="#3A3D44" stroke="#1F2127" stroke-width="1"/>
  <ellipse cx="47" cy="0" rx="9" ry="3" fill="#5a5d64"/>
  <!-- Shed body -->
  <rect x="8" y="34" width="176" height="106" fill="#8a8398" stroke="#5C3BA3" stroke-width="2"/>
  <!-- Darker roof-line band at top -->
  <rect x="4" y="34" width="184" height="10" fill="#5a536b"/>
  <!-- Wall horizontal texture lines -->
  <rect x="8" y="60" width="176" height="1" fill="#5C3BA3" opacity="0.25"/>
  <rect x="8" y="90" width="176" height="1" fill="#5C3BA3" opacity="0.25"/>
  <rect x="8" y="120" width="176" height="1" fill="#5C3BA3" opacity="0.25"/>
  <!-- Door frame -->
  <rect x="128" y="62" width="50" height="80" fill="none" stroke="#1F2127" stroke-width="2"/>
  <!-- Door (dark steel) -->
  <rect x="130" y="64" width="46" height="76" fill="#3A3D44" stroke="#1F2127" stroke-width="2"/>
  <!-- Door window -->
  <rect x="138" y="74" width="30" height="14" fill="#1F2127"/>
  <rect x="140" y="76" width="26" height="10" fill="#5a4838"/>
  <!-- Door handle -->
  <circle cx="158" cy="106" r="3" fill="#FFD24A"/>
  <!-- 'Ajar' shadow inside the doorframe — suggests the door is open -->
  <path d="M176,64 L182,68 L182,138 L176,140 Z" fill="#1F2127" opacity="0.6"/>
  <!-- Signage above the door -->
  <rect x="120" y="48" width="66" height="14" fill="#FFD24A" opacity="0.9" stroke="#5C3BA3" stroke-width="1"/>
  <text x="153" y="58" font-family="system-ui, sans-serif" font-size="7" fill="#5C3BA3" text-anchor="middle" font-weight="900">BOARD ONLY</text>
  <!-- Yellow warning stripe along bottom -->
  <rect x="8" y="134" width="176" height="4" fill="#FFD24A" opacity="0.7"/>
  <!-- Drain stain -->
  <ellipse cx="60" cy="128" rx="20" ry="2" fill="#5C3BA3" opacity="0.20"/>
</svg>`;
await svgToPng(maintenanceShedSvg, "prop_maintenance_shed.png", 192, 144);
```

- [ ] **Step 2: Generate and verify**

```bash
npm run generate-world
```

Open `play/assets/world/prop_maintenance_shed.png`. Expected: a concrete cube with a vent pipe sticking out the top, a dark right-facing metal door with a gold handle, a yellow "BOARD ONLY" sign above the door, a darker coping at the top of the wall, drain stain, drop shadow. The door visually reads as the exit point.

- [ ] **Step 3: Commit**

```bash
git add tools/generate-world.mjs play/assets/world/prop_maintenance_shed.png
git commit -m "art: L6 maintenance shed prop"
```

---

## Task 5: Generate water tower

**Files:**
- Modify: `tools/generate-world.mjs`
- Output: `play/assets/world/prop_water_tower.png` (192×260)

- [ ] **Step 1: Add water tower SVG**

Append to `tools/generate-world.mjs`:

```js
const waterTowerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="260" viewBox="0 0 192 260">
  <!-- Drop shadow at the base -->
  <ellipse cx="96" cy="257" rx="88" ry="3" fill="#1A0F2E" opacity="0.32"/>
  <!-- Four steel legs forming the stand -->
  <rect x="24"  y="180" width="6" height="78" fill="#3A3D44" stroke="#1F2127" stroke-width="1"/>
  <rect x="60"  y="180" width="6" height="78" fill="#3A3D44" stroke="#1F2127" stroke-width="1"/>
  <rect x="126" y="180" width="6" height="78" fill="#3A3D44" stroke="#1F2127" stroke-width="1"/>
  <rect x="162" y="180" width="6" height="78" fill="#3A3D44" stroke="#1F2127" stroke-width="1"/>
  <!-- Cross-bracing between leg pairs -->
  <line x1="27"  y1="220" x2="63"  y2="246" stroke="#3A3D44" stroke-width="2"/>
  <line x1="63"  y1="220" x2="27"  y2="246" stroke="#3A3D44" stroke-width="2"/>
  <line x1="129" y1="220" x2="165" y2="246" stroke="#3A3D44" stroke-width="2"/>
  <line x1="165" y1="220" x2="129" y2="246" stroke="#3A3D44" stroke-width="2"/>
  <!-- Wood-stave cylinder body -->
  <rect x="14" y="70" width="164" height="120" fill="#7a5a3a" stroke="#1F2127" stroke-width="2"/>
  <!-- Wood staves (vertical lines) -->
  ${[24, 38, 52, 66, 80, 94, 108, 122, 136, 150, 164].map(x => `<line x1="${x}" y1="72" x2="${x}" y2="188" stroke="#5a3a20" stroke-width="1.5" opacity="0.7"/>`).join("")}
  <!-- Steel band hoops around the cylinder -->
  <rect x="12" y="86"  width="168" height="4" fill="#3A3D44" stroke="#1F2127" stroke-width="0.5"/>
  <rect x="12" y="118" width="168" height="4" fill="#3A3D44" stroke="#1F2127" stroke-width="0.5"/>
  <rect x="12" y="150" width="168" height="4" fill="#3A3D44" stroke="#1F2127" stroke-width="0.5"/>
  <rect x="12" y="178" width="168" height="4" fill="#3A3D44" stroke="#1F2127" stroke-width="0.5"/>
  <!-- Conical roof -->
  <path d="M14,70 L96,4 L178,70 Z" fill="#3A3D44" stroke="#1F2127" stroke-width="2"/>
  <!-- Roof highlight (sunlit side) -->
  <path d="M14,70 L96,4 L96,70 Z" fill="#5a5d64" opacity="0.7"/>
  <!-- Faint Swiirl Co. lettering on the tower body -->
  <text x="96" y="135" font-family="serif" font-size="14" fill="#FFD24A" text-anchor="middle" font-style="italic" opacity="0.45">swiirl co.</text>
  <!-- Overall outline -->
  <rect x="14" y="70" width="164" height="120" fill="none" stroke="#5C3BA3" stroke-width="1.5" opacity="0.4"/>
</svg>`;
await svgToPng(waterTowerSvg, "prop_water_tower.png", 192, 260);
```

- [ ] **Step 2: Generate and verify**

```bash
npm run generate-world
```

Open `play/assets/world/prop_water_tower.png`. Expected: a classic Manhattan-style wooden water tower — conical steel roof, wood-stave body with vertical wood grain and four horizontal steel band hoops, faded gold "swiirl co." text mid-body, four steel legs with X-cross-bracing, drop shadow at the base.

- [ ] **Step 3: Commit**

```bash
git add tools/generate-world.mjs play/assets/world/prop_water_tower.png
git commit -m "art: L6 water tower prop"
```

---

## Task 6: Generate satellite dish

**Files:**
- Modify: `tools/generate-world.mjs`
- Output: `play/assets/world/prop_satellite_dish.png` (144×128)

- [ ] **Step 1: Add satellite dish SVG**

Append to `tools/generate-world.mjs`:

```js
const satelliteDishSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="128" viewBox="0 0 144 128">
  <!-- Drop shadow -->
  <ellipse cx="72" cy="125" rx="42" ry="3" fill="#1A0F2E" opacity="0.32"/>
  <!-- Tripod legs -->
  <line x1="56" y1="124" x2="72" y2="80" stroke="#3A3D44" stroke-width="3"/>
  <line x1="88" y1="124" x2="72" y2="80" stroke="#3A3D44" stroke-width="3"/>
  <line x1="72" y1="124" x2="72" y2="80" stroke="#3A3D44" stroke-width="3"/>
  <!-- Tripod base plate -->
  <ellipse cx="72" cy="124" rx="20" ry="3" fill="#3A3D44"/>
  <!-- Mounting arm linking tripod to dish back -->
  <rect x="68" y="68" width="8" height="22" fill="#5a5d64"/>
  <!-- Dish (parabolic ellipse, slightly skyward) -->
  <ellipse cx="72" cy="48" rx="56" ry="40" fill="#5a5d64" stroke="#1F2127" stroke-width="2"/>
  <ellipse cx="72" cy="48" rx="48" ry="34" fill="#3A3D44"/>
  <!-- Concentric rings inside the dish -->
  <ellipse cx="72" cy="48" rx="36" ry="26" fill="none" stroke="#1F2127" stroke-width="1" opacity="0.6"/>
  <ellipse cx="72" cy="48" rx="22" ry="16" fill="none" stroke="#1F2127" stroke-width="1" opacity="0.6"/>
  <!-- Center feedhorn -->
  <circle cx="72" cy="48" r="6" fill="#1F2127"/>
  <line x1="72" y1="48" x2="72" y2="30" stroke="#1F2127" stroke-width="2"/>
  <circle cx="72" cy="28" r="4" fill="#5a5d64" stroke="#1F2127" stroke-width="1"/>
  <!-- Sun-reflection highlight on the dish surface -->
  <ellipse cx="58" cy="36" rx="10" ry="6" fill="#bdb5cf" opacity="0.4"/>
</svg>`;
await svgToPng(satelliteDishSvg, "prop_satellite_dish.png", 144, 128);
```

- [ ] **Step 2: Generate and verify**

```bash
npm run generate-world
```

Open `play/assets/world/prop_satellite_dish.png`. Expected: a parabolic dish tilted slightly skyward, dark interior with two concentric rings, center feedhorn with a small sub-reflector poking up, three-leg tripod base, drop shadow. Reads as "satellite dish on a stand," not "frying pan."

- [ ] **Step 3: Commit**

```bash
git add tools/generate-world.mjs play/assets/world/prop_satellite_dish.png
git commit -m "art: L6 satellite dish prop"
```

---

## Task 7: Generate antenna mast

**Files:**
- Modify: `tools/generate-world.mjs`
- Output: `play/assets/world/prop_antenna_mast.png` (64×220)

- [ ] **Step 1: Add antenna mast SVG**

Append to `tools/generate-world.mjs`:

```js
const antennaMastSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="220" viewBox="0 0 64 220">
  <!-- Drop shadow at the base -->
  <ellipse cx="32" cy="217" rx="20" ry="2.5" fill="#1A0F2E" opacity="0.32"/>
  <!-- Base plate -->
  <rect x="20" y="210" width="24" height="6" fill="#3A3D44" stroke="#1F2127" stroke-width="1"/>
  <!-- Two vertical legs forming the mast (narrow at top, wider at base) -->
  <line x1="26" y1="20" x2="22" y2="210" stroke="#1F2127" stroke-width="2"/>
  <line x1="38" y1="20" x2="42" y2="210" stroke="#1F2127" stroke-width="2"/>
  <!-- Cross-bracing X pattern -->
  ${[20, 40, 60, 80, 100, 120, 140, 160, 180].map(y => `<line x1="${(26 - (y - 20) * 0.02).toFixed(2)}" y1="${y}" x2="${(42 + (y - 20) * 0.02).toFixed(2)}" y2="${y + 20}" stroke="#1F2127" stroke-width="1"/><line x1="${(42 + (y - 20) * 0.02).toFixed(2)}" y1="${y}" x2="${(26 - (y - 20) * 0.02).toFixed(2)}" y2="${y + 20}" stroke="#1F2127" stroke-width="1"/>`).join("")}
  <!-- Horizontal cross-bars -->
  ${[20, 40, 60, 80, 100, 120, 140, 160, 180, 200].map(y => `<line x1="${(26 - (y - 20) * 0.02).toFixed(2)}" y1="${y}" x2="${(38 + (y - 20) * 0.02).toFixed(2)}" y2="${y}" stroke="#1F2127" stroke-width="1"/>`).join("")}
  <!-- Tip antenna spike -->
  <line x1="32" y1="20" x2="32" y2="4" stroke="#1F2127" stroke-width="1.5"/>
  <!-- Gold aircraft-warning light at the tip + halo -->
  <circle cx="32" cy="4" r="6" fill="#FFD24A" opacity="0.3"/>
  <circle cx="32" cy="4" r="3" fill="#FFD24A"/>
  <!-- Guy wires fading down off-canvas -->
  <line x1="32" y1="40" x2="0"  y2="200" stroke="#1F2127" stroke-width="0.5" opacity="0.5"/>
  <line x1="32" y1="40" x2="64" y2="200" stroke="#1F2127" stroke-width="0.5" opacity="0.5"/>
</svg>`;
await svgToPng(antennaMastSvg, "prop_antenna_mast.png", 64, 220);
```

- [ ] **Step 2: Generate and verify**

```bash
npm run generate-world
```

Open `play/assets/world/prop_antenna_mast.png`. Expected: a thin lattice radio mast, X-cross-bracing throughout, a gold tip light with a faint halo, two thin diagonal guy wires going to the lower corners, base plate at the bottom, drop shadow.

- [ ] **Step 3: Commit**

```bash
git add tools/generate-world.mjs play/assets/world/prop_antenna_mast.png
git commit -m "art: L6 antenna mast prop"
```

---

## Task 8: Generate helipad H decal

**Files:**
- Modify: `tools/generate-world.mjs`
- Output: `play/assets/world/prop_helipad_h.png` (320×32)

The helipad is rendered as a **wide, short floor-decal band** that overlays the deck surface in the dressing block. The H pops slightly above the deck line; the circle around it suggests "landing zone." Size is chosen so it spans 5 tiles (x=640..960) and is short enough not to crowd the boss above it.

- [ ] **Step 1: Add helipad H SVG**

Append to `tools/generate-world.mjs`:

```js
const helipadHSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="32" viewBox="0 0 320 32">
  <!-- Faded white outer circle (squashed to read as floor-painted, not aerial-view) -->
  <ellipse cx="160" cy="16" rx="120" ry="14" fill="none" stroke="#EEE6F5" stroke-width="4" opacity="0.85"/>
  <!-- Inner H paint -->
  <rect x="142" y="6"  width="6" height="22" fill="#EEE6F5" opacity="0.9"/>
  <rect x="172" y="6"  width="6" height="22" fill="#EEE6F5" opacity="0.9"/>
  <rect x="142" y="14" width="36" height="6" fill="#EEE6F5" opacity="0.9"/>
  <!-- Scuff marks across the paint -->
  <rect x="120" y="18" width="14" height="2" fill="#1F2127" opacity="0.25"/>
  <rect x="190" y="11" width="20" height="2" fill="#1F2127" opacity="0.20"/>
  <rect x="80"  y="14" width="10" height="2" fill="#1F2127" opacity="0.20"/>
  <rect x="220" y="20" width="18" height="2" fill="#1F2127" opacity="0.22"/>
  <!-- Faded gold inner ring (Swiirl easter-egg accent) -->
  <ellipse cx="160" cy="16" rx="100" ry="11" fill="none" stroke="#FFD24A" stroke-width="1" opacity="0.35"/>
</svg>`;
await svgToPng(helipadHSvg, "prop_helipad_h.png", 320, 32);
```

- [ ] **Step 2: Generate and verify**

```bash
npm run generate-world
```

Open `play/assets/world/prop_helipad_h.png`. Expected: a wide thin band with a faded-white squashed ellipse outline, a centered H painted in white, some dark scuff marks across the paint, a faint inner gold ring. Reads as "helipad markings painted on concrete viewed at an angle."

- [ ] **Step 3: Commit**

```bash
git add tools/generate-world.mjs play/assets/world/prop_helipad_h.png
git commit -m "art: L6 helipad H decal"
```

---

## Task 9: Generate vent stack

**Files:**
- Modify: `tools/generate-world.mjs`
- Output: `play/assets/world/prop_vent_stack.png` (48×80)

- [ ] **Step 1: Add vent stack SVG**

Append to `tools/generate-world.mjs`:

```js
const ventStackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="80" viewBox="0 0 48 80">
  <!-- Drop shadow -->
  <ellipse cx="24" cy="77" rx="18" ry="2" fill="#1A0F2E" opacity="0.32"/>
  <!-- Base flange -->
  <rect x="8" y="68" width="32" height="8" fill="#1F2127"/>
  <!-- Pipe body -->
  <rect x="14" y="20" width="20" height="50" fill="#3A3D44" stroke="#1F2127" stroke-width="1.5"/>
  <!-- Rivets on the pipe -->
  <circle cx="18" cy="34" r="1" fill="#5a5d64"/>
  <circle cx="30" cy="34" r="1" fill="#5a5d64"/>
  <circle cx="18" cy="54" r="1" fill="#5a5d64"/>
  <circle cx="30" cy="54" r="1" fill="#5a5d64"/>
  <!-- Mushroom-cap rain cap on top -->
  <ellipse cx="24" cy="20" rx="18" ry="4" fill="#5a5d64" stroke="#1F2127" stroke-width="1.5"/>
  <ellipse cx="24" cy="14" rx="14" ry="6" fill="#3A3D44" stroke="#1F2127" stroke-width="1.5"/>
  <!-- Side bevels -->
  <rect x="14" y="20" width="2" height="48" fill="#1F2127" opacity="0.5"/>
  <rect x="32" y="20" width="2" height="48" fill="#1F2127" opacity="0.5"/>
</svg>`;
await svgToPng(ventStackSvg, "prop_vent_stack.png", 48, 80);
```

- [ ] **Step 2: Generate and verify**

```bash
npm run generate-world
```

Open `play/assets/world/prop_vent_stack.png`. Expected: a short steel pipe with a mushroom-cap rain cap on top, base flange at the bottom, four small rivets on the pipe body, drop shadow. Reads as "vent pipe on a roof."

- [ ] **Step 3: Update the catalog console.log + commit**

In `tools/generate-world.mjs`, find the catalog logging at the end of the file (around line 646):

```js
console.log("World assets generated:");
console.log("  tiles:    tile_ground, tile_grass, tile_platform, tile_brick");
console.log("  obstacles: bulletin_board, cubicle_wall, velvet_rope, server_rack, marble_pillar");
console.log("  shaft:     tile_shaft_wall");
```

Add a new line after the shaft line:

```js
console.log("  rooftop:   tile_rooftop_concrete + 8 props (parapet, hvac, shed, water_tower, dish, antenna, helipad_h, vent_stack)");
```

Then:

```bash
npm run generate-world
git add tools/generate-world.mjs play/assets/world/prop_vent_stack.png
git commit -m "art: L6 vent stack prop + catalog log"
```

---

## Task 10: Register the 9 new assets in Boot.js

**Files:**
- Modify: `play/src/scenes/Boot.js`

- [ ] **Step 1: Bump ASSET_VERSION**

In `play/src/scenes/Boot.js`, find line 11:

```js
const ASSET_VERSION = "10";
```

Change to:

```js
const ASSET_VERSION = "11";
```

- [ ] **Step 2: Add the 9 new keys to WORLD_IMAGES**

In `play/src/scenes/Boot.js`, find the `WORLD_IMAGES` array starting at line 30. The first entries are:

```js
const WORLD_IMAGES = [
  "tile_ground", "tile_grass", "tile_platform", "tile_brick", "tile_shaft_wall",
```

Add a new row after `"tile_shaft_wall"`:

```js
const WORLD_IMAGES = [
  "tile_ground", "tile_grass", "tile_platform", "tile_brick", "tile_shaft_wall",
  // L6 rooftop — concrete deck + 8 industrial props for the bonus boss arena.
  "tile_rooftop_concrete",
  "prop_parapet", "prop_hvac", "prop_maintenance_shed", "prop_water_tower",
  "prop_satellite_dish", "prop_antenna_mast", "prop_helipad_h", "prop_vent_stack",
```

(Leave the rest of the array unchanged.)

- [ ] **Step 3: Verify in the browser**

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000/play/`. The loading bar should complete without errors (open DevTools Console; missing assets log as Phaser warnings). If any of the 9 keys fail to load, recheck the PNG filename in `play/assets/world/` matches the key exactly.

Stop the dev server (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add play/src/scenes/Boot.js
git commit -m "boot: register L6 rooftop assets + bump version"
```

---

## Task 11: Parameterize buildOneWayFloor with textureKey

**Files:**
- Modify: `play/src/scenes/Game.js` (lines ~143-150 + ~687-695)

The current `buildOneWayFloor` always uses `tile_shaft_wall` as the tile texture. L6's rooftop needs to use `tile_rooftop_concrete`. Add an optional `textureKey` parameter, default to the existing texture so other call sites are unchanged.

- [ ] **Step 1: Update the terrain dispatcher**

In `play/src/scenes/Game.js`, find the block around line 147:

```js
      } else if (t.kind === "oneWayFloor") {
        // One-way platform — player can rise through from below, lands on top.
        // Used for the L6 arena cap so the climbing shaft connects up into it.
        this.buildOneWayFloor(t.x1, t.x2, t.y);
```

Change the call to pass `t.textureKey` through:

```js
      } else if (t.kind === "oneWayFloor") {
        // One-way platform — player can rise through from below, lands on top.
        // Used for the L6 arena cap so the climbing shaft connects up into it.
        this.buildOneWayFloor(t.x1, t.x2, t.y, t.textureKey);
```

- [ ] **Step 2: Add the optional parameter on the builder**

Find `buildOneWayFloor` around line 687:

```js
  buildOneWayFloor(x1, x2, y) {
    for (let x = x1; x < x2; x += TILE_SIZE) {
      const b = this.platforms.create(x + TILE_SIZE / 2, y + TILE_SIZE / 2, "tile_shaft_wall");
      b.body.checkCollision.down  = false;
      b.body.checkCollision.left  = false;
      b.body.checkCollision.right = false;
      b.refreshBody();
    }
  }
```

Replace with:

```js
  buildOneWayFloor(x1, x2, y, textureKey = "tile_shaft_wall") {
    for (let x = x1; x < x2; x += TILE_SIZE) {
      const b = this.platforms.create(x + TILE_SIZE / 2, y + TILE_SIZE / 2, textureKey);
      b.body.checkCollision.down  = false;
      b.body.checkCollision.left  = false;
      b.body.checkCollision.right = false;
      b.refreshBody();
    }
  }
```

- [ ] **Step 3: Verify nothing broke on other levels**

```bash
npm run dev
```

Open `http://localhost:3000/play/`, play L1 normally (no `oneWayFloor` terrain there — should look unchanged). Then teleport into L6 from DevTools console:

```js
window.game.scene.start("Game", { level: 6 })
```

L6 should still render with the old shaft-wall arena cap (we haven't touched the level data yet — this is just verifying the default-arg refactor didn't regress). Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add play/src/scenes/Game.js
git commit -m "game: parameterize buildOneWayFloor with textureKey"
```

---

## Task 12: Rewrite level6.js — concrete deck, shed interior, props field

**Files:**
- Modify: `play/src/levels/level6.js`

- [ ] **Step 1: Rewrite the header comment to reflect the new layout**

Replace lines 1–19 (the old ascii-art header) with:

```js
// Bonus — "Up and to the Right". A vertical climb up a centered shaft
// (x=400..1136, y=600..3104) that ends inside a maintenance shed at the
// top. The player emerges from the shed door onto a full-width concrete
// rooftop where THE BOARD waits on a painted helipad H.
//
//   y=0    sky + distant skyline silhouette
//   y=600  CONCRETE ROOFTOP DECK (x=0..1600, one-way from below)
//          props sit on the deck — see `props` field below
//          BOARD boss on helipad H, brand silhouetted against water tower
//   y=600..664   shed interior — shaft cap is hidden here
//   y=664..3040  climbing shaft (zig-zag platforms, ghosts patrol)
//   y=3104       building ground floor — player spawns at (800, 3024)
```

- [ ] **Step 2: Replace the terrain block**

Find the existing `terrain: [...]` block (lines ~68-105) and replace the WHOLE array with:

```js
  terrain: [
    // ---- BUILDING GROUND FLOOR (full width) ----
    ground(0, 1600),

    // ---- SHAFT WALLS — centered, x=400 and x=1136, run from y=664 (just
    // below the rooftop deck) down to ground level. Players climb between
    // these walls. They stop at y=664 (one tile below the deck) so the
    // shed at the top can hide the hole. ----
    ...wallColumn(400,  664, GROUND_Y - 64),
    ...wallColumn(1136, 664, GROUND_Y - 64),

    // ---- ROOFTOP CONCRETE DECK — full width, one-way (player rises
    // through it inside the shed footprint). ----
    { kind: "oneWayFloor", x1: 0, x2: 1600, y: 600, textureKey: "tile_rooftop_concrete" },

    // ---- HIDDEN SHED INTERIOR — two short walls forming the shed's
    // interior + a landing platform inside. Once the player lands on the
    // platform they walk right past x=912 and emerge out the shed door. ----
    ...wallColumn(720, 600, 664),
    ...wallColumn(912, 600, 664),
    platform(816, 664, 2),

    // ---- SHAFT CLIMB PLATFORMS — zig-zag between the shaft walls.
    // The old topmost platform at GROUND_Y-2720 (y=384) is REMOVED — the
    // new arrival point is the landing platform inside the shed (y=664). ----
    platform(520, GROUND_Y - 220,  3),
    platform(900, GROUND_Y - 380,  3),
    platform(560, GROUND_Y - 560,  3),
    platform(900, GROUND_Y - 760,  3),
    platform(540, GROUND_Y - 940,  3),
    platform(900, GROUND_Y - 1140, 3),
    platform(560, GROUND_Y - 1340, 3),
    platform(900, GROUND_Y - 1540, 3),
    platform(540, GROUND_Y - 1740, 3),
    platform(900, GROUND_Y - 1940, 3),
    platform(560, GROUND_Y - 2140, 3),
    platform(900, GROUND_Y - 2340, 3),
    platform(540, GROUND_Y - 2540, 3),

    // ---- BOTTOM WARM-UP BRICKS ----
    brick(580, GROUND_Y - 110),
    brick(960, GROUND_Y - 110),
  ],
```

- [ ] **Step 3: Add the props field**

Below the `terrain: [...]` array (after its closing `],`), add the new `props` field:

```js
  // Declarative rooftop-prop placements. Game.js iterates this and adds an
  // image per entry. All entries use the default origin (0.5, 1.0) so the
  // y-coordinate is the feet on the deck (y=600). Helipad H is NOT here —
  // it's a floor decal rendered separately in the Game.js dressing block.
  // Depths: tower/shed/HVAC/vent -5, dish/antenna -7. Skyline -15, parapet
  // -8 are owned by the dressing block.
  props: [
    { key: "prop_vent_stack",       x: 180,  y: 600, depth: -5 },
    { key: "prop_hvac",             x: 300,  y: 600, depth: -5 },
    { key: "prop_maintenance_shed", x: 816,  y: 600, depth: -5 },
    { key: "prop_water_tower",      x: 1280, y: 600, depth: -5 },
    { key: "prop_satellite_dish",   x: 1280, y: 460, depth: -7 },
    { key: "prop_antenna_mast",     x: 1500, y: 600, depth: -7 },
  ],
```

- [ ] **Step 4: Move brandPos and adjust the 14th insight**

Find the line `brandPos: { x: 1100, y: 600 },` (around line 56) and change to:

```js
  brandPos: { x: 1300, y: 600 },
```

Find the `insights:` block and locate the last entry (around line 132):

```js
    { x: 800, y: 320 },  // inside the arena, between approach platforms
```

Change to:

```js
    { x: 1100, y: 540 },  // arena insight — between helipad H and water tower, just above deck
```

- [ ] **Step 5: Verify in the browser**

```bash
npm run dev
```

Open `http://localhost:3000/play/`, then in DevTools console:

```js
window.game.scene.start("Game", { level: 6 })
```

Expected at the top: a full-width concrete-textured deck spanning the screen at y=600 — instead of the previous trimmed brick band. The boss should still spawn on the deck. The water tower / HVAC / shed sprites haven't been rendered yet (we wire props in Task 13), so for now the rooftop is bare concrete with the boss in the middle. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add play/src/levels/level6.js
git commit -m "level6: rewrite arena as full-width concrete deck + shed interior"
```

---

## Task 13: Render level.props in Game.js dressing block

**Files:**
- Modify: `play/src/scenes/Game.js` (the L6 conditional block, currently lines 213-322)

The current dressing block has the skyline, sticky-note container, drifting memo, and shooting-star scheduler. We add a `level.props` loop near the top of the block, before the easter eggs, so the props render behind everything else.

- [ ] **Step 1: Add the props loop**

Find the L6 conditional in `play/src/scenes/Game.js` (around line 216):

```js
    if (this.levelNum === 6) {
      const bx = this.brand.x, by = this.brand.y;
      // Distant city skyline behind the rooftop — staggered dark
```

Immediately after the `const bx = this.brand.x, by = this.brand.y;` line, insert:

```js
      // Render declarative rooftop props (level.props). Each entry has
      // key/x/y/depth — origin (0.5, 1.0) so y is the feet on the deck.
      if (Array.isArray(lvl.props)) {
        for (const p of lvl.props) {
          this.add.image(p.x, p.y, p.key).setOrigin(0.5, 1.0).setDepth(p.depth ?? -5);
        }
      }
```

- [ ] **Step 2: Verify in the browser**

```bash
npm run dev
```

Open `http://localhost:3000/play/` and run:

```js
window.game.scene.start("Game", { level: 6 })
```

Expected: the rooftop now has the maintenance shed, HVAC, water tower, satellite dish, antenna mast, and vent stack all sitting on the deck at their declared positions. Sat dish sits up on top of the water tower (y=460). Brand sits in front of the water tower at x=1300. Stop the server.

If a prop appears in the wrong place: check `lvl` is in scope (it should be — it's the `level` data already accessed in this scope as `lvl`). Confirm props array spelled correctly.

- [ ] **Step 3: Commit**

```bash
git add play/src/scenes/Game.js
git commit -m "game: render level.props in L6 dressing"
```

---

## Task 14: Tile parapet + place helipad H decal in dressing block

**Files:**
- Modify: `play/src/scenes/Game.js`

- [ ] **Step 1: Add the parapet tiling and helipad H placement**

In `play/src/scenes/Game.js`, find the props loop you just added (Task 13). Immediately after that loop's closing `}`, insert:

```js
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
```

- [ ] **Step 2: Verify in the browser**

```bash
npm run dev
```

Open `http://localhost:3000/play/` and run:

```js
window.game.scene.start("Game", { level: 6 })
```

Expected: a continuous parapet wall + steel pipe rail visible along the front edge of the rooftop deck (top of the deck band). The painted helipad H circle + H markings appear centered under the boss at roughly x=640..960. Stop the server.

If the parapet is off-screen above the deck: confirm origin is `(0, 1.0)` not `(0.5, 1.0)`. If the helipad floats above the deck instead of sitting on it: confirm origin is `(0.5, 0.0)` not `(0.5, 1.0)`.

- [ ] **Step 3: Commit**

```bash
git add play/src/scenes/Game.js
git commit -m "game: tile parapet + place helipad H decal on L6"
```

---

## Task 15: Re-anchor the sticky-note easter egg to the shed door

**Files:**
- Modify: `play/src/scenes/Game.js`

The current sticky-note container is anchored at `(bx + 22, by - 60)` — i.e. at offsets from the brand position, which was the old "rooftop-door pedestal" placement. The new placement lives on the maintenance shed door at world coords (816, 600) — door handle is around (816 + 62, 600 - 38) = (878, 562) per the shed art's door art (door at x=130..176 in shed-local coords, shed sprite at world x=816 with origin (0.5, 1.0) so its left edge is at x=720, meaning the door is at world x=850..896).

- [ ] **Step 1: Move the sticky container**

In `play/src/scenes/Game.js`, find the sticky-note block (around line 257):

```js
      // 1. Sticky note on the rooftop door — easy to miss, gold paper
      //    with handwritten-looking text. Stuck slightly off-square.
      const sticky = this.add.container(bx + 22, by - 60);
```

Change to:

```js
      // 1. Sticky note on the maintenance shed door — gold paper stuck
      //    slightly off-square, just above the door handle.
      const sticky = this.add.container(870, 540);
```

- [ ] **Step 2: Verify in the browser**

```bash
npm run dev
```

Open `http://localhost:3000/play/`, run:

```js
window.game.scene.start("Game", { level: 6 })
```

Expected: the small gold "Q4 plan" sticky note appears on the upper-left of the maintenance shed door, just above the gold door handle. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add play/src/scenes/Game.js
git commit -m "game: anchor L6 sticky note to shed door"
```

---

## Task 16: Add HVAC vapor wisp effect

**Files:**
- Modify: `play/src/scenes/Game.js`

A small upward-drifting vapor wisp rising from the top of the HVAC condenser sells "this thing is running." Mobile-gated like the skyline.

- [ ] **Step 1: Add the vapor wisp tween**

In `play/src/scenes/Game.js`, find the shooting-star scheduler block (around line 301-321). Immediately AFTER the `scheduleStar();` call but still inside the `if (this.levelNum === 6) { ... }` block, insert:

```js
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
```

- [ ] **Step 2: Verify in the browser**

```bash
npm run dev
```

Open `http://localhost:3000/play/`, run:

```js
window.game.scene.start("Game", { level: 6 })
```

Expected: every 1.4–2.2 seconds, a small pale wisp rises from above the HVAC unit at x=300, drifts up ~50px while fading and expanding, then disappears. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add play/src/scenes/Game.js
git commit -m "game: HVAC vapor wisp on L6"
```

---

## Task 17: Fix Q-cheat L6 cosmetic y-offset bug

**Files:**
- Modify: `play/src/scenes/Game.js`

The Q dev-cheat teleports the player to the brand's x but uses `GROUND_TOP_Y - 60` for the y, which is L1's ground line (656). On L6 the brand is at y=600 — the cheat drops the player 56px above the rooftop deck. Use `this.level.brandPos.y - 60` instead so the offset is relative to the brand's actual height per-level.

- [ ] **Step 1: Update the Q cheat**

In `play/src/scenes/Game.js`, find the Q cheat handler (around line 498):

```js
    this.input.keyboard.on("keydown-Q", () => {
      this.player.insights = this.level.insightsRequired;
      this.game.events.emit("insight-changed", this.player.insights);
      this.game.events.emit("brand-meter", 1, this.player.insights, this.level.insightsRequired);
      // Place Swiirl directly inside the brand's body so the next overlap
      // check fires the cutscene immediately.
      this.player.setPosition(this.level.brandPos.x, GROUND_TOP_Y - 60);
      this.player.setVelocity(0, 0);
      this.player._invulnUntil = this.time.now + 5000;
```

Change the `setPosition` line to use the brand's actual y:

```js
      // Place Swiirl directly inside the brand's body so the next overlap
      // check fires the cutscene immediately.
      this.player.setPosition(this.level.brandPos.x, this.level.brandPos.y - 60);
```

- [ ] **Step 2: Verify in the browser**

```bash
npm run dev
```

Open `http://localhost:3000/play/`. On any level, press `Q`. Expected: the player teleports next to the brand and the cutscene fires. On L6 specifically, run:

```js
window.game.scene.start("Game", { level: 6 })
```

Then press `Q`. Expected: player lands ON or just above the rooftop deck right next to the brand at x=1300 — no longer 56px floating in the air. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add play/src/scenes/Game.js
git commit -m "game: Q cheat uses per-level brand y instead of L1 ground"
```

---

## Task 18: End-to-end playtest (desktop)

**Files:** none (manual verification)

- [ ] **Step 1: Full climb from spawn**

```bash
npm run dev
```

Open `http://localhost:3000/play/`, complete character select, then in DevTools console:

```js
window.game.scene.start("Game", { level: 6 })
```

Walk and climb the shaft from spawn (no cheats). Expected: nothing below y=600 changes visually — same shaft walls, same climb platforms, same ghosts and insights. After the last climb platform at `GROUND_Y - 2540 = 564`, the player jumps up onto the platform at (816, 664) inside the shed, then walks right to exit through the shed door. No visible hole in the rooftop.

- [ ] **Step 2: Boss arena composition check**

Once on the rooftop, eyeball the composition:

- Parapet runs continuously along the front edge
- Vent stack at far left, then HVAC (with vapor wisp rising from it)
- Maintenance shed in the left-center area with sticky note on the door
- Painted helipad H decal centered, boss standing on it
- Water tower right of helipad with brand silhouetted against its body
- Satellite dish atop the water tower
- Antenna mast at the far right
- Distant skyline silhouette behind the rooftop, lit gold windows
- Drifting "BOARD MEETING postponed" memo (wait ~22s)
- Shooting stars (8–16s intervals)

If any prop appears wrong:
- Wrong position: re-check coord in `level.props` array
- Wrong depth (clipped behind/in-front of another sprite): adjust `depth` in `level.props` or the dressing block

- [ ] **Step 3: Boss fight**

Press `B` (boss teleport) and engage THE BOARD. Expected: the boss fight plays exactly as before. The helipad H decal stays painted under the boss — it's depth -6, the boss renders above. Brand is still grabbable when meter is full.

- [ ] **Step 4: Brand delivery → Credits**

Build the brand meter to full (or press `Q` to skip), kill the boss, walk into the brand. Expected: the level-complete celebration fires, brand becomes happy, Credits scene starts after the normal LevelComplete sequence.

- [ ] **Step 5: Commit playtest screenshot (optional)**

If anything visible looks "trash" by the user's standard, STOP and iterate on the offending art file before committing further. The brutal feedback rule applies: if the deck reads as bricks or the props float, those are the same failure modes as the prior six iterations.

No commit for this task — it's verification only.

---

## Task 19: Mobile sanity check

**Files:** none (manual verification)

- [ ] **Step 1: Touch emulation**

Start the dev server (`npm run dev`), open `http://localhost:3000/play/` in Chrome, open DevTools, click the Toggle Device Toolbar (Cmd+Shift+M), pick iPhone 14 Pro or similar.

- [ ] **Step 2: L6 mobile composition**

Reload, character select, teleport via console:

```js
window.game.scene.start("Game", { level: 6 })
```

Expected on mobile (IS_MOBILE true):

- Skyline silhouette is SKIPPED (existing behavior, unchanged)
- Parapet tiling is SKIPPED (new — we added `!IS_MOBILE` to keep sprite count low)
- HVAC vapor wisp is SKIPPED (new — also `!IS_MOBILE`)
- All other props render (HVAC, shed, water tower, dish, antenna, vent, helipad H, sticky note, drifting memo, shooting stars)
- Frame rate stays steady under thumb input
- Touch controls (D-pad, jump, attack, pause, mute) are visible and responsive

If the rooftop reads weak without parapet/skyline, consider re-enabling the parapet on mobile (it's ~25 sprites at 64×48, may still be fine — judgement call by the user after seeing it).

- [ ] **Step 3: Commit (if any tweaks needed)**

If you tweak mobile-skip conditions or any prop position based on mobile feedback, commit with:

```bash
git add play/src/scenes/Game.js
git commit -m "game: L6 mobile tuning after device check"
```

Otherwise, no commit for this task.

---

## Final commit log expected

After Task 18 completes you should have these atomic commits on the branch:

```
art: L6 concrete deck tile
art: L6 parapet tile
art: L6 HVAC condenser prop
art: L6 maintenance shed prop
art: L6 water tower prop
art: L6 satellite dish prop
art: L6 antenna mast prop
art: L6 helipad H decal
art: L6 vent stack prop + catalog log
boot: register L6 rooftop assets + bump version
game: parameterize buildOneWayFloor with textureKey
level6: rewrite arena as full-width concrete deck + shed interior
game: render level.props in L6 dressing
game: tile parapet + place helipad H decal on L6
game: anchor L6 sticky note to shed door
game: HVAC vapor wisp on L6
game: Q cheat uses per-level brand y instead of L1 ground
```

(17 commits.)

---

## Risks during implementation

- **SVG art rejection.** If the user calls a prop "trash" again, iterate on THAT SVG only — do not change the layout. Each prop is committed atomically so reverting one is `git revert <hash>` without losing the others.
- **Shed door arrival feels awkward.** The shed sprite hides the shaft top but if the landing platform at (816, 664) feels too tight, widen it to 3 tiles (`platform(784, 664, 3)`).
- **Helipad H readability with boss.** The boss sprite is large (scale 1.6×) and rendered above the helipad H decal. If the H is fully covered when the boss is centered, increase the prop_helipad_h width so the painted ellipse extends past the boss footprint (e.g. 400×32 instead of 320×32).
- **Parapet visual conflict with corner props.** Parapet is depth -8 (behind props at depth -5/-7). The antenna mast at x=1500 sits in front of the parapet visually, which is correct. If something looks weird (e.g., antenna base clipped by parapet rail), drop antenna depth to -9 or move it slightly inward.
