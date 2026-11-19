"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  translations,
  type Language,
  type TranslationKey,
} from "@/lib/i18n/translations";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "aminiya-language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    let savedLanguage: string | null = null;
    try {
      savedLanguage = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage blocked (private mode): fall through to the browser language.
    }

    // A saved choice wins; otherwise open in Hausa when the browser asks for it.
    const preferred =
      savedLanguage === "en" || savedLanguage === "ha"
        ? savedLanguage
        : navigator.languages?.some((code) => code.toLowerCase().startsWith("ha"))
          ? "ha"
          : null;

    if (preferred) {
      // This intentionally hydrates the browser preference after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLanguageState(preferred);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    } catch {
      // Not persisted; the choice still applies for this visit.
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translations[language][key],
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
}
