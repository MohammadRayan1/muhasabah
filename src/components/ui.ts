import type { CSSProperties } from "react";

// Shared class strings so new screens match the existing ones.
/** Quiet surface: hairline border, barely-there shadow. */
export const card = "rounded-2xl border border-stone-200/80 bg-white p-5 shadow-[0_1px_2px_rgb(28_25_23/0.04)]";
export const input =
  "mt-1.5 h-12 w-full rounded-xl border border-stone-300 bg-white px-3.5 text-base text-stone-900 shadow-[0_1px_2px_rgb(28_25_23/0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-stone-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/12";
export const label = "block text-[15px] font-semibold text-stone-800";
export const primaryButton =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-base font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_1px_2px_rgb(15_59_44/0.25)] transition-colors hover:bg-emerald-700 disabled:opacity-60";
export const secondaryButton =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-5 text-base font-semibold text-stone-800 shadow-[0_1px_2px_rgb(28_25_23/0.04)] transition-colors hover:bg-stone-50 disabled:opacity-60";
export const sectionTitle = "mb-3 text-base font-semibold text-stone-900";
export const pageTitle = "text-[2rem] leading-tight font-semibold text-stone-900 sm:text-[2.25rem]";
/** Every teacher page shares one column, so the left edge never jumps between pages. */
export const pageWidth = "mx-auto w-full max-w-5xl";

/** Stagger for the `.rise` entrance: the nth block on a page arrives n × 70ms later. */
export function stagger(i: number) {
  return { "--i": i } as CSSProperties;
}
