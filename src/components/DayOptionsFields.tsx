import { useState } from "react";
import { formatCurrency } from "@/lib/format";
import { daysCount, priceForDays } from "@/lib/pricing";
import { label } from "@/components/ui";
import { useT } from "@/lib/useT";

/**
 * "Meets N days a week" plus which smaller day counts parents may pick, each with
 * its prorated price. The full schedule is always offered.
 */
export default function DayOptionsFields({
  price,
  defaultDaysPerWeek = 2,
  defaultOptions = [],
  idPrefix,
}: {
  price: number;
  defaultDaysPerWeek?: number;
  defaultOptions?: number[];
  idPrefix: string;
}) {
  const t = useT();
  const [daysPerWeek, setDaysPerWeek] = useState(defaultDaysPerWeek);
  const [options, setOptions] = useState(() => new Set(defaultOptions.filter((d) => d < defaultDaysPerWeek)));
  const program = { price, daysPerWeek, dayOptions: [] };

  function toggle(day: number, on: boolean) {
    const next = new Set(options);
    if (on) next.add(day);
    else next.delete(day);
    setOptions(next);
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={`${idPrefix}-daysPerWeek`} className={label}>
          {t("Meets how many days a week?")}
        </label>
        <select
          id={`${idPrefix}-daysPerWeek`}
          name="daysPerWeek"
          value={daysPerWeek}
          onChange={(e) => setDaysPerWeek(Number(e.target.value))}
          className="mt-1 h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900"
        >
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <option key={d} value={d}>
              {t(daysCount(d))}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className={label}>{t("People can choose")}</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {Array.from({ length: daysPerWeek }, (_, i) => i + 1).map((d) => {
            const full = d === daysPerWeek;
            const checked = full || options.has(d);
            return (
              <label
                key={d}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                  checked ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-stone-300 text-stone-700"
                }`}
              >
                <input
                  type="checkbox"
                  name={full ? undefined : "dayOptions"}
                  value={d}
                  checked={checked}
                  disabled={full}
                  onChange={(e) => toggle(d, e.target.checked)}
                />
                <span>
                  {t(daysCount(d))}
                  {price > 0 ? (
                    <span className="ms-1 text-stone-500 tabular-nums">{formatCurrency(priceForDays(program, d))}</span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-stone-500">
          {t("Fewer days costs less: your price × days chosen ÷ {n}. The full schedule is always an option.", { n: daysPerWeek })}
        </p>
      </fieldset>
    </div>
  );
}
