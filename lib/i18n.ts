import { getRequestConfig } from "next-intl/server";

export const locales = ["en", "zh"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export default getRequestConfig(async () => {
  // In a cookie-based approach, we read the locale from a cookie
  // For simplicity, we detect via Accept-Language header or default to "en"
  // The actual locale switching happens client-side via the LocaleProvider
  const locale = defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
