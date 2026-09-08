import assert from "node:assert/strict";
import {
  axisFromSample,
  detectedVerticalFromSample,
  pagerKind,
  sampleLooksJapanese,
  textLooksVertical,
} from "../src/lib/detectVertical.ts";

assert.equal(textLooksVertical("body { writing-mode: vertical-rl; }"), true);
assert.equal(textLooksVertical("html { -epub-writing-mode: vertical-rl }"), true);
assert.equal(textLooksVertical("-webkit-writing-mode: vertical-lr;"), true);
assert.equal(textLooksVertical('<meta name="primary-writing-mode" content="vertical-rl"/>'), true);
assert.equal(textLooksVertical("body { writing-mode: horizontal-tb; }"), false);
assert.equal(textLooksVertical("page-progression-direction=\"rtl\""), false);

assert.equal(detectedVerticalFromSample("body { writing-mode: vertical-rl; }"), true);
assert.equal(detectedVerticalFromSample("body { writing-mode: horizontal-tb; }"), false);
assert.equal(detectedVerticalFromSample(""), false);
assert.equal(detectedVerticalFromSample(null), false);
assert.equal(detectedVerticalFromSample(undefined), false);

assert.equal(sampleLooksJapanese('<html xml:lang="ja" class="vrtl">'), true);
assert.equal(sampleLooksJapanese(".tcy { -webkit-text-combine: horizontal; }"), true);
assert.equal(
  sampleLooksJapanese("その日イタリアのサポーターたちが群れ、熱狂した競技場である。"),
  true,
);
assert.equal(sampleLooksJapanese('<html xml:lang="ja"><body><img src="p1.jpg"/></body></html>'), false);
assert.equal(sampleLooksJapanese("Hello world. This is an English novel chapter."), false);
assert.equal(sampleLooksJapanese("page-progression-direction=\"rtl\""), false);

assert.equal(detectedVerticalFromSample('<html xml:lang="ja" class="vrtl">'), true);
assert.equal(
  detectedVerticalFromSample("こんにちは。今日はいい天気ですね。一緒に本を読みましょう。"),
  true,
);
assert.equal(axisFromSample("body { writing-mode: vertical-rl; }"), "vertical");
assert.equal(axisFromSample("その日イタリアのサポーターたちが群れ、熱狂した競技場である。"), "vertical");
assert.equal(axisFromSample(""), "horizontal");
assert.equal(axisFromSample(null), "horizontal");
assert.equal(axisFromSample("Hello world. This is an English novel chapter."), "horizontal");

assert.equal(pagerKind("vertical"), "vertical");
assert.equal(pagerKind("horizontal"), "horizontal");

console.log("detectVertical tests passed");
