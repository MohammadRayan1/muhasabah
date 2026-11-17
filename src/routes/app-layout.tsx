import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";
import type { Route } from "./+types/app-layout";
import { requireTeacher } from "@/lib/auth/session.server";
import { prisma } from "@/lib/prisma.server";
import Sidebar from "@/components/Sidebar";
import Tour, { hasSeenTour } from "@/components/Tour";
import { TEACHER_TOUR, TEACHER_TOUR_KEY } from "@/lib/tours";

export async function loader({ request }: Route.LoaderArgs) {
  await requireTeacher(request);
  const [pendingFamilies, pendingProofs] = await Promise.all([
    prisma.family.count({ where: { students: { some: { pendingApproval: true } } } }),
    prisma.paymentProof.count({ where: { status: "pending" } }),
  ]);
  return { pendingFamilies, pendingProofs };
}

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  const { pathname } = useLocation();
  const [touring, setTouring] = useState(false);

  // First visit to the dashboard: offer the walkthrough once.
  useEffect(() => {
    if (pathname !== "/" || hasSeenTour(TEACHER_TOUR_KEY)) return;
    const id = window.setTimeout(() => setTouring(true), 600);
    return () => window.clearTimeout(id);
    // Only on arrival, not on every later navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar
        pendingSignups={loaderData.pendingFamilies}
        pendingProofs={loaderData.pendingProofs}
        onStartTour={() => setTouring(true)}
      />
      <Tour steps={TEACHER_TOUR} storageKey={TEACHER_TOUR_KEY} open={touring} onClose={() => setTouring(false)} />
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 sm:py-10">
        {/* Keyed by page so each new page settles in; form posts on the same page don't replay it. */}
        <div key={pathname} className="page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
