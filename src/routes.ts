import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.ts"),
  route("auth/google", "routes/auth.google.ts"),
  route("auth/google/callback", "routes/auth.google.callback.ts"),
  route("undo", "routes/undo.ts"),
  route("invite/:token", "routes/invite.tsx"),
  route("join/:token", "routes/join.tsx"),
  route("portal", "routes/portal.tsx"),
  route("receipts/:paymentId", "routes/receipt.tsx"),
  route("proofs/:id/image", "routes/proof-image.ts"),

  // Machine endpoints (no pages)
  route("api/cron/reminders", "routes/api.cron-reminders.ts"),

  layout("routes/app-layout.tsx", [
    index("routes/dashboard.tsx"),
    route("payments", "routes/payments.tsx"),
    route("roster", "routes/roster.tsx"),
    route("families", "routes/families-redirect.ts"),
    route("families/:id", "routes/families-redirect.ts", { id: "family-redirect" }),
    route("programs", "routes/programs.tsx"),
    route("reminders", "routes/reminders.tsx"),
    route("signups", "routes/signups.tsx"),
    route("reports", "routes/reports.tsx"),
    route("reports/:month", "routes/report-month.tsx"),
    route("students/:id", "routes/student.tsx"),
  ]),
] satisfies RouteConfig;
