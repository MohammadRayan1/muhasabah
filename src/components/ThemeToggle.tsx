"use client";

import { Moon, Sun } from "lucide-react";
import { THEME_STORAGE_KEY } from "@/lib/theme";

/**
 * Light/dark switch. The current theme lives on <html class="dark">, set before
 * first paint by the inline script in the root layout, so this component needs no
 * state: both icons render and CSS shows the right one.
 */
export default function ThemeToggle() {
  function toggle() {
    const isDark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
    } catch {
      // storage blocked (private mode etc.) — theme still switches for this visit
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="fixed right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm transition-colors hover:bg-stone-50"
    >
      <Moon className="h-5 w-5 dark:hidden" strokeWidth={2} />
      <Sun className="hidden h-5 w-5 dark:block" strokeWidth={2} />
    </button>
  );
}
