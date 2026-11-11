import { prisma } from "@/lib/prisma";
import NewStudentForm from "@/components/NewStudentForm";
import { requireTeacher } from "@/lib/auth/dal";
import { getBillingDay } from "@/lib/settings";

export default async function NewStudentPage() {
  await requireTeacher();

  const [programs, billingDay] = await Promise.all([
    prisma.program.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
    }),
    getBillingDay(),
  ]);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-stone-900">Add Student</h1>

      <NewStudentForm programs={programs} billingDay={billingDay} />
    </div>
  );
}
