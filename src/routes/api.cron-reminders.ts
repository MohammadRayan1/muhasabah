import type { Route } from "./+types/api.cron-reminders";
import { runAutoReminders } from "@/lib/reminders.server";

// Called once a day by netlify/functions/send-reminders.mts. The shared secret is the
// session secret, which the scheduled function can read from the site's environment.
export async function action({ request }: Route.ActionArgs) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || request.headers.get("Authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json(await runAutoReminders());
}
