"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "./Button";

export interface LanguageOption {
  code: string;
  label: string;
  flag: string;
}

const languages: LanguageOption[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "jp", label: "Japanese", flag: "🇯🇵" },
  { code: "vi", label: "Vietnamese", flag: "🇻🇳" },
];

export function LanguageSwitcher({ defaultLang = "en", onChange }: { defaultLang?: string; onChange?: (lang: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState(defaultLang);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLang = languages.find(l => l.code === selectedLang) || languages[0];

  const handleSelect = (lang: LanguageOption) => {
    setSelectedLang(lang.code);
    setIsOpen(false);
    onChange?.(lang.code);
  };

  return (
    <div className="lang-switcher relative inline-flex">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="lang-switcher-btn flex items-center gap-2 px-3 py-2"
        type="button"
      >
        <span className="lang-flag text-lg">{currentLang.flag}</span>
        <span className="font-medium text-sm">{currentLang.label}</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="lang-dropdown absolute right-0 top-full mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 animate-fadeInUp"
          role="menu"
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang)}
              className={`lang-option w-full px-4 py-2 text-left flex items-center gap-3 text-sm font-medium transition-colors ${
                lang.code === selectedLang
                  ? "bg-teal-50 text-teal-700 font-semibold"
                  : "text-gray-700 hover:bg-teal-50 hover:text-teal-700"
              }`}
              role="menuitem"
            >
              <span className="text-lg">{lang.flag}</span>
              <span>{lang.label}</span>
              {lang.code === selectedLang && (
                <svg className="ml-auto w-4 h-4 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}