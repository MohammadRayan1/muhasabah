import { diffInDays } from "@/lib/dates";

export type PaymentStatus = "overdue" | "due_soon" | "ok";

export const DUE_SOON_WINDOW_DAYS = 7;

export function getPaymentStatus(
  nextDueDate: Date,
  today: Date = new Date(),
): { status: PaymentStatus; daysUntilDue: number } {
  const daysUntilDue = diffInDays(nextDueDate, today);

  if (daysUntilDue < 0) return { status: "overdue", daysUntilDue };
  if (daysUntilDue <= DUE_SOON_WINDOW_DAYS) return { status: "due_soon", daysUntilDue };
  return { status: "ok", daysUntilDue };
}
