import { useState } from "react";
import { useFetcher } from "react-router";
import type { ActionState } from "@/lib/action-state";
import FormError from "@/components/FormError";
import DayOptionsFields from "@/components/DayOptionsFields";
import { input, label, secondaryButton } from "@/components/ui";
import { useT } from "@/lib/useT";

type Program = { id: string; price: number; daysPerWeek: number; dayOptions: number[] };

/** Edit an existing program's price, days a week and the day counts parents can pick. */
export default function ProgramDaysForm({ program }: { program: Program }) {
  const t = useT();
  const fetcher = useFetcher<ActionState>();
  const [price, setPrice] = useState(String(program.price));
  const pending = fetcher.state !== "idle";

  return (
    <fetcher.Form method="post" className="space-y-3 border-t border-stone-200 pt-3">
      <input type="hidden" name="intent" value="updateProgramDays" />
      <input type="hidden" name="programId" value={program.id} />
      <FormError message={fetcher.data?.error} />
      <div className="max-w-48">
        <label htmlFor={`${program.id}-price`} className={label}>
          {t("Price for all days ($/month)")}
        </label>
        <input
          id={`${program.id}-price`}
          name="price"
          type="number"
          step="0.01"
          min="0.01"
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className={input}
        />
      </div>
      <DayOptionsFields
        idPrefix={program.id}
        price={Number(price) || 0}
        defaultDaysPerWeek={program.daysPerWeek}
        defaultOptions={program.dayOptions}
      />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={secondaryButton}>
          {pending ? t("Saving…") : t("Save")}
        </button>
        {fetcher.state === "idle" && fetcher.data?.message ? (
          <span className="text-sm text-emerald-700">{t(fetcher.data.message)}</span>
        ) : null}
      </div>
    </fetcher.Form>
  );
}
