import { prisma } from "@/lib/prisma";
import AcceptInviteForm from "@/components/AcceptInviteForm";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { student: true },
  });

  const isValid = invite && !invite.acceptedAt && invite.expiresAt > new Date();

  if (!isValid) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 text-center">
        <h1 className="text-xl font-semibold text-stone-900">Invite not valid</h1>
        <p className="mt-2 text-sm text-stone-500">
          This invite link is invalid, expired, or has already been used. Ask your teacher to send
          a new one.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <p className="mb-1 text-sm font-medium text-emerald-700">Muhasabah <span lang="ar" dir="rtl">محاسبة</span></p>
      <h1 className="text-2xl font-semibold text-stone-900">Set up your account</h1>
      <p className="mt-1 mb-6 text-sm text-stone-500">
        Creating an account for {invite.student.name} — {invite.email}
      </p>

      <AcceptInviteForm token={token} />
    </main>
  );
}
