import type { ScriptId } from "./fonts";
import type { DeviceProfile, PersistSettings, ConvertSettings, ResolvedWritingMode } from "./types";

export const SETTINGS_KEY = "lazahata.xtch.settings.v1";

export const DEVICE_PROFILES: Record<string, DeviceProfile> = {
  X4: { id: "X4", width: 480, height: 800, ppi: 219, label: "X4 · 480×800" },
  X3: { id: "X3", width: 528, height: 792, ppi: 259, label: "X3 · 528×792" },
};

/** PostScript / iOS typographic point. */
export const PT_PER_INCH = 72;
export const FONT_SIZE_MIN_PT = 8;
export const FONT_SIZE_MAX_PT = 16;
export const FONT_SIZE_STEP_PT = 0.5;
/** Saved values ≥ this were panel pixels (old default 34). */
const LEGACY_FONT_PX_MIN = 18;

export const DEFAULT_SETTINGS: PersistSettings = {
  deviceId: "X4",
  fontSize: 12,
  lineHeight: 100,
  textAlign: 3,
  hyphenation: 0,
  renameFromTitle: false,
  pageCompression: false,
};

/** Em box in panel pixels: `pt × ppi / 72`. */
export function fontPixels(fontSizePt: number, ppi: number): number {
  const pt = Number(fontSizePt);
  const density = Number(ppi);
  const size = Number.isFinite(pt) && pt > 0 ? pt : DEFAULT_SETTINGS.fontSize;
  return Math.max(1, size * Math.max(Number.isFinite(density) && density > 0 ? density : 219, 1) / PT_PER_INCH);
}

/** Collapse old panel-pixel sizes onto the iOS pt slider (8–16, step 0.5). */
export function migrateFontSize(fontSize: unknown, ppi: number): number {
  let pt = Number(fontSize);
  if (!Number.isFinite(pt) || pt <= 0) return DEFAULT_SETTINGS.fontSize;
  const density = Number(ppi);
  const dpi = Number.isFinite(density) && density > 0 ? density : 219;
  if (pt >= LEGACY_FONT_PX_MIN) {
    pt = Math.round((pt * PT_PER_INCH) / dpi * 10) / 10;
  }
  pt = Math.round(pt / FONT_SIZE_STEP_PT) * FONT_SIZE_STEP_PT;
  return Math.min(FONT_SIZE_MAX_PT, Math.max(FONT_SIZE_MIN_PT, pt));
}

export function loadSettings(): PersistSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null") || {};
    delete saved.fontId;
    delete saved.locale;
    delete saved.readDirection;
    delete saved.epubCrengine;
    delete saved._epubCrengineV2;
    delete saved._epubCrengineV3;
    const merged: PersistSettings = {
      ...DEFAULT_SETTINGS,
      ...saved,
      pageCompression: saved.pageCompression === true,
    };
    const device = DEVICE_PROFILES[merged.deviceId] || DEVICE_PROFILES.X4;
    merged.fontSize = migrateFontSize(merged.fontSize, device.ppi);
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: PersistSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export function toConvertSettings(
  settings: PersistSettings,
  writingMode: ResolvedWritingMode,
  fontId?: string,
  txtEncoding?: string,
  script?: ScriptId | null,
): ConvertSettings {
  const device = DEVICE_PROFILES[settings.deviceId] || DEVICE_PROFILES.X4;
  return {
    ...settings,
    fontId: fontId || "auto",
    writingMode,
    txtEncoding: txtEncoding || "auto",
    device: { w: device.width, h: device.height, id: device.id, ppi: device.ppi },
    script,
  };
}

export function formatSize(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return (bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0) + " " + units[i];
}

export function uid(): string {
  return "job-" + Math.random().toString(36).slice(2, 9);
}

/** Rounds up to whole seconds/minutes so an ETA never reads "0s left" while work remains. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(1, Math.ceil(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return remMinutes ? `${hours}h ${remMinutes}m` : `${hours}h`;
}
