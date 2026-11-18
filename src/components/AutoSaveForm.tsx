import { useEffect, useRef, type ReactNode } from "react";
import { useFetcher } from "react-router";
import { Check, Loader2 } from "lucide-react";
import FormError from "@/components/FormError";
import { useT } from "@/lib/useT";

/**
 * A form that saves itself a moment after typing stops, with a clear "Saving…" /
 * "Saved" note. For low-stakes details like contact information, not money.
 */
export default function AutoSaveForm({ intent, children, className = "" }: { intent: string; children: ReactNode; className?: string }) {
  const t = useT();
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>();
  const timer = useRef<number | undefined>(undefined);
  const dirty = useRef(false);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function schedule(form: HTMLFormElement) {
    dirty.current = true;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (!form.checkValidity()) return;
      dirty.current = false;
      fetcher.submit(form);
    }, 900);
  }

  const saving = fetcher.state !== "idle";
  const saved = !saving && fetcher.data?.ok;

  return (
    <fetcher.Form
      method="post"
      className={className}
      onChange={(e) => schedule(e.currentTarget)}
      onSubmit={(e) => {
        e.preventDefault();
        window.clearTimeout(timer.current);
        fetcher.submit(e.currentTarget);
      }}
    >
      <input type="hidden" name="intent" value={intent} />
      <FormError message={fetcher.data?.error} />
      {children}
      <p aria-live="polite" className="flex min-h-7 items-center gap-2 text-[15px] font-medium text-stone-600">
        {saving ? (
          <>
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            {t("Saving…")}
          </>
        ) : saved ? (
          <>
            <Check aria-hidden className="h-4 w-4 text-emerald-600" />
            <span className="text-emerald-700">{t("Saved")}</span>
          </>
        ) : (
          t("Changes save on their own.")
        )}
      </p>
    </fetcher.Form>
  );
}
