import { getPaymentStatus } from "@/lib/status";
import { recordPayment, setStudentActive } from "@/lib/actions";
import type { Student } from "@/generated/prisma/client";

const STATUS_STYLES = {
  overdue: "bg-red-50 border-red-200 text-red-700",
  due_soon: "bg-amber-50 border-amber-200 text-amber-700",
  ok: "bg-emerald-50 border-emerald-200 text-emerald-700",
} as const;

const STATUS_LABEL = {
  overdue: "Overdue",
  due_soon: "Due soon",
  ok: "On track",
} as const;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function dueDateLabel(daysUntilDue: number, status: keyof typeof STATUS_LABEL) {
  if (status === "overdue") {
    const days = Math.abs(daysUntilDue);
    return `${days} day${days === 1 ? "" : "s"} overdue`;
  }
  if (daysUntilDue === 0) return "Due today";
  return `Due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`;
}

export default function StudentRow({ student }: { student: Student }) {
  const { status, daysUntilDue } = getPaymentStatus(student.nextDueDate);

  return (
    <div className={`rounded-lg border p-4 ${STATUS_STYLES[status]}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">{student.name}</h3>
            <span className="rounded-full border px-2 py-0.5 text-xs font-medium">
              {STATUS_LABEL[status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            {formatCurrency(student.tuitionAmount)} / month
            {student.phone ? ` · ${student.phone}` : ""}
            {student.email ? ` · ${student.email}` : ""}
          </p>
          <p className="mt-1 text-sm">
            Next due {formatDate(student.nextDueDate)} — {dueDateLabel(daysUntilDue, status)}
          </p>
          {student.notes ? <p className="mt-1 text-sm text-gray-500">{student.notes}</p> : null}
        </div>

        <div className="flex flex-col items-end gap-2">
          <form action={recordPayment} className="flex items-center gap-2">
            <input type="hidden" name="studentId" value={student.id} />
            <input
              type="number"
              name="amount"
              step="0.01"
              min="0.01"
              defaultValue={student.tuitionAmount}
              required
              className="w-24 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900"
            />
            <button
              type="submit"
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Mark paid
            </button>
          </form>
          <form action={setStudentActive}>
            <input type="hidden" name="studentId" value={student.id} />
            <input type="hidden" name="active" value="false" />
            <button type="submit" className="text-xs text-gray-400 hover:text-gray-600 hover:underline">
              Remove student
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
