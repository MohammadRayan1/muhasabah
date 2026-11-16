import { Link, useFetcher } from "react-router";
import { getPaymentStatus, type PaymentStatus } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/format";
import Avatar from "@/components/Avatar";
import type { Student, Program } from "@/generated/prisma/client";

const DUE_TEXT: Record<PaymentStatus, string> = {
  overdue: "text-red-700",
  due_soon: "text-amber-700",
  ok: "text-stone-600",
};

function dueDateLabel(daysUntilDue: number, status: PaymentStatus) {
  if (status === "overdue") {
    const days = Math.abs(daysUntilDue);
    return `${days} day${days === 1 ? "" : "s"} overdue`;
  }
  if (daysUntilDue === 0) return "Due today";
  if (daysUntilDue === 1) return "Due tomorrow";
  return `Due in ${daysUntilDue} days`;
}

type StudentWithPrograms = Student & { enrollments: { program: Program }[] };

export default function StudentRow({ student }: { student: StudentWithPrograms }) {
  const { status, daysUntilDue } = getPaymentStatus(student.nextDueDate);
  const programs = student.enrollments.map((e) => e.program.name).join(", ");
  const amountDue = student.firstPaymentAmount ?? student.tuitionAmount;
  const payFetcher = useFetcher();
  const removeFetcher = useFetcher();
  const paying = payFetcher.state !== "idle";

  return (
    <li className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-4 sm:px-5">
      <Link to={`/students/${student.id}`} className="group flex min-w-0 flex-1 basis-56 items-center gap-3">
        <Avatar name={student.name} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-stone-900 underline-offset-4 group-hover:underline">
            {student.name}
          </p>
          <p className="truncate text-sm text-stone-500">
            {programs || "No programs"} · {formatCurrency(student.tuitionAmount)}/mo
          </p>
        </div>
      </Link>

      <div className="w-36 shrink-0">
        <p className={`text-sm font-semibold ${DUE_TEXT[status]}`}>{dueDateLabel(daysUntilDue, status)}</p>
        <p className="text-xs text-stone-500">
          {formatDate(student.nextDueDate)}
          {student.firstPaymentAmount != null ? " · first bill" : ""}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <payFetcher.Form method="post" action="/?index" className="flex items-center gap-2">
          <input type="hidden" name="intent" value="recordPayment" />
          <input type="hidden" name="studentId" value={student.id} />
          <label className="relative">
            <span className="sr-only">Amount paid by {student.name}</span>
            <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-stone-500">
              $
            </span>
            <input
              type="number"
              name="amount"
              step="0.01"
              min="0.01"
              defaultValue={amountDue}
              required
              className="h-10 w-24 rounded-xl border border-stone-300 bg-white pr-2 pl-6 text-sm text-stone-900 tabular-nums outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/15"
            />
          </label>
          <button
            type="submit"
            disabled={paying}
            className="h-10 rounded-xl bg-emerald-600 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
          >
            {paying ? "Saving…" : "Mark paid"}
          </button>
        </payFetcher.Form>
        <removeFetcher.Form method="post" action="/?index">
          <input type="hidden" name="intent" value="removeStudent" />
          <input type="hidden" name="studentId" value={student.id} />
          <input type="hidden" name="active" value="false" />
          <button
            type="submit"
            className="text-xs text-stone-500 underline-offset-4 transition-colors hover:text-red-700 hover:underline"
          >
            Remove
          </button>
        </removeFetcher.Form>
      </div>
    </li>
  );
}
