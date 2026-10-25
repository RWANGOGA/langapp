"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  type LocaleCode,
} from "./config";
import { en, messages } from "./locales";

type Vars = Record<string, string | number>;

interface LanguageContextValue {
  locale: LocaleCode;
  setLocale: (code: LocaleCode) => void;
  /** Resolve a key in the active locale, falling back to English, then to the key. */
  t: (key: string, vars?: Vars) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function readStoredLocale(): LocaleCode | null {
  if (typeof document === "undefined") return null;
  const fromCookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LOCALE_COOKIE}=`))
    ?.split("=")[1];
  if (isLocale(fromCookie)) return fromCookie;
  const fromStore = window.localStorage?.getItem(LOCALE_COOKIE);
  if (isLocale(fromStore)) return fromStore;
  return null;
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Start on English for a hydration-safe first paint, then adopt any saved choice.
  const [locale, setLocaleState] = useState<LocaleCode>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = readStoredLocale();
    if (stored && stored !== DEFAULT_LOCALE) setLocaleState(stored);
  }, []);

  const setLocale = useCallback((code: LocaleCode) => {
    setLocaleState(code);
    if (typeof document !== "undefined") {
      document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
      try {
        window.localStorage.setItem(LOCALE_COOKIE, code);
      } catch {
        /* storage may be unavailable; the cookie still carries the choice */
      }
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const value = useMemo<LanguageContextValue>(() => {
    const dict = messages[locale] ?? en;
    const fallback = en as Record<string, string>;
    const t = (key: string, vars?: Vars) =>
      interpolate(dict[key] ?? fallback[key] ?? key, vars);
    return { locale, setLocale, t };
  }, [locale, setLocale]);

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
