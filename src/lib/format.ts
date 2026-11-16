import { currentLang } from "@/lib/i18n";

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

// Due dates are calendar days stored at midnight on the server, which runs in UTC.
// Pages now render on the server and again in the browser, so dates are formatted
// in UTC in both places; otherwise a US browser would show Dec 1 as Nov 30.
// Arabic uses Arabic month names with Western digits, matching the amounts.
const dateFormats = {
  en: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }),
  ar: new Intl.DateTimeFormat("ar-u-nu-latn", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }),
};

export function formatDate(date: Date) {
  return dateFormats[currentLang()].format(date);
}

/** Locale tag for other Intl formatters on the page. */
export function intlLocale() {
  return currentLang() === "ar" ? "ar-u-nu-latn" : "en-US";
}

const monthFormats = {
  en: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
  ar: new Intl.DateTimeFormat("ar-u-nu-latn", { month: "long", year: "numeric", timeZone: "UTC" }),
};

/** "2026-11" → "November 2026" (or "نوفمبر 2026"). */
export function formatMonth(slug: string) {
  const [year, month] = slug.split("-").map(Number);
  return monthFormats[currentLang()].format(new Date(Date.UTC(year, month - 1, 15)));
}
