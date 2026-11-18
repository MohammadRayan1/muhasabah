import { Form } from "react-router";
import { useState } from "react";
import { Archive, BookOpen, CalendarDays, ChevronDown, Clock, MapPin, Pencil, Plus } from "lucide-react";
import ConfirmButton from "@/components/ConfirmButton";
import type { Route } from "./+types/programs";
import { withToast } from "@/lib/toast.server";
import { prisma } from "@/lib/prisma.server";
import { requireTeacher } from "@/lib/auth/session.server";
import { createProgram, setProgramActive, updateProgram } from "@/lib/mutations.server";
import { formatCurrency } from "@/lib/format";
import NewProgramForm from "@/components/NewProgramForm";
import ProgramEditForm from "@/components/ProgramEditForm";
import { dayChoices, daysLabel, priceForDays } from "@/lib/pricing";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { pageWidth, secondaryButton } from "@/components/ui";
import { metaTitle, useT } from "@/lib/useT";

export const meta: Route.MetaFunction = ({ matches }) => [{ title: metaTitle(matches, "Programs") }];

export async function loader({ request }: Route.LoaderArgs) {
  await requireTeacher(request);
  const [programs, archived] = await Promise.all([
    prisma.program.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } }),
    prisma.program.findMany({ where: { active: false }, orderBy: { name: "asc" }, select: { id: true, name: true, days: true, time: true } }),
  ]);
  return { programs, archived };
}

export async function action({ request }: Route.ActionArgs) {
  await requireTeacher(request);
  const formData = await request.formData();
  switch (formData.get("intent")) {
    case "createProgram":
      return withToast(await createProgram(formData), "Program added");
    case "updateProgram":
      return withToast(await updateProgram(formData), "Changes saved");
    case "removeProgram": {
      formData.set("active", "false");
      const programId = String(formData.get("programId") ?? "");
      return withToast(await setProgramActive(formData), "Program archived. Students already in it keep their classes.", {
        undo: { kind: "program-archive", programId },
      });
    }
    case "restoreProgram":
      formData.set("active", "true");
      return withToast(await setProgramActive(formData), "Program restored");
    default:
      return { error: "Unknown action" };
  }
}

export default function ProgramsPage({ loaderData }: Route.ComponentProps) {
  const t = useT();
  const { programs } = loaderData;
  // Places already used, offered as suggestions so they needn't be typed again.
  const locations = [...new Set(programs.map((p) => p.location).filter(Boolean))];

  return (
    <div className={pageWidth}>
      <PageHeader
        title={t("Programs")}
        description={t("Your classes, with their days, times and monthly price. Registration links and first bills use these prices.")}
      />

      {programs.length === 0 ? (
        <div className="mb-8">
          <EmptyState
            icon={BookOpen}
            title={t("No programs yet")}
            body={t("Add your first class below. You'll tap the days it meets, pick the time, and set a monthly price.")}
          />
        </div>
      ) : (
        <div className="mb-8 space-y-4">
          {programs.map((program) => (
            <ProgramCard key={program.id} program={program} locations={locations} />
          ))}
        </div>
      )}

      <AddProgram startOpen={programs.length === 0} locations={locations} />

      {loaderData.archived.length > 0 ? <ArchivedPrograms programs={loaderData.archived} /> : null}
    </div>
  );
}

type ProgramRow = Route.ComponentProps["loaderData"]["programs"][number];

function ProgramCard({ program, locations }: { program: ProgramRow; locations: string[] }) {
  const t = useT();
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-[0_1px_2px_rgb(28_25_23/0.04)] sm:p-7">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
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
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            aria-expanded={editing}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-stone-200 px-4 text-[15px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
          >
            <Pencil aria-hidden className="h-4 w-4" />
            {t("Edit")}
          </button>
          <ConfirmButton
            label={t("Remove")}
            question={t("Archive {name}?", { name: program.name })}
            confirmLabel={t("Yes, archive")}
          >
            <input type="hidden" name="intent" value="removeProgram" />
            <input type="hidden" name="programId" value={program.id} />
          </ConfirmButton>
        </div>
      </div>
      {editing ? (
        <div className="mt-6">
          <ProgramEditForm program={program} onDone={() => setEditing(false)} locations={locations} />
        </div>
      ) : null}
    </div>
  );
}

/** "Add a program" stays a single line until the teacher opens it. */
function AddProgram({ startOpen, locations }: { startOpen: boolean; locations: string[] }) {
  const t = useT();
  const [open, setOpen] = useState(startOpen);

  return (
    <section data-tour="add-program" className="mt-10 overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_2px_rgb(28_25_23/0.04)]">
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
          <NewProgramForm onCreated={() => setOpen(false)} locations={locations} />
        </div>
      ) : null}
    </section>
  );
}

function ArchivedPrograms({ programs }: { programs: Route.ComponentProps["loaderData"]["archived"] }) {
  const t = useT();
  return (
    <details className="group mt-10">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-1 text-base font-semibold text-stone-700 [&::-webkit-details-marker]:hidden">
        <Archive aria-hidden className="h-5 w-5 text-stone-500" />
        {t("Archived programs")} <span className="font-normal text-stone-500 tabular-nums">{programs.length}</span>
      </summary>
      <p className="mt-1 mb-3 text-[15px] text-stone-600">{t("Programs you removed. Restore one to offer it again.")}</p>
      <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200/80 bg-white">
        {programs.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <span>
              <span className="block font-semibold text-stone-900">{p.name}</span>
              <span className="block text-sm text-stone-600">
                {p.days} · {p.time}
              </span>
            </span>
            <Form method="post">
              <input type="hidden" name="intent" value="restoreProgram" />
              <input type="hidden" name="programId" value={p.id} />
              <button type="submit" className={secondaryButton}>
                {t("Restore")}
              </button>
            </Form>
          </li>
        ))}
      </ul>
    </details>
  );
}
