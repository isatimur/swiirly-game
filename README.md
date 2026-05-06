# Swiirl — the platformer

> Fight incompetence. Bring insights from communities to brands.

A side-scrolling platformer starring **Swiirl** — the round purple hero with the
fluffy "swiirl" hat. Swiirl gathers *insights* from communities, defeats
incompetence, and delivers what really matters to the brands who need to hear it.

This repo ships two things:

| Path | What it is |
| --- | --- |
| `/` | Marketing landing page (`index.html`) |
| `/play/` | The game itself — Phaser 3, single static folder |

## Run locally

```bash
npm install
npm run build-assets   # one-time: extract Swiirl sprites + generate world art
npm run dev            # serves at http://localhost:3000
```

Then open `http://localhost:3000` for the landing page, or `http://localhost:3000/play/` to play directly.

## Controls

| Action | Keys |
| --- | --- |
| Move | ← → or A D |
| Run | hold Shift |
| Jump · double-jump | Space, ↑, or W (press twice in the air) |
| Crouch | ↓ or S |
| Restart level | R |
| Mute | M |

## Project layout

```
swiirly-game/
  index.html              landing page (marketing)
  vercel.json             deploy config
  package.json            build scripts (extract sprites / generate world art / serve)
  tools/
    extract-sprites.mjs   slices Swiirl frames out of the reference PNG
    generate-world.mjs    renders SVG → PNG for tiles, enemies, pickups, brand
    debug-crops.mjs       overlays the FRAMES table onto the source sheet for crop tuning
  play/
    index.html            game entry — loads Phaser CDN + main.js
    favicon.png
    src/
      main.js             Phaser config + scene registration
      config.js           tunable constants (gravity, jump, palette, hitbox)
      audio.js            Web Audio SFX (no audio files shipped)
      scenes/             Boot, Menu, Game, HUD, LevelComplete, GameOver
      objects/            Player, Enemies, Collectibles, Brand
      levels/level1.js    Community Park level data
    assets/
      source/             original game sheet PNG (input)
      sprites/            17 extracted Swiirl frames, uniform 280×320
      world/              tiles, enemies, pickups, brand, parallax backgrounds
```

## Tech

- **[Phaser 3](https://phaser.io)** loaded from CDN — no build step, no bundler
- **Vanilla ES modules**
- **Arcade physics** (gravity 2200, custom accel/drag, double-jump)
- **Web Audio API** for procedural SFX (zero binary audio assets)
- **`sharp`** at build time for sprite extraction and SVG→PNG generation
- **Vercel** for static hosting

## Game design

### What's in the box

- **Hero**: Swiirl, with a state machine (idle / walk / run / jump / fall / skid / crouch / hurt / celebrate) wired to extracted frames from the official character sheet.
- **Enemies** (the "incompetence" theme):
  - **Jargon-blob** — patrols platforms, dies on stomp.
  - **Gut-feel ghost** — sine-wave float, ignores gravity.
  - **Paperwork pile** — stationary, launches paper projectiles.
  - **Incompetence Manager** — three-stomp boss before the brand reveal.
- **Collectibles**:
  - **Insights** (yellow orbs) — fill the brand-meter.
  - **Community Signals** (power-ups) — *Speed*, *Shield*, *Growth*.
- **Level**: *Community Park*, three acts in one polished side-scroller (~3–5 minutes per run).
- **Brand reveal cutscene**: Swiirl walks into a clearing, hands the brand twelve insights, and the brand finally understands.

### Level design notes

- All sprites use origin `(0.5, 1.0)` — `y` is the FEET. Anything at ground level uses `y = GROUND_Y`.
- Highest platform sits at `GROUND_Y - 320`. Single jump reaches ~176 px; double-jump chains to ~329 px — enough to clear every platform with margin.
- Pits respawn the player at the act's start with brief invulnerability.

## Build asset pipeline

```bash
npm run extract-sprites   # play/assets/source/swiirl-sheet.png → play/assets/sprites/*.png (17 frames + atlas.json)
npm run generate-world    # SVG strings → play/assets/world/*.png (tiles, enemies, decor, parallax)
npm run build-assets      # runs both
```

If you swap in a new reference sheet, edit the `FRAMES` table in `tools/extract-sprites.mjs` and re-run. Use `node tools/debug-crops.mjs` to see the crop boxes overlaid on the source — fast iteration loop.

## Deploy

Push to GitHub, import in Vercel — done. The static folder layout works as-is. `vercel.json` handles cache headers, the `/play` route, and trailing slashes.

```bash
# CLI deploy
npx vercel --prod
```

## Credits

- Character design: Swiirl game sheet (purple hero, white fluffy hat, "swiirl" wordmark)
- Code: built for Swiirl
