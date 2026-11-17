import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import type { ActionState } from "@/lib/action-state";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import FormError from "@/components/FormError";
import DayOptionsFields from "@/components/DayOptionsFields";
import { input, label, primaryButton } from "@/components/ui";
import { useT } from "@/lib/useT";

export default function NewProgramForm({ onCreated }: { onCreated?: () => void }) {
  const t = useT();
  const fetcher = useFetcher<ActionState>();
  const pending = fetcher.state !== "idle";
  const onSubmit = useSubmitGuard(pending);
  const formRef = useRef<HTMLFormElement>(null);
  const [price, setPrice] = useState("");
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      formRef.current?.reset();
      onCreated?.();
    }
    // onCreated is a fresh closure each render; only a new result should trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <label htmlFor="name" className={label}>
          {t("Name")}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder={t("Weekday Program")}
          required
          className={input}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="days" className={label}>
            {t("Days")}
          </label>
          <input
            id="days"
            name="days"
            type="text"
            placeholder={t("Mon–Thu")}
            required
            className={input}
          />
        </div>
        <div>
          <label htmlFor="time" className={label}>
            {t("Time")}
          </label>
          <input
            id="time"
            name="time"
            type="text"
            placeholder="5:30–7:30 PM"
            dir="ltr"
            required
            className={input}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="location" className={label}>
            {t("Location")}
          </label>
          <input
            id="location"
            name="location"
            type="text"
            required
            className={input}
          />
        </div>
        <div>
          <label htmlFor="price" className={label}>
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
            className={input}
          />
        </div>
      </div>

      <DayOptionsFields key={resetKey} idPrefix="new" price={Number(price) || 0} />

      <button
        type="submit"
        disabled={pending}
        className={`${primaryButton} w-full`}
      >
        {pending ? t("Adding…") : t("Add program")}
      </button>
    </fetcher.Form>
  );
}
