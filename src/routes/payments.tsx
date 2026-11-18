import { useState } from "react";
import { Link, useFetcher } from "react-router";
import { CheckCircle2, ImageOff, Inbox } from "lucide-react";
import type { Route } from "./+types/payments";
import { prisma } from "@/lib/prisma.server";
import { requireTeacher } from "@/lib/auth/session.server";
import { approveProof, rejectProof } from "@/lib/proofs.server";
import { withToast } from "@/lib/toast.server";
import { amountDue } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/proofs";
import type { ActionState } from "@/lib/action-state";
import FormError from "@/components/FormError";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { card, input, primaryButton, sectionTitle, pageWidth } from "@/components/ui";
import { metaTitle, useT } from "@/lib/useT";

export const meta: Route.MetaFunction = ({ matches }) => [{ title: metaTitle(matches, "Payments") }];

const proofFields = {
  id: true,
  studentIds: true,
  amount: true,
  paidOn: true,
  method: true,
  note: true,
  imageType: true,
  status: true,
  rejectReason: true,
  reviewedAt: true,
  createdAt: true,
} as const;

export async function loader({ request }: Route.LoaderArgs) {
  await requireTeacher(request);
  const [pending, reviewed] = await Promise.all([
    prisma.paymentProof.findMany({ where: { status: "pending" }, orderBy: { createdAt: "asc" }, select: proofFields }),
    prisma.paymentProof.findMany({
      where: { status: { not: "pending" } },
      orderBy: { reviewedAt: "desc" },
      take: 20,
      select: proofFields,
    }),
  ]);

  const ids = [...new Set([...pending, ...reviewed].flatMap((p) => p.studentIds))];
  const students = await prisma.student.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      tuitionAmount: true,
      firstPaymentAmount: true,
      nextDueDate: true,
      family: { select: { id: true, name: true, guardianName: true } },
    },
  });
  const byId = Object.fromEntries(
    students.map((s) => [s.id, { id: s.id, name: s.name, due: amountDue(s), nextDueDate: s.nextDueDate, family: s.family }]),
  );
  const withStudents = <T extends { studentIds: string[] }>(p: T) => ({
    ...p,
    students: p.studentIds.map((id) => byId[id]).filter(Boolean),
  });

  return { pending: pending.map(withStudents), reviewed: reviewed.map(withStudents) };
}

export async function action({ request }: Route.ActionArgs) {
  await requireTeacher(request);
  const formData = await request.formData();
  switch (formData.get("intent")) {
    case "approve": {
      // Remember each child's due date first, so Undo can put it back.
      const proofId = String(formData.get("proofId") ?? "");
      const proof = await prisma.paymentProof.findUnique({ where: { id: proofId }, select: { studentIds: true } });
      const before = await prisma.student.findMany({
        where: { id: { in: proof?.studentIds ?? [] } },
        select: { id: true, nextDueDate: true, firstPaymentAmount: true },
      });
      return withToast(await approveProof(formData), "Payment confirmed", {
        undo: {
          kind: "proof-approve",
          proofId,
          students: before.map((s) => ({ id: s.id, nextDueDate: s.nextDueDate.toISOString(), firstPaymentAmount: s.firstPaymentAmount })),
        },
      });
    }
    case "reject":
      return withToast(await rejectProof(formData), "Marked as not accepted. The parent will see your reason.");
    default:
      return { error: "Unknown action" };
  }
}

type Proof = Route.ComponentProps["loaderData"]["pending"][number];

export default function PaymentsPage({ loaderData }: Route.ComponentProps) {
  const t = useT();
  const { pending, reviewed } = loaderData;

  return (
    <div className={pageWidth}>
      <PageHeader
        title={t("Payments")}
        description={t(
          "Parents and students pay you directly, by Zelle, cash or any other way, and tell you here. Check each one against what you received, then confirm it or say why it wasn't accepted.",
        )}
      />

      <section className="mb-10" data-tour="to-confirm">
        <h2 className={sectionTitle}>
          {t("To confirm")} <span className="font-semibold text-stone-500 tabular-nums">{pending.length}</span>
        </h2>
        {pending.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={t("Nothing to check right now")}
            body={t("When a parent or student tells you they've paid, by Zelle, cash or any other way, it shows up here for you to confirm.")}
          />
        ) : (
          <div className="space-y-4">
            {pending.map((proof) => (
              <PendingProof key={proof.id} proof={proof} />
            ))}
          </div>
        )}
      </section>

      {reviewed.length > 0 ? (
        <section className="space-y-8">
          <h2 className="text-xl font-semibold text-stone-900">{t("Reviewed payments")}</h2>
          <ReviewedList
            title={t("Approved")}
            note={t("Recorded as paid. Each has a receipt.")}
            proofs={reviewed.filter((p) => p.status === "approved")}
          />
          <ReviewedList
            title={t("Not approved")}
            note={t("You marked these as not accepted. The parent or student sees your reason.")}
            proofs={reviewed.filter((p) => p.status === "rejected")}
          />
        </section>
      ) : null}
    </div>
  );
}

/** One reviewed group (approved or not). Each student's name opens their page. */
function ReviewedList({ title, note, proofs }: { title: string; note: string; proofs: Proof[] }) {
  const t = useT();
  return (
    <div>
      <h3 className="text-lg font-semibold text-stone-900">
        {title} <span className="font-normal text-stone-500 tabular-nums">{proofs.length}</span>
      </h3>
      <p className="mb-3 text-[15px] text-stone-600">{note}</p>
      {proofs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-300 px-5 py-4 text-[15px] text-stone-600">{t("None yet.")}</p>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200/80 bg-white">
          {proofs.map((proof) => (
            <li key={proof.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
              <span className="min-w-0 flex-1 basis-56">
                <span className="flex flex-wrap gap-x-3 gap-y-1">
                  {proof.students.map((s) => (
                    <Link
                      key={s.id}
                      to={`/students/${s.id}`}
                      className="inline-flex min-h-8 items-center text-base font-semibold text-emerald-700 underline-offset-4 hover:underline"
                    >
                      {s.name}
                    </Link>
                  ))}
                </span>
                <span className="block text-[15px] text-stone-600">
                  {formatCurrency(proof.amount)} · {t(paymentMethodLabel(proof.method))} · {formatDate(proof.paidOn)}
                  {proof.rejectReason ? ` · ${proof.rejectReason}` : ""}
                </span>
              </span>
              {proof.imageType ? (
                <a
                  href={`/proofs/${proof.id}/image`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center rounded-xl border border-stone-300 px-4 text-[15px] font-semibold text-stone-700 hover:bg-stone-50"
                >
                  {t("View screenshot")}
                </a>
              ) : null}
              <StatusPill status={proof.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const t = useT();
  const styles: Record<string, string> = {
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rejected: "border-red-200 bg-red-50 text-red-700",
  };
  const labels: Record<string, string> = { pending: "Waiting", approved: "Confirmed", rejected: "Not accepted" };
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}>
      {t(labels[status] ?? status)}
    </span>
  );
}

function PendingProof({ proof }: { proof: Proof }) {
  const t = useT();
  const fetcher = useFetcher<ActionState>();
  const [rejecting, setRejecting] = useState(false);
  const busy = fetcher.state !== "idle";
  const intent = fetcher.formData?.get("intent");
  const single = proof.students.length === 1;
  const expected = proof.students.reduce((sum, s) => sum + s.due, 0);
  const family = proof.students[0]?.family;

  return (
    <fetcher.Form method="post" className={`${card} grid gap-4 sm:grid-cols-[180px_1fr]`}>
      <input type="hidden" name="proofId" value={proof.id} />

      {proof.imageType ? (
        <a
          href={`/proofs/${proof.id}/image`}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-xl border border-stone-200 bg-stone-50"
          title={t("Open full size")}
        >
          <img src={`/proofs/${proof.id}/image`} alt={t("Payment screenshot")} className="h-56 w-full object-contain sm:h-64" />
        </a>
      ) : (
        <div className="flex h-32 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-stone-300 text-sm text-stone-500 sm:h-64">
          <ImageOff className="h-5 w-5" />
          {t("No screenshot")}
        </div>
      )}

      <div className="min-w-0 space-y-3">
        <div>
          <p className="text-2xl font-bold text-stone-900 tabular-nums">{formatCurrency(proof.amount)}</p>
          <p className="text-sm text-stone-600">
            {t(paymentMethodLabel(proof.method))} · {t("paid {date}", { date: formatDate(proof.paidOn) })}
          </p>
          <p className="text-xs text-stone-500">
            {family?.guardianName ? `${t("From {name}", { name: family.guardianName })} · ` : ""}
            {t("sent {date}", { date: formatDate(proof.createdAt) })}
          </p>
          {proof.note ? <p className="mt-1 rounded-lg bg-stone-50 px-2 py-1 text-sm text-stone-700">“{proof.note}”</p> : null}
        </div>

        <ul className="space-y-2">
          {proof.students.map((s) => (
            <li key={s.id} className="flex items-end gap-3">
              <div className="min-w-0 flex-1">
                <Link to={`/students/${s.id}`} className="font-semibold text-stone-900 hover:underline">
                  {s.name}
                </Link>
                <p className="text-xs text-stone-500">
                  {t("{amount} due {date}", { amount: formatCurrency(s.due), date: formatDate(s.nextDueDate) })}
                </p>
              </div>
              <label className="w-28">
                <span className="block text-xs font-medium text-stone-600">{t("Record")}</span>
                <input
                  name={`amount_${s.id}`}
                  type="number"
                  step="0.01"
                  min="0.01"
                  defaultValue={single ? proof.amount : s.due}
                  className={`${input} mt-0.5 h-10`}
                />
              </label>
            </li>
          ))}
        </ul>
        {Math.abs(expected - proof.amount) >= 0.01 ? (
          <p className="text-xs text-amber-700">
            {t("They sent {sent}; {expected} was due.", { sent: formatCurrency(proof.amount), expected: formatCurrency(expected) })}
          </p>
        ) : null}

        <FormError message={fetcher.data?.error} />

        {rejecting ? (
          <div className="space-y-2">
            <label htmlFor={`reason-${proof.id}`} className="block text-sm font-medium text-stone-700">
              {t("Why isn't it accepted? (they'll see this)")}
            </label>
            <input id={`reason-${proof.id}`} name="reason" placeholder={t("I can't find this transfer")} className={input} />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                name="intent"
                value="reject"
                disabled={busy}
                className="min-h-11 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {busy && intent === "reject" ? t("Saving…") : t("Not accepted")}
              </button>
              <button type="button" onClick={() => setRejecting(false)} className="text-sm text-stone-500 hover:underline">
                {t("Cancel")}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" name="intent" value="approve" disabled={busy} className={primaryButton}>
              <CheckCircle2 className="h-4 w-4" />
              {busy && intent === "approve" ? t("Confirming…") : t("Confirm payment")}
            </button>
            <button
              type="button"
              onClick={() => setRejecting(true)}
              className="min-h-11 rounded-xl px-3 text-sm font-semibold text-stone-500 hover:text-red-700"
            >
              {t("Not accepted…")}
            </button>
          </div>
        )}
      </div>
    </fetcher.Form>
  );
}
