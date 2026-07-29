import { prisma } from "@/lib/prisma";
import { getPaymentStatus } from "@/lib/status";
import { requireTeacher } from "@/lib/auth/dal";
import StudentRow from "@/components/StudentRow";
import SummaryCard from "@/components/SummaryCard";

export default async function Home() {
  await requireTeacher();

  const students = await prisma.student.findMany({
    where: { active: true },
    orderBy: { nextDueDate: "asc" },
    include: { enrollments: { include: { program: true } } },
  });

  const overdue = students.filter((s) => getPaymentStatus(s.nextDueDate).status === "overdue");
  const dueSoon = students.filter((s) => getPaymentStatus(s.nextDueDate).status === "due_soon");
  const ok = students.filter((s) => getPaymentStatus(s.nextDueDate).status === "ok");
  const sorted = [...overdue, ...dueSoon, ...ok];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Dashboard</h1>
        <p className="mt-1 text-sm text-stone-500">Track student payments and upcoming due dates</p>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <SummaryCard label="Overdue" count={overdue.length} color="red" />
        <SummaryCard label="Due within 7 days" count={dueSoon.length} color="amber" />
        <SummaryCard label="On track" count={ok.length} color="emerald" />
      </div>

      {students.length === 0 ? (
        <p className="text-stone-500">No students yet. Add your first student to get started.</p>
      ) : (
        <div className="space-y-3">
          {sorted.map((student) => (
            <StudentRow key={student.id} student={student} />
          ))}
        </div>
      )}
    </div>
  );
}
