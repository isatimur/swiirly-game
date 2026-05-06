// Extracts individual character poses from the Swiirl game sheet PNG.
// Run once: `npm run extract-sprites`. Outputs assets/sprites/<pose>.png + atlas.json.
//
// Crop boxes were derived by hand from the 1448x1086 source. If you re-export the
// sheet at a different size, regenerate FRAMES below.

import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SOURCE = resolve(ROOT, "play/assets/source/swiirl-sheet.png");
const OUT_DIR = resolve(ROOT, "play/assets/sprites");

// All boxes in source-image pixel coordinates.
//
// New (cleaner, spacious) sheet layout — 1448x1086:
//   Row 1: IDLE (a single card top-left)
//   Row 2: WALK CYCLE (4 frames) + RUN CYCLE (4 frames)
//   Row 3: JUMP, FALL, SKID/STOP, CROUCH (4 cards)
//   Row 4: COLLECT, TAKE DAMAGE, CELEBRATE/WIN, ENEMY BOUNCE (4 cards)
export const FRAMES = {
  // Row 1 — single IDLE pose, top-left.
  idle: { x: 80, y: 80, w: 240, h: 170 },

  // Row 2 — WALK (4 left frames) + RUN (4 right frames).
  // y starts BELOW the "1. CONTACT" caption row.
  walk_1: { x:  30, y: 360, w: 170, h: 175 },
  walk_2: { x: 200, y: 360, w: 170, h: 175 },
  walk_3: { x: 370, y: 360, w: 170, h: 175 },
  walk_4: { x: 540, y: 360, w: 170, h: 175 },
  run_1:  { x: 730, y: 360, w: 170, h: 175 },
  run_2:  { x: 905, y: 360, w: 170, h: 175 },
  run_3:  { x: 1080, y: 360, w: 170, h: 175 },
  run_4:  { x: 1255, y: 360, w: 175, h: 175 },

  // Row 3 — JUMP, FALL, SKID/STOP, CROUCH. y past the "JUMP" / "FALL" labels.
  jump:   { x:   30, y: 595, w: 330, h: 165 },
  fall:   { x:  380, y: 595, w: 330, h: 165 },
  skid:   { x:  730, y: 595, w: 330, h: 165 },
  crouch: { x: 1090, y: 595, w: 330, h: 165 },

  // Row 4 — COLLECT, HURT, CELEBRATE, BOUNCE. y past the long titles.
  collect:   { x:   30, y: 820, w: 330, h: 240 },
  hurt:      { x:  380, y: 820, w: 330, h: 240 },
  celebrate: { x:  730, y: 820, w: 330, h: 240 },
  bounce:    { x: 1090, y: 820, w: 330, h: 240 },
};

// Threshold at which a near-white pixel becomes transparent. The card background
// is roughly #f6f1fb (very pale lilac) so we knock out anything that's brighter
// than this RGB threshold. The character itself is purple — well below it.
const WHITEKEY_THRESHOLD = 235;

async function chromaKeyToTransparent(buffer, width, height) {
  // Walk the raw RGB buffer, append an alpha channel that is 0 where the pixel
  // is "background-white-ish" and 255 elsewhere.
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0, j = 0; i < buffer.length; i += 3, j += 4) {
    const r = buffer[i], g = buffer[i + 1], b = buffer[i + 2];
    out[j] = r;
    out[j + 1] = g;
    out[j + 2] = b;
    // Treat near-white pixels as transparent, with a soft falloff to avoid hard edges.
    const minChannel = Math.min(r, g, b);
    if (minChannel >= WHITEKEY_THRESHOLD) {
      out[j + 3] = 0;
    } else if (minChannel >= WHITEKEY_THRESHOLD - 20) {
      out[j + 3] = Math.round(((WHITEKEY_THRESHOLD - minChannel) / 20) * 255);
    } else {
      out[j + 3] = 255;
    }
  }
  return out;
}

// Many crops catch the edge of the next/previous character on the sheet.
// After chroma-keying, alpha is concentrated in vertical "blobs". This keeps
// only the blob whose center is closest to the crop center, erasing the rest.
function isolateCentralCharacter(rgba, width, height) {
  const colAlpha = new Array(width).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      colAlpha[x] += rgba[(y * width + x) * 4 + 3];
    }
  }
  // Threshold: at least ~3 opaque rows per column to count as "character pixels".
  const threshold = height * 3;
  // Group consecutive opaque columns into regions; allow generous gaps (≤ 25px) to bridge
  // sparse transparency in the hat fluff (white hat → mostly transparent post-chroma-key).
  const GAP_TOLERANCE = 25;
  const regions = [];
  let start = -1;
  let lastStrong = -1;
  for (let x = 0; x < width; x++) {
    if (colAlpha[x] > threshold) {
      if (start < 0) start = x;
      lastStrong = x;
    } else if (start >= 0 && x - lastStrong > GAP_TOLERANCE) {
      regions.push([start, lastStrong]);
      start = -1;
    }
  }
  if (start >= 0) regions.push([start, lastStrong]);

  if (regions.length <= 1) return; // nothing to clean up

  const center = width / 2;
  let best = regions[0];
  let bestDist = Infinity;
  for (const r of regions) {
    const mid = (r[0] + r[1]) / 2;
    const d = Math.abs(mid - center);
    if (d < bestDist) {
      bestDist = d;
      best = r;
    }
  }
  // Zero alpha everywhere outside the chosen region (with a small padding so we
  // don't shave edges of the hat's fluff).
  const PAD = 4;
  const left = Math.max(0, best[0] - PAD);
  const right = Math.min(width - 1, best[1] + PAD);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < left || x > right) {
        rgba[(y * width + x) * 4 + 3] = 0;
      }
    }
  }
}

// After isolation, find the alpha bounding box and crop tight (saves space and
// makes anchoring sprites easier in-engine).
//
// Threshold matters: if we count faint pixels (alpha < 100) the bbox bleeds
// down through the soft shadow under the character's feet — that adds dead
// pixels below the actual character, and once the sprite is bottom-anchored
// the visible character ends up floating above the ground. We use 120 so the
// solid character body defines the bbox; the sub-100-alpha shadow gets clipped.
function trimToAlphaBBox(rgba, width, height) {
  // 200 is the sweet spot: character body has alpha 255, edge antialiasing has
  // alpha 200-255, but the soft floor-shadow chroma-keys to alpha ≤ 178. So
  // 200 keeps the smooth character outline while clipping the shadow.
  const SOLID = 200;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] > SOLID) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { rgba, width, height };
  // Add 2px breathing room.
  minX = Math.max(0, minX - 2);
  minY = Math.max(0, minY - 2);
  maxX = Math.min(width - 1, maxX + 2);
  maxY = Math.min(height - 1, maxY + 2);
  const newW = maxX - minX + 1;
  const newH = maxY - minY + 1;
  const out = Buffer.alloc(newW * newH * 4);
  for (let y = 0; y < newH; y++) {
    for (let x = 0; x < newW; x++) {
      const srcIdx = ((y + minY) * width + (x + minX)) * 4;
      const dstIdx = (y * newW + x) * 4;
      out[dstIdx] = rgba[srcIdx];
      out[dstIdx + 1] = rgba[srcIdx + 1];
      out[dstIdx + 2] = rgba[srcIdx + 2];
      out[dstIdx + 3] = rgba[srcIdx + 3];
    }
  }
  return { rgba: out, width: newW, height: newH };
}

// Uniform output canvas. Every frame is padded to this size with the
// character's bottom-center aligned to (CANVAS_W/2, CANVAS_H - FOOT_PAD).
// This is what stops the character from "bobbing" frame to frame: with origin
// (0.5, 1.0) in Phaser, identical frame sizes + identical foot position means
// the player's pixel position is stable across walk/run frames.
const CANVAS_W = 280;
const CANVAS_H = 320;
const FOOT_PAD = 0; // feet sit exactly at canvas bottom — origin (0.5, 1.0) lands feet on player.y

async function extractFrame(name, box) {
  const region = await sharp(SOURCE)
    .extract({ left: box.x, top: box.y, width: box.w, height: box.h })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let rgba = await chromaKeyToTransparent(region.data, box.w, box.h);
  isolateCentralCharacter(rgba, box.w, box.h);
  const trimmed = trimToAlphaBBox(rgba, box.w, box.h);

  // Pad to uniform canvas, bottom-center aligned.
  const padded = padBottomCenter(trimmed.rgba, trimmed.width, trimmed.height, CANVAS_W, CANVAS_H, FOOT_PAD);

  const outPath = resolve(OUT_DIR, `${name}.png`);
  await sharp(padded, {
    raw: { width: CANVAS_W, height: CANVAS_H, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  return { name, file: `${name}.png`, w: CANVAS_W, h: CANVAS_H };
}

function padBottomCenter(srcRgba, srcW, srcH, dstW, dstH, footPad) {
  const out = Buffer.alloc(dstW * dstH * 4); // zero-filled = fully transparent
  // If the source is taller than the canvas, scale it down to fit (preserve aspect).
  let copyW = srcW, copyH = srcH, useRgba = srcRgba;
  if (srcH > dstH - footPad) {
    // (extremely unlikely with our crops, but keep it safe)
    const scale = (dstH - footPad) / srcH;
    copyW = Math.max(1, Math.round(srcW * scale));
    copyH = Math.max(1, Math.round(srcH * scale));
    useRgba = nearestNeighborResize(srcRgba, srcW, srcH, copyW, copyH);
  }
  const offsetX = Math.round((dstW - copyW) / 2);
  const offsetY = dstH - copyH - footPad;

  for (let y = 0; y < copyH; y++) {
    for (let x = 0; x < copyW; x++) {
      const sIdx = (y * copyW + x) * 4;
      const dIdx = ((offsetY + y) * dstW + (offsetX + x)) * 4;
      out[dIdx]     = useRgba[sIdx];
      out[dIdx + 1] = useRgba[sIdx + 1];
      out[dIdx + 2] = useRgba[sIdx + 2];
      out[dIdx + 3] = useRgba[sIdx + 3];
    }
  }
  return out;
}

function nearestNeighborResize(src, sw, sh, dw, dh) {
  const out = Buffer.alloc(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(sh - 1, Math.floor(y * sh / dh));
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(sw - 1, Math.floor(x * sw / dw));
      const sIdx = (sy * sw + sx) * 4;
      const dIdx = (y * dw + x) * 4;
      out[dIdx]     = src[sIdx];
      out[dIdx + 1] = src[sIdx + 1];
      out[dIdx + 2] = src[sIdx + 2];
      out[dIdx + 3] = src[sIdx + 3];
    }
  }
  return out;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  console.log(`Extracting ${Object.keys(FRAMES).length} frames from ${SOURCE}...`);
  const results = [];
  for (const [name, box] of Object.entries(FRAMES)) {
    const r = await extractFrame(name, box);
    results.push(r);
    console.log(`  ✓ ${r.name}  (${r.w}x${r.h})`);
  }

  // Write a manifest other code can read at load time.
  const atlas = {
    image: "swiirl-sheet.png",
    frames: results.reduce((acc, r) => {
      acc[r.name] = { file: r.file, w: r.w, h: r.h };
      return acc;
    }, {}),
  };
  await writeFile(resolve(OUT_DIR, "atlas.json"), JSON.stringify(atlas, null, 2));

  console.log(`\nDone. Output: ${OUT_DIR}`);
  console.log("Open a few of the PNGs to visually verify the crops look right.");
  console.log("If a pose is misaligned, tune its FRAMES entry and re-run.");
}

// Only run extraction when invoked directly (not when imported by debug-crops.mjs).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
