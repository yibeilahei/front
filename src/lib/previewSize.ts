/**
 * Preview CSS size = panel pixels / device PPI × CSS pixels per inch.
 * Same formula as lazahata `PreviewSheet.fit` / `ScreenMeasure.pointsPerInch`.
 *
 * Browsers do not expose EDID mm. Match known panels (Retina laptops only
 * when dpr is HiDPI). Unknown screens, including a 1× external on a Mac,
 * use ~96 CSS px/in — not the laptop 127, which made X4 huge on 1080p/1440p.
 */

export const CSS_REFERENCE_PPI = 96;
/** Classic iPhone point (1 CSS px = 1 iOS pt). */
const IPHONE_CSS_PPI = 163;
/** Standard iPad point. */
const IPAD_CSS_PPI = 132;

export type ScreenProbe = {
  width: number;
  height: number;
  dpr?: number;
  ua?: string;
  platform?: string;
  maxTouchPoints?: number;
};

type KnownScreen = {
  w: number;
  h: number;
  ppi: number;
  /** Skip this row when window.devicePixelRatio is outside the band. */
  minDpr?: number;
  maxDpr?: number;
};

/** Exact CSS width×height of common modes → CSS px/in. */
const KNOWN_CSS_PPI: KnownScreen[] = [
  // MacBook Pro 14" 14.2" 254 ppi (logical 1512×982 @2x, and scaled modes)
  { w: 1512, h: 982, ppi: 127, minDpr: 1.5 },
  { w: 1800, h: 1169, ppi: 151, minDpr: 1.5 },
  { w: 1315, h: 854, ppi: 110, minDpr: 1.5 },
  // MacBook Pro 16" 16.2" 254 ppi
  { w: 1728, h: 1117, ppi: 126, minDpr: 1.5 },
  { w: 2056, h: 1329, ppi: 149, minDpr: 1.5 },
  { w: 1496, h: 967, ppi: 109, minDpr: 1.5 },
  // MacBook Air 13" M2/M3 13.6" 224 ppi
  { w: 1280, h: 832, ppi: 112, minDpr: 1.5 },
  { w: 1470, h: 956, ppi: 129, minDpr: 1.5 },
  // MacBook Air 15" 15.3" 224 ppi
  { w: 1440, h: 932, ppi: 112, minDpr: 1.5 },
  { w: 1710, h: 1107, ppi: 133, minDpr: 1.5 },
  // MacBook Pro 13" / older Air 13.3" 227 ppi
  { w: 1280, h: 800, ppi: 112, minDpr: 1.5 },
  // iMac 24" 218 ppi
  { w: 2240, h: 1260, ppi: 109, minDpr: 1.5 },
  // 27" 5K / Studio Display 218 ppi @2x, or 27" 1440p @1x
  { w: 2560, h: 1440, ppi: 109 },
  // Pro Display XDR 32" 218 ppi
  { w: 3008, h: 1692, ppi: 108, minDpr: 1.5 },
  // 24" 1080p (~92). Not the laptop 127 fallback.
  { w: 1920, h: 1080, ppi: 92, maxDpr: 1.25 },
  // 4K @2x reports as 1920×1080 CSS; 27" 4K ≈ 163 physical / 2 ≈ 82.
  { w: 1920, h: 1080, ppi: 82, minDpr: 1.5 },
  { w: 1920, h: 1200, ppi: 94, maxDpr: 1.25 },
  { w: 2560, h: 1600, ppi: 112 },
  { w: 3440, h: 1440, ppi: 110 },
  { w: 3840, h: 2160, ppi: 140, maxDpr: 1.25 },
  // iPad Pro 12.9" / 13" 132 pt
  { w: 1024, h: 1366, ppi: IPAD_CSS_PPI },
  { w: 2064, h: 2752, ppi: IPAD_CSS_PPI },
  // iPad Pro 11"
  { w: 834, h: 1194, ppi: IPAD_CSS_PPI },
  { w: 836, h: 1210, ppi: IPAD_CSS_PPI },
];

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function dprFits(row: KnownScreen, dpr: number): boolean {
  if (row.minDpr != null && dpr < row.minDpr) return false;
  if (row.maxDpr != null && dpr > row.maxDpr) return false;
  return true;
}

function knownCssPpi(width: number, height: number, dpr: number): number | null {
  const w = Math.round(width);
  const h = Math.round(height);
  const hit = KNOWN_CSS_PPI.find((p) => {
    const size = (p.w === w && p.h === h) || (p.w === h && p.h === w);
    return size && dprFits(p, dpr);
  });
  return hit ? hit.ppi : null;
}

function isIPad(probe: ScreenProbe): boolean {
  const ua = probe.ua || "";
  if (/iPad/.test(ua)) return true;
  return probe.platform === "MacIntel" && (probe.maxTouchPoints || 0) > 1;
}

function isIPhone(probe: ScreenProbe): boolean {
  return /iPhone|iPod/.test(probe.ua || "");
}

/** CSS pixels that cover one physical inch on this screen. */
export function cssPixelsPerInch(probe: ScreenProbe): number {
  const dpr = Number(probe.dpr);
  const ratio = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  const known = knownCssPpi(probe.width, probe.height, ratio);
  if (known) return known;
  if (isIPhone(probe)) return IPHONE_CSS_PPI;
  if (isIPad(probe)) return IPAD_CSS_PPI;
  return CSS_REFERENCE_PPI;
}

/** Panel CSS box at the device’s physical size on this screen. */
export function previewCssSize(
  panelW: number,
  panelH: number,
  devicePpi: number,
  cssPpi: number,
): { width: number; height: number } {
  const ppi = Math.max(1, Number(devicePpi) || 219);
  const screen = Math.max(1, Number(cssPpi) || CSS_REFERENCE_PPI);
  const w = Math.max(1, Number(panelW) || 1);
  const h = Math.max(1, Number(panelH) || 1);
  return {
    width: round1((w / ppi) * screen),
    height: round1((h / ppi) * screen),
  };
}

export function subscribeCssPixelsPerInch(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
  window.addEventListener("resize", onStoreChange);
  mq.addEventListener("change", onStoreChange);
  const screen = window.screen as Screen & { addEventListener?: (type: string, fn: () => void) => void; removeEventListener?: (type: string, fn: () => void) => void };
  screen.addEventListener?.("change", onStoreChange);
  return () => {
    window.removeEventListener("resize", onStoreChange);
    mq.removeEventListener("change", onStoreChange);
    screen.removeEventListener?.("change", onStoreChange);
  };
}

export function readCssPixelsPerInch(): number {
  if (typeof window === "undefined") return CSS_REFERENCE_PPI;
  return cssPixelsPerInch({
    width: window.screen.width,
    height: window.screen.height,
    dpr: window.devicePixelRatio || 1,
    ua: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
  });
}
