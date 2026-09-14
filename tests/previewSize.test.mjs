import assert from "node:assert/strict";
import {
  CSS_REFERENCE_PPI,
  cssPixelsPerInch,
  previewCssSize,
} from "../src/lib/previewSize.ts";

const x4 = previewCssSize(480, 800, 219, 96);
assert.equal(x4.width, Math.round((480 / 219) * 96 * 10) / 10);
assert.equal(x4.height, Math.round((800 / 219) * 96 * 10) / 10);
// Same physical inches as the panel.
assert.ok(Math.abs(x4.width / 96 - 480 / 219) < 1e-3);
assert.ok(Math.abs(x4.height / 96 - 800 / 219) < 1e-3);

const x3 = previewCssSize(528, 792, 259, 96);
assert.ok(x3.width < x4.width);
assert.ok(x3.height < x4.height);
assert.ok(Math.abs(x3.width / 96 - 528 / 259) < 1e-3);

// Screen PPI = device PPI → 1 CSS px per panel px.
const oneToOne = previewCssSize(480, 800, 219, 219);
assert.equal(oneToOne.width, 480);
assert.equal(oneToOne.height, 800);

const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";
assert.equal(cssPixelsPerInch({ width: 1512, height: 982, dpr: 2, ua: mac }), 127);
assert.equal(cssPixelsPerInch({ width: 982, height: 1512, dpr: 2, ua: mac }), 127);
assert.equal(cssPixelsPerInch({ width: 1728, height: 1117, dpr: 2, ua: mac }), 126);
assert.equal(cssPixelsPerInch({ width: 1280, height: 832, dpr: 2, ua: mac }), 112);
// External 1080p must not inherit the laptop 127.
assert.equal(cssPixelsPerInch({ width: 1920, height: 1080, dpr: 1, ua: mac }), 92);
assert.equal(cssPixelsPerInch({ width: 1920, height: 1080, dpr: 2, ua: mac }), 82);
assert.equal(cssPixelsPerInch({ width: 1512, height: 982, dpr: 1, ua: mac }), CSS_REFERENCE_PPI);

const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)";
assert.equal(cssPixelsPerInch({ width: 393, height: 852, ua: iphone }), 163);

const ipad = "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)";
assert.equal(cssPixelsPerInch({ width: 800, height: 1180, ua: ipad }), 132);
assert.equal(
  cssPixelsPerInch({
    width: 1024,
    height: 1366,
    ua: mac,
    platform: "MacIntel",
    maxTouchPoints: 5,
  }),
  132,
);

assert.equal(cssPixelsPerInch({ width: 1920, height: 1080, dpr: 1, ua: "Mozilla/5.0 (Windows NT 10.0)" }), 92);
