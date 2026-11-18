import { Link } from "react-router";
import { formatCurrency, intlLocale } from "@/lib/format";
import type { MonthlyRevenue } from "@/lib/reports.server";
import { useT } from "@/lib/useT";

/** Rounds up to a tidy axis top: 1, 2, 2.5 or 5 times a power of ten. */
function niceMax(value: number) {
  if (value <= 0) return 100;
  const pow = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * pow >= value) ?? 10;
  return step * pow;
}

/**
 * Collected (solid) against expected (outlined) for each month. Hover or focus a
 * month for its figures; click to open it.
 */
export default function RevenueChart({ months, currentSlug }: { months: MonthlyRevenue[]; currentSlug: string }) {
  const t = useT();
  const top = niceMax(Math.max(...months.map((m) => Math.max(m.expected, m.collected))));
  const short = new Intl.DateTimeFormat(intlLocale(), { month: "short", timeZone: "UTC" });
  const label = (slug: string) => {
    const [y, m] = slug.split("-").map(Number);
    return short.format(new Date(Date.UTC(y, m - 1, 15)));
  };
  const pct = (v: number) => `${Math.min(100, (v / top) * 100)}%`;
  const whole = (v: number) => formatCurrency(v).replace(/\.00$/, "");

  return (
    <figure>
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[15px] text-stone-600">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-3 w-3 rounded-[3px] bg-emerald-600" />
          {t("Collected")}
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-3 w-3 rounded-[3px] border-2 border-dashed border-stone-400" />
          {t("Expected")}
        </span>
      </div>

      <div className="relative flex gap-3">
        {/* Axis labels */}
        <div aria-hidden className="relative h-56 w-12 shrink-0 text-end text-[13px] text-stone-500 tabular-nums">
          {[1, 0.5, 0].map((f) => (
            <span key={f} className="absolute end-0 -translate-y-1/2" style={{ top: `${(1 - f) * 100}%` }}>
              {whole(top * f)}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Gridlines */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-56">
            {[0, 0.5, 1].map((f) => (
              <div key={f} className="absolute inset-x-0 border-t border-stone-200" style={{ top: `${f * 100}%` }} />
            ))}
          </div>

          <ol className="relative flex h-56 items-end gap-1 sm:gap-2">
            {months.map((m) => {
              const current = m.slug === currentSlug;
              const share = m.expected > 0 ? Math.round((m.collected / m.expected) * 100) : null;
              return (
                <li key={m.slug} className="group relative flex h-full flex-1 items-end justify-center">
                  <Link
                    to={`/reports/${m.slug}`}
                    aria-label={t("{month}: collected {collected} of {expected}", {
                      month: label(m.slug),
                      collected: formatCurrency(m.collected),
                      expected: formatCurrency(m.expected),
                    })}
                    className="relative flex h-full w-full max-w-14 items-end justify-center rounded-t-md outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/25"
                  >
                    {m.expected > 0 ? (
                      <span
                        aria-hidden
                        className="absolute inset-x-0 bottom-0 rounded-t-[4px] border-2 border-b-0 border-dashed border-stone-400"
                        style={{ height: pct(m.expected) }}
                      />
                    ) : null}
                    <span
                      aria-hidden
                      className={`relative mx-[3px] w-full rounded-t-[4px] transition-colors ${
                        current ? "bg-emerald-600" : "bg-emerald-600/70 group-hover:bg-emerald-600"
                      }`}
                      style={{ height: m.collected > 0 ? `max(${pct(m.collected)}, 3px)` : 0 }}
                    />
                  </Link>

                  {/* Tooltip */}
                  <div
                    role="presentation"
                    className="pointer-events-none absolute bottom-full z-10 mb-2 hidden w-max rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[14px] shadow-lg shadow-stone-900/10 group-focus-within:block group-hover:block"
                  >
                    <p className="font-semibold text-stone-900">{label(m.slug)}</p>
                    <p className="text-stone-700 tabular-nums">
                      {t("Collected")}: <span className="font-semibold">{formatCurrency(m.collected)}</span>
                    </p>
                    <p className="text-stone-700 tabular-nums">
                      {t("Expected")}: <span className="font-semibold">{formatCurrency(m.expected)}</span>
                    </p>
                    {share !== null ? <p className="text-stone-500 tabular-nums">{t("{n}% collected", { n: share })}</p> : null}
                  </div>
                </li>
              );
            })}
          </ol>

          <ol aria-hidden className="mt-2 flex gap-1 sm:gap-2">
            {months.map((m) => (
              <li
                key={m.slug}
                className={`flex-1 text-center text-[13px] ${m.slug === currentSlug ? "font-semibold text-stone-900" : "text-stone-500"}`}
              >
                {label(m.slug)}
              </li>
            ))}
          </ol>
        </div>
      </div>
      <figcaption className="sr-only">{t("Collected and expected tuition by month. The table below has the same figures.")}</figcaption>
    </figure>
  );
}
