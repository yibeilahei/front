"use client";

import { FirmwareFlasher } from "@/components/FirmwareFlasher";
import { SiteHeader } from "@/components/SiteHeader";
import { CONTACT_URL } from "@/lib/site";
import { t } from "@/lib/i18n";
import { useUiLocale } from "@/lib/useUiLocale";

export default function CrossxtchPage() {
  const locale = useUiLocale("crossxtchMetaTitle");
  return (
    <div className="wrap">
      <SiteHeader current="crossxtch" locale={locale} />
      <p className="lede">{t("crossxtchLede", undefined, locale)}</p>
      <main>
        <FirmwareFlasher locale={locale} />
      </main>
      <footer className="site-foot">
        <a href={CONTACT_URL}>{t("contact", undefined, locale)}</a>
      </footer>
    </div>
  );
}
