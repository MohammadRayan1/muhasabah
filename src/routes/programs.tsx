import { Form } from "react-router";
import type { Route } from "./+types/programs";
import { prisma } from "@/lib/prisma.server";
import { requireTeacher } from "@/lib/auth/session.server";
import { createProgram, setProgramActive, updateProgramDays } from "@/lib/mutations.server";
import { formatCurrency } from "@/lib/format";
import NewProgramForm from "@/components/NewProgramForm";
import ProgramDaysForm from "@/components/ProgramDaysForm";
import { dayChoices, daysLabel, priceForDays } from "@/lib/pricing";
import { metaTitle, useT } from "@/lib/useT";

export const meta: Route.MetaFunction = ({ matches }) => [{ title: metaTitle(matches, "Programs") }];

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
    case "updateProgramDays":
      return updateProgramDays(formData);
    case "removeProgram":
      formData.set("active", "false");
      return setProgramActive(formData);
    default:
      return { error: "Unknown action" };
  }
}

export default function ProgramsPage({ loaderData }: Route.ComponentProps) {
  const t = useT();
  const { programs } = loaderData;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-stone-900">{t("Programs")}</h1>

      {programs.length === 0 ? (
        <p className="mb-8 text-sm text-stone-500">
          {t("No programs yet. Add one below, e.g. “Weekday Program”, Mon–Fri, 5:00–7:00 PM, $150/month, where people can choose 2, 4 or all 5 days.")}
        </p>
      ) : (
        <div className="mb-8 space-y-3">
          {programs.map((program) => (
            <div
              key={program.id}
              className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm shadow-stone-900/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium text-stone-900">{program.name}</h3>
                  <p className="mt-1 text-sm text-stone-600">
                    {program.days} · {program.time} · {program.location}
                  </p>
                  <p className="mt-1 text-sm text-stone-500">
                    {dayChoices(program)
                      .map((d) => `${t(daysLabel(d))}: ${t("{amount}/month", { amount: formatCurrency(priceForDays(program, d)) })}`)
                      .join(" · ")}
                  </p>
                </div>
                <Form method="post">
                  <input type="hidden" name="intent" value="removeProgram" />
                  <input type="hidden" name="programId" value={program.id} />
                  <input type="hidden" name="active" value="false" />
                  <button type="submit" className="text-xs text-stone-500 hover:text-red-700 hover:underline">
                    {t("Remove")}
                  </button>
                </Form>
              </div>
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-emerald-700">{t("Price and days")}</summary>
                <div className="mt-3">
                  <ProgramDaysForm program={program} />
                </div>
              </details>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-3 text-lg font-medium text-stone-900">{t("Add a program")}</h2>

      <NewProgramForm />
    </div>
  );
}
