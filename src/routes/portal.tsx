import { Form, redirect } from "react-router";
import type { Route } from "./+types/portal";
import { prisma } from "@/lib/prisma.server";
import { requireUser } from "@/lib/auth/session.server";
import { getPaymentStatus, STATUS_BADGE_STYLES, STATUS_LABEL } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/format";

export const meta: Route.MetaFunction = () => [{ title: "Your portal · Muhasabah" }];

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireUser(request);
  if (session.role === "TEACHER") throw redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      student: {
        include: {
          payments: { orderBy: { paidAt: "desc" } },
          enrollments: { include: { program: true } },
        },
      },
    },
  });

  return { email: user?.email ?? "", student: user?.student ?? null };
}

function LogoutButton({ className }: { className: string }) {
  return (
    <Form method="post" action="/logout">
      <button type="submit" className={className}>
        Log out
      </button>
    </Form>
  );
}

const card = "rounded-2xl border border-stone-200 bg-white p-4 shadow-sm shadow-stone-900/5";

export default function PortalPage({ loaderData }: Route.ComponentProps) {
  const { student, email } = loaderData;

  if (!student) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-sm text-stone-500">
          Your account isn&apos;t linked to a student yet. Contact your teacher.
        </p>
        <div className="mt-4">
          <LogoutButton className="text-sm text-stone-500 hover:underline" />
        </div>
      </main>
    );
  }

  const { status } = getPaymentStatus(student.nextDueDate);
  const totalPaid = student.payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-start justify-between pr-14">
        <div>
          <p className="mb-1 text-sm font-medium text-emerald-700">
            Muhasabah <span lang="ar" dir="rtl">محاسبة</span>
          </p>
          <h1 className="text-2xl font-semibold text-stone-900">{student.name}</h1>
          <p className="text-sm text-stone-500">{email}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_STYLES[status]}`}>
            {STATUS_LABEL[status]}
          </span>
          <LogoutButton className="text-xs text-stone-500 hover:text-stone-700 hover:underline" />
        </div>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className={card}>
          <p className="text-lg font-semibold text-stone-900">{formatCurrency(student.tuitionAmount)}</p>
          <p className="text-sm text-stone-500">Tuition / month</p>
        </div>
        <div className={card}>
          <p className="text-lg font-semibold text-stone-900">{formatDate(student.nextDueDate)}</p>
          <p className="text-sm text-stone-500">Next due</p>
        </div>
        <div className={card}>
          <p className="text-lg font-semibold text-stone-900">{formatCurrency(totalPaid)}</p>
          <p className="text-sm text-stone-500">Total paid</p>
        </div>
      </div>

      {student.enrollments.length > 0 ? (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-medium text-stone-900">Programs</h2>
          <div className="space-y-2">
            {student.enrollments.map((enrollment) => (
              <div key={enrollment.id} className={card}>
                <p className="font-medium text-stone-900">{enrollment.program.name}</p>
                <p className="text-sm text-stone-500">
                  {enrollment.program.days} · {enrollment.program.time} · {enrollment.program.location}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <h2 className="mb-3 text-lg font-medium text-stone-900">Payment History</h2>

      {student.payments.length === 0 ? (
        <p className="text-sm text-stone-500">No payments recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-500">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {student.payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3 text-stone-900">{formatDate(payment.paidAt)}</td>
                  <td className="px-4 py-3 text-right text-stone-700">{formatCurrency(payment.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
