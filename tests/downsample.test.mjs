import assert from "node:assert/strict";
import { SNAP_SCALE, boxDownsample, coverage2x, downsampleRgba } from "../src/lib/pagers/downsample.ts";

assert.equal(SNAP_SCALE, 1);

function rgba(w, h, gray) {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    out[i * 4] = gray;
    out[i * 4 + 1] = gray;
    out[i * 4 + 2] = gray;
    out[i * 4 + 3] = 255;
  }
  return out;
}

function setPixel(buf, w, x, y, gray) {
  const i = (y * w + x) * 4;
  buf[i] = buf[i + 1] = buf[i + 2] = gray;
  buf[i + 3] = 255;
}

{
  const src = rgba(4, 4, 255);
  const out = coverage2x(src, 4, 4);
  assert.equal(out.length, 2 * 2 * 4);
  assert.equal(out[0], 255);
}

{
  const src = rgba(2, 2, 0);
  const out = coverage2x(src, 2, 2);
  assert.equal(out[0], 0);
}

{
  const src = rgba(2, 2, 255);
  setPixel(src, 2, 0, 0, 0);
  const out = coverage2x(src, 2, 2);
  assert.equal(out[0], 170);
}

{
  const src = rgba(2, 2, 255);
  setPixel(src, 2, 0, 0, 0);
  setPixel(src, 2, 1, 0, 0);
  const out = coverage2x(src, 2, 2);
  assert.equal(out[0], 85);
}

{
  const src = rgba(6, 6, 128);
  const box = boxDownsample(src, 6, 6, 3);
  assert.equal(box.length, 2 * 2 * 4);
  assert.equal(box[0], 128);
}

{
  const src = rgba(4, 4, 200);
  const out = downsampleRgba(src, 4, 4, 2);
  // 200 >= 192 → not ink → white
  assert.equal(out[0], 255);
}

{
  // LCD-style red fringe must not be packed as R=255 (encode reads R).
  const src = new Uint8ClampedArray([255, 0, 0, 255]);
  const out = downsampleRgba(src, 1, 1, 1);
  assert.equal(out[0], Math.round((255 * 299) / 1000));
  assert.equal(out[0], out[1]);
  assert.equal(out[1], out[2]);
}

console.log("downsample tests passed");
