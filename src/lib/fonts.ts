/** Font stacks and CSS family for pagers. */

import JSZip from "jszip";

export type CjkFace = "jp" | "tc";
export type ScriptId = "latin" | CjkFace;

export type FontSpec = {
  id: string;
  family: string;
  file: string;
  url: string;
};

export type FontChoice = {
  id: string;
  family: string;
  locals: string[];
  group: "auto" | ScriptId;
  cdn?: FontSpec;
};

export function isCjkFace(id: string | null | undefined): id is CjkFace {
  return id === "jp" || id === "tc";
}

export const LATIN_FONT: FontSpec = {
  id: "literata",
  family: "Literata",
  file: "Literata-Regular.ttf",
  url: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/literata/Literata%5Bopsz%2Cwght%5D.ttf",
};

export const CJK_FONTS: Record<CjkFace, FontSpec> = {
  jp: {
    id: "jp",
    family: "Noto Serif JP",
    file: "NotoSerifJP-Regular.ttf",
    url: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notoserifjp/NotoSerifJP%5Bwght%5D.ttf",
  },
  tc: {
    id: "tc",
    family: "Noto Serif TC",
    file: "NotoSerifTC-Regular.ttf",
    url: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notoseriftc/NotoSerifTC%5Bwght%5D.ttf",
  },
};

export const CJK_ORDER: CjkFace[] = ["jp", "tc"];

const SYSTEM_STACKS: Record<ScriptId, string[]> = {
  latin: ["Georgia", "Palatino Linotype", "Palatino", "Times New Roman", "Times", "Noto Serif"],
  jp: [
    "Hiragino Mincho ProN",
    "Hiragino Mincho ProN W3",
    "HiraMinProN-W3",
    "Hiragino Mincho Pro",
    "Hiragino Mincho Pro W3",
    "HiraMinPro-W3",
    "Yu Mincho",
    "YuMincho",
    "MS Mincho",
    "MS PMincho",
    "Noto Serif JP",
  ],
  tc: ["Songti TC", "LiSong Pro", "PMingLiU", "MingLiU", "Noto Serif TC"],
};

const LATIN_STACK = SYSTEM_STACKS.latin;

export const FONT_CHOICES: FontChoice[] = [
  { id: "auto", family: "Auto", locals: [], group: "auto" },
  { id: "georgia", family: "Georgia", locals: ["Georgia"], group: "latin" },
  { id: "times", family: "Times New Roman", locals: ["Times New Roman", "Times"], group: "latin" },
  { id: "palatino", family: "Palatino", locals: ["Palatino", "Palatino Linotype", "Book Antiqua"], group: "latin" },
  { id: "literata", family: "Literata", locals: ["Literata"], group: "latin", cdn: LATIN_FONT },
  { id: "hiragino", family: "Hiragino Mincho ProN", locals: [
    "Hiragino Mincho ProN",
    "Hiragino Mincho ProN W3",
    "HiraMinProN-W3",
    "Hiragino Mincho Pro",
    "Hiragino Mincho Pro W3",
    "HiraMinPro-W3",
  ], group: "jp" },
  { id: "yu-mincho", family: "Yu Mincho", locals: ["Yu Mincho", "YuMincho"], group: "jp" },
  { id: "ms-mincho", family: "MS Mincho", locals: ["MS Mincho", "MS PMincho"], group: "jp" },
  { id: "noto-jp", family: "Noto Serif JP", locals: ["Noto Serif JP"], group: "jp", cdn: CJK_FONTS.jp },
  { id: "songti-tc", family: "Songti TC", locals: ["Songti TC"], group: "tc" },
  { id: "lisong", family: "LiSong Pro", locals: ["LiSong Pro"], group: "tc" },
  { id: "pmingliu", family: "PMingLiU", locals: ["PMingLiU", "MingLiU"], group: "tc" },
  { id: "noto-tc", family: "Noto Serif TC", locals: ["Noto Serif TC"], group: "tc", cdn: CJK_FONTS.tc },
];

export type FontGroup = { id: FontChoice["group"]; choiceIds: string[] };

export const FONT_GROUPS: FontGroup[] = [
  { id: "auto", choiceIds: ["auto"] },
  { id: "latin", choiceIds: ["georgia", "times", "palatino", "literata"] },
  { id: "jp", choiceIds: ["hiragino", "yu-mincho", "ms-mincho", "noto-jp"] },
  { id: "tc", choiceIds: ["songti-tc", "lisong", "pmingliu", "noto-tc"] },
];

type FontLocale = "en" | "ja" | "zh-Hant";

const FONT_DISPLAY: Record<string, Partial<Record<FontLocale, string>>> = {
  "Hiragino Mincho ProN": { ja: "ヒラギノ明朝 ProN", "zh-Hant": "冬青明朝 ProN" },
  "Hiragino Mincho ProN W3": { ja: "ヒラギノ明朝 ProN", "zh-Hant": "冬青明朝 ProN" },
  "HiraMinProN-W3": { ja: "ヒラギノ明朝 ProN", "zh-Hant": "冬青明朝 ProN" },
  "Hiragino Mincho Pro": { ja: "ヒラギノ明朝 Pro", "zh-Hant": "冬青明朝 Pro" },
  "Hiragino Mincho Pro W3": { ja: "ヒラギノ明朝 Pro", "zh-Hant": "冬青明朝 Pro" },
  "HiraMinPro-W3": { ja: "ヒラギノ明朝 Pro", "zh-Hant": "冬青明朝 Pro" },
  "Yu Mincho": { ja: "游明朝", "zh-Hant": "游明朝" },
  YuMincho: { ja: "游明朝", "zh-Hant": "游明朝" },
  "MS Mincho": { ja: "ＭＳ 明朝", "zh-Hant": "MS 明朝" },
  "MS PMincho": { ja: "ＭＳ Ｐ明朝", "zh-Hant": "MS P明朝" },
  "Songti TC": { ja: "宋体-繁", "zh-Hant": "宋體-繁" },
  "LiSong Pro": { ja: "儷宋 Pro", "zh-Hant": "儷宋 Pro" },
  PMingLiU: { ja: "新細明體", "zh-Hant": "新細明體" },
  MingLiU: { ja: "細明體", "zh-Hant": "細明體" },
};

/** Localized label for a CSS family name. English (and unknown faces) stay as-is. */
export function fontDisplayName(family: string, locale: FontLocale = "en"): string {
  if (!family) return family;
  return FONT_DISPLAY[family]?.[locale] || family;
}

const LATIN_LANG =
  /^(en|fr|de|es|it|pt|nl|pl|cs|ro|hu|tr|id|ms|sv|da|fi|no|nb|nn|vi|af|sw|ha|tl|fil|ca|eu|gl|ga|cy|mt|is|et|lv|lt|sk|sl|hr|bs|sq|az|uz|tk|eo|la|lb|br|gd|rm|haw)([-]|$)/;

export function isLatinLang(lang?: string): boolean {
  return LATIN_LANG.test(String(lang || "").toLowerCase().replace(/_/g, "-"));
}

export function scriptFromLang(lang?: string): ScriptId {
  const lower = String(lang || "").toLowerCase().replace(/_/g, "-");
  if (!lower) return "latin";
  if (/^(ja|jpn)([-]|$)/.test(lower)) return "jp";
  if (/^(zh|yue|chi|zho)([-]|$)/.test(lower)) return "tc";
  return "latin";
}

export function scriptsForEngine(
  fontId: string | undefined,
  detected: ScriptId | null,
  langs: string[] = [],
): ScriptId[] {
  const out: ScriptId[] = [];
  const add = (script?: ScriptId | null) => {
    if (!script || out.includes(script)) return;
    out.push(script);
  };
  const choice = fontChoice(fontId);
  if (choice.group !== "auto") add(choice.group);
  add(detected);
  for (const lang of langs) add(scriptFromLang(lang));
  return out;
}

export function localFontNamesForLang(lang?: string): string[] {
  return SYSTEM_STACKS[scriptFromLang(lang)] || [];
}

export const SCRIPT_GROUP_LABELS: Record<string, string> = {
  latin: "Latin",
  jp: "Japanese",
  tc: "Traditional Chinese",
};

export function extraScriptChoices(scripts: Array<ScriptId | null | undefined>): FontChoice[] {
  const seen = new Set<ScriptId>();
  const out: FontChoice[] = [];
  for (const script of scripts) {
    if (!script || script === "latin" || seen.has(script)) continue;
    if (FONT_GROUPS.some((g) => g.id === script)) continue;
    seen.add(script);
    const stack = SYSTEM_STACKS[script] || [];
    const canProbe = typeof document !== "undefined";
    const installed = canProbe
      ? stack.filter((name) => firstAvailableFont([name]))
      : stack.slice(0, 1);
    for (const name of installed.slice(0, 3)) {
      out.push({ id: `sys:${name}`, family: name, locals: [name], group: script });
    }
    const cdn = isCjkFace(script) ? CJK_FONTS[script] : undefined;
    if (cdn && !out.some((choice) => choice.family === cdn.family)) {
      out.push({
        id: `cdn:${script}`,
        family: cdn.family,
        locals: [cdn.family],
        group: script,
        cdn,
      });
    }
  }
  return out;
}

function uniqueFontNames(names: string[]): string[] {
  const out: string[] = [];
  for (const name of names) {
    if (name && !out.includes(name)) out.push(name);
  }
  return out;
}

function isCdnOnlyChoice(choice: FontChoice, script: ScriptId): boolean {
  if (!choice.cdn) return false;
  const stack = SYSTEM_STACKS[script] || [];
  const names = uniqueFontNames([choice.family, ...choice.locals]);
  return names.every((name) => name === choice.cdn?.family) && !stack.some((name) => names.includes(name));
}

type FaceCluster = { names: string[]; catalog?: FontChoice };

function clustersForScript(script: ScriptId): FaceCluster[] {
  const catalog = FONT_CHOICES.filter((choice) => choice.group === script);
  const stack = SYSTEM_STACKS[script] || [];
  const used = new Set<string>();
  const clusters: FaceCluster[] = [];

  const take = (names: string[], cat?: FontChoice) => {
    const unique = uniqueFontNames(names);
    if (!unique.length || unique.every((name) => used.has(name))) return;
    for (const name of unique) used.add(name);
    clusters.push({ names: unique, catalog: cat });
  };

  for (const name of stack) {
    if (used.has(name)) continue;
    const cat = catalog.find((choice) => choice.family === name || choice.locals.includes(name));
    if (cat) {
      take([...stack.filter((n) => n === cat.family || cat.locals.includes(n)), cat.family, ...cat.locals], cat);
    } else {
      take([name]);
    }
  }

  for (const cat of catalog) {
    if (isCdnOnlyChoice(cat, script)) continue;
    if (used.has(cat.family) || cat.locals.some((name) => used.has(name))) continue;
    take([cat.family, ...cat.locals], cat);
  }
  return clusters;
}

function cdnChoiceForScript(script: ScriptId): FontChoice | undefined {
  return FONT_CHOICES.find((choice) => choice.group === script && choice.cdn);
}

function choicesForScript(script: ScriptId): FontChoice[] {
  const out: FontChoice[] = [];
  const seen = new Set<string>();
  for (const cluster of clustersForScript(script)) {
    const hit = firstAvailableFont(cluster.names);
    if (!hit) continue;
    const id = cluster.catalog?.id || `sys:${hit}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      family: hit,
      locals: cluster.names,
      group: script,
      cdn: cluster.catalog?.cdn,
    });
  }
  const cdn = cdnChoiceForScript(script);
  if (cdn && !out.some((choice) => choice.id === cdn.id || choice.family === cdn.cdn?.family)) {
    out.push(cdn);
  }
  return out;
}

let bookFontListCache: FontChoice[] | null = null;

/** Installed stack faces (own labels, aliases collapsed) plus CDN Noto/Literata. */
export function listBookFontChoices(): FontChoice[] {
  if (!bookFontListCache) {
    const out: FontChoice[] = [FONT_CHOICES[0]];
    for (const group of FONT_GROUPS) {
      if (group.id === "auto") continue;
      out.push(...choicesForScript(group.id as ScriptId));
    }
    bookFontListCache = out;
  }
  return bookFontListCache;
}

export function bookFontChoice(id: string | undefined): FontChoice {
  if (id) {
    const hit = listBookFontChoices().find((choice) => choice.id === id);
    if (hit) return hit;
  }
  return fontChoice(id);
}

export function availableFontChoiceIds(): string[] {
  return listBookFontChoices().map((choice) => choice.id);
}

export function preferredFontGroups(
  uiLang?: string,
  browserLang?: string,
  bookScript?: ScriptId | null,
  availableIds?: ReadonlySet<string> | string[] | null,
  bookOnly = false,
): FontGroup[] {
  const allow = availableIds
    ? availableIds instanceof Set
      ? availableIds
      : new Set(availableIds)
    : null;

  const extras = extraScriptChoices(
    bookOnly && bookScript
      ? [bookScript]
      : [
          bookScript,
          uiLang ? scriptFromLang(uiLang) : null,
          browserLang ? scriptFromLang(browserLang) : null,
        ],
  );
  const extraGroups: FontGroup[] = [];
  for (const choice of extras) {
    const existing = extraGroups.find((g) => g.id === choice.group);
    if (existing) existing.choiceIds.push(choice.id);
    else extraGroups.push({ id: choice.group, choiceIds: [choice.id] });
  }

  const listed = allow ? listBookFontChoices() : null;
  const catalog: FontGroup[] = [
    ...FONT_GROUPS.map((group) => {
      if (group.id === "auto" || !listed) return group;
      return {
        ...group,
        choiceIds: listed.filter((choice) => choice.group === group.id).map((choice) => choice.id),
      };
    }),
    ...extraGroups.filter((g) => !FONT_GROUPS.some((base) => base.id === g.id)),
  ];

  const pinned: string[] = [];
  const add = (script?: ScriptId | null) => {
    if (!script || !catalog.some((g) => g.id === script)) return;
    if (!pinned.includes(script)) pinned.push(script);
  };
  add(bookScript);
  if (!bookOnly || !bookScript) {
    if (uiLang) add(scriptFromLang(uiLang));
    if (browserLang) add(scriptFromLang(browserLang));
  }

  const filterGroup = (group: FontGroup): FontGroup => {
    if (group.id === "auto") return group;
    if (extraGroups.some((g) => g.id === group.id)) return group;
    if (!allow) return group;
    return { ...group, choiceIds: group.choiceIds.filter((id) => allow.has(id)) };
  };

  const auto = catalog.filter((g) => g.id === "auto").map(filterGroup);

  const first = pinned
    .map((id) => catalog.find((g) => g.id === id))
    .filter((g): g is FontGroup => Boolean(g))
    .map(filterGroup)
    .filter((g) => g.choiceIds.length);
  const rest = catalog
    .filter((g) => g.id !== "auto" && !pinned.includes(g.id))
    .map(filterGroup)
    .filter((g) => g.choiceIds.length);
  if (bookOnly && bookScript) {
    const latin =
      bookScript !== "latin" ? rest.filter((g) => g.id === "latin") : [];
    return [...auto, ...first, ...latin];
  }
  return [...auto, ...first, ...rest];
}

export function normalizeFontId(value: unknown): string {
  if (typeof value !== "string" || !value) return "auto";
  if (FONT_CHOICES.some((c) => c.id === value)) return value;
  if (value.startsWith("sys:")) {
    const family = value.slice(4).trim();
    if (family && Object.values(SYSTEM_STACKS).some((stack) => stack.includes(family))) {
      return value;
    }
  }
  return "auto";
}

export function fontChoice(id: string | undefined): FontChoice {
  const known = FONT_CHOICES.find((c) => c.id === id);
  if (known) return known;
  if (id?.startsWith("sys:")) {
    const family = id.slice(4).trim();
    if (family) {
      const script = (Object.keys(SYSTEM_STACKS) as ScriptId[]).find((key) =>
        SYSTEM_STACKS[key].includes(family),
      );
      return { id, family, locals: [family], group: script || "latin" };
    }
  }
  if (id?.startsWith("cdn:")) {
    const script = id.slice(4);
    if (isCjkFace(script)) {
      const cdn = CJK_FONTS[script];
      return { id, family: cdn.family, locals: [cdn.family], group: script, cdn };
    }
  }
  return FONT_CHOICES[0];
}

/** Script/fonts only. Not used for Auto writing-mode (see detectVertical). */
export function detectScript(text: string): ScriptId | null {
  const dcLang = text.match(/<dc:language[^>]*>\s*([^<]+)/i);
  if (dcLang) {
    const script = scriptFromLang(dcLang[1].trim());
    if (script !== "latin") return script;
  }
  if (/[\u3040-\u30FF]/.test(text)) return "jp";
  if (/[\u4E00-\u9FFF]/.test(text)) return "tc";
  if (dcLang && isLatinLang(dcLang[1].trim())) return "latin";
  const xmlLang = text.match(/xml:lang\s*=\s*["']([^"']+)/i);
  if (xmlLang) {
    const script = scriptFromLang(xmlLang[1].trim());
    if (script !== "latin") return script;
    if (isLatinLang(xmlLang[1].trim())) return "latin";
  }
  return null;
}

export function detectCjkFace(text: string): CjkFace | null {
  const script = detectScript(text);
  return isCjkFace(script) ? script : null;
}

export function systemStack(primary: ScriptId = "jp"): string {
  const seen = new Set<string>();
  const names: string[] = [];
  const order: ScriptId[] = [primary, "latin", ...CJK_ORDER];
  for (const face of order) {
    for (const name of SYSTEM_STACKS[face] || []) {
      if (seen.has(name)) continue;
      seen.add(name);
      names.push(name);
    }
  }
  return names.map((n) => `"${n}"`).join(", ") + ", serif";
}

export function cjkStack(primary: CjkFace = "jp"): string {
  return systemStack(primary);
}

export function cssFontFamily(fontId: string | undefined, detected: ScriptId | null): string {
  const choice = fontChoice(fontId);
  const fallback: ScriptId =
    detected ||
    (choice.group !== "auto" ? choice.group : "latin");
  const stack = systemStack(fallback);
  if (choice.id === "auto") return stack;
  return `"${choice.family}", ${stack}`;
}

function quoteLocals(names: string[]): string {
  return names.map((n) => `local("${n}")`).join(",");
}

export function systemFontFaceCss(): string {
  const locals = Object.values(SYSTEM_STACKS).flat();
  const seen = new Set<string>();
  const unique = locals.filter((n) => (seen.has(n) ? false : (seen.add(n), true)));
  return `@font-face{font-family:"lazahata Serif";src:${quoteLocals(unique)};}`;
}

export async function detectScriptFromEpub(file: File): Promise<ScriptId | null> {
  const zip = await JSZip.loadAsync(file);
  const names = Object.keys(zip.files);
  const opf = names.filter((name) => /\.opf$/i.test(name));
  const rest = names.filter((name) => /\.(xml|xhtml|html|htm)$/i.test(name));
  let latin: ScriptId | null = null;
  for (const name of [...opf, ...rest]) {
    const entry = zip.files[name];
    if (!entry || entry.dir) continue;
    const text = await entry.async("string");
    const script = detectScript(text);
    if (script && script !== "latin") return script;
    if (script === "latin" && !latin) latin = "latin";
  }
  return latin;
}

export async function detectCjkFaceFromEpub(file: File): Promise<CjkFace | null> {
  const script = await detectScriptFromEpub(file);
  return isCjkFace(script) ? script : null;
}

function firstAvailableFont(names: string[]): string | null {
  if (!names.length) return null;
  if (typeof document === "undefined") return names[0];
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return names[0];
    // Do not fall back to `serif`: on macOS Chrome that already maps あ to
    // Hiragino, so Hiragino measures equal to the baseline and Auto skips it
    // for Yu Mincho.
    const sample = "A國한あבกकஅকЯΩ";
    ctx.font = '72px "lazahataMissingFont"';
    const fallback = ctx.measureText(sample).width;
    for (const name of names) {
      ctx.font = `72px "${name}", "lazahataMissingFont"`;
      if (ctx.measureText(sample).width !== fallback) return name;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function pickUsedFontFamily(fontId?: string, detected?: ScriptId | null): string {
  const choice = fontChoice(fontId);
  if (choice.id !== "auto") {
    return (
      firstAvailableFont(choice.locals.length ? choice.locals : [choice.family]) ||
      choice.cdn?.family ||
      choice.family
    );
  }
  if (detected) {
    const extra = isCjkFace(detected) ? [CJK_FONTS[detected].family] : [];
    return firstAvailableFont([...SYSTEM_STACKS[detected], ...extra]) || SYSTEM_STACKS[detected][0];
  }
  return firstAvailableFont([...LATIN_STACK, LATIN_FONT.family]) || "Georgia";
}
