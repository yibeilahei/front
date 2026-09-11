import assert from "node:assert/strict";
import {
  availableFontChoiceIds,
  FONT_CHOICES,
  FONT_GROUPS,
  fontDisplayName,
  listBookFontChoices,
  normalizeFontId,
  pickUsedFontFamily,
  preferredFontGroups,
} from "../src/lib/fonts.ts";

assert.equal(normalizeFontId("times"), "auto");
assert.equal(normalizeFontId("ms-mincho"), "auto");
assert.equal(normalizeFontId("lisong"), "auto");
assert.equal(normalizeFontId("pmingliu"), "auto");
assert.equal(normalizeFontId("simsun"), "auto");
assert.equal(normalizeFontId("fangsong"), "auto");
assert.equal(fontDisplayName("Hiragino Mincho ProN", "en"), "Hiragino Mincho ProN");
assert.equal(fontDisplayName("Hiragino Mincho ProN", "ja"), "ヒラギノ明朝 ProN");
assert.equal(fontDisplayName("Hiragino Mincho ProN W6", "ja"), "ヒラギノ明朝 ProN W6");
assert.equal(fontDisplayName("Hiragino Mincho ProN W3", "ja"), "ヒラギノ明朝 ProN");
assert.equal(fontDisplayName("Hiragino Mincho ProN", "zh-Hant"), "冬青明朝 ProN");
assert.equal(fontDisplayName("Yu Mincho", "ja"), "游明朝");
assert.equal(fontDisplayName("Songti TC", "zh-Hant"), "宋體-繁");
assert.equal(fontDisplayName("Songti TC", "zh-Hans"), "宋体-繁");
assert.equal(fontDisplayName("Songti SC", "zh-Hans"), "宋体-简");
assert.equal(fontDisplayName("Georgia", "ja"), "Georgia");

const listed = listBookFontChoices();
assert.ok(listed.some((c) => c.id === "auto"));
assert.ok(listed.some((c) => c.id === "literata"));
assert.ok(listed.some((c) => c.id === "noto-jp"));
assert.ok(listed.some((c) => c.id === "noto-tc"));
assert.ok(listed.some((c) => c.id === "noto-sc"));
assert.ok(listed.some((c) => c.id === "songti-tc" || c.family === "Songti TC"));
assert.ok(listed.some((c) => c.id === "songti-sc" || c.family === "Songti SC"));

const autoTc = pickUsedFontFamily("auto", "tc");
assert.ok(
  listed.some((c) => c.family === autoTc || c.locals.includes(autoTc) || c.cdn?.family === autoTc),
  `Auto TC family ${autoTc} should be in the menu`,
);
assert.equal(new Set(listed.filter((c) => c.group === "tc").map((c) => c.family)).size, listed.filter((c) => c.group === "tc").length);
assert.equal(new Set(listed.filter((c) => c.group === "sc").map((c) => c.family)).size, listed.filter((c) => c.group === "sc").length);

assert.deepEqual(FONT_GROUPS.find((g) => g.id === "latin")?.choiceIds, ["georgia", "literata", "palatino"]);
assert.deepEqual(FONT_GROUPS.find((g) => g.id === "jp")?.choiceIds, ["hiragino", "yu-mincho", "noto-jp"]);
assert.deepEqual(FONT_GROUPS.find((g) => g.id === "tc")?.choiceIds, ["songti-tc", "noto-tc"]);
assert.deepEqual(FONT_GROUPS.find((g) => g.id === "sc")?.choiceIds, ["songti-sc", "noto-sc"]);
assert.equal(FONT_CHOICES.find((c) => c.id === "hiragino")?.locals[0], "Hiragino Mincho ProN W6");
assert.ok(!FONT_CHOICES.some((c) => ["times", "ms-mincho", "lisong", "pmingliu", "simsun", "fangsong"].includes(c.id)));

const installed = [
  "auto",
  "georgia",
  "literata",
  "palatino",
  "hiragino",
  "noto-jp",
  "songti-tc",
  "noto-tc",
  "songti-sc",
  "noto-sc",
];

const ids = availableFontChoiceIds();
assert.ok(ids.includes("auto"));
assert.ok(ids.includes("georgia"));
assert.ok(ids.includes("literata"));
assert.ok(ids.includes("noto-jp"));
assert.ok(ids.includes("noto-tc"));
assert.ok(ids.includes("noto-sc"));
assert.ok(!ids.includes("noto-kr"));

const noBook = preferredFontGroups(undefined, undefined, null, installed);
assert.ok(noBook.some((g) => g.id === "auto"));
assert.ok(noBook.some((g) => g.id === "latin" && g.choiceIds.includes("georgia")));
assert.ok(noBook.some((g) => g.id === "jp" && g.choiceIds.includes("hiragino")));
assert.ok(noBook.some((g) => g.id === "tc"));
assert.ok(noBook.some((g) => g.id === "sc"));
assert.ok(!noBook.some((g) => g.id === "kr"));
assert.equal(
  noBook.find((g) => g.id === "auto")?.choiceIds.join(),
  "auto",
);

const jpBook = preferredFontGroups(undefined, undefined, "jp", installed);
assert.equal(jpBook[0].id, "auto");
assert.equal(jpBook[1].id, "jp");
assert.ok(jpBook.find((g) => g.id === "jp")?.choiceIds.includes("hiragino"));
assert.ok(jpBook.some((g) => g.id === "tc"));
assert.ok(jpBook.some((g) => g.id === "latin"));

const jpShort = preferredFontGroups(undefined, undefined, "jp", installed, true);
assert.deepEqual(
  jpShort.map((g) => g.id),
  ["auto", "jp", "latin"],
);
assert.ok(!jpShort.some((g) => g.id === "tc"));

const latinBook = preferredFontGroups(undefined, undefined, "latin", installed, true);
assert.deepEqual(
  latinBook.map((g) => g.id),
  ["auto", "latin"],
);

const jaBrowser = preferredFontGroups(undefined, "ja", null, installed);
assert.equal(jaBrowser[0].id, "auto");
assert.equal(jaBrowser[1].id, "jp");

const scBook = preferredFontGroups(undefined, undefined, "sc", installed);
assert.equal(scBook[0].id, "auto");
assert.equal(scBook[1].id, "sc");
assert.ok(scBook.find((g) => g.id === "sc")?.choiceIds.includes("songti-sc"));

const zhCnBrowser = preferredFontGroups(undefined, "zh-CN", null, installed);
assert.equal(zhCnBrowser[1].id, "sc");

console.log("fonts tests passed");
