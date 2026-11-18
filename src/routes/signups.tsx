import { useState } from "react";
import { Form, useFetcher } from "react-router";
import { MessageCircle, UserCheck } from "lucide-react";
import type { Route } from "./+types/signups";
import { withToast } from "@/lib/toast.server";
import { prisma } from "@/lib/prisma.server";
import { requireTeacher } from "@/lib/auth/session.server";
import { appUrl } from "@/lib/mutations.server";
import { approveSignup, createSignupLink, declineSignup, revokeSignupLink } from "@/lib/signups.server";
import { calculateFirstBill } from "@/lib/dates";
import { daysLabel } from "@/lib/pricing";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ActionState } from "@/lib/action-state";
import FormError from "@/components/FormError";
import NewSignupLinkForm from "@/components/NewSignupLinkForm";
import CopyLinkButton from "@/components/CopyLinkButton";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { card, input, primaryButton, sectionTitle, pageWidth } from "@/components/ui";
import { metaTitle, useT } from "@/lib/useT";

export const meta: Route.MetaFunction = ({ matches }) => [{ title: metaTitle(matches, "Registration") }];

export async function loader({ request }: Route.LoaderArgs) {
  await requireTeacher(request);
  const [pendingStudents, links, programs] = await Promise.all([
    prisma.student.findMany({
      where: { pendingApproval: true },
      orderBy: { createdAt: "asc" },
      include: {
        family: true,
        enrollments: { include: { program: { select: { name: true, daysPerWeek: true, price: true } } } },
      },
    }),
    prisma.signupLink.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.program.findMany({ where: { active: true }, orderBy: { createdAt: "asc" }, select: { id: true, name: true } }),
  ]);

  // Group waiting children by family (every sign-up creates one family).
  const byFamily = new Map<string, { family: NonNullable<(typeof pendingStudents)[number]["family"]>; students: typeof pendingStudents }>();
  for (const s of pendingStudents) {
    if (!s.family) continue;
    const entry = byFamily.get(s.family.id) ?? { family: s.family, students: [] };
    entry.students.push(s);
    byFamily.set(s.family.id, entry);
  }

  const programNames = new Map(programs.map((p) => [p.id, p.name]));
  return {
    waiting: [...byFamily.values()],
    links: links.map((l) => ({
      ...l,
      url: `${appUrl(request)}/join/${l.token}`,
      programNames: l.programIds.map((id) => programNames.get(id) ?? "Removed program"),
    })),
    programs,
  };
}

export async function action({ request }: Route.ActionArgs) {
  await requireTeacher(request);
  const formData = await request.formData();
  switch (formData.get("intent")) {
    case "createLink":
      return withToast(await createSignupLink(formData), "Registration link created. Copy it or send it on WhatsApp.");
    case "revokeLink":
      return withToast(await revokeSignupLink(formData), "Link turned off");
    case "approve": {
      // Snapshot what approval changes, so Undo can put the registration back.
      const familyId = String(formData.get("familyId") ?? "");
      const [family, pending] = await Promise.all([
        prisma.family.findUnique({ where: { id: familyId } }),
        prisma.student.findMany({ where: { familyId, pendingApproval: true } }),
      ]);
      const result = await approveSignup(formData);
      const familyGone = family ? !(await prisma.family.findUnique({ where: { id: familyId } })) : false;
      return withToast(result, pending.length === 1 ? "{name} approved" : "Registration approved", {
        vars: { name: pending[0]?.name ?? "" },
        undo: {
          kind: "signup-approve",
          familyId,
          students: pending.map((s) => ({
            id: s.id,
            tuitionAmount: s.tuitionAmount,
            firstPaymentAmount: s.firstPaymentAmount,
            nextDueDate: s.nextDueDate.toISOString(),
          })),
          removedFamily:
            familyGone && family ? { name: family.name, guardianName: family.guardianName, phone: family.phone, email: family.email } : null,
        },
      });
    }
    case "decline":
      return withToast(await declineSignup(formData), "Registration declined");
    default:
      return { error: "Unknown action" };
  }
}

function linkStatus(link: { usedAt: Date | null; expiresAt: Date }, t: (s: string, v?: Record<string, string>) => string) {
  if (link.usedAt) return { text: t("Used {date}", { date: formatDate(link.usedAt) }), style: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  if (link.expiresAt < new Date()) return { text: t("Expired"), style: "border-stone-200 bg-stone-50 text-stone-500" };
  return { text: t("Open until {date}", { date: formatDate(link.expiresAt) }), style: "border-amber-200 bg-amber-50 text-amber-700" };
}

export default function SignupsPage({ loaderData }: Route.ComponentProps) {
  const t = useT();
  const { waiting, links, programs } = loaderData;

  return (
    <div className={pageWidth}>
      <PageHeader
        title={t("Registration")}
        description={t("Make a link and send it. People sign up themselves or their children, and pick a program and how many days a week. You review it here, then approve or decline.")}
      />

      <section className="mb-10" data-tour="pending">
        <h2 className={sectionTitle}>
          {t("Pending approval")} <span className="font-semibold text-stone-500 tabular-nums">{waiting.length}</span>
        </h2>
        {waiting.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title={t("No one is waiting for approval")}
            body={t("Create a registration link below and send it to a parent or student. When they fill it in, they'll appear here for you to approve.")}
          />
        ) : (
          <div className="space-y-4">
            {waiting.map(({ family, students }) => (
              <PendingFamily key={family.id} family={family} students={students} />
            ))}
          </div>
        )}
      </section>

      <section id="new-link" data-tour="create-link" className="mb-10 scroll-mt-6">
        <h2 className={sectionTitle}>{t("Create a registration link")}</h2>
        <NewSignupLinkForm hasPrograms={programs.length > 0} />
      </section>

      {links.length > 0 ? (
        <section>
          <h2 className={sectionTitle}>{t("Past registration links")}</h2>
          <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5">
            {links.map((link) => {
              const status = linkStatus(link, t);
              const open = !link.usedAt && link.expiresAt >= new Date();
              const message = t("Assalamu alaikum! Here's your link to sign up for class: {url}", { url: link.url });
              return (
                <li key={link.id} className="space-y-2 px-4 py-3 sm:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-stone-900">{link.label || t("Registration link")}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${status.style}`}>{status.text}</span>
                  </div>
                  {link.programNames.length > 0 ? (
                    <p className="text-sm text-stone-500">
                      {link.programNames.join(", ")}
                      {link.price ? ` · ${t("{amount}/month", { amount: formatCurrency(link.price) })}` : ""}
                    </p>
                  ) : null}
                  {open ? (
                    <>
                      <p className="break-all text-xs text-stone-500">{link.url}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <CopyLinkButton url={link.url} />
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                        >
                          <MessageCircle className="h-4 w-4 text-emerald-700" /> {t("Send on WhatsApp")}
                        </a>
                        <Form method="post">
                          <input type="hidden" name="intent" value="revokeLink" />
                          <input type="hidden" name="linkId" value={link.id} />
                          <button type="submit" className="h-9 px-2 text-sm text-stone-500 hover:text-red-700 hover:underline">
                            {t("Cancel link")}
                          </button>
                        </Form>
                      </div>
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

type PendingProps = {
  family: { id: string; name: string; guardianName: string | null; phone: string | null; email: string | null };
  students: {
    id: string;
    name: string;
    tuitionAmount: number;
    joinedAt: Date;
    enrollments: { daysPerWeek: number | null; program: { name: string; daysPerWeek: number; price: number } }[];
  }[];
};

function PendingFamily({ family, students }: PendingProps) {
  const t = useT();
  const fetcher = useFetcher<ActionState>();
  const busy = fetcher.state !== "idle";
  const [declining, setDeclining] = useState(false);
  const intent = fetcher.formData?.get("intent");
  // Someone who signed up themselves: one student, no separate parent.
  const individual = !family.guardianName && students.length === 1;

  return (
    <fetcher.Form method="post" className={`${card} space-y-4`}>
      <input type="hidden" name="familyId" value={family.id} />
      <div>
        <p className="flex flex-wrap items-center gap-2 text-lg font-bold text-stone-900">
          {individual ? students[0].name : (family.guardianName ?? family.name)}
          <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-sm font-semibold text-stone-700">
            {individual
              ? t("Registered themselves")
              : students.length > 1
                ? t("Parent · {n} children", { n: students.length })
                : t("Parent · 1 child")}
          </span>
        </p>
        <p className="text-[15px] text-stone-600">{[family.phone, family.email].filter(Boolean).join(" · ")}</p>
      </div>

      <ul className="space-y-3">
        {students.map((s) => {
          const bill = calculateFirstBill(s.tuitionAmount, s.joinedAt);
          return (
            <li key={s.id} className="flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 p-3">
              <div className="min-w-40 flex-1">
                <p className="font-semibold text-stone-900">{s.name}</p>
                <p className="text-xs text-stone-500">
                  {s.enrollments
                    .map((e) => `${e.program.name}, ${t(daysLabel(e.daysPerWeek ?? e.program.daysPerWeek))}`)
                    .join(" · ")}
                </p>
                <p className="text-xs text-stone-500">
                  {t("Starts {start} · first bill {amount} due {due}", {
                    start: formatDate(s.joinedAt),
                    amount: formatCurrency(bill.total),
                    due: formatDate(bill.dueDate),
                  })}
                </p>
              </div>
              <div className="w-32">
                <label htmlFor={`price-${s.id}`} className="block text-xs font-medium text-stone-600">
                  {t("$/month")}
                </label>
                <input
                  id={`price-${s.id}`}
                  name={`price_${s.id}`}
                  type="number"
                  step="0.01"
                  min="0.01"
                  defaultValue={s.tuitionAmount}
                  className={`${input} mt-0.5 h-10`}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <FormError message={fetcher.data?.error} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" name="intent" value="approve" disabled={busy} className={primaryButton}>
          {busy && intent === "approve" ? t("Approving…") : students.length > 1 ? t("Approve all {n}", { n: students.length }) : t("Approve")}
        </button>
        {declining ? (
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-medium text-stone-700">
              {t("Decline {name}? Their registration and login will be removed.", { name: individual ? students[0].name : (family.guardianName ?? family.name) })}
            </span>
            <button
              type="submit"
              name="intent"
              value="decline"
              disabled={busy}
              autoFocus
              className="min-h-12 rounded-xl bg-red-600 px-4 text-base font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {busy && intent === "decline" ? t("Declining…") : t("Yes, decline")}
            </button>
            <button type="button" onClick={() => setDeclining(false)} className="min-h-12 rounded-xl px-3 text-base font-semibold text-stone-600 hover:text-stone-900">
              {t("Cancel")}
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setDeclining(true)}
            className="min-h-12 rounded-xl border border-stone-300 px-4 text-base font-semibold text-stone-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            {t("Decline")}
          </button>
        )}
      </div>
    </fetcher.Form>
  );
}
