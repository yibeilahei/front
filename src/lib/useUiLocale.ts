"use client";

import { useEffect, useState } from "react";
import {
  applyDocumentLocale,
  DEFAULT_LOCALE,
  detectLocale,
  setLocale,
  type Locale,
  type MessageKey,
} from "./i18n";

export function useUiLocale(titleKey: MessageKey = "metaTitle"): Locale {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  const locale = detectLocale(hydrated ? undefined : DEFAULT_LOCALE);
  useEffect(() => {
    setLocale(locale);
    applyDocumentLocale(locale, titleKey);
  }, [locale, titleKey]);
  return locale;
}
