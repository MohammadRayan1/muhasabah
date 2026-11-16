import { data } from "react-router";
import type { Route } from "./+types/student";
import { prisma } from "@/lib/prisma.server";
import { requireTeacher } from "@/lib/auth/session.server";
import { appUrl, createInvite, updateStudentPrograms } from "@/lib/mutations.server";
import { getPaymentStatus, STATUS_BADGE_STYLES, STATUS_LABEL } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/format";
import SendInviteForm from "@/components/SendInviteForm";
import EditProgramsForm from "@/components/EditProgramsForm";
import Avatar from "@/components/Avatar";

export const meta: Route.MetaFunction = ({ data }) => [
  { title: `${data?.student.name ?? "Student"} · Muhasabah` },
];

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireTeacher(request);

  const [student, activePrograms] = await Promise.all([
    prisma.student.findUnique({
      where: { id: params.id },
      include: {
        payments: { orderBy: { paidAt: "desc" } },
        enrollments: { include: { program: true } },
        user: { select: { email: true } },
        invites: { where: { acceptedAt: null }, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.program.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } }),
  ]);

  if (!student) throw data("Not found", { status: 404 });

  const pendingInvite = student.invites.find((invite) => invite.expiresAt > new Date()) ?? null;
  const inviteUrl = pendingInvite ? `${appUrl()}/invite/${pendingInvite.token}` : null;

  return { student, activePrograms, pendingInvite, inviteUrl };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireTeacher(request);
  const formData = await request.formData();
  formData.set("studentId", params.id);
  switch (formData.get("intent")) {
    case "updatePrograms":
      return updateStudentPrograms(formData);
    case "invite":
      return createInvite(formData);
    default:
      return { error: "Unknown action" };
  }
}

export default function StudentProfilePage({ loaderData }: Route.ComponentProps) {
  const { student, activePrograms, pendingInvite, inviteUrl } = loaderData;
  const { status } = getPaymentStatus(student.nextDueDate);
  const totalPaid = student.payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={student.name} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-stone-900">{student.name}</h1>
            <p className="text-sm text-stone-500">
              {[student.phone, student.email].filter(Boolean).join(" · ") || "No contact info"}
            </p>
          </div>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_STYLES[status]}`}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5 p-4">
          <p className="text-lg font-semibold text-stone-900">{formatCurrency(student.tuitionAmount)}</p>
          <p className="text-sm text-stone-500">Tuition / month</p>
          {student.priceNote ? (
            <p className="mt-1 text-xs text-amber-700">{student.priceNote}</p>
          ) : null}
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5 p-4">
          <p className="text-lg font-semibold text-stone-900">{formatDate(student.nextDueDate)}</p>
          <p className="text-sm text-stone-500">Next due</p>
          {student.firstPaymentAmount != null ? (
            <p className="mt-1 text-xs text-amber-700">
              First bill: {formatCurrency(student.firstPaymentAmount)} (includes leftover days)
            </p>
          ) : null}
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5 p-4">
          <p className="text-lg font-semibold text-stone-900">{formatCurrency(totalPaid)}</p>
          <p className="text-sm text-stone-500">Total paid</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-lg font-medium text-stone-900">Programs</h2>
        <EditProgramsForm
          key={student.updatedAt.toISOString()}
          studentId={student.id}
          tuitionAmount={student.tuitionAmount}
          programs={activePrograms}
          enrolledProgramIds={student.enrollments.map((e) => e.programId)}
        />
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-lg font-medium text-stone-900">Portal Access</h2>
        {student.user ? (
          <div className="rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5 p-3">
            <p className="text-sm text-stone-700">
              Account active — <span className="font-medium">{student.user.email}</span>
            </p>
          </div>
        ) : pendingInvite ? (
          <div className="rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5 p-3">
            <p className="text-sm text-stone-700">
              Invite sent to <span className="font-medium">{pendingInvite.email}</span>, not yet
              accepted.
            </p>
            <p className="mt-1 break-all text-xs text-stone-500">
              {inviteUrl}
            </p>
          </div>
        ) : (
          <SendInviteForm studentId={student.id} defaultEmail={student.email ?? ""} />
        )}
      </div>

      {student.notes ? (
        <p className="mb-8 rounded-xl bg-stone-50 p-3 text-sm text-stone-600">{student.notes}</p>
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
    </div>
  );
}
