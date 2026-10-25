import type { LocaleCode } from "../config";
import en from "./en";
import zh from "./zh";
import ja from "./ja";
import es from "./es";
import fr from "./fr";

/** Every locale's messages, keyed by code. English is complete; others may be partial. */
export const messages: Record<LocaleCode, Record<string, string>> = {
  en,
  zh,
  ja,
  es,
  fr,
};

export { en };
