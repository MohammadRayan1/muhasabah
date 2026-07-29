import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPaymentStatus } from "@/lib/status";
import { requireTeacher } from "@/lib/auth/dal";
import { logout } from "@/lib/auth-actions";
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
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Quran Class Tuition</h1>
          <p className="text-sm text-gray-500">Track student payments and upcoming due dates</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/programs" className="text-sm text-gray-500 hover:underline">
            Programs →
          </Link>
          <Link href="/reports" className="text-sm text-gray-500 hover:underline">
            Monthly Revenue →
          </Link>
          <Link
            href="/students/new"
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            + Add Student
          </Link>
          <form action={logout}>
            <button type="submit" className="text-sm text-gray-400 hover:text-gray-600 hover:underline">
              Log out
            </button>
          </form>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <SummaryCard label="Overdue" count={overdue.length} color="red" />
        <SummaryCard label="Due within 7 days" count={dueSoon.length} color="amber" />
        <SummaryCard label="On track" count={ok.length} color="emerald" />
      </div>

      {students.length === 0 ? (
        <p className="text-gray-500">No students yet. Add your first student to get started.</p>
      ) : (
        <div className="space-y-3">
          {sorted.map((student) => (
            <StudentRow key={student.id} student={student} />
          ))}
        </div>
      )}
    </main>
  );
}
