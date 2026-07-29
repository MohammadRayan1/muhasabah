import Link from "next/link";
import { getMonthlyRevenue } from "@/lib/reports";
import { formatCurrency } from "@/lib/format";
import { requireTeacher } from "@/lib/auth/dal";

export default async function ReportsPage() {
  await requireTeacher();

  const months = await getMonthlyRevenue(6);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/" className="text-sm text-stone-500 hover:underline">
        ← Back to dashboard
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-stone-900">Monthly Revenue</h1>
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
                    <Link href={`/reports/${m.slug}`} className="block px-4 py-3 text-stone-900">
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
    </main>
  );
}
