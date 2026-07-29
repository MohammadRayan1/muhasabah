"use client";

import { useActionState } from "react";
import { createInvite } from "@/lib/actions";
import { initialActionState } from "@/lib/action-state";
import FormError from "@/components/FormError";

export default function SendInviteForm({
  studentId,
  defaultEmail,
}: {
  studentId: string;
  defaultEmail: string;
}) {
  const [state, formAction, pending] = useActionState(createInvite, initialActionState);

  return (
    <form action={formAction} className="space-y-2">
      <FormError message={state.error} />
      <div className="flex items-center gap-2">
        <input type="hidden" name="studentId" value={studentId} />
        <input
          type="email"
          name="email"
          placeholder="parent@example.com"
          defaultValue={defaultEmail}
          required
          className="min-h-11 flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send Invite"}
        </button>
      </div>
    </form>
  );
}
