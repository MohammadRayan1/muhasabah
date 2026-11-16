import { useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import type { ActionState } from "@/lib/action-state";
import FormError from "@/components/FormError";
import { card, input, label, primaryButton } from "@/components/ui";

/** One link per family. The parent picks the program and days; prices come from Programs. */
export default function NewSignupLinkForm({ hasPrograms }: { hasPrograms: boolean }) {
  const fetcher = useFetcher<ActionState>();
  const formRef = useRef<HTMLFormElement>(null);
  const pending = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) formRef.current?.reset();
  }, [fetcher.state, fetcher.data]);

  if (!hasPrograms) {
    return <p className={`${card} text-sm text-stone-500`}>Add a program first, then you can make sign-up links.</p>;
  }

  return (
    <fetcher.Form ref={formRef} method="post" className={`${card} space-y-4`}>
      <input type="hidden" name="intent" value="createLink" />
      <FormError message={fetcher.data?.error} />

      <div>
        <label htmlFor="label" className={label}>
          Who is it for? <span className="font-normal text-stone-500">(only you see this)</span>
        </label>
        <input id="label" name="label" placeholder="Khan family" className={input} />
        <p className="mt-1 text-xs text-stone-500">
          They&apos;ll choose a program and how many days a week for each child. Prices come from your Programs page.
        </p>
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
