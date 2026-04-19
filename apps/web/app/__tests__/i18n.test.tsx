import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { I18nProvider } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { dictionaries, isLocale } from "@/lib/i18n";

describe("i18n", () => {
  it("defines English and French labels for the dashboard language switcher", () => {
    expect(dictionaries.en["language.label"]).toBe("Language");
    expect(dictionaries.fr["language.label"]).toBe("Langue");
    expect(isLocale("fr")).toBe(true);
    expect(isLocale("de")).toBe(false);
  });

  it("renders the language switcher with both supported languages", () => {
    const html = renderToStaticMarkup(
      <I18nProvider>
        <LanguageSwitcher />
      </I18nProvider>
    );

    expect(html).toContain("Language");
    expect(html).toContain('value="en"');
    expect(html).toContain('value="fr"');
  });
});
