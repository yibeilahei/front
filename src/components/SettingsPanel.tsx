"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  BOOK_LANGUAGES,
  bookFontChoice,
  fontChoice,
  fontDisplayName,
  fontGroupsForBookLanguage,
  listSystemFontChoices,
  pickUsedFontFamily,
  resolvedBookScript,
  SCRIPT_GROUP_LABELS,
  showsAllBookFonts,
  type BookLanguage,
  type FontGroup,
  type ScriptId,
} from "@/lib/fonts";
import {
  defaultEncodingForLanguage,
  encodingLabel,
  encodingsForMenu,
  systemLanguage,
  type TxtEncodingId,
} from "@/lib/adapters/txt";
import { DEFAULT_LOCALE, detectLocale, t, type Locale, type MessageKey } from "@/lib/i18n";
import type { PersistSettings, ResolvedWritingMode, WritingMode } from "@/lib/types";

const FONT_GROUP_KEYS: Record<string, MessageKey> = {
  latin: "fontGroupLatin",
  jp: "fontGroupJp",
  tc: "fontGroupTc",
  sc: "fontGroupSc",
  other: "fontGroupOther",
};

type BookWriting = {
  choice: WritingMode;
  axis: ResolvedWritingMode | null;
  sniffedAxis: ResolvedWritingMode | null;
};

type Props = {
  settings: PersistSettings;
  onChange: (patch: Partial<PersistSettings>, refreshPreview?: boolean) => void;
  bookWriting: BookWriting | null;
  bookScript?: ScriptId | null;
  bookLanguage?: BookLanguage;
  bookFontId?: string;
  onBookWritingChange: (mode: WritingMode) => void;
  onBookLanguageChange: (language: BookLanguage) => void;
  onBookFontChange: (fontId: string) => void;
  bookIsTxt?: boolean;
  bookIsPdf?: boolean;
  txtEncoding?: string;
  detectedEncoding?: string | null;
  onTxtEncodingChange?: (encoding: string) => void;
  writingDisabled?: boolean;
};

function fontDesc(
  book: BookWriting | null,
  fontId: string,
  family: string,
  locale: Locale,
): string {
  if (!book) return t("writingDetectOnDrop", undefined, locale);
  if (book.choice === "auto" && book.axis == null && !family) {
    return t("writingDetecting", undefined, locale);
  }
  if (fontId === "auto") {
    return t("writingThisBook", { mode: family ? fontDisplayName(family, locale) : t("fontAuto", undefined, locale) }, locale);
  }
  return t("writingOverride", undefined, locale);
}

function groupLabel(id: string, locale: Locale): string {
  const key = FONT_GROUP_KEYS[id];
  if (key) return t(key, undefined, locale);
  return SCRIPT_GROUP_LABELS[id] || id;
}

function languageLabel(id: BookLanguage | ScriptId, locale: Locale): string {
  if (id === "latin") return t("languageEnglish", undefined, locale);
  if (id === "other") return t("languageOther", undefined, locale);
  if (id === "auto") return t("auto", undefined, locale);
  return groupLabel(id, locale);
}

function languageDesc(
  book: BookWriting | null,
  language: BookLanguage,
  detected: ScriptId | null,
  locale: Locale,
): string {
  if (!book) return t("writingDetectOnDrop", undefined, locale);
  if (language === "auto" && book.axis == null && !detected) {
    return t("writingDetecting", undefined, locale);
  }
  if (language === "auto") {
    const live = detected ? languageLabel(detected, locale) : t("languageOther", undefined, locale);
    return t("writingThisBook", { mode: live }, locale);
  }
  if (!detected) return t("writingOverride", undefined, locale);
  return t("writingOverrideDetected", { mode: languageLabel(detected, locale) }, locale);
}

function clientSnapshot() {
  return true;
}

function serverSnapshot() {
  return false;
}

function subscribeNoop() {
  return () => {};
}

function withCurrentFont(groups: FontGroup[], fontId: string) {
  if (fontId === "auto" || groups.some((g) => g.choiceIds.includes(fontId))) return groups;
  const choice = fontChoice(fontId);
  const match = groups.find((g) => g.id === choice.group);
  if (match) {
    return groups.map((g) =>
      g.id === match.id ? { ...g, choiceIds: [fontId, ...g.choiceIds] } : g,
    );
  }
  return [...groups, { id: choice.group, choiceIds: [fontId] }];
}

function writingDesc(
  book: BookWriting | null,
  locale: Locale,
): string {
  if (!book) return t("writingDetectOnDrop", undefined, locale);
  if (book.choice === "auto" && book.axis == null) {
    return t("writingDetecting", undefined, locale);
  }
  const live = t(book.axis || "horizontal", undefined, locale);
  if (book.choice === "auto") {
    return t("writingThisBook", { mode: live }, locale);
  }
  if (book.sniffedAxis == null) return t("writingOverride", undefined, locale);
  return t("writingOverrideDetected", { mode: t(book.sniffedAxis, undefined, locale) }, locale);
}

export function SettingsPanel({
  settings,
  onChange,
  bookWriting,
  bookScript = null,
  bookLanguage = "auto",
  bookFontId = "auto",
  onBookWritingChange,
  onBookLanguageChange,
  onBookFontChange,
  bookIsTxt = false,
  bookIsPdf = false,
  txtEncoding = "auto",
  detectedEncoding = null,
  onTxtEncodingChange,
  writingDisabled,
}: Props) {
  const isClient = useSyncExternalStore(subscribeNoop, clientSnapshot, serverSnapshot);
  const locale = detectLocale(isClient ? undefined : DEFAULT_LOCALE);
  const vertical = bookWriting?.axis === "vertical";
  const writingLocked = !bookWriting || writingDisabled;
  const fontLocked = !bookWriting || writingDisabled;
  const showAllFonts = showsAllBookFonts(bookLanguage, bookScript);
  const [systemIds, setSystemIds] = useState<string[]>([]);
  useEffect(() => {
    if (!isClient || !showAllFonts) return;
    let cancelled = false;
    void listSystemFontChoices().then((choices) => {
      if (!cancelled) setSystemIds(choices.map((choice) => choice.id));
    });
    return () => {
      cancelled = true;
    };
  }, [isClient, showAllFonts]);
  const resolvedScript = resolvedBookScript(bookLanguage, bookScript);
  const fontGroups = useMemo(() => {
    const groups = fontGroupsForBookLanguage(
      bookLanguage,
      bookScript,
      null,
      undefined,
      showAllFonts ? systemIds : null,
    );
    return withCurrentFont(groups, bookFontId);
  }, [bookLanguage, bookScript, bookFontId, showAllFonts, systemIds]);
  const autoFamily = isClient ? pickUsedFontFamily("auto", resolvedScript) : "";

  return (
    <aside className="card">
      <h2>{t("output", undefined, locale)}</h2>

      <div className="setting-row">
        <div>
          <div className="setting-title">{t("device", undefined, locale)}</div>
          <div className="setting-desc">{t("deviceDesc", undefined, locale)}</div>
        </div>
        <div className={`seg${writingDisabled ? " disabled" : ""}`}>
          <button
            type="button"
            disabled={writingDisabled}
            className={settings.deviceId === "X4" ? "active" : ""}
            onClick={() => onChange({ deviceId: "X4" }, true)}
          >
            X4
          </button>
          <button
            type="button"
            disabled={writingDisabled}
            className={settings.deviceId === "X3" ? "active" : ""}
            onClick={() => onChange({ deviceId: "X3" }, true)}
          >
            X3
          </button>
        </div>
      </div>

      {bookIsPdf ? <p className="note">{t("pdfAsIs", undefined, locale)}</p> : null}

      {bookIsPdf ? null : (
      <>
      <div className="setting-row">
        <div>
          <div className="setting-title">{t("bookLanguage", undefined, locale)}</div>
          <div className="setting-desc">
            {languageDesc(bookWriting, bookLanguage, bookScript, locale)}
          </div>
        </div>
        <select
          className="field"
          value={bookLanguage}
          onChange={(e) => {
            const next = e.target.value as BookLanguage;
            if (showsAllBookFonts(next, bookScript)) void listSystemFontChoices();
            onBookLanguageChange(next);
          }}
        >
          {BOOK_LANGUAGES.map((id) => (
            <option key={id} value={id}>
              {id === "auto" && bookScript
                ? `${t("auto", undefined, locale)} · ${languageLabel(bookScript, locale)}`
                : languageLabel(id, locale)}
            </option>
          ))}
        </select>
      </div>

      <div className="setting-row">
        <div>
          <div className="setting-title">{t("font", undefined, locale)}</div>
          <div className="setting-desc">
            {fontDesc(bookWriting, bookFontId, autoFamily, locale)}
          </div>
        </div>
        <select
          className="field"
          value={bookFontId}
          onChange={(e) => onBookFontChange(e.target.value)}
        >
          {fontGroups.map((group) => {
            if (group.id === "auto") {
              return (
                <optgroup key="auto" label={t("fontAuto", undefined, locale)}>
                  <option value="auto">
                    {autoFamily
                      ? `${t("fontAuto", undefined, locale)} · ${fontDisplayName(autoFamily, locale)}`
                      : t("fontAuto", undefined, locale)}
                  </option>
                </optgroup>
              );
            }
            return (
              <optgroup key={group.id} label={groupLabel(group.id, locale)}>
                {group.choiceIds.map((id) => {
                  const choice = isClient ? bookFontChoice(id) : fontChoice(id);
                  return (
                    <option key={choice.id} value={choice.id}>
                      {fontDisplayName(choice.family, locale)}
                    </option>
                  );
                })}
              </optgroup>
            );
          })}
        </select>
      </div>

      {bookIsTxt ? (
        <div className="setting-row">
          <div>
            <div className="setting-title">{t("encoding", undefined, locale)}</div>
            <div className="setting-desc">
              {txtEncoding === "auto" && detectedEncoding
                ? t(
                    "encodingThisFile",
                    { name: encodingLabel(detectedEncoding as TxtEncodingId) },
                    locale,
                  )
                : t("encodingDesc", undefined, locale)}
            </div>
          </div>
          <select
            className="field"
            value={txtEncoding}
            disabled={fontLocked}
            onChange={(e) => onTxtEncodingChange?.(e.target.value)}
          >
            <option value="auto">
              {detectedEncoding || isClient
                ? `${t("encodingAuto", undefined, locale)} · ${encodingLabel(
                    (detectedEncoding ||
                      defaultEncodingForLanguage(systemLanguage())) as TxtEncodingId,
                  )}`
                : t("encodingAuto", undefined, locale)}
            </option>
            {encodingsForMenu(
              isClient ? systemLanguage() : "en",
              detectedEncoding as TxtEncodingId | null,
            ).map((enc) => (
              <option key={enc.id} value={enc.id}>
                {enc.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="setting-row">
        <div>
          <div className="setting-title">{t("fontSize", undefined, locale)}</div>
        </div>
        <div className="range-wrap">
          <input
            type="range"
            min={20}
            max={56}
            step={1}
            disabled={writingDisabled}
            value={settings.fontSize}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
            onMouseUp={() => onChange({}, true)}
            onTouchEnd={() => onChange({}, true)}
            onKeyUp={() => onChange({}, true)}
          />
          <span className="range-val">{settings.fontSize}</span>
        </div>
      </div>

      <div className="setting-row">
        <div>
          <div className="setting-title">{t("lineHeight", undefined, locale)}</div>
        </div>
        <div className="range-wrap">
          <input
            type="range"
            min={100}
            max={160}
            step={5}
            disabled={writingDisabled}
            value={settings.lineHeight}
            onChange={(e) => onChange({ lineHeight: Number(e.target.value) })}
            onMouseUp={() => onChange({}, true)}
            onTouchEnd={() => onChange({}, true)}
            onKeyUp={() => onChange({}, true)}
          />
          <span className="range-val">{settings.lineHeight}%</span>
        </div>
      </div>

      <div className="setting-row">
        <div>
          <div className="setting-title">{t("alignment", undefined, locale)}</div>
        </div>
        <select
          className="field"
          disabled={writingDisabled}
          value={String(settings.textAlign)}
          onChange={(e) => onChange({ textAlign: Number(e.target.value) }, true)}
        >
          <option value="3">{t("justify", undefined, locale)}</option>
          <option value="0">{t(vertical ? "alignStartV" : "alignStartH", undefined, locale)}</option>
          <option value="2">{t("center", undefined, locale)}</option>
          <option value="1">{t(vertical ? "alignEndV" : "alignEndH", undefined, locale)}</option>
        </select>
      </div>

      <div className="setting-row">
        <div>
          <div className="setting-title">{t("hyphenation", undefined, locale)}</div>
        </div>
        <select
          className="field"
          disabled={writingDisabled}
          value={String(settings.hyphenation)}
          onChange={(e) => onChange({ hyphenation: Number(e.target.value) }, true)}
        >
          <option value="0">{t("off", undefined, locale)}</option>
          <option value="1">{t("on", undefined, locale)}</option>
        </select>
      </div>

      <div className="setting-row">
        <div>
          <div className="setting-title">{t("writing", undefined, locale)}</div>
          <div className="setting-desc">{writingDesc(bookWriting, locale)}</div>
        </div>
        <div className={`seg${writingLocked ? " disabled" : ""}`}>
          <button
            type="button"
            disabled={writingLocked}
            className={bookWriting?.choice === "auto" || !bookWriting ? "active" : ""}
            onClick={() => onBookWritingChange("auto")}
          >
            {t("auto", undefined, locale)}
          </button>
          <button
            type="button"
            disabled={writingLocked}
            className={bookWriting?.choice === "horizontal" ? "active" : ""}
            onClick={() => onBookWritingChange("horizontal")}
          >
            {t("horizontal", undefined, locale)}
          </button>
          <button
            type="button"
            disabled={writingLocked}
            className={bookWriting?.choice === "vertical" ? "active" : ""}
            onClick={() => onBookWritingChange("vertical")}
          >
            {t("vertical", undefined, locale)}
          </button>
        </div>
      </div>
      </>
      )}

      <div className="setting-row">
        <div>
          <div className="setting-title">{t("nameFromTitle", undefined, locale)}</div>
          <div className="setting-desc">{t("nameFromTitleDesc", undefined, locale)}</div>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.renameFromTitle}
            onChange={(e) => onChange({ renameFromTitle: e.target.checked })}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      <div className="setting-row">
        <div>
          <div className="setting-title">{t("pageCompression", undefined, locale)}</div>
          <div className="setting-desc">{t("pageCompressionDesc", undefined, locale)}</div>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.pageCompression}
            disabled={writingDisabled}
            onChange={(e) => onChange({ pageCompression: e.target.checked }, true)}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      {bookIsPdf ? null : <p className="note">{t("note", undefined, locale)}</p>}
    </aside>
  );
}
