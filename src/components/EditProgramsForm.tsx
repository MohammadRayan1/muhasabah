import { useState } from "react";
import { useFetcher } from "react-router";
import type { ActionState } from "@/lib/action-state";
import { formatCurrency } from "@/lib/format";
import FormError from "@/components/FormError";
import type { Program } from "@/generated/prisma/client";
import { useT } from "@/lib/useT";

export default function EditProgramsForm({
  studentId,
  tuitionAmount: initialTuitionAmount,
  programs,
  enrolledProgramIds,
}: {
  studentId: string;
  tuitionAmount: number;
  programs: Program[];
  enrolledProgramIds: string[];
}) {
  const t = useT();
  const fetcher = useFetcher<ActionState>();
  const pending = fetcher.state !== "idle";
  const [selected, setSelected] = useState<Set<string>>(new Set(enrolledProgramIds));
  const [tuitionAmount, setTuitionAmount] = useState(String(initialTuitionAmount));

  function toggle(program: Program, checked: boolean) {
    const next = new Set(selected);
    const current = parseFloat(tuitionAmount) || 0;
    if (checked) {
      next.add(program.id);
      setTuitionAmount(String(current + program.price));
    } else {
      next.delete(program.id);
      setTuitionAmount(String(Math.max(0, current - program.price)));
    }
    setSelected(next);
  }

  if (programs.length === 0) {
    return <p className="text-sm text-stone-500">{t("No active programs to enroll in yet.")}</p>;
  }

  return (
    <fetcher.Form method="post" className="space-y-3">
      <input type="hidden" name="intent" value="updatePrograms" />
      <input type="hidden" name="studentId" value={studentId} />
      <FormError message={fetcher.data?.error} />

      <div className="space-y-2">
        {programs.map((program) => (
          <label
            key={program.id}
            className="flex items-start gap-2 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm shadow-stone-900/5"
          >
            <input
              type="checkbox"
              name="programIds"
              value={program.id}
              checked={selected.has(program.id)}
              onChange={(e) => toggle(program, e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-sm text-stone-700">
              <span className="font-medium text-stone-900">{program.name}</span>
              <span className="block text-xs text-stone-500">
                {program.days} · {program.time} · {program.location} ·{" "}
                {t("{amount}/month", { amount: formatCurrency(program.price) })}
              </span>
            </span>
          </label>
        ))}
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="tuitionAmount" className="block text-sm font-medium text-stone-700">
            {t("Tuition amount ($/month)")}
          </label>
          <input
            id="tuitionAmount"
            name="tuitionAmount"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={tuitionAmount}
            onChange={(e) => setTuitionAmount(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? t("Saving…") : t("Save")}
        </button>
      </div>
      <p className="text-xs text-stone-500">
        {t("Checking or unchecking a program adjusts the amount above by that program's price. The next due date doesn't change.")}
      </p>
    </fetcher.Form>
  );
}
