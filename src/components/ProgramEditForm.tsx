import { useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import type { ActionState } from "@/lib/action-state";
import FormError from "@/components/FormError";
import ProgramFields from "@/components/ProgramFields";
import { primaryButton } from "@/components/ui";
import { useT } from "@/lib/useT";

type Program = {
  id: string;
  name: string;
  days: string;
  time: string;
  location: string;
  price: number;
  daysPerWeek: number;
  dayOptions: number[];
};

/** Edit every detail of an existing program. */
export default function ProgramEditForm({
  program,
  onDone,
  locations = [],
}: {
  program: Program;
  onDone?: () => void;
  locations?: string[];
}) {
  const t = useT();
  const fetcher = useFetcher<ActionState>();
  const pending = fetcher.state !== "idle";
  const handled = useRef<ActionState | undefined>(undefined);

  // Close once per successful save.
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok && handled.current !== fetcher.data) {
      handled.current = fetcher.data;
      onDone?.();
    }
  });

  return (
    <fetcher.Form method="post" className="space-y-6 border-t border-stone-100 pt-6">
      <input type="hidden" name="intent" value="updateProgram" />
      <input type="hidden" name="programId" value={program.id} />
      <FormError message={fetcher.data?.error} />
      <ProgramFields idPrefix={program.id} defaults={program} locations={locations} />
      <p className="rounded-xl bg-stone-50 px-4 py-3 text-sm leading-relaxed text-stone-700">
        {t("Price changes apply to new registrations. Students already enrolled keep their current tuition.")}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? t("Saving…") : t("Save changes")}
        </button>
        {onDone ? (
          <button type="button" onClick={onDone} className="min-h-12 rounded-xl px-4 text-base font-semibold text-stone-600 hover:text-stone-900">
            {t("Cancel")}
          </button>
        ) : null}
      </div>
    </fetcher.Form>
  );
}
