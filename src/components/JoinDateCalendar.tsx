import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { parseDateOnly, toDateInputValue } from "@/lib/dates";
import { useLang, useT } from "@/lib/useT";

const WEEKDAYS = {
  en: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  ar: ["ح", "ن", "ث", "ر", "خ", "ج", "س"],
};

const formats = {
  en: {
    monthTitle: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }),
    dayLabel: new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
  },
  ar: {
    monthTitle: new Intl.DateTimeFormat("ar-u-nu-latn", { month: "long", year: "numeric" }),
    dayLabel: new Intl.DateTimeFormat("ar-u-nu-latn", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
  },
};

/**
 * Small month calendar for picking the day a student joined. Days from the picked
 * day to the end of that month are shaded — those are the leftover days that get
 * added onto their first 1st-of-month bill.
 */
export default function JoinDateCalendar({
  name,
  value,
  onChange,
}: {
  name: string;
  /** "YYYY-MM-DD" */
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useT();
  const lang = useLang();
  const { monthTitle, dayLabel } = formats[lang];
  const selected = parseDateOnly(value);
  const [view, setView] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  const todayValue = toDateInputValue(new Date());

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInView = new Date(year, month + 1, 0).getDate();
  const selectedInView = selected.getFullYear() === year && selected.getMonth() === month;
  const selectedDay = selected.getDate();

  function shiftMonth(delta: number) {
    setView(new Date(year, month + delta, 1));
  }

  function pick(day: number) {
    onChange(toDateInputValue(new Date(year, month, day)));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // In Arabic the grid runs right to left, so the left arrow moves forward.
    const back = lang === "ar" ? "ArrowRight" : "ArrowLeft";
    const step = { [back]: -1, [back === "ArrowLeft" ? "ArrowRight" : "ArrowLeft"]: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    const grid = e.currentTarget; // React clears currentTarget after the handler returns
    const next = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() + step);
    onChange(toDateInputValue(next));
    setView(new Date(next.getFullYear(), next.getMonth(), 1));
    requestAnimationFrame(() => {
      grid.querySelector<HTMLButtonElement>(`[data-day="${toDateInputValue(next)}"]`)?.focus();
    });
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInView }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-3">
      <input type="hidden" name={name} value={value} />

      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label={t("Previous month")}
          className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
        >
          <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" strokeWidth={2.25} />
        </button>
        <p className="text-sm font-semibold text-stone-900" aria-live="polite">
          {monthTitle.format(view)}
        </p>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label={t("Next month")}
          className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
        >
          <ChevronRight className="h-4 w-4 rtl:-scale-x-100" strokeWidth={2.25} />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-stone-500">
        {WEEKDAYS[lang].map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>

      <div role="grid" aria-label={t("Date joined")} className="grid grid-cols-7 gap-y-1" onKeyDown={handleKeyDown}>
        {cells.map((day, i) => {
          if (day === null) return <span key={`blank-${i}`} />;

          const dayValue = toDateInputValue(new Date(year, month, day));
          const isSelected = selectedInView && day === selectedDay;
          // Shade the leftover span: picked day through month end, unless they joined on the 1st.
          const isLeftover = selectedInView && selectedDay !== 1 && day > selectedDay;
          const isToday = dayValue === todayValue;
          const isBillingDay = day === 1;

          return (
            <div
              key={dayValue}
              className={`flex justify-center ${
                isLeftover || (isSelected && selectedDay !== 1 && day !== daysInView)
                  ? "bg-emerald-50"
                  : ""
              } ${isSelected && selectedDay !== 1 ? "rounded-s-full" : ""} ${
                isLeftover && day === daysInView ? "rounded-e-full" : ""
              }`}
            >
              <button
                type="button"
                data-day={dayValue}
                onClick={() => pick(day)}
                tabIndex={isSelected || (!selectedInView && day === 1) ? 0 : -1}
                aria-pressed={isSelected}
                aria-label={`${dayLabel.format(new Date(year, month, day))}${isBillingDay ? `, ${t("billing day")}` : ""}${isToday ? `, ${t("today")}` : ""}`}
                className={`relative flex h-9 w-9 items-center justify-center rounded-full text-sm tabular-nums transition-colors ${
                  isSelected
                    ? "bg-emerald-600 font-semibold text-white"
                    : isLeftover
                      ? "text-emerald-700 hover:bg-emerald-100"
                      : "text-stone-700 hover:bg-stone-100"
                } ${isToday && !isSelected ? "ring-1 ring-stone-300 ring-inset" : ""}`}
              >
                {day}
                {isBillingDay ? (
                  <span
                    aria-hidden
                    className={`absolute bottom-1 h-1 w-1 rounded-full ${isSelected ? "bg-white" : "bg-emerald-600"}`}
                  />
                ) : null}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-2 flex items-center gap-1.5 px-1 text-xs text-stone-500">
        <span aria-hidden className="h-1 w-1 rounded-full bg-emerald-600" />
        {t("Billing day (the 1st)")}
        <span aria-hidden className="ms-3 h-3 w-5 rounded-full bg-emerald-50 ring-1 ring-emerald-200 ring-inset" />
        {t("Leftover days")}
      </p>
    </div>
  );
}
