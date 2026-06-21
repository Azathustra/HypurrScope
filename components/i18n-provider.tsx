"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Locale = "fr" | "en";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);
const storageKey = "insider-locale";

function detectLocale(): Locale {
  const saved = window.localStorage.getItem(storageKey);
  if (saved === "fr" || saved === "en") return saved;

  const cookieLocale = document.cookie
    .split("; ")
    .find((item) => item.startsWith("insider-locale="))
    ?.split("=")[1];

  if (cookieLocale === "fr" || cookieLocale === "en") return cookieLocale;

  const language = navigator.language.toLowerCase();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone.toLowerCase();

  if (language.startsWith("en") || timezone.includes("london")) return "en";
  return "fr";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    setLocaleState(detectLocale());
  }, []);

  const setLocale = (nextLocale: Locale) => {
    window.localStorage.setItem(storageKey, nextLocale);
    document.cookie = `insider-locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    setLocaleState(nextLocale);
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      toggleLocale: () => setLocale(locale === "fr" ? "en" : "fr")
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }

  return context;
}
