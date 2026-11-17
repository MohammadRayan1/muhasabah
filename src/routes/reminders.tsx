import { Form, Link } from "react-router";
import { CheckCircle2, CircleAlert } from "lucide-react";
import type { Route } from "./+types/reminders";
import { prisma } from "@/lib/prisma.server";
import { requireTeacher } from "@/lib/auth/session.server";
import { emailConfigured } from "@/lib/email.server";
import { getSettings, sendManualReminder } from "@/lib/reminders.server";
import { amountDue, getPaymentStatus } from "@/lib/status";
import { OVERDUE_DAYS, reminderContact, UPCOMING_DAYS } from "@/lib/reminders";
import { formatCurrency, formatDate } from "@/lib/format";
import RemindMenu from "@/components/RemindMenu";
import PageHeader from "@/components/PageHeader";
import { card, sectionTitle, pageWidth } from "@/components/ui";
import { metaTitle, useT } from "@/lib/useT";

export const meta: Route.MetaFunction = ({ matches }) => [{ title: metaTitle(matches, "Reminders") }];

export async function loader({ request }: Route.LoaderArgs) {
  await requireTeacher(request);
  const [students, settings, recent] = await Promise.all([
    prisma.student.findMany({
      where: { active: true },
      orderBy: { nextDueDate: "asc" },
      include: { family: true },
    }),
    getSettings(),
    prisma.reminder.findMany({
      orderBy: { sentAt: "desc" },
      take: 15,
      include: { student: { select: { id: true, name: true } } },
    }),
  ]);
  return { students, autoEmail: settings.autoEmailReminders, canEmail: emailConfigured(), recent };
}

export async function action({ request }: Route.ActionArgs) {
  await requireTeacher(request);
  const formData = await request.formData();
  switch (formData.get("intent")) {
    case "sendEmail": {
      const result = await sendManualReminder(String(formData.get("studentId") ?? ""));
      return result.sent ? { ok: true, message: "Reminder emailed" } : { error: result.error };
    }
    case "toggleAuto":
      await prisma.settings.upsert({
        where: { id: 1 },
        update: { autoEmailReminders: formData.get("on") === "true" },
        create: { id: 1, autoEmailReminders: formData.get("on") === "true" },
      });
      return { ok: true };
    default:
      return { error: "Unknown action" };
  }
}

export default function RemindersPage({ loaderData }: Route.ComponentProps) {
  const t = useT();
  const { students, autoEmail, canEmail, recent } = loaderData;
  const needing = students
    .map((s) => ({ ...s, ...getPaymentStatus(s.nextDueDate) }))
    .filter((s) => s.status !== "ok");

  return (
    <div className={pageWidth}>
      <PageHeader
        title={t("Reminders")}
        description={t("A kind nudge for anyone who's due this week or late. WhatsApp and text open on your own phone with the message written for you.")}
      />

      <section className="mb-10" data-tour="remind">
        <h2 className={sectionTitle}>
          {t("Students to remind")} <span className="font-semibold text-stone-500 tabular-nums">{needing.length}</span>
        </h2>
        {needing.length === 0 ? (
          <p className={`${card} flex items-center gap-2 text-sm text-stone-600`}>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" /> {t("Alhamdulillah, nobody is due this week.")}
          </p>
        ) : (
          <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5">
            {needing.map((s) => {
              const contact = reminderContact(s);
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
                  <div className="min-w-0 flex-1 basis-48">
                    <Link to={`/students/${s.id}`} className="font-semibold text-stone-900 hover:underline">
                      {s.name}
                    </Link>
                    <p className={`text-sm ${s.status === "overdue" ? "text-red-700" : "text-amber-700"}`}>
                      {formatCurrency(amountDue(s))} ·{" "}
                      {s.status === "overdue"
                        ? Math.abs(s.daysUntilDue) === 1
                          ? t("1 day late")
                          : t("{n} days late", { n: Math.abs(s.daysUntilDue) })
                        : t("due {date}", { date: formatDate(s.nextDueDate) })}
                    </p>
                    <p className="truncate text-xs text-stone-500">
                      {[s.family?.name, contact.phone, contact.email].filter(Boolean).join(" · ") ||
                        t("No phone or email saved")}
                    </p>
                  </div>
                  <RemindMenu student={s} canEmail={canEmail} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mb-10">
        <h2 className={sectionTitle}>{t("Automatic email reminders")}</h2>
        <div className={`${card} space-y-3`}>
          <p className="text-sm text-stone-600">
            {t("When this is on, each family gets one email {before} days before the 1st, and one more {after} days after if it's still unpaid. It never sends the same reminder twice.", { before: UPCOMING_DAYS, after: OVERDUE_DAYS })}
          </p>
          {!canEmail ? (
            <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              {t("Email isn't set up yet. Add a RESEND_API_KEY (and EMAIL_FROM from your own domain) in Netlify, and these will start going out.")}
            </p>
          ) : null}
          <Form method="post" className="flex items-center gap-3">
            <input type="hidden" name="intent" value="toggleAuto" />
            <input type="hidden" name="on" value={autoEmail ? "false" : "true"} />
            <button
              type="submit"
              role="switch"
              aria-checked={autoEmail}
              aria-label={t("Automatic email reminders")}
              className={`relative h-7 w-12 rounded-full transition-colors ${autoEmail ? "bg-emerald-600" : "bg-stone-300"}`}
            >
              <span
                className={`absolute top-1 start-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${autoEmail ? "translate-x-5 rtl:-translate-x-5" : ""}`}
              />
            </button>
            <span className="text-sm font-semibold text-stone-900">{autoEmail ? t("On") : t("Off")}</span>
          </Form>
        </div>
      </section>

      {recent.length > 0 ? (
        <section>
          <h2 className={sectionTitle}>{t("Reminder history")}</h2>
          <ul className="space-y-1 text-sm text-stone-600">
            {recent.map((r) => (
              <li key={r.id}>
                {formatDate(r.sentAt)} · {r.student.name} ·{" "}
                {t(r.kind === "manual" ? "sent by you" : r.kind === "overdue" ? "late reminder" : "upcoming reminder")} ·{" "}
                {r.sentTo}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
