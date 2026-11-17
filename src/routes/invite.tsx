import { Form, useNavigation, useParams } from "react-router";
import type { Route } from "./+types/invite";
import { prisma } from "@/lib/prisma.server";
import { createSessionRedirect } from "@/lib/auth/session.server";
import { hashPassword } from "@/lib/auth/password.server";
import FormError from "@/components/FormError";
import GoogleButton from "@/components/GoogleButton";
import { googleConfigured } from "@/lib/auth/google.server";
import { metaTitle, useT } from "@/lib/useT";

export const meta: Route.MetaFunction = ({ matches }) => [{ title: metaTitle(matches, "Set up your account") }];

export async function loader({ request, params }: Route.LoaderArgs) {
  const invite = await prisma.invite.findUnique({
    where: { token: params.token },
    include: { student: { select: { name: true } } },
  });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) return { invite: null };
  return {
    invite: { email: invite.email, studentName: invite.student.name },
    google: googleConfigured(),
    googleProblem: new URL(request.url).searchParams.get("google"),
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) return { error: "Password must be at least 8 characters" };
  if (password !== confirmPassword) return { error: "Passwords do not match" };

  const invite = await prisma.invite.findUnique({ where: { token: params.token } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return { error: "This invite link is invalid or has expired" };
  }

  const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existingUser) {
    return { error: "An account with this email already exists. Log in instead." };
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: { email: invite.email, passwordHash, role: "MEMBER", studentId: invite.studentId },
    });
    await tx.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
    return createdUser;
  });

  return createSessionRedirect(user.id, user.role);
}

const inputClass =
  "mt-1 h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/15";

export default function InvitePage({ loaderData, actionData }: Route.ComponentProps) {
  const t = useT();
  const pending = useNavigation().state !== "idle";
  const { invite } = loaderData;
  const token = useParams().token ?? "";
  const googleProblem = invite ? loaderData.googleProblem : null;

  if (!invite) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 text-center">
        <h1 className="text-xl font-semibold text-stone-900">{t("Invite not valid")}</h1>
        <p className="mt-2 text-sm text-stone-500">
          {t("This invite link is invalid, expired, or has already been used. Ask your teacher to send a new one.")}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <p className="mb-1 text-sm font-medium text-emerald-700">
        Muhasabah <span lang="ar">محاسبة</span>
      </p>
      <h1 className="text-2xl font-semibold text-stone-900">{t("Set up your account")}</h1>
      <p className="mt-1 mb-6 text-sm text-stone-500">
        {t("Creating an account for {name}", { name: invite.studentName })} — {invite.email}
      </p>

      {loaderData.google ? (
        <div className="mb-5 space-y-4">
          <GoogleButton href={`/auth/google?for=invite&token=${encodeURIComponent(token)}`} label={t("Continue with Google")} />
          <p className="text-center text-xs text-stone-500">{t("Use the Google account for {email}, or choose a password below.", { email: invite.email })}</p>
        </div>
      ) : null}

      <Form method="post" className="space-y-4">
        <FormError
          message={
            actionData?.error ??
            (googleProblem === "wrong-email"
              ? "That Google account isn't the email this invite was sent to. Choose the right account, or set a password below."
              : googleProblem === "failed"
                ? "Google sign-in didn't go through. Please try again."
                : undefined)
          }
        />

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-stone-700">
            {t("Password")}
          </label>
          <input id="password" name="password" type="password" minLength={8} required className={inputClass} />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-stone-700">
            {t("Confirm password")}
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            minLength={8}
            required
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="min-h-11 w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? t("Creating account…") : t("Create account")}
        </button>
      </Form>
    </main>
  );
}
