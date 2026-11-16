import { data, Form, Link } from "react-router";
import type { Route } from "./+types/student";
import { prisma } from "@/lib/prisma.server";
import { requireTeacher } from "@/lib/auth/session.server";
import {
  appUrl,
  createInvite,
  deleteProgress,
  logProgress,
  setStudentFamily,
  updateStudentPrograms,
} from "@/lib/mutations.server";
import { emailConfigured } from "@/lib/email.server";
import { receiptCode } from "@/lib/reminders";
import RemindMenu from "@/components/RemindMenu";
import { ProgressForm, ProgressList, ProgressSummary } from "@/components/ProgressLog";
import { input, secondaryButton } from "@/components/ui";
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

  const [student, activePrograms, families] = await Promise.all([
    prisma.student.findUnique({
      where: { id: params.id },
      include: {
        payments: { orderBy: { paidAt: "desc" } },
        family: { include: { students: { where: { active: true }, select: { id: true, name: true } } } },
        progress: { orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 30 },
        enrollments: { include: { program: true } },
        user: { select: { email: true } },
        invites: { where: { acceptedAt: null }, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.program.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } }),
    prisma.family.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!student) throw data("Not found", { status: 404 });

  const pendingInvite = student.invites.find((invite) => invite.expiresAt > new Date()) ?? null;
  const inviteUrl = pendingInvite ? `${appUrl()}/invite/${pendingInvite.token}` : null;

  return { student, activePrograms, families, pendingInvite, inviteUrl, canEmail: emailConfigured() };
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
    case "setFamily":
      return setStudentFamily(formData);
    case "logProgress":
      return logProgress(formData);
    case "deleteProgress":
      return deleteProgress(formData);
    default:
      return { error: "Unknown action" };
  }
}

export default function StudentProfilePage({ loaderData }: Route.ComponentProps) {
  const { student, activePrograms, families, pendingInvite, inviteUrl, canEmail } = loaderData;
  const siblings = student.family?.students.filter((s) => s.id !== student.id) ?? [];
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
        <div className="flex flex-col items-end gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_STYLES[status]}`}
          >
            {STATUS_LABEL[status]}
          </span>
          {status !== "ok" ? <RemindMenu student={student} canEmail={canEmail} /> : null}
        </div>
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
        <h2 className="mb-3 text-lg font-medium text-stone-900">Family</h2>
        {student.family ? (
          <p className="mb-3 text-sm text-stone-600">
            In the{" "}
            <Link to={`/families/${student.family.id}`} className="font-semibold text-emerald-700 hover:underline">
              {student.family.name}
            </Link>
            {siblings.length > 0 ? ` with ${siblings.map((s) => s.name).join(", ")}` : ""}.
          </p>
        ) : (
          <p className="mb-3 text-sm text-stone-500">Not in a family. Add siblings to one so their parent sees them together.</p>
        )}
        <Form method="post" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="intent" value="setFamily" />
          <div className="min-w-48 flex-1">
            <label htmlFor="familyId" className="sr-only">
              Family
            </label>
            <select id="familyId" name="familyId" defaultValue={student.familyId ?? ""} key={student.familyId ?? "none"} className={input}>
              <option value="">No family</option>
              {families.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={secondaryButton}>
            Save
          </button>
          <Link to="/families" className="min-h-11 px-2 py-3 text-sm text-stone-500 hover:underline">
            New family…
          </Link>
        </Form>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-lg font-medium text-stone-900">Quran progress</h2>
        <ProgressSummary entries={student.progress} />
        <ProgressForm lastSurah={student.progress[0]?.surah} />
        <div className="mt-4">
          <ProgressList entries={student.progress} canDelete />
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
                <th className="px-4 py-2 text-right font-medium">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {student.payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3 text-stone-900">{formatDate(payment.paidAt)}</td>
                  <td className="px-4 py-3 text-right text-stone-700">
                    {formatCurrency(payment.amount)}
                    {payment.method === "card" ? <span className="ml-1 text-xs text-stone-500">(online)</span> : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/receipts/${payment.id}`} className="text-emerald-700 hover:underline">
                      {receiptCode(payment.receiptNumber)}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
