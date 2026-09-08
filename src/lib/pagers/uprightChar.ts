/**
 * Characters that stay upright in vertical-rl `text-orientation: mixed`
 * (UTR #50 U/Tu, simplified to CJK / kana / hangul / fullwidth).
 *
 * Canvas fillText has no OpenType `vert`, so Tr marks whose code-chart glyph
 * is a horizontal line (ー, 〜) are excluded here and rotated instead.
 */
export function isUprightVerticalChar(ch: string): boolean {
  const cp = ch.codePointAt(0);
  if (cp == null) return false;
  if (isTrFallbackRotate(cp) || isSidewaysDash(cp)) return false;
  if (cp >= 0x2e80 && cp <= 0x9fff) return true;
  if (cp >= 0xf900 && cp <= 0xfaff) return true;
  if (cp >= 0xfe10 && cp <= 0xfe19) return true;
  if (cp >= 0xfe30 && cp <= 0xfe4f) return true;
  if (cp >= 0xff00 && cp <= 0xff60) return true;
  if (cp >= 0xffe0 && cp <= 0xffe6) return true;
  if (cp >= 0x1100 && cp <= 0x11ff) return true;
  if (cp >= 0x3130 && cp <= 0x318f) return true;
  if (cp >= 0xac00 && cp <= 0xd7af) return true;
  if (cp >= 0x20000 && cp <= 0x3ffff) return true;
  return false;
}

/** UTR #50 Tr / line-like marks: prefer a vertical glyph; fallback is 90° clockwise. */
function isTrFallbackRotate(cp: number): boolean {
  if (cp === 0x30fc || cp === 0xff70) return true; // ー ｰ
  if (cp === 0x301c || cp === 0x3030 || cp === 0x30a0 || cp === 0xff5e) return true; // 〜 〰 ゠ ～
  // Angle / western brackets: code-chart form looks sideways in 縦書き.
  if (cp === 0x3008 || cp === 0x3009 || cp === 0x300a || cp === 0x300b) return true; // 〈〉《》
  if (cp === 0xff08 || cp === 0xff09 || cp === 0xff5b || cp === 0xff5d) return true; // （）｛｝
  if (cp === 0xff3b || cp === 0xff3d || cp === 0xff1c || cp === 0xff1e) return true; // ［］＜＞
  return false;
}

/** Hyphens/dashes (UTR #50 R), e.g. ―― in 電書協 books. */
function isSidewaysDash(cp: number): boolean {
  return (cp >= 0x2010 && cp <= 0x2015) || cp === 0x2212 || cp === 0xff0d;
}

/** Whether fillText must rotate 90° to match vertical-rl painting. */
export function glyphNeedsSidewaysRotate(
  ch: string,
  textOrientation: string,
  rectWidth: number,
  rectHeight: number,
): boolean {
  const orientation = textOrientation.toLowerCase();
  if (orientation.includes("upright")) return false;
  if (orientation.includes("sideways")) return true;
  const cp = ch.codePointAt(0);
  if (cp != null && (isTrFallbackRotate(cp) || isSidewaysDash(cp))) return true;
  if (isUprightVerticalChar(ch)) return false;
  return rectHeight > rectWidth * 1.35;
}
