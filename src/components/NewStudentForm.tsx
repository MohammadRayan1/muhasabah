"use client";

import { useActionState, useMemo, useState } from "react";
import { createStudent } from "@/lib/actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { calculateProration, parseDateOnly, toDateInputValue } from "@/lib/dates";
import { initialActionState } from "@/lib/action-state";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import FormError from "@/components/FormError";
import type { Program } from "@/generated/prisma/client";

export default function NewStudentForm({
  programs,
  billingDay,
}: {
  programs: Program[];
  billingDay: number;
}) {
  const [state, formAction, pending] = useActionState(createStudent, initialActionState);
  const onSubmit = useSubmitGuard(pending);
  const [selectedProgramIds, setSelectedProgramIds] = useState<Set<string>>(new Set());
  const [tuitionAmount, setTuitionAmount] = useState("");
  const [firstMonthPaid, setFirstMonthPaid] = useState(false);
  const [joinedAt, setJoinedAt] = useState(() => toDateInputValue(new Date()));

  const monthlyAmount = parseFloat(tuitionAmount) || 0;
  const proration = useMemo(
    () => calculateProration(monthlyAmount, parseDateOnly(joinedAt || toDateInputValue(new Date())), billingDay),
    [billingDay, monthlyAmount, joinedAt],
  );
  const { nextDueDate, isProrated } = proration;

  function handleProgramToggle(program: Program, checked: boolean) {
    const nextSelected = new Set(selectedProgramIds);
    if (checked) {
      nextSelected.add(program.id);
    } else {
      nextSelected.delete(program.id);
    }
    setSelectedProgramIds(nextSelected);

    const sum = programs
      .filter((p) => nextSelected.has(p.id))
      .reduce((total, p) => total + p.price, 0);
    setTuitionAmount(sum > 0 ? String(sum) : "");
  }

  const programTotal = programs
    .filter((p) => selectedProgramIds.has(p.id))
    .reduce((total, p) => total + p.price, 0);
  const parsedTuition = parseFloat(tuitionAmount) || 0;
  const isCustomPrice = programTotal > 0 && parsedTuition !== programTotal;

  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-4">
      <FormError message={state.error} />

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-stone-700">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-stone-700">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-stone-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {programs.length > 0 ? (
        <div>
          <span className="block text-sm font-medium text-stone-700">Programs</span>
          <div className="mt-1 space-y-2">
            {programs.map((program) => (
              <label
                key={program.id}
                className="flex items-start gap-2 rounded-xl border border-stone-200 p-3"
              >
                <input
                  type="checkbox"
                  name="programIds"
                  value={program.id}
                  checked={selectedProgramIds.has(program.id)}
                  onChange={(e) => handleProgramToggle(program, e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-sm text-stone-700">
                  <span className="font-medium text-stone-900">{program.name}</span>
                  <span className="block text-xs text-stone-500">
                    {program.days} · {program.time} · {program.location} ·{" "}
                    {formatCurrency(program.price)}/mo
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <label htmlFor="tuitionAmount" className="block text-sm font-medium text-stone-700">
          Tuition amount ($/month)
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
          className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
        />
        {programs.length > 0 ? (
          <p className="mt-1 text-xs text-stone-500">
            Auto-filled from selected programs — edit if this student gets a different rate.
          </p>
        ) : null}
      </div>

      {isCustomPrice && (
        <div>
          <label htmlFor="priceNote" className="block text-sm font-medium text-stone-700">
            Reason for custom price
          </label>
          <input
            id="priceNote"
            name="priceNote"
            type="text"
            placeholder="e.g. financial aid, sibling discount"
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
      )}

      <div>
        <label htmlFor="joinedAt" className="block text-sm font-medium text-stone-700">
          Date joined
        </label>
        <input
          id="joinedAt"
          name="joinedAt"
          type="date"
          required
          value={joinedAt}
          onChange={(e) => setJoinedAt(e.target.value)}
          className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-stone-500">
          Students are billed on day {billingDay} of each month. Pick the day they started and the
          first bill is worked out for you.
        </p>
      </div>

      <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-600">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-medium text-stone-900">First bill</span>
          <span className="text-lg font-semibold text-stone-900">
            {monthlyAmount > 0 ? formatCurrency(proration.amount) : "—"}
          </span>
        </div>
        <p className="mt-1">
          Due {formatDate(nextDueDate)}, then {monthlyAmount > 0 ? formatCurrency(monthlyAmount) : "the full amount"}{" "}
          on day {billingDay} of every month after.
        </p>
        {monthlyAmount > 0 && isProrated ? (
          <dl className="mt-3 space-y-1 border-t border-stone-200 pt-3 text-xs">
            <div className="flex justify-between gap-3">
              <dt>Billing cycle</dt>
              <dd>
                {formatDate(proration.cycleStart)} → {formatDate(nextDueDate)} ({proration.cycleDays} days)
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Days covered (joined → next due)</dt>
              <dd>{proration.daysCovered} days</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Daily rate</dt>
              <dd>
                {formatCurrency(monthlyAmount)} ÷ {proration.cycleDays} = {formatCurrency(proration.dailyRate)}
              </dd>
            </div>
            <div className="flex justify-between gap-3 font-medium text-amber-700">
              <dt>Prorated first bill</dt>
              <dd>
                {formatCurrency(proration.dailyRate)} × {proration.daysCovered} ≈ {formatCurrency(proration.amount)}
              </dd>
            </div>
          </dl>
        ) : monthlyAmount > 0 ? (
          <p className="mt-1 text-xs text-stone-500">Joining on the billing day — no proration, full month.</p>
        ) : (
          <p className="mt-1 text-xs text-stone-500">Enter a tuition amount to see the first bill.</p>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
        <input
          id="firstMonthPaid"
          name="firstMonthPaid"
          type="checkbox"
          checked={firstMonthPaid}
          onChange={(e) => setFirstMonthPaid(e.target.checked)}
          className="mt-0.5"
        />
        <label htmlFor="firstMonthPaid" className="text-sm text-stone-700">
          First payment was made today
          <span className="block text-xs text-stone-500">
            Records {isProrated ? "the prorated amount" : "today's payment"} now and advances the
            due date to the next cycle.
          </span>
        </label>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-stone-700">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add Student"}
      </button>
    </form>
  );
}
