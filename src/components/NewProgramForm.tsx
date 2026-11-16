import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import type { ActionState } from "@/lib/action-state";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import FormError from "@/components/FormError";
import DayOptionsFields from "@/components/DayOptionsFields";
import { useT } from "@/lib/useT";

export default function NewProgramForm() {
  const t = useT();
  const fetcher = useFetcher<ActionState>();
  const pending = fetcher.state !== "idle";
  const onSubmit = useSubmitGuard(pending);
  const formRef = useRef<HTMLFormElement>(null);
  const [price, setPrice] = useState("");
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) formRef.current?.reset();
  }, [fetcher.state, fetcher.data]);

  return (
    <fetcher.Form ref={formRef} method="post" onSubmit={onSubmit}
      onReset={() => {
        setPrice("");
        setResetKey((k) => k + 1);
      }}
      className="space-y-4"
    >
      <input type="hidden" name="intent" value="createProgram" />
      <FormError message={fetcher.data?.error} />

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-stone-700">
          {t("Name")}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder={t("Weekday Program")}
          required
          className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="days" className="block text-sm font-medium text-stone-700">
            {t("Days")}
          </label>
          <input
            id="days"
            name="days"
            type="text"
            placeholder={t("Mon–Thu")}
            required
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="time" className="block text-sm font-medium text-stone-700">
            {t("Time")}
          </label>
          <input
            id="time"
            name="time"
            type="text"
            placeholder="5:30–7:30 PM"
            dir="ltr"
            required
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-stone-700">
            {t("Location")}
          </label>
          <input
            id="location"
            name="location"
            type="text"
            required
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-stone-700">
            {t("Price for all days ($/month)")}
          </label>
          <input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <DayOptionsFields key={resetKey} idPrefix="new" price={Number(price) || 0} />

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? t("Adding…") : t("Add program")}
      </button>
    </fetcher.Form>
  );
}
