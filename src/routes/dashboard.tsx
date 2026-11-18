import { Link } from "react-router";
import { BellRing, BookOpen, Check, ChevronRight, ClipboardList, FileCheck2, UserPlus, Users } from "lucide-react";
import type { Route } from "./+types/dashboard";
import { withToast } from "@/lib/toast.server";
import { prisma } from "@/lib/prisma.server";
import { requireTeacher } from "@/lib/auth/session.server";
import { getMonthlyRevenue } from "@/lib/reports.server";
import { setStudentActive } from "@/lib/mutations.server";
import { emailConfigured } from "@/lib/email.server";
import { getPaymentStatus } from "@/lib/status";
import StudentRow from "@/components/StudentRow";
import type { PendingProof } from "@/components/RecordPaymentDialog";
import MonthLedger from "@/components/MonthLedger";
import TodayHeading from "@/components/TodayHeading";
import Arrow from "@/components/Arrow";
import { pageWidth } from "@/components/ui";
import type { Family, Program, Student } from "@/generated/prisma/client";
import { useT } from "@/lib/useT";

type StudentWithPrograms = Student & { enrollments: { daysPerWeek: number | null; program: Program }[]; family: Family | null };

export async function loader({ request }: Route.LoaderArgs) {
  await requireTeacher(request);

  const [students, [month], programCount, pendingFamilies, proofs] = await Promise.all([
    prisma.student.findMany({
      where: { active: true },
      orderBy: { nextDueDate: "asc" },
      include: { enrollments: { include: { program: true } }, family: true },
    }),
    getMonthlyRevenue(1),
    prisma.program.count({ where: { active: true } }),
    prisma.family.count({ where: { students: { some: { pendingApproval: true } } } }),
    prisma.paymentProof.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      select: { id: true, amount: true, method: true, paidOn: true, note: true, imageType: true, studentIds: true },
    }),
  ]);

  return { students, month, programCount, pendingFamilies, proofs, canEmail: emailConfigured() };
}

export async function action({ request }: Route.ActionArgs) {
  await requireTeacher(request);
  const formData = await request.formData();
  switch (formData.get("intent")) {
    case "removeStudent": {
      formData.set("active", "false");
      const studentId = String(formData.get("studentId") ?? "");
      const student = await prisma.student.findUnique({ where: { id: studentId }, select: { name: true } });
      return withToast(await setStudentActive(formData), "{name} moved to Archived", {
        vars: { name: student?.name ?? "" },
        undo: { kind: "student-archive", studentId },
      });
    }
    default:
      return { error: "Unknown action" };
  }
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const t = useT();
  const { students, month, programCount, pendingFamilies, proofs, canEmail } = loaderData;
  const pendingProofs = proofs.length;

  const overdue = students.filter((s) => getPaymentStatus(s.nextDueDate).status === "overdue");
  const dueSoon = students.filter((s) => getPaymentStatus(s.nextDueDate).status === "due_soon");
  const ok = students.filter((s) => getPaymentStatus(s.nextDueDate).status === "ok");

  const groups = [
    { title: "Overdue", note: "Past their due date", students: overdue },
    { title: "Due this week", note: "Coming up in the next 7 days", students: dueSoon },
    { title: "Upcoming", note: "Nothing due in the next 7 days", students: ok },
  ].filter((g) => g.students.length > 0);

  return (
    <div className={pageWidth}>
      <header className="mb-10" data-tour="today">
        <TodayHeading />
      </header>

      {students.length > 0 || pendingFamilies > 0 ? (
        <TodoList proofs={pendingProofs} registrations={pendingFamilies} toRemind={overdue.length + dueSoon.length} />
      ) : null}

      {students.length === 0 ? (
        <GettingStarted hasPrograms={programCount > 0} />
      ) : (
        <>
          <div className="mb-10 grid gap-4 md:grid-cols-3">
            <MonthLedger
              className="md:col-span-3"
              month={month}
              counts={{ overdue: overdue.length, dueSoon: dueSoon.length, ok: ok.length }}
            />
          </div>

          <section data-tour="students-list" aria-labelledby="students-title" className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_2px_rgb(28_25_23/0.04)]">
            <div className="flex items-center justify-between gap-4 border-b border-stone-100 px-5 py-4">
              <h2 id="students-title" className="flex items-center gap-2 text-base font-semibold text-stone-900">
                <Users aria-hidden className="h-4 w-4 text-stone-400" />
                {t("Students")}
                <span className="font-normal text-stone-400 tabular-nums">{students.length}</span>
              </h2>
              <Link to="/roster" className="text-sm font-semibold text-emerald-700 hover:underline">
                {t("View all")} <Arrow />
              </Link>
            </div>
            {groups.map((g) => (
              <StudentGroup key={g.title} {...g} canEmail={canEmail} proofs={proofs} />
            ))}
          </section>
        </>
      )}

    </div>
  );
}

/** The day's jobs as plain, one-tap buttons, most important first. */
function TodoList({ proofs, registrations, toRemind }: { proofs: number; registrations: number; toRemind: number }) {
  const t = useT();
  const items = [
    proofs > 0 && {
      to: "/payments",
      icon: FileCheck2,
      text: proofs === 1 ? t("Check 1 payment sent to you") : t("Check {n} payments sent to you", { n: proofs }),
    },
    registrations > 0 && {
      to: "/signups",
      icon: ClipboardList,
      text: registrations === 1 ? t("Approve 1 new registration") : t("Approve {n} new registrations", { n: registrations }),
    },
    toRemind > 0 && {
      to: "/reminders",
      icon: BellRing,
      text: toRemind === 1 ? t("Remind 1 student about tuition") : t("Remind {n} students about tuition", { n: toRemind }),
    },
  ].filter(Boolean) as { to: string; icon: typeof Users; text: string }[];

  return (
    <section data-tour="todo" aria-labelledby="todo-title" className="mb-8">
      <h2 id="todo-title" className="mb-4 text-3xl font-bold tracking-tight text-stone-900">
        {t("To do")}
      </h2>
      {items.length === 0 ? (
        <p className="flex min-h-20 items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 text-xl font-medium text-emerald-700">
          <Check aria-hidden className="h-6 w-6 shrink-0" />
          {t("You're all caught up. Nothing needs you today.")}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className="group flex min-h-20 items-center gap-5 rounded-2xl border border-stone-200 bg-white px-6 py-4 text-xl font-semibold text-stone-900 shadow-[0_1px_2px_rgb(28_25_23/0.04)] transition-colors hover:border-emerald-300 hover:bg-emerald-50/60"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold-wash text-gold-ink">
                  <item.icon aria-hidden className="h-6 w-6" />
                </span>
                <span className="flex-1">{item.text}</span>
                <span className="inline-flex items-center gap-1 text-lg font-semibold text-emerald-700">
                  {t("Open")}
                  <ChevronRight aria-hidden className="h-5 w-5 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StudentGroup({
  title,
  note,
  students,
  canEmail,
  proofs,
}: {
  title: string;
  note: string;
  students: StudentWithPrograms[];
  canEmail: boolean;
  proofs: PendingProof[];
}) {
  const t = useT();

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 bg-stone-50/70 px-5 py-2 text-xs font-medium">
        <h3 className="text-stone-700">
          {t(title)} <span className="text-stone-400 tabular-nums">{students.length}</span>
        </h3>
        <p className="text-stone-400">{t(note)}</p>
      </div>
      <ul className="divide-y divide-stone-100">
        {students.map((student) => (
          <StudentRow
            key={student.id}
            student={student}
            canEmail={canEmail}
            proofs={proofs.filter((p) => p.studentIds.includes(student.id))}
          />
        ))}
      </ul>
    </div>
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
      title: "Send your first registration link",
      body: "People pick the program, the days and a start date. You approve, and the first bill is worked out for you.",
    },
  ];

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm shadow-stone-900/5 sm:p-10">
      <p lang="ar" className="text-start font-arabic text-4xl leading-[1.4] text-emerald-700">
        بسم الله
      </p>
      <h2 className="mt-2 text-2xl font-bold text-stone-900">{t("Set up your class")}</h2>
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
