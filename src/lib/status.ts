import { diffInDays } from "@/lib/dates";

export type PaymentStatus = "overdue" | "due_soon" | "ok";

export const DUE_SOON_WINDOW_DAYS = 7;

export const STATUS_BADGE_STYLES: Record<PaymentStatus, string> = {
  overdue: "bg-red-50 border-red-200 text-red-700",
  due_soon: "bg-amber-50 border-amber-200 text-amber-700",
  ok: "bg-emerald-50 border-emerald-200 text-emerald-700",
};

export const STATUS_LABEL: Record<PaymentStatus, string> = {
  overdue: "Overdue",
  due_soon: "Due this week",
  ok: "Upcoming",
};

export function getPaymentStatus(
  nextDueDate: Date,
  today: Date = new Date(),
): { status: PaymentStatus; daysUntilDue: number } {
  const daysUntilDue = diffInDays(nextDueDate, today);

  if (daysUntilDue < 0) return { status: "overdue", daysUntilDue };
  if (daysUntilDue <= DUE_SOON_WINDOW_DAYS) return { status: "due_soon", daysUntilDue };
  return { status: "ok", daysUntilDue };
}

/** What the student owes on their next due date: the first bill if it's still unpaid, else a normal month. */
export function amountDue(student: { firstPaymentAmount: number | null; tuitionAmount: number }) {
  return student.firstPaymentAmount ?? student.tuitionAmount;
}
