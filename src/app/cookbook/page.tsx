"use client";

import { InstallCommand } from "../install-command";
import { SiteHeader } from "@/components/SiteHeader";
import { CONTACT_URL, INSTALL, REPO } from "@/lib/site";
import { t } from "@/lib/i18n";
import { useUiLocale } from "@/lib/useUiLocale";

export default function CookbookPage() {
  const locale = useUiLocale("cookbookMetaTitle");
  return (
    <div className="wrap">
      <SiteHeader current="cookbook" locale={locale} />
      <p className="lede">{t("cookbookLede", undefined, locale)}</p>
      <main>
        <section className="card project">
          <h2>{t("cookbookLink", undefined, locale)}</h2>
          <ul className="features">
            <li>{t("cookbookFeature1", undefined, locale)}</li>
            <li>{t("cookbookFeature2", undefined, locale)}</li>
            <li>{t("cookbookFeature3", undefined, locale)}</li>
            <li>{t("cookbookFeature4", undefined, locale)}</li>
            <li>{t("cookbookFeature5", undefined, locale)}</li>
          </ul>
          <div className="actions">
            <a className="btn btn-primary" href="#install">
              {t("install", undefined, locale)}
            </a>
            <a className="btn btn-ghost" href={REPO.cookbook}>
              {t("viewSource", undefined, locale)}
            </a>
          </div>
        </section>

        <section id="install" className="card install">
          <h2>{t("installCookbook", undefined, locale)}</h2>
          <p className="install-note">{t("installNote", undefined, locale)}</p>
          <InstallCommand
            label="Calibre"
            hint={t("calibreHint", undefined, locale)}
            command={INSTALL.calibre}
            locale={locale}
          />
          <InstallCommand
            label="Cookbook"
            hint={t("cookbookInstallHint", undefined, locale)}
            command={INSTALL.cookbook}
            locale={locale}
          />
        </section>
      </main>
      <footer className="site-foot">
        <a href={CONTACT_URL}>{t("contact", undefined, locale)}</a>
      </footer>
    </div>
  );
}
