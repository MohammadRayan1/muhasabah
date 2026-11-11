"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, TrendingUp, UserPlus, LogOut, Settings } from "lucide-react";
import { logout } from "@/lib/auth-actions";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/programs", label: "Programs", icon: BookOpen },
  { href: "/reports", label: "Monthly Revenue", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-sidebar px-4 py-6">
      <div className="mb-8 px-2">
        <p className="flex items-baseline gap-1.5 text-xl font-bold text-sidebar-foreground">
          Muhasabah
          <span lang="ar" dir="rtl" className="text-xl font-bold text-sidebar-foreground">
            محاسبة
          </span>
        </p>
        <p className="mt-1 text-xs text-sidebar-muted">Tuition tracker</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-sidebar-active-bg text-sidebar-active-fg"
                  : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}

        <Link
          href="/students/new"
          className="mt-4 flex min-h-11 items-center gap-3 rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          <UserPlus className="h-5 w-5 shrink-0" strokeWidth={2} />
          Add Student
        </Link>
      </nav>

      <form action={logout}>
        <button
          type="submit"
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-sidebar-muted transition-colors hover:bg-white/5 hover:text-sidebar-foreground"
        >
          <LogOut className="h-5 w-5 shrink-0" strokeWidth={2} />
          Log out
        </button>
      </form>
    </aside>
  );
}
