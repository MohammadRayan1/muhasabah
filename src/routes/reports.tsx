import { Link, useNavigate } from "react-router";
import { ChevronRight, Download } from "lucide-react";
import type { Route } from "./+types/reports";
import { requireTeacher } from "@/lib/auth/session.server";
import { getRevenueOverview } from "@/lib/reports.server";
import { formatCurrency, formatDate, formatMonth } from "@/lib/format";
import { getPaymentStatus } from "@/lib/status";
import { paymentMethodLabel } from "@/lib/proofs";
import PageHeader from "@/components/PageHeader";
import RevenueChart from "@/components/RevenueChart";
import { secondaryButton } from "@/components/ui";
import { metaTitle, useT } from "@/lib/useT";

export const meta: Route.MetaFunction = ({ matches }) => [{ title: metaTitle(matches, "Revenue Reports") }];

export async function loader({ request }: Route.LoaderArgs) {
  await requireTeacher(request);
  return getRevenueOverview();
}

const panel = "rounded-2xl border border-stone-200/80 bg-white p-6 shadow-[0_1px_2px_rgb(28_25_23/0.04)]";
const panelTitle = "text-lg font-semibold text-stone-900";

export default function ReportsPage({ loaderData }: Route.ComponentProps) {
  const t = useT();
  const navigate = useNavigate();
  const { months, year, collectedThisYear, monthlyAverage, averageOver, owing, programs, methods } = loaderData;
  const current = months[months.length - 1];
  // Skip the empty months before the class started: the table from the first month
  // with any money, the chart likewise but always at least six months wide.
  const firstActive = months.findIndex((m) => m.expected > 0 || m.collected > 0);
  const tableMonths = firstActive < 0 ? [current] : months.slice(firstActive);
  const chartMonths = months.slice(Math.max(0, Math.min(firstActive < 0 ? months.length : firstActive, months.length - 6)));
  const owed = owing.reduce((sum, s) => sum + s.amount, 0);
  const share = current.expected > 0 ? Math.min(1, current.collected / current.expected) : 0;
  const programTotal = programs.reduce((sum, p) => sum + p.monthly, 0);
  const methodTotal = methods.reduce((sum, m) => sum + m.amount, 0);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title={t("Revenue Reports")}
        description={t("How much has come in, what's still owed, and where it comes from.")}
        actions={
          <a href={`/reports/payments.csv?year=${year}`} download className={secondaryButton}>
            <Download aria-hidden className="h-4 w-4" strokeWidth={2} />
            {t("Download {year} payments", { year })}
          </a>
        }
      />

      {/* Headline numbers */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={`${panel} sm:col-span-2`}>
          <p className="text-[15px] font-medium text-stone-600">{t("Collected in {month}", { month: formatMonth(current.slug) })}</p>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2 tabular-nums">
            <span className="text-4xl font-semibold tracking-tight text-stone-900">{formatCurrency(current.collected)}</span>
            <span className="text-base text-stone-600">{t("of {amount} expected", { amount: formatCurrency(current.expected) })}</span>
          </p>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-stone-100" role="presentation">
            <div className="h-full rounded-full bg-emerald-600" style={{ width: `${share * 100}%` }} />
          </div>
          <p className="mt-2 text-[15px] text-stone-600 tabular-nums">
            {current.expected > 0 ? t("{n}% collected", { n: Math.round(share * 100) }) : t("Nothing expected this month.")}
          </p>
        </div>
        <Stat label={t("Still owed this month")} value={formatCurrency(owed)} note={owing.length === 1 ? t("1 student") : t("{n} students", { n: owing.length })} warn={owed > 0} />
        <Stat
          label={t("Collected in {year}", { year })}
          value={formatCurrency(collectedThisYear)}
          note={averageOver > 0 ? t("About {amount} a month", { amount: formatCurrency(Math.round(monthlyAverage)).replace(/\.00$/, "") }) : ""}
        />
      </div>

      {/* Trend */}
      <section className={`${panel} mb-6`} data-tour="reports-table" aria-labelledby="trend-title">
        <h2 id="trend-title" className={`${panelTitle} mb-1`}>
          {chartMonths.length === 12 ? t("The last 12 months") : t("Month by month so far")}
        </h2>
        <p className="mb-5 text-[15px] text-stone-600">{t("Hover over a month to see its numbers. Click it for every payment.")}</p>
        <RevenueChart months={chartMonths} currentSlug={current.slug} />
      </section>

      <div className="mb-6 grid items-start gap-6 lg:grid-cols-2">
        {/* Who still owes */}
        <section className={panel} aria-labelledby="owing-title">
          <h2 id="owing-title" className={panelTitle}>
            {t("Still owed this month")}
          </h2>
          {owing.length === 0 ? (
            <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-base font-medium text-emerald-800">{t("Everyone has paid for this month.")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-stone-100">
              {owing.map((s) => {
                const late = getPaymentStatus(s.due).status === "overdue";
                return (
                  <li key={s.id}>
                    <Link to={`/students/${s.id}`} className="group flex min-h-14 items-center gap-3 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-semibold text-stone-900 group-hover:text-emerald-700 group-hover:underline">{s.name}</span>
                        <span className={`block text-[15px] ${late ? "font-medium text-red-700" : "text-stone-600"}`}>
                          {late ? t("Overdue since {date}", { date: formatDate(s.due) }) : t("Due {date}", { date: formatDate(s.due) })}
                        </span>
                      </span>
                      <span className="text-base font-semibold text-stone-900 tabular-nums">{formatCurrency(s.amount)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          {/* By program */}
          <section className={panel} aria-labelledby="programs-title">
            <h2 id="programs-title" className={panelTitle}>
              {t("By program")}
            </h2>
            <p className="mb-3 text-[15px] text-stone-600">{t("Monthly tuition from the students in each program now.")}</p>
            {programs.length === 0 ? (
              <p className="text-[15px] text-stone-600">{t("No programs yet.")}</p>
            ) : (
              <Breakdown
                rows={programs.map((p) => ({
                  key: p.id,
                  label: p.name,
                  sub: p.students === 1 ? t("1 student") : t("{n} students", { n: p.students }),
                  amount: p.monthly,
                }))}
                total={programTotal}
              />
            )}
          </section>

          {/* By method */}
          <section className={panel} aria-labelledby="methods-title">
            <h2 id="methods-title" className={panelTitle}>
              {t("How people paid in {year}", { year })}
            </h2>
            {methods.length === 0 ? (
              <p className="mt-3 text-[15px] text-stone-600">{t("No payments yet this year.")}</p>
            ) : (
              <div className="mt-3">
                <Breakdown rows={methods.map((m) => ({ key: m.method, label: t(paymentMethodLabel(m.method)), amount: m.amount }))} total={methodTotal} />
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Month by month */}
      <section aria-labelledby="months-title">
        <h2 id="months-title" className={`${panelTitle} mb-3`}>
          {t("Month by month")}
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-stone-200/80 bg-white">
          <table className="w-full text-base tabular-nums">
            <thead className="border-b border-stone-200 text-[15px] text-stone-600">
              <tr>
                <th scope="col" className="px-5 py-3 text-start font-semibold">{t("Month")}</th>
                <th scope="col" className="px-5 py-3 text-end font-semibold">{t("Expected")}</th>
                <th scope="col" className="px-5 py-3 text-end font-semibold">{t("Collected")}</th>
                <th scope="col" className="px-5 py-3 text-end font-semibold">{t("Difference")}</th>
                <th scope="col" className="hidden px-5 py-3 text-end font-semibold sm:table-cell">{t("Collected %")}</th>
                <th aria-hidden className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {[...tableMonths].reverse().map((m) => {
                const diff = m.collected - m.expected;
                const tone = diff < 0 ? "text-red-700" : diff > 0 ? "text-emerald-700" : "text-stone-500";
                return (
                  <tr
                    key={m.slug}
                    onClick={() => navigate(`/reports/${m.slug}`)}
                    className="group cursor-pointer transition-colors hover:bg-stone-50"
                  >
                    <td className="px-5 py-3.5">
                      {/* Clicking anywhere on the row opens the month; the link is for keyboards. */}
                      <Link to={`/reports/${m.slug}`} className="font-semibold text-stone-900 hover:underline">
                        {formatMonth(m.slug)}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-end text-stone-700">{formatCurrency(m.expected)}</td>
                    <td className="px-5 py-3.5 text-end text-stone-900">{formatCurrency(m.collected)}</td>
                    <td className={`px-5 py-3.5 text-end font-semibold ${tone}`}>
                      {diff === 0 ? "—" : `${diff > 0 ? "+" : ""}${formatCurrency(diff)}`}
                    </td>
                    <td className="hidden px-5 py-3.5 text-end text-stone-700 sm:table-cell">
                      {m.expected > 0 ? `${Math.round((m.collected / m.expected) * 100)}%` : "—"}
                    </td>
                    <td className="pe-4 text-stone-400">
                      <ChevronRight aria-hidden className="h-5 w-5 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, note, warn = false }: { label: string; value: string; note?: string; warn?: boolean }) {
  return (
    <div className={panel}>
      <p className="text-[15px] font-medium text-stone-600">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight tabular-nums ${warn ? "text-red-700" : "text-stone-900"}`}>{value}</p>
      {note ? <p className="mt-1 text-[15px] text-stone-600">{note}</p> : null}
    </div>
  );
}

/** Label, amount and a share bar per row. */
function Breakdown({ rows, total }: { rows: { key: string; label: string; sub?: string; amount: number }[]; total: number }) {
  return (
    <ul className="space-y-3.5">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0">
              <span className="text-base font-semibold text-stone-900">{r.label}</span>
              {r.sub ? <span className="ms-2 text-[15px] text-stone-600">{r.sub}</span> : null}
            </span>
            <span className="text-base font-semibold text-stone-900 tabular-nums">{formatCurrency(r.amount)}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-stone-100" role="presentation">
            <div className="h-full rounded-full bg-emerald-600/80" style={{ width: `${total > 0 ? (r.amount / total) * 100 : 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
