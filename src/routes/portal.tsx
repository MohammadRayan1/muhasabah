import { Form, Link, redirect } from "react-router";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import type { Route } from "./+types/portal";
import { daysLabel } from "@/lib/pricing";
import { prisma } from "@/lib/prisma.server";
import { requireUser } from "@/lib/auth/session.server";
import { visibleStudentIds } from "@/lib/access.server";
import { submitProof } from "@/lib/proofs.server";
import { paymentMethodLabel } from "@/lib/proofs";
import ProofUploadForm from "@/components/ProofUploadForm";
import {
  amountDue,
  getPaymentStatus,
  STATUS_BADGE_STYLES,
  STATUS_LABEL,
} from "@/lib/status";
import { receiptCode } from "@/lib/reminders";
import { formatCurrency, formatDate } from "@/lib/format";
import FormError from "@/components/FormError";
import { ProgressList, ProgressSummary } from "@/components/ProgressLog";
import { card } from "@/components/ui";
import { metaTitle, useT } from "@/lib/useT";

export const meta: Route.MetaFunction = ({ matches }) => [{ title: metaTitle(matches, "Your portal") }];

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireUser(request);
  if (session.role === "TEACHER") throw redirect("/");

  const [user, ids] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true },
    }),
    visibleStudentIds(session),
  ]);

  const students = await prisma.student.findMany({
    where: { id: { in: ids } },
    orderBy: { name: "asc" },
    include: {
      family: { select: { name: true } },
      payments: { orderBy: { paidAt: "desc" } },
      enrollments: { include: { program: true } },
      progress: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 15,
      },
    },
  });

  const params = new URL(request.url).searchParams;
  return {
    email: user?.email ?? "",
    students,
    proofs: await prisma.paymentProof.findMany({
      where: { studentIds: { hasSome: ids } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, amount: true, method: true, paidOn: true, status: true, rejectReason: true, imageType: true },
    }),
    welcome: params.get("welcome") === "1",
  };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireUser(request);
  const formData = await request.formData();
  if (formData.get("intent") === "proof") return submitProof(session, formData);
  return { error: "Unknown action" };
}

function LogoutButton({ className }: { className: string }) {
  const t = useT();
  return (
    <Form method="post" action="/logout">
      <button type="submit" className={className}>
        {t("Log out")}
      </button>
    </Form>
  );
}

export default function PortalPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const t = useT();
  const { students, email, proofs, welcome } = loaderData;

  if (students.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-sm text-stone-500">
          {t("Your account isn't linked to a student yet. Contact your teacher.")}
        </p>
        <div className="mt-4">
          <LogoutButton className="text-sm text-stone-500 hover:underline" />
        </div>
      </main>
    );
  }

  const familyName = students[0].family?.name;
  const payable = students
    .filter((s) => !s.pendingApproval)
    .map((s) => ({
      id: s.id,
      name: s.name,
      due: amountDue(s),
      overdueOrSoon: getPaymentStatus(s.nextDueDate).status !== "ok",
    }));

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex items-start justify-between gap-4 pe-28">
        <div>
          <p className="mb-1 text-sm font-medium text-emerald-700">
            Muhasabah{" "}
            <span lang="ar">
              محاسبة
            </span>
          </p>
          <h1 className="text-2xl font-bold text-stone-900">
            {students.length > 1 && familyName ? familyName : students[0].name}
          </h1>
          <p className="text-sm text-stone-500">{email}</p>
        </div>
        <LogoutButton className="pt-1 text-sm text-stone-500 hover:text-stone-700 hover:underline" />
      </div>

      {welcome ? (
        <p className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {t("JazakAllahu khayran for signing up! Your teacher will confirm soon. Once they do, bills and progress show up here.")}
        </p>
      ) : null}
      <FormError message={actionData?.error} />

      {payable.length > 0 ? (
        <section className="mb-10 space-y-4">
          <ProofUploadForm students={payable} />
          {proofs.length > 0 ? <ProofList proofs={proofs} /> : null}
        </section>
      ) : null}

      <div className="space-y-12">
        {students.map((student) => {
          const { status } = getPaymentStatus(student.nextDueDate);
          const totalPaid = student.payments.reduce(
            (sum, p) => sum + p.amount,
            0,
          );

          return (
            <section key={student.id} aria-labelledby={`student-${student.id}`}>
              {students.length > 1 ? (
                <h2
                  id={`student-${student.id}`}
                  className="mb-3 text-xl font-bold text-stone-900"
                >
                  {student.name}
                </h2>
              ) : (
                <h2 id={`student-${student.id}`} className="sr-only">
                  {student.name}
                </h2>
              )}

              {student.pendingApproval ? (
                <div className={`${card} border-amber-200 bg-amber-50`}>
                  <p className="font-semibold text-amber-700">
                    {t("Waiting for your teacher to confirm")}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    {t("Starting {date}", { date: formatDate(student.joinedAt) })} ·{" "}
                    {student.enrollments
                      .map((e) => `${e.program.name}, ${t(daysLabel(e.daysPerWeek ?? e.program.daysPerWeek))}`)
                      .join(" · ")}
                  </p>
                </div>
              ) : (
                <>
                  <div
                    className={`${card} mb-6 flex flex-wrap items-center justify-between gap-4`}
                  >
                    <div>
                      <p className="text-sm text-stone-500">{t("Next bill")}</p>
                      <p className="text-2xl font-bold text-stone-900 tabular-nums">
                        {formatCurrency(amountDue(student))}
                        <span className="ms-2 text-base font-medium text-stone-500">
                          {t("due {date}", { date: formatDate(student.nextDueDate) })}
                        </span>
                      </p>
                      <span
                        className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_STYLES[status]}`}
                      >
                        {t(STATUS_LABEL[status])}
                      </span>
                    </div>
                  </div>

                  <div className="mb-6 grid grid-cols-2 gap-4">
                    <div className={card}>
                      <p className="text-lg font-semibold text-stone-900">
                        {formatCurrency(student.tuitionAmount)}
                      </p>
                      <p className="text-sm text-stone-500">{t("Tuition / month")}</p>
                    </div>
                    <div className={card}>
                      <p className="text-lg font-semibold text-stone-900">
                        {formatCurrency(totalPaid)}
                      </p>
                      <p className="text-sm text-stone-500">{t("Total paid")}</p>
                    </div>
                  </div>

                  {student.enrollments.length > 0 ? (
                    <div className="mb-6">
                      <h3 className="mb-2 font-bold text-stone-900">
                        {t("Programs")}
                      </h3>
                      <div className="space-y-2">
                        {student.enrollments.map((enrollment) => (
                          <div key={enrollment.id} className={card}>
                            <p className="font-medium text-stone-900">
                              {enrollment.program.name}
                              {enrollment.daysPerWeek ? (
                                <span className="ms-2 text-sm font-normal text-stone-500">
                                  {t(daysLabel(enrollment.daysPerWeek))}
                                </span>
                              ) : null}
                            </p>
                            <p className="text-sm text-stone-500">
                              {enrollment.program.days} ·{" "}
                              {enrollment.program.time} ·{" "}
                              {enrollment.program.location}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {student.progress.length > 0 ? (
                    <div className="mb-6">
                      <h3 className="mb-2 font-bold text-stone-900">
                        {t("Quran progress")}
                      </h3>
                      <ProgressSummary entries={student.progress} />
                      <ProgressList entries={student.progress} />
                    </div>
                  ) : null}

                  <h3 className="mb-2 font-bold text-stone-900">
                    {t("Payment history")}
                  </h3>
                  {student.payments.length === 0 ? (
                    <p className="text-sm text-stone-500">
                      {t("No payments recorded yet.")}
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5">
                      <table className="w-full text-sm">
                        <thead className="bg-stone-50 text-start text-stone-500">
                          <tr>
                            <th className="px-4 py-2 font-medium">{t("Date")}</th>
                            <th className="px-4 py-2 text-end font-medium">
                              {t("Amount")}
                            </th>
                            <th className="px-4 py-2 text-end font-medium">
                              {t("Receipt")}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200">
                          {student.payments.map((payment) => (
                            <tr key={payment.id}>
                              <td className="px-4 py-3 text-stone-900">
                                {formatDate(payment.paidAt)}
                              </td>
                              <td className="px-4 py-3 text-end text-stone-700">
                                {formatCurrency(payment.amount)}
                                {payment.method !== "manual" ? (
                                  <span className="block text-xs text-stone-500">{t(paymentMethodLabel(payment.method))}</span>
                                ) : null}
                              </td>
                              <td className="px-4 py-3 text-end">
                                <Link
                                  to={`/receipts/${payment.id}`}
                                  className="text-emerald-700 hover:underline"
                                >
                                  {receiptCode(payment.receiptNumber)}
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}

type ProofRow = { id: string; amount: number; method: string; paidOn: Date; status: string; rejectReason: string | null; imageType: string | null };

/** What the family has sent and where each one stands. */
function ProofList({ proofs }: { proofs: ProofRow[] }) {
  const t = useT();
  return (
    <div>
      <h3 className="mb-2 font-bold text-stone-900">{t("Proofs you've sent")}</h3>
      <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5">
        {proofs.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
            {p.status === "approved" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : p.status === "rejected" ? (
              <XCircle className="h-4 w-4 shrink-0 text-red-600" />
            ) : (
              <Clock className="h-4 w-4 shrink-0 text-amber-600" />
            )}
            <span className="min-w-0 flex-1">
              <span className="font-semibold text-stone-900 tabular-nums">{formatCurrency(p.amount)}</span>{" "}
              <span className="text-stone-500">
                · {t(paymentMethodLabel(p.method))} · {formatDate(p.paidOn)}
              </span>
              {p.status === "rejected" ? (
                <span className="block text-red-700">
                  {t("Not accepted")}
                  {p.rejectReason ? `: ${p.rejectReason}` : ""}
                </span>
              ) : (
                <span className={`block ${p.status === "approved" ? "text-emerald-700" : "text-amber-700"}`}>
                  {p.status === "approved" ? t("Confirmed by your teacher") : t("Waiting for your teacher to check")}
                </span>
              )}
            </span>
            {p.imageType ? (
              <a href={`/proofs/${p.id}/image`} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">
                {t("View")}
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
