/**
 * Side-by-side: current 3× bicubic fog vs lazahata 2× coverage,
 * plus page 0 of an existing lazahata .xtch if present.
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { coverage2x, boxDownsample } from "../src/lib/pagers/downsample.ts";
import { decodeXthPage, parseXtch } from "../src/lib/xtch.ts";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "out", "compare");
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function writePng(path, width, height, rgba) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const o = y * (width * 3 + 1) + 1 + x * 3;
      raw[o] = rgba[i];
      raw[o + 1] = rgba[i + 1];
      raw[o + 2] = rgba[i + 2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  writeFileSync(path, png);
}

function quantize4(rgba) {
  const out = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    const g = rgba[i];
    let q = 255;
    if (g < 64) q = 0;
    else if (g < 128) q = 85;
    else if (g < 192) q = 170;
    out[i] = out[i + 1] = out[i + 2] = q;
    out[i + 3] = 255;
  }
  return out;
}

function blit(dst, dw, src, sw, sh, dx, dy) {
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const si = (y * sw + x) * 4;
      const di = ((dy + y) * dw + (dx + x)) * 4;
      dst[di] = src[si];
      dst[di + 1] = src[si + 1];
      dst[di + 2] = src[si + 2];
      dst[di + 3] = 255;
    }
  }
}

function fill(buf, w, h, gray) {
  for (let i = 0; i < w * h; i++) {
    buf[i * 4] = buf[i * 4 + 1] = buf[i * 4 + 2] = gray;
    buf[i * 4 + 3] = 255;
  }
}

function put(src, w, x, y, g) {
  if (x < 0 || y < 0 || x >= w) return;
  const i = (y * w + x) * 4;
  if (i < 0 || i >= src.length) return;
  src[i] = src[i + 1] = src[i + 2] = g;
  src[i + 3] = 255;
}

/** Thin 明朝-like strokes + AA fringe at `scale`. */
function aaGlyphs(outW, outH, scale) {
  const w = outW * scale;
  const h = outH * scale;
  const src = new Uint8ClampedArray(w * h * 4);
  fill(src, w, h, 255);
  const ink = (x, y, g = 0) => put(src, w, x, y, g);
  const strokeV = (x, y0, y1) => {
    for (let y = y0; y <= y1; y++) {
      ink(x - 2, y, 210);
      ink(x - 1, y, 90);
      ink(x, y, 0);
      ink(x + 1, y, 90);
      ink(x + 2, y, 210);
    }
  };
  const strokeH = (y, x0, x1) => {
    for (let x = x0; x <= x1; x++) {
      ink(x, y - 2, 210);
      ink(x, y - 1, 90);
      ink(x, y, 0);
      ink(x, y + 1, 90);
      ink(x, y + 2, 210);
    }
  };
  const pad = 8 * scale;
  strokeV(Math.round(0.22 * w), pad, h - pad);
  strokeV(Math.round(0.5 * w), pad, h - pad);
  strokeV(Math.round(0.78 * w), pad, h - pad);
  strokeH(Math.round(0.28 * h), pad, w - pad);
  strokeH(Math.round(0.72 * h), pad, w - pad);
  for (let t = 0; t < 1; t += 0.004) {
    const x = Math.round(pad + t * (w - 2 * pad));
    const y = Math.round(pad + t * (h - 2 * pad));
    ink(x - 1, y, 90);
    ink(x, y, 0);
    ink(x + 1, y, 90);
    ink(x, y - 1, 90);
    ink(x, y + 1, 90);
  }
  return { src, w, h };
}

function foggy3x(src, srcW, srcH) {
  const w = Math.floor(srcW / 3);
  const h = Math.floor(srcH / 3);
  const out = new Uint8ClampedArray(w * h * 4);
  const k = [1, 4, 6, 4, 1];
  let ksum = 0;
  for (const a of k) for (const b of k) ksum += a * b;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      const cx = x * 3 + 1;
      const cy = y * 3 + 1;
      for (let j = 0; j < 5; j++) {
        const sy = Math.min(srcH - 1, Math.max(0, cy + j - 2));
        for (let i = 0; i < 5; i++) {
          const sx = Math.min(srcW - 1, Math.max(0, cx + i - 2));
          acc += src[(sy * srcW + sx) * 4] * k[i] * k[j];
        }
      }
      const g = Math.round(acc / ksum);
      const o = (y * w + x) * 4;
      out[o] = out[o + 1] = out[o + 2] = g;
      out[o + 3] = 255;
    }
  }
  return out;
}

function zoom2(src, w, h) {
  const out = new Uint8ClampedArray(w * 2 * h * 2 * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4;
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const di = ((y * 2 + dy) * w * 2 + (x * 2 + dx)) * 4;
          out[di] = src[si];
          out[di + 1] = src[si + 1];
          out[di + 2] = src[si + 2];
          out[di + 3] = 255;
        }
      }
    }
  }
  return out;
}

const W = 96;
const H = 160;
const gap = 8;
const panel = 3;
const canvasW = W * panel + gap * (panel - 1);
const canvasH = H;
const canvas = new Uint8ClampedArray(canvasW * canvasH * 4);
fill(canvas, canvasW, canvasH, 230);

const s3 = aaGlyphs(W, H, 3);
const s2 = aaGlyphs(W, H, 2);
const fog = quantize4(foggy3x(s3.src, s3.w, s3.h));
const box = quantize4(boxDownsample(s2.src, s2.w, s2.h, 2));
const cov = coverage2x(s2.src, s2.w, s2.h);
blit(canvas, canvasW, fog, W, H, 0, 0);
blit(canvas, canvasW, box, W, H, W + gap, 0);
blit(canvas, canvasW, cov, W, H, (W + gap) * 2, 0);
writePng(join(outDir, "downsample-3panel.png"), canvasW, canvasH, canvas);
const zoomW = canvasW * 2;
const zoomH = canvasH * 2;
const zoomed = zoom2(canvas, canvasW, canvasH);
writePng(join(outDir, "downsample-3panel-2x.png"), zoomW, zoomH, zoomed);

const xtchPath = join(here, "..", "..", "lazahata", "books", "out", "book.xtch");
try {
  const book = parseXtch(readFileSync(xtchPath));
  const page0 = await decodeXthPage(book.pages[0]);
  writePng(join(outDir, "lazahata-page0.png"), page0.width, page0.height, page0.rgba);
  const textIdx = Math.min(2, book.pages.length - 1);
  const page = await decodeXthPage(book.pages[textIdx]);
  writePng(join(outDir, `lazahata-page${textIdx}.png`), page.width, page.height, page.rgba);
  const cw = 180;
  const ch = 180;
  const cx = Math.max(0, page.width - cw - 24);
  const cy = 40;
  const crop = new Uint8ClampedArray(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const si = ((cy + y) * page.width + (cx + x)) * 4;
      const di = (y * cw + x) * 4;
      crop[di] = page.rgba[si];
      crop[di + 1] = page.rgba[si + 1];
      crop[di + 2] = page.rgba[si + 2];
      crop[di + 3] = 255;
    }
  }
  writePng(join(outDir, `lazahata-page${textIdx}-crop.png`), cw, ch, crop);
  const crop2 = zoom2(crop, cw, ch);
  writePng(join(outDir, `lazahata-page${textIdx}-crop-2x.png`), cw * 2, ch * 2, crop2);
  console.log("wrote lazahata", book.title, "pages", book.pageCount, "text page", textIdx, page.width, page.height);
} catch (err) {
  console.warn("skip lazahata xtch:", err.message);
}

console.log("wrote", outDir);
