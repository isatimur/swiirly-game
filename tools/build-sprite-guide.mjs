// Generates a clean grid PNG showing every extracted character pose with
// visible borders + labels — easy to scan and easy to cut sprites from.
//
// Outputs: play/assets/source/_pose-guide.png
//
// Run after extract-sprites.mjs has produced the individual pose PNGs:
//   node tools/build-sprite-guide.mjs

import sharp from "sharp";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SPRITES_DIR = resolve(ROOT, "play/assets/sprites");
const OUT = resolve(ROOT, "play/assets/source/_pose-guide.png");

// Layout config — tile each pose in a fixed-size cell with breathing room.
const CELL_W = 280;
const CELL_H = 360;          // 320 sprite + 40 label band at the bottom
const PADDING = 12;          // gap between cells
const COLS = 6;              // sprites per row
const BG_COLOR = { r: 26, g: 15, b: 46, alpha: 1 };       // dark purple
const CELL_COLOR = { r: 40, g: 22, b: 68, alpha: 1 };     // slightly lighter
const BORDER_COLOR = "#b892e0";                            // lavender
const LABEL_COLOR = "#ffd24a";

async function main() {
  const files = (await readdir(SPRITES_DIR))
    .filter(f => f.endsWith(".png"))
    .sort();
  if (files.length === 0) {
    console.error("No PNG sprites found. Run extract-sprites.mjs first.");
    process.exit(1);
  }

  const rows = Math.ceil(files.length / COLS);
  const sheetW = COLS * CELL_W + (COLS + 1) * PADDING;
  const sheetH = rows * CELL_H + (rows + 1) * PADDING + 60;  // 60 for header

  // Compose the cell-shaped backgrounds + labels via SVG overlay.
  let svgOverlay = "";
  // Header.
  svgOverlay += `<rect x="0" y="0" width="${sheetW}" height="60" fill="${BORDER_COLOR}"/>`;
  svgOverlay += `<text x="${sheetW / 2}" y="40" font-family="system-ui, sans-serif" font-size="28" font-weight="900" text-anchor="middle" fill="#1a0f2e">SWIIRL  POSE  CUTTING  GUIDE  ·  ${files.length}  POSES</text>`;

  const composites = [];
  for (let i = 0; i < files.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const cellX = PADDING + col * (CELL_W + PADDING);
    const cellY = 60 + PADDING + row * (CELL_H + PADDING);

    // Cell border only — fill is the page bg so sprites show through cleanly.
    svgOverlay += `<rect x="${cellX}" y="${cellY}" width="${CELL_W}" height="${CELL_H}" fill="none" stroke="${BORDER_COLOR}" stroke-width="3"/>`;
    // Inner divider between sprite area and label band.
    svgOverlay += `<line x1="${cellX}" y1="${cellY + 320}" x2="${cellX + CELL_W}" y2="${cellY + 320}" stroke="${BORDER_COLOR}" stroke-width="1" stroke-dasharray="6,4" opacity="0.55"/>`;
    // Crosshair guide at the bottom-center (the sprite's anchor point).
    const anchorX = cellX + CELL_W / 2;
    const anchorY = cellY + 320;
    svgOverlay += `<line x1="${anchorX - 14}" y1="${anchorY}" x2="${anchorX + 14}" y2="${anchorY}" stroke="${BORDER_COLOR}" stroke-width="1" opacity="0.6"/>`;
    svgOverlay += `<line x1="${anchorX}" y1="${anchorY - 14}" x2="${anchorX}" y2="${anchorY + 14}" stroke="${BORDER_COLOR}" stroke-width="1" opacity="0.6"/>`;
    // Label.
    const name = files[i].replace(/\.png$/, "");
    svgOverlay += `<text x="${cellX + CELL_W / 2}" y="${cellY + 350}" font-family="system-ui, sans-serif" font-size="16" font-weight="700" text-anchor="middle" fill="${LABEL_COLOR}" letter-spacing="2">${name.toUpperCase()}</text>`;

    // Composite the sprite PNG into the cell (top-aligned within the 320px area).
    composites.push({
      input: join(SPRITES_DIR, files[i]),
      top: cellY,
      left: cellX,
    });
  }

  const baseBuf = await sharp({
    create: {
      width: sheetW,
      height: sheetH,
      channels: 4,
      background: BG_COLOR,
    },
  }).png().toBuffer();

  // Order: sprites first (so they're visible inside the cells), then the SVG
  // overlay last so the borders + labels render crisply on top.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}">${svgOverlay}</svg>`;
  const allComposites = [
    ...composites,
    { input: Buffer.from(svg), top: 0, left: 0, blend: "over" },
  ];
  await sharp(baseBuf)
    .composite(allComposites)
    .png({ compressionLevel: 9 })
    .toFile(OUT);

  console.log(`Wrote ${OUT}`);
  console.log(`  ${files.length} poses across ${rows} rows × ${COLS} cols`);
  console.log(`  Sheet: ${sheetW} × ${sheetH}px`);
  console.log(`Open it in any image viewer — each pose has a visible border + label.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
