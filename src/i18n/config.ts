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
  { code: "ar", label: "Arabic", native: "العربية" },
] as const;

export type LocaleCode = (typeof LOCALES)[number]["code"];

export const DEFAULT_LOCALE: LocaleCode = "en";

/** First-party cookie so a full reload / server render honours the choice. */
export const LOCALE_COOKIE = "nile_locale";

/** The writing systems that run right-to-left. Only Arabic today, but the
 *  layout mirrors off this set so a future RTL locale drops straight in. */
const RTL_LOCALES: readonly LocaleCode[] = ["ar"];
export const isRtl = (code: LocaleCode): boolean => RTL_LOCALES.includes(code);

export const isLocale = (value: string | null | undefined): value is LocaleCode =>
  !!value && LOCALES.some((l) => l.code === value);
