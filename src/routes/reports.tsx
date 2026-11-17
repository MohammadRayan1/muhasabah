import { Link } from "react-router";
import { ChevronRight } from "lucide-react";
import type { Route } from "./+types/reports";
import { requireTeacher } from "@/lib/auth/session.server";
import { getMonthlyRevenue } from "@/lib/reports.server";
import { formatCurrency, formatMonth } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import { pageWidth } from "@/components/ui";
import { metaTitle, useT } from "@/lib/useT";

export const meta: Route.MetaFunction = ({ matches }) => [{ title: metaTitle(matches, "Revenue Reports") }];

export async function loader({ request }: Route.LoaderArgs) {
  await requireTeacher(request);
  return { months: await getMonthlyRevenue(6) };
}

export default function ReportsPage({ loaderData }: Route.ComponentProps) {
  const t = useT();
  const months = [...loaderData.months].reverse();

  return (
    <div className={pageWidth}>
      <PageHeader
        title={t("Revenue Reports")}
        description={t("Click a month to see exactly which payments make up its total, including from students who've since been removed.")}
      />

      <div data-tour="reports-table" className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5">
        <table className="w-full text-sm tabular-nums">
          <thead className="border-b border-stone-200 text-stone-500">
            <tr>
              <th scope="col" className="px-5 py-3 text-start font-semibold">{t("Month")}</th>
              <th scope="col" className="px-5 py-3 text-end font-semibold">{t("Expected")}</th>
              <th scope="col" className="px-5 py-3 text-end font-semibold">{t("Collected")}</th>
              <th scope="col" className="px-5 py-3 text-end font-semibold">{t("Difference")}</th>
              <th aria-hidden className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {months.map((m) => {
              const diff = m.collected - m.expected;
              const tone = diff < 0 ? "text-red-700" : diff > 0 ? "text-emerald-700" : "text-stone-400";
              return (
                <tr key={m.slug} className="group relative transition-colors hover:bg-stone-50">
                  <td className="px-5 py-3.5">
                    {/* The link covers the whole row, so any part of it opens the month. */}
                    <Link
                      to={`/reports/${m.slug}`}
                      className="font-semibold text-stone-900 after:absolute after:inset-0 after:content-['']"
                    >
                      {formatMonth(m.slug)}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-end text-stone-700">{formatCurrency(m.expected)}</td>
                  <td className="px-5 py-3.5 text-end text-stone-700">{formatCurrency(m.collected)}</td>
                  <td className={`px-5 py-3.5 text-end font-semibold ${tone}`}>
                    {diff > 0 ? "+" : ""}
                    {diff === 0 ? "—" : formatCurrency(diff)}
                  </td>
                  <td className="pe-4 text-stone-400">
                    <ChevronRight
                      aria-hidden
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
