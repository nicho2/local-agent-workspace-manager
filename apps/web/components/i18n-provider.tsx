"use client";

import type { ReactElement, ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  defaultLocale,
  dictionaries,
  isLocale,
  localeStorageKey,
  type Locale,
  type TranslationKey,
} from "@/lib/i18n";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }): ReactElement {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(localeStorageKey);
    if (isLocale(storedLocale)) {
      setLocaleState(storedLocale);
      document.documentElement.lang = storedLocale;
    }
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    function setLocale(nextLocale: Locale): void {
      setLocaleState(nextLocale);
      window.localStorage.setItem(localeStorageKey, nextLocale);
      document.documentElement.lang = nextLocale;
    }

    function t(key: TranslationKey): string {
      return dictionaries[locale][key] ?? dictionaries[defaultLocale][key];
    }

    return { locale, setLocale, t };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return context;
}

export function T({ k }: { k: TranslationKey }): ReactElement {
  const { t } = useI18n();
  return <>{t(k)}</>;
}
