"use client";

import type { ReactElement } from "react";

import { useI18n } from "@/components/i18n-provider";
import type { Locale } from "@/lib/i18n";

export function LanguageSwitcher(): ReactElement {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className="language-switcher" htmlFor="language-select">
      <span>{t("language.label")}</span>
      <select
        id="language-select"
        onChange={(event) => setLocale(event.target.value as Locale)}
        value={locale}
      >
        <option value="en">{t("language.english")}</option>
        <option value="fr">{t("language.french")}</option>
      </select>
    </label>
  );
}
