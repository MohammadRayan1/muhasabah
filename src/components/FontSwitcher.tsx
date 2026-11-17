import { useEffect, useState } from "react";
import { Type } from "lucide-react";

const STORAGE_KEY = "muhasabah-font-preview";

const FONTS = [
  { name: "Inter", note: "current · neutral, crisp" },
  { name: "Plus Jakarta Sans", note: "friendly, modern" },
  { name: "Manrope", note: "geometric, refined" },
  { name: "DM Sans", note: "soft, compact" },
  { name: "Figtree", note: "warm, rounded" },
  { name: "Outfit", note: "geometric, bold headings" },
  { name: "IBM Plex Sans", note: "sturdy, professional" },
  { name: "Nunito", note: "the original, very rounded" },
];

function apply(name: string) {
  if (!name || name === "Inter") {
    document.body.style.removeProperty("font-family");
    return;
  }
  const id = `font-preview-${name.replace(/\s+/g, "-")}`;
  if (!document.getElementById(id)) {
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${name.replace(/\s+/g, "+")}:wght@400..700&display=swap`;
    document.head.appendChild(link);
  }
  document.body.style.fontFamily = `"${name}", "Tajawal", ui-sans-serif, system-ui, sans-serif`;
}

/** Temporary, development-only: preview the interface in different typefaces. */
export default function FontSwitcher() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("Inter");

  useEffect(() => {
    try {
      apply(localStorage.getItem(STORAGE_KEY) ?? "");
    } catch {
      // storage blocked; previews still work for this visit
    }
  }, []);

  function choose(name: string) {
    setCurrent(name);
    apply(name);
    try {
      localStorage.setItem(STORAGE_KEY, name);
    } catch {
      // ignore
    }
  }

  return (
    <div className="fixed end-4 bottom-4 z-50 flex flex-col items-end print:hidden">
      {open ? (
        <div className="mb-2 w-72 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl shadow-stone-900/15">
          <p className="px-2 pt-1 pb-2 text-xs font-semibold text-stone-500">Font preview (localhost only)</p>
          {FONTS.map((f) => (
            <button
              key={f.name}
              type="button"
              onClick={() => choose(f.name)}
              className={`flex w-full items-baseline justify-between gap-3 rounded-xl px-3 py-2 text-start transition-colors hover:bg-stone-50 ${
                current === f.name ? "bg-stone-100" : ""
              }`}
            >
              <span className="text-[15px] font-semibold text-stone-900">{f.name}</span>
              <span className="text-xs text-stone-500">{f.note}</span>
            </button>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => {
          try {
            setCurrent(localStorage.getItem(STORAGE_KEY) || "Inter");
          } catch {
            // ignore
          }
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        className="flex h-11 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 shadow-lg shadow-stone-900/10 hover:bg-stone-50"
      >
        <Type className="h-4 w-4" />
        Fonts
      </button>
    </div>
  );
}
