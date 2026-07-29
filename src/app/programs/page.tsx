import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createProgram, setProgramActive } from "@/lib/actions";
import { formatCurrency } from "@/lib/format";
import { requireTeacher } from "@/lib/auth/dal";

export default async function ProgramsPage() {
  await requireTeacher();

  const programs = await prisma.program.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm text-stone-500 hover:underline">
        ← Back to dashboard
      </Link>

      <h1 className="mt-4 mb-6 text-2xl font-semibold text-stone-900">Programs</h1>

      {programs.length === 0 ? (
        <p className="mb-8 text-sm text-stone-500">
          No programs yet. Add one below — e.g. &quot;Weekend Program&quot;, Sat &amp; Sun, 10:00
          AM–12:00 PM, $100/month.
        </p>
      ) : (
        <div className="mb-8 space-y-3">
          {programs.map((program) => (
            <div
              key={program.id}
              className="flex items-start justify-between rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5 p-4"
            >
              <div>
                <h3 className="font-medium text-stone-900">{program.name}</h3>
                <p className="mt-1 text-sm text-stone-600">
                  {program.days} · {program.time} · {program.location}
                </p>
                <p className="mt-1 text-sm text-stone-500">{formatCurrency(program.price)} / month</p>
              </div>
              <form action={setProgramActive}>
                <input type="hidden" name="programId" value={program.id} />
                <input type="hidden" name="active" value="false" />
                <button type="submit" className="text-xs text-stone-400 hover:text-stone-600 hover:underline">
                  Remove
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-3 text-lg font-medium text-stone-900">Add Program</h2>

      <form action={createProgram} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-stone-700">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Weekend Program"
            required
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="days" className="block text-sm font-medium text-stone-700">
              Days
            </label>
            <input
              id="days"
              name="days"
              type="text"
              placeholder="Sat & Sun"
              required
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="time" className="block text-sm font-medium text-stone-700">
              Time
            </label>
            <input
              id="time"
              name="time"
              type="text"
              placeholder="10:00 AM – 12:00 PM"
              required
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-stone-700">
              Location
            </label>
            <input
              id="location"
              name="location"
              type="text"
              required
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-stone-700">
              Price ($/month)
            </label>
            <input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0.01"
              required
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          Add Program
        </button>
      </form>
    </main>
  );
}
