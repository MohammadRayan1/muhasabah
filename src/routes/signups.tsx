import { Form, Link, useFetcher } from "react-router";
import { MessageCircle, UserCheck } from "lucide-react";
import type { Route } from "./+types/signups";
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
import { card, input, pageTitle, primaryButton, sectionTitle } from "@/components/ui";

export const meta: Route.MetaFunction = () => [{ title: "Sign-ups · Muhasabah" }];

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
      url: `${appUrl()}/join/${l.token}`,
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
      return createSignupLink(formData);
    case "revokeLink":
      return revokeSignupLink(formData);
    case "approve":
      return approveSignup(formData);
    case "decline":
      return declineSignup(formData);
    default:
      return { error: "Unknown action" };
  }
}

function linkStatus(link: { usedAt: Date | null; expiresAt: Date }) {
  if (link.usedAt) return { text: `Used ${formatDate(link.usedAt)}`, style: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  if (link.expiresAt < new Date()) return { text: "Expired", style: "border-stone-200 bg-stone-50 text-stone-500" };
  return { text: `Open until ${formatDate(link.expiresAt)}`, style: "border-amber-200 bg-amber-50 text-amber-700" };
}

export default function SignupsPage({ loaderData }: Route.ComponentProps) {
  const { waiting, links, programs } = loaderData;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className={pageTitle}>Sign-ups</h1>
      <p className="mt-1 mb-8 max-w-prose text-sm text-stone-500">
        Make a link for each family and send it. Parents fill in their details and pick a program and
        how many days a week for each child. You review it here, then approve or decline.
      </p>

      <section className="mb-10">
        <h2 className={sectionTitle}>
          Waiting for you <span className="font-semibold text-stone-500 tabular-nums">{waiting.length}</span>
        </h2>
        {waiting.length === 0 ? (
          <p className={`${card} flex items-center gap-2 text-sm text-stone-500`}>
            <UserCheck className="h-5 w-5 text-stone-400" /> No new sign-ups right now.
          </p>
        ) : (
          <div className="space-y-4">
            {waiting.map(({ family, students }) => (
              <PendingFamily key={family.id} family={family} students={students} />
            ))}
          </div>
        )}
      </section>

      <section id="new-link" className="mb-10 scroll-mt-6">
        <h2 className={sectionTitle}>Make a sign-up link</h2>
        <NewSignupLinkForm hasPrograms={programs.length > 0} />
      </section>

      {links.length > 0 ? (
        <section>
          <h2 className={sectionTitle}>Your links</h2>
          <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5">
            {links.map((link) => {
              const status = linkStatus(link);
              const open = !link.usedAt && link.expiresAt >= new Date();
              const message = `Assalamu alaikum! Here's your link to sign up for class: ${link.url}`;
              return (
                <li key={link.id} className="space-y-2 px-4 py-3 sm:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-stone-900">{link.label || "Sign-up link"}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${status.style}`}>{status.text}</span>
                  </div>
                  {link.programNames.length > 0 ? (
                    <p className="text-sm text-stone-500">
                      {link.programNames.join(", ")}
                      {link.price ? ` · ${formatCurrency(link.price)}/mo per child` : ""}
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
                          <MessageCircle className="h-4 w-4 text-emerald-700" /> Send on WhatsApp
                        </a>
                        <Form method="post">
                          <input type="hidden" name="intent" value="revokeLink" />
                          <input type="hidden" name="linkId" value={link.id} />
                          <button type="submit" className="h-9 px-2 text-sm text-stone-500 hover:text-red-700 hover:underline">
                            Cancel link
                          </button>
                        </Form>
                      </div>
                    </>
                  ) : link.familyId ? (
                    <Link to={`/families/${link.familyId}`} className="text-sm text-emerald-700 hover:underline">
                      See family →
                    </Link>
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
  const fetcher = useFetcher<ActionState>();
  const busy = fetcher.state !== "idle";
  const intent = fetcher.formData?.get("intent");

  return (
    <fetcher.Form method="post" className={`${card} space-y-4`}>
      <input type="hidden" name="familyId" value={family.id} />
      <div>
        <p className="text-lg font-bold text-stone-900">{family.name}</p>
        <p className="text-sm text-stone-500">
          {[family.guardianName, family.phone, family.email].filter(Boolean).join(" · ")}
        </p>
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
                    .map((e) => `${e.program.name}, ${daysLabel(e.daysPerWeek ?? e.program.daysPerWeek)}`)
                    .join(" · ")}
                </p>
                <p className="text-xs text-stone-500">
                  Starts {formatDate(s.joinedAt)} · first bill {formatCurrency(bill.total)} due {formatDate(bill.dueDate)}
                </p>
              </div>
              <div className="w-32">
                <label htmlFor={`price-${s.id}`} className="block text-xs font-medium text-stone-600">
                  $/month
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
          {busy && intent === "approve" ? "Approving…" : `Approve ${students.length > 1 ? `all ${students.length}` : ""}`}
        </button>
        <button
          type="submit"
          name="intent"
          value="decline"
          disabled={busy}
          onClick={(e) => {
            if (!window.confirm(`Decline ${family.name}? Their sign-up and login will be removed.`)) e.preventDefault();
          }}
          className="min-h-11 rounded-xl px-3 text-sm font-semibold text-stone-500 hover:text-red-700"
        >
          {busy && intent === "decline" ? "Declining…" : "Decline"}
        </button>
      </div>
    </fetcher.Form>
  );
}
