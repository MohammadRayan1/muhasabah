import { requireTeacher } from "@/lib/auth/dal";
import { getBillingDay } from "@/lib/settings";
import { updateBillingDay } from "@/lib/actions";

export default async function SettingsPage() {
  await requireTeacher();

  const billingDay = await getBillingDay();

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-stone-900">Settings</h1>

      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm shadow-stone-900/5">
        <h2 className="font-medium text-stone-900">Shared due day</h2>
        <p className="mt-1 text-sm text-stone-500">
          Every student is billed on this day of the month. Students who join mid-cycle get an
          automatic prorated first bill for the remaining days.
        </p>
        <form action={updateBillingDay} className="mt-4 flex items-end gap-3">
          <div>
            <label htmlFor="billingDay" className="block text-sm font-medium text-stone-700">
              Day of month
            </label>
            <input
              id="billingDay"
              name="billingDay"
              type="number"
              min="1"
              max="31"
              step="1"
              required
              defaultValue={billingDay}
              className="mt-1 w-24 rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            Save
          </button>
        </form>
      </div>
    </div>
  );
}
