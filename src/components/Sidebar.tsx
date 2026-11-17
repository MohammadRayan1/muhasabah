import { Form, Link, useLocation } from "react-router";
import {
  BellRing,
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Receipt,
  Sheet,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import Rosette from "@/components/Rosette";
import { useLang, useT } from "@/lib/useT";

type NavItem = { href: string; label: string; shortLabel?: string; icon: typeof LayoutDashboard };

const CLASS_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/programs", label: "Programs", icon: BookOpen },
  { href: "/signups", label: "Registration", icon: ClipboardList },
  { href: "/roster", label: "Students", icon: Sheet },
];
const MONEY_ITEMS: NavItem[] = [
  { href: "/payments", label: "Payments", icon: Receipt },
  { href: "/reminders", label: "Reminders", icon: BellRing },
  { href: "/reports", label: "Revenue Reports", shortLabel: "Revenue", icon: TrendingUp },
];

function isActive(pathname: string, href: string) {
  if (href === "/roster") return pathname.startsWith("/roster") || pathname.startsWith("/families");
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Badge({ count }: { count: number }) {
  const t = useT();
  return (
    <span
      className="min-w-5 rounded-full bg-gold px-1.5 text-center text-[11px] leading-5 font-bold text-stone-900 tabular-nums"
      aria-label={t("{count} waiting", { count })}
    >
      {count}
    </span>
  );
}

function Mark() {
  return (
    <span aria-hidden className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar text-gold">
      <Rosette className="h-5 w-5" solid />
    </span>
  );
}

/**
 * App navigation. A light rail from md up; below that, a compact top bar with the
 * same links, so the dashboard is usable on a phone.
 */
export default function Sidebar({
  pendingSignups = 0,
  pendingProofs = 0,
}: {
  pendingSignups?: number;
  pendingProofs?: number;
}) {
  const badges: Record<string, number> = { "/signups": pendingSignups, "/payments": pendingProofs };
  const t = useT();
  const lang = useLang();
  const { pathname } = useLocation();

  const item = (it: NavItem) => {
    const Icon = it.icon;
    const active = isActive(pathname, it.href);
    return (
      <Link
        key={it.href}
        to={it.href}
        aria-current={active ? "page" : undefined}
        className={`group flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${
          active
            ? "bg-nav-active-bg font-semibold text-nav-active-fg"
            : "font-medium text-nav-foreground hover:bg-stone-100/80"
        }`}
      >
        <span className="flex-1 truncate">{t(it.label)}</span>
        {badges[it.href] ? <Badge count={badges[it.href]} /> : null}
        <Icon
          aria-hidden
          className={`h-4 w-4 shrink-0 ${active ? "text-nav-active-fg" : "text-nav-muted group-hover:text-nav-foreground"}`}
          strokeWidth={1.9}
        />
      </Link>
    );
  };

  return (
    <>
      {/* Phone / small tablet */}
      <header className="border-b border-nav-border bg-nav px-4 pt-4 pb-3 md:hidden">
        {/* pe-28 leaves room for the fixed language and theme toggles */}
        <div className="flex items-center justify-between pe-24">
          <Link to="/" aria-label={t("Muhasabah, go to dashboard")} className="flex items-center gap-2.5">
            <Mark />
            {lang === "ar" ? (
              <span lang="ar" className="font-arabic text-2xl leading-none text-stone-900">
                محاسبة
              </span>
            ) : (
              <span className="text-[15px] font-semibold text-stone-900">Muhasabah</span>
            )}
          </Link>
          <div className="flex items-center gap-1">
            <Link
              to="/signups#new-link"
              aria-label={t("New registration link")}
              className="flex h-9 items-center gap-1.5 rounded-full bg-emerald-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <UserPlus className="h-4 w-4" strokeWidth={2.25} />
              {t("Invite")}
            </Link>
            <Form method="post" action="/logout">
              <button
                type="submit"
                aria-label={t("Log out")}
                className="flex h-9 w-9 items-center justify-center rounded-full text-nav-muted transition-colors hover:bg-stone-100 hover:text-nav-foreground"
              >
                <LogOut className="h-4.5 w-4.5 rtl:-scale-x-100" strokeWidth={2} />
              </button>
            </Form>
          </div>
        </div>
        <nav className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-0.5">
          {[...CLASS_ITEMS, ...MONEY_ITEMS].map((it) => (
            <Link
              key={it.href}
              to={it.href}
              aria-current={isActive(pathname, it.href) ? "page" : undefined}
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm transition-colors ${
                isActive(pathname, it.href)
                  ? "bg-nav-active-bg font-semibold text-nav-active-fg"
                  : "font-medium text-nav-muted hover:bg-stone-100 hover:text-nav-foreground"
              }`}
            >
              {t(it.shortLabel ?? it.label)}
              {badges[it.href] ? <Badge count={badges[it.href]} /> : null}
            </Link>
          ))}
        </nav>
      </header>

      {/* Desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e border-nav-border bg-nav px-3 py-5 md:flex">
        <Link
          to="/"
          aria-label={t("Muhasabah, go to dashboard")}
          className="mb-7 flex items-center gap-3 rounded-xl px-2 py-1 transition-opacity hover:opacity-80"
        >
          <Mark />
          <span className="min-w-0">
            <span className="flex items-baseline gap-2 text-[15px] font-semibold text-stone-900">
              Muhasabah
              <span lang="ar" className="font-arabic text-base font-normal text-gold-ink">
                محاسبة
              </span>
            </span>
            <span className="block text-xs text-nav-muted">{t("Tuition management")}</span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col overflow-y-auto">
          <div className="space-y-0.5">{CLASS_ITEMS.map(item)}</div>
          <p className="mt-6 mb-1.5 px-3 text-xs font-medium text-nav-muted">{t("Money")}</p>
          <div className="space-y-0.5">{MONEY_ITEMS.map(item)}</div>
        </nav>

        <div className="mt-4 rounded-2xl border border-gold-line bg-gold-wash p-4">
          <p className="text-sm font-semibold text-stone-900">{t("Grow your class")}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-stone-600">{t("Send a registration link to a new family.")}</p>
          <Link
            to="/signups#new-link"
            className="mt-3 flex h-9 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <UserPlus className="h-4 w-4" strokeWidth={2.25} />
            {t("New registration link")}
          </Link>
        </div>

        <Form method="post" action="/logout" className="mt-3 border-t border-nav-border pt-3">
          <button
            type="submit"
            className="flex h-10 w-full items-center justify-between rounded-xl px-3 text-sm font-medium text-nav-muted transition-colors hover:bg-stone-100/80 hover:text-nav-foreground"
          >
            {t("Log out")}
            <LogOut className="h-4 w-4 shrink-0 rtl:-scale-x-100" strokeWidth={1.9} />
          </button>
        </Form>
      </aside>
    </>
  );
}
