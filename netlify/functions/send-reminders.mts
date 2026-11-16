import type { Config } from "@netlify/functions";

// Runs every day at 14:00 UTC (morning in the US) and asks the app to email any
// reminders that are due. Does nothing unless automatic reminders are turned on.
export default async () => {
  const base = process.env.URL;
  const secret = process.env.SESSION_SECRET;
  if (!base || !secret) return new Response("Missing URL or SESSION_SECRET", { status: 500 });

  const res = await fetch(`${base}/api/cron/reminders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.text();
  console.log(`reminders: ${res.status} ${body}`);
  return new Response(body, { status: res.status });
};

export const config: Config = { schedule: "0 14 * * *" };
