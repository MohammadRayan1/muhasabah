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
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-emerald-700">Muhasabah</h1>
          <p className="mt-1 text-sm text-stone-500">Track student payments and upcoming due dates</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="text-sm font-medium text-stone-400 transition-colors hover:text-stone-600 hover:underline"
          >
            Log out
          </button>
        </form>
      </div>

      <nav className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div className="flex items-center gap-1 rounded-full bg-stone-100 p-1">
          <Link
            href="/programs"
            className="inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-semibold text-stone-600 transition-colors hover:bg-white hover:text-stone-900 hover:shadow-sm"
          >
            Programs
          </Link>
          <Link
            href="/reports"
            className="inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-semibold text-stone-600 transition-colors hover:bg-white hover:text-stone-900 hover:shadow-sm"
          >
            Monthly Revenue
          </Link>
        </div>
        <Link
          href="/students/new"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          + Add Student
        </Link>
      </nav>

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
    </main>
  );
}
