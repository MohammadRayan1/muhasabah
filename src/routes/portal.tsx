import { Form, Link, redirect, useNavigation } from "react-router";
import { CheckCircle2, CreditCard } from "lucide-react";
import type { Route } from "./+types/portal";
import { prisma } from "@/lib/prisma.server";
import { requireUser } from "@/lib/auth/session.server";
import { visibleStudentIds } from "@/lib/access.server";
import { createCheckout, stripeEnabled } from "@/lib/stripe.server";
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
import { card, primaryButton } from "@/components/ui";

export const meta: Route.MetaFunction = () => [
  { title: "Your portal · Muhasabah" },
];

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
    canPayOnline: stripeEnabled(),
    paid: params.get("paid") === "1",
    welcome: params.get("welcome") === "1",
  };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireUser(request);
  const formData = await request.formData();
  const studentId = String(formData.get("studentId") ?? "");

  if (!stripeEnabled())
    return {
      error:
        "Online payment isn't available yet. Please pay your teacher directly.",
    };
  const allowed = await visibleStudentIds(session);
  if (!allowed.includes(studentId)) return { error: "Student not found" };
  const target = await prisma.student.findUnique({
    where: { id: studentId },
    select: { pendingApproval: true },
  });
  if (target?.pendingApproval)
    return { error: "Your teacher hasn't confirmed this sign-up yet." };

  try {
    throw redirect(await createCheckout(studentId));
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("[stripe checkout]", error);
    return {
      error: "Couldn't start the payment. Please try again in a minute.",
    };
  }
}

function LogoutButton({ className }: { className: string }) {
  return (
    <Form method="post" action="/logout">
      <button type="submit" className={className}>
        Log out
      </button>
    </Form>
  );
}

export default function PortalPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { students, email, canPayOnline, paid, welcome } = loaderData;
  const navigation = useNavigation();

  if (students.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-sm text-stone-500">
          Your account isn&apos;t linked to a student yet. Contact your teacher.
        </p>
        <div className="mt-4">
          <LogoutButton className="text-sm text-stone-500 hover:underline" />
        </div>
      </main>
    );
  }

  const familyName = students[0].family?.name;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex items-start justify-between gap-4 pr-14">
        <div>
          <p className="mb-1 text-sm font-medium text-emerald-700">
            Muhasabah{" "}
            <span lang="ar" dir="rtl">
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

      {paid ? (
        <p className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> JazakAllahu khayran! Your payment
          went through. It can take a minute to show up below.
        </p>
      ) : null}
      {welcome ? (
        <p className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          JazakAllahu khayran for signing up! Your teacher will confirm soon.
          Once they do, bills and progress show up here.
        </p>
      ) : null}
      <FormError message={actionData?.error} />

      <div className="space-y-12">
        {students.map((student) => {
          const { status } = getPaymentStatus(student.nextDueDate);
          const totalPaid = student.payments.reduce(
            (sum, p) => sum + p.amount,
            0,
          );
          const paying =
            navigation.state !== "idle" &&
            navigation.formData?.get("studentId") === student.id;

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
                    Waiting for your teacher to confirm
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    Starting {formatDate(student.joinedAt)} ·{" "}
                    {student.enrollments.map((e) => e.program.name).join(", ")}
                  </p>
                </div>
              ) : (
                <>
                  <div
                    className={`${card} mb-6 flex flex-wrap items-center justify-between gap-4`}
                  >
                    <div>
                      <p className="text-sm text-stone-500">Next bill</p>
                      <p className="text-2xl font-bold text-stone-900 tabular-nums">
                        {formatCurrency(amountDue(student))}
                        <span className="ml-2 text-base font-medium text-stone-500">
                          due {formatDate(student.nextDueDate)}
                        </span>
                      </p>
                      <span
                        className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_STYLES[status]}`}
                      >
                        {STATUS_LABEL[status]}
                      </span>
                    </div>
                    {canPayOnline ? (
                      <Form method="post">
                        <input
                          type="hidden"
                          name="studentId"
                          value={student.id}
                        />
                        <button
                          type="submit"
                          disabled={paying}
                          className={primaryButton}
                        >
                          <CreditCard className="h-4 w-4" />
                          {paying
                            ? "Opening…"
                            : `Pay ${formatCurrency(amountDue(student))} online`}
                        </button>
                      </Form>
                    ) : null}
                  </div>

                  <div className="mb-6 grid grid-cols-2 gap-4">
                    <div className={card}>
                      <p className="text-lg font-semibold text-stone-900">
                        {formatCurrency(student.tuitionAmount)}
                      </p>
                      <p className="text-sm text-stone-500">Tuition / month</p>
                    </div>
                    <div className={card}>
                      <p className="text-lg font-semibold text-stone-900">
                        {formatCurrency(totalPaid)}
                      </p>
                      <p className="text-sm text-stone-500">Total paid</p>
                    </div>
                  </div>

                  {student.enrollments.length > 0 ? (
                    <div className="mb-6">
                      <h3 className="mb-2 font-bold text-stone-900">
                        Programs
                      </h3>
                      <div className="space-y-2">
                        {student.enrollments.map((enrollment) => (
                          <div key={enrollment.id} className={card}>
                            <p className="font-medium text-stone-900">
                              {enrollment.program.name}
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
                        Quran progress
                      </h3>
                      <ProgressSummary entries={student.progress} />
                      <ProgressList entries={student.progress} />
                    </div>
                  ) : null}

                  <h3 className="mb-2 font-bold text-stone-900">
                    Payment history
                  </h3>
                  {student.payments.length === 0 ? (
                    <p className="text-sm text-stone-500">
                      No payments recorded yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5">
                      <table className="w-full text-sm">
                        <thead className="bg-stone-50 text-left text-stone-500">
                          <tr>
                            <th className="px-4 py-2 font-medium">Date</th>
                            <th className="px-4 py-2 text-right font-medium">
                              Amount
                            </th>
                            <th className="px-4 py-2 text-right font-medium">
                              Receipt
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200">
                          {student.payments.map((payment) => (
                            <tr key={payment.id}>
                              <td className="px-4 py-3 text-stone-900">
                                {formatDate(payment.paidAt)}
                              </td>
                              <td className="px-4 py-3 text-right text-stone-700">
                                {formatCurrency(payment.amount)}
                              </td>
                              <td className="px-4 py-3 text-right">
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
