import { randomBytes } from "node:crypto";
import { SignJWT, decodeJwt, jwtVerify } from "jose";
import { redirect } from "react-router";
import { readCookie } from "@/lib/auth/session.server";

// Google sign-in never creates accounts on its own: on the sign-in page it only
// finds an existing account by email, and a new account still needs a teacher's
// registration or invite link.

export type GooglePurpose = { kind: "login" } | { kind: "join"; token: string } | { kind: "invite"; token: string };
export type GoogleIdentity = { email: string; name: string | null };

const FLOW_COOKIE = "g_flow"; // state + purpose, while the person is at Google
const IDENTITY_COOKIE = "g_identity"; // the verified Google email, while they finish a link's form
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
}

function cookie(name: string, value: string, maxAge: number) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function callbackUrl(request: Request) {
  return `${new URL(request.url).origin}/auth/google/callback`;
}

export function returnPath(purpose: GooglePurpose) {
  if (purpose.kind === "join") return `/join/${purpose.token}`;
  if (purpose.kind === "invite") return `/invite/${purpose.token}`;
  return "/login";
}

export function parsePurpose(url: URL): GooglePurpose | null {
  const kind = url.searchParams.get("for");
  const token = url.searchParams.get("token") ?? "";
  if (kind === "login") return { kind: "login" };
  if ((kind === "join" || kind === "invite") && TOKEN_PATTERN.test(token)) return { kind, token };
  return null;
}

/** Send the person to Google's account picker. */
export async function startGoogleSignIn(request: Request, purpose: GooglePurpose) {
  const state = randomBytes(24).toString("base64url");
  const flow = await new SignJWT({ state, purpose })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("10m")
    .sign(key());
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: callbackUrl(request),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, {
    headers: { "Set-Cookie": cookie(FLOW_COOKIE, flow, 600) },
  });
}

/**
 * Finish the round trip: check the state matches the one we set (so the sign-in
 * can't be forged from another site), trade the code for Google's ID token, and
 * return the verified email.
 */
export async function finishGoogleSignIn(
  request: Request,
): Promise<{ ok: true; purpose: GooglePurpose; identity: GoogleIdentity } | { ok: false; purpose: GooglePurpose | null }> {
  const url = new URL(request.url);
  let purpose: GooglePurpose | null = null;
  let expectedState = "";
  try {
    const { payload } = await jwtVerify(readCookie(request, FLOW_COOKIE) ?? "", key(), { algorithms: ["HS256"] });
    purpose = payload.purpose as GooglePurpose;
    expectedState = String(payload.state ?? "");
  } catch {
    return { ok: false, purpose: null };
  }

  const code = url.searchParams.get("code");
  if (!code || !expectedState || url.searchParams.get("state") !== expectedState) return { ok: false, purpose };

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: callbackUrl(request),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) return { ok: false, purpose };
  const { id_token: idToken } = (await res.json()) as { id_token?: string };
  if (!idToken) return { ok: false, purpose };

  // Received straight from Google's token endpoint over TLS with our secret, so the
  // signature check can be skipped (per Google's docs); the claims are still checked.
  const claims = decodeJwt(idToken);
  const issuerOk = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  const fresh = typeof claims.exp === "number" && claims.exp * 1000 > Date.now();
  const email = typeof claims.email === "string" ? claims.email.toLowerCase() : "";
  if (!issuerOk || !fresh || claims.aud !== process.env.GOOGLE_CLIENT_ID || claims.email_verified !== true || !email) {
    return { ok: false, purpose };
  }
  return { ok: true, purpose, identity: { email, name: typeof claims.name === "string" ? claims.name : null } };
}

export const clearFlowCookie = () => cookie(FLOW_COOKIE, "", 0);

/** Remember the verified Google email for this one link while its form is filled in. */
export async function identityCookie(identity: GoogleIdentity, token: string) {
  const value = await new SignJWT({ ...identity, token })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30m")
    .sign(key());
  return cookie(IDENTITY_COOKIE, value, 1800);
}

export const clearIdentityCookie = () => cookie(IDENTITY_COOKIE, "", 0);

/** The Google email verified for this link, if any. */
export async function readGoogleIdentity(request: Request, token: string): Promise<GoogleIdentity | null> {
  try {
    const { payload } = await jwtVerify(readCookie(request, IDENTITY_COOKIE) ?? "", key(), { algorithms: ["HS256"] });
    if (payload.token !== token || typeof payload.email !== "string") return null;
    return { email: payload.email, name: typeof payload.name === "string" ? payload.name : null };
  } catch {
    return null;
  }
}

/** A password nobody knows, for accounts that sign in with Google only. */
export function unusablePassword() {
  return randomBytes(32).toString("base64url");
}
