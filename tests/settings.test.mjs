import assert from "node:assert/strict";
import {
  DEFAULT_SETTINGS,
  DEVICE_PROFILES,
  FONT_SIZE_MAX_PT,
  FONT_SIZE_MIN_PT,
  PT_PER_INCH,
  fontPixels,
  migrateFontSize,
  toConvertSettings,
} from "../src/lib/settings.ts";

assert.equal(DEFAULT_SETTINGS.fontSize, 12);
assert.equal(DEVICE_PROFILES.X4.ppi, 219);
assert.equal(DEVICE_PROFILES.X3.ppi, 259);

assert.equal(fontPixels(12, 219), (12 * 219) / PT_PER_INCH);
assert.equal(fontPixels(12, 259), (12 * 259) / PT_PER_INCH);

// 12pt is the same physical size on both panels (1/72 inch).
assert.equal(fontPixels(12, 219) / 219, 12 / PT_PER_INCH);
assert.equal(fontPixels(12, 259) / 259, 12 / PT_PER_INCH);

assert.equal(migrateFontSize(12, 219), 12);
assert.equal(migrateFontSize(8, 219), FONT_SIZE_MIN_PT);
assert.equal(migrateFontSize(16, 219), FONT_SIZE_MAX_PT);
// Old default 34px @ X4 → 11 pt (34 × 72 / 219 ≈ 11.2, snapped to 0.5).
assert.equal(migrateFontSize(34, 219), 11);
assert.equal(migrateFontSize(20, 219), FONT_SIZE_MIN_PT);
assert.equal(migrateFontSize(56, 219), FONT_SIZE_MAX_PT);
assert.equal(migrateFontSize(0, 219), 12);
assert.equal(migrateFontSize(undefined, 219), 12);

const conv = toConvertSettings(DEFAULT_SETTINGS, "vertical");
assert.equal(conv.device.ppi, 219);
assert.equal(conv.device.w, 480);
assert.equal(conv.fontSize, 12);

const x3 = toConvertSettings({ ...DEFAULT_SETTINGS, deviceId: "X3" }, "horizontal");
assert.equal(x3.device.ppi, 259);
assert.equal(x3.device.w, 528);
