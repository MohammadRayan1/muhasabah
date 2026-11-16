import { useState } from "react";
import { Form } from "react-router";
import { formatCurrency } from "@/lib/format";
import { useT } from "@/lib/useT";

export default function ResetMonthButton({
  month,
  label,
  paymentCount,
  collectedTotal,
}: {
  month: string;
  label: string;
  paymentCount: number;
  collectedTotal: number;
}) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);

  if (paymentCount === 0) return null;

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="min-h-11 rounded-xl border border-red-200 px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
      >
        {t("Reset this month")}
      </button>
    );
  }

  return (
    <div className="flex min-h-11 items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2">
      <p className="text-sm text-red-700">
        {t("Delete all {n} payments ({amount}) recorded in {month}? This can't be undone.", {
          n: paymentCount,
          amount: formatCurrency(collectedTotal),
          month: label,
        })}
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="min-h-11 rounded-xl px-3 text-sm font-medium text-stone-500 hover:text-stone-700"
        >
          {t("Cancel")}
        </button>
        <Form method="post" onSubmit={() => setConfirming(false)}>
          <input type="hidden" name="month" value={month} />
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-red-600 px-3 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            {t("Yes, delete")}
          </button>
        </Form>
      </div>
    </div>
  );
}
