import { Link } from "react-router";
import type { Route } from "./+types/reports";
import { requireTeacher } from "@/lib/auth/session.server";
import { getMonthlyRevenue } from "@/lib/reports.server";
import { formatCurrency, formatMonth } from "@/lib/format";
import Arrow from "@/components/Arrow";
import { metaTitle, useT } from "@/lib/useT";

export const meta: Route.MetaFunction = ({ matches }) => [{ title: metaTitle(matches, "Monthly Revenue") }];

export async function loader({ request }: Route.LoaderArgs) {
  await requireTeacher(request);
  return { months: await getMonthlyRevenue(6) };
}

export default function ReportsPage({ loaderData }: Route.ComponentProps) {
  const t = useT();
  const { months } = loaderData;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-stone-900">{t("Monthly Revenue")}</h1>
      <p className="mb-6 text-sm text-stone-500">
        {t("Click a month to see exactly which payments make up its total, including from students who've since been removed.")}
      </p>

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-start text-stone-500">
            <tr>
              <th className="px-4 py-2 font-medium">{t("Month")}</th>
              <th className="px-4 py-2 text-end font-medium">{t("Expected")}</th>
              <th className="px-4 py-2 text-end font-medium">{t("Collected")}</th>
              <th className="px-4 py-2 text-end font-medium">{t("Difference")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {months.map((m) => {
              const diff = m.collected - m.expected;
              return (
                <tr key={m.slug} className="cursor-pointer hover:bg-stone-50">
                  <td className="p-0">
                    <Link to={`/reports/${m.slug}`} className="block px-4 py-3 text-stone-900">
                      {formatMonth(m.slug)} <Arrow />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-end text-stone-700">{formatCurrency(m.expected)}</td>
                  <td className="px-4 py-3 text-end text-stone-700">{formatCurrency(m.collected)}</td>
                  <td
                    className={`px-4 py-3 text-end font-medium ${
                      diff < 0 ? "text-red-600" : "text-emerald-600"
                    }`}
                  >
                    {diff >= 0 ? "+" : ""}
                    {formatCurrency(diff)}
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
