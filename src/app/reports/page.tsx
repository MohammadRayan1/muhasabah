import Link from "next/link";
import { getMonthlyRevenue } from "@/lib/reports";
import { formatCurrency } from "@/lib/format";

export default async function ReportsPage() {
  const months = await getMonthlyRevenue(6);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/" className="text-sm text-gray-500 hover:underline">
        ← Back to dashboard
      </Link>

      <h1 className="mt-4 mb-6 text-2xl font-semibold text-gray-900">Monthly Revenue</h1>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Month</th>
              <th className="px-4 py-2 text-right font-medium">Expected</th>
              <th className="px-4 py-2 text-right font-medium">Collected</th>
              <th className="px-4 py-2 text-right font-medium">Difference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {months.map((m) => {
              const diff = m.collected - m.expected;
              return (
                <tr key={m.label}>
                  <td className="px-4 py-3 text-gray-900">{m.label}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(m.expected)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(m.collected)}</td>
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
