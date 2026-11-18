import { useState, type ReactNode } from "react";
import { useFetcher } from "react-router";
import { useT } from "@/lib/useT";

/**
 * A button that asks before it acts: "Remove" becomes "Remove Yusuf? Yes, remove /
 * Cancel" in place. The hidden inputs say what to do.
 */
export default function ConfirmButton({
  label,
  question,
  confirmLabel,
  action,
  children,
  tone = "danger",
}: {
  label: string;
  question: string;
  confirmLabel: string;
  action?: string;
  children: ReactNode;
  tone?: "danger" | "neutral";
}) {
  const t = useT();
  const fetcher = useFetcher();
  const [asking, setAsking] = useState(false);
  const busy = fetcher.state !== "idle";

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className={`inline-flex min-h-12 items-center rounded-xl border px-4 text-[15px] font-semibold transition-colors ${
          tone === "danger"
            ? "border-stone-200 text-stone-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            : "border-stone-200 text-stone-700 hover:bg-stone-50"
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <fetcher.Form method="post" action={action} className="flex flex-wrap items-center gap-2" onSubmit={() => setAsking(false)}>
      {children}
      <span className="text-sm font-medium text-stone-700">{question}</span>
      <button
        type="submit"
        disabled={busy}
        autoFocus
        className={`inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
          tone === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
        }`}
      >
        {confirmLabel}
      </button>
      <button
        type="button"
        onClick={() => setAsking(false)}
        className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-stone-500 hover:text-stone-900"
      >
        {t("Cancel")}
      </button>
    </fetcher.Form>
  );
}
