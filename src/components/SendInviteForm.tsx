import { useFetcher } from "react-router";
import type { ActionState } from "@/lib/action-state";
import FormError from "@/components/FormError";
import { useT } from "@/lib/useT";

export default function SendInviteForm({
  studentId,
  defaultEmail,
}: {
  studentId: string;
  defaultEmail: string;
}) {
  const t = useT();
  const fetcher = useFetcher<ActionState>();
  const pending = fetcher.state !== "idle";

  return (
    <fetcher.Form method="post" className="space-y-2">
      <input type="hidden" name="intent" value="invite" />
      <FormError message={fetcher.data?.error} />
      <div className="flex items-center gap-2">
        <input type="hidden" name="studentId" value={studentId} />
        <input
          type="email"
          name="email"
          placeholder="parent@example.com"
          dir="ltr"
          defaultValue={defaultEmail}
          required
          className="min-h-11 flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? t("Sending…") : t("Send invite")}
        </button>
      </div>
    </fetcher.Form>
  );
}
