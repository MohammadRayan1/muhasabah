import { redirect } from "react-router";
import { destroySessionRedirect } from "@/lib/auth/session.server";

export function action() {
  return destroySessionRedirect();
}

export function loader() {
  return redirect("/login");
}
