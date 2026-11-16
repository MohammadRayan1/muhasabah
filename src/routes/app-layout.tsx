import { Outlet } from "react-router";
import type { Route } from "./+types/app-layout";
import { requireTeacher } from "@/lib/auth/session.server";
import Sidebar from "@/components/Sidebar";

export async function loader({ request }: Route.LoaderArgs) {
  await requireTeacher(request);
  return null;
}

export default function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
