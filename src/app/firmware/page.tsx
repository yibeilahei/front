"use client";

import { SiteHeader } from "@/components/SiteHeader";
import { CONTACT_URL, REPO } from "@/lib/site";
import { t } from "@/lib/i18n";
import { useUiLocale } from "@/lib/useUiLocale";

export default function FirmwarePage() {
  const locale = useUiLocale("firmwareMetaTitle");
  return (
    <div className="wrap">
      <SiteHeader current="firmware" locale={locale} />
      <p className="lede">{t("firmwareLede", undefined, locale)}</p>
      <main>
        <section className="card project">
          <h2>{t("firmware", undefined, locale)}</h2>
          <ul className="features">
            <li>{t("firmwareFeature1", undefined, locale)}</li>
            <li>{t("firmwareFeature2", undefined, locale)}</li>
            <li>{t("firmwareFeature3", undefined, locale)}</li>
            <li>{t("firmwareFeature4", undefined, locale)}</li>
            <li>{t("firmwareFeature5", undefined, locale)}</li>
          </ul>
          <div className="actions">
            <a className="btn btn-primary" href={`${REPO.firmware}/releases/latest`}>
              {t("downloadRelease", undefined, locale)}
            </a>
            <a className="btn btn-ghost" href={REPO.firmware}>
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
