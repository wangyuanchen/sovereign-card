"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "@/lib/i18n";

// ── Messages cache ──────────────────────────────────────
const messagesCache: Record<string, Record<string, unknown>> = {};

async function loadMessages(locale: string) {
  if (messagesCache[locale]) return messagesCache[locale];
  const mod = await import(`../messages/${locale}.json`);
  messagesCache[locale] = mod.default;
  return mod.default;
}

// ── Context ──────────────────────────────────────────────
interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
});

export function useLocale() {
  return useContext(LocaleContext);
}

// ── Storage helpers ──────────────────────────────────────
const STORAGE_KEY = "sovereign-card-locale";

function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "zh" || stored === "en") return stored;

  // Auto-detect from browser language
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith("zh")) return "zh";
  return "en";
}

function storeLocale(locale: Locale) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, locale);
}

// ── Provider ─────────────────────────────────────────────
export function LocaleProvider({
  children,
  initialMessages,
}: {
  children: ReactNode;
  initialMessages: Record<string, unknown>;
}) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [messages, setMessages] =
    useState<Record<string, unknown>>(initialMessages);
  const [mounted, setMounted] = useState(false);

  // On mount, read stored locale and load messages
  useEffect(() => {
    const stored = getStoredLocale();
    setLocaleState(stored);
    loadMessages(stored).then((msgs) => {
      setMessages(msgs);
      setMounted(true);
    });
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    storeLocale(newLocale);
    loadMessages(newLocale).then(setMessages);
  }, []);

  // Use initial messages for SSR, switch on mount
  const currentMessages = mounted ? messages : initialMessages;

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider
        locale={locale}
        messages={currentMessages}
        timeZone="UTC"
      >
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
