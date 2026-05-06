// Visual debugger: overlays the FRAMES table on the source sheet.
// Imports FRAMES from extract-sprites.mjs so they stay in sync.
import sharp from "sharp";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SOURCE = resolve(ROOT, "play/assets/source/swiirl-sheet.png");

// Re-parse FRAMES from extract-sprites.mjs without running its main().
// We export FRAMES from there in a moment.
const mod = await import(pathToFileURL(resolve(__dirname, "extract-sprites.mjs")).href);
const BOXES = mod.FRAMES;

const meta = await sharp(SOURCE).metadata();
const W = meta.width, H = meta.height;

let svgRects = "";
for (const [name, b] of Object.entries(BOXES)) {
  svgRects += `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="none" stroke="red" stroke-width="3"/>`;
  svgRects += `<text x="${b.x + 4}" y="${b.y + 16}" font-size="14" font-family="monospace" fill="red" stroke="white" stroke-width="0.5">${name}</text>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svgRects}</svg>`;

await sharp(SOURCE)
  .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
  .toFile(resolve(ROOT, "play/assets/source/_debug-overlay.png"));

console.log("Wrote assets/source/_debug-overlay.png");
