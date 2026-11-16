// English / Arabic. English text is the key: t("Sign up") looks it up in the Arabic
// dictionary and falls back to the English when there's no entry. Keys may hold
// {placeholders}; a message built on the server ("Pick a program for Yusuf") still
// finds its template ("Pick a program for {name}") when it's shown.

import { AR } from "@/lib/i18n-ar";

export type Lang = "en" | "ar";
export const LANG_COOKIE = "muhasabah-lang";

export function langFromCookie(cookieHeader: string | null): Lang {
  const match = cookieHeader?.match(new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=(\\w+)`));
  return match?.[1] === "ar" ? "ar" : "en";
}

// The language being rendered right now. Set by the root layout at the top of each
// render (pages render synchronously, so one request can't see another's value), and
// read by the date formatters so they don't each need the language passed in.
let current: Lang = "en";
export function setCurrentLang(lang: Lang) {
  current = lang;
}
export function currentLang(): Lang {
  return current;
}

export type Vars = Record<string, string | number>;

function fill(template: string, vars?: Vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

// Templated keys, turned into regexes once, for matching finished English sentences.
const templates = Object.keys(AR)
  .filter((key) => key.includes("{"))
  .map((key) => {
    const names: string[] = [];
    const pattern = key
      .split(/(\{\w+\})/)
      .map((part) => {
        const m = part.match(/^\{(\w+)\}$/);
        if (m) {
          names.push(m[1]);
          return "(.+?)";
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("");
    return { key, names, regex: new RegExp(`^${pattern}$`), fixed: key.replace(/\{\w+\}/g, "").length };
  })
  // Most specific first, so "Due in {n} days" wins over "{n} days".
  .sort((a, b) => b.fixed - a.fixed);

// Arabic counted nouns: 3–10 take the plural (5 أيام), 11 and up the singular
// accusative (15 يومًا). The dictionary is written with plurals; this fixes the rest.
const ARABIC_COUNT_SINGULAR: Record<string, string> = {
  أيام: "يومًا",
  أخطاء: "خطأً",
  أبناء: "ابنًا",
  تسجيلات: "تسجيلًا",
  مدفوعات: "دفعة",
};
function arabicCounts(text: string) {
  return text.replace(/(\d+) (أيام|أخطاء|أبناء|تسجيلات)/g, (whole, n: string, noun: string) =>
    Number(n) >= 11 ? `${n} ${ARABIC_COUNT_SINGULAR[noun]}` : whole,
  );
}

export function translate(lang: Lang, text: string, vars?: Vars): string {
  if (lang === "en" || !text) return fill(text, vars);
  const exact = AR[text];
  if (exact !== undefined) return arabicCounts(fill(exact, vars));
  if (!vars) {
    for (const { key, names, regex } of templates) {
      const m = text.match(regex);
      if (m) return arabicCounts(fill(AR[key], Object.fromEntries(names.map((n, i) => [n, m[i + 1]]))));
    }
  }
  return fill(text, vars);
}

/** Translate with whatever language is rendering now (for code outside components). */
export function tr(text: string, vars?: Vars) {
  return translate(current, text, vars);
}
