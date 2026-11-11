/** Parses a "YYYY-MM-DD" string (e.g. from a date input) as local midnight, not UTC. */
export function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // handle month-length overflow, e.g. Jan 31 + 1 month should land on Feb 28/29, not Mar 3
  if (d.getDate() !== day) {
    d.setDate(0);
  }
  return d;
}

export function diffInDays(a: Date, b: Date): number {
  const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
  return Math.round(ms / 86_400_000);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Clamps `day` to the last day of the given month, e.g. day=31 in Feb becomes 28/29. */
function dateInMonth(year: number, month: number, day: number): Date {
  return new Date(year, month, Math.min(day, daysInMonth(year, month)));
}

/**
 * Next occurrence of `day` (day-of-month) strictly after `from`. Used so every
 * student shares the same due day of the month regardless of when they joined.
 */
export function nextOccurrenceOfDay(day: number, from: Date): Date {
  const d = startOfDay(from);
  const thisMonth = dateInMonth(d.getFullYear(), d.getMonth(), day);
  if (thisMonth.getTime() > d.getTime()) return thisMonth;
  return dateInMonth(d.getFullYear(), d.getMonth() + 1, day);
}

/** Formats a Date as "YYYY-MM-DD" in local time (the value a date input expects). */
export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type Proration = {
  /** Billing-day occurrence on or before the join date — start of the cycle they join in. */
  cycleStart: Date;
  /** First due date after joining (the next billing day). */
  nextDueDate: Date;
  /** Length of the billing cycle the student joins in, in days. */
  cycleDays: number;
  /** Days from the join date up to (not including) the next due date. */
  daysCovered: number;
  dailyRate: number;
  /** First bill, rounded to the nearest dollar. Equals monthlyAmount when not prorated. */
  amount: number;
  isProrated: boolean;
};

/**
 * Prorated first bill for a student joining on `joinDate`, billed on `billingDay`.
 * The daily rate is the monthly amount divided by the length of the actual billing
 * cycle the student joins in (e.g. Nov 15 → Dec 15), so it's correct even when the
 * billing day isn't the 1st and the cycle spans two calendar months.
 */
export function calculateProration(monthlyAmount: number, joinDate: Date, billingDay: number): Proration {
  const start = startOfDay(joinDate);
  const nextDueDate = nextOccurrenceOfDay(billingDay, start);
  const cycleStart = dateInMonth(nextDueDate.getFullYear(), nextDueDate.getMonth() - 1, billingDay);
  const cycleDays = diffInDays(nextDueDate, cycleStart);
  const daysCovered = diffInDays(nextDueDate, start);
  const dailyRate = monthlyAmount / cycleDays;
  const isProrated = daysCovered < cycleDays;
  const amount = isProrated ? Math.round(dailyRate * daysCovered) : monthlyAmount;
  return { cycleStart, nextDueDate, cycleDays, daysCovered, dailyRate, amount, isProrated };
}
