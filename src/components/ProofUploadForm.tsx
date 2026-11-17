import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { ImagePlus, Send } from "lucide-react";
import { toDateInputValue } from "@/lib/dates";
import { formatCurrency } from "@/lib/format";
import { PROOF_METHODS, proofImageRequired, type ProofMethod } from "@/lib/proofs";
import type { ActionState } from "@/lib/action-state";
import FormError from "@/components/FormError";
import { input, label, primaryButton } from "@/components/ui";
import { useT } from "@/lib/useT";

type PayableStudent = { id: string; name: string; due: number; overdueOrSoon: boolean };

/**
 * Shrink a phone photo to at most 1600px on its long side as a JPEG, so a 4MB
 * screenshot becomes a few hundred KB. Falls back to the original if the browser
 * can't decode it (the server then checks type and size).
 */
async function shrink(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    return blob ? new File([blob], "proof.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

/** "I paid": the family picks who it's for, the amount, how, and adds a screenshot. */
export default function ProofUploadForm({ students }: { students: PayableStudent[] }) {
  const t = useT();
  const fetcher = useFetcher<ActionState>();
  const formRef = useRef<HTMLFormElement>(null);
  const [selected, setSelected] = useState<Set<string>>(() => {
    const due = students.filter((s) => s.overdueOrSoon).map((s) => s.id);
    return new Set(due.length > 0 ? due : students.slice(0, 1).map((s) => s.id));
  });
  const [amountEdited, setAmountEdited] = useState<string | null>(null);
  const [method, setMethod] = useState<ProofMethod>("zelle");
  const [preview, setPreview] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const busy = preparing || fetcher.state !== "idle";

  const suggested = students.filter((s) => selected.has(s.id)).reduce((sum, s) => sum + s.due, 0);
  const amount = amountEdited ?? (suggested > 0 ? suggested.toFixed(2) : "");

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) formRef.current?.reset();
  }, [fetcher.state, fetcher.data]);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  function toggle(id: string, on: boolean) {
    const next = new Set(selected);
    if (on) next.add(id);
    else next.delete(id);
    setSelected(next);
    setAmountEdited(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get("image");
    setPreparing(true);
    if (file instanceof File && file.size > 0) formData.set("image", await shrink(file));
    else formData.delete("image");
    setPreparing(false);
    fetcher.submit(formData, { method: "post", encType: "multipart/form-data" });
  }

  return (
    <fetcher.Form
      ref={formRef}
      method="post"
      encType="multipart/form-data"
      onSubmit={onSubmit}
      onReset={() => {
        setAmountEdited(null);
        setPreview(null);
        setMethod("zelle");
      }}
      className="space-y-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm shadow-stone-900/5 sm:p-7"
    >
      <input type="hidden" name="intent" value="proof" />
      <div>
        <h2 className="text-lg font-bold text-stone-900">{t("Submit payment proof")}</h2>
        <p className="mt-1 text-sm leading-relaxed text-stone-500">
          {t("Pay the way you normally do (Zelle, cash…), then send a screenshot here. Your teacher confirms it and it shows in your history.")}
        </p>
      </div>

      <FormError message={fetcher.data?.error} />
      {fetcher.state === "idle" && fetcher.data?.message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {t(fetcher.data.message)}
        </p>
      ) : null}

      {students.length > 1 ? (
        <fieldset>
          <legend className={label}>{t("Who is this payment for?")}</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {students.map((s) => (
              <label
                key={s.id}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                  selected.has(s.id) ? "border-emerald-600 bg-emerald-50" : "border-stone-300"
                }`}
              >
                <input
                  type="checkbox"
                  name="studentIds"
                  value={s.id}
                  checked={selected.has(s.id)}
                  onChange={(e) => toggle(s.id, e.target.checked)}
                />
                <span>
                  {s.name} <span className="text-stone-500 tabular-nums">{formatCurrency(s.due)}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <input type="hidden" name="studentIds" value={students[0]?.id} />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="proof-amount" className={label}>
            {t("Amount paid")}
          </label>
          <input
            id="proof-amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(e) => setAmountEdited(e.target.value)}
            className={input}
          />
        </div>
        <div>
          <label htmlFor="proof-method" className={label}>
            {t("How you paid")}
          </label>
          <select
            id="proof-method"
            name="method"
            value={method}
            onChange={(e) => setMethod(e.target.value as ProofMethod)}
            className={input}
          >
            {Object.entries(PROOF_METHODS).map(([key, name]) => (
              <option key={key} value={key}>
                {t(name)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="proof-date" className={label}>
            {t("Date paid")}
          </label>
          <input id="proof-date" name="paidOn" type="date" required defaultValue={toDateInputValue(new Date())} className={input} />
        </div>
      </div>

      <div>
        <span className={label}>
          {t("Screenshot")}{" "}
          <span className="font-normal text-stone-500">
            {proofImageRequired(method) ? "" : t("(optional for cash or check)")}
          </span>
        </span>
        <label className="mt-1 flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-stone-300 p-4 transition-colors hover:border-emerald-600 hover:bg-emerald-50/40">
          {preview ? (
            <img src={preview} alt="" className="h-16 w-16 rounded-lg object-cover" />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
              <ImagePlus className="h-6 w-6" />
            </span>
          )}
          <span className="text-sm text-stone-600">
            {preview ? t("Tap to choose a different image") : t("Tap to add a screenshot or photo")}
          </span>
          <input
            type="file"
            name="image"
            accept="image/*"
            required={proofImageRequired(method)}
            onChange={(e) => {
              const file = e.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
            className="sr-only"
          />
        </label>
      </div>

      <div>
        <label htmlFor="proof-note" className={label}>
          {t("Note (optional)")}
        </label>
        <input id="proof-note" name="note" placeholder={t("e.g. December for both kids")} className={input} />
      </div>

      <button type="submit" disabled={busy || selected.size === 0} className={primaryButton}>
        <Send className="h-4 w-4 rtl:-scale-x-100" />
        {busy ? t("Sending…") : t("Send to teacher")}
      </button>
    </fetcher.Form>
  );
}
