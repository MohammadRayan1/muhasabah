import { useMemo, useState } from "react";
import { Form, useActionData, useNavigation } from "react-router";
import { formatCurrency, formatDate } from "@/lib/format";
import { calculateFirstBill, parseDateOnly, toDateInputValue } from "@/lib/dates";
import type { ActionState } from "@/lib/action-state";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import FormError from "@/components/FormError";
import JoinDateCalendar from "@/components/JoinDateCalendar";
import type { Program } from "@/generated/prisma/client";

const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const monthName = new Intl.DateTimeFormat("en-US", { month: "long" });

export default function NewStudentForm({
  programs,
  families,
}: {
  programs: Program[];
  families: { id: string; name: string }[];
}) {
  const actionData = useActionData<ActionState>();
  const pending = useNavigation().state !== "idle";
  const onSubmit = useSubmitGuard(pending);
  const [selectedProgramIds, setSelectedProgramIds] = useState<Set<string>>(new Set());
  const [tuitionAmount, setTuitionAmount] = useState("");
  const [firstMonthPaid, setFirstMonthPaid] = useState(false);
  const [joinedAt, setJoinedAt] = useState(() => toDateInputValue(new Date()));
  const [familyChoice, setFamilyChoice] = useState("");

  const monthlyAmount = parseFloat(tuitionAmount) || 0;
  const bill = useMemo(
    () => calculateFirstBill(monthlyAmount, parseDateOnly(joinedAt)),
    [monthlyAmount, joinedAt],
  );
  const monthEnd = new Date(bill.joinDate.getFullYear(), bill.joinDate.getMonth() + 1, 0);

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
    <Form method="post" onSubmit={onSubmit} className="space-y-4">
      <FormError message={actionData?.error} />

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

      <div>
        <label htmlFor="familyId" className="block text-sm font-medium text-stone-700">
          Family
        </label>
        <select
          id="familyId"
          name="familyId"
          value={familyChoice}
          onChange={(e) => setFamilyChoice(e.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm"
        >
          <option value="">No family (or add later)</option>
          <option value="new">New family…</option>
          {families.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-stone-500">Siblings in one family share a parent contact and portal.</p>
        {familyChoice === "new" ? (
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="newFamilyName" className="block text-sm font-medium text-stone-700">
                Family name
              </label>
              <input
                id="newFamilyName"
                name="newFamilyName"
                required
                placeholder="Khan family"
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="guardianName" className="block text-sm font-medium text-stone-700">
                Parent or guardian
              </label>
              <input
                id="guardianName"
                name="guardianName"
                placeholder="Sister Fatima"
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
            <p className="col-span-2 text-xs text-stone-500">The phone and email above are saved as the family&apos;s contact.</p>
          </div>
        ) : null}
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
        <span id="joinedAt-label" className="block text-sm font-medium text-stone-700">
          Day they joined
        </span>
        <p className="mb-2 text-xs text-stone-500">
          Everyone pays on the 1st. If they start mid-month, the rest of that month is added to
          their first bill.
        </p>
        <JoinDateCalendar name="joinedAt" value={joinedAt} onChange={setJoinedAt} />
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-semibold text-stone-900">
            First bill · due {formatDate(bill.dueDate)}
          </span>
          <span className="text-xl font-bold tabular-nums text-stone-900">
            {monthlyAmount > 0 ? formatCurrency(bill.total) : "—"}
          </span>
        </div>

        {monthlyAmount <= 0 ? (
          <p className="mt-1 text-xs text-stone-500">Enter a tuition amount to see the first bill.</p>
        ) : bill.hasLeftover ? (
          <>
            <dl className="mt-3 space-y-1.5 border-t border-stone-200 pt-3 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt>
                  Rest of {monthName.format(bill.joinDate)}{" "}
                  <span className="text-stone-500">
                    ({shortDate.format(bill.joinDate)} – {shortDate.format(monthEnd)}, {bill.leftoverDays} of{" "}
                    {bill.monthDays} days × {formatCurrency(bill.dailyRate)})
                  </span>
                </dt>
                <dd className="tabular-nums">{formatCurrency(bill.leftoverAmount)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>{monthName.format(bill.dueDate)} tuition</dt>
                <dd className="tabular-nums">{formatCurrency(monthlyAmount)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-stone-200 pt-1.5 font-semibold text-stone-900">
                <dt>Due {formatDate(bill.dueDate)}</dt>
                <dd className="tabular-nums">{formatCurrency(bill.total)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-stone-500">
              Then {formatCurrency(monthlyAmount)} on the 1st of every month.
            </p>
          </>
        ) : (
          <p className="mt-1 text-xs text-stone-500">
            Joining on the 1st, so it&apos;s a regular month. Then {formatCurrency(monthlyAmount)} on the
            1st of every month.
          </p>
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
            Records the first bill ({monthlyAmount > 0 ? formatCurrency(bill.total) : "—"}) as paid
            and moves their next due date to the following 1st.
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
    </Form>
  );
}
