import { prisma } from "@/lib/prisma";
import { acceptInvite } from "@/lib/auth-actions";

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
        <h1 className="text-xl font-semibold text-gray-900">Invite not valid</h1>
        <p className="mt-2 text-sm text-gray-500">
          This invite link is invalid, expired, or has already been used. Ask your teacher to send
          a new one.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold text-gray-900">Set up your account</h1>
      <p className="mt-1 mb-6 text-sm text-gray-500">
        Creating an account for {invite.student.name} — {invite.email}
      </p>

      <form action={acceptInvite} className="space-y-4">
        <input type="hidden" name="token" value={token} />

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            minLength={8}
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            minLength={8}
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Create account
        </button>
      </form>
    </main>
  );
}
