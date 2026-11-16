import { Form } from "react-router";
import type { Route } from "./+types/programs";
import { prisma } from "@/lib/prisma.server";
import { requireTeacher } from "@/lib/auth/session.server";
import { createProgram, setProgramActive } from "@/lib/mutations.server";
import { formatCurrency } from "@/lib/format";
import NewProgramForm from "@/components/NewProgramForm";

export const meta: Route.MetaFunction = () => [{ title: "Programs · Muhasabah" }];

export async function loader({ request }: Route.LoaderArgs) {
  await requireTeacher(request);
  const programs = await prisma.program.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });
  return { programs };
}

export async function action({ request }: Route.ActionArgs) {
  await requireTeacher(request);
  const formData = await request.formData();
  switch (formData.get("intent")) {
    case "createProgram":
      return createProgram(formData);
    case "removeProgram":
      formData.set("active", "false");
      return setProgramActive(formData);
    default:
      return { error: "Unknown action" };
  }
}

export default function ProgramsPage({ loaderData }: Route.ComponentProps) {
  const { programs } = loaderData;

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
              <Form method="post">
                <input type="hidden" name="intent" value="removeProgram" />
                <input type="hidden" name="programId" value={program.id} />
                <input type="hidden" name="active" value="false" />
                <button type="submit" className="text-xs text-stone-500 hover:text-red-700 hover:underline">
                  Remove
                </button>
              </Form>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-3 text-lg font-medium text-stone-900">Add Program</h2>

      <NewProgramForm />
    </div>
  );
}
