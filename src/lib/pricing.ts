// Prices for coming fewer days than a program's full schedule. Shared by the
// sign-up page (live preview) and the server (the price that's actually saved).

type ProgramDays = { price: number; daysPerWeek: number; dayOptions: number[] };

/** Day counts a parent can pick, smallest first. Falls back to the full schedule. */
export function dayChoices(program: ProgramDays): number[] {
  const full = Math.max(1, program.daysPerWeek);
  const options = [...new Set(program.dayOptions)].filter((d) => d >= 1 && d <= full).sort((a, b) => a - b);
  return options.length > 0 ? options : [full];
}

/** Monthly price for `days` a week: the teacher's price × days ÷ full days, to the cent. */
export function priceForDays(program: ProgramDays, days: number): number {
  const full = Math.max(1, program.daysPerWeek);
  return Math.round(((program.price * days) / full) * 100) / 100;
}

export function daysLabel(days: number) {
  return `${days} day${days === 1 ? "" : "s"} a week`;
}
