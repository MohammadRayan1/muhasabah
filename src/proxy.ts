import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decryptSession } from "@/lib/auth/session";

const PUBLIC_PREFIXES = ["/login", "/invite/"];

function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const session = await decryptSession(request.cookies.get("session")?.value);

  if (isPublicPath(pathname)) {
    if (session && pathname === "/login") {
      const home = session.role === "TEACHER" ? "/" : "/portal";
      return NextResponse.redirect(new URL(home, request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
