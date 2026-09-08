import assert from "node:assert/strict";
import { glyphNeedsSidewaysRotate, isUprightVerticalChar } from "../src/lib/pagers/uprightChar.ts";

assert.equal(isUprightVerticalChar("漢"), true);
assert.equal(isUprightVerticalChar("あ"), true);
assert.equal(isUprightVerticalChar("ア"), true);
assert.equal(isUprightVerticalChar("一"), true);
assert.equal(isUprightVerticalChar("A"), false);
assert.equal(isUprightVerticalChar("g"), false);
assert.equal(isUprightVerticalChar("ー"), false);
assert.equal(isUprightVerticalChar("―"), false);
assert.equal(isUprightVerticalChar("〈"), false);
assert.equal(isUprightVerticalChar("「"), true);

const tall = { w: 20, h: 40 };
const square = { w: 34, h: 34 };
assert.equal(glyphNeedsSidewaysRotate("漢", "mixed", tall.w, tall.h), false);
assert.equal(glyphNeedsSidewaysRotate("あ", "mixed", tall.w, tall.h), false);
assert.equal(glyphNeedsSidewaysRotate("一", "mixed", tall.w, tall.h), false);
assert.equal(glyphNeedsSidewaysRotate("A", "mixed", tall.w, tall.h), true);
assert.equal(glyphNeedsSidewaysRotate("漢", "sideways", square.w, square.h), true);
assert.equal(glyphNeedsSidewaysRotate("A", "upright", tall.w, tall.h), false);
assert.equal(glyphNeedsSidewaysRotate("ー", "mixed", square.w, square.h), true);
assert.equal(glyphNeedsSidewaysRotate("―", "mixed", square.w, square.h), true);
assert.equal(glyphNeedsSidewaysRotate("〈", "mixed", square.w, square.h), true);
assert.equal(glyphNeedsSidewaysRotate("「", "mixed", tall.w, tall.h), false);
assert.equal(glyphNeedsSidewaysRotate("ー", "upright", tall.w, tall.h), false);

console.log("uprightChar tests passed");
