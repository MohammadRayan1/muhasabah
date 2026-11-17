import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { CheckCircle2, FileImage, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/proofs";
import FormError from "@/components/FormError";
import { input, primaryButton } from "@/components/ui";
import { useT } from "@/lib/useT";

export type PendingProof = {
  id: string;
  amount: number;
  method: string;
  paidOn: Date;
  note: string | null;
  imageType: string | null;
  studentIds: string[];
};

type ActionResult = { ok?: boolean; error?: string } | undefined;

// Close once per successful result; reopening later must not see the old success.
function useCloseOnSuccess(state: string, data: ActionResult, onDone: () => void) {
  const handled = useRef<ActionResult>(undefined);
  useEffect(() => {
    if (state === "idle" && data?.ok && handled.current !== data) {
      handled.current = data;
      onDone();
    }
  });
}

/**
 * "Record payment" opens this instead of saving straight away. Every payment,
 * cash included, starts as a submission from the family; the teacher confirms it
 * or marks it not accepted.
 */
export default function RecordPaymentDialog({
  student,
  amountDue,
  dueDate,
  proofs,
}: {
  student: { id: string; name: string };
  amountDue: number;
  dueDate: Date;
  proofs: PendingProof[];
}) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
      >
        {t("Record payment")}
        {proofs.length > 0 ? (
          <span className="rounded-full bg-white/20 px-1.5 text-xs tabular-nums" aria-label={t("{n} proofs waiting", { n: proofs.length })}>
            {proofs.length}
          </span>
        ) : null}
      </button>

      <dialog
        ref={ref}
        aria-labelledby={`pay-title-${student.id}`}
        className="sheet m-auto w-[calc(100%-2rem)] max-w-lg rounded-3xl border border-stone-200 bg-white p-0 text-stone-700 shadow-2xl shadow-stone-900/20 backdrop:bg-stone-950/40 backdrop:backdrop-blur-[2px]"
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-6 py-5">
          <div>
            <h2 id={`pay-title-${student.id}`} className="text-lg font-bold text-stone-900">
              {t("Record payment")} · {student.name}
            </h2>
            <p className="mt-0.5 text-sm text-stone-500 tabular-nums">
              {t("{amount} due {date}", { amount: formatCurrency(amountDue), date: formatDate(dueDate) })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label={t("Close")}
            className="-me-2 flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70dvh] space-y-6 overflow-y-auto px-6 py-5">
          <section aria-labelledby={`proofs-${student.id}`}>
            <h3 id={`proofs-${student.id}`} className="mb-3 flex items-center gap-2 text-sm font-bold text-stone-900">
              <FileImage aria-hidden className="h-4 w-4 text-stone-500" />
              {t("Submitted by the family")}
            </h3>
            {proofs.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-4 text-sm leading-relaxed text-stone-500">
                {t("Nothing submitted yet. Families submit every payment, including cash, from their portal. Once they do, you can confirm it here.")}
              </p>
            ) : (
              <ul className="space-y-3">
                {proofs.map((proof) => (
                  <ProofItem key={proof.id} proof={proof} studentId={student.id} onDone={() => ref.current?.close()} />
                ))}
              </ul>
            )}
          </section>

        </div>
      </dialog>
    </>
  );
}

function ProofItem({ proof, studentId, onDone }: { proof: PendingProof; studentId: string; onDone: () => void }) {
  const t = useT();
  const fetcher = useFetcher<ActionResult>();
  const [rejecting, setRejecting] = useState(false);
  const busy = fetcher.state !== "idle";
  const others = proof.studentIds.length - 1;

  useCloseOnSuccess(fetcher.state, fetcher.data, onDone);

  return (
    <li className="overflow-hidden rounded-2xl border border-stone-200">
      {proof.imageType ? (
        <a href={`/proofs/${proof.id}/image`} target="_blank" rel="noreferrer" className="block bg-stone-100">
          <img
            src={`/proofs/${proof.id}/image`}
            alt={t("Payment screenshot")}
            className="mx-auto max-h-64 w-full object-contain"
            loading="lazy"
          />
        </a>
      ) : null}
      <fetcher.Form method="post" action="/payments" className="space-y-3 p-4">
        <input type="hidden" name="proofId" value={proof.id} />
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-base font-bold text-stone-900 tabular-nums">{formatCurrency(proof.amount)}</p>
          <p className="text-sm text-stone-500">
            {t(paymentMethodLabel(proof.method))} · {formatDate(proof.paidOn)}
          </p>
        </div>
        {proof.note ? <p className="text-sm text-stone-600">“{proof.note}”</p> : null}
        {others > 0 ? (
          <p className="text-xs text-stone-500">
            {others === 1 ? t("Also covers 1 sibling.") : t("Also covers {n} siblings.", { n: others })}
          </p>
        ) : (
          <input type="hidden" name={`amount_${studentId}`} value={proof.amount} />
        )}
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
                className="min-h-11 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {busy ? t("Saving…") : t("Not accepted")}
              </button>
              <button type="button" onClick={() => setRejecting(false)} className="text-sm font-semibold text-stone-500 hover:underline">
                {t("Cancel")}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" name="intent" value="approve" disabled={busy} className={primaryButton}>
              <CheckCircle2 aria-hidden className="h-4 w-4" />
              {busy ? t("Confirming…") : t("Confirm payment")}
            </button>
            <button
              type="button"
              onClick={() => setRejecting(true)}
              className="min-h-11 rounded-xl px-3 text-sm font-semibold text-stone-500 transition-colors hover:text-red-700"
            >
              {t("Not accepted…")}
            </button>
          </div>
        )}
      </fetcher.Form>
    </li>
  );
}
