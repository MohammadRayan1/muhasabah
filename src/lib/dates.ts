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
