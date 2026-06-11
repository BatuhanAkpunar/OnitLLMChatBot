"use client";

import { createContext, useCallback, useContext } from "react";
import { translate, type AppLanguage, type I18nKey } from "@/lib/i18n";

const I18nContext = createContext<AppLanguage>("en");

/** Provides the resolved app-UI language (server decides: profile or Accept-Language). */
export function I18nProvider({
  lang,
  children,
}: {
  lang: AppLanguage;
  children: React.ReactNode;
}) {
  return <I18nContext.Provider value={lang}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const lang = useContext(I18nContext);
  const t = useCallback(
    (key: I18nKey, vars?: Record<string, string | number>) =>
      translate(lang, key, vars),
    [lang],
  );
  return { lang, t };
}
