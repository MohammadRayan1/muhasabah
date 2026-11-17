import { Form, Link, redirect } from "react-router";
import { useEffect, useState } from "react";
import { ArrowDown, CalendarDays, Compass, CheckCircle2, Clock, LogOut, MapPin, Receipt as ReceiptIcon, XCircle } from "lucide-react";
import type { Route } from "./+types/portal";
import { daysLabel } from "@/lib/pricing";
import { prisma } from "@/lib/prisma.server";
import { requireUser } from "@/lib/auth/session.server";
import { visibleStudentIds } from "@/lib/access.server";
import { submitProof } from "@/lib/proofs.server";
import { paymentMethodLabel } from "@/lib/proofs";
import ProofUploadForm from "@/components/ProofUploadForm";
import GeometricPattern from "@/components/GeometricPattern";
import {
  amountDue,
  getPaymentStatus,
  STATUS_BADGE_STYLES,
  STATUS_LABEL,
} from "@/lib/status";
import { receiptCode } from "@/lib/reminders";
import { formatCurrency, formatDate } from "@/lib/format";
import FormError from "@/components/FormError";
import Avatar from "@/components/Avatar";
import Tour, { hasSeenTour } from "@/components/Tour";
import { PARENT_TOUR, PARENT_TOUR_KEY } from "@/lib/tours";
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
      family: { select: { name: true, guardianName: true } },
      payments: { orderBy: { paidAt: "desc" } },
      enrollments: { include: { program: true } },
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
        <LogOut aria-hidden className="h-4 w-4 rtl:-scale-x-100" strokeWidth={2} />
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
  const [touring, setTouring] = useState(false);

  // First visit: offer the walkthrough once (after approval, when there's something to show).
  const hasActive = loaderData.students.some((s) => !s.pendingApproval);
  useEffect(() => {
    if (!hasActive || hasSeenTour(PARENT_TOUR_KEY)) return;
    const id = window.setTimeout(() => setTouring(true), 600);
    return () => window.clearTimeout(id);
  }, [hasActive]);
  const { students, email, proofs, welcome } = loaderData;

  if (students.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-sm text-stone-500">
          {t("Your account isn't linked to a student yet. Contact your teacher.")}
        </p>
        <div className="mt-4">
          <LogoutButton className="inline-flex items-center gap-2 text-sm text-stone-500 hover:underline" />
        </div>
      </main>
    );
  }

  const family = students[0].family;
  const heading = students.length > 1 && family?.name ? family.name : students[0].name;
  const greetingName = family?.guardianName?.split(" ")[0] ?? students[0].name.split(" ")[0];
  const active = students.filter((s) => !s.pendingApproval);
  const payable = active.map((s) => ({
    id: s.id,
    name: s.name,
    due: amountDue(s),
    overdueOrSoon: getPaymentStatus(s.nextDueDate).status !== "ok",
  }));
  const dueNow = active.filter((s) => getPaymentStatus(s.nextDueDate).status !== "ok");
  const owedNow = dueNow.reduce((sum, s) => sum + amountDue(s), 0);
  const next = [...active].sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())[0];
  const overdue = dueNow.some((s) => getPaymentStatus(s.nextDueDate).status === "overdue");
  const waitingProof = proofs.some((p) => p.status === "pending");

  return (
    <>
      {/* Outside the animated <main>: a transformed ancestor would pin the tour to the page, not the screen. */}
      <Tour steps={PARENT_TOUR} storageKey={PARENT_TOUR_KEY} open={touring} onClose={() => setTouring(false)} />
      <main className="page-enter min-h-screen pb-16">
      <header className="relative overflow-hidden bg-sidebar text-sidebar-foreground">
        <GeometricPattern className="text-sidebar-foreground opacity-[0.06]" />
        <div className="relative mx-auto max-w-2xl px-4 pt-6 pb-24 sm:px-6">
          <div className="flex items-center justify-between gap-4 pe-24">
            <p className="flex items-baseline gap-2 text-sm font-semibold text-sidebar-muted">
              Muhasabah
              <span lang="ar" className="font-arabic text-base font-normal text-gold">
                محاسبة
              </span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTouring(true)}
                data-tour="tour-button"
                className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 px-3.5 text-sm font-semibold text-sidebar-foreground transition-colors hover:bg-white/10"
              >
                <Compass aria-hidden className="h-4 w-4" />
                <span className="hidden sm:inline">{t("Take the tour")}</span>
                <span className="sm:hidden">{t("Tour")}</span>
              </button>
              <LogoutButton className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 px-3.5 text-sm font-semibold text-sidebar-foreground transition-colors hover:bg-white/10" />
            </div>
          </div>
          <p className="mt-10 text-sidebar-muted">{t("Assalamu alaikum, {name}", { name: greetingName })}</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{heading}</h1>
          <p className="mt-1 text-sm text-sidebar-muted">{email}</p>
        </div>
      </header>

      <div className="relative mx-auto -mt-16 max-w-2xl space-y-8 px-4 sm:px-6">
        {welcome ? (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm leading-relaxed text-emerald-700 shadow-sm">
            {t("JazakAllahu khayran for registering! Your teacher will review it soon. Once approved, your bills and receipts will appear here.")}
          </p>
        ) : null}
        <FormError message={actionData?.error} />

        {active.length > 0 && next ? (
          <section data-tour="due" aria-labelledby="balance-title" className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-900/5 sm:p-7">
            <h2 id="balance-title" className="text-sm font-semibold text-stone-500">
              {owedNow > 0 ? t("Due now") : t("Next bill")}
            </h2>
            <p className="mt-1 text-4xl font-bold text-stone-900 tabular-nums">
              {formatCurrency(owedNow > 0 ? owedNow : amountDue(next))}
            </p>
            <p className={`mt-2 text-sm font-medium ${overdue ? "text-red-700" : owedNow > 0 ? "text-amber-700" : "text-stone-600"}`}>
              {owedNow > 0
                ? overdue
                  ? t("Past due. Please pay your teacher and send the proof below.")
                  : t("Due {date}. Pay your teacher, then send the proof below.", { date: formatDate(dueNow[0].nextDueDate) })
                : t("Due {date}. Nothing to pay yet.", { date: formatDate(next.nextDueDate) })}
            </p>
            {waitingProof ? (
              <p className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
                <Clock aria-hidden className="h-4 w-4 shrink-0" />
                {t("Your proof is with your teacher. It moves to your history once confirmed.")}
              </p>
            ) : owedNow > 0 ? (
              <a href="#pay" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
                {t("Send payment proof")}
                <ArrowDown aria-hidden className="h-4 w-4" />
              </a>
            ) : null}
          </section>
        ) : null}

        {students.map((student) => {
          const { status } = getPaymentStatus(student.nextDueDate);
          const totalPaid = student.payments.reduce((sum, p) => sum + p.amount, 0);

          return (
            <section
              key={student.id}
              data-tour={student.id === students[0].id ? "child" : undefined}
              aria-labelledby={`student-${student.id}`}
              className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5"
            >
              <div className="flex items-center gap-4 border-b border-stone-100 px-6 py-5">
                <Avatar name={student.name} />
                <div className="min-w-0 flex-1">
                  <h2 id={`student-${student.id}`} className="truncate text-lg font-bold text-stone-900">
                    {student.name}
                  </h2>
                  {student.pendingApproval ? (
                    <p className="text-sm text-amber-700">{t("Waiting for your teacher to confirm")}</p>
                  ) : (
                    <p className="text-sm text-stone-500 tabular-nums">
                      {t("{amount}/month", { amount: formatCurrency(student.tuitionAmount) })} ·{" "}
                      {t("{amount} paid so far", { amount: formatCurrency(totalPaid) })}
                    </p>
                  )}
                </div>
                {student.pendingApproval ? null : (
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE_STYLES[status]}`}>
                    {t(STATUS_LABEL[status])}
                  </span>
                )}
              </div>

              {student.enrollments.length > 0 ? (
                <ul className="divide-y divide-stone-100">
                  {student.enrollments.map((enrollment) => (
                    <li key={enrollment.id} className="px-6 py-4">
                      <p className="font-semibold text-stone-900">
                        {enrollment.program.name}
                        {enrollment.daysPerWeek ? (
                          <span className="ms-2 text-sm font-normal text-stone-500">{t(daysLabel(enrollment.daysPerWeek))}</span>
                        ) : null}
                      </p>
                      <p className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-stone-600">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays aria-hidden className="h-4 w-4 text-stone-400" />
                          {enrollment.program.days}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock aria-hidden className="h-4 w-4 text-stone-400" />
                          {enrollment.program.time}
                        </span>
                        {enrollment.program.location ? (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin aria-hidden className="h-4 w-4 text-stone-400" />
                            {enrollment.program.location}
                          </span>
                        ) : null}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}

              {student.pendingApproval ? (
                <p className="bg-amber-50/60 px-6 py-4 text-sm text-stone-600">
                  {t("Starting {date}", { date: formatDate(student.joinedAt) })}
                </p>
              ) : (
                <div className="border-t border-stone-100 bg-stone-50/60 px-6 py-4">
                  <h3 className="mb-2 text-sm font-semibold text-stone-500">{t("Payment history")}</h3>
                  {student.payments.length === 0 ? (
                    <p className="text-sm text-stone-500">{t("No payments recorded yet.")}</p>
                  ) : (
                    <ul className="space-y-1">
                      {student.payments.map((payment) => (
                        <li key={payment.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                          <span className="text-stone-700">
                            {formatDate(payment.paidAt)}
                            {payment.method !== "manual" ? (
                              <span className="text-stone-500"> · {t(paymentMethodLabel(payment.method))}</span>
                            ) : null}
                          </span>
                          <span className="flex items-center gap-4">
                            <span className="font-semibold text-stone-900 tabular-nums">{formatCurrency(payment.amount)}</span>
                            <Link
                              to={`/receipts/${payment.id}`}
                              className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
                            >
                              <ReceiptIcon aria-hidden className="h-3.5 w-3.5" />
                              {receiptCode(payment.receiptNumber)}
                            </Link>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>
          );
        })}

        {payable.length > 0 ? (
          <section id="pay" data-tour="pay" className="scroll-mt-6 space-y-4">
            <ProofUploadForm students={payable} />
            {proofs.length > 0 ? <ProofList proofs={proofs} /> : null}
          </section>
        ) : null}

      </div>
      </main>
    </>
  );
}

type ProofRow = { id: string; amount: number; method: string; paidOn: Date; status: string; rejectReason: string | null; imageType: string | null };

/** What the family has sent and where each one stands. */
function ProofList({ proofs }: { proofs: ProofRow[] }) {
  const t = useT();
  return (
    <div>
      <h3 className="mb-3 mt-8 text-lg font-bold text-stone-900">{t("Submitted payment proofs")}</h3>
      <ul className="divide-y divide-stone-100 rounded-3xl border border-stone-200 bg-white px-2 shadow-sm shadow-stone-900/5">
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
