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

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
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

/** Everyone is billed on the 1st of the month. */
export const BILLING_DAY = 1;

/** The next 1st-of-month strictly after `from`. */
export function nextBillingDate(from: Date): Date {
  return nextOccurrenceOfDay(BILLING_DAY, from);
}

export type FirstBill = {
  joinDate: Date;
  /** When the first bill is due: the join date itself if they join on the 1st, else the next 1st. */
  dueDate: Date;
  /** Days in the month they join in. */
  monthDays: number;
  /** Days from the join date to the end of that month, inclusive. 0 when joining on the 1st. */
  leftoverDays: number;
  dailyRate: number;
  /** Charge for the leftover days, rounded to the nearest dollar. 0 when joining on the 1st. */
  leftoverAmount: number;
  /** The first bill: leftover days + one regular month. */
  total: number;
  hasLeftover: boolean;
};

/**
 * First bill for a student joining on `joinDate`, with everyone billed on the 1st.
 *
 * Joining on the 1st: a normal month, due that day.
 * Joining mid-month (e.g. Nov 11 at $100/mo): the remaining days of November are
 * prorated by day (20 of 30 days = $67) and added onto the Dec 1 bill along with
 * December's regular tuition, so the Dec 1 bill is $167.
 */
export function calculateFirstBill(monthlyAmount: number, joinDate: Date): FirstBill {
  const start = startOfDay(joinDate);
  const monthDays = daysInMonth(start.getFullYear(), start.getMonth());
  const dailyRate = monthlyAmount / monthDays;

  if (start.getDate() === BILLING_DAY) {
    return {
      joinDate: start,
      dueDate: start,
      monthDays,
      leftoverDays: 0,
      dailyRate,
      leftoverAmount: 0,
      total: monthlyAmount,
      hasLeftover: false,
    };
  }

  const dueDate = nextBillingDate(start);
  const leftoverDays = diffInDays(dueDate, start);
  const leftoverAmount = Math.round(dailyRate * leftoverDays);
  return {
    joinDate: start,
    dueDate,
    monthDays,
    leftoverDays,
    dailyRate,
    leftoverAmount,
    total: leftoverAmount + monthlyAmount,
    hasLeftover: true,
  };
}
