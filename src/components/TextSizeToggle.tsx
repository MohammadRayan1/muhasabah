import { useT } from "@/lib/useT";

export const TEXT_SIZE_KEY = "muhasabah-text-size";

/**
 * "Larger text" switch beside the language and theme buttons. Like the theme, the
 * choice is applied before first paint (see the root layout), so this needs no state.
 */
export default function TextSizeToggle() {
  const t = useT();
  function toggle() {
    const large = document.documentElement.classList.toggle("text-large");
    try {
      localStorage.setItem(TEXT_SIZE_KEY, large ? "large" : "normal");
    } catch {
      // storage blocked; the size still changes for this visit
    }
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("Larger or smaller text")}
      title={t("Larger or smaller text")}
      className="fixed end-28 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white font-semibold text-stone-700 shadow-sm transition-colors hover:bg-stone-50 print:hidden"
    >
      <span aria-hidden className="text-[13px] leading-none">A</span>
      <span aria-hidden className="text-[18px] leading-none">A</span>
    </button>
  );
}
