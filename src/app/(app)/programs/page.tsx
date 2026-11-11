import { prisma } from "@/lib/prisma";
import { setProgramActive } from "@/lib/actions";
import { formatCurrency } from "@/lib/format";
import { requireTeacher } from "@/lib/auth/dal";
import NewProgramForm from "@/components/NewProgramForm";

export default async function ProgramsPage() {
  await requireTeacher();

  const programs = await prisma.program.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-stone-900">Programs</h1>

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

      <NewProgramForm />
    </div>
  );
}
