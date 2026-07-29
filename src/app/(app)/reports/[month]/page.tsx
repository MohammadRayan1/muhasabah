import Link from "next/link";
import { notFound } from "next/navigation";
import { getMonthDetail } from "@/lib/reports";
import { formatCurrency, formatDate } from "@/lib/format";
import { requireTeacher } from "@/lib/auth/dal";

export default async function MonthDetailPage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  await requireTeacher();

  const { month } = await params;
  const detail = await getMonthDetail(month);

  if (!detail) notFound();

  const diff = detail.collectedTotal - detail.expectedTotal;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/reports" className="text-sm text-stone-500 hover:underline">
        ← Back to Monthly Revenue
      </Link>

      <h1 className="mt-4 mb-6 text-2xl font-bold text-stone-900">{detail.label}</h1>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm shadow-stone-900/5">
          <p className="text-lg font-semibold text-stone-900">{formatCurrency(detail.expectedTotal)}</p>
          <p className="text-sm text-stone-500">Expected</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm shadow-stone-900/5">
          <p className="text-lg font-semibold text-stone-900">{formatCurrency(detail.collectedTotal)}</p>
          <p className="text-sm text-stone-500">Collected</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm shadow-stone-900/5">
          <p className={`text-lg font-semibold ${diff < 0 ? "text-red-600" : "text-emerald-600"}`}>
            {diff >= 0 ? "+" : ""}
            {formatCurrency(diff)}
          </p>
          <p className="text-sm text-stone-500">Difference</p>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-medium text-stone-900">Payments received</h2>
      {detail.payments.length === 0 ? (
        <p className="mb-8 text-sm text-stone-500">No payments recorded this month.</p>
      ) : (
        <div className="mb-8 overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-500">
              <tr>
                <th className="px-4 py-2 font-medium">Student</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {detail.payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3 text-stone-900">
                    <Link href={`/students/${payment.studentId}`} className="hover:underline">
                      {payment.studentName}
                    </Link>
                    {!payment.studentActive ? (
                      <span className="ml-2 rounded-full border border-stone-200 px-2 py-0.5 text-xs font-medium text-stone-500">
                        removed
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-stone-700">{formatDate(payment.paidAt)}</td>
                  <td className="px-4 py-3 text-right text-stone-700">
                    {formatCurrency(payment.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-3 text-lg font-medium text-stone-900">Who was expected to pay</h2>
      {detail.expectedStudents.length === 0 ? (
        <p className="text-sm text-stone-500">No students were enrolled yet this month.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-500">
              <tr>
                <th className="px-4 py-2 font-medium">Student</th>
                <th className="px-4 py-2 text-right font-medium">Tuition</th>
                <th className="px-4 py-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {detail.expectedStudents.map((student) => (
                <tr key={student.id}>
                  <td className="px-4 py-3 text-stone-900">
                    <Link href={`/students/${student.id}`} className="hover:underline">
                      {student.name}
                    </Link>
                    {!student.active ? (
                      <span className="ml-2 rounded-full border border-stone-200 px-2 py-0.5 text-xs font-medium text-stone-500">
                        removed
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-700">
                    {formatCurrency(student.tuitionAmount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                        student.paidThisMonth
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-red-200 bg-red-50 text-red-700"
                      }`}
                    >
                      {student.paidThisMonth ? "Paid" : "Not paid"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
