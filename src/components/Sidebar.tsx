import { Form, Link, useLocation } from "react-router";
import {
  ClipboardList,
  BellRing,
  Users,
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  UserPlus,
  LogOut,
} from "lucide-react";

const NAV_ITEMS: {
  href: string;
  label: string;
  shortLabel?: string;
  icon: typeof LayoutDashboard;
}[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/families", label: "Families", icon: Users },
  { href: "/programs", label: "Programs", icon: BookOpen },
  { href: "/signups", label: "Sign-ups", icon: ClipboardList },
  { href: "/reminders", label: "Reminders", icon: BellRing },
  {
    href: "/reports",
    label: "Monthly Revenue",
    shortLabel: "Revenue",
    icon: TrendingUp,
  },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Badge({ count }: { count: number }) {
  return (
    <span className="ml-auto rounded-full bg-gold px-2 py-0.5 text-xs font-bold text-stone-900 tabular-nums" aria-label={`${count} waiting`}>
      {count}
    </span>
  );
}

function Wordmark({ size }: { size: "sm" | "lg" }) {
  return (
    <span
      className={`flex items-baseline gap-2 font-bold text-sidebar-foreground ${size === "lg" ? "text-xl" : "text-lg"}`}
    >
      Muhasabah
      <span lang="ar" dir="rtl" className="font-arabic text-gold">
        محاسبة
      </span>
    </span>
  );
}

/**
 * App navigation. A full sidebar from md up; below that, a compact top bar with
 * the same links, so the dashboard is usable on a phone.
 */
export default function Sidebar({ pendingSignups = 0 }: { pendingSignups?: number }) {
  const { pathname } = useLocation();

  return (
    <>
      {/* Phone / small tablet */}
      <header className="bg-sidebar px-4 pt-4 pb-3 md:hidden">
        {/* pr-14 leaves room for the fixed theme toggle */}
        <div className="flex items-center justify-between pr-14">
          <Link
            to="/"
            aria-label="Muhasabah, go to dashboard"
            className="rounded-lg transition-opacity hover:opacity-80"
          >
            <Wordmark size="sm" />
          </Link>
          <div className="flex items-center gap-1">
            <Link
              to="/signups#new-link"
              aria-label="Invite a family"
              className="flex h-10 items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <UserPlus className="h-4 w-4" strokeWidth={2.25} />
              Invite
            </Link>
            <Form method="post" action="/logout">
              <button
                type="submit"
                aria-label="Log out"
                className="flex h-10 w-10 items-center justify-center rounded-full text-sidebar-muted transition-colors hover:bg-white/5 hover:text-sidebar-foreground"
              >
                <LogOut className="h-5 w-5" strokeWidth={2} />
              </button>
            </Form>
          </div>
        </div>
        <nav className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`flex h-9 shrink-0 items-center rounded-full px-3.5 text-sm font-semibold transition-colors ${
                isActive(pathname, item.href)
                  ? "bg-sidebar-active-bg text-sidebar-active-fg"
                  : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground"
              }`}
            >
              {item.shortLabel ?? item.label}
              {item.href === "/signups" && pendingSignups > 0 ? <Badge count={pendingSignups} /> : null}
            </Link>
          ))}
        </nav>
      </header>

      {/* Desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar px-4 py-6 md:flex">
        <Link
          to="/"
          aria-label="Muhasabah, go to dashboard"
          className="mb-8 block rounded-xl px-2 py-1 transition-opacity hover:opacity-80"
        >
          <Wordmark size="lg" />
          <p className="mt-1 text-xs text-sidebar-muted">Tuition tracker</p>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${
                  isActive(pathname, item.href)
                    ? "bg-sidebar-active-bg text-sidebar-active-fg"
                    : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
                {item.label}
                {item.href === "/signups" && pendingSignups > 0 ? <Badge count={pendingSignups} /> : null}
              </Link>
            );
          })}

          <Link
            to="/signups#new-link"
            className="mt-4 flex min-h-11 items-center gap-3 rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <UserPlus className="h-5 w-5 shrink-0" strokeWidth={2} />
            Invite a family
          </Link>
        </nav>

        <Form method="post" action="/logout">
          <button
            type="submit"
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-sidebar-muted transition-colors hover:bg-white/5 hover:text-sidebar-foreground"
          >
            <LogOut className="h-5 w-5 shrink-0" strokeWidth={2} />
            Log out
          </button>
        </Form>
      </aside>
    </>
  );
}
