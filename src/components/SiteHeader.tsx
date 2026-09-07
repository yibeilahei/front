"use client";

import Link from "next/link";
import { CONTACT_URL } from "@/lib/site";
import { t, type Locale } from "@/lib/i18n";

export function SiteHeader({
  current,
  locale,
}: {
  current: "firmware" | "cookbook";
  locale: Locale;
}) {
  return (
    <header className="hero">
      <div className="hero-top">
        <h1>
          <Link href="/">lazahata</Link>
        </h1>
        <div className="hero-links">
          {current !== "firmware" ? (
            <Link className="hero-link" href="/firmware/">
              {t("firmware", undefined, locale)}
            </Link>
          ) : null}
          {current !== "cookbook" ? (
            <Link className="hero-link" href="/cookbook/">
              {t("cookbookLink", undefined, locale)}
            </Link>
          ) : null}
          <a className="hero-link" href={CONTACT_URL}>
            {t("contact", undefined, locale)}
          </a>
        </div>
      </div>
    </header>
  );
}
