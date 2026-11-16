import { formatCurrency, formatMonth } from "@/lib/format";
import GeometricPattern from "@/components/GeometricPattern";
import type { MonthlyRevenue } from "@/lib/reports.server";
import { useT } from "@/lib/useT";

/**
 * The dashboard's lead panel: this month's collected-vs-expected as one sentence and
 * one bar, then how many students are in each payment state.
 */
export default function MonthLedger({
  month,
  counts,
}: {
  month: MonthlyRevenue;
  counts: { overdue: number; dueSoon: number; ok: number };
}) {
  const t = useT();
  const share = month.expected > 0 ? Math.min(1, month.collected / month.expected) : 0;

  const states = [
    { label: "Overdue", count: counts.overdue, dot: "bg-red-400" },
    { label: "Due this week", count: counts.dueSoon, dot: "bg-amber-400" },
    { label: "Paid up", count: counts.ok, dot: "bg-emerald-400" },
  ];

  return (
    <section
      aria-labelledby="ledger-title"
      className="relative mb-10 overflow-hidden rounded-3xl bg-ledger p-6 text-sidebar-foreground shadow-lg shadow-stone-900/10 sm:p-8"
    >
      <GeometricPattern className="text-sidebar-foreground opacity-[0.05]" />

      <div className="relative">
        <h2 id="ledger-title" className="text-sm font-semibold text-sidebar-muted">
          {formatMonth(month.slug)}
        </h2>
        <p className="mt-2 text-2xl font-bold leading-snug tabular-nums sm:text-3xl">
          {t("{amount} collected", { amount: formatCurrency(month.collected) })}{" "}
          <span className="font-semibold text-sidebar-muted">
            {t("of {amount} expected", { amount: formatCurrency(month.expected) })}
          </span>
        </p>

        <div
          role="progressbar"
          aria-label={t("Collected this month")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(share * 100)}
          className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/10"
        >
          <div className="ledger-fill h-full rounded-full bg-gold" style={{ width: `${share * 100}%` }} />
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-white/10 pt-5 sm:grid-cols-3">
          {states.map((s) => (
            <div key={s.label}>
              <dt className="flex items-center gap-2 text-sm text-sidebar-muted">
                <span aria-hidden className={`h-2 w-2 rounded-full ${s.dot}`} />
                {t(s.label)}
              </dt>
              <dd className="mt-1 text-xl font-bold tabular-nums">
                {s.count}{" "}
                <span className="text-sm font-medium text-sidebar-muted">
                  {s.count === 1 ? t("student") : t("students")}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
