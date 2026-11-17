import { redirect } from "react-router";
import type { Route } from "./+types/auth.google.callback";
import { prisma } from "@/lib/prisma.server";
import { createSessionRedirect } from "@/lib/auth/session.server";
import { hashPassword } from "@/lib/auth/password.server";
import {
  clearFlowCookie,
  finishGoogleSignIn,
  identityCookie,
  returnPath,
  unusablePassword,
} from "@/lib/auth/google.server";

function back(path: string, problem: string) {
  return redirect(`${path}?google=${problem}`, { headers: { "Set-Cookie": clearFlowCookie() } });
}

export async function loader({ request }: Route.LoaderArgs) {
  const result = await finishGoogleSignIn(request);
  if (!result.ok) return back(result.purpose ? returnPath(result.purpose) : "/login", "failed");
  const { purpose, identity } = result;

  // Sign-in page: existing accounts only.
  if (purpose.kind === "login") {
    const user = await prisma.user.findUnique({ where: { email: identity.email } });
    if (!user) return back("/login", "no-account");
    const response = await createSessionRedirect(user.id, user.role);
    response.headers.append("Set-Cookie", clearFlowCookie());
    return response;
  }

  // Invite from the teacher: the Google account must be the invited email.
  if (purpose.kind === "invite") {
    const invite = await prisma.invite.findUnique({ where: { token: purpose.token } });
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) return back(returnPath(purpose), "failed");
    if (invite.email.toLowerCase() !== identity.email) return back(returnPath(purpose), "wrong-email");
    if (await prisma.user.findUnique({ where: { email: identity.email } })) return back("/login", "has-account");

    const passwordHash = await hashPassword(unusablePassword());
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email: identity.email, passwordHash, role: "MEMBER", studentId: invite.studentId },
      });
      await tx.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
      return created;
    });
    const response = await createSessionRedirect(user.id, user.role);
    response.headers.append("Set-Cookie", clearFlowCookie());
    return response;
  }

  // Registration link: remember the Google email; the form still asks for the rest.
  if (await prisma.user.findUnique({ where: { email: identity.email } })) return back(returnPath(purpose), "has-account");
  const headers = new Headers();
  headers.append("Set-Cookie", clearFlowCookie());
  headers.append("Set-Cookie", await identityCookie(identity, purpose.token));
  return redirect(returnPath(purpose), { headers });
}
