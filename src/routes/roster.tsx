import { Fragment, useState, type ReactNode } from "react";
import { Form, Link } from "react-router";
import { Archive, ArrowDown, ArrowUp, ChevronsUpDown, Download, Search, Users, X } from "lucide-react";
import type { Route } from "./+types/roster";
import { prisma } from "@/lib/prisma.server";
import { requireTeacher } from "@/lib/auth/session.server";
import { setStudentActive } from "@/lib/mutations.server";
import { withToast } from "@/lib/toast.server";
import { amountDue, getPaymentStatus, STATUS_BADGE_STYLES, STATUS_LABEL, type PaymentStatus } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/format";
import { daysLabel } from "@/lib/pricing";
import PageHeader from "@/components/PageHeader";
import PaymentsCalendar from "@/components/PaymentsCalendar";
import { card, primaryButton, secondaryButton } from "@/components/ui";
import { metaTitle, useT } from "@/lib/useT";

export const meta: Route.MetaFunction = ({ matches }) => [{ title: metaTitle(matches, "Students") }];

export async function loader({ request }: Route.LoaderArgs) {
  await requireTeacher(request);
  // People still waiting for approval live on Registration, not here.
  const [students, programs, archived] = await Promise.all([
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
    prisma.program.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.student.findMany({
      where: { active: false, pendingApproval: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return {
    archived,
    programs,
    students: students.map((s) => ({
      id: s.id,
      name: s.name,
      parent: s.family?.guardianName ?? null,
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
  const formData = await request.formData();
  if (formData.get("intent") === "restoreStudent") {
    formData.set("active", "true");
    return withToast(await setStudentActive(formData), "Student restored");
  }
  return { error: "Unknown action" };
}

type StudentRow = Route.ComponentProps["loaderData"]["students"][number];
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

export default function RosterPage({ loaderData }: Route.ComponentProps) {
  const t = useT();
  const { students, programs } = loaderData;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PaymentStatus | "all">("all");
  const [program, setProgram] = useState("all");
  const [sort, setSort] = useState<Sort>({ key: "name", dir: 1 });

  const badge = (s: PaymentStatus) => (
    <span className={`inline-flex h-[23px] shrink-0 items-center rounded-lg border px-[7px] text-[13px] font-medium whitespace-nowrap ${STATUS_BADGE_STYLES[s]}`}>
      {t(STATUS_LABEL[s])}
    </span>
  );
  const programText = (row: StudentRow) =>
    row.enrollments.map((e) => (e.days ? `${e.name} (${t(daysLabel(e.days))})` : e.name)).join(", ");
  const portalText = (row: StudentRow) =>
    row.portal === "active" ? t("Active") : row.portal === "invited" ? t("Invited") : "";

  const columns: Column<StudentRow>[] = [
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
    { key: "parent", label: t("Parent"), sort: (r) => (r.parent ?? "").toLowerCase(), cell: (r) => r.parent || <Empty />, csv: (r) => r.parent ?? "" },
    {
      key: "phone",
      label: t("Phone"),
      sort: (r) => r.phone ?? "",
      cell: (r) => (r.phone ? <a href={`tel:${r.phone}`} className="hover:underline" dir="ltr">{r.phone}</a> : <Empty />),
      csv: (r) => r.phone ?? "",
    },
    {
      key: "email",
      label: t("Email"),
      sort: (r) => (r.email ?? "").toLowerCase(),
      cell: (r) => (r.email ? <a href={`mailto:${r.email}`} className="hover:underline">{r.email}</a> : <Empty />),
      csv: (r) => r.email ?? "",
    },
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

  const needle = query.trim().toLowerCase();
  const searchHit = (r: StudentRow) => !needle || [r.name, r.parent, r.phone, r.email].some((v) => v?.toLowerCase().includes(needle));
  const programHit = (r: StudentRow) => program === "all" || r.enrollments.some((e) => e.programId === program);
  const matching = students.filter((r) => (status === "all" || statusOf(r) === status) && programHit(r) && searchHit(r));
  const shownIds = new Set(matching.map((s) => s.id));
  const sorted = sortRows(students, columns, sort);
  // The calendar shows the whole month (everything due and received), so it ignores the status filter.
  const calendarStudents = students.filter((r) => programHit(r) && searchHit(r));

  const filtered = needle !== "" || status !== "all" || program !== "all";
  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setProgram("all");
  };

  function downloadCsv() {
    const today = new Date().toISOString().slice(0, 10);
    toCsv(columns, sorted.filter((r) => shownIds.has(r.id)), `students-${today}.csv`);
  }

  const statusFilters: (PaymentStatus | "all")[] = ["all", "overdue", "due_soon", "ok"];
  const showCalendar = status === "ok";

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        title={t("Students")}
        description={t("Every student in one table. Sort any column, filter, or download it for Excel.")}
        actions={
          <button type="button" onClick={downloadCsv} disabled={students.length === 0} className={secondaryButton}>
            <Download aria-hidden className="h-4 w-4" strokeWidth={2} />
            {t("Download CSV")}
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="relative w-full sm:w-auto sm:min-w-56 sm:max-w-sm sm:flex-1">
          <span className="sr-only">{t("Search")}</span>
          <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search by name, parent, phone or email")}
            className="h-12 w-full rounded-xl border border-stone-300 bg-white ps-10 pe-3 text-base text-stone-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/15"
          />
        </label>

        {programs.length > 0 ? (
          <label>
            <span className="sr-only">{t("Programs")}</span>
            <select
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className="h-12 rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/15"
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
          const count = s === "all" ? calendarStudents.length : calendarStudents.filter((r) => statusOf(r) === s).length;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              onClick={() => setStatus(s)}
              className={`flex h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-[15px] font-medium transition-[background-color,box-shadow,color] duration-200 ${
                active
                  ? "bg-white text-stone-900 shadow-[0_0_0_1px_rgb(28_25_23/0.08),0_1px_2px_rgb(28_25_23/0.08)]"
                  : "text-stone-500 hover:bg-stone-200/50 hover:text-stone-900"
              }`}
            >
              {s !== "all" ? <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[s]}`} /> : null}
              {s === "all" ? t("All") : t(STATUS_LABEL[s])}
              <span className={`rounded px-1.5 text-[13px] tabular-nums ${active ? "bg-stone-100 text-stone-700" : "text-stone-500"}`}>
                {count}
              </span>
            </button>
          );
        })}
        {filtered ? (
          <button type="button" onClick={clearFilters} className="ms-1 inline-flex h-10 items-center gap-1 rounded-full px-3 text-[15px] font-semibold text-emerald-700 hover:bg-emerald-50">
            <X aria-hidden className="h-3 w-3" />
            {t("Clear filters")}
          </button>
        ) : null}
      </div>

      {students.length === 0 ? (
        <div className={`${card} flex flex-col items-start gap-3 px-6 py-8 sm:flex-row sm:items-center`}>
          <Users aria-hidden className="h-6 w-6 shrink-0 text-stone-400" />
          <p className="flex-1 text-[15px] text-stone-600">{t("No students yet. They appear here once you approve a registration.")}</p>
          <Link to="/signups" className={primaryButton}>
            {t("Go to Registration")}
          </Link>
        </div>
      ) : (
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
            tour="students-table"
            columns={columns}
            groups={[{ key: "all", rows: sorted }]}
            shown={shownIds}
            sort={sort}
            onSort={setSort}
            caption={t("Students")}
            empty={t("No students match these filters.")}
            totals={{
              label: matching.length === 1 ? t("1 student") : t("{n} students", { n: matching.length }),
              tuition: matching.reduce((sum, r) => sum + r.tuition, 0),
              amountDue: matching.filter((r) => statusOf(r) !== "ok").reduce((sum, r) => sum + r.amountDue, 0),
              totalPaid: matching.reduce((sum, r) => sum + r.totalPaid, 0),
            }}
          />
        </>
      )}

      {loaderData.archived.length > 0 ? <ArchivedStudents students={loaderData.archived} /> : null}
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
      <table className="w-full border-separate border-spacing-0 text-[15px] tabular-nums">
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
                    className={`flex h-11 w-full items-center gap-1.5 px-3 text-sm font-semibold transition-colors hover:text-stone-900 ${
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
                                className={`flex h-12 items-center px-3 whitespace-nowrap text-stone-600 ${c.numeric ? "justify-end" : ""} ${
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

function ArchivedStudents({ students }: { students: Route.ComponentProps["loaderData"]["archived"] }) {
  const t = useT();
  return (
    <details className="group mt-10">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-1 text-base font-semibold text-stone-700 [&::-webkit-details-marker]:hidden">
        <Archive aria-hidden className="h-5 w-5 text-stone-500" />
        {t("Archived students")} <span className="font-normal text-stone-500 tabular-nums">{students.length}</span>
      </summary>
      <p className="mt-1 mb-3 text-[15px] text-stone-600">
        {t("Students you removed. Their payment history is kept. Restore someone to bring them back to your class.")}
      </p>
      <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200/80 bg-white">
        {students.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <span>
              <Link to={`/students/${s.id}`} className="block font-semibold text-stone-900 hover:underline">
                {s.name}
              </Link>
            </span>
            <Form method="post">
              <input type="hidden" name="intent" value="restoreStudent" />
              <input type="hidden" name="studentId" value={s.id} />
              <button type="submit" className={secondaryButton}>
                {t("Restore")}
              </button>
            </Form>
          </li>
        ))}
      </ul>
    </details>
  );
}
