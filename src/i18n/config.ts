/**
 * The set of languages the school speaks. English is the source of truth and
 * the fallback for any key a locale has not translated yet, so the interface can
 * grow locale by locale without a missing string ever breaking the page.
 */
export const LOCALES = [
  { code: "en", label: "English", native: "English" },
  { code: "zh", label: "Chinese", native: "中文" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "fr", label: "French", native: "Français" },
] as const;

export type LocaleCode = (typeof LOCALES)[number]["code"];

export const DEFAULT_LOCALE: LocaleCode = "en";

/** First-party cookie so a full reload / server render honours the choice. */
export const LOCALE_COOKIE = "nile_locale";

export const isLocale = (value: string | null | undefined): value is LocaleCode =>
  !!value && LOCALES.some((l) => l.code === value);
