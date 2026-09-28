"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import styles from "./LanguageSwitcher.module.css";

export const LANGUAGES = [
  { code: "en", label: "EN", flag: "🇬🇧", name: "English" },
  { code: "jp", label: "JP", flag: "🇯🇵", name: "日本語" },
  { code: "vi", label: "VI", flag: "🇻🇳", name: "Tiếng Việt" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export default function LanguageSwitcher({
  value,
  onChange,
}: {
  value?: LanguageCode;
  onChange?: (code: LanguageCode) => void;
}) {
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState<LanguageCode>("en");
  const rootRef = useRef<HTMLDivElement>(null);

  const current = value ?? internal;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const active = LANGUAGES.find((l) => l.code === current) ?? LANGUAGES[0];

  function select(code: LanguageCode) {
    setInternal(code);
    setOpen(false);
    onChange?.(code);
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${active.name}`}
      >
        <span aria-hidden>{active.flag}</span>
        <span className={styles.code}>{active.label}</span>
        <ChevronDown
          size={18}
          strokeWidth={2}
          className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
        />
      </button>

      {open && (
        <ul className={styles.menu} role="listbox" aria-label="Select language">
          {LANGUAGES.map((lang) => (
            <li key={lang.code}>
              <button
                type="button"
                role="option"
                aria-selected={lang.code === current}
                className={`${styles.option} ${lang.code === current ? styles.optionActive : ""}`}
                onClick={() => select(lang.code)}
              >
                <Globe size={18} strokeWidth={1.8} className={styles.globe} />
                <span className={styles.flag} aria-hidden>
                  {lang.flag}
                </span>
                <span className={styles.optionCode}>{lang.label}</span>
                {lang.code === current && <Check size={16} strokeWidth={2.5} className={styles.check} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
