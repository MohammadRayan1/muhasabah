import { useState } from "react";
import { data, Form, Link, useFetcher, useNavigation } from "react-router";
import type { Route } from "./+types/family";
import { prisma } from "@/lib/prisma.server";
import { requireTeacher } from "@/lib/auth/session.server";
import {
  deleteFamily,
  recordFamilyPayment,
  setStudentFamily,
  updateFamily,
} from "@/lib/mutations.server";
import { emailConfigured } from "@/lib/email.server";
import { amountDue, getPaymentStatus, STATUS_BADGE_STYLES, STATUS_LABEL, type PaymentStatus } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ActionState } from "@/lib/action-state";
import FamilyFields from "@/components/FamilyFields";
import FormError from "@/components/FormError";
import RemindMenu from "@/components/RemindMenu";
import Avatar from "@/components/Avatar";
import { card, input, pageTitle, primaryButton, secondaryButton, sectionTitle } from "@/components/ui";

export const meta: Route.MetaFunction = ({ data }) => [
  { title: `${data?.family.name ?? "Family"} · Muhasabah` },
];

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireTeacher(request);
  const [family, others] = await Promise.all([
    prisma.family.findUnique({
      where: { id: params.id },
      include: { students: { where: { active: true }, orderBy: { name: "asc" } } },
    }),
    prisma.student.findMany({
      where: { active: true, OR: [{ familyId: null }, { familyId: { not: params.id } }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!family) throw data("Not found", { status: 404 });
  return { family, others, canEmail: emailConfigured() };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireTeacher(request);
  const formData = await request.formData();
  formData.set("familyId", params.id);
  switch (formData.get("intent")) {
    case "update":
      return updateFamily(formData);
    case "pay":
      return recordFamilyPayment(formData);
    case "addStudent":
      return setStudentFamily(formData);
    case "removeStudent":
      formData.set("familyId", "");
      return setStudentFamily(formData);
    case "delete":
      return deleteFamily(formData);
    default:
      return { error: "Unknown action" };
  }
}

export default function FamilyPage({ loaderData }: Route.ComponentProps) {
  const { family, others, canEmail } = loaderData;
  const students = family.students.map((s) => ({ ...s, family, ...getPaymentStatus(s.nextDueDate) }));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editFetcher = useFetcher<ActionState>();
  const pending = useNavigation().state !== "idle";

  const monthly = students.reduce((sum, s) => sum + s.tuitionAmount, 0);

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/families" className="text-sm text-stone-500 hover:underline">
        ← All families
      </Link>
      <div className="mt-3 mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className={pageTitle}>{family.name}</h1>
        <p className="text-sm text-stone-500 tabular-nums">
          {students.length} {students.length === 1 ? "student" : "students"} · {formatCurrency(monthly)}/mo
        </p>
      </div>

      <section className="mb-10">
        <h2 className={sectionTitle}>Children</h2>
        {students.length === 0 ? (
          <p className={`${card} text-sm text-stone-500`}>No students in this family yet. Add one below.</p>
        ) : (
          <FamilyPayForm
            // A new key after any due date moves resets the ticks, so a payment can't be recorded twice by accident.
            key={students.map((st) => st.nextDueDate.toISOString()).join()}
            students={students}
            canEmail={canEmail}
          />
        )}

        {others.length > 0 ? (
          <Form method="post" className="mt-4 flex flex-wrap items-end gap-2">
            <input type="hidden" name="intent" value="addStudent" />
            <div className="min-w-48 flex-1">
              <label htmlFor="add-student" className="block text-sm font-medium text-stone-700">
                Add a student to this family
              </label>
              <select id="add-student" name="studentId" required className={input} defaultValue="">
                <option value="" disabled>
                  Choose a student…
                </option>
                {others.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={pending} className={secondaryButton}>
              Add
            </button>
          </Form>
        ) : null}
      </section>

      <section className="mb-10">
        <h2 className={sectionTitle}>Parent contact</h2>
        <editFetcher.Form method="post" className={`${card} space-y-4`}>
          <input type="hidden" name="intent" value="update" />
          <FormError message={editFetcher.data?.error} />
          <FamilyFields defaults={family} />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={editFetcher.state !== "idle"} className={primaryButton}>
              {editFetcher.state !== "idle" ? "Saving…" : "Save"}
            </button>
            {editFetcher.state === "idle" && editFetcher.data?.message ? (
              <span className="text-sm text-emerald-700">{editFetcher.data.message}</span>
            ) : null}
          </div>
        </editFetcher.Form>
      </section>

      {students.length > 0 ? (
        <section className="mb-10">
          <h2 className={sectionTitle}>Take a student out of this family</h2>
          <div className="flex flex-wrap gap-2">
            {students.map((s) => (
              <Form method="post" key={s.id}>
                <input type="hidden" name="intent" value="removeStudent" />
                <input type="hidden" name="studentId" value={s.id} />
                <button type="submit" className="rounded-full border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:border-red-300 hover:text-red-700">
                  {s.name} ×
                </button>
              </Form>
            ))}
          </div>
        </section>
      ) : null}

      <section className="border-t border-stone-200 pt-6">
        {confirmDelete ? (
          <Form method="post" className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="intent" value="delete" />
            <p className="text-sm text-red-700">Delete this family? The students and their payments stay.</p>
            <button type="button" onClick={() => setConfirmDelete(false)} className="text-sm text-stone-500 hover:underline">
              Cancel
            </button>
            <button type="submit" className="min-h-10 rounded-xl bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700">
              Yes, delete family
            </button>
          </Form>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm text-stone-500 hover:text-red-700 hover:underline">
            Delete family
          </button>
        )}
      </section>
    </div>
  );
}

type PayStudent = Parameters<typeof RemindMenu>[0]["student"] & {
  id: string;
  name: string;
  status: PaymentStatus;
};

function FamilyPayForm({ students, canEmail }: { students: PayStudent[]; canEmail: boolean }) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(students.filter((s) => s.status !== "ok").map((s) => s.id)),
  );
  const payFetcher = useFetcher<ActionState>();
  const selectedTotal = students.filter((s) => selected.has(s.id)).reduce((sum, s) => sum + amountDue(s), 0);

  function toggle(id: string, on: boolean) {
    const next = new Set(selected);
    if (on) next.add(id);
    else next.delete(id);
    setSelected(next);
  }

  return (
    <payFetcher.Form method="post">
      <input type="hidden" name="intent" value="pay" />
      <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5">
        {students.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
            <input
              type="checkbox"
              name="studentIds"
              value={s.id}
              checked={selected.has(s.id)}
              onChange={(e) => toggle(s.id, e.target.checked)}
              aria-label={`Include ${s.name} in the payment`}
              className="h-4 w-4"
            />
            <Link to={`/students/${s.id}`} className="flex min-w-0 flex-1 basis-40 items-center gap-3 hover:underline">
              <Avatar name={s.name} />
              <span className="min-w-0">
                <span className="block truncate font-semibold text-stone-900">{s.name}</span>
                <span className="block text-sm text-stone-500">
                  {formatCurrency(amountDue(s))} due {formatDate(s.nextDueDate)}
                </span>
              </span>
            </Link>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_STYLES[s.status]}`}>
              {STATUS_LABEL[s.status]}
            </span>
            {s.status !== "ok" ? <RemindMenu student={s} canEmail={canEmail} /> : null}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={selected.size === 0 || payFetcher.state !== "idle"}
          className={primaryButton}
        >
          {payFetcher.state !== "idle"
            ? "Saving…"
            : `Mark ${selected.size === students.length && students.length > 1 ? "all" : "selected"} paid · ${formatCurrency(selectedTotal)}`}
        </button>
        <p className="text-xs text-stone-500">Each child&apos;s own bill is recorded and moved to the next 1st.</p>
      </div>
      <FormError message={payFetcher.data?.error} />
    </payFetcher.Form>
  );
}
