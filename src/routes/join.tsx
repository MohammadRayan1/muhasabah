import { useState } from "react";
import { Form, useNavigation } from "react-router";
import { Plus, User, Users, X } from "lucide-react";
import type { Route } from "./+types/join";
import { findOpenLink, submitSignup } from "@/lib/signups.server";
import { MAX_CHILDREN } from "@/lib/signups";
import { createSessionRedirect } from "@/lib/auth/session.server";
import { calculateFirstBill, parseDateOnly, toDateInputValue } from "@/lib/dates";
import { formatCurrency, formatDate } from "@/lib/format";
import FormError from "@/components/FormError";
import GeometricPattern from "@/components/GeometricPattern";
import JoinDateCalendar from "@/components/JoinDateCalendar";
import { input, label, primaryButton } from "@/components/ui";
import { dayChoices, daysLabel, priceForDays } from "@/lib/pricing";
import { metaTitle, useT } from "@/lib/useT";

export const meta: Route.MetaFunction = ({ matches }) => [{ title: metaTitle(matches, "Sign up") }];

export async function loader({ params }: Route.LoaderArgs) {
  const open = await findOpenLink(params.token);
  if (!open) return { link: null };
  return {
    link: {
      label: open.link.label,
      programs: open.programs.map((p) => ({
        id: p.id,
        name: p.name,
        days: p.days,
        time: p.time,
        location: p.location,
        daysPerWeek: p.daysPerWeek,
        choices: dayChoices(p).map((d) => ({ days: d, price: priceForDays(p, d) })),
      })),
    },
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const result = await submitSignup(params.token, await request.formData());
  if ("error" in result) return result;
  return createSessionRedirect(result.userId, "MEMBER", "/portal?welcome=1");
}

type Child = { key: number; programId: string; days: number };
type Mode = "self" | "children";
type ProgramOption = NonNullable<Route.ComponentProps["loaderData"]["link"]>["programs"][number];

export default function JoinPage({ loaderData, actionData }: Route.ComponentProps) {
  const t = useT();
  const { link } = loaderData;
  const pending = useNavigation().state !== "idle";
  const firstProgram = link?.programs[0];
  const blankChild = (key: number): Child => ({
    key,
    programId: firstProgram?.id ?? "",
    days: firstProgram?.choices.at(-1)?.days ?? 0,
  });
  const [mode, setMode] = useState<Mode | null>(null);
  const [children, setChildren] = useState<Child[]>(() => [blankChild(0)]);
  const [joinedAt, setJoinedAt] = useState(() => toDateInputValue(new Date()));

  if (!link || link.programs.length === 0) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 text-center">
        <h1 className="text-xl font-bold text-stone-900">{t("This link isn't working")}</h1>
        <p className="mt-2 text-sm text-stone-500">
          {t("It may have been used already or expired. Ask your teacher to send you a new sign-up link.")}
        </p>
      </main>
    );
  }

  // Signing up yourself is one place in class; a parent can add several children.
  const people = mode === "self" ? children.slice(0, 1) : children;
  const start = parseDateOnly(joinedAt);
  const lines = people.map((child) => {
    const program = link.programs.find((p) => p.id === child.programId) ?? link.programs[0];
    const price = program.choices.find((c) => c.days === child.days)?.price ?? 0;
    return { child, program, price, bill: calculateFirstBill(price, start) };
  });
  const count = lines.length;
  const firstTotal = lines.reduce((sum, l) => sum + l.bill.total, 0);
  const monthlyTotal = lines.reduce((sum, l) => sum + l.price, 0);
  const dueDate = lines[0].bill.dueDate;
  const leftoverDays = lines[0].bill.hasLeftover ? lines[0].bill.leftoverDays : 0;

  function update(key: number, patch: Partial<Child>) {
    setChildren(children.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }

  return (
    <main className="min-h-screen">
      <header className="relative overflow-hidden bg-sidebar px-6 pt-10 pb-8 text-sidebar-foreground sm:px-10">
        <GeometricPattern className="text-sidebar-foreground opacity-[0.06]" />
        <div className="relative mx-auto max-w-xl">
          <p lang="ar" className="text-start font-arabic text-4xl leading-tight text-gold">
            محاسبة
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{t("Assalamu alaikum")}</h1>
          <p className="mt-2 text-sidebar-muted">
            {t("You've been invited to join the class. Fill this in once, and your teacher will confirm.")}
          </p>
        </div>
      </header>

      <Form method="post" className="mx-auto max-w-xl space-y-8 px-4 py-8 sm:px-6">
        <FormError message={actionData?.error} />

        <fieldset>
          <legend className="text-lg font-bold text-stone-900">{t("Who are you signing up?")}</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <ModeButton
              selected={mode === "self"}
              onClick={() => setMode("self")}
              icon={<User className="h-5 w-5" />}
              title={t("Just me")}
              body={t("I'm the student, signing up myself")}
            />
            <ModeButton
              selected={mode === "children"}
              onClick={() => setMode("children")}
              icon={<Users className="h-5 w-5" />}
              title={t("My children")}
              body={t("I'm a parent signing up one or more children")}
            />
          </div>
        </fieldset>

        {mode ? (
          <>
            <input type="hidden" name="signupType" value={mode} />

            <section className="space-y-4">
              <h2 className="text-lg font-bold text-stone-900">{t("About you")}</h2>
              <div>
                <label htmlFor="guardianName" className={label}>
                  {mode === "self" ? t("Your full name") : t("Your name (parent or guardian)")}
                </label>
                <input id="guardianName" name="guardianName" required autoComplete="name" className={input} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="phone" className={label}>
                    {t("Phone")}
                  </label>
                  <input id="phone" name="phone" type="tel" dir="ltr" autoComplete="tel" className={input} />
                </div>
                <div>
                  <label htmlFor="email" className={label}>
                    {t("Email")}
                  </label>
                  <input id="email" name="email" type="email" dir="ltr" required autoComplete="email" className={input} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="password" className={label}>
                    {t("Choose a password")}
                  </label>
                  <input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" className={input} />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className={label}>
                    {t("Type it again")}
                  </label>
                  <input id="confirmPassword" name="confirmPassword" type="password" minLength={8} required autoComplete="new-password" className={input} />
                </div>
              </div>
              <p className="text-xs text-stone-500">
                {t("You'll sign in with this email and password to see bills, receipts and progress.")}
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-stone-900">
                {mode === "self" ? t("Your class") : count > 1 ? t("Your children") : t("Your child")}
              </h2>
              {lines.map(({ child, program }, i) => (
                <div key={child.key} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm shadow-stone-900/5">
                  <input type="hidden" name="childProgram" value={program.id} />
                  <input type="hidden" name="childDays" value={child.days} />
                  {mode === "children" ? (
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label htmlFor={`child-${child.key}`} className={label}>
                          {count > 1 ? t("Child {n}: full name", { n: i + 1 }) : t("Child's full name")}
                        </label>
                        <input id={`child-${child.key}`} name="childName" required className={input} />
                      </div>
                      {count > 1 ? (
                        <button
                          type="button"
                          onClick={() => setChildren(children.filter((c) => c.key !== child.key))}
                          aria-label={t("Remove child {n}", { n: i + 1 })}
                          className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  <ProgramPicker
                    programs={link.programs}
                    program={program}
                    days={child.days}
                    onProgram={(p) => update(child.key, { programId: p.id, days: p.choices.at(-1)!.days })}
                    onDays={(days) => update(child.key, { days })}
                  />
                </div>
              ))}
              {mode === "children" && count < MAX_CHILDREN ? (
                <button
                  type="button"
                  onClick={() => setChildren([...children, blankChild(Math.max(...children.map((c) => c.key)) + 1)])}
                  className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline"
                >
                  <Plus className="h-4 w-4" /> {t("Add another child")}
                </button>
              ) : null}
            </section>

            <section>
              <h2 className="text-lg font-bold text-stone-900">
                {mode === "self" ? t("When are you starting?") : t("When are they starting?")}
              </h2>
              <p className="mb-3 text-sm text-stone-500">
                {t("Everyone pays on the 1st. Starting mid-month adds the rest of that month to the first bill.")}
              </p>
              <JoinDateCalendar name="joinedAt" value={joinedAt} onChange={setJoinedAt} />
              <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold text-stone-900">
                    {t("First bill · due {date}", { date: formatDate(dueDate) })}
                  </span>
                  <span className="text-xl font-bold text-stone-900 tabular-nums">{formatCurrency(firstTotal)}</span>
                </div>
                {count > 1 ? (
                  <ul className="mt-2 space-y-0.5 text-xs text-stone-500">
                    {lines.map((l, i) => (
                      <li key={l.child.key} className="flex justify-between gap-3">
                        <span>
                          {t("Child {n}", { n: i + 1 })} · {l.program.name}, {t(daysLabel(l.child.days))}
                        </span>
                        <span className="tabular-nums">{formatCurrency(l.bill.total)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-1 text-xs text-stone-500">
                  {leftoverDays > 0 ? `${t("Includes {n} leftover days.", { n: leftoverDays })} ` : ""}
                  {t("Then {amount} on the 1st of every month.", { amount: formatCurrency(monthlyTotal) })}
                </p>
              </div>
            </section>

            <button type="submit" disabled={pending} className={`${primaryButton} h-12 w-full text-[15px]`}>
              {pending ? t("Sending…") : t("Sign up")}
            </button>
            <p className="text-center text-xs text-stone-500">{t("Your teacher will confirm before anything is due.")}</p>
          </>
        ) : null}
      </Form>
    </main>
  );
}

function ModeButton({
  selected,
  onClick,
  icon,
  title,
  body,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex items-start gap-3 rounded-2xl border p-4 text-start transition-colors ${
        selected ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20" : "border-stone-200 bg-white hover:bg-stone-50"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          selected ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-600"
        }`}
      >
        {icon}
      </span>
      <span>
        <span className="block font-semibold text-stone-900">{title}</span>
        <span className="block text-sm text-stone-500">{body}</span>
      </span>
    </button>
  );
}

function ProgramPicker({
  programs,
  program,
  days,
  onProgram,
  onDays,
}: {
  programs: ProgramOption[];
  program: ProgramOption;
  days: number;
  onProgram: (program: ProgramOption) => void;
  onDays: (days: number) => void;
}) {
  const t = useT();
  return (
    <>
      <fieldset>
        <legend className={label}>{t("Program")}</legend>
        <div className="mt-1 space-y-2">
          {programs.map((p) => {
            const selected = p.id === program.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onProgram(p)}
                className={`block w-full rounded-xl border p-3 text-start transition-colors ${
                  selected ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20" : "border-stone-200 hover:bg-stone-50"
                }`}
              >
                <span className="block font-semibold text-stone-900">{p.name}</span>
                <span className="block text-sm text-stone-500">
                  {p.days} · {p.time} · {p.location}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className={label}>{t("How many days a week?")}</legend>
        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {program.choices.map((c) => {
            const selected = c.days === days;
            return (
              <button
                key={c.days}
                type="button"
                aria-pressed={selected}
                onClick={() => onDays(c.days)}
                className={`rounded-xl border px-3 py-2.5 text-start transition-colors ${
                  selected ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20" : "border-stone-200 hover:bg-stone-50"
                }`}
              >
                <span className="block text-sm font-semibold text-stone-900">
                  {c.days === program.daysPerWeek && program.choices.length > 1
                    ? t("All {n} days", { n: c.days })
                    : t(daysLabel(c.days))}
                </span>
                <span className="block text-sm text-stone-500 tabular-nums">
                  {t("{amount}/month", { amount: formatCurrency(c.price) })}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </>
  );
}
