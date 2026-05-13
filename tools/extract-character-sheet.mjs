// Slices a single-character sprite sheet (1 + 8 + 4 + 4 = 17 frames) into the
// 17 named poses at uniform output canvas dimensions, bottom-center anchored.
//
// Usage: node tools/extract-character-sheet.mjs <source.png> <prefix> [outW] [outH]
//
// Outputs into play/assets/world/:
//   <prefix>_idle.png      <prefix>_jump.png       <prefix>_collect.png
//   <prefix>_walk_1.png    <prefix>_fall.png       <prefix>_hurt.png
//   <prefix>_walk_2.png    <prefix>_skid.png       <prefix>_celebrate.png
//   <prefix>_walk_3.png    <prefix>_crouch.png     <prefix>_bounce.png
//   <prefix>_walk_4.png
//   <prefix>_run_1.png ... <prefix>_run_4.png
//   <prefix>.png  (alias of idle — for backwards-compat with code that
//                  references the single-frame texture name)
//
// Background handling: floods both near-WHITE (R,G,B > 235) and the dark
// transparency checker (max ≤ 55, R≈G≈B). One tool handles all sheets.

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, basename } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, "play/assets/world");

const FRAME_NAMES = [
  "idle",
  "walk_1", "walk_2", "walk_3", "walk_4",
  "run_1",  "run_2",  "run_3",  "run_4",
  "jump", "fall", "skid", "crouch",
  "collect", "hurt", "celebrate", "bounce",
];

function isBgPixel(r, g, b) {
  // Light gray / white checker
  if (r > 235 && g > 235 && b > 235) return true;
  // Dark gray / black checker
  if (r <= 55 && g <= 55 && b <= 55) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max - min <= 12) return true;
  }
  return false;
}

function floodFillBackground(rgba, W, H) {
  const visited = new Uint8Array(W * H);
  const queue = new Int32Array(W * H);
  let qH = 0, qT = 0;

  const tryPush = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const idx = y * W + x;
    if (visited[idx]) return;
    const p = idx * 4;
    if (!isBgPixel(rgba[p], rgba[p + 1], rgba[p + 2])) return;
    visited[idx] = 1;
    queue[qT++] = idx;
  };

  for (let x = 0; x < W; x++) { tryPush(x, 0); tryPush(x, H - 1); }
  for (let y = 0; y < H; y++) { tryPush(0, y); tryPush(W - 1, y); }

  while (qH < qT) {
    const idx = queue[qH++];
    const x = idx % W;
    const y = (idx / W) | 0;
    tryPush(x + 1, y); tryPush(x - 1, y); tryPush(x, y + 1); tryPush(x, y - 1);
    tryPush(x + 1, y + 1); tryPush(x + 1, y - 1);
    tryPush(x - 1, y + 1); tryPush(x - 1, y - 1);
  }
  for (let i = 0, p = 3; i < visited.length; i++, p += 4) {
    if (visited[i]) rgba[p] = 0;
  }
}

function findBlobs(rgba, W, H, minArea = 1200) {
  const labels = new Int32Array(W * H);
  const queue = new Int32Array(W * H);
  const components = [];
  let nextId = 1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (labels[idx] !== 0) continue;
      if (rgba[idx * 4 + 3] <= 16) continue;
      let qH = 0, qT = 0;
      queue[qT++] = idx;
      labels[idx] = nextId;
      let area = 0, sumX = 0, sumY = 0;
      let minX = x, minY = y, maxX = x, maxY = y;
      while (qH < qT) {
        const cur = queue[qH++];
        const cx = cur % W;
        const cy = (cur / W) | 0;
        area++; sumX += cx; sumY += cy;
        if (cx < minX) minX = cx;
        if (cy < minY) minY = cy;
        if (cx > maxX) maxX = cx;
        if (cy > maxY) maxY = cy;
        const neigh = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
        for (const [dx, dy] of neigh) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const ni = ny * W + nx;
          if (labels[ni] !== 0) continue;
          if (rgba[ni * 4 + 3] <= 16) continue;
          labels[ni] = nextId;
          queue[qT++] = ni;
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
      row.avgCy = row.items.reduce((s, it) => s + it.cy, 0) / row.items.length;
    } else {
      rows.push({ items: [b], avgCy: b.cy });
    }
  }
  for (const r of rows) r.items.sort((a, b) => a.cx - b.cx);
  return rows.map(r => r.items);
}

function cropBlob(rgba, W, blob) {
  const { x, y, w, h } = blob.bbox;
  const out = Buffer.alloc(w * h * 4);
  for (let yy = 0; yy < h; yy++) {
    const src = ((y + yy) * W + x) * 4;
    const dst = (yy * w) * 4;
    rgba.copy(out, dst, src, src + w * 4);
  }
  return { rgba: out, width: w, height: h };
}

async function writeFrameToCanvas(srcBuf, srcW, srcH, outW, outH, outPath) {
  // Use sharp to resize the cropped frame to fit inside outW × outH while
  // preserving aspect, then place it bottom-center on a transparent canvas.
  const scale = Math.min(outW / srcW, outH / srcH);
  const fitW = Math.max(1, Math.round(srcW * scale));
  const fitH = Math.max(1, Math.round(srcH * scale));
  const resized = await sharp(srcBuf, { raw: { width: srcW, height: srcH, channels: 4 } })
    .resize(fitW, fitH, { kernel: "lanczos3" })
    .raw()
    .toBuffer();

  const offsetX = Math.floor((outW - fitW) / 2);
  const offsetY = outH - fitH; // feet at bottom
  const canvas = Buffer.alloc(outW * outH * 4);
  for (let y = 0; y < fitH; y++) {
    for (let x = 0; x < fitW; x++) {
      const s = (y * fitW + x) * 4;
      const d = ((offsetY + y) * outW + (offsetX + x)) * 4;
      canvas[d]     = resized[s];
      canvas[d + 1] = resized[s + 1];
      canvas[d + 2] = resized[s + 2];
      canvas[d + 3] = resized[s + 3];
    }
  }
  await sharp(canvas, { raw: { width: outW, height: outH, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

async function main() {
  const [, , sourceArg, prefix, outWArg, outHArg] = process.argv;
  if (!sourceArg || !prefix) {
    console.error("usage: node tools/extract-character-sheet.mjs <source.png> <prefix> [outW] [outH]");
    process.exit(1);
  }
  const outW = parseInt(outWArg ?? "120", 10);
  const outH = parseInt(outHArg ?? "140", 10);
  await mkdir(OUT_DIR, { recursive: true });

  console.log(`[${prefix}] loading ${basename(sourceArg)}…`);
  const { data, info } = await sharp(sourceArg).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;

  const rgba = Buffer.from(data);
  floodFillBackground(rgba, W, H);

  const blobs = findBlobs(rgba, W, H);
  if (blobs.length < FRAME_NAMES.length) {
    throw new Error(`[${prefix}] expected ≥${FRAME_NAMES.length} blobs, found ${blobs.length}`);
  }
  blobs.sort((a, b) => b.area - a.area);
  const keep = blobs.slice(0, FRAME_NAMES.length);
  const rows = sortReadingOrder(keep);
  const flat = rows.flat();
  if (flat.length !== FRAME_NAMES.length) {
    throw new Error(`[${prefix}] row dist mismatch: ${rows.map(r => r.length).join("+")}`);
  }
  console.log(`[${prefix}] blobs: total=${blobs.length} kept=${keep.length} rows=${rows.map(r=>r.length).join("+")}`);

  for (let i = 0; i < FRAME_NAMES.length; i++) {
    const name = FRAME_NAMES[i];
    const blob = flat[i];
    const cropped = cropBlob(rgba, W, blob);
    const outPath = resolve(OUT_DIR, `${prefix}_${name}.png`);
    await writeFrameToCanvas(cropped.rgba, cropped.width, cropped.height, outW, outH, outPath);
  }
  // Backwards-compat alias: <prefix>.png is the idle frame, so existing code
  // that references the single-sprite texture keeps working.
  const cropped0 = cropBlob(rgba, W, flat[0]);
  await writeFrameToCanvas(cropped0.rgba, cropped0.width, cropped0.height, outW, outH,
    resolve(OUT_DIR, `${prefix}.png`));
  console.log(`[${prefix}] wrote 17 frames + alias → ${outW}×${outH}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
