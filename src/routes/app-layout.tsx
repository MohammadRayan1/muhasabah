import { Outlet } from "react-router";
import type { Route } from "./+types/app-layout";
import { requireTeacher } from "@/lib/auth/session.server";
import { prisma } from "@/lib/prisma.server";
import Sidebar from "@/components/Sidebar";

export async function loader({ request }: Route.LoaderArgs) {
  await requireTeacher(request);
  const [pendingFamilies, pendingProofs] = await Promise.all([
    prisma.family.count({ where: { students: { some: { pendingApproval: true } } } }),
    prisma.paymentProof.count({ where: { status: "pending" } }),
  ]);
  return { pendingFamilies, pendingProofs };
}

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar pendingSignups={loaderData.pendingFamilies} pendingProofs={loaderData.pendingProofs} />
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
