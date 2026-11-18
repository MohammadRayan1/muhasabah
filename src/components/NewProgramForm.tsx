import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import type { ActionState } from "@/lib/action-state";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import FormError from "@/components/FormError";
import ProgramFields from "@/components/ProgramFields";
import { primaryButton } from "@/components/ui";
import { useT } from "@/lib/useT";

export default function NewProgramForm({ onCreated, locations = [] }: { onCreated?: () => void; locations?: string[] }) {
  const t = useT();
  const fetcher = useFetcher<ActionState>();
  const pending = fetcher.state !== "idle";
  const onSubmit = useSubmitGuard(pending);
  // A fresh set of fields after each program is added (state adjusted during render).
  const [round, setRound] = useState(0);
  const [seen, setSeen] = useState<ActionState | undefined>(undefined);
  const created = fetcher.state === "idle" && fetcher.data?.ok && fetcher.data !== seen;
  if (created) {
    setSeen(fetcher.data);
    setRound((r) => r + 1);
  }

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) onCreated?.();
    // onCreated is a fresh closure each render; only a new result should trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, fetcher.data]);

  return (
    <fetcher.Form method="post" onSubmit={onSubmit} className="space-y-6">
      <input type="hidden" name="intent" value="createProgram" />
      <FormError message={fetcher.data?.error} />
      <ProgramFields key={round} idPrefix={`new-${round}`} locations={locations} />
      <button type="submit" disabled={pending} className={`${primaryButton} w-full`}>
        {pending ? t("Adding…") : t("Add program")}
      </button>
    </fetcher.Form>
  );
}
