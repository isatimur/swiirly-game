// Generates the world art (tiles, enemies, collectibles, brand, decor) by
// rendering inline SVG to PNG via sharp. Run once: `npm run generate-world`.
// Output goes to assets/world/.
//
// Everything here uses the Swiirl palette so the level reads as one piece:
//   #5C3BA3 deep grape  |  #8B63C9 mid violet  |  #B892E0 lilac
//   #DCC7F2 mist        |  #EEE6F5 fog        |  #FFFFFF white
//   accents: #FFD24A insight gold  |  #FF8FBE bubblegum
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = resolve(ROOT, "play/assets/world");

await mkdir(OUT, { recursive: true });

async function svgToPng(svg, file, w, h) {
  await sharp(Buffer.from(svg)).resize(w, h).png({ compressionLevel: 9 }).toFile(resolve(OUT, file));
}

const TILE = 64;

// ============================================================================
// TILES
// ============================================================================
const groundSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#B892E0"/>
      <stop offset="1" stop-color="#8B63C9"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" fill="url(#g)"/>
  <rect x="0" y="0" width="64" height="6" fill="#DCC7F2"/>
  <rect x="0" y="58" width="64" height="6" fill="#5C3BA3" opacity="0.55"/>
  <circle cx="14" cy="22" r="3" fill="#DCC7F2" opacity="0.45"/>
  <circle cx="42" cy="34" r="3" fill="#DCC7F2" opacity="0.40"/>
  <circle cx="28" cy="50" r="2.5" fill="#5C3BA3" opacity="0.35"/>
  <rect x="0" y="0" width="64" height="64" fill="none" stroke="#5C3BA3" stroke-width="1" opacity="0.3"/>
</svg>`;
await svgToPng(groundSvg, "tile_ground.png", TILE, TILE);

const grassTopSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#B892E0"/>
      <stop offset="1" stop-color="#8B63C9"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" fill="url(#g)"/>
  <rect x="0" y="0" width="64" height="14" fill="#DCC7F2"/>
  <path d="M0,14 Q4,8 8,14 T16,14 T24,14 T32,14 T40,14 T48,14 T56,14 T64,14 L64,18 L0,18 Z" fill="#EEE6F5"/>
  <circle cx="14" cy="34" r="3" fill="#DCC7F2" opacity="0.45"/>
  <circle cx="42" cy="46" r="3" fill="#DCC7F2" opacity="0.40"/>
  <rect x="0" y="0" width="64" height="64" fill="none" stroke="#5C3BA3" stroke-width="1" opacity="0.3"/>
</svg>`;
await svgToPng(grassTopSvg, "tile_grass.png", TILE, TILE);

// Standing surface stays at y=14 to match the physics body offset; we extend
// the VISIBLE block down to y=60 (was y=50) so the platform reads as a chunky
// brick under the player rather than a thin wafer. Added side bevels and a
// bottom shadow stripe for depth.
const platformSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <!-- Drop shadow on the ground beneath the block -->
  <ellipse cx="32" cy="62" rx="28" ry="2.5" fill="#1A0F2E" opacity="0.32"/>
  <!-- Main block, rounded top, square bottom -->
  <path d="M4,20 Q4,14 10,14 L54,14 Q60,14 60,20 L60,60 L4,60 Z" fill="#B892E0" stroke="#5C3BA3" stroke-width="2"/>
  <!-- Top highlight band (the standing surface, matches body y=14-24) -->
  <rect x="6" y="14" width="52" height="11" rx="4" fill="#DCC7F2"/>
  <!-- Side bevels for dimensionality -->
  <rect x="4" y="26" width="3" height="32" fill="#9D80C0" opacity="0.75"/>
  <rect x="57" y="26" width="3" height="32" fill="#9D80C0" opacity="0.75"/>
  <!-- Bottom shadow stripe so it doesn't read flat -->
  <rect x="6" y="53" width="52" height="6" rx="2" fill="#5C3BA3" opacity="0.45"/>
  <!-- Texture spots -->
  <circle cx="16" cy="36" r="2" fill="#5C3BA3" opacity="0.5"/>
  <circle cx="32" cy="42" r="2" fill="#5C3BA3" opacity="0.5"/>
  <circle cx="48" cy="36" r="2" fill="#5C3BA3" opacity="0.5"/>
</svg>`;
await svgToPng(platformSvg, "tile_platform.png", TILE, TILE);

const brickSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#8B63C9"/>
  <line x1="0" y1="32" x2="64" y2="32" stroke="#5C3BA3" stroke-width="2"/>
  <line x1="32" y1="0" x2="32" y2="32" stroke="#5C3BA3" stroke-width="2"/>
  <line x1="0" y1="32" x2="0" y2="32"/>
  <line x1="16" y1="32" x2="16" y2="64" stroke="#5C3BA3" stroke-width="2"/>
  <line x1="48" y1="32" x2="48" y2="64" stroke="#5C3BA3" stroke-width="2"/>
  <rect x="2" y="2" width="60" height="60" fill="none" stroke="#DCC7F2" stroke-width="1.5" opacity="0.45"/>
</svg>`;
await svgToPng(brickSvg, "tile_brick.png", TILE, TILE);

// ============================================================================
// THEMED OBSTACLES — one signature per level. 96×96 so they read as a chunky
// single-tile-wide barrier that needs a real jump. Physics body matches the
// full 96×96 footprint (set up in Game.buildObstacle). All draw with origin
// (0.5, 1.0) so the y-coordinate is the feet, matching every other world
// sprite.
// ============================================================================

// L1 — Picket fence (Community Park). White wood, pointed tops, low fence.
const fencePicketSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <!-- ground shadow -->
  <ellipse cx="48" cy="92" rx="42" ry="3" fill="#1A0F2E" opacity="0.32"/>
  <!-- horizontal rails -->
  <rect x="2" y="58" width="92" height="6" fill="#EEE6F5" stroke="#5C3BA3" stroke-width="1.5" rx="2"/>
  <rect x="2" y="78" width="92" height="6" fill="#EEE6F5" stroke="#5C3BA3" stroke-width="1.5" rx="2"/>
  <!-- five pickets, each pointed top -->
  ${[6, 24, 42, 60, 78].map((x) => `
    <path d="M${x},32 L${x + 12},32 L${x + 12},90 L${x},90 Z M${x},32 L${x + 6},22 L${x + 12},32 Z"
          fill="#FFFFFF" stroke="#5C3BA3" stroke-width="1.8"/>
  `).join("")}
  <!-- ribbon — tiny insight gold accent for brand -->
  <rect x="36" y="46" width="24" height="4" fill="#FFD24A" rx="1" opacity="0.85"/>
</svg>`;
await svgToPng(fencePicketSvg, "obstacle_picket_fence.png", 96, 96);

// L2 — Cubicle wall (Corporate Maze). Gray panel + post-it sticky.
const cubicleWallSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <ellipse cx="48" cy="92" rx="42" ry="3" fill="#1A0F2E" opacity="0.32"/>
  <!-- panel base -->
  <rect x="6" y="20" width="84" height="70" fill="#9aa0a8" stroke="#3a3d44" stroke-width="2" rx="3"/>
  <!-- fabric texture -->
  ${Array.from({ length: 10 }, (_, i) => `<line x1="6" y1="${24 + i * 7}" x2="90" y2="${24 + i * 7}" stroke="#7a8088" stroke-width="0.5" opacity="0.5"/>`).join("")}
  <!-- panel cap -->
  <rect x="4" y="18" width="88" height="6" fill="#3a3d44" rx="2"/>
  <!-- post-it -->
  <rect x="24" y="32" width="28" height="22" fill="#ffd24a" stroke="#a07820" stroke-width="0.8" transform="rotate(-5,38,43)"/>
  <line x1="28" y1="40" x2="48" y2="40" stroke="#5C3BA3" stroke-width="0.8" opacity="0.7" transform="rotate(-5,38,43)"/>
  <line x1="28" y1="44" x2="44" y2="44" stroke="#5C3BA3" stroke-width="0.8" opacity="0.7" transform="rotate(-5,38,43)"/>
  <line x1="28" y1="48" x2="46" y2="48" stroke="#5C3BA3" stroke-width="0.8" opacity="0.7" transform="rotate(-5,38,43)"/>
  <!-- coffee ring -->
  <circle cx="68" cy="62" r="6" fill="none" stroke="#6a4828" stroke-width="1.2" opacity="0.6"/>
</svg>`;
await svgToPng(cubicleWallSvg, "obstacle_cubicle_wall.png", 96, 96);

// L3 — Velvet rope stanchion (Brand HQ). Brass posts + red rope.
const velvetRopeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <ellipse cx="48" cy="92" rx="38" ry="3" fill="#1A0F2E" opacity="0.32"/>
  <!-- left stanchion -->
  <ellipse cx="18" cy="88" rx="10" ry="3" fill="#a07820"/>
  <rect x="14" y="40" width="8" height="48" fill="#d4a060" stroke="#6a4828" stroke-width="1.5"/>
  <circle cx="18" cy="36" r="7" fill="#f4c478" stroke="#6a4828" stroke-width="1.5"/>
  <circle cx="18" cy="36" r="3" fill="#d4a060"/>
  <!-- right stanchion -->
  <ellipse cx="78" cy="88" rx="10" ry="3" fill="#a07820"/>
  <rect x="74" y="40" width="8" height="48" fill="#d4a060" stroke="#6a4828" stroke-width="1.5"/>
  <circle cx="78" cy="36" r="7" fill="#f4c478" stroke="#6a4828" stroke-width="1.5"/>
  <circle cx="78" cy="36" r="3" fill="#d4a060"/>
  <!-- rope (catenary curve, deep red) -->
  <path d="M24,40 Q48,62 72,40" fill="none" stroke="#a02830" stroke-width="6" stroke-linecap="round"/>
  <path d="M24,40 Q48,62 72,40" fill="none" stroke="#d04450" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
  <!-- tassel -->
  <line x1="48" y1="56" x2="48" y2="64" stroke="#d4a060" stroke-width="1.5"/>
  <circle cx="48" cy="66" r="3" fill="#a07820"/>
</svg>`;
await svgToPng(velvetRopeSvg, "obstacle_velvet_rope.png", 96, 96);

// L4 — Server rack (Data Lake). Dark, lit LEDs, matches bg_data_lake palette.
const serverRackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <ellipse cx="48" cy="92" rx="42" ry="3" fill="#000814" opacity="0.45"/>
  <!-- rack chassis -->
  <rect x="8" y="8" width="80" height="84" fill="#0a1e28" stroke="#1a5060" stroke-width="2" rx="3"/>
  <!-- top vent strip -->
  <rect x="12" y="12" width="72" height="8" fill="#0d2a38" stroke="#1a5060" stroke-width="0.8"/>
  ${Array.from({ length: 12 }, (_, i) => `<rect x="${14 + i * 6}" y="14" width="2" height="4" fill="#08151e"/>`).join("")}
  <!-- server units (4 rows × 3 cols of slots) -->
  ${Array.from({ length: 4 }, (_, r) =>
    Array.from({ length: 3 }, (_, c) => {
      const sx = 14 + c * 24;
      const sy = 26 + r * 16;
      const lit = (r + c) % 3 !== 0;
      const errLed = (r * 3 + c) === 5;
      return `<rect x="${sx}" y="${sy}" width="20" height="12" fill="${lit ? '#0a3848' : '#081824'}" stroke="#1a5060" stroke-width="0.8"/>` +
             (lit ? `<rect x="${sx + 2}" y="${sy + 4}" width="3" height="3" fill="#20e8c0" opacity="0.95"/>` : '') +
             (errLed ? `<rect x="${sx + 14}" y="${sy + 4}" width="3" height="3" fill="#ff6040" opacity="0.95"/>` : '') +
             `<rect x="${sx + 8}" y="${sy + 7}" width="9" height="1" fill="#1a5060" opacity="0.6"/>`;
    }).join("")
  ).join("")}
  <!-- bottom power LED -->
  <circle cx="80" cy="86" r="2.5" fill="#20e8c0" opacity="0.9"/>
</svg>`;
await svgToPng(serverRackSvg, "obstacle_server_rack.png", 96, 96);

// L5 — Marble pillar (Executive Summit). Light marble, capital + base.
const marblePillarSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <ellipse cx="48" cy="92" rx="36" ry="3" fill="#1A0F2E" opacity="0.32"/>
  <!-- base -->
  <rect x="14" y="80" width="68" height="12" fill="#d8d0c8" stroke="#a8a098" stroke-width="1.5"/>
  <rect x="18" y="76" width="60" height="6" fill="#e8e0d8" stroke="#a8a098" stroke-width="1.2"/>
  <!-- shaft -->
  <rect x="26" y="20" width="44" height="58" fill="#f0e8e0" stroke="#a8a098" stroke-width="1.5"/>
  <!-- fluting lines -->
  ${[32, 40, 48, 56, 64].map((x) => `<line x1="${x}" y1="22" x2="${x}" y2="76" stroke="#c8c0b8" stroke-width="1" opacity="0.7"/>`).join("")}
  <!-- subtle marble vein -->
  <path d="M32,30 Q44,42 38,56 Q34,68 48,72" fill="none" stroke="#b0a898" stroke-width="0.8" opacity="0.55"/>
  <!-- capital -->
  <rect x="20" y="14" width="56" height="8" fill="#e8e0d8" stroke="#a8a098" stroke-width="1.5"/>
  <rect x="16" y="6" width="64" height="10" fill="#f0e8e0" stroke="#a8a098" stroke-width="1.5"/>
  <!-- gold ring under capital — corporate luxury cue -->
  <rect x="20" y="22" width="56" height="2" fill="#FFD24A" opacity="0.85"/>
</svg>`;
await svgToPng(marblePillarSvg, "obstacle_marble_pillar.png", 96, 96);

const cloudSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60" viewBox="0 0 160 60">
  <ellipse cx="40" cy="40" rx="34" ry="20" fill="#FFFFFF" opacity="0.85"/>
  <ellipse cx="80" cy="32" rx="38" ry="24" fill="#FFFFFF" opacity="0.85"/>
  <ellipse cx="120" cy="40" rx="32" ry="20" fill="#FFFFFF" opacity="0.85"/>
  <ellipse cx="60" cy="50" rx="20" ry="6" fill="#DCC7F2" opacity="0.5"/>
</svg>`;
await svgToPng(cloudSvg, "cloud.png", 160, 60);

// ============================================================================
// ENEMIES — incompetence themed
// ============================================================================
const jargonBlobSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="64" viewBox="0 0 80 64">
  <defs>
    <radialGradient id="b" cx="50%" cy="40%" r="60%">
      <stop offset="0" stop-color="#9aa0a8"/>
      <stop offset="1" stop-color="#5d6168"/>
    </radialGradient>
  </defs>
  <ellipse cx="40" cy="38" rx="32" ry="22" fill="url(#b)"/>
  <path d="M10,40 Q14,30 20,38 Q26,28 32,38 Q38,30 44,38 Q50,28 56,38 Q62,30 68,38 Q72,46 64,52 L18,52 Q10,46 10,40 Z" fill="#5d6168"/>
  <ellipse cx="30" cy="36" rx="6" ry="7" fill="#fff"/>
  <ellipse cx="50" cy="36" rx="6" ry="7" fill="#fff"/>
  <circle cx="31" cy="38" r="3" fill="#222"/>
  <circle cx="51" cy="38" r="3" fill="#222"/>
  <path d="M28,48 Q40,52 52,48" fill="none" stroke="#222" stroke-width="2" stroke-linecap="round"/>
  <text x="40" y="20" font-family="monospace" font-size="9" fill="#fff" text-anchor="middle" opacity="0.65">SYNERGY</text>
</svg>`;
await svgToPng(jargonBlobSvg, "enemy_jargon_blob.png", 80, 64);

const ghostSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="80" viewBox="0 0 64 80">
  <path d="M32,4 Q56,4 56,28 L56,68 L48,76 L40,68 L32,76 L24,68 L16,76 L8,68 L8,28 Q8,4 32,4 Z" fill="#DCC7F2" opacity="0.85"/>
  <ellipse cx="22" cy="32" rx="5" ry="7" fill="#fff"/>
  <ellipse cx="42" cy="32" rx="5" ry="7" fill="#fff"/>
  <circle cx="22" cy="34" r="2.5" fill="#5C3BA3"/>
  <circle cx="42" cy="34" r="2.5" fill="#5C3BA3"/>
  <path d="M24,46 Q32,52 40,46" fill="none" stroke="#5C3BA3" stroke-width="2" stroke-linecap="round"/>
  <text x="32" y="20" font-family="serif" font-style="italic" font-size="9" fill="#5C3BA3" text-anchor="middle" opacity="0.7">gut feel</text>
</svg>`;
await svgToPng(ghostSvg, "enemy_ghost.png", 64, 80);

// Paperwork extends visibly to the bottom of the canvas so when y=GROUND_Y it
// actually sits ON the ground (no visual "floating").
const paperPileSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <rect x="10" y="58" width="60" height="22" fill="#f0e7d4" stroke="#5C3BA3" stroke-width="2" rx="2" transform="rotate(-2,40,69)"/>
  <rect x="14" y="42" width="58" height="22" fill="#f8efdc" stroke="#5C3BA3" stroke-width="2" rx="2" transform="rotate(3,40,53)"/>
  <rect x="8" y="28" width="60" height="22" fill="#f0e7d4" stroke="#5C3BA3" stroke-width="2" rx="2" transform="rotate(-4,40,39)"/>
  <line x1="14" y1="36" x2="60" y2="36" stroke="#8B63C9" stroke-width="1.5" opacity="0.5"/>
  <line x1="14" y1="40" x2="50" y2="40" stroke="#8B63C9" stroke-width="1.5" opacity="0.5"/>
  <circle cx="28" cy="20" r="6" fill="#fff"/>
  <circle cx="44" cy="20" r="6" fill="#fff"/>
  <circle cx="28" cy="20" r="2.5" fill="#5C3BA3"/>
  <circle cx="44" cy="20" r="2.5" fill="#5C3BA3"/>
  <path d="M30,28 Q36,24 42,28" fill="none" stroke="#5C3BA3" stroke-width="2" stroke-linecap="round"/>
</svg>`;
await svgToPng(paperPileSvg, "enemy_paperwork.png", 80, 80);

const projectileSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="24" viewBox="0 0 32 24">
  <rect x="2" y="4" width="28" height="16" fill="#f8efdc" stroke="#5C3BA3" stroke-width="1.5" rx="2"/>
  <line x1="6" y1="10" x2="22" y2="10" stroke="#8B63C9" stroke-width="1" opacity="0.7"/>
  <line x1="6" y1="14" x2="18" y2="14" stroke="#8B63C9" stroke-width="1" opacity="0.7"/>
</svg>`;
await svgToPng(projectileSvg, "projectile_paper.png", 32, 24);

const bossSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="140" viewBox="0 0 120 140">
  <defs>
    <linearGradient id="suit" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#3a3d44"/>
      <stop offset="1" stop-color="#1f2127"/>
    </linearGradient>
  </defs>
  <rect x="22" y="50" width="76" height="80" fill="url(#suit)" stroke="#000" stroke-width="2" rx="4"/>
  <polygon points="60,55 50,72 70,72" fill="#fff"/>
  <polygon points="60,55 56,68 60,72 64,68" fill="#5C3BA3"/>
  <circle cx="60" cy="32" r="26" fill="#e8c4a0"/>
  <ellipse cx="50" cy="30" rx="4" ry="5" fill="#fff"/>
  <ellipse cx="70" cy="30" rx="4" ry="5" fill="#fff"/>
  <circle cx="50" cy="32" r="2" fill="#000"/>
  <circle cx="70" cy="32" r="2" fill="#000"/>
  <path d="M48,12 Q60,4 72,12 Q70,18 60,18 Q50,18 48,12 Z" fill="#2a2a2a"/>
  <path d="M50,42 Q60,46 70,42" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round"/>
  <rect x="14" y="62" width="20" height="44" fill="url(#suit)" stroke="#000" stroke-width="2" rx="3" transform="rotate(-15,24,84)"/>
  <rect x="86" y="62" width="20" height="44" fill="url(#suit)" stroke="#000" stroke-width="2" rx="3" transform="rotate(15,96,84)"/>
  <rect x="2" y="92" width="22" height="14" fill="#f0e7d4" stroke="#5C3BA3" stroke-width="1" rx="2" transform="rotate(-15,12,99)"/>
  <text x="12" y="103" font-family="monospace" font-size="6" fill="#5C3BA3" text-anchor="middle" transform="rotate(-15,12,99)">TPS</text>
</svg>`;
await svgToPng(bossSvg, "enemy_boss.png", 120, 140);

// ============================================================================
// COLLECTIBLES
// ============================================================================
const insightSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <defs>
    <radialGradient id="o" cx="35%" cy="30%" r="60%">
      <stop offset="0" stop-color="#FFF6CC"/>
      <stop offset="0.5" stop-color="#FFD24A"/>
      <stop offset="1" stop-color="#C68A00"/>
    </radialGradient>
  </defs>
  <circle cx="20" cy="20" r="16" fill="url(#o)" stroke="#7d4f00" stroke-width="1.5"/>
  <path d="M20,8 Q14,18 20,32 Q26,18 20,8 Z" fill="#fff" opacity="0.45"/>
  <text x="20" y="26" font-family="serif" font-size="18" font-weight="bold" fill="#7d4f00" text-anchor="middle">i</text>
</svg>`;
await svgToPng(insightSvg, "insight.png", 40, 40);

const signalSpeedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <defs>
    <radialGradient id="s" cx="50%" cy="40%" r="60%">
      <stop offset="0" stop-color="#fff"/>
      <stop offset="1" stop-color="#FF8FBE"/>
    </radialGradient>
  </defs>
  <circle cx="24" cy="24" r="20" fill="url(#s)" stroke="#a64072" stroke-width="2"/>
  <polygon points="18,12 32,22 22,22 28,38 14,26 24,26" fill="#fff"/>
</svg>`;
await svgToPng(signalSpeedSvg, "signal_speed.png", 48, 48);

const signalShieldSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <defs>
    <radialGradient id="sh" cx="50%" cy="40%" r="60%">
      <stop offset="0" stop-color="#fff"/>
      <stop offset="1" stop-color="#7DC4FF"/>
    </radialGradient>
  </defs>
  <circle cx="24" cy="24" r="20" fill="url(#sh)" stroke="#3870ab" stroke-width="2"/>
  <path d="M24,8 L36,14 L36,26 Q36,36 24,42 Q12,36 12,26 L12,14 Z" fill="#fff" stroke="#3870ab" stroke-width="2"/>
  <path d="M18,24 L22,28 L30,18" stroke="#3870ab" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
await svgToPng(signalShieldSvg, "signal_shield.png", 48, 48);

const signalGrowthSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <defs>
    <radialGradient id="gr" cx="50%" cy="40%" r="60%">
      <stop offset="0" stop-color="#fff"/>
      <stop offset="1" stop-color="#7BD389"/>
    </radialGradient>
  </defs>
  <circle cx="24" cy="24" r="20" fill="url(#gr)" stroke="#3a7c47" stroke-width="2"/>
  <path d="M24,38 L24,18 M16,26 L24,18 L32,26" stroke="#3a7c47" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="24" cy="14" r="3" fill="#3a7c47"/>
</svg>`;
await svgToPng(signalGrowthSvg, "signal_growth.png", 48, 48);

// ============================================================================
// BRAND NPC (the level-end goal)
// ============================================================================
const brandSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160" viewBox="0 0 120 160">
  <rect x="40" y="60" width="40" height="80" fill="#FFD24A" stroke="#7d4f00" stroke-width="3" rx="6"/>
  <circle cx="60" cy="40" r="28" fill="#FFE9A8" stroke="#7d4f00" stroke-width="3"/>
  <ellipse cx="50" cy="38" rx="3" ry="4" fill="#222"/>
  <ellipse cx="70" cy="38" rx="3" ry="4" fill="#222"/>
  <path d="M50,52 Q60,46 70,52" stroke="#222" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M40,18 Q60,2 80,18 L78,28 Q60,18 42,28 Z" fill="#5C3BA3"/>
  <text x="60" y="108" font-family="sans-serif" font-size="11" font-weight="700" fill="#7d4f00" text-anchor="middle">BRAND</text>
  <rect x="32" y="118" width="56" height="6" fill="#FFD24A" stroke="#7d4f00" stroke-width="2"/>
  <rect x="42" y="140" width="10" height="20" fill="#7d4f00"/>
  <rect x="68" y="140" width="10" height="20" fill="#7d4f00"/>
  <text x="60" y="86" font-family="serif" font-size="18" fill="#7d4f00" text-anchor="middle">?</text>
</svg>`;
await svgToPng(brandSvg, "brand.png", 120, 160);

const brandHappySvg = brandSvg.replace(`<text x="60" y="86" font-family="serif" font-size="18" fill="#7d4f00" text-anchor="middle">?</text>`,
  `<text x="60" y="88" font-family="serif" font-size="22" fill="#3a7c47" text-anchor="middle" font-weight="700">!</text>`)
  .replace(`<path d="M50,52 Q60,46 70,52"`, `<path d="M48,50 Q60,60 72,50"`);
await svgToPng(brandHappySvg, "brand_happy.png", 120, 160);

// ============================================================================
// BACKGROUND — three parallax layers
// ============================================================================
const bgFarSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#2a1846"/>
      <stop offset="0.5" stop-color="#5C3BA3"/>
      <stop offset="1" stop-color="#B892E0"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#sky)"/>
  <circle cx="180" cy="160" r="2" fill="#fff" opacity="0.8"/>
  <circle cx="420" cy="80" r="1.5" fill="#fff" opacity="0.6"/>
  <circle cx="700" cy="120" r="2" fill="#fff" opacity="0.7"/>
  <circle cx="980" cy="60" r="1.5" fill="#fff" opacity="0.5"/>
  <circle cx="1180" cy="180" r="2" fill="#fff" opacity="0.8"/>
  <circle cx="1100" cy="160" r="100" fill="#FFE9A8" opacity="0.95"/>
  <circle cx="1100" cy="160" r="100" fill="none" stroke="#FFD24A" stroke-width="2" opacity="0.5"/>
</svg>`;
await svgToPng(bgFarSvg, "bg_far.png", 1280, 720);

const bgMidSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="720" viewBox="0 0 2560 720">
  <g fill="#5C3BA3" opacity="0.85">
    <polygon points="0,720 0,460 200,360 380,440 540,320 700,420 860,360 1020,440 1180,340 1340,420 1500,360 1660,440 1820,320 1980,400 2140,360 2300,440 2460,380 2560,420 2560,720"/>
  </g>
  <g fill="#8B63C9" opacity="0.9">
    <polygon points="0,720 0,540 160,460 320,520 480,440 640,500 800,460 960,520 1120,460 1280,500 1440,440 1600,520 1760,460 1920,500 2080,460 2240,520 2400,460 2560,500 2560,720"/>
  </g>
</svg>`;
await svgToPng(bgMidSvg, "bg_mid.png", 2560, 720);

// "Community" houses & shapes in the near-bg layer
const bgNearSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="720" viewBox="0 0 2560 720">
  ${Array.from({ length: 12 }, (_, i) => {
    const x = i * 220 + 40;
    const h = 80 + (i % 3) * 30;
    const colors = ["#B892E0", "#DCC7F2", "#8B63C9"];
    const c = colors[i % 3];
    return `
      <rect x="${x}" y="${720 - h - 60}" width="160" height="${h}" fill="${c}" stroke="#5C3BA3" stroke-width="2"/>
      <polygon points="${x - 8},${720 - h - 60} ${x + 80},${720 - h - 100} ${x + 168},${720 - h - 60}" fill="#5C3BA3"/>
      <rect x="${x + 20}" y="${720 - h - 30}" width="20" height="22" fill="#FFD24A" opacity="0.85"/>
      <rect x="${x + 60}" y="${720 - h - 30}" width="20" height="22" fill="#FFD24A" opacity="0.85"/>
      <rect x="${x + 100}" y="${720 - h - 30}" width="20" height="22" fill="#FFD24A" opacity="0.85"/>
      <rect x="${x + 70}" y="${720 - 60 - 26}" width="20" height="26" fill="#5C3BA3"/>
    `;
  }).join("")}
</svg>`;
await svgToPng(bgNearSvg, "bg_near.png", 2560, 720);

// "Office tower" mid background just for the boss arena (act 3)
const bgTowerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="720" viewBox="0 0 2560 720">
  ${Array.from({ length: 6 }, (_, i) => {
    const x = i * 460 + 60;
    const h = 320 + (i % 3) * 60;
    return `
      <rect x="${x}" y="${720 - h - 60}" width="280" height="${h}" fill="#3a3d44" stroke="#000" stroke-width="2"/>
      ${Array.from({ length: Math.floor(h / 40) }, (_, j) =>
        Array.from({ length: 5 }, (_, k) =>
          `<rect x="${x + 24 + k * 50}" y="${720 - h - 60 + 16 + j * 40}" width="30" height="22" fill="${(j + k + i) % 4 === 0 ? '#FFD24A' : '#1f2127'}"/>`
        ).join("")
      ).join("")}
    `;
  }).join("")}
</svg>`;
await svgToPng(bgTowerSvg, "bg_tower.png", 2560, 720);

// Pickup particle / sparkle
const sparkleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <polygon points="8,0 9,7 16,8 9,9 8,16 7,9 0,8 7,7" fill="#FFE9A8"/>
</svg>`;
await svgToPng(sparkleSvg, "sparkle.png", 16, 16);

// ============================================================================
// NEW ENEMY — DeadlineBot (80×80)
// Boxy robot, clock-face head, red urgent eyes, 3-light chest panel.
// ============================================================================
const deadlineBotSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <defs>
    <linearGradient id="bd" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#4a4a52"/><stop offset="1" stop-color="#2a2a30"/>
    </linearGradient>
    <radialGradient id="ey" cx="50%" cy="40%" r="60%">
      <stop offset="0" stop-color="#ff6633"/><stop offset="1" stop-color="#cc2200"/>
    </radialGradient>
  </defs>
  <rect x="18" y="62" width="12" height="18" fill="#2a2a30" rx="2"/>
  <rect x="50" y="62" width="12" height="18" fill="#2a2a30" rx="2"/>
  <rect x="14" y="74" width="20" height="6" fill="#1a1a20" rx="2"/>
  <rect x="46" y="74" width="20" height="6" fill="#1a1a20" rx="2"/>
  <rect x="14" y="34" width="52" height="32" fill="url(#bd)" stroke="#555560" stroke-width="2" rx="4"/>
  <rect x="22" y="40" width="36" height="18" fill="#1a1a22" stroke="#444" stroke-width="1" rx="2"/>
  <circle cx="30" cy="49" r="4" fill="#ff3300" opacity="0.9"/>
  <circle cx="40" cy="49" r="4" fill="#ffaa00" opacity="0.9"/>
  <circle cx="50" cy="49" r="4" fill="#ff3300" opacity="0.9"/>
  <line x1="40" y1="6" x2="40" y2="14" stroke="#555560" stroke-width="3" stroke-linecap="round"/>
  <circle cx="40" cy="5" r="3" fill="#ff6633"/>
  <circle cx="40" cy="22" r="18" fill="url(#bd)" stroke="#666670" stroke-width="2"/>
  <circle cx="40" cy="22" r="14" fill="#f0f0e8" stroke="#aaa" stroke-width="1"/>
  <ellipse cx="33" cy="20" rx="4" ry="5" fill="url(#ey)"/>
  <ellipse cx="47" cy="20" rx="4" ry="5" fill="url(#ey)"/>
  <circle cx="33" cy="20" r="1.5" fill="#fff" opacity="0.7"/>
  <circle cx="47" cy="20" r="1.5" fill="#fff" opacity="0.7"/>
  <line x1="40" y1="22" x2="40" y2="11" stroke="#cc2200" stroke-width="2" stroke-linecap="round"/>
  <line x1="40" y1="22" x2="47" y2="22" stroke="#333" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="40" y1="9" x2="40" y2="12" stroke="#888" stroke-width="1"/>
  <line x1="40" y1="32" x2="40" y2="35" stroke="#888" stroke-width="1"/>
  <line x1="27" y1="22" x2="30" y2="22" stroke="#888" stroke-width="1"/>
  <line x1="50" y1="22" x2="53" y2="22" stroke="#888" stroke-width="1"/>
</svg>`;
await svgToPng(deadlineBotSvg, "enemy_deadline_bot.png", 80, 80);

// ============================================================================
// NEW BG — Data Lake near-layer (2560×720)
// Industrial server-room: teal water at base, server racks, connecting pipes.
// ============================================================================
const bgDataLakeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="720" viewBox="0 0 2560 720">
  <rect width="2560" height="720" fill="#040e14" opacity="0"/>
  <!-- water band -->
  <rect x="0" y="572" width="2560" height="148" fill="#083848" opacity="0.9"/>
  <rect x="0" y="572" width="2560" height="8" fill="#10a0b0" opacity="0.6"/>
  ${Array.from({ length: 14 }, (_, i) => {
    const wx = i * 190 + 20;
    return `<path d="M${wx},578 Q${wx + 40},568 ${wx + 80},578 Q${wx + 120},588 ${wx + 160},578" fill="none" stroke="#1ac8d8" stroke-width="1.5" opacity="0.35"/>`;
  }).join("")}
  <!-- server towers -->
  ${Array.from({ length: 9 }, (_, i) => {
    const sx = i * 290 + 30;
    const sh = 200 + (i % 4) * 30;
    const sy = 572 - sh;
    const rows = Math.floor(sh / 38);
    return `
      <rect x="${sx}" y="${sy}" width="220" height="${sh}" fill="#0a1e28" stroke="#1a5060" stroke-width="2"/>
      <rect x="${sx}" y="${sy}" width="220" height="14" fill="#0d2a38"/>
      ${Array.from({ length: rows }, (_, r) =>
        Array.from({ length: 4 }, (_, c) => {
          const lit = (r + c + i) % 5 !== 0;
          return `<rect x="${sx + 16 + c * 50}" y="${sy + 20 + r * 38}" width="36" height="24" fill="${lit ? '#0a3848' : '#081824'}" stroke="#1a5060" stroke-width="1"/>` +
            (lit && (r + c) % 3 === 0 ? `<rect x="${sx + 24 + c * 50}" y="${sy + 26 + r * 38}" width="4" height="4" fill="#20e8c0" opacity="0.9"/>` : '') +
            ((r + c) % 4 === 1 ? `<rect x="${sx + 30 + c * 50}" y="${sy + 26 + r * 38}" width="4" height="4" fill="#ff6040" opacity="0.8"/>` : '');
        }).join("")
      ).join("")}
      <rect x="${sx + 90}" y="${sy - 20}" width="8" height="20" fill="#1a5060"/>
      <circle cx="${sx + 94}" cy="${sy - 22}" r="4" fill="#20e8c0" opacity="0.7"/>
    `;
  }).join("")}
  <!-- connecting pipes -->
  ${Array.from({ length: 8 }, (_, i) => {
    const px = i * 320 + 140;
    const py1 = 400 + (i % 3) * 40;
    const py2 = 490 + (i % 2) * 30;
    return `<line x1="${px}" y1="${py1}" x2="${px + 200}" y2="${py2}" stroke="#1a5060" stroke-width="6" stroke-linecap="round" opacity="0.7"/>
            <circle cx="${px}" cy="${py1}" r="8" fill="#0d2a38" stroke="#1a5060" stroke-width="2"/>
            <circle cx="${px + 200}" cy="${py2}" r="8" fill="#0d2a38" stroke="#1a5060" stroke-width="2"/>`;
  }).join("")}
</svg>`;
await svgToPng(bgDataLakeSvg, "bg_data_lake.png", 2560, 720);

// ============================================================================
// NEW BG — Executive floor near-layer (2560×720)
// Glass curtain-wall, marble floor, city lights visible through glass panels.
// ============================================================================
const bgExecutiveSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="720" viewBox="0 0 2560 720">
  <!-- floor -->
  <rect x="0" y="590" width="2560" height="130" fill="#c8c0b8" opacity="0.9"/>
  <rect x="0" y="590" width="2560" height="6" fill="#e8e0d8"/>
  ${Array.from({ length: 20 }, (_, i) => `<line x1="${i * 128}" y1="590" x2="${i * 128 + 64}" y2="720" stroke="#b0a898" stroke-width="1" opacity="0.4"/>`).join("")}
  <!-- ceiling strip -->
  <rect x="0" y="0" width="2560" height="30" fill="#f0f0f0" opacity="0.7"/>
  ${Array.from({ length: 16 }, (_, i) => `<rect x="${i * 160 + 10}" y="4" width="140" height="18" fill="#ffffff" opacity="0.9"/>`).join("")}
  <!-- glass curtain-wall panels (16 panels × 160px wide) -->
  ${Array.from({ length: 16 }, (_, i) => {
    const gx = i * 160;
    const cityLights = Array.from({ length: 20 }, (_, j) => {
      const lx = gx + (j % 5) * 28 + 14;
      const ly = 60 + Math.floor(j / 5) * 80 + (i % 3) * 20;
      const bright = (i + j) % 3 !== 0;
      return `<rect x="${lx}" y="${ly}" width="${12 + (j % 3) * 6}" height="${8 + (j % 2) * 6}" fill="${bright ? '#ffe8a0' : '#4060a0'}" opacity="${bright ? 0.6 : 0.4}"/>`;
    }).join("");
    return `
      <rect x="${gx + 2}" y="30" width="156" height="558" fill="#6080a0" opacity="0.12" stroke="#c0d0e0" stroke-width="2"/>
      ${cityLights}
      <line x1="${gx + 80}" y1="30" x2="${gx + 80}" y2="588" stroke="#c0d0e0" stroke-width="1" opacity="0.3"/>
    `;
  }).join("")}
  <!-- mullion verticals -->
  ${Array.from({ length: 17 }, (_, i) => `<rect x="${i * 160 - 3}" y="0" width="6" height="590" fill="#d0d8e0" opacity="0.8"/>`).join("")}
  <!-- floor reflection -->
  <rect x="0" y="596" width="2560" height="60" fill="#a0b0c0" opacity="0.15"/>
</svg>`;
await svgToPng(bgExecutiveSvg, "bg_executive.png", 2560, 720);

console.log("World assets generated:");
console.log("  tiles:    tile_ground, tile_grass, tile_platform, tile_brick");
console.log("  obstacles: picket_fence, cubicle_wall, velvet_rope, server_rack, marble_pillar");
console.log("  decor:    cloud, sparkle");
console.log("  enemies:  jargon_blob, ghost, paperwork, projectile_paper, boss, deadline_bot");
console.log("  pickups:  insight, signal_speed, signal_shield, signal_growth");
console.log("  brand:    brand, brand_happy");
console.log("  bg:       bg_far, bg_mid, bg_near, bg_tower, bg_data_lake, bg_executive");
