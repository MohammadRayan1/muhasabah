import { Form } from "react-router";
import { useState } from "react";
import { CalendarDays, ChevronDown, Clock, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import type { Route } from "./+types/programs";
import { prisma } from "@/lib/prisma.server";
import { requireTeacher } from "@/lib/auth/session.server";
import { createProgram, setProgramActive, updateProgram } from "@/lib/mutations.server";
import { formatCurrency } from "@/lib/format";
import NewProgramForm from "@/components/NewProgramForm";
import ProgramEditForm from "@/components/ProgramEditForm";
import { dayChoices, daysLabel, priceForDays } from "@/lib/pricing";
import PageHeader from "@/components/PageHeader";
import { pageWidth } from "@/components/ui";
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
    case "updateProgram":
      return updateProgram(formData);
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
    <div className={pageWidth}>
      <PageHeader
        title={t("Programs")}
        description={t("Your classes, with their days, times and monthly price. Registration links and first bills use these prices.")}
      />

      {programs.length === 0 ? (
        <p className="mb-8 text-sm text-stone-500">
          {t("No programs yet. Add one below, e.g. “Weekday Program”, Mon–Fri, 5:00–7:00 PM, $150/month, where people can choose 2, 4 or all 5 days.")}
        </p>
      ) : (
        <div className="mb-8 space-y-4">
          {programs.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </div>
      )}

      <AddProgram startOpen={programs.length === 0} />
    </div>
  );
}

type ProgramRow = Route.ComponentProps["loaderData"]["programs"][number];

function ProgramCard({ program }: { program: ProgramRow }) {
  const t = useT();
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-[0_1px_2px_rgb(28_25_23/0.04)] sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <h3 className="text-xl font-semibold text-stone-900">{program.name}</h3>
          <p className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[15px] text-stone-600">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays aria-hidden className="h-4 w-4 text-stone-400" />
              {program.days}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock aria-hidden className="h-4 w-4 text-stone-400" />
              {program.time}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden className="h-4 w-4 text-stone-400" />
              {program.location}
            </span>
          </p>
          <p className="flex flex-wrap gap-2 pt-1">
            {dayChoices(program).map((d) => (
              <span key={d} className="inline-flex h-8 items-center rounded-full border border-stone-200 bg-stone-50/60 px-3 text-sm font-medium text-stone-700 tabular-nums">
                {t(daysLabel(d))} · {formatCurrency(priceForDays(program, d))}
              </span>
            ))}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            aria-expanded={editing}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-stone-200 px-3.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
          >
            <Pencil aria-hidden className="h-3.5 w-3.5" />
            {t("Edit")}
          </button>
          <Form method="post">
            <input type="hidden" name="intent" value="removeProgram" />
            <input type="hidden" name="programId" value={program.id} />
            <input type="hidden" name="active" value="false" />
            <button
              type="submit"
              aria-label={t("Remove {name}", { name: program.name })}
              title={t("Remove")}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </Form>
        </div>
      </div>
      {editing ? (
        <div className="mt-6">
          <ProgramEditForm program={program} onDone={() => setEditing(false)} />
        </div>
      ) : null}
    </div>
  );
}

/** "Add a program" stays a single line until the teacher opens it. */
function AddProgram({ startOpen }: { startOpen: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(startOpen);

  return (
    <section className="mt-10 overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_2px_rgb(28_25_23/0.04)]">
      <h2>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="add-program"
          className="flex w-full items-center gap-3 px-6 py-5 text-start transition-colors hover:bg-stone-50/70 sm:px-7"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Plus aria-hidden className={`h-5 w-5 transition-transform duration-200 ${open ? "rotate-45" : ""}`} />
          </span>
          <span className="flex-1">
            <span className="block text-base font-semibold text-stone-900">{t("Add a program")}</span>
            <span className="block text-sm text-stone-500">{t("A new class with its days, time, place and monthly price.")}</span>
          </span>
          <ChevronDown aria-hidden className={`h-5 w-5 text-stone-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      </h2>
      {open ? (
        <div id="add-program" className="border-t border-stone-100 px-6 py-6 sm:px-7">
          <NewProgramForm onCreated={() => setOpen(false)} />
        </div>
      ) : null}
    </section>
  );
}
