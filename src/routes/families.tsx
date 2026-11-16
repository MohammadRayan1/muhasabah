import { Form, Link, useNavigation } from "react-router";
import { ChevronRight, Users } from "lucide-react";
import type { Route } from "./+types/families";
import { prisma } from "@/lib/prisma.server";
import { requireTeacher } from "@/lib/auth/session.server";
import { createFamily } from "@/lib/mutations.server";
import { amountDue, getPaymentStatus } from "@/lib/status";
import { formatCurrency } from "@/lib/format";
import FamilyFields from "@/components/FamilyFields";
import FormError from "@/components/FormError";
import { card, pageTitle, primaryButton, sectionTitle } from "@/components/ui";

export const meta: Route.MetaFunction = () => [{ title: "Families · Muhasabah" }];

export async function loader({ request }: Route.LoaderArgs) {
  await requireTeacher(request);
  const families = await prisma.family.findMany({
    orderBy: { name: "asc" },
    include: { students: { where: { active: true }, orderBy: { name: "asc" } } },
  });
  return { families };
}

export async function action({ request }: Route.ActionArgs) {
  await requireTeacher(request);
  return createFamily(await request.formData());
}

export default function FamiliesPage({ loaderData, actionData }: Route.ComponentProps) {
  const { families } = loaderData;
  const pending = useNavigation().state !== "idle";

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className={pageTitle}>Families</h1>
      <p className="mt-1 mb-6 max-w-prose text-sm text-stone-500">
        Group siblings so their parent gets one reminder, sees every child in the portal, and can be
        marked paid in one go.
      </p>

      {families.length === 0 ? (
        <div className={`${card} mb-10 flex items-center gap-3 text-sm text-stone-600`}>
          <Users className="h-5 w-5 shrink-0 text-stone-400" />
          No families yet. Add one below, or pick &quot;New family&quot; when you add a student.
        </div>
      ) : (
        <ul className="mb-10 divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5">
          {families.map((family) => {
            const monthly = family.students.reduce((sum, s) => sum + s.tuitionAmount, 0);
            const dueNow = family.students.filter((s) => getPaymentStatus(s.nextDueDate).status !== "ok");
            const owed = dueNow.reduce((sum, s) => sum + amountDue(s), 0);
            return (
              <li key={family.id}>
                <Link to={`/families/${family.id}`} className="flex items-center gap-4 px-4 py-4 hover:bg-stone-50 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-stone-900">{family.name}</p>
                    <p className="truncate text-sm text-stone-500">
                      {family.students.length === 0
                        ? "No students yet"
                        : family.students.map((s) => s.name).join(", ")}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold text-stone-900 tabular-nums">{formatCurrency(monthly)}/mo</p>
                    {owed > 0 ? (
                      <p className="text-amber-700 tabular-nums">{formatCurrency(owed)} due</p>
                    ) : (
                      <p className="text-stone-500">Paid up</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-stone-400" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className={sectionTitle}>Add a family</h2>
      <Form method="post" className={`${card} space-y-4`}>
        <FormError message={actionData?.error} />
        <FamilyFields />
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Adding…" : "Add family"}
        </button>
      </Form>
    </div>
  );
}
