import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import type { ActionState } from "@/lib/action-state";
import FormError from "@/components/FormError";
import DayOptionsFields from "@/components/DayOptionsFields";
import { input, label, primaryButton } from "@/components/ui";
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
export default function ProgramEditForm({ program, onDone }: { program: Program; onDone?: () => void }) {
  const t = useT();
  const fetcher = useFetcher<ActionState>();
  const [price, setPrice] = useState(String(program.price));
  const pending = fetcher.state !== "idle";
  const id = (field: string) => `${program.id}-${field}`;
  const handled = useRef<ActionState | undefined>(undefined);

  // Close once per successful save.
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok && handled.current !== fetcher.data) {
      handled.current = fetcher.data;
      onDone?.();
    }
  });

  return (
    <fetcher.Form method="post" className="space-y-4 border-t border-stone-100 pt-4">
      <input type="hidden" name="intent" value="updateProgram" />
      <input type="hidden" name="programId" value={program.id} />
      <FormError message={fetcher.data?.error} />

      <div>
        <label htmlFor={id("name")} className={label}>
          {t("Name")}
        </label>
        <input id={id("name")} name="name" defaultValue={program.name} required className={input} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={id("days")} className={label}>
            {t("Days")}
          </label>
          <input id={id("days")} name="days" defaultValue={program.days} required className={input} />
        </div>
        <div>
          <label htmlFor={id("time")} className={label}>
            {t("Time")}
          </label>
          <input id={id("time")} name="time" defaultValue={program.time} dir="ltr" required className={input} />
        </div>
        <div>
          <label htmlFor={id("location")} className={label}>
            {t("Location")}
          </label>
          <input id={id("location")} name="location" defaultValue={program.location} required className={input} />
        </div>
        <div>
          <label htmlFor={id("price")} className={label}>
            {t("Price for all days ($/month)")}
          </label>
          <input
            id={id("price")}
            name="price"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={`${input} tabular-nums`}
          />
        </div>
      </div>

      <DayOptionsFields
        idPrefix={program.id}
        price={Number(price) || 0}
        defaultDaysPerWeek={program.daysPerWeek}
        defaultOptions={program.dayOptions}
      />

      <p className="text-xs leading-relaxed text-stone-500">
        {t("Price changes apply to new registrations. Students already enrolled keep their current tuition.")}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? t("Saving…") : t("Save changes")}
        </button>
        {onDone ? (
          <button type="button" onClick={onDone} className="text-sm font-semibold text-stone-500 hover:underline">
            {t("Cancel")}
          </button>
        ) : null}
        {fetcher.state === "idle" && fetcher.data?.message ? (
          <span className="text-sm font-medium text-emerald-700">{t(fetcher.data.message)}</span>
        ) : null}
      </div>
    </fetcher.Form>
  );
}
