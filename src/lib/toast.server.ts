import { randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { data } from "react-router";
import { readCookie } from "@/lib/auth/session.server";

// A one-time confirmation message ("Program saved") carried in a short-lived cookie:
// set by an action, read once by the root loader on the revalidation that follows,
// then cleared. An Undo button carries a signed ticket describing exactly what to
// put back, so it can't be forged or replayed after it expires.

const COOKIE = "flash";

export type UndoPayload =
  | { kind: "student-archive"; studentId: string }
  | { kind: "program-archive"; programId: string }
  | {
      kind: "proof-approve";
      proofId: string;
      students: { id: string; nextDueDate: string; firstPaymentAmount: number | null }[];
    }
  | {
      kind: "signup-approve";
      familyId: string;
      students: { id: string; tuitionAmount: number; firstPaymentAmount: number | null; nextDueDate: string }[];
      // A "Just me" sign-up's stand-in family is deleted on approval; undo brings it back.
      removedFamily: { name: string; guardianName: string | null; phone: string | null; email: string | null } | null;
    };

export type Toast = { id: string; message: string; vars?: Record<string, string>; undo?: string };

const UNDO_WINDOW = "2m";

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
}

function cookie(value: string, maxAge: number) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export async function toastCookie(message: string, opts: { vars?: Record<string, string>; undo?: UndoPayload } = {}) {
  const undo = opts.undo
    ? await new SignJWT({ undo: opts.undo }).setProtectedHeader({ alg: "HS256" }).setExpirationTime(UNDO_WINDOW).sign(key())
    : undefined;
  const toast: Toast = { id: randomBytes(6).toString("hex"), message, vars: opts.vars, undo };
  return cookie(JSON.stringify(toast), 60);
}

/** Return an action's result with a confirmation message, unless it failed. */
export async function withToast<T extends object>(
  result: T,
  message: string,
  opts: { vars?: Record<string, string>; undo?: UndoPayload } = {},
) {
  if ("error" in result && result.error) return result;
  return data(result, { headers: { "Set-Cookie": await toastCookie(message, opts) } });
}

/** Attach a confirmation message to a redirect an action throws. */
export async function toastOnRedirect<T>(run: () => Promise<T>, message: string): Promise<T> {
  try {
    return await run();
  } catch (thrown) {
    if (thrown instanceof Response && thrown.status >= 300 && thrown.status < 400) {
      thrown.headers.append("Set-Cookie", await toastCookie(message));
    }
    throw thrown;
  }
}

export function readToast(request: Request): { toast: Toast | null; clear: string | null } {
  const raw = readCookie(request, COOKIE);
  if (!raw) return { toast: null, clear: null };
  try {
    return { toast: JSON.parse(raw) as Toast, clear: cookie("", 0) };
  } catch {
    return { toast: null, clear: cookie("", 0) };
  }
}

export async function readUndo(ticket: string): Promise<UndoPayload | null> {
  try {
    const { payload } = await jwtVerify(ticket, key(), { algorithms: ["HS256"] });
    return (payload.undo as UndoPayload) ?? null;
  } catch {
    return null;
  }
}
