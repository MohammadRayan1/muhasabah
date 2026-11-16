import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.ts"),
  route("invite/:token", "routes/invite.tsx"),
  route("portal", "routes/portal.tsx"),

  layout("routes/app-layout.tsx", [
    index("routes/dashboard.tsx"),
    route("programs", "routes/programs.tsx"),
    route("reports", "routes/reports.tsx"),
    route("reports/:month", "routes/report-month.tsx"),
    route("students/new", "routes/student-new.tsx"),
    route("students/:id", "routes/student.tsx"),
  ]),
] satisfies RouteConfig;
