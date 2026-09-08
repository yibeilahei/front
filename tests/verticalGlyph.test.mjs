import assert from "node:assert/strict";
import {
  cssQuotedContent,
  isRubyAnnotationElement,
  isTextCombineStyle,
  isTransparentColor,
  parseCssPx,
  parseTextEmphasis,
  quoteCornerNudge,
  verticalPresentationForm,
} from "../src/lib/pagers/verticalGlyph.ts";

assert.equal(verticalPresentationForm("漢"), "漢");
assert.equal(verticalPresentationForm("ー"), "ー");
assert.equal(verticalPresentationForm("、"), "\uFE11");
assert.equal(verticalPresentationForm("。"), "\uFE12");
assert.equal(verticalPresentationForm("「"), "\uFE41");
assert.equal(verticalPresentationForm("」"), "\uFE42");
assert.equal(verticalPresentationForm("〈"), "\uFE3F");
assert.equal(verticalPresentationForm("〉"), "\uFE40");
assert.equal(verticalPresentationForm("―"), "\uFE31");
assert.equal(verticalPresentationForm("（"), "\uFE35");
assert.equal(verticalPresentationForm("〝"), "〝");
assert.equal(verticalPresentationForm("〟"), "〟");

function style(props) {
  return {
    getPropertyValue(name) {
      return props[name] ?? "";
    },
    color: props.color || "#111",
  };
}

assert.equal(isTextCombineStyle(style({ "text-combine-upright": "all" })), true);
assert.equal(isTextCombineStyle(style({ "-webkit-text-combine": "horizontal" })), true);
assert.equal(isTextCombineStyle(style({ "text-combine-upright": "none" })), false);
assert.equal(isTextCombineStyle(style({ "text-combine-upright": "digits 2" })), true);

assert.equal(parseTextEmphasis(style({ "text-emphasis-style": "none" })), null);
assert.deepEqual(parseTextEmphasis(style({ "text-emphasis-style": "sesame" })), {
  kind: "sesame",
  filled: true,
  glyph: undefined,
  color: "#111",
});
assert.deepEqual(parseTextEmphasis(style({ "text-emphasis-style": "filled sesame" })), {
  kind: "sesame",
  filled: true,
  glyph: undefined,
  color: "#111",
});
assert.deepEqual(parseTextEmphasis(style({ "-webkit-text-emphasis-style": "open dot" })), {
  kind: "dot",
  filled: false,
  glyph: undefined,
  color: "#111",
});
assert.deepEqual(
  parseTextEmphasis(
    style({
      "text-emphasis-style": "none",
      "-webkit-text-emphasis-style": "sesame",
    }),
  ),
  { kind: "sesame", filled: true, glyph: undefined, color: "#111" },
);
assert.deepEqual(
  parseTextEmphasis(
    style({
      "text-emphasis-style": "filled circle",
      "text-emphasis-color": "red",
    }),
  ),
  { kind: "circle", filled: true, glyph: undefined, color: "red" },
);
assert.deepEqual(parseTextEmphasis(style({ "text-emphasis-style": '"x"' })), {
  kind: "glyph",
  filled: true,
  glyph: "x",
  color: "#111",
});

assert.equal(typeof isRubyAnnotationElement, "function");
assert.equal(isTransparentColor("transparent"), true);
assert.equal(isTransparentColor("rgba(0, 0, 0, 0)"), true);
assert.equal(isTransparentColor("rgb(17, 17, 17)"), false);
assert.equal(parseCssPx("4px"), 4);
assert.equal(parseCssPx("none"), 0);
assert.equal(cssQuotedContent("none"), null);
assert.equal(cssQuotedContent('"第1章"'), "第1章");
assert.equal(cssQuotedContent("url(ornament.png)"), null);
assert.equal(quoteCornerNudge("漢", true, 34).dx, 0);
assert.ok(quoteCornerNudge("〝", true, 34).dx > 0);
assert.ok(quoteCornerNudge("〟", false, 34).dy < 0);

console.log("verticalGlyph tests passed");
