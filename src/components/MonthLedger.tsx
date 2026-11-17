import { Wallet } from "lucide-react";
import { formatCurrency, formatMonth } from "@/lib/format";
import type { MonthlyRevenue } from "@/lib/reports.server";
import { useT } from "@/lib/useT";

/**
 * The dashboard's lead card: this month's collected-vs-expected as one figure and
 * one bar, then how many students are in each payment state.
 */
export default function MonthLedger({
  month,
  counts,
  className = "",
}: {
  month: MonthlyRevenue;
  counts: { overdue: number; dueSoon: number; ok: number };
  className?: string;
}) {
  const t = useT();
  const share = month.expected > 0 ? Math.min(1, month.collected / month.expected) : 0;
  const allPaid = counts.overdue === 0 && counts.dueSoon === 0 && counts.ok > 0;

  const states = [
    { label: "Overdue", count: counts.overdue, dot: "bg-red-500" },
    { label: "Due this week", count: counts.dueSoon, dot: "bg-amber-500" },
    { label: "Upcoming", count: counts.ok, dot: "bg-emerald-500" },
  ];

  return (
    <section
      aria-labelledby="ledger-title"
      data-tour="ledger"
      className={`flex flex-col rounded-2xl border border-stone-200/80 bg-white p-6 shadow-[0_1px_2px_rgb(28_25_23/0.04)] ${className}`}
    >
      <h2 id="ledger-title" className="flex items-center gap-2 text-sm font-medium text-stone-500">
        <Wallet aria-hidden className="h-4 w-4" />
        {t("Collected in {month}", { month: formatMonth(month.slug) })}
      </h2>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-2 tabular-nums">
        <span className="text-4xl font-semibold tracking-tight text-stone-900">{formatCurrency(month.collected)}</span>
        <span className="text-base text-stone-500">{t("of {amount} expected", { amount: formatCurrency(month.expected) })}</span>
      </p>

      <div
        role="progressbar"
        aria-label={t("Collected this month")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(share * 100)}
        className="mt-5 h-2 overflow-hidden rounded-full bg-stone-100"
      >
        <div className="ledger-fill h-full rounded-full bg-emerald-600" style={{ width: `${share * 100}%` }} />
      </div>
      {allPaid ? (
        <p className="ayah-caption mt-3 text-sm font-medium text-emerald-700" style={{ animationDelay: "900ms" }}>
          {t("Alhamdulillah, nobody is behind on tuition.")}
        </p>
      ) : null}

      <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-stone-100 pt-4">
        {states.map((s) => (
          <div key={s.label}>
            <dt className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
              <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
              {t(s.label)}
            </dt>
            <dd className="mt-0.5 text-lg font-semibold text-stone-900 tabular-nums">{s.count}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
