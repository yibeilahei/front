"use client";

import { SiteHeader } from "@/components/SiteHeader";
import { CONTACT_URL, REPO } from "@/lib/site";
import { t } from "@/lib/i18n";
import { useUiLocale } from "@/lib/useUiLocale";

export default function CrossxtchPage() {
  const locale = useUiLocale("crossxtchMetaTitle");
  return (
    <div className="wrap">
      <SiteHeader current="crossxtch" locale={locale} />
      <p className="lede">{t("crossxtchLede", undefined, locale)}</p>
      <main>
        <section className="card project">
          <h2>{t("crossxtchLink", undefined, locale)}</h2>
          <ul className="features">
            <li>{t("crossxtchFeature1", undefined, locale)}</li>
            <li>{t("crossxtchFeature2", undefined, locale)}</li>
            <li>{t("crossxtchFeature3", undefined, locale)}</li>
            <li>{t("crossxtchFeature4", undefined, locale)}</li>
            <li>{t("crossxtchFeature5", undefined, locale)}</li>
          </ul>
          <div className="actions">
            <a className="btn btn-primary" href={`${REPO.crossxtch}/releases/latest`}>
              {t("downloadRelease", undefined, locale)}
            </a>
            <a className="btn btn-ghost" href={REPO.crossxtch}>
              {t("viewSource", undefined, locale)}
            </a>
          </div>
        </section>
      </main>
      <footer className="site-foot">
        <a href={CONTACT_URL}>{t("contact", undefined, locale)}</a>
      </footer>
    </div>
  );
}
