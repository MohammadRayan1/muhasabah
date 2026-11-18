import { data, Link } from "react-router";
import type { Route } from "./+types/report-month";
import { requireTeacher } from "@/lib/auth/session.server";
import { getMonthDetail } from "@/lib/reports.server";
import { resetMonthPayments } from "@/lib/mutations.server";
import { formatCurrency, formatMonth, formatDate } from "@/lib/format";
import BackLink from "@/components/BackLink";
import ResetMonthButton from "@/components/ResetMonthButton";
import { pageTitle, pageWidth } from "@/components/ui";
import { paymentMethodLabel } from "@/lib/proofs";
import { useT } from "@/lib/useT";

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

const panel = "rounded-2xl border border-stone-200/80 bg-white p-5 shadow-[0_1px_2px_rgb(28_25_23/0.04)]";

export default function MonthDetailPage({ loaderData }: Route.ComponentProps) {
  const t = useT();
  const { detail } = loaderData;
  const owed = detail.expectedStudents.filter((s) => s.standing === "unpaid");
  const owedTotal = owed.reduce((sum, s) => sum + s.tuitionAmount, 0);
  const share = detail.expectedTotal > 0 ? Math.min(1, detail.collectedTotal / detail.expectedTotal) : 0;
  // Unpaid first, then by name.
  const order = { unpaid: 0, first_bill: 1, ahead: 2, paid: 3 } as const;
  const students = [...detail.expectedStudents].sort((a, b) => order[a.standing] - order[b.standing] || a.name.localeCompare(b.name));
  const standingPill = {
    paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
    ahead: "border-emerald-200 bg-emerald-50 text-emerald-700",
    first_bill: "border-stone-200 bg-stone-50 text-stone-700",
    unpaid: "border-red-200 bg-red-50 text-red-700",
  } as const;
  const removedTag = (
    <span className="ms-2 rounded-full border border-stone-200 px-2 py-0.5 text-[13px] font-medium text-stone-600">{t("removed")}</span>
  );

  return (
    <div className={pageWidth}>
      <BackLink to="/reports" label={t("Back to Revenue Reports")} />

      <div className="mt-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className={pageTitle}>{formatMonth(detail.slug)}</h1>
        <ResetMonthButton
          month={detail.slug}
          label={formatMonth(detail.slug)}
          paymentCount={detail.payments.length}
          collectedTotal={detail.collectedTotal}
        />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className={panel}>
          <p className="text-[15px] font-medium text-stone-600">{t("Collected")}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-stone-900 tabular-nums">{formatCurrency(detail.collectedTotal)}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100" role="presentation">
            <div className="h-full rounded-full bg-emerald-600" style={{ width: `${share * 100}%` }} />
          </div>
        </div>
        <div className={panel}>
          <p className="text-[15px] font-medium text-stone-600">{t("Expected")}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-stone-900 tabular-nums">{formatCurrency(detail.expectedTotal)}</p>
          <p className="mt-1 text-[15px] text-stone-600">
            {detail.expectedStudents.length === 1 ? t("1 student") : t("{n} students", { n: detail.expectedStudents.length })}
          </p>
        </div>
        <div className={panel}>
          <p className="text-[15px] font-medium text-stone-600">{t("Not paid")}</p>
          <p className={`mt-1 text-3xl font-semibold tracking-tight tabular-nums ${owedTotal > 0 ? "text-red-700" : "text-stone-900"}`}>
            {formatCurrency(owedTotal)}
          </p>
          <p className="mt-1 text-[15px] text-stone-600">{owed.length === 1 ? t("1 student") : t("{n} students", { n: owed.length })}</p>
        </div>
      </div>

      <h2 className="mb-1 text-lg font-semibold text-stone-900">{t("Students this month")}</h2>
      <p className="mb-3 text-[15px] text-stone-600">{t("Everyone who was enrolled, and what they paid. Not paid comes first.")}</p>
      {students.length === 0 ? (
        <p className="mb-8 text-[15px] text-stone-600">{t("No students were enrolled yet this month.")}</p>
      ) : (
        <div className="mb-10 overflow-x-auto rounded-2xl border border-stone-200/80 bg-white">
          <table className="w-full text-base tabular-nums">
            <thead className="border-b border-stone-200 text-[15px] text-stone-600">
              <tr>
                <th scope="col" className="px-5 py-3 text-start font-semibold">{t("Student")}</th>
                <th scope="col" className="px-5 py-3 text-end font-semibold">{t("Tuition")}</th>
                <th scope="col" className="px-5 py-3 text-end font-semibold">{t("Paid")}</th>
                <th scope="col" className="px-5 py-3 text-end font-semibold">{t("Status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-3.5">
                    <Link to={`/students/${s.id}`} className="font-semibold text-stone-900 hover:text-emerald-700 hover:underline">
                      {s.name}
                    </Link>
                    {!s.active ? removedTag : null}
                  </td>
                  <td className="px-5 py-3.5 text-end text-stone-700">{formatCurrency(s.tuitionAmount)}</td>
                  <td className="px-5 py-3.5 text-end text-stone-900">{s.paidAmount > 0 ? formatCurrency(s.paidAmount) : "—"}</td>
                  <td className="px-5 py-3.5 text-end">
                    <span className={`inline-flex h-7 items-center whitespace-nowrap rounded-full border px-2.5 text-[14px] font-medium ${standingPill[s.standing]}`}>
                      {s.standing === "paid"
                        ? t("Paid")
                        : s.standing === "ahead"
                          ? t("Paid ahead")
                          : s.standing === "first_bill"
                            ? t("First bill due {date}", { date: formatDate(s.nextDueDate) })
                            : t("Not paid")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold text-stone-900">{t("Payments received")}</h2>
      {detail.payments.length === 0 ? (
        <p className="text-[15px] text-stone-600">{t("No payments recorded this month.")}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200/80 bg-white">
          <table className="w-full text-base tabular-nums">
            <thead className="border-b border-stone-200 text-[15px] text-stone-600">
              <tr>
                <th scope="col" className="px-5 py-3 text-start font-semibold">{t("Date")}</th>
                <th scope="col" className="px-5 py-3 text-start font-semibold">{t("Student")}</th>
                <th scope="col" className="hidden px-5 py-3 text-start font-semibold sm:table-cell">{t("Method")}</th>
                <th scope="col" className="px-5 py-3 text-end font-semibold">{t("Amount")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {detail.payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-5 py-3.5 text-stone-700">{formatDate(payment.paidAt)}</td>
                  <td className="px-5 py-3.5">
                    <Link to={`/students/${payment.studentId}`} className="font-semibold text-stone-900 hover:text-emerald-700 hover:underline">
                      {payment.studentName}
                    </Link>
                    {!payment.studentActive ? removedTag : null}
                  </td>
                  <td className="hidden px-5 py-3.5 text-stone-700 sm:table-cell">{t(paymentMethodLabel(payment.method))}</td>
                  <td className="px-5 py-3.5 text-end font-semibold text-stone-900">{formatCurrency(payment.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-stone-200">
              <tr>
                <td colSpan={3} className="px-5 py-3 font-semibold text-stone-700">{t("Total")}</td>
                <td className="px-5 py-3 text-end font-semibold text-stone-900">{formatCurrency(detail.collectedTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
