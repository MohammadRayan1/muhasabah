import { useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import type { ActionState } from "@/lib/action-state";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import FormError from "@/components/FormError";

export default function NewProgramForm() {
  const fetcher = useFetcher<ActionState>();
  const pending = fetcher.state !== "idle";
  const onSubmit = useSubmitGuard(pending);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) formRef.current?.reset();
  }, [fetcher.state, fetcher.data]);

  return (
    <fetcher.Form ref={formRef} method="post" onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="intent" value="createProgram" />
      <FormError message={fetcher.data?.error} />

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-stone-700">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="Weekend Program"
          required
          className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="days" className="block text-sm font-medium text-stone-700">
            Days
          </label>
          <input
            id="days"
            name="days"
            type="text"
            placeholder="Sat & Sun"
            required
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="time" className="block text-sm font-medium text-stone-700">
            Time
          </label>
          <input
            id="time"
            name="time"
            type="text"
            placeholder="10:00 AM – 12:00 PM"
            required
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-stone-700">
            Location
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
            Price ($/month)
          </label>
          <input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0.01"
            required
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add Program"}
      </button>
    </fetcher.Form>
  );
}
