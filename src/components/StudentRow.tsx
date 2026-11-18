import { Link } from "react-router";
import { AlertCircle, CalendarCheck2, CalendarDays, Clock } from "lucide-react";
import ConfirmButton from "@/components/ConfirmButton";
import { getPaymentStatus, type PaymentStatus } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/format";
import RemindMenu from "@/components/RemindMenu";
import RecordPaymentDialog, { type PendingProof } from "@/components/RecordPaymentDialog";
import type { Student, Program } from "@/generated/prisma/client";
import { daysLabel } from "@/lib/pricing";
import { useT } from "@/lib/useT";

const STATUS_PILL: Record<PaymentStatus, { dot: string; pill: string; icon: typeof Clock }> = {
  overdue: { dot: "bg-red-500", pill: "border-red-200 bg-red-50 text-red-700", icon: AlertCircle },
  due_soon: { dot: "bg-amber-500", pill: "border-amber-200 bg-amber-50 text-amber-700", icon: Clock },
  ok: { dot: "bg-emerald-500", pill: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: CalendarCheck2 },
};

export function dueDateLabel(daysUntilDue: number, status: PaymentStatus) {
  if (status === "overdue") {
    const days = Math.abs(daysUntilDue);
    return days === 1 ? "1 day overdue" : `${days} days overdue`;
  }
  if (daysUntilDue === 0) return "Due today";
  if (daysUntilDue === 1) return "Due tomorrow";
  return `Due in ${daysUntilDue} days`;
}

type StudentWithPrograms = Student & {
  enrollments: { daysPerWeek: number | null; program: Program }[];
  family?: { phone: string | null; email: string | null; guardianName: string | null } | null;
};

export default function StudentRow({
  student,
  canEmail = false,
  proofs = [],
}: {
  student: StudentWithPrograms;
  canEmail?: boolean;
  proofs?: PendingProof[];
}) {
  const t = useT();
  const { status, daysUntilDue } = getPaymentStatus(student.nextDueDate);
  const programs = student.enrollments
    .map((e) => (e.daysPerWeek ? `${e.program.name} (${t(daysLabel(e.daysPerWeek))})` : e.program.name))
    .join(", ");
  const amountDue = student.firstPaymentAmount ?? student.tuitionAmount;
  const look = STATUS_PILL[status];
  const StatusIcon = look.icon;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2.5 px-5 py-3.5 transition-colors hover:bg-stone-50/70">
      <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${look.dot}`} />
      <Link to={`/students/${student.id}`} className="group min-w-0 flex-1 basis-48">
        <p className="truncate text-base font-semibold text-stone-900 underline-offset-4 group-hover:underline">{student.name}</p>
        <p className="truncate text-sm text-stone-600">
          {programs || t("No programs")} · {t("{amount}/month", { amount: formatCurrency(student.tuitionAmount) })}
        </p>
      </Link>

      <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
        <span className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 ${look.pill}`}>
          <StatusIcon aria-hidden className="h-3.5 w-3.5" />
          {t(dueDateLabel(daysUntilDue, status))}
        </span>
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-stone-200 px-2.5 text-stone-700">
          <CalendarDays aria-hidden className="h-3.5 w-3.5 text-stone-400" />
          {formatDate(student.nextDueDate)}
          {student.firstPaymentAmount != null ? ` · ${t("first bill")}` : ""}
        </span>
        <span className="ms-1 text-base font-semibold text-stone-900 tabular-nums">{formatCurrency(amountDue)}</span>
      </div>

      <div className="flex items-center gap-2">
        <RecordPaymentDialog student={student} amountDue={amountDue} dueDate={student.nextDueDate} proofs={proofs} />
        {status !== "ok" ? <RemindMenu student={student} canEmail={canEmail} /> : null}
        <ConfirmButton
          label={t("Remove")}
          question={t("Move {name} to Archived?", { name: student.name })}
          confirmLabel={t("Yes, remove")}
          action="/?index"
        >
          <input type="hidden" name="intent" value="removeStudent" />
          <input type="hidden" name="studentId" value={student.id} />
        </ConfirmButton>
      </div>
    </li>
  );
}
