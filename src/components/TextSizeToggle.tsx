import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { useT } from "@/lib/useT";

export const TEXT_SIZE_KEY = "muhasabah-text-size";

export const TEXT_SIZES = [
  { id: "small", label: "Small", sample: "text-[14px]" },
  { id: "normal", label: "Normal", sample: "text-[18px]" },
  { id: "large", label: "Large", sample: "text-[23px]" },
  { id: "xlarge", label: "Extra large", sample: "text-[28px]" },
] as const;
type TextSize = (typeof TEXT_SIZES)[number]["id"];

function currentSize(): TextSize {
  const value = document.documentElement.getAttribute("data-text-size");
  return TEXT_SIZES.some((s) => s.id === value) ? (value as TextSize) : "normal";
}

/**
 * The "AA" button beside the language and theme buttons. It opens a small panel to
 * pick one of four text sizes. Each browser remembers its own choice, which is
 * applied before first paint (see the root layout).
 */
export default function TextSizeToggle() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<TextSize>("normal");
  const buttonRef = useRef<HTMLButtonElement>(null);

  function toggle() {
    if (!open) setSize(currentSize());
    setOpen(!open);
  }

  function choose(next: TextSize) {
    setSize(next);
    const root = document.documentElement;
    if (next === "normal") root.removeAttribute("data-text-size");
    else root.setAttribute("data-text-size", next);
    try {
      localStorage.setItem(TEXT_SIZE_KEY, next);
    } catch {
      // storage blocked; the size still changes for this visit
    }
  }

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="text-size-panel"
        aria-label={t("Text size")}
        title={t("Text size")}
        className={`fixed end-28 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border font-semibold shadow-sm transition-colors print:hidden ${
          open ? "border-emerald-600 bg-emerald-50 text-stone-900" : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
        }`}
      >
        <span aria-hidden className="text-[13px] leading-none">A</span>
        <span aria-hidden className="text-[18px] leading-none">A</span>
      </button>

      {open ? (
        <>
          {/* Clicking anywhere else closes the panel. */}
          <div aria-hidden className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
          <div
            id="text-size-panel"
            role="dialog"
            aria-label={t("Text size")}
            onKeyDown={(e) => e.key === "Escape" && close()}
            className="sheet fixed end-4 top-16 z-50 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl shadow-stone-900/15 print:hidden"
          >
            <p className="text-base font-semibold text-stone-900">{t("Text size")}</p>
            <p className="mb-3 text-[15px] text-stone-600">{t("Pick what's easiest to read. This device will remember it.")}</p>
            <div role="radiogroup" aria-label={t("Text size")} className="grid grid-cols-2 gap-2">
              {TEXT_SIZES.map((s, i) => {
                const on = size === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    autoFocus={on || (i === 1 && !TEXT_SIZES.some((x) => x.id === size))}
                    onClick={() => choose(s.id)}
                    className={`relative flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 py-2 transition-colors ${
                      on ? "border-emerald-600 bg-emerald-50 text-stone-900" : "border-stone-200 text-stone-800 hover:border-stone-300 hover:bg-stone-50"
                    }`}
                  >
                    {on ? <Check aria-hidden className="absolute end-2 top-2 h-4 w-4 text-emerald-600" strokeWidth={2.5} /> : null}
                    <span aria-hidden className={`font-semibold leading-none ${s.sample}`}>A</span>
                    <span className="text-[14px] font-medium">{t(s.label)}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={close}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 text-[15px] font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              {t("Done")}
            </button>
          </div>
        </>
      ) : null}
    </>
  );
}
