// Slices the v2 Swiirl sheet (dark-checker background) into the 17 named
// player frames at uniform 280x320, bottom-center anchored.
//
// Pipeline:
//   1. Flood-fill the dark transparency-checker from every border pixel.
//      Inner dark pixels (the eyes) are surrounded by purple and survive.
//   2. Connected-component labelling on the alpha channel finds every sprite blob.
//   3. The 17 largest blobs (drops the goomba illustration) are sorted into
//      reading order — bucketed into rows by y-centroid, then left→right within
//      each row — and assigned to the 17 named frames.
//   4. Each blob is cropped tight, then padded to 280x320 with feet at the
//      bottom-center. Matches the convention the original extract-sprites uses
//      so Player.js (origin 0.5, 1.0) stays unchanged.

import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SOURCE = resolve(ROOT, "play/assets/source/swiirl-sheet-v2.png");
const OUT_DIR = resolve(ROOT, "play/assets/sprites");

const CANVAS_W = 280;
const CANVAS_H = 320;

// Reading-order assignment. The sheet has 17 character frames in 4 rows
// (1 + 8 + 4 + 4) plus a stray goomba in the corner that we discard.
const FRAME_NAMES = [
  // row 0 (just one large idle)
  "idle",
  // row 1 (4 walks + 4 runs)
  "walk_1", "walk_2", "walk_3", "walk_4",
  "run_1",  "run_2",  "run_3",  "run_4",
  // row 2 (4 poses)
  "jump", "fall", "skid", "crouch",
  // row 3 (4 poses)
  "collect", "hurt", "celebrate", "bounce",
];

// "Is this pixel part of the dark transparency checker?"
// The checker uses two grayscale tones — pure-ish black (~RGB 0–15) and a
// slightly lighter gray (~RGB 22–55). Both are tight on R≈G≈B (true grayscale).
// Character pixels are colored (R, G, B differ markedly) AND brighter.
function isBgPixel(r, g, b) {
  if (r > 60 || g > 60 || b > 60) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (max - min) <= 12;
}

function floodFillBackground(rgba, W, H) {
  const visited = new Uint8Array(W * H);
  // BFS queue using a typed array as a ring buffer for speed.
  const queue = new Int32Array(W * H);
  let qHead = 0, qTail = 0;

  const tryPush = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const idx = y * W + x;
    if (visited[idx]) return;
    const p = idx * 4;
    if (!isBgPixel(rgba[p], rgba[p + 1], rgba[p + 2])) return;
    visited[idx] = 1;
    queue[qTail++] = idx;
  };

  // Seed from every border pixel that is itself background-colored.
  for (let x = 0; x < W; x++) { tryPush(x, 0); tryPush(x, H - 1); }
  for (let y = 0; y < H; y++) { tryPush(0, y); tryPush(W - 1, y); }

  // 8-neighbour expansion. We include diagonals so antialiased checker edges
  // — which can fall through 4-neighbour cracks — still get covered.
  while (qHead < qTail) {
    const idx = queue[qHead++];
    const x = idx % W;
    const y = (idx / W) | 0;
    tryPush(x + 1, y);
    tryPush(x - 1, y);
    tryPush(x, y + 1);
    tryPush(x, y - 1);
    tryPush(x + 1, y + 1);
    tryPush(x + 1, y - 1);
    tryPush(x - 1, y + 1);
    tryPush(x - 1, y - 1);
  }

  // Zero the alpha on every flooded pixel.
  for (let i = 0, p = 3; i < visited.length; i++, p += 4) {
    if (visited[i]) rgba[p] = 0;
  }
  return rgba;
}

// Label connected non-transparent components (alpha > 16). Returns one
// object per component: { id, bbox: {x,y,w,h}, area, cx, cy }.
function findBlobs(rgba, W, H, minArea = 1500) {
  const labels = new Int32Array(W * H); // 0 = unlabelled
  const queue = new Int32Array(W * H);
  const components = [];
  let nextId = 1;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (labels[idx] !== 0) continue;
      if (rgba[idx * 4 + 3] <= 16) continue;

      let qHead = 0, qTail = 0;
      queue[qTail++] = idx;
      labels[idx] = nextId;
      let area = 0, sumX = 0, sumY = 0;
      let minX = x, minY = y, maxX = x, maxY = y;

      while (qHead < qTail) {
        const cur = queue[qHead++];
        const cx = cur % W;
        const cy = (cur / W) | 0;
        area++; sumX += cx; sumY += cy;
        if (cx < minX) minX = cx;
        if (cy < minY) minY = cy;
        if (cx > maxX) maxX = cx;
        if (cy > maxY) maxY = cy;

        // 8-neighbour
        const neigh = [
          [cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1],
          [cx + 1, cy + 1], [cx + 1, cy - 1], [cx - 1, cy + 1], [cx - 1, cy - 1],
        ];
        for (const [nx, ny] of neigh) {
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const nidx = ny * W + nx;
          if (labels[nidx] !== 0) continue;
          if (rgba[nidx * 4 + 3] <= 16) continue;
          labels[nidx] = nextId;
          queue[qTail++] = nidx;
        }
      }
      if (area >= minArea) {
        components.push({
          id: nextId, area,
          cx: sumX / area, cy: sumY / area,
          bbox: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
        });
      }
      nextId++;
    }
  }
  return components;
}

// Sort blobs into reading order. Bucket by y-centroid into rows; within each
// row sort by x-centroid. Row bucket tolerance is auto-derived from the
// median blob height so the algorithm doesn't need tuning per-sheet.
function sortReadingOrder(blobs) {
  const heights = blobs.map(b => b.bbox.h).sort((a, b) => a - b);
  const medianH = heights[heights.length >> 1] || 100;
  const rowTol = medianH * 0.55;

  const sortedByY = [...blobs].sort((a, b) => a.cy - b.cy);
  const rows = [];
  for (const b of sortedByY) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(b.cy - row.avgCy) <= rowTol) {
      row.items.push(b);
      // Rolling average centroid for stability.
      row.avgCy = row.items.reduce((s, it) => s + it.cy, 0) / row.items.length;
    } else {
      rows.push({ items: [b], avgCy: b.cy });
    }
  }
  for (const r of rows) r.items.sort((a, b) => a.cx - b.cx);
  return rows.map(r => r.items);
}

// Crop the blob region tight from the cleaned rgba buffer.
function cropBlob(rgba, W, blob) {
  const { x, y, w, h } = blob.bbox;
  const out = Buffer.alloc(w * h * 4);
  for (let yy = 0; yy < h; yy++) {
    const srcRow = ((y + yy) * W + x) * 4;
    const dstRow = (yy * w) * 4;
    rgba.copy(out, dstRow, srcRow, srcRow + w * 4);
  }
  return { rgba: out, width: w, height: h };
}

function padBottomCenter(srcRgba, srcW, srcH, dstW, dstH) {
  const out = Buffer.alloc(dstW * dstH * 4); // zero-filled = fully transparent
  let copyW = srcW, copyH = srcH, useRgba = srcRgba;
  if (srcH > dstH || srcW > dstW) {
    const scale = Math.min(dstW / srcW, dstH / srcH);
    copyW = Math.max(1, Math.round(srcW * scale));
    copyH = Math.max(1, Math.round(srcH * scale));
    useRgba = nearestResize(srcRgba, srcW, srcH, copyW, copyH);
  }
  const offsetX = Math.round((dstW - copyW) / 2);
  const offsetY = dstH - copyH;
  for (let y = 0; y < copyH; y++) {
    for (let x = 0; x < copyW; x++) {
      const s = (y * copyW + x) * 4;
      const d = ((offsetY + y) * dstW + (offsetX + x)) * 4;
      out[d]     = useRgba[s];
      out[d + 1] = useRgba[s + 1];
      out[d + 2] = useRgba[s + 2];
      out[d + 3] = useRgba[s + 3];
    }
  }
  return out;
}

function nearestResize(src, sw, sh, dw, dh) {
  const out = Buffer.alloc(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(sh - 1, Math.floor(y * sh / dh));
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(sw - 1, Math.floor(x * sw / dw));
      const s = (sy * sw + sx) * 4;
      const d = (y * dw + x) * 4;
      out[d]     = src[s];
      out[d + 1] = src[s + 1];
      out[d + 2] = src[s + 2];
      out[d + 3] = src[s + 3];
    }
  }
  return out;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  console.log(`Loading ${SOURCE}…`);
  const { data, info } = await sharp(SOURCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  console.log(`  ${W}x${H}, ${info.channels}-channel`);

  console.log("Flood-filling dark checker background → transparent…");
  const rgba = Buffer.from(data); // mutable copy
  floodFillBackground(rgba, W, H);

  // Quick QA dump of the cleaned sheet — overwrite swiirl-sheet.png so other
  // tools / preview code that points at the original key still works.
  await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(resolve(ROOT, "play/assets/source/swiirl-sheet.png"));
  console.log("  wrote play/assets/source/swiirl-sheet.png (cleaned)");

  console.log("Detecting sprite blobs…");
  const blobs = findBlobs(rgba, W, H);
  console.log(`  found ${blobs.length} components`);
  if (blobs.length < FRAME_NAMES.length) {
    throw new Error(`expected at least ${FRAME_NAMES.length} blobs, got ${blobs.length}`);
  }

  // Keep the 17 largest, discarding goomba + any stray dust puffs that got
  // segmented from the runner sprites.
  blobs.sort((a, b) => b.area - a.area);
  const keep = blobs.slice(0, FRAME_NAMES.length);
  console.log(`  kept top ${keep.length} by area; dropped ${blobs.length - keep.length}`);

  console.log("Sorting blobs into reading order…");
  const rows = sortReadingOrder(keep);
  const flat = rows.flat();
  console.log(`  rows: ${rows.map(r => r.length).join(" + ")} = ${flat.length}`);
  if (flat.length !== FRAME_NAMES.length) {
    throw new Error(`row distribution doesn't match expected 1+8+4+4 — got ${rows.map(r => r.length).join("+")}`);
  }

  console.log("Writing 17 frames…");
  const results = [];
  for (let i = 0; i < FRAME_NAMES.length; i++) {
    const name = FRAME_NAMES[i];
    const blob = flat[i];
    const cropped = cropBlob(rgba, W, blob);
    const padded = padBottomCenter(cropped.rgba, cropped.width, cropped.height, CANVAS_W, CANVAS_H);
    const outPath = resolve(OUT_DIR, `${name}.png`);
    await sharp(padded, { raw: { width: CANVAS_W, height: CANVAS_H, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    results.push({ name, file: `${name}.png`, w: CANVAS_W, h: CANVAS_H,
                   srcBox: blob.bbox });
    console.log(`  ✓ ${name.padEnd(11)}  src=${blob.bbox.w}x${blob.bbox.h} @ (${blob.bbox.x},${blob.bbox.y})`);
  }

  const atlas = {
    image: "swiirl-sheet.png",
    sourceImage: "swiirl-sheet-v2.png",
    frames: results.reduce((acc, r) => {
      acc[r.name] = { file: r.file, w: r.w, h: r.h, srcBox: r.srcBox };
      return acc;
    }, {}),
  };
  await writeFile(resolve(OUT_DIR, "atlas.json"), JSON.stringify(atlas, null, 2));
  console.log(`\nDone. Output: ${OUT_DIR}`);
  console.log("Reload the browser to see the new sprites.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
