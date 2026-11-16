import { data, Link } from "react-router";
import type { Route } from "./+types/report-month";
import { requireTeacher } from "@/lib/auth/session.server";
import { getMonthDetail } from "@/lib/reports.server";
import { resetMonthPayments } from "@/lib/mutations.server";
import { formatCurrency, formatDate } from "@/lib/format";
import ResetMonthButton from "@/components/ResetMonthButton";

export const meta: Route.MetaFunction = ({ data }) => [
  { title: `${data?.detail.label ?? "Month"} · Muhasabah` },
];

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireTeacher(request);
  const detail = await getMonthDetail(params.month);
  if (!detail) throw data("Not found", { status: 404 });
  return { detail };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireTeacher(request);
  const formData = await request.formData();
  formData.set("month", params.month);
  return resetMonthPayments(formData);
}

export default function MonthDetailPage({ loaderData }: Route.ComponentProps) {
  const { detail } = loaderData;
  const diff = detail.collectedTotal - detail.expectedTotal;

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/reports" className="text-sm text-stone-500 hover:underline">
        ← Back to Monthly Revenue
      </Link>

      <div className="mt-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-stone-900">{detail.label}</h1>
        <ResetMonthButton
          month={detail.slug}
          label={detail.label}
          paymentCount={detail.payments.length}
          collectedTotal={detail.collectedTotal}
        />
      </div>

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
                    <Link to={`/students/${payment.studentId}`} className="hover:underline">
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
                    <Link to={`/students/${student.id}`} className="hover:underline">
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
