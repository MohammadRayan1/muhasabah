import { Link } from "react-router";
import { BookOpen, Check, UserPlus } from "lucide-react";
import type { Route } from "./+types/dashboard";
import { prisma } from "@/lib/prisma.server";
import { requireTeacher } from "@/lib/auth/session.server";
import { getMonthlyRevenue } from "@/lib/reports.server";
import { recordPayment, setStudentActive } from "@/lib/mutations.server";
import { emailConfigured } from "@/lib/email.server";
import { getPaymentStatus } from "@/lib/status";
import StudentRow from "@/components/StudentRow";
import MonthLedger from "@/components/MonthLedger";
import TodayLine from "@/components/TodayLine";
import Arrow from "@/components/Arrow";
import type { Family, Program, Student } from "@/generated/prisma/client";
import { useT } from "@/lib/useT";

type StudentWithPrograms = Student & { enrollments: { daysPerWeek: number | null; program: Program }[]; family: Family | null };

export async function loader({ request }: Route.LoaderArgs) {
  await requireTeacher(request);

  const [students, [month], programCount, pendingFamilies] = await Promise.all([
    prisma.student.findMany({
      where: { active: true },
      orderBy: { nextDueDate: "asc" },
      include: { enrollments: { include: { program: true } }, family: true },
    }),
    getMonthlyRevenue(1),
    prisma.program.count({ where: { active: true } }),
    prisma.family.count({ where: { students: { some: { pendingApproval: true } } } }),
  ]);

  return { students, month, programCount, pendingFamilies, canEmail: emailConfigured() };
}

export async function action({ request }: Route.ActionArgs) {
  await requireTeacher(request);
  const formData = await request.formData();
  switch (formData.get("intent")) {
    case "recordPayment":
      return recordPayment(formData);
    case "removeStudent":
      formData.set("active", "false");
      return setStudentActive(formData);
    default:
      return { error: "Unknown action" };
  }
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const t = useT();
  const { students, month, programCount, pendingFamilies, canEmail } = loaderData;

  const overdue = students.filter((s) => getPaymentStatus(s.nextDueDate).status === "overdue");
  const dueSoon = students.filter((s) => getPaymentStatus(s.nextDueDate).status === "due_soon");
  const ok = students.filter((s) => getPaymentStatus(s.nextDueDate).status === "ok");

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">{t("Assalamu alaikum")}</h1>
        <TodayLine />
      </header>

      {pendingFamilies > 0 ? (
        <Link
          to="/signups"
          className="mb-8 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-700 transition-colors hover:bg-amber-100"
        >
          <span className="font-semibold">
            {pendingFamilies === 1
              ? t("1 new sign-up is waiting for you")
              : t("{n} new sign-ups are waiting for you", { n: pendingFamilies })}
          </span>
          <span className="text-sm font-semibold">
            {t("Review")} <Arrow />
          </span>
        </Link>
      ) : null}

      {students.length === 0 ? (
        <GettingStarted hasPrograms={programCount > 0} />
      ) : (
        <>
          <MonthLedger
            month={month}
            counts={{ overdue: overdue.length, dueSoon: dueSoon.length, ok: ok.length }}
          />
          <StudentGroup title="Needs attention" note="Past their due date" students={overdue} canEmail={canEmail} />
          <StudentGroup title="Due this week" note="Coming up in the next 7 days" students={dueSoon} canEmail={canEmail} />
          <StudentGroup title="Paid up" note="Nothing due for at least a week" students={ok} canEmail={canEmail} />
        </>
      )}
    </div>
  );
}

function StudentGroup({
  title,
  note,
  students,
  canEmail,
}: {
  title: string;
  note: string;
  students: StudentWithPrograms[];
  canEmail: boolean;
}) {
  const t = useT();
  if (students.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-baseline justify-between gap-4 px-1">
        <h2 className="text-lg font-bold text-stone-900">
          {t(title)} <span className="font-semibold text-stone-500 tabular-nums">{students.length}</span>
        </h2>
        <p className="text-sm text-stone-500">{t(note)}</p>
      </div>
      <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5">
        {students.map((student) => (
          <StudentRow key={student.id} student={student} canEmail={canEmail} />
        ))}
      </ul>
    </section>
  );
}

function GettingStarted({ hasPrograms }: { hasPrograms: boolean }) {
  const t = useT();
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
      href: "/signups#new-link",
      icon: UserPlus,
      title: "Send your first sign-up link",
      body: "People pick the program, the days and a start date. You approve, and the first bill is worked out for you.",
    },
  ];

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm shadow-stone-900/5 sm:p-10">
      <p lang="ar" className="text-start font-arabic text-4xl leading-[1.4] text-emerald-700">
        بسم الله
      </p>
      <h2 className="mt-2 text-2xl font-bold text-stone-900">{t("Let's set up your class")}</h2>
      <p className="mt-2 max-w-prose text-stone-600">
        {t("Once your students are in, this page shows what's come in this month, who's due this week, and who needs a reminder.")}
      </p>

      <ol className="mt-8 space-y-3">
        {steps.map((step, i) => {
          const Icon = step.done ? Check : step.icon;
          return (
            <li key={step.href}>
              <Link
                to={step.href}
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
                    {i + 1}. {t(step.title)}
                    {step.done ? <span className="ms-2 text-sm font-medium text-emerald-700">{t("Done")}</span> : null}
                  </span>
                  <span className="block text-sm text-stone-500">{t(step.body)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
