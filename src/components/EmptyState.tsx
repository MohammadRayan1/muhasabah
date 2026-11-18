import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** What an empty list means and what to do next, in plain words. */
export default function EmptyState({ icon: Icon, title, body, children }: { icon: LucideIcon; title: string; body: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-6 py-6 sm:flex-row sm:items-center">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-600">
        <Icon aria-hidden className="h-6 w-6" />
      </span>
      <div className="flex-1">
        <p className="text-lg font-semibold text-stone-900">{title}</p>
        <p className="mt-0.5 text-[15px] leading-relaxed text-stone-600">{body}</p>
      </div>
      {children}
    </div>
  );
}
