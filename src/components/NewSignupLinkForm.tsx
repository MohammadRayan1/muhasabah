import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { formatCurrency } from "@/lib/format";
import type { ActionState } from "@/lib/action-state";
import FormError from "@/components/FormError";
import { card, input, label, primaryButton } from "@/components/ui";

type Program = { id: string; name: string; days: string; time: string; price: number };

/** Teacher picks the program(s) and price; the price fills in from the programs and can be changed. */
export default function NewSignupLinkForm({ programs }: { programs: Program[] }) {
  const fetcher = useFetcher<ActionState>();
  const formRef = useRef<HTMLFormElement>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [price, setPrice] = useState("");
  const pending = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) formRef.current?.reset();
  }, [fetcher.state, fetcher.data]);

  function toggle(program: Program, on: boolean) {
    const next = new Set(selected);
    if (on) next.add(program.id);
    else next.delete(program.id);
    setSelected(next);
    const sum = programs.filter((p) => next.has(p.id)).reduce((total, p) => total + p.price, 0);
    setPrice(sum > 0 ? String(sum) : "");
  }

  if (programs.length === 0) {
    return <p className={`${card} text-sm text-stone-500`}>Add a program first, then you can make sign-up links for it.</p>;
  }

  return (
    <fetcher.Form
      ref={formRef}
      method="post"
      className={`${card} space-y-4`}
      onReset={() => {
        setSelected(new Set());
        setPrice("");
      }}
    >
      <input type="hidden" name="intent" value="createLink" />
      <FormError message={fetcher.data?.error} />

      <div>
        <label htmlFor="label" className={label}>
          Who is it for? <span className="font-normal text-stone-500">(only you see this)</span>
        </label>
        <input id="label" name="label" placeholder="Khan family" className={input} />
      </div>

      <fieldset>
        <legend className={label}>Program</legend>
        <div className="mt-1 space-y-2">
          {programs.map((p) => (
            <label key={p.id} className="flex items-start gap-2 rounded-xl border border-stone-200 p-3">
              <input
                type="checkbox"
                name="programIds"
                value={p.id}
                checked={selected.has(p.id)}
                onChange={(e) => toggle(p, e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-sm">
                <span className="font-medium text-stone-900">{p.name}</span>
                <span className="block text-xs text-stone-500">
                  {p.days} · {p.time} · {formatCurrency(p.price)}/mo
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="link-price" className={label}>
          Price per child ($/month)
        </label>
        <input
          id="link-price"
          name="price"
          type="number"
          step="0.01"
          min="0.01"
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className={input}
        />
        <p className="mt-1 text-xs text-stone-500">Filled in from the program. Change it for a discount. The parent can&apos;t edit it.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Making link…" : "Make sign-up link"}
        </button>
        {fetcher.state === "idle" && fetcher.data?.message ? (
          <span className="text-sm text-emerald-700">{fetcher.data.message}</span>
        ) : null}
      </div>
    </fetcher.Form>
  );
}
