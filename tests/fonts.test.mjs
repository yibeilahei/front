import assert from "node:assert/strict";
import {
  availableFontChoiceIds,
  BOOK_LANGUAGES,
  FONT_CHOICES,
  FONT_GROUPS,
  fontDisplayName,
  fontGroupsForBookLanguage,
  listBookFontChoices,
  normalizeBookLanguage,
  normalizeFontId,
  pickUsedFontFamily,
  preferredFontGroups,
  resolvedBookScript,
  showsAllBookFonts,
} from "../src/lib/fonts.ts";

assert.equal(normalizeFontId("times"), "auto");
assert.equal(normalizeFontId("ms-mincho"), "auto");
assert.equal(normalizeFontId("lisong"), "auto");
assert.equal(normalizeFontId("fangsong"), "auto");
assert.equal(normalizeFontId("pmingliu"), "pmingliu");
assert.equal(normalizeFontId("simsun"), "simsun");
assert.equal(normalizeFontId("iowan"), "iowan");
assert.equal(normalizeFontId("sys:Arial"), "sys:Arial");
assert.equal(normalizeFontId("unknown-face"), "auto");
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

assert.equal(FONT_GROUPS.find((g) => g.id === "latin")?.choiceIds.length, 6);
assert.equal(FONT_GROUPS.find((g) => g.id === "jp")?.choiceIds.length, 6);
assert.equal(FONT_GROUPS.find((g) => g.id === "tc")?.choiceIds.length, 6);
assert.equal(FONT_GROUPS.find((g) => g.id === "sc")?.choiceIds.length, 6);
assert.deepEqual(FONT_GROUPS.find((g) => g.id === "latin")?.choiceIds, ["georgia", "literata", "palatino", "cambria", "iowan", "charter"]);
assert.deepEqual(FONT_GROUPS.find((g) => g.id === "jp")?.choiceIds, ["hiragino", "yu-mincho", "yu-mincho-demibold", "hgs-mincho", "biz-mincho", "noto-jp"]);
assert.deepEqual(FONT_GROUPS.find((g) => g.id === "tc")?.choiceIds, ["songti-tc", "noto-tc", "pmingliu", "source-han-tc", "heiti-tc", "pingfang-tc"]);
assert.deepEqual(FONT_GROUPS.find((g) => g.id === "sc")?.choiceIds, ["songti-sc", "noto-sc", "simsun", "source-han-sc", "heiti-sc", "pingfang-sc"]);
assert.ok(!FONT_CHOICES.some((c) => ["times", "baskerville", "ms-mincho", "yu-mincho-36", "toppan-mincho", "lisong", "biaukai", "fangsong"].includes(c.id)));
assert.equal(FONT_CHOICES.find((c) => c.id === "hiragino")?.locals[0], "Hiragino Mincho ProN W6");

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

assert.deepEqual(BOOK_LANGUAGES, ["auto", "latin", "jp", "sc", "tc", "other"]);
assert.equal(normalizeBookLanguage("other"), "other");
assert.equal(normalizeBookLanguage("kr"), "auto");
assert.equal(resolvedBookScript("auto", "jp"), "jp");
assert.equal(resolvedBookScript("tc", "jp"), "tc");
assert.equal(resolvedBookScript("other", "jp"), "jp");
assert.equal(resolvedBookScript("other", null), null);
assert.equal(showsAllBookFonts("other", "jp"), true);
assert.equal(showsAllBookFonts("auto", "jp"), false);
assert.equal(showsAllBookFonts("auto", null), true);
assert.equal(showsAllBookFonts("jp", "jp"), false);
assert.equal(showsAllBookFonts("latin", null), false);

const recJp = fontGroupsForBookLanguage("jp", "latin", installed);
assert.deepEqual(recJp.map((g) => g.id), ["auto", "jp"]);
assert.equal(recJp.find((g) => g.id === "jp")?.choiceIds.length, 6);
assert.ok(recJp.find((g) => g.id === "jp")?.choiceIds.includes("hiragino"));
assert.ok(!recJp.some((g) => g.id === "latin"));
assert.ok(!recJp.some((g) => g.id === "tc"));

const recEn = fontGroupsForBookLanguage("latin", "jp", installed);
assert.deepEqual(recEn.map((g) => g.id), ["auto", "latin"]);
assert.equal(recEn.find((g) => g.id === "latin")?.choiceIds.length, 6);

const recSc = fontGroupsForBookLanguage("sc", "jp", installed);
assert.deepEqual(recSc.map((g) => g.id), ["auto", "sc"]);
assert.equal(recSc.find((g) => g.id === "sc")?.choiceIds.length, 6);
const recTc = fontGroupsForBookLanguage("tc", null, installed);
assert.deepEqual(recTc.map((g) => g.id), ["auto", "tc"]);
assert.equal(recTc.find((g) => g.id === "tc")?.choiceIds.length, 6);

const recAutoJp = fontGroupsForBookLanguage("auto", "jp", installed);
assert.deepEqual(recAutoJp.map((g) => g.id), ["auto", "jp"]);
assert.equal(recAutoJp.find((g) => g.id === "jp")?.choiceIds.length, 6);

const allOther = fontGroupsForBookLanguage("other", "jp", installed);
assert.deepEqual(allOther.map((g) => g.id), ["auto"]);
const allOtherLoaded = fontGroupsForBookLanguage("other", "jp", installed, undefined, ["sys:Arial", "sys:Georgia"]);
assert.deepEqual(allOtherLoaded.map((g) => g.id), ["auto", "other"]);
assert.deepEqual(allOtherLoaded.find((g) => g.id === "other")?.choiceIds, ["sys:Arial", "sys:Georgia"]);

const allUnknown = fontGroupsForBookLanguage("auto", null, installed);
assert.deepEqual(allUnknown.map((g) => g.id), ["auto"]);

console.log("fonts tests passed");
