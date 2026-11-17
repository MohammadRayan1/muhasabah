import { useRevalidator } from "react-router";
import { LANG_COOKIE } from "@/lib/i18n";
import { useLang } from "@/lib/useT";

/**
 * English ⇄ Arabic switch, next to the theme toggle. The choice goes in a cookie so
 * the server renders the right language and direction on the next page load too;
 * revalidating re-runs the root loader, which flips the page without a reload.
 */
export default function LanguageToggle() {
  const lang = useLang();
  const { revalidate, state } = useRevalidator();
  const next = lang === "ar" ? "en" : "ar";

  function toggle() {
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    revalidate();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={state !== "idle"}
      aria-label={next === "ar" ? "التبديل إلى العربية" : "Switch to English"}
      title={next === "ar" ? "العربية" : "English"}
      data-tour="language"
      className="fixed end-16 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm transition-colors hover:bg-stone-50 disabled:opacity-60 print:hidden"
    >
      {next === "ar" ? (
        <span lang="ar" className="font-arabic text-lg leading-none font-bold">
          ع
        </span>
      ) : (
        <span className="text-xs font-extrabold tracking-wide">EN</span>
      )}
    </button>
  );
}
