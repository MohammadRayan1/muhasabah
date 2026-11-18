import { useEffect, useState } from "react";
import { useFetcher, useRouteLoaderData } from "react-router";
import { CheckCircle2, Undo2, X } from "lucide-react";
import { useT } from "@/lib/useT";

type Toast = { id: string; message: string; vars?: Record<string, string>; undo?: string };

/**
 * The confirmation message after every save, approval or removal, with Undo when
 * the change can be taken back. It stays a few seconds (longer when there's an
 * Undo) and is announced to screen readers.
 */
export default function Toaster() {
  const t = useT();
  const root = useRouteLoaderData("root") as { toast?: Toast | null } | undefined;
  const incoming = root?.toast ?? null;
  const [shown, setShown] = useState<Toast | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const undo = useFetcher<{ ok?: boolean; error?: string }>();

  // A new message replaces the current one (adjusting state while rendering).
  if (incoming && incoming.id !== lastId) {
    setLastId(incoming.id);
    setShown(incoming);
  }

  useEffect(() => {
    if (!shown) return;
    const id = window.setTimeout(() => setShown(null), shown.undo ? 10000 : 5000);
    return () => window.clearTimeout(id);
  }, [shown]);

  const undoError = undo.state === "idle" ? undo.data?.error : undefined;

  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-5 z-[80] flex justify-center px-4 print:hidden">
      {shown || undoError ? (
        <div
          key={shown?.id ?? "undo-error"}
          className="toast-in pointer-events-auto flex max-w-xl items-center gap-3 rounded-2xl bg-stone-900 py-3 ps-4 pe-2 text-base text-white shadow-2xl shadow-stone-950/30 dark:bg-stone-100"
        >
          <CheckCircle2 aria-hidden className="h-5 w-5 shrink-0 text-emerald-400" />
          <span className="font-medium">{undoError ? t(undoError) : shown ? t(shown.message, shown.vars) : null}</span>
          {shown?.undo && !undoError ? (
            <undo.Form method="post" action="/undo" onSubmit={() => setShown(null)}>
              <input type="hidden" name="ticket" value={shown.undo} />
              <button
                type="submit"
                className="ms-1 inline-flex h-11 items-center gap-1.5 rounded-xl bg-white/15 px-4 font-semibold text-white transition-colors hover:bg-white/25"
              >
                <Undo2 aria-hidden className="h-4 w-4" />
                {t("Undo")}
              </button>
            </undo.Form>
          ) : null}
          <button
            type="button"
            onClick={() => setShown(null)}
            aria-label={t("Close")}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
