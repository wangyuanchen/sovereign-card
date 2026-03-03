"use client";

import { useLocale } from "./LocaleProvider";
import type { Locale } from "@/lib/i18n";

const labels: Record<string, string> = {
  en: "EN",
  zh: "中文",
};

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  const toggle = () => {
    const next: Locale = locale === "en" ? "zh" : "en";
    setLocale(next);
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
        bg-bg-elevated border border-border-subtle
        hover:border-accent-purple/50 text-sm text-text-secondary
        hover:text-text-primary transition-all"
      title="Switch language"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
        />
      </svg>
      {labels[locale]}
    </button>
  );
}
