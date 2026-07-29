import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSessionFromCookies, type SessionPayload } from "@/lib/auth/session";

export const verifySession = cache(async (): Promise<SessionPayload> => {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect("/login");
  }
  return session;
});

/** Redirects non-teachers to /portal. Call at the top of every teacher-only page/action. */
export async function requireTeacher(): Promise<SessionPayload> {
  const session = await verifySession();
  if (session.role !== "TEACHER") {
    redirect("/portal");
  }
  return session;
}
