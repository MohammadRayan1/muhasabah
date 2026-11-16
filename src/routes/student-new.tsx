import type { Route } from "./+types/student-new";
import { prisma } from "@/lib/prisma.server";
import { requireTeacher } from "@/lib/auth/session.server";
import { createStudent } from "@/lib/mutations.server";
import NewStudentForm from "@/components/NewStudentForm";

export const meta: Route.MetaFunction = () => [{ title: "Add Student · Muhasabah" }];

export async function loader({ request }: Route.LoaderArgs) {
  await requireTeacher(request);
  const [programs, families] = await Promise.all([
    prisma.program.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } }),
    prisma.family.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { programs, families };
}

export async function action({ request }: Route.ActionArgs) {
  await requireTeacher(request);
  return createStudent(await request.formData());
}

export default function NewStudentPage({ loaderData }: Route.ComponentProps) {
  const { programs, families } = loaderData;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-stone-900">Add Student</h1>

      <NewStudentForm programs={programs} families={families} />
    </div>
  );
}
