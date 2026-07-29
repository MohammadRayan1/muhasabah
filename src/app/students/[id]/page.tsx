import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPaymentStatus, STATUS_BADGE_STYLES, STATUS_LABEL } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/format";
import { requireTeacher } from "@/lib/auth/dal";
import { createInvite } from "@/lib/actions";

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  await requireTeacher();

  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      payments: { orderBy: { paidAt: "desc" } },
      enrollments: { include: { program: true } },
      user: true,
      invites: { where: { acceptedAt: null }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!student) notFound();

  const pendingInvite = student.invites.find((invite) => invite.expiresAt > new Date());

  const { status } = getPaymentStatus(student.nextDueDate);
  const totalPaid = student.payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm text-gray-500 hover:underline">
        ← Back to dashboard
      </Link>

      <div className="mt-4 mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{student.name}</h1>
          <p className="text-sm text-gray-500">
            {[student.phone, student.email].filter(Boolean).join(" · ") || "No contact info"}
          </p>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_STYLES[status]}`}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-lg font-semibold text-gray-900">{formatCurrency(student.tuitionAmount)}</p>
          <p className="text-sm text-gray-500">Tuition / month</p>
          {student.priceNote ? (
            <p className="mt-1 text-xs text-amber-700">{student.priceNote}</p>
          ) : null}
        </div>
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-lg font-semibold text-gray-900">{formatDate(student.nextDueDate)}</p>
          <p className="text-sm text-gray-500">Next due</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-lg font-semibold text-gray-900">{formatCurrency(totalPaid)}</p>
          <p className="text-sm text-gray-500">Total paid</p>
        </div>
      </div>

      {student.enrollments.length > 0 ? (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-medium text-gray-900">Programs</h2>
          <div className="space-y-2">
            {student.enrollments.map((enrollment) => (
              <div key={enrollment.id} className="rounded-lg border border-gray-200 p-3">
                <p className="font-medium text-gray-900">{enrollment.program.name}</p>
                <p className="text-sm text-gray-500">
                  {enrollment.program.days} · {enrollment.program.time} · {enrollment.program.location}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-8">
        <h2 className="mb-3 text-lg font-medium text-gray-900">Portal Access</h2>
        {student.user ? (
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-sm text-gray-700">
              Account active — <span className="font-medium">{student.user.email}</span>
            </p>
          </div>
        ) : pendingInvite ? (
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-sm text-gray-700">
              Invite sent to <span className="font-medium">{pendingInvite.email}</span>, not yet
              accepted.
            </p>
            <p className="mt-1 break-all text-xs text-gray-500">
              {(process.env.APP_URL ?? "http://localhost:3000") + "/invite/" + pendingInvite.token}
            </p>
          </div>
        ) : (
          <form action={createInvite} className="flex items-center gap-2">
            <input type="hidden" name="studentId" value={student.id} />
            <input
              type="email"
              name="email"
              placeholder="parent@example.com"
              defaultValue={student.email ?? ""}
              required
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Send Invite
            </button>
          </form>
        )}
      </div>

      {student.notes ? (
        <p className="mb-8 rounded-md bg-gray-50 p-3 text-sm text-gray-600">{student.notes}</p>
      ) : null}

      <h2 className="mb-3 text-lg font-medium text-gray-900">Payment History</h2>

      {student.payments.length === 0 ? (
        <p className="text-sm text-gray-500">No payments recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {student.payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3 text-gray-900">{formatDate(payment.paidAt)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(payment.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
