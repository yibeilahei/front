import assert from "node:assert/strict";
import { rubyInlinePadEm, rubySegmentsFromItems } from "../src/lib/pagers/sanitizeHtml.ts";

{
  const segs = rubySegmentsFromItems([
    { tag: "RB", text: "脂" },
    { tag: "RT", text: "し" },
    { tag: "RB", text: "肪" },
    { tag: "RT", text: "ぼう" },
  ]);
  assert.deepEqual(segs, [
    { base: "脂", rt: "し" },
    { base: "肪", rt: "ぼう" },
  ]);
}

{
  const segs = rubySegmentsFromItems([
    { tag: null, text: "溢" },
    { tag: "RT", text: "あふ" },
  ]);
  assert.deepEqual(segs, [{ base: "溢", rt: "あふ" }]);
}

{
  const segs = rubySegmentsFromItems([
    { tag: "RB", text: "百日紅" },
    { tag: "RT", text: "さるすべり" },
  ]);
  assert.deepEqual(segs, [{ base: "百日紅", rt: "さるすべり" }]);
}

{
  const segs = rubySegmentsFromItems([
    { tag: "RB", text: "避" },
    { tag: "RT", text: "ひ" },
    { tag: "RB", text: "暑" },
    { tag: "RT", text: "しよ" },
    { tag: "RB", text: "地" },
    { tag: "RT", text: "ち" },
    { tag: "RP", text: ")" },
  ]);
  assert.equal(segs.length, 3);
  assert.equal(segs[1].base, "暑");
  assert.equal(segs[1].rt, "しよ");
}

assert.equal(rubyInlinePadEm(1, 2), 0);
assert.equal(rubyInlinePadEm(1, 3), 0.5);
assert.equal(rubyInlinePadEm(1, 4), 1);
assert.equal(rubyInlinePadEm(3, 5), 0);

console.log("sanitizeHtml tests passed");
