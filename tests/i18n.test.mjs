import assert from "node:assert/strict";
import {
  DEFAULT_LOCALE,
  LOCALES,
  MESSAGE_KEYS,
  detectLocale,
  t,
} from "../src/lib/i18n.ts";
import { cssFontFamily, detectCjkFace, detectScript, extraScriptChoices, localFontNamesForLang, normalizeFontId, pickUsedFontFamily, preferredFontGroups, scriptFromLang, scriptsForEngine } from "../src/lib/fonts.ts";

assert.equal(DEFAULT_LOCALE, "ja");
assert.equal(detectLocale(), "ja");
assert.equal(detectLocale("en-US"), "en");
assert.equal(detectLocale("ja"), "ja");
assert.equal(detectLocale("ja-JP"), "ja");
assert.equal(detectLocale("zh-CN"), "zh-Hant");
assert.equal(detectLocale("zh"), "zh-Hant");
assert.equal(detectLocale("zh-TW"), "zh-Hant");
assert.equal(detectLocale("zh-HK"), "zh-Hant");
assert.equal(detectLocale("zh-Hant"), "zh-Hant");
assert.equal(detectLocale("zh-Hant-TW"), "zh-Hant");
assert.equal(detectLocale("ko-KR"), "en");
assert.equal(detectLocale("fr-FR"), "en");
assert.equal(LOCALES.length, 3);
assert.equal(t("ledeSuffix", undefined, "en"), "");
assert.equal(t("ledeSuffix", undefined, "zh-Hant"), "");
assert.equal(t("ledeChrome", undefined, "en"), ". Works best on Chrome");
assert.equal(t("cookbookLink", undefined, "en"), "Cookbook");
assert.match(t("cookbookPrefix", undefined, "en"), /slow/);
assert.match(t("dropTitle", undefined, "en"), /PDF/);
assert.equal(t("books", undefined, "zh-Hant"), "圖書");

for (const locale of LOCALES) {
  for (const key of MESSAGE_KEYS) {
    const value = t(key, undefined, locale);
    assert.equal(typeof value, "string", `${locale}.${key} is not a string`);
    assert.notEqual(value, key, `${locale}.${key} leaked the message key`);
  }
  const note = t("note", undefined, locale);
  assert.equal(/PDF|CBZ|MOBI/i.test(note), false, `${locale}.note still mentions later formats`);
}

assert.equal(t("books", undefined, "en"), "Books");
assert.equal(t("books", undefined, "ja"), "本");
assert.equal(t("books", undefined, "zh-Hant"), "圖書");
assert.equal(t("pageOf", { current: 2, total: 10 }, "en"), "Page 2 / 10");
assert.equal(t("chipComing", { name: "MOBI" }, "ja"), "MOBI 対応中");

assert.equal(detectCjkFace("<dc:language>ko</dc:language>"), null);
assert.equal(detectCjkFace("<dc:language>zh-TW</dc:language>"), "tc");
assert.equal(detectCjkFace("<dc:language>zh-CN</dc:language>"), "tc");
assert.equal(detectCjkFace("<dc:language>ja</dc:language>"), "jp");
assert.equal(detectCjkFace("한글 본문"), null);
assert.equal(detectScript("<dc:language>ar</dc:language>"), null);
assert.equal(detectScript("<dc:language>jpn</dc:language>"), "jp");
assert.equal(detectScript("<dc:language>chi</dc:language>"), "tc");
assert.equal(detectScript("<dc:language>yue</dc:language>"), "tc");
assert.equal(normalizeFontId("noto-kr"), "auto");
assert.equal(normalizeFontId("comic-sans"), "auto");
assert.ok(cssFontFamily("auto", "tc").includes("Songti TC"));
assert.ok(cssFontFamily("noto-tc", "tc").startsWith('"Noto Serif TC"'));
assert.equal(pickUsedFontFamily("noto-tc", "tc"), "Noto Serif TC");
assert.notEqual(pickUsedFontFamily("auto", "jp"), "Auto");
assert.notEqual(pickUsedFontFamily("auto", null), "Auto");
assert.equal(scriptFromLang("ja-JP"), "jp");
assert.equal(scriptFromLang("jpn"), "jp");
assert.equal(scriptFromLang("zh-TW"), "tc");
assert.equal(scriptFromLang("zh-CN"), "tc");
assert.equal(scriptFromLang("zh-Hant"), "tc");
assert.equal(scriptFromLang("yue"), "tc");
assert.equal(scriptFromLang("en-US"), "latin");
assert.equal(scriptFromLang("km-KH"), "latin");
assert.equal(scriptFromLang("ko-KR"), "latin");
assert.equal(detectScript("汉字正文"), "tc");
assert.equal(detectScript('xml:lang="en" 汉字正文'), "tc");
assert.equal(detectScript("あいうえお"), "jp");
assert.deepEqual(localFontNamesForLang("km-KH"), localFontNamesForLang("en"));
{
  const scripts = scriptsForEngine("auto", "latin", ["km-KH", "en-US"]);
  assert.deepEqual(scripts, ["latin"]);
}
{
  const scripts = scriptsForEngine("auto", "jp", ["en-US"]);
  assert.ok(scripts.includes("jp"));
  assert.ok(scripts.includes("latin"));
}
{
  const ids = preferredFontGroups("km", "km-KH").map((g) => g.id);
  assert.equal(ids[0], "auto");
  assert.equal(ids[1], "latin");
  assert.ok(!ids.includes("khmr"));
}
{
  const ids = preferredFontGroups("en", "en-US", "tc").map((g) => g.id);
  assert.deepEqual(ids.slice(0, 3), ["auto", "tc", "latin"]);
}
{
  const groups = preferredFontGroups("ja", "en-US", null, new Set(["auto", "yu-mincho", "georgia"]));
  assert.deepEqual(groups.find((g) => g.id === "jp")?.choiceIds, ["yu-mincho"]);
  assert.deepEqual(groups.find((g) => g.id === "latin")?.choiceIds, ["georgia"]);
  assert.ok(!groups.some((g) => g.id === "sc"));
  assert.ok(!groups.some((g) => g.id === "kr"));
}
{
  assert.deepEqual(extraScriptChoices(["jp", "tc", "latin"]), []);
  assert.equal(normalizeFontId("sys:Khmer UI"), "auto");
  assert.equal(normalizeFontId("cdn:khmr"), "auto");
}
{
  const none = preferredFontGroups(undefined, undefined, null, null, true).map((g) => g.id);
  assert.equal(none[0], "auto");
  assert.ok(none.includes("latin"));
  assert.ok(none.includes("jp"));
  assert.ok(none.includes("tc"));
}
{
  const ids = preferredFontGroups(undefined, undefined, "jp", null, true).map((g) => g.id);
  assert.deepEqual(ids, ["auto", "jp", "latin"]);
}
{
  const ids = preferredFontGroups("en", "en-US", "jp", null, true).map((g) => g.id);
  assert.ok(!ids.includes("kr"));
  assert.ok(!ids.includes("sc"));
}
{
  const ids = preferredFontGroups("ja", "en-US").map((g) => g.id);
  assert.deepEqual(ids.slice(0, 3), ["auto", "jp", "latin"]);
}
{
  const ids = preferredFontGroups("en", "ja-JP").map((g) => g.id);
  assert.deepEqual(ids.slice(0, 3), ["auto", "latin", "jp"]);
}

console.log("i18n tests passed");
