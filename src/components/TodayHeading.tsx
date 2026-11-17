import { useSyncExternalStore } from "react";
import { useLang, useT } from "@/lib/useT";

const formats = {
  en: new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  ar: new Intl.DateTimeFormat("ar-u-nu-latn", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
};
const hijriNumeric = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "numeric" });

const noop = () => () => {};

// Umm al-Qura dates; local moon sighting can shift Ramadan and Eid by a day.
function occasion(now: Date) {
  const parts = hijriNumeric.formatToParts(now);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  if ((month === 10 && day <= 3) || (month === 12 && day >= 10 && day <= 13)) return "Eid Mubarak";
  if (month === 9) return "Ramadan Mubarak";
  if (now.getDay() === 5) return "Jumu'ah Mubarak";
  return "";
}

/**
 * Today's date as the dashboard heading ("Tuesday — 17 November 2026"), so due
 * dates below read against it, with a greeting on Fridays, in Ramadan and on Eid.
 * Rendered on the client: the server runs in UTC and would show the wrong day for
 * an evening visit.
 */
export default function TodayHeading() {
  const t = useT();
  const fmt = formats[useLang()];
  const snapshot = useSyncExternalStore(
    noop,
    () => {
      const now = new Date();
      const part = (type: string) => fmt.formatToParts(now).find((p) => p.type === type)?.value ?? "";
      return [part("weekday"), `${part("day")} ${part("month")} ${part("year")}`, occasion(now)].join("|");
    },
    () => null,
  );
  const [weekday, date, greeting] = snapshot?.split("|") ?? [];

  return (
    <div className="min-h-14">
      {weekday ? (
        <h1 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[2rem] leading-tight font-semibold text-stone-900 sm:text-[2.75rem]">
          <span className="sr-only">{t("Today")}: </span>
          <span>{weekday}</span>
          <span aria-hidden className="text-stone-300">—</span>
          <span>{date}</span>
          {greeting ? (
            <span className="inline-flex h-7 items-center self-center rounded-full border border-gold-line bg-gold-wash px-3 font-sans text-sm font-semibold text-gold-ink">
              {t(greeting)}
            </span>
          ) : null}
        </h1>
      ) : (
        <h1 className="sr-only">{t("Dashboard")}</h1>
      )}
    </div>
  );
}
