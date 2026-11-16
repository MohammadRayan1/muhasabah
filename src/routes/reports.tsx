import { Link } from "react-router";
import type { Route } from "./+types/reports";
import { requireTeacher } from "@/lib/auth/session.server";
import { getMonthlyRevenue } from "@/lib/reports.server";
import { formatCurrency } from "@/lib/format";

export const meta: Route.MetaFunction = () => [{ title: "Monthly Revenue · Muhasabah" }];

export async function loader({ request }: Route.LoaderArgs) {
  await requireTeacher(request);
  return { months: await getMonthlyRevenue(6) };
}

export default function ReportsPage({ loaderData }: Route.ComponentProps) {
  const { months } = loaderData;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-stone-900">Monthly Revenue</h1>
      <p className="mb-6 text-sm text-stone-500">
        Click a month to see exactly which payments make up its total — including from students
        who&apos;ve since been removed.
      </p>

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-stone-500">
            <tr>
              <th className="px-4 py-2 font-medium">Month</th>
              <th className="px-4 py-2 text-right font-medium">Expected</th>
              <th className="px-4 py-2 text-right font-medium">Collected</th>
              <th className="px-4 py-2 text-right font-medium">Difference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {months.map((m) => {
              const diff = m.collected - m.expected;
              return (
                <tr key={m.slug} className="cursor-pointer hover:bg-stone-50">
                  <td className="p-0">
                    <Link to={`/reports/${m.slug}`} className="block px-4 py-3 text-stone-900">
                      {m.label} →
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right text-stone-700">{formatCurrency(m.expected)}</td>
                  <td className="px-4 py-3 text-right text-stone-700">{formatCurrency(m.collected)}</td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${
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
