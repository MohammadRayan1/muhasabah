import { data, Link, useFetcher } from "react-router";
import { Printer } from "lucide-react";
import type { Route } from "./+types/receipt";
import { prisma } from "@/lib/prisma.server";
import { requireUser } from "@/lib/auth/session.server";
import { visibleStudentIds } from "@/lib/access.server";
import { emailReceipt } from "@/lib/mutations.server";
import { emailConfigured } from "@/lib/email.server";
import { receiptCode } from "@/lib/reminders";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ActionState } from "@/lib/action-state";
import GeometricPattern from "@/components/GeometricPattern";
import { secondaryButton } from "@/components/ui";

export const meta: Route.MetaFunction = ({ data }) => [
  { title: data ? `Receipt ${receiptCode(data.payment.receiptNumber)} · Muhasabah` : "Receipt" },
];

async function loadPayment(request: Request, paymentId: string) {
  const session = await requireUser(request);
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      student: {
        include: { family: true, enrollments: { include: { program: { select: { name: true } } } } },
      },
    },
  });
  if (!payment) throw data("Not found", { status: 404 });
  if (session.role !== "TEACHER") {
    const allowed = await visibleStudentIds(session);
    if (!allowed.includes(payment.studentId)) throw data("Not found", { status: 404 });
  }
  return { session, payment };
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, payment } = await loadPayment(request, params.paymentId);
  const isTeacher = session.role === "TEACHER";
  const emailTo = payment.student.family?.email || payment.student.email;
  return {
    payment,
    isTeacher,
    emailTo: isTeacher && emailConfigured() ? emailTo : null,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { session } = await loadPayment(request, params.paymentId);
  if (session.role !== "TEACHER") return { error: "Only your teacher can email receipts" };
  const formData = new FormData();
  formData.set("paymentId", params.paymentId);
  return emailReceipt(formData);
}

export default function ReceiptPage({ loaderData }: Route.ComponentProps) {
  const { payment, isTeacher, emailTo } = loaderData;
  const { student } = payment;
  const programs = student.enrollments.map((e) => e.program.name).join(", ");
  const fetcher = useFetcher<ActionState>();

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10 print:max-w-none print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 pr-14 print:hidden">
        <Link
          to={isTeacher ? `/students/${student.id}` : "/portal"}
          className="text-sm text-stone-500 hover:underline"
        >
          ← Back
        </Link>
        <div className="flex flex-wrap gap-2">
          {emailTo ? (
            <fetcher.Form method="post">
              <button type="submit" disabled={fetcher.state !== "idle"} className={secondaryButton}>
                {fetcher.state !== "idle" ? "Sending…" : `Email to ${emailTo}`}
              </button>
            </fetcher.Form>
          ) : null}
          <button type="button" onClick={() => window.print()} className={secondaryButton}>
            <Printer className="h-4 w-4" /> Print or save PDF
          </button>
        </div>
      </div>
      {fetcher.data?.error ? (
        <p role="alert" className="mb-4 text-sm text-red-700 print:hidden">{fetcher.data.error}</p>
      ) : fetcher.data?.message ? (
        <p className="mb-4 text-sm text-emerald-700 print:hidden">{fetcher.data.message}</p>
      ) : null}

      <article className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5 print:rounded-none print:border-0 print:shadow-none">
        <header className="relative overflow-hidden bg-sidebar px-8 py-7 text-sidebar-foreground print:bg-white print:text-stone-900">
          <GeometricPattern className="text-sidebar-foreground opacity-[0.06] print:hidden" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-sidebar-muted print:text-stone-500">Receipt</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{receiptCode(payment.receiptNumber)}</p>
            </div>
            <p lang="ar" dir="rtl" className="font-arabic text-4xl leading-tight text-gold">
              محاسبة
            </p>
          </div>
        </header>

        <div className="px-8 py-7">
          <p className="text-sm text-stone-500">Received with thanks</p>
          <p className="mt-1 text-4xl font-bold text-stone-900 tabular-nums">{formatCurrency(payment.amount)}</p>

          <dl className="mt-7 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            <dt className="text-stone-500">Student</dt>
            <dd className="font-semibold text-stone-900">{student.name}</dd>
            {student.family ? (
              <>
                <dt className="text-stone-500">Family</dt>
                <dd className="text-stone-900">
                  {student.family.name}
                  {student.family.guardianName ? ` · ${student.family.guardianName}` : ""}
                </dd>
              </>
            ) : null}
            {programs ? (
              <>
                <dt className="text-stone-500">Program</dt>
                <dd className="text-stone-900">{programs}</dd>
              </>
            ) : null}
            <dt className="text-stone-500">Date paid</dt>
            <dd className="text-stone-900">{formatDate(payment.paidAt)}</dd>
            <dt className="text-stone-500">Paid by</dt>
            <dd className="text-stone-900">{payment.method === "card" ? "Card, online" : "Recorded by teacher"}</dd>
            {payment.note ? (
              <>
                <dt className="text-stone-500">Note</dt>
                <dd className="text-stone-900">{payment.note}</dd>
              </>
            ) : null}
          </dl>

          <p className="mt-8 border-t border-stone-200 pt-5 text-sm text-stone-500">
            JazakAllahu khayran. May Allah put barakah in your child&apos;s learning.
          </p>
        </div>
      </article>
    </main>
  );
}
