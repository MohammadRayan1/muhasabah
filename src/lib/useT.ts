import { useCallback } from "react";
import { useRouteLoaderData } from "react-router";
import { translate, type Lang, type Vars } from "@/lib/i18n";

/** The language chosen with the switch (from the root loader's cookie read). */
export function useLang(): Lang {
  const data = useRouteLoaderData("root") as { lang?: Lang } | undefined;
  return data?.lang ?? "en";
}

export function useT() {
  const lang = useLang();
  return useCallback((text: string, vars?: Vars) => translate(lang, text, vars), [lang]);
}

/** For `meta` exports, which can't use hooks: reads the language from the root match. */
export function metaTitle(matches: readonly unknown[], title: string) {
  const root = matches[0] as { loaderData?: { lang?: Lang } } | undefined;
  const lang = root?.loaderData?.lang ?? "en";
  return `${translate(lang, title)} · ${lang === "ar" ? "محاسبة" : "Muhasabah"}`;
}
