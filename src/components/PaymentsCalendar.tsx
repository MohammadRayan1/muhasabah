import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BILLING_DAY } from "@/lib/dates";
import { formatCurrency, intlLocale } from "@/lib/format";
import { useT } from "@/lib/useT";

type CalendarStudent = { id: string; name: string; nextDue: Date; amountDue: number; tuition: number };
type CalendarPayment = { studentId: string; studentName: string; amount: number; paidAt: Date };
type Entry = { key: string; studentId: string; name: string; amount: number; kind: "due" | "received" };

// Dates are stored as calendar days at UTC midnight, so the grid works in UTC too.
const ymd = (d: Date) => ({ y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() });

/**
 * One month of money: what each student owes on their due date (projected forward
 * at the monthly rate past their next bill) and what came in, on the day it came in.
 */
export default function PaymentsCalendar({ students, payments }: { students: CalendarStudent[]; payments: CalendarPayment[] }) {
  const t = useT();
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

  const byDay = useMemo(() => {
    const map = new Map<number, Entry[]>();
    const push = (day: number, e: Entry) => map.set(day, [...(map.get(day) ?? []), e]);
    for (const s of students) {
      const due = ymd(new Date(s.nextDue));
      const monthIndex = cursor.y * 12 + cursor.m;
      const dueIndex = due.y * 12 + due.m;
      if (monthIndex === dueIndex) push(due.d, { key: `d-${s.id}`, studentId: s.id, name: s.name, amount: s.amountDue, kind: "due" });
      else if (monthIndex > dueIndex) push(BILLING_DAY, { key: `d-${s.id}`, studentId: s.id, name: s.name, amount: s.tuition, kind: "due" });
    }
    payments.forEach((p, i) => {
      const paid = ymd(new Date(p.paidAt));
      if (paid.y === cursor.y && paid.m === cursor.m) {
        push(paid.d, { key: `r-${i}`, studentId: p.studentId, name: p.studentName, amount: p.amount, kind: "received" });
      }
    });
    return map;
  }, [students, payments, cursor]);

  const all = [...byDay.values()].flat();
  const dueTotal = all.filter((e) => e.kind === "due").reduce((sum, e) => sum + e.amount, 0);
  const receivedTotal = all.filter((e) => e.kind === "received").reduce((sum, e) => sum + e.amount, 0);

  const first = new Date(Date.UTC(cursor.y, cursor.m, 1));
  const daysInMonth = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate();
  const lead = first.getUTCDay();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(intlLocale(), { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2023, 0, 1 + i))),
  );
  const title = new Intl.DateTimeFormat(intlLocale(), { month: "long", year: "numeric", timeZone: "UTC" }).format(first);
  const move = (delta: number) => setCursor(({ y, m }) => ({ y: y + Math.floor((m + delta) / 12), m: (((m + delta) % 12) + 12) % 12 }));
  const days = [...byDay.keys()].sort((a, b) => a - b);

  return (
    <section aria-labelledby="calendar-title" className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 px-5 py-4">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => move(-1)} className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-[15px] font-semibold text-stone-600 hover:bg-stone-100 hover:text-stone-900">
            <ChevronLeft aria-hidden className="h-5 w-5 rtl:-scale-x-100" />
            {t("Previous")}
          </button>
          <h2 id="calendar-title" className="min-w-40 text-center text-lg font-bold text-stone-900">
            {title}
          </h2>
          <button type="button" onClick={() => move(1)} className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-[15px] font-semibold text-stone-600 hover:bg-stone-100 hover:text-stone-900">
            {t("Next")}
            <ChevronRight aria-hidden className="h-5 w-5 rtl:-scale-x-100" />
          </button>
        </div>
        <dl className="flex gap-6 text-sm tabular-nums">
          <div>
            <dt className="flex items-center gap-1.5 text-stone-500">
              <span aria-hidden className="h-2 w-2 rounded-full bg-amber-500" />
              {t("Due")}
            </dt>
            <dd className="font-bold text-stone-900">{formatCurrency(dueTotal)}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-stone-500">
              <span aria-hidden className="h-2 w-2 rounded-full bg-emerald-500" />
              {t("Received")}
            </dt>
            <dd className="font-bold text-stone-900">{formatCurrency(receivedTotal)}</dd>
          </div>
        </dl>
      </header>

      {/* Month grid from tablet up */}
      <div className="hidden sm:block">
        <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50 text-xs font-semibold text-stone-500">
          {weekdays.map((w) => (
            <div key={w} className="px-3 py-2">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const entries = day ? (byDay.get(day) ?? []) : [];
            const isToday = day !== null && `${cursor.y}-${cursor.m}-${day}` === todayKey;
            return (
              <div key={i} className={`min-h-28 border-e border-b border-stone-100 p-2 ${day ? "" : "bg-stone-50/60"} ${(i + 1) % 7 === 0 ? "border-e-0" : ""}`}>
                {day ? (
                  <>
                    <span
                      className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold tabular-nums ${
                        isToday ? "bg-emerald-600 text-white" : "text-stone-500"
                      }`}
                    >
                      {day}
                    </span>
                    <ul className="mt-1 space-y-1">
                      {entries.slice(0, 3).map((e) => (
                        <EntryChip key={e.key} entry={e} />
                      ))}
                      {entries.length > 3 ? (
                        <li className="px-1.5 text-xs font-semibold text-stone-500">{t("+{n} more", { n: entries.length - 3 })}</li>
                      ) : null}
                    </ul>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Phones: the same month as a list of days */}
      <div className="sm:hidden">
        {days.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-stone-500">{t("Nothing due or received this month.")}</p>
        ) : (
          <ol className="divide-y divide-stone-100">
            {days.map((day) => (
              <li key={day} className="flex gap-4 px-5 py-3">
                <span className="w-8 shrink-0 pt-0.5 text-lg font-bold text-stone-900 tabular-nums">{day}</span>
                <ul className="min-w-0 flex-1 space-y-1">
                  {(byDay.get(day) ?? []).map((e) => (
                    <EntryChip key={e.key} entry={e} />
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function EntryChip({ entry }: { entry: Entry }) {
  const tone =
    entry.kind === "received"
      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
      : "bg-amber-50 text-amber-700 hover:bg-amber-100";
  return (
    <li>
      <Link
        to={`/students/${entry.studentId}`}
        title={`${entry.name} · ${formatCurrency(entry.amount)}`}
        className={`flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-xs font-medium transition-colors ${tone}`}
      >
        <span className="truncate">{entry.name}</span>
        <span className="shrink-0 font-semibold tabular-nums">{formatCurrency(entry.amount)}</span>
      </Link>
    </li>
  );
}
