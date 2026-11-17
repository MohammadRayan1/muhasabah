import { useState } from "react";
import { data, Form, Link, useFetcher, useNavigation } from "react-router";
import type { Route } from "./+types/family";
import { prisma } from "@/lib/prisma.server";
import { requireTeacher } from "@/lib/auth/session.server";
import {
  deleteFamily,
  setStudentFamily,
  updateFamily,
} from "@/lib/mutations.server";
import { emailConfigured } from "@/lib/email.server";
import { amountDue, getPaymentStatus, STATUS_BADGE_STYLES, STATUS_LABEL, type PaymentStatus } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ActionState } from "@/lib/action-state";
import FamilyFields from "@/components/FamilyFields";
import FormError from "@/components/FormError";
import Arrow from "@/components/Arrow";
import RemindMenu from "@/components/RemindMenu";
import Avatar from "@/components/Avatar";
import { card, input, pageTitle, primaryButton, secondaryButton, sectionTitle, pageWidth } from "@/components/ui";
import { useT } from "@/lib/useT";

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
  const t = useT();
  const { family, others, canEmail } = loaderData;
  const students = family.students.map((s) => ({ ...s, family, ...getPaymentStatus(s.nextDueDate) }));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editFetcher = useFetcher<ActionState>();
  const pending = useNavigation().state !== "idle";

  const monthly = students.reduce((sum, s) => sum + s.tuitionAmount, 0);

  return (
    <div className={pageWidth}>
      <Link to="/roster" className="text-sm text-stone-500 hover:underline">
        <Arrow back /> {t("Students")}
      </Link>
      <div className="mt-3 mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className={pageTitle}>{family.name}</h1>
        <p className="text-sm text-stone-500 tabular-nums">
          {students.length} {students.length === 1 ? t("student") : t("students")} ·{" "}
          {t("{amount}/month", { amount: formatCurrency(monthly) })}
        </p>
      </div>

      <section className="mb-10">
        <h2 className={sectionTitle}>{t("Children")}</h2>
        {students.length === 0 ? (
          <p className={`${card} text-sm text-stone-500`}>{t("No students in this family yet. Add one below.")}</p>
        ) : (
          <FamilyChildren students={students} canEmail={canEmail} />
        )}

        {others.length > 0 ? (
          <Form method="post" className="mt-4 flex flex-wrap items-end gap-2">
            <input type="hidden" name="intent" value="addStudent" />
            <div className="min-w-48 flex-1">
              <label htmlFor="add-student" className="block text-sm font-medium text-stone-700">
                {t("Add a student to this family")}
              </label>
              <select id="add-student" name="studentId" required className={input} defaultValue="">
                <option value="" disabled>
                  {t("Choose a student…")}
                </option>
                {others.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={pending} className={secondaryButton}>
              {t("Add")}
            </button>
          </Form>
        ) : null}
      </section>

      <section className="mb-10">
        <h2 className={sectionTitle}>{t("Parent contact")}</h2>
        <editFetcher.Form method="post" className={`${card} space-y-4`}>
          <input type="hidden" name="intent" value="update" />
          <FormError message={editFetcher.data?.error} />
          <FamilyFields defaults={family} />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={editFetcher.state !== "idle"} className={primaryButton}>
              {editFetcher.state !== "idle" ? t("Saving…") : t("Save")}
            </button>
            {editFetcher.state === "idle" && editFetcher.data?.message ? (
              <span className="text-sm text-emerald-700">{t(editFetcher.data.message)}</span>
            ) : null}
          </div>
        </editFetcher.Form>
      </section>

      {students.length > 0 ? (
        <section className="mb-10">
          <h2 className={sectionTitle}>{t("Remove a student from this family")}</h2>
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
            <p className="text-sm text-red-700">{t("Delete this family? The students and their payments stay.")}</p>
            <button type="button" onClick={() => setConfirmDelete(false)} className="text-sm text-stone-500 hover:underline">
              {t("Cancel")}
            </button>
            <button type="submit" className="min-h-10 rounded-xl bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700">
              {t("Yes, delete family")}
            </button>
          </Form>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm text-stone-500 hover:text-red-700 hover:underline">
            {t("Delete family")}
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

function FamilyChildren({ students, canEmail }: { students: PayStudent[]; canEmail: boolean }) {
  const t = useT();
  return (
    <>
      <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_2px_rgb(28_25_23/0.04)]">
        {students.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
            <Link to={`/students/${s.id}`} className="flex min-w-0 flex-1 basis-40 items-center gap-3 hover:underline">
              <Avatar name={s.name} />
              <span className="min-w-0">
                <span className="block truncate font-semibold text-stone-900">{s.name}</span>
                <span className="block text-sm text-stone-500">
                  {t("{amount} due {date}", { amount: formatCurrency(amountDue(s)), date: formatDate(s.nextDueDate) })}
                </span>
              </span>
            </Link>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_STYLES[s.status]}`}>
              {t(STATUS_LABEL[s.status])}
            </span>
            {s.status !== "ok" ? <RemindMenu student={s} canEmail={canEmail} /> : null}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-stone-500">
        {t("Payments, including cash, are submitted by the family from their portal. Confirm them on the Payments page.")}
      </p>
    </>
  );
}
