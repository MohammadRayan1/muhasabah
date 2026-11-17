import { SignJWT, jwtVerify } from "jose";
import { redirect } from "react-router";
import type { Role } from "@/generated/prisma/client";

const SESSION_COOKIE = "session";
const SESSION_DURATION_S = 30 * 24 * 60 * 60; // 30 days

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  role: Role;
};

async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecretKey());
}

async function decryptSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    if (typeof payload.userId !== "string" || typeof payload.role !== "string") return null;
    return { userId: payload.userId, role: payload.role as Role };
  } catch {
    return null;
  }
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("Cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

function cookieHeader(value: string, maxAge: number) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function getSession(request: Request): Promise<SessionPayload | null> {
  return decryptSession(readCookie(request, SESSION_COOKIE));
}

export function homeFor(role: Role) {
  return role === "TEACHER" ? "/" : "/portal";
}

/** Sign in: redirect to the user's home with a fresh session cookie. */
export async function createSessionRedirect(userId: string, role: Role, to = homeFor(role)) {
  const token = await encryptSession({ userId, role });
  return redirect(to, { headers: { "Set-Cookie": cookieHeader(token, SESSION_DURATION_S) } });
}

export function destroySessionRedirect() {
  return redirect("/login", { headers: { "Set-Cookie": cookieHeader("", 0) } });
}

/** Any signed-in user, or a redirect to /login. */
export async function requireUser(request: Request): Promise<SessionPayload> {
  const session = await getSession(request);
  if (!session) throw redirect("/login");
  return session;
}

/** Teachers only; members are sent to their portal. Call in every teacher loader and action. */
export async function requireTeacher(request: Request): Promise<SessionPayload> {
  const session = await requireUser(request);
  if (session.role !== "TEACHER") throw redirect("/portal");
  return session;
}
