import { useState } from "react";
import DayOptionsFields from "@/components/DayOptionsFields";
import { input, label } from "@/components/ui";
import { formatDays, formatTimeRange, parseDays, parseTimeRange, TIME_SLOTS, WEEKDAYS, formatClock, type Weekday } from "@/lib/schedule";
import { useT } from "@/lib/useT";

const QUICK_PRICES = [50, 75, 100, 120, 150, 200];

export type ProgramDefaults = {
  name?: string;
  days?: string;
  time?: string;
  location?: string;
  price?: number;
  daysPerWeek?: number;
  dayOptions?: number[];
};

/**
 * Everything about a program with as little typing as possible: tap the days, pick
 * the times, choose a usual price. Shared by "Add a program" and "Edit".
 */
export default function ProgramFields({
  idPrefix,
  defaults = {},
  locations = [],
}: {
  idPrefix: string;
  defaults?: ProgramDefaults;
  locations?: string[];
}) {
  const t = useT();
  const id = (field: string) => `${idPrefix}-${field}`;

  const parsedDays = defaults.days ? parseDays(defaults.days) : null;
  const [days, setDays] = useState<Weekday[]>(parsedDays ?? []);
  const parsedTime = defaults.time ? parseTimeRange(defaults.time) : null;
  const [start, setStart] = useState(parsedTime?.start ?? 17 * 60 + 30);
  const [end, setEnd] = useState(parsedTime?.end ?? 19 * 60 + 30);
  const [price, setPrice] = useState(defaults.price ? String(defaults.price) : "");

  // If old free-text days can't be read, keep them until days are picked again.
  const daysText = days.length > 0 ? formatDays(days) : (defaults.days ?? "");
  const daysPerWeek = days.length > 0 ? days.length : (defaults.daysPerWeek ?? 0);
  const toggleDay = (d: Weekday) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor={id("name")} className={label}>
          {t("Name")}
        </label>
        <input id={id("name")} name="name" required defaultValue={defaults.name} placeholder={t("Weekday Program")} className={input} />
      </div>

      <fieldset>
        <legend className={label}>{t("Which days does it meet?")}</legend>
        <p className="mt-0.5 text-sm text-stone-600">{t("Tap each day the class meets.")}</p>
        <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {WEEKDAYS.map((d) => {
            const on = days.includes(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() => toggleDay(d)}
                className={`min-h-12 rounded-xl border text-base font-semibold transition-colors ${
                  on ? "border-emerald-600 bg-emerald-600 text-white" : "border-stone-300 bg-white text-stone-800 hover:bg-stone-50"
                }`}
              >
                {t(d)}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="days" value={daysText} />
        {days.length === 0 && defaults.days ? (
          <p className="mt-2 text-sm text-stone-600">{t("Currently: {days}", { days: defaults.days })}</p>
        ) : null}
      </fieldset>

      <fieldset>
        <legend className={label}>{t("What time?")}</legend>
        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor={id("start")}>
            {t("Starts")}
          </label>
          <select id={id("start")} value={start} onChange={(e) => setStart(Number(e.target.value))} className="h-12 min-w-40 rounded-xl border border-stone-300 bg-white px-3.5 text-base text-stone-900 shadow-[0_1px_2px_rgb(28_25_23/0.04)] outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/12">
            {TIME_SLOTS.map((m) => (
              <option key={m} value={m}>
                {formatClock(m)}
              </option>
            ))}
          </select>
          <span className="text-base text-stone-600">{t("to")}</span>
          <label className="sr-only" htmlFor={id("end")}>
            {t("Ends")}
          </label>
          <select id={id("end")} value={end} onChange={(e) => setEnd(Number(e.target.value))} className="h-12 min-w-40 rounded-xl border border-stone-300 bg-white px-3.5 text-base text-stone-900 shadow-[0_1px_2px_rgb(28_25_23/0.04)] outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/12">
            {TIME_SLOTS.filter((m) => m > start).map((m) => (
              <option key={m} value={m}>
                {formatClock(m)}
              </option>
            ))}
          </select>
        </div>
        <input type="hidden" name="time" value={end > start ? formatTimeRange(start, end) : (defaults.time ?? "")} />
      </fieldset>

      <div>
        <label htmlFor={id("location")} className={label}>
          {t("Where?")}
        </label>
        <input
          id={id("location")}
          name="location"
          required
          defaultValue={defaults.location}
          list={locations.length ? id("places") : undefined}
          placeholder={t("e.g. Masjid hall")}
          className={input}
        />
        {locations.length ? (
          <datalist id={id("places")}>
            {locations.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        ) : null}
      </div>

      <div>
        <label htmlFor={id("price")} className={label}>
          {t("Monthly price for all days ($)")}
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {QUICK_PRICES.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={Number(price) === p}
              onClick={() => setPrice(String(p))}
              className={`min-h-11 rounded-xl border px-4 text-base font-semibold tabular-nums transition-colors ${
                Number(price) === p ? "border-emerald-600 bg-emerald-600 text-white" : "border-stone-300 bg-white text-stone-800 hover:bg-stone-50"
              }`}
            >
              ${p}
            </button>
          ))}
        </div>
        <input
          id={id("price")}
          name="price"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder={t("Or type another amount")}
          className={`${input} max-w-60 tabular-nums`}
        />
      </div>

      {daysPerWeek > 0 ? (
        <DayOptionsFields
          key={daysPerWeek}
          idPrefix={idPrefix}
          price={Number(price) || 0}
          daysPerWeek={daysPerWeek}
          defaultOptions={defaults.dayOptions ?? []}
        />
      ) : (
        <p className="rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-600">{t("Pick the days above to choose how students can sign up.")}</p>
      )}
    </div>
  );
}
