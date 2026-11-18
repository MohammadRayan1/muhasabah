import { useState } from "react";
import { formatCurrency } from "@/lib/format";
import { daysCount, priceForDays } from "@/lib/pricing";
import { label } from "@/components/ui";
import { useT } from "@/lib/useT";

/**
 * Which smaller day counts students may pick (e.g. 2 of a 4-day class), each with
 * its prorated price. The full schedule is always offered. Days a week comes from
 * the days the teacher tapped.
 */
export default function DayOptionsFields({
  price,
  daysPerWeek,
  defaultOptions = [],
  idPrefix,
}: {
  price: number;
  daysPerWeek: number;
  defaultOptions?: number[];
  idPrefix: string;
}) {
  const t = useT();
  const [options, setOptions] = useState(() => new Set(defaultOptions.filter((d) => d < daysPerWeek)));
  const program = { price, daysPerWeek, dayOptions: [] };

  function toggle(day: number, on: boolean) {
    const next = new Set(options);
    if (on) next.add(day);
    else next.delete(day);
    setOptions(next);
  }

  return (
    <fieldset id={`${idPrefix}-day-options`}>
      <input type="hidden" name="daysPerWeek" value={daysPerWeek} />
      <legend className={label}>{t("Can students choose fewer days?")}</legend>
      <p className="mt-0.5 text-sm text-stone-600">
        {daysPerWeek === 1
          ? t("This class meets one day a week, so there's nothing to choose.")
          : t("Tick the options students may pick. Fewer days cost less: your price × days chosen ÷ {n}.", { n: daysPerWeek })}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {Array.from({ length: daysPerWeek }, (_, i) => i + 1).map((d) => {
          const full = d === daysPerWeek;
          const checked = full || options.has(d);
          return (
            <label
              key={d}
              className={`flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border px-4 text-base ${
                checked ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-stone-300 bg-white text-stone-800"
              } ${full ? "cursor-default" : ""}`}
            >
              <input
                type="checkbox"
                name={full ? undefined : "dayOptions"}
                value={d}
                checked={checked}
                disabled={full}
                onChange={(e) => toggle(d, e.target.checked)}
                className="h-5 w-5"
              />
              <span>
                {t(daysCount(d))}
                {price > 0 ? <span className="ms-1.5 text-stone-600 tabular-nums">{formatCurrency(priceForDays(program, d))}</span> : null}
                {full ? <span className="ms-1.5 text-sm text-stone-500">{t("(always offered)")}</span> : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
