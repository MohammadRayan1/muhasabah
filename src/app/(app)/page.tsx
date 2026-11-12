import Link from "next/link";
import { BookOpen, Check, UserPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getPaymentStatus } from "@/lib/status";
import { requireTeacher } from "@/lib/auth/dal";
import { getMonthlyRevenue } from "@/lib/reports";
import StudentRow from "@/components/StudentRow";
import MonthLedger from "@/components/MonthLedger";
import TodayLine from "@/components/TodayLine";
import type { Program, Student } from "@/generated/prisma/client";

type StudentWithPrograms = Student & { enrollments: { program: Program }[] };

export default async function Home() {
  await requireTeacher();

  const [students, [month], programCount] = await Promise.all([
    prisma.student.findMany({
      where: { active: true },
      orderBy: { nextDueDate: "asc" },
      include: { enrollments: { include: { program: true } } },
    }),
    getMonthlyRevenue(1),
    prisma.program.count({ where: { active: true } }),
  ]);

  const overdue = students.filter((s) => getPaymentStatus(s.nextDueDate).status === "overdue");
  const dueSoon = students.filter((s) => getPaymentStatus(s.nextDueDate).status === "due_soon");
  const ok = students.filter((s) => getPaymentStatus(s.nextDueDate).status === "ok");

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">Assalamu alaikum</h1>
        <TodayLine />
      </header>

      {students.length === 0 ? (
        <GettingStarted hasPrograms={programCount > 0} />
      ) : (
        <>
          <MonthLedger
            month={month}
            counts={{ overdue: overdue.length, dueSoon: dueSoon.length, ok: ok.length }}
          />
          <StudentGroup title="Needs attention" note="Past their due date" students={overdue} />
          <StudentGroup title="Due this week" note="Coming up in the next 7 days" students={dueSoon} />
          <StudentGroup title="Paid up" note="Nothing due for at least a week" students={ok} />
        </>
      )}
    </div>
  );
}

function StudentGroup({
  title,
  note,
  students,
}: {
  title: string;
  note: string;
  students: StudentWithPrograms[];
}) {
  if (students.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-baseline justify-between gap-4 px-1">
        <h2 className="text-lg font-bold text-stone-900">
          {title} <span className="font-semibold text-stone-500 tabular-nums">{students.length}</span>
        </h2>
        <p className="text-sm text-stone-500">{note}</p>
      </div>
      <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5">
        {students.map((student) => (
          <StudentRow key={student.id} student={student} />
        ))}
      </ul>
    </section>
  );
}

function GettingStarted({ hasPrograms }: { hasPrograms: boolean }) {
  const steps = [
    {
      done: hasPrograms,
      href: "/programs",
      icon: BookOpen,
      title: "Add your programs",
      body: "Each class, with its days, time, place and monthly price.",
    },
    {
      done: false,
      href: "/students/new",
      icon: UserPlus,
      title: "Add your first student",
      body: "Pick their programs and the day they joined; the first bill is worked out for you.",
    },
  ];

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm shadow-stone-900/5 sm:p-10">
      <p lang="ar" dir="rtl" className="text-left font-arabic text-4xl leading-[1.4] text-emerald-700">
        بسم الله
      </p>
      <h2 className="mt-2 text-2xl font-bold text-stone-900">Let&apos;s set up your class</h2>
      <p className="mt-2 max-w-prose text-stone-600">
        Once your students are in, this page shows what&apos;s come in this month, who&apos;s due
        this week, and who needs a reminder.
      </p>

      <ol className="mt-8 space-y-3">
        {steps.map((step, i) => {
          const Icon = step.done ? Check : step.icon;
          return (
            <li key={step.href}>
              <Link
                href={step.href}
                className="group flex items-center gap-4 rounded-2xl border border-stone-200 p-4 transition-colors hover:border-emerald-200 hover:bg-emerald-50"
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                    step.done ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-700"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-stone-900">
                    {i + 1}. {step.title}
                    {step.done ? <span className="ml-2 text-sm font-medium text-emerald-700">Done</span> : null}
                  </span>
                  <span className="block text-sm text-stone-500">{step.body}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
