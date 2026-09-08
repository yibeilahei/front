/**
 * Auto writing-mode. Japanese 縦書き is the default for Japanese books.
 * 横書き is an override (and the miss for non-Japanese / manga-like files).
 *
 * Vertical when:
 * - CSS/meta `writing-mode: vertical-*`
 * - 電書協 markers (`.vrtl`, `.tcy`, `.gaiji`, text-combine)
 * - enough hiragana/katakana (novel body)
 * - `lang=ja` plus kana or 電書協 (not lang=ja on an image-only manga file)
 *
 * `page-progression-direction=rtl` alone is not enough (manga is often 横書き).
 * User override always wins (`axisFromChoice`).
 */

import JSZip from "jszip";
import type { ResolvedWritingMode } from "./types";

const VERTICAL_CSS =
  /(?:-webkit-|-epub-|-ms-)?writing-mode\s*:\s*vertical-(?:rl|lr)/i;
const VERTICAL_META = /primary-writing-mode[^>]*vertical/i;
const LANG_JA = /(?:xml:lang|lang)\s*=\s*["']ja\b/i;
const OPF_LANG_JA = /<dc:language[^>]*>\s*ja\b/i;
const DENSHOKYO =
  /(?:-webkit-|-epub-)?text-combine(?:-upright)?\s*:|\.tcy\b|\.gaiji\b|\.vrtl\b|\.upright-1\b|\bclass\s*=\s*["'][^"']*\b(?:tcy|gaiji|vrtl|upright-1)\b/i;
const KANA_MIN_JA_LANG = 8;
const KANA_MIN_BODY = 16;

export function textLooksVertical(text: string): boolean {
  return VERTICAL_CSS.test(text) || VERTICAL_META.test(text);
}

export function kanaCount(text: string): number {
  let n = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp == null) continue;
    if ((cp >= 0x3040 && cp <= 0x309f) || (cp >= 0x30a0 && cp <= 0x30ff)) {
      n += 1;
      if (n >= KANA_MIN_BODY) return n;
    }
  }
  return n;
}

/** Japanese novel / 電書協 — not manga (lang=ja + images, almost no kana). */
export function sampleLooksJapanese(text: string): boolean {
  if (!text) return false;
  if (DENSHOKYO.test(text)) return true;
  const kana = kanaCount(text);
  if (LANG_JA.test(text) || OPF_LANG_JA.test(text)) return kana >= KANA_MIN_JA_LANG;
  return kana >= KANA_MIN_BODY;
}

export function detectedVerticalFromSample(sample: string | null | undefined): boolean {
  if (!sample) return false;
  return textLooksVertical(sample) || sampleLooksJapanese(sample);
}

/** Auto from a markup/text sample. Empty → horizontal (PDF / failed sniff). */
export function axisFromSample(sample: string | null | undefined): ResolvedWritingMode {
  return detectedVerticalFromSample(sample) ? "vertical" : "horizontal";
}

/** EPUB zip CSS/HTML sample. Stops at the first 縦書き or Japanese-novel hit. */
export async function sampleEpubMarkup(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file);
  const names = Object.keys(zip.files);
  const parts: string[] = [];
  for (const name of names) {
    const entry = zip.files[name];
    if (entry.dir) continue;
    if (!/\.(css|xhtml|html|htm|opf|xml)$/i.test(name)) continue;
    const text = (await entry.async("string")).slice(0, 80000);
    if (textLooksVertical(text) || sampleLooksJapanese(text)) return text;
    if (parts.length < 6) parts.push(text);
  }
  return parts.join("\n");
}

export async function isVerticalEpub(file: File): Promise<boolean> {
  return detectedVerticalFromSample(await sampleEpubMarkup(file));
}

/**
 * Resolved axis → which pager.
 * Vertical is always the 縦書き pager. Horizontal is always the 横書き pager.
 */
export function pagerKind(axis: ResolvedWritingMode): "vertical" | "horizontal" {
  return axis === "vertical" ? "vertical" : "horizontal";
}
