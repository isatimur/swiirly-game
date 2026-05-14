// Slices a single-row VFX flipbook (N frames side-by-side on a neutral gray
// background) into N PNGs with alpha-keyed transparency.
//
// Usage: node tools/extract-vfx-strip.mjs <source.png> <prefix> [frames] [outSize] [outDir]
//   frames  default 4
//   outSize default 256 (square output canvas, centered)
//   outDir  default play/assets/world/
//
// Algorithm: every pixel's alpha is derived from how much brighter the pixel
// is than the sheet's gray base. Bright gold slashes/glows become opaque,
// neutral gray fades to transparent. Each of the N equal-width cells is then
// tight-cropped and centered on the output canvas.

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

async function main() {
  const [, , source, prefix, framesArg, outSizeArg, outDirArg] = process.argv;
  if (!source || !prefix) {
    console.error("usage: extract-vfx-strip.mjs <source.png> <prefix> [frames=4] [outSize=256] [outDir=play/assets/world]");
    process.exit(1);
  }
  const N = parseInt(framesArg ?? "4", 10);
  const OUT_SIZE = parseInt(outSizeArg ?? "256", 10);
  const OUT_DIR = outDirArg ? resolve(ROOT, outDirArg) : resolve(ROOT, "play/assets/world");
  await mkdir(OUT_DIR, { recursive: true });

  console.log(`[${prefix}] loading ${source}…`);
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  console.log(`  ${W}×${H}, ${N} frames → cells of ${Math.floor(W / N)}×${H}`);

  // Sample bg from the corners (assume corners are background, not FX).
  const sampleCorner = (x, y) => [data[(y * W + x) * 4], data[(y * W + x) * 4 + 1], data[(y * W + x) * 4 + 2]];
  const corners = [
    sampleCorner(2, 2),
    sampleCorner(W - 3, 2),
    sampleCorner(2, H - 3),
    sampleCorner(W - 3, H - 3),
  ];
  const bgLuma = Math.round(corners.reduce((s, c) => s + Math.max(c[0], c[1], c[2]), 0) / corners.length);
  console.log(`  bg luma (sampled): ${bgLuma}`);

  // Alpha-key every pixel by luma above bg + small margin.
  const rgba = Buffer.from(data);
  const threshold = bgLuma + 10;
  for (let i = 0, p = 0; i < W * H; i++, p += 4) {
    const luma = Math.max(rgba[p], rgba[p + 1], rgba[p + 2]);
    const above = luma - threshold;
    const a = above <= 0 ? 0 : Math.min(255, above * 3);
    rgba[p + 3] = a;
  }

  // Split into N equal-width cells.
  const cellW = Math.floor(W / N);
  for (let i = 0; i < N; i++) {
    const cellX = i * cellW;
    // Tight-crop the cell to alpha-bbox.
    let minX = cellW, minY = H, maxX = -1, maxY = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < cellW; x++) {
      const a = rgba[(y * W + cellX + x) * 4 + 3];
      if (a > 24) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    if (maxX < 0) {
      console.warn(`  frame ${i + 1}: empty — skipping`);
      continue;
    }
    const cw = maxX - minX + 1;
    const ch = maxY - minY + 1;
    const cellBuf = Buffer.alloc(cw * ch * 4);
    for (let y = 0; y < ch; y++) {
      const src = ((minY + y) * W + cellX + minX) * 4;
      const dst = (y * cw) * 4;
      rgba.copy(cellBuf, dst, src, src + cw * 4);
    }
    // Resize to fit inside OUT_SIZE * 0.92 area, center on canvas.
    const fit = OUT_SIZE * 0.92;
    const s = Math.min(fit / cw, fit / ch);
    const fw = Math.max(1, Math.round(cw * s));
    const fh = Math.max(1, Math.round(ch * s));
    const resized = await sharp(cellBuf, { raw: { width: cw, height: ch, channels: 4 } })
      .resize(fw, fh, { kernel: "lanczos3" })
      .raw()
      .toBuffer();
    const canvas = Buffer.alloc(OUT_SIZE * OUT_SIZE * 4);
    const offX = Math.floor((OUT_SIZE - fw) / 2);
    const offY = Math.floor((OUT_SIZE - fh) / 2);
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const s2 = (y * fw + x) * 4;
        const d2 = ((offY + y) * OUT_SIZE + (offX + x)) * 4;
        canvas[d2]     = resized[s2];
        canvas[d2 + 1] = resized[s2 + 1];
        canvas[d2 + 2] = resized[s2 + 2];
        canvas[d2 + 3] = resized[s2 + 3];
      }
    }
    const outPath = resolve(OUT_DIR, `${prefix}_${i + 1}.png`);
    await sharp(canvas, { raw: { width: OUT_SIZE, height: OUT_SIZE, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    console.log(`  ✓ frame ${i + 1}  src=${cw}×${ch} → ${OUT_SIZE}×${OUT_SIZE}`);
  }
  console.log(`done — ${OUT_DIR}/`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
