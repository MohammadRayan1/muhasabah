// Days and times are still stored as plain text on a program ("Mon–Thu",
// "5:30–7:30 PM"); these helpers build that text from tap-to-pick controls and read
// it back for editing.

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

const ALIASES: Record<string, Weekday> = {
  mon: "Mon", monday: "Mon",
  tue: "Tue", tues: "Tue", tuesday: "Tue",
  wed: "Wed", weds: "Wed", wednesday: "Wed",
  thu: "Thu", thur: "Thu", thurs: "Thu", thursday: "Thu",
  fri: "Fri", friday: "Fri",
  sat: "Sat", saturday: "Sat",
  sun: "Sun", sunday: "Sun",
};

/** ["Mon","Tue","Wed","Thu"] → "Mon–Thu"; ["Mon","Wed"] → "Mon, Wed". */
export function formatDays(days: Weekday[]) {
  const idx = [...new Set(days)].map((d) => WEEKDAYS.indexOf(d)).sort((a, b) => a - b);
  if (idx.length === 0) return "";
  const contiguous = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  if (contiguous && idx.length >= 3) return `${WEEKDAYS[idx[0]]}–${WEEKDAYS[idx.at(-1)!]}`;
  return idx.map((i) => WEEKDAYS[i]).join(", ");
}

/** Best effort: "Mon–Thu", "Monday to Thursday", "Mon, Wed, Fri" → days. Null if unreadable. */
export function parseDays(text: string): Weekday[] | null {
  const tokens = text.toLowerCase().split(/\s*(?:,|&|\band\b)\s*/).filter(Boolean);
  const out: Weekday[] = [];
  for (const token of tokens) {
    const range = token.split(/\s*(?:–|—|-|\bto\b|\bthrough\b|\bthru\b)\s*/).filter(Boolean);
    if (range.length === 2) {
      const a = ALIASES[range[0].replace(/\./g, "")];
      const b = ALIASES[range[1].replace(/\./g, "")];
      if (!a || !b) return null;
      const from = WEEKDAYS.indexOf(a);
      const to = WEEKDAYS.indexOf(b);
      for (let i = from; ; i = (i + 1) % 7) {
        out.push(WEEKDAYS[i]);
        if (i === to) break;
      }
    } else if (range.length === 1) {
      const d = ALIASES[range[0].replace(/\./g, "")];
      if (!d) return null;
      out.push(d);
    } else return null;
  }
  return out.length ? [...new Set(out)] : null;
}

/** Minutes after midnight, every 15 minutes from 6:00 AM to 10:00 PM. */
export const TIME_SLOTS = Array.from({ length: 65 }, (_, i) => 6 * 60 + i * 15);

export function formatClock(minutes: number, withPeriod = true) {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = ((h24 + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, "0")}${withPeriod ? ` ${h24 < 12 ? "AM" : "PM"}` : ""}`;
}

/** 1050, 1170 → "5:30–7:30 PM"; 660, 780 → "11:00 AM–1:00 PM". */
export function formatTimeRange(start: number, end: number) {
  const samePeriod = start < 720 === end < 720;
  return `${formatClock(start, !samePeriod)}–${formatClock(end)}`;
}

/** "5:30–7:30 PM" / "5:30pm-7:30pm" / "11 AM – 1 PM" → minutes. Null if unreadable. */
export function parseTimeRange(text: string): { start: number; end: number } | null {
  const m = text
    .toLowerCase()
    .replace(/\s+/g, "")
    .match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?(?:–|—|-|to)(\d{1,2})(?::(\d{2}))?(am|pm)?$/);
  if (!m) return null;
  const endPeriod = m[6];
  const startPeriod = m[3] ?? endPeriod;
  if (!endPeriod) return null;
  const toMinutes = (h: string, mm: string | undefined, period: string) => {
    let hour = Number(h) % 12;
    if (period === "pm") hour += 12;
    return hour * 60 + Number(mm ?? 0);
  };
  const start = toMinutes(m[1], m[2], startPeriod);
  const end = toMinutes(m[4], m[5], endPeriod);
  return end > start ? { start, end } : null;
}
