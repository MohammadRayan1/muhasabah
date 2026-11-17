import { redirect } from "react-router";
import type { Route } from "./+types/auth.google";
import { googleConfigured, parsePurpose, returnPath, startGoogleSignIn } from "@/lib/auth/google.server";

export async function loader({ request }: Route.LoaderArgs) {
  const purpose = parsePurpose(new URL(request.url));
  if (!purpose) throw redirect("/login");
  if (!googleConfigured()) throw redirect(returnPath(purpose));
  return startGoogleSignIn(request, purpose);
}
