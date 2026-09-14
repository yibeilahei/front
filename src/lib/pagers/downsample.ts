/**
 * Snapshot → panel RGBA. Lazahata `Raster.swift` draws 1× into a device-gray
 * bitmap with font smoothing, then the XTCH LUT. Web canvas is RGB (often
 * LCD subpixel AA); encodeXthPage reads R only, so we convert to Rec.601
 * luma first. 2× coverage is kept for scale===2 but is not what the app does.
 */

/** 1× matches Raster.swift (DESIGN.md 2× popcount was never implemented). */
export const SNAP_SCALE = 1;

/** Anything below Cookbook's white bin (>=192) counts as ink. */
const INK = 192;

/** 0–4 covered subpixels → XTCH greys (white / light / dark / black). */
const COVERAGE_GRAY = [255, 170, 85, 0, 0];

function lumaAt(src: Uint8ClampedArray | Uint8Array, i: number): number {
  const a = src[i + 3];
  let r = src[i];
  let g = src[i + 1];
  let b = src[i + 2];
  if (a !== 255) {
    const t = a / 255;
    r = r * t + 255 * (1 - t);
    g = g * t + 255 * (1 - t);
    b = b * t + 255 * (1 - t);
  }
  return Math.round((r * 299 + g * 587 + b * 114) / 1000);
}

/** Rec.601 gray in R/G/B so the XTCH packer (which reads R) sees luminance. */
export function rgbaToLuma(src: Uint8ClampedArray | Uint8Array): Uint8ClampedArray {
  const out = src instanceof Uint8ClampedArray ? src : new Uint8ClampedArray(src);
  for (let i = 0; i < out.length; i += 4) {
    const y = lumaAt(out, i);
    out[i] = y;
    out[i + 1] = y;
    out[i + 2] = y;
    out[i + 3] = 255;
  }
  return out;
}

export function downsampleRgba(
  src: Uint8ClampedArray | Uint8Array,
  srcW: number,
  srcH: number,
  scale: number,
): Uint8ClampedArray {
  const s = Math.max(1, Math.floor(Number(scale) || 1));
  if (s === 1) return rgbaToLuma(src);
  if (s === 2) return coverage2x(src, srcW, srcH);
  return rgbaToLuma(boxDownsample(src, srcW, srcH, s));
}

/** 2×2 popcount. Sharper than averaging AA greys, then LUT-ing the mush. */
export function coverage2x(
  src: Uint8ClampedArray | Uint8Array,
  srcW: number,
  srcH: number,
): Uint8ClampedArray {
  const w = Math.floor(srcW / 2);
  const h = Math.floor(srcH / 2);
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = y * 2;
    for (let x = 0; x < w; x++) {
      const sx = x * 2;
      let n = 0;
      n += lumaAt(src, (sy * srcW + sx) * 4) < INK ? 1 : 0;
      n += lumaAt(src, (sy * srcW + sx + 1) * 4) < INK ? 1 : 0;
      n += lumaAt(src, ((sy + 1) * srcW + sx) * 4) < INK ? 1 : 0;
      n += lumaAt(src, ((sy + 1) * srcW + sx + 1) * 4) < INK ? 1 : 0;
      const g = COVERAGE_GRAY[n];
      const o = (y * w + x) * 4;
      out[o] = g;
      out[o + 1] = g;
      out[o + 2] = g;
      out[o + 3] = 255;
    }
  }
  return out;
}

/** Area average. Used when scale is not 2. */
export function boxDownsample(
  src: Uint8ClampedArray | Uint8Array,
  srcW: number,
  srcH: number,
  scale: number,
): Uint8ClampedArray {
  const s = Math.max(1, Math.floor(scale));
  const w = Math.floor(srcW / s);
  const h = Math.floor(srcH / s);
  const area = s * s;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let dy = 0; dy < s; dy++) {
        const row = (y * s + dy) * srcW;
        for (let dx = 0; dx < s; dx++) {
          const i = (row + x * s + dx) * 4;
          r += src[i];
          g += src[i + 1];
          b += src[i + 2];
          a += src[i + 3];
        }
      }
      const o = (y * w + x) * 4;
      out[o] = Math.round(r / area);
      out[o + 1] = Math.round(g / area);
      out[o + 2] = Math.round(b / area);
      out[o + 3] = Math.round(a / area);
    }
  }
  return out;
}
