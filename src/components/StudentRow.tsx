import Link from "next/link";
import { getPaymentStatus, STATUS_BADGE_STYLES, STATUS_LABEL } from "@/lib/status";
import { recordPayment, setStudentActive } from "@/lib/actions";
import { formatCurrency, formatDate } from "@/lib/format";
import Avatar from "@/components/Avatar";
import type { Student, Program } from "@/generated/prisma/client";

function dueDateLabel(daysUntilDue: number, status: keyof typeof STATUS_LABEL) {
  if (status === "overdue") {
    const days = Math.abs(daysUntilDue);
    return `${days} day${days === 1 ? "" : "s"} overdue`;
  }
  if (daysUntilDue === 0) return "Due today";
  return `Due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`;
}

type StudentWithPrograms = Student & { enrollments: { program: Program }[] };

export default function StudentRow({ student }: { student: StudentWithPrograms }) {
  const { status, daysUntilDue } = getPaymentStatus(student.nextDueDate);

  return (
    <div className={`rounded-2xl border p-4 shadow-sm shadow-stone-900/5 ${STATUS_BADGE_STYLES[status]}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Link href={`/students/${student.id}`} className="flex min-w-0 flex-1 gap-3 hover:opacity-80">
          <Avatar name={student.name} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-stone-900">{student.name}</h3>
              <span className="rounded-full border px-2 py-0.5 text-xs font-medium">
                {STATUS_LABEL[status]}
              </span>
            </div>
            <p className="mt-1 text-sm text-stone-600">
              {formatCurrency(student.tuitionAmount)} / month
              {student.phone ? ` · ${student.phone}` : ""}
              {student.email ? ` · ${student.email}` : ""}
              {student.priceNote ? ` · ${student.priceNote}` : ""}
            </p>
            <p className="mt-1 text-sm">
              Next due {formatDate(student.nextDueDate)} — {dueDateLabel(daysUntilDue, status)}
            </p>
            {student.enrollments.length > 0 ? (
              <p className="mt-1 text-xs text-stone-500">
                {student.enrollments.map((e) => e.program.name).join(", ")}
              </p>
            ) : null}
            {student.notes ? <p className="mt-1 text-sm text-stone-500">{student.notes}</p> : null}
          </div>
        </Link>

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
              className="min-h-11 w-24 rounded-xl border border-stone-300 bg-white px-2 py-1 text-sm text-stone-900"
            />
            <button
              type="submit"
              className="min-h-11 rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Mark paid
            </button>
          </form>
          <form action={setStudentActive}>
            <input type="hidden" name="studentId" value={student.id} />
            <input type="hidden" name="active" value="false" />
            <button type="submit" className="text-xs text-stone-400 hover:text-stone-600 hover:underline">
              Remove student
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
