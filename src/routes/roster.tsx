import { Fragment, useMemo, useState, type ReactNode } from "react";
import { Form, Link, useNavigation } from "react-router";
import { ArrowDown, ArrowUp, ChevronsUpDown, Download, Plus, Search, User, Users, X } from "lucide-react";
import type { Route } from "./+types/roster";
import { prisma } from "@/lib/prisma.server";
import { requireTeacher } from "@/lib/auth/session.server";
import { createFamily } from "@/lib/mutations.server";
import { amountDue, getPaymentStatus, STATUS_BADGE_STYLES, STATUS_LABEL, type PaymentStatus } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/format";
import { daysLabel } from "@/lib/pricing";
import FamilyFields from "@/components/FamilyFields";
import FormError from "@/components/FormError";
import PageHeader from "@/components/PageHeader";
import PaymentsCalendar from "@/components/PaymentsCalendar";
import { card, primaryButton, secondaryButton } from "@/components/ui";
import { metaTitle, useT } from "@/lib/useT";

export const meta: Route.MetaFunction = ({ matches }) => [{ title: metaTitle(matches, "Students") }];

export async function loader({ request }: Route.LoaderArgs) {
  await requireTeacher(request);
  // People still waiting for approval live on Registrations, not here.
  const [students, families, programs] = await Promise.all([
    prisma.student.findMany({
      where: { active: true, pendingApproval: false },
      orderBy: { name: "asc" },
      include: {
        family: true,
        enrollments: { include: { program: { select: { id: true, name: true } } } },
        payments: { select: { amount: true, paidAt: true }, orderBy: { paidAt: "desc" } },
        user: { select: { id: true } },
        invites: { where: { acceptedAt: null }, select: { id: true } },
      },
    }),
    prisma.family.findMany({
      where: { OR: [{ students: { none: {} } }, { students: { some: { active: true, pendingApproval: false } } }] },
      orderBy: { name: "asc" },
    }),
    prisma.program.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return {
    programs,
    families: families.map((f) => ({ id: f.id, name: f.name, guardian: f.guardianName, phone: f.phone, email: f.email })),
    students: students.map((s) => ({
      id: s.id,
      name: s.name,
      familyId: s.familyId,
      familyName: s.family?.name ?? null,
      guardian: s.family?.guardianName ?? null,
      phone: s.phone || s.family?.phone || null,
      email: s.email || s.family?.email || null,
      enrollments: s.enrollments.map((e) => ({ programId: e.program.id, name: e.program.name, days: e.daysPerWeek })),
      tuition: s.tuitionAmount,
      nextDue: s.nextDueDate,
      amountDue: amountDue(s),
      totalPaid: s.payments.reduce((sum, p) => sum + p.amount, 0),
      lastPaid: s.payments[0]?.paidAt ?? null,
      payments: s.payments,
      joined: s.joinedAt,
      portal: s.user ? "active" : s.invites.length > 0 ? "invited" : "none",
    })),
  };
}

export async function action({ request }: Route.ActionArgs) {
  await requireTeacher(request);
  return createFamily(await request.formData());
}

type StudentRow = Route.ComponentProps["loaderData"]["students"][number];
type FamilyInfo = Route.ComponentProps["loaderData"]["families"][number];
type FamilyRow = FamilyInfo & { children: string[]; tuition: number; owed: number; totalPaid: number; status: PaymentStatus | null };
type Sort = { key: string; dir: 1 | -1 };
type Group<T> = { key: string; header?: ReactNode; rows: T[] };

type Column<T> = {
  key: string;
  label: string;
  numeric?: boolean;
  sort: (row: T) => string | number;
  cell: (row: T) => ReactNode;
  csv: (row: T) => string | number;
};

const STATUS_RANK: Record<PaymentStatus, number> = { overdue: 0, due_soon: 1, ok: 2 };
const STATUS_DOT: Record<PaymentStatus, string> = { overdue: "bg-red-500", due_soon: "bg-amber-500", ok: "bg-emerald-500" };
const statusOf = (row: StudentRow) => getPaymentStatus(row.nextDue).status;

export default function RosterPage({ loaderData, actionData }: Route.ComponentProps) {
  const t = useT();
  const { students, programs, families } = loaderData;
  const [view, setView] = useState<"students" | "families">("students");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PaymentStatus | "all">("all");
  const [program, setProgram] = useState("all");
  const [sort, setSort] = useState<Sort>({ key: "name", dir: 1 });

  const badge = (s: PaymentStatus | null) =>
    s ? (
      <span className={`inline-flex h-[23px] shrink-0 items-center rounded-lg border px-[7px] text-[13px] font-medium whitespace-nowrap ${STATUS_BADGE_STYLES[s]}`}>
        {t(STATUS_LABEL[s])}
      </span>
    ) : (
      <Empty />
    );
  const programText = (row: StudentRow) =>
    row.enrollments.map((e) => (e.days ? `${e.name} (${t(daysLabel(e.days))})` : e.name)).join(", ");
  const portalText = (row: StudentRow) =>
    row.portal === "active" ? t("Active") : row.portal === "invited" ? t("Invited") : "";
  const contact = {
    phone: (v: string | null) => (v ? <a href={`tel:${v}`} className="hover:underline" dir="ltr">{v}</a> : <Empty />),
    email: (v: string | null) => (v ? <a href={`mailto:${v}`} className="hover:underline">{v}</a> : <Empty />),
  };

  const familyRows = useMemo<FamilyRow[]>(
    () =>
      families.map((f) => {
        const kids = students.filter((s) => s.familyId === f.id);
        const worst = kids.map(statusOf).sort((a, b) => STATUS_RANK[a] - STATUS_RANK[b])[0] ?? null;
        return {
          ...f,
          children: kids.map((k) => k.name),
          tuition: kids.reduce((sum, k) => sum + k.tuition, 0),
          owed: kids.filter((k) => statusOf(k) !== "ok").reduce((sum, k) => sum + k.amountDue, 0),
          totalPaid: kids.reduce((sum, k) => sum + k.totalPaid, 0),
          status: worst,
        };
      }),
    [families, students],
  );

  const studentColumns: Column<StudentRow>[] = [
    {
      key: "name",
      label: t("Student"),
      sort: (r) => r.name.toLowerCase(),
      cell: (r) => (
        <Link to={`/students/${r.id}`} className="font-medium text-stone-900 hover:text-emerald-700 hover:underline">
          {r.name}
        </Link>
      ),
      csv: (r) => r.name,
    },
    { key: "phone", label: t("Phone"), sort: (r) => r.phone ?? "", cell: (r) => contact.phone(r.phone), csv: (r) => r.phone ?? "" },
    { key: "email", label: t("Email"), sort: (r) => (r.email ?? "").toLowerCase(), cell: (r) => contact.email(r.email), csv: (r) => r.email ?? "" },
    { key: "programs", label: t("Programs"), sort: (r) => programText(r).toLowerCase(), cell: (r) => programText(r) || <Empty />, csv: programText },
    { key: "status", label: t("Status"), sort: (r) => STATUS_RANK[statusOf(r)], cell: (r) => badge(statusOf(r)), csv: (r) => t(STATUS_LABEL[statusOf(r)]) },
    { key: "tuition", label: t("Tuition / month"), numeric: true, sort: (r) => r.tuition, cell: (r) => formatCurrency(r.tuition), csv: (r) => r.tuition.toFixed(2) },
    { key: "nextDue", label: t("Next due"), sort: (r) => new Date(r.nextDue).getTime(), cell: (r) => formatDate(r.nextDue), csv: (r) => formatDate(r.nextDue) },
    { key: "amountDue", label: t("Amount due"), numeric: true, sort: (r) => r.amountDue, cell: (r) => formatCurrency(r.amountDue), csv: (r) => r.amountDue.toFixed(2) },
    { key: "totalPaid", label: t("Total paid"), numeric: true, sort: (r) => r.totalPaid, cell: (r) => formatCurrency(r.totalPaid), csv: (r) => r.totalPaid.toFixed(2) },
    {
      key: "lastPaid",
      label: t("Last payment"),
      sort: (r) => (r.lastPaid ? new Date(r.lastPaid).getTime() : 0),
      cell: (r) => (r.lastPaid ? formatDate(r.lastPaid) : <Empty />),
      csv: (r) => (r.lastPaid ? formatDate(r.lastPaid) : ""),
    },
    { key: "joined", label: t("Joined"), sort: (r) => new Date(r.joined).getTime(), cell: (r) => formatDate(r.joined), csv: (r) => formatDate(r.joined) },
    { key: "portal", label: t("Portal"), sort: (r) => r.portal, cell: (r) => portalText(r) || <Empty />, csv: portalText },
  ];
  // The CSV keeps the family on every row, since a spreadsheet has no group headings.
  const studentCsvColumns: Column<StudentRow>[] = [
    studentColumns[0],
    { key: "family", label: t("Family"), sort: () => 0, cell: () => null, csv: (r) => r.familyName ?? t("Individual") },
    { key: "guardian", label: t("Parent or guardian"), sort: () => 0, cell: () => null, csv: (r) => r.guardian ?? "" },
    ...studentColumns.slice(1),
  ];

  const familyColumns: Column<FamilyRow>[] = [
    {
      key: "name",
      label: t("Family"),
      sort: (r) => r.name.toLowerCase(),
      cell: (r) => (
        <Link to={`/families/${r.id}`} className="font-medium text-stone-900 hover:text-emerald-700 hover:underline">
          {r.name}
        </Link>
      ),
      csv: (r) => r.name,
    },
    { key: "guardian", label: t("Parent or guardian"), sort: (r) => (r.guardian ?? "").toLowerCase(), cell: (r) => r.guardian || <Empty />, csv: (r) => r.guardian ?? "" },
    { key: "phone", label: t("Phone"), sort: (r) => r.phone ?? "", cell: (r) => contact.phone(r.phone), csv: (r) => r.phone ?? "" },
    { key: "email", label: t("Email"), sort: (r) => (r.email ?? "").toLowerCase(), cell: (r) => contact.email(r.email), csv: (r) => r.email ?? "" },
    { key: "children", label: t("Children"), sort: (r) => r.children.length, cell: (r) => r.children.join(", ") || <Empty />, csv: (r) => r.children.join(", ") },
    { key: "status", label: t("Status"), sort: (r) => (r.status ? STATUS_RANK[r.status] : 9), cell: (r) => badge(r.status), csv: (r) => (r.status ? t(STATUS_LABEL[r.status]) : "") },
    { key: "tuition", label: t("Tuition / month"), numeric: true, sort: (r) => r.tuition, cell: (r) => formatCurrency(r.tuition), csv: (r) => r.tuition.toFixed(2) },
    { key: "owed", label: t("Amount due"), numeric: true, sort: (r) => r.owed, cell: (r) => (r.owed > 0 ? formatCurrency(r.owed) : <Empty />), csv: (r) => r.owed.toFixed(2) },
    { key: "totalPaid", label: t("Total paid"), numeric: true, sort: (r) => r.totalPaid, cell: (r) => formatCurrency(r.totalPaid), csv: (r) => r.totalPaid.toFixed(2) },
  ];

  const needle = query.trim().toLowerCase();
  const matchingStudents = students.filter((r) => {
    if (status !== "all" && statusOf(r) !== status) return false;
    if (program !== "all" && !r.enrollments.some((e) => e.programId === program)) return false;
    if (!needle) return true;
    return [r.name, r.familyName, r.guardian, r.phone, r.email].some((v) => v?.toLowerCase().includes(needle));
  });
  const sortedStudents = sortRows(students, studentColumns, sort);
  const shownStudentIds = new Set(matchingStudents.map((s) => s.id));
  // The calendar shows the whole month (everything due and received), so it ignores the status filter.
  const calendarStudents = students.filter(
    (r) =>
      (program === "all" || r.enrollments.some((e) => e.programId === program)) &&
      (!needle || [r.name, r.familyName, r.guardian, r.phone, r.email].some((v) => v?.toLowerCase().includes(needle))),
  );

  // Each family is its own section; people who registered just themselves come last.
  const studentGroups: Group<StudentRow>[] = [
    ...familyRows
      .map((f) => ({ family: f, rows: sortedStudents.filter((s) => s.familyId === f.id) }))
      .filter((g) => g.rows.length > 0)
      .map(({ family, rows }) => ({
        key: family.id,
        rows,
        header: (
          <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <Link to={`/families/${family.id}`} className="inline-flex items-center gap-2 font-bold text-stone-900 hover:text-emerald-700 hover:underline">
              <Users aria-hidden className="h-4 w-4 text-stone-400" />
              {family.name}
            </Link>
            {family.guardian ? <span className="text-stone-600">{family.guardian}</span> : null}
            {family.phone ? <span className="text-stone-500" dir="ltr">{family.phone}</span> : null}
            <span className="text-stone-500 tabular-nums">
              {t("{amount}/month", { amount: formatCurrency(family.tuition) })}
            </span>
          </span>
        ),
      })),
  ];
  const individuals = sortedStudents.filter((s) => !s.familyId);
  if (individuals.length > 0) {
    studentGroups.push({
      key: "individuals",
      rows: individuals,
      header: (
        <span className="inline-flex items-center gap-2 font-bold text-stone-900">
          <User aria-hidden className="h-4 w-4 text-stone-400" />
          {t("Registered themselves")}
        </span>
      ),
    });
  }

  const familySearch = (r: FamilyRow) =>
    !needle || [r.name, r.guardian, r.phone, r.email, ...r.children].some((v) => v?.toLowerCase().includes(needle));
  const shownFamilies = familyRows.filter((r) => (status === "all" || r.status === status) && familySearch(r));
  const shownFamilyIds = new Set(shownFamilies.map((f) => f.id));
  const sortedFamilies = sortRows(familyRows, familyColumns, sort);

  const filtered = needle !== "" || status !== "all" || (view === "students" && program !== "all");
  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setProgram("all");
  };

  function downloadCsv() {
    const today = new Date().toISOString().slice(0, 10);
    if (view === "students") {
      toCsv(studentCsvColumns, studentGroups.flatMap((g) => g.rows).filter((r) => shownStudentIds.has(r.id)), `roster-students-${today}.csv`);
    } else {
      toCsv(familyColumns, sortRows(shownFamilies, familyColumns, sort), `roster-families-${today}.csv`);
    }
  }

  const statusFilters: (PaymentStatus | "all")[] = ["all", "overdue", "due_soon", "ok"];
  const isEmpty = students.length === 0 && familyRows.length === 0;
  const showCalendar = view === "students" && status === "ok";

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        title={t("Students")}
        description={t("Every student and family in one table. Sort any column, filter, or download it for Excel.")}
        actions={
          <button type="button" onClick={downloadCsv} disabled={isEmpty} className={secondaryButton}>
            <Download aria-hidden className="h-4 w-4" strokeWidth={2} />
            {t("Download CSV")}
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label={t("View")} className="inline-flex rounded-xl border border-stone-200 bg-stone-100 p-1">
          {(["students", "families"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => {
                setView(v);
                setSort({ key: "name", dir: 1 });
              }}
              className={`inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition-colors ${
                view === v ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"
              }`}
            >
              {v === "students" ? t("Students") : t("Families")}
              <span className="tabular-nums text-stone-400">{v === "students" ? students.length : familyRows.length}</span>
            </button>
          ))}
        </div>

        <label className="relative w-full sm:w-auto sm:min-w-56 sm:max-w-sm sm:flex-1">
          <span className="sr-only">{t("Search")}</span>
          <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search by name, family, phone or email")}
            className="h-11 w-full rounded-xl border border-stone-300 bg-white ps-9 pe-3 text-sm text-stone-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/15"
          />
        </label>

        {view === "students" && programs.length > 0 ? (
          <label>
            <span className="sr-only">{t("Programs")}</span>
            <select
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className="h-11 rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/15"
            >
              <option value="all">{t("All programs")}</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1" role="group" aria-label={t("Status")}>
        {statusFilters.map((s) => {
          const active = status === s;
          const count =
            view === "students"
              ? s === "all"
                ? calendarStudents.length
                : calendarStudents.filter((r) => statusOf(r) === s).length
              : s === "all"
                ? familyRows.filter(familySearch).length
                : familyRows.filter((r) => r.status === s && familySearch(r)).length;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              onClick={() => setStatus(s)}
              className={`flex h-[26px] shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-[background-color,box-shadow,color] duration-200 ${
                active
                  ? "bg-white text-stone-900 shadow-[0_0_0_1px_rgb(28_25_23/0.08),0_1px_2px_rgb(28_25_23/0.08)]"
                  : "text-stone-500 hover:bg-stone-200/50 hover:text-stone-900"
              }`}
            >
              {s !== "all" ? <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[s]}`} /> : null}
              {s === "all" ? t("All") : t(STATUS_LABEL[s])}
              <span className={`rounded px-1 text-[10.5px] tabular-nums ${active ? "bg-stone-100 text-stone-600" : "text-stone-400"}`}>
                {count}
              </span>
            </button>
          );
        })}
        {filtered ? (
          <button type="button" onClick={clearFilters} className="ms-1 inline-flex h-[26px] items-center gap-1 rounded-full px-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50">
            <X aria-hidden className="h-3 w-3" />
            {t("Clear filters")}
          </button>
        ) : null}
      </div>

      {isEmpty ? (
        <div className={`${card} flex flex-col items-start gap-3 px-6 py-8 sm:flex-row sm:items-center`}>
          <Users aria-hidden className="h-6 w-6 shrink-0 text-stone-400" />
          <p className="flex-1 text-sm text-stone-600">
            {t("No students yet. They appear here once you approve a registration, or after you add a family below.")}
          </p>
          <Link to="/signups" className={primaryButton}>
            {t("Go to Registration")}
          </Link>
        </div>
      ) : view === "students" ? (
        <>
          {showCalendar ? (
            <div className="mb-6">
              <PaymentsCalendar
                students={calendarStudents}
                payments={calendarStudents.flatMap((s) => s.payments.map((p) => ({ studentId: s.id, studentName: s.name, amount: p.amount, paidAt: p.paidAt })))}
              />
            </div>
          ) : null}
          <DataTable
            key="students"
            tour="students-table"
            columns={studentColumns}
            groups={studentGroups}
            shown={shownStudentIds}
            sort={sort}
            onSort={setSort}
            caption={t("Students")}
            empty={t("No students match these filters.")}
            totals={{
              label: matchingStudents.length === 1 ? t("1 student") : t("{n} students", { n: matchingStudents.length }),
              tuition: matchingStudents.reduce((sum, r) => sum + r.tuition, 0),
              amountDue: matchingStudents.filter((r) => statusOf(r) !== "ok").reduce((sum, r) => sum + r.amountDue, 0),
              totalPaid: matchingStudents.reduce((sum, r) => sum + r.totalPaid, 0),
            }}
          />
        </>
      ) : (
        <DataTable
          key="families"
          columns={familyColumns}
          groups={[{ key: "all", rows: sortedFamilies }]}
          shown={shownFamilyIds}
          sort={sort}
          onSort={setSort}
          caption={t("Families")}
          empty={t("No families match these filters.")}
          totals={{
            label: shownFamilies.length === 1 ? t("1 family") : t("{n} families", { n: shownFamilies.length }),
            tuition: shownFamilies.reduce((sum, r) => sum + r.tuition, 0),
            owed: shownFamilies.reduce((sum, r) => sum + r.owed, 0),
            totalPaid: shownFamilies.reduce((sum, r) => sum + r.totalPaid, 0),
          }}
        />
      )}

      <AddFamily error={actionData?.error} />
    </div>
  );
}

function Empty() {
  return <span className="text-stone-300 dark:text-stone-400">—</span>;
}

function sortRows<T>(rows: T[], columns: Column<T>[], sort: Sort) {
  const col = columns.find((c) => c.key === sort.key) ?? columns[0];
  return [...rows].sort((a, b) => {
    const x = col.sort(a);
    const y = col.sort(b);
    return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
  });
}

function DataTable<T extends { id: string }>({
  tour,
  columns,
  groups,
  shown,
  sort,
  onSort,
  caption,
  empty,
  totals,
}: {
  tour?: string;
  columns: Column<T>[];
  groups: Group<T>[];
  shown: Set<string>;
  sort: Sort;
  onSort: (s: Sort) => void;
  caption: string;
  empty: string;
  totals: { label: string } & Record<string, number | string>;
}) {
  const t = useT();
  const grid = "border-stone-200/70";
  const sticky = `sticky start-0 z-10`;
  const visible = groups.reduce((n, g) => n + g.rows.filter((r) => shown.has(r.id)).length, 0);

  return (
    <div
      data-tour={tour}
      role="region"
      aria-label={caption}
      tabIndex={0}
      className="overflow-auto rounded-[14px] bg-white shadow-[0_0_0_1px_rgb(28_25_23/0.07),0_1px_3px_rgb(28_25_23/0.05)] [max-height:calc(100dvh-14rem)] [scrollbar-width:thin]"
    >
      <table className="w-full border-separate border-spacing-0 text-[13px] tabular-nums">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c, i) => {
              const active = sort.key === c.key;
              const Icon = active ? (sort.dir === 1 ? ArrowUp : ArrowDown) : ChevronsUpDown;
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
                  className={`sticky top-0 border-b bg-white p-0 font-normal whitespace-nowrap ${grid} ${
                    i < columns.length - 1 ? `border-e ${grid}` : ""
                  } ${i === 0 ? `${sticky} z-20` : "z-10"}`}
                >
                  <button
                    type="button"
                    onClick={() => onSort({ key: c.key, dir: active ? (sort.dir === 1 ? -1 : 1) : 1 })}
                    className={`flex h-9 w-full items-center gap-1.5 px-3 text-[12.5px] font-medium transition-colors hover:text-stone-900 ${
                      c.numeric ? "justify-end text-end" : "text-start"
                    } ${active ? "text-stone-900" : "text-stone-500"}`}
                  >
                    {c.label}
                    <Icon aria-hidden className={`h-3 w-3 shrink-0 ${active ? "text-emerald-700" : "text-stone-300"}`} />
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => {
            const groupVisible = g.rows.some((r) => shown.has(r.id));
            return (
              <Fragment key={g.key}>
                {g.header && groupVisible ? (
                  <tr>
                    <th scope="colgroup" colSpan={columns.length} className={`border-b bg-stone-50/80 p-0 text-start font-normal ${grid}`}>
                      {/* Kept in view while the table scrolls sideways. */}
                      <div className="sticky start-0 w-max max-w-[100vw] px-3 py-2 text-[13px]">{g.header}</div>
                    </th>
                  </tr>
                ) : null}
                {g.rows.map((row) => {
                  const on = shown.has(row.id);
                  return (
                    <tr key={row.id} aria-hidden={!on} inert={!on} className="group">
                      {columns.map((c, i) => (
                        <td
                          key={c.key}
                          className={`bg-white p-0 align-middle transition-colors duration-100 group-hover:bg-stone-50 ${
                            on ? `border-b ${grid}` : ""
                          } ${i < columns.length - 1 && on ? `border-e ${grid}` : ""} ${i === 0 ? sticky : ""}`}
                        >
                          {/* Rows fold away instead of vanishing when a filter changes. */}
                          <div
                            className="grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
                            style={{ gridTemplateRows: on ? "1fr" : "0fr", opacity: on ? 1 : 0 }}
                          >
                            {/* min-w-max keeps the column as wide as its content while the row folds. */}
                            <div className="min-w-max overflow-hidden">
                              <div
                                className={`flex h-10 items-center px-3 whitespace-nowrap text-stone-600 ${c.numeric ? "justify-end" : ""} ${
                                  i === 0 && g.header ? "ps-7" : ""
                                }`}
                              >
                                {c.cell(row)}
                              </div>
                            </div>
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
          {visible === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-stone-500">
                {empty}
              </td>
            </tr>
          ) : null}
        </tbody>
        {visible > 0 ? (
          <tfoot>
            <tr>
              {columns.map((c, i) => {
                const total = totals[c.key];
                return (
                  <td
                    key={c.key}
                    className={`sticky bottom-0 h-10 border-t bg-stone-50 px-3 font-medium whitespace-nowrap text-stone-900 ${grid} ${
                      c.numeric ? "text-end" : ""
                    } ${i === 0 ? `${sticky} z-20` : "z-10"}`}
                  >
                    {i === 0 ? totals.label : typeof total === "number" ? formatCurrency(total) : ""}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        ) : null}
      </table>
      <p className="sr-only">{t("Click a column heading to sort by it.")}</p>
    </div>
  );
}

function AddFamily({ error }: { error?: string }) {
  const t = useT();
  const pending = useNavigation().state !== "idle";
  return (
    <details className="group mt-8" open={Boolean(error)}>
      <summary className={`${secondaryButton} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
        <Plus aria-hidden className="h-4 w-4 transition-transform group-open:rotate-45" strokeWidth={2.25} />
        {t("Add a family")}
      </summary>
      <Form method="post" className={`${card} mt-3 max-w-2xl space-y-4`}>
        <FormError message={error} />
        <FamilyFields />
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? t("Adding…") : t("Add family")}
        </button>
      </Form>
    </details>
  );
}

// Cells that start with = + - @ would run as formulas in Excel, so they're prefixed.
function csvCell(value: string | number) {
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv<T>(columns: Column<T>[], rows: T[], filename: string) {
  const lines = [columns.map((c) => csvCell(c.label)), ...rows.map((r) => columns.map((c) => csvCell(c.csv(r))))];
  // The BOM tells Excel the file is UTF-8, so Arabic names open correctly.
  const blob = new Blob(["﻿" + lines.map((l) => l.join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
