"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { LOCALES, type LocaleCode } from "@/i18n/config";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "./LanguageSwitcher.module.css";

/**
 * The single affordance that changes the whole interface's language. Renders a
 * compact trigger that reads correctly on the dark marketing header ("dark") and
 * the white portal topbar ("light"); the panel itself is always a light popover.
 */
export default function LanguageSwitcher({
  variant = "light",
}: {
  variant?: "light" | "dark";
}) {
  const { locale, setLocale, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Dismiss on any click or Escape outside the control.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  const choose = (code: LocaleCode) => {
    setLocale(code);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        type="button"
        className={`${styles.trigger} ${variant === "dark" ? styles.triggerDark : styles.triggerLight}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("a11y.changeLanguage")}
      >
        <Globe size={15} aria-hidden />
        <span className={styles.current}>{current.native}</span>
        <ChevronDown size={14} aria-hidden className={open ? styles.chevronOpen : ""} />
      </button>

      {open && (
        <ul className={styles.panel} role="listbox" aria-label={t("a11y.changeLanguage")}>
          {LOCALES.map((l) => {
            const active = l.code === locale;
            return (
              <li key={l.code} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`${styles.option} ${active ? styles.optionActive : ""}`}
                  onClick={() => choose(l.code)}
                >
                  <span className={styles.optionNative}>{l.native}</span>
                  <span className={styles.optionLabel}>{l.label}</span>
                  {active && <Check size={15} aria-hidden className={styles.check} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
