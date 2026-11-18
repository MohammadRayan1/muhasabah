import { data, Link } from "react-router";
import type { Route } from "./+types/student";
import { withToast } from "@/lib/toast.server";
import { prisma } from "@/lib/prisma.server";
import { requireTeacher } from "@/lib/auth/session.server";
import {
  appUrl,
  createInvite,
  updateContact,
  updateStudentPrograms,
} from "@/lib/mutations.server";
import { emailConfigured } from "@/lib/email.server";
import { receiptCode } from "@/lib/reminders";
import RemindMenu from "@/components/RemindMenu";
import BackLink from "@/components/BackLink";
import AutoSaveForm from "@/components/AutoSaveForm";
import { card, input, label, pageWidth, pageTitle } from "@/components/ui";
import { getPaymentStatus, STATUS_BADGE_STYLES, STATUS_LABEL } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/format";
import SendInviteForm from "@/components/SendInviteForm";
import EditProgramsForm from "@/components/EditProgramsForm";
import Avatar from "@/components/Avatar";
import { useT } from "@/lib/useT";
import { daysLabel } from "@/lib/pricing";
import { paymentMethodLabel } from "@/lib/proofs";

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
        family: { include: { students: { where: { active: true }, select: { id: true, name: true } } } },
        enrollments: { include: { program: true } },
        user: { select: { email: true } },
        invites: { where: { acceptedAt: null }, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.program.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } }),
  ]);

  if (!student) throw data("Not found", { status: 404 });

  const pendingInvite = student.invites.find((invite) => invite.expiresAt > new Date()) ?? null;
  const inviteUrl = pendingInvite ? `${appUrl(request)}/invite/${pendingInvite.token}` : null;

  return { student, activePrograms, pendingInvite, inviteUrl, canEmail: emailConfigured() };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireTeacher(request);
  const formData = await request.formData();
  formData.set("studentId", params.id);
  switch (formData.get("intent")) {
    case "updatePrograms":
      return withToast(await updateStudentPrograms(formData), "Programs and tuition saved");
    case "invite":
      return withToast(await createInvite(formData), "Portal invite created");
    case "updateContact":
      return updateContact(formData);
    default:
      return { error: "Unknown action" };
  }
}

export default function StudentProfilePage({ loaderData }: Route.ComponentProps) {
  const t = useT();
  const { student, activePrograms, pendingInvite, inviteUrl, canEmail } = loaderData;
  const siblings = student.family?.students.filter((s) => s.id !== student.id) ?? [];
  const { status } = getPaymentStatus(student.nextDueDate);
  const totalPaid = student.payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className={pageWidth}>
      <BackLink to="/roster" label={t("Back to Students")} />
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={student.name} size="lg" />
          <div>
            <h1 className={pageTitle}>{student.name}</h1>
            <p className="text-[15px] font-medium text-stone-700">{t("Joined {date}", { date: formatDate(student.joinedAt) })}</p>
            {student.phone || student.email ? (
              <p className="text-sm text-stone-500">{[student.phone, student.email].filter(Boolean).join(" · ")}</p>
            ) : student.family ? null : (
              <p className="text-sm text-stone-500">{t("No contact info")}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_STYLES[status]}`}
          >
            {t(STATUS_LABEL[status])}
          </span>
          {status !== "ok" ? <RemindMenu student={student} canEmail={canEmail} /> : null}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5 p-4">
          <p className="text-lg font-semibold text-stone-900">{formatCurrency(student.tuitionAmount)}</p>
          <p className="text-sm text-stone-500">{t("Tuition / month")}</p>
          {student.priceNote ? (
            <p className="mt-1 text-xs text-amber-700">{student.priceNote}</p>
          ) : null}
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5 p-4">
          <p className="text-lg font-semibold text-stone-900">{formatDate(student.nextDueDate)}</p>
          <p className="text-sm text-stone-500">{t("Next due")}</p>
          {student.firstPaymentAmount != null ? (
            <p className="mt-1 text-xs text-amber-700">
              {t("First bill: {amount} (includes leftover days)", { amount: formatCurrency(student.firstPaymentAmount) })}
            </p>
          ) : null}
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5 p-4">
          <p className="text-lg font-semibold text-stone-900">{formatCurrency(totalPaid)}</p>
          <p className="text-sm text-stone-500">{t("Total paid")}</p>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="mb-1 text-lg font-semibold text-stone-900">{student.family ? t("Parent") : t("Contact")}</h2>
        {siblings.length > 0 ? (
          <p className="mb-3 text-[15px] text-stone-600">
            {t("Also registered by this parent:")}{" "}
            {siblings.map((s, i) => (
              <span key={s.id}>
                {i > 0 ? ", " : ""}
                <Link to={`/students/${s.id}`} className="font-semibold text-emerald-700 hover:underline">
                  {s.name}
                </Link>
              </span>
            ))}
          </p>
        ) : null}
        <AutoSaveForm intent="updateContact" className={`${card} space-y-4`}>
          <div className="grid gap-4 sm:grid-cols-2">
            {student.family ? (
              <div className="sm:col-span-2">
                <label htmlFor="guardianName" className={label}>
                  {t("Parent's name")}
                </label>
                <input id="guardianName" name="guardianName" defaultValue={student.family.guardianName ?? ""} className={input} />
              </div>
            ) : null}
            <div>
              <label htmlFor="contactPhone" className={label}>
                {t("Phone (for WhatsApp / text)")}
              </label>
              <input
                id="contactPhone"
                name="phone"
                type="tel"
                dir="ltr"
                defaultValue={(student.family ? student.family.phone : student.phone) ?? ""}
                className={input}
              />
            </div>
            <div>
              <label htmlFor="contactEmail" className={label}>
                {t("Email")}
              </label>
              <input
                id="contactEmail"
                name="email"
                type="email"
                dir="ltr"
                defaultValue={(student.family ? student.family.email : student.email) ?? ""}
                className={input}
              />
            </div>
          </div>
        </AutoSaveForm>
      </section>

      <div className="mb-8">
        <h2 className="mb-3 text-lg font-medium text-stone-900">{t("Programs")}</h2>
        {student.enrollments.some((e) => e.daysPerWeek) ? (
          <p className="mb-3 text-sm text-stone-600">
            {student.enrollments
              .filter((e) => e.daysPerWeek)
              .map((e) => `${e.program.name}: ${t(daysLabel(e.daysPerWeek!))}`)
              .join(" · ")}
          </p>
        ) : null}
        <EditProgramsForm
          key={student.updatedAt.toISOString()}
          studentId={student.id}
          tuitionAmount={student.tuitionAmount}
          programs={activePrograms}
          enrolledProgramIds={student.enrollments.map((e) => e.programId)}
        />
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-lg font-medium text-stone-900">{t("Portal access")}</h2>
        {student.user ? (
          <div className="rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5 p-3">
            <p className="text-sm text-stone-700">
              {t("Account active")} — <span className="font-medium">{student.user.email}</span>
            </p>
          </div>
        ) : pendingInvite ? (
          <div className="rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5 p-3">
            <p className="text-sm text-stone-700">
              {t("Invite sent to {email}, not yet accepted.", { email: pendingInvite.email })}
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

      <h2 className="mb-3 text-lg font-medium text-stone-900">{t("Payment history")}</h2>

      {student.payments.length === 0 ? (
        <p className="text-sm text-stone-500">{t("No payments recorded yet.")}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-start text-stone-500">
              <tr>
                <th className="px-4 py-2 font-medium">{t("Date")}</th>
                <th className="px-4 py-2 text-end font-medium">{t("Amount")}</th>
                <th className="px-4 py-2 text-end font-medium">{t("Receipt")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {student.payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3 text-stone-900">{formatDate(payment.paidAt)}</td>
                  <td className="px-4 py-3 text-end text-stone-700">
                    {formatCurrency(payment.amount)}
                    {payment.method !== "manual" ? (
                      <span className="block text-xs text-stone-500">{t(paymentMethodLabel(payment.method))}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-end">
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
