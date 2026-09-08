/**
 * Canvas fillText has no OpenType `vert`. Map 縦書き punctuation to Unicode
 * vertical presentation forms, and parse 縦中横 / 圏点 from computed style.
 */

const VERTICAL_FORMS: Record<string, string> = {
  "、": "\uFE11",
  "。": "\uFE12",
  "：": "\uFE13",
  "；": "\uFE14",
  "！": "\uFE15",
  "？": "\uFE16",
  "…": "\uFE19",
  "⋯": "\uFE19",
  "‥": "\uFE30",
  "—": "\uFE31",
  "―": "\uFE31",
  "–": "\uFE32",
  "（": "\uFE35",
  "）": "\uFE36",
  "｛": "\uFE37",
  "｝": "\uFE38",
  "〔": "\uFE39",
  "〕": "\uFE3A",
  "【": "\uFE3B",
  "】": "\uFE3C",
  "《": "\uFE3D",
  "》": "\uFE3E",
  "〈": "\uFE3F",
  "〉": "\uFE40",
  "「": "\uFE41",
  "」": "\uFE42",
  "『": "\uFE43",
  "』": "\uFE44",
  "［": "\uFE47",
  "］": "\uFE48",
  "〖": "\uFE17",
  "〗": "\uFE18",
};

export function verticalPresentationForm(ch: string): string {
  return VERTICAL_FORMS[ch] ?? ch;
}

/** Corner nudge for 〝〟 (no vertical presentation form). */
export function quoteCornerNudge(
  ch: string,
  vertical: boolean,
  fontSize: number,
): { dx: number; dy: number } {
  if (ch !== "\u301D" && ch !== "\u301E" && ch !== "\u301F") return { dx: 0, dy: 0 };
  const d = fontSize * 0.28;
  return vertical ? { dx: d, dy: 0 } : { dx: 0, dy: -d };
}

export function isTextCombineStyle(style: CSSStyleDeclaration): boolean {
  const a = style.getPropertyValue("text-combine-upright").trim().toLowerCase();
  const b = style.getPropertyValue("-webkit-text-combine").trim().toLowerCase();
  return a === "all" || a.startsWith("digits") || b === "horizontal" || b === "all";
}

export type EmphasisKind = "sesame" | "dot" | "circle" | "double-circle" | "triangle" | "glyph";

export type EmphasisMark = {
  kind: EmphasisKind;
  filled: boolean;
  glyph?: string;
  color: string;
};

function emphasisKind(shape: string): EmphasisKind | null {
  if (shape.includes("sesame")) return "sesame";
  if (shape.includes("double-circle") || shape.includes("double circle")) return "double-circle";
  if (shape.includes("circle")) return "circle";
  if (shape.includes("triangle")) return "triangle";
  if (shape.includes("dot")) return "dot";
  return null;
}

/** Parse CSS `text-emphasis-style` / `-webkit-text-emphasis-style`. */
export function parseTextEmphasis(style: CSSStyleDeclaration): EmphasisMark | null {
  let raw = "";
  for (const name of ["text-emphasis-style", "-webkit-text-emphasis-style"]) {
    const v = style.getPropertyValue(name).trim().toLowerCase();
    if (v && v !== "none") {
      raw = v;
      break;
    }
  }
  if (!raw) return null;

  const stringMatch = raw.match(/["']([^"']+)["']/);
  let filled = !/\bopen\b/.test(raw);
  if (/\bopen\b/.test(raw)) filled = false;
  if (/\bfilled\b/.test(raw)) filled = true;

  let kind: EmphasisKind | null = null;
  let glyph: string | undefined;
  if (stringMatch) {
    kind = "glyph";
    glyph = stringMatch[1];
  } else {
    kind = emphasisKind(raw);
    if (!kind && (/\bfilled\b/.test(raw) || /\bopen\b/.test(raw))) kind = "circle";
  }
  if (!kind) return null;

  const color = (
    style.getPropertyValue("text-emphasis-color") ||
    style.getPropertyValue("-webkit-text-emphasis-color") ||
    style.color ||
    "#111111"
  ).trim();
  return { kind, filled, glyph, color: color || "#111111" };
}

export function parseCssPx(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function isTransparentColor(color: string): boolean {
  const c = color.trim().toLowerCase();
  if (!c || c === "transparent") return true;
  if (c === "rgba(0, 0, 0, 0)" || c === "rgba(0,0,0,0)") return true;
  const m = c.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/);
  if (m && m[4] != null && parseFloat(m[4]) === 0) return true;
  return false;
}

/** Unquote CSS `content` for ::before/::after. */
export function cssQuotedContent(raw: string): string | null {
  const s = raw.trim();
  if (!s || s === "none" || s === "normal") return null;
  if (s.startsWith("url(") || s.includes("counter(") || s.includes("attr(")) return null;
  const m = s.match(/^"((?:[^"\\]|\\.)*)"/) || s.match(/^'((?:[^'\\]|\\.)*)'/);
  if (!m) return null;
  return m[1].replace(/\\(.)/g, "$1");
}

export function isRubyAnnotationElement(el: Element | null): boolean {
  let node: Element | null = el;
  while (node) {
    const tag = node.tagName;
    if (tag === "RT" || tag === "RP" || tag === "RTC") return true;
    if (tag === "RUBY") return false;
    node = node.parentElement;
  }
  return false;
}
