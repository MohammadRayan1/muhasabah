import { useState } from "react";
import { Form, useNavigation } from "react-router";
import { Plus, X } from "lucide-react";
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

export const meta: Route.MetaFunction = () => [{ title: "Sign up · Muhasabah" }];

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

export default function JoinPage({ loaderData, actionData }: Route.ComponentProps) {
  const { link } = loaderData;
  const pending = useNavigation().state !== "idle";
  const firstProgram = link?.programs[0];
  const blankChild = (key: number): Child => ({
    key,
    programId: firstProgram?.id ?? "",
    days: firstProgram?.choices.at(-1)?.days ?? 0,
  });
  const [children, setChildren] = useState<Child[]>(() => [blankChild(0)]);
  const [joinedAt, setJoinedAt] = useState(() => toDateInputValue(new Date()));

  if (!link || link.programs.length === 0) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 text-center">
        <h1 className="text-xl font-bold text-stone-900">This link isn&apos;t working</h1>
        <p className="mt-2 text-sm text-stone-500">
          It may have been used already or expired. Ask your teacher to send you a new sign-up link.
        </p>
      </main>
    );
  }

  const start = parseDateOnly(joinedAt);
  const lines = children.map((child) => {
    const program = link.programs.find((p) => p.id === child.programId) ?? link.programs[0];
    const price = program.choices.find((c) => c.days === child.days)?.price ?? 0;
    return { child, program, price, bill: calculateFirstBill(price, start) };
  });
  const count = children.length;
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
          <p lang="ar" dir="rtl" className="text-left font-arabic text-4xl leading-tight text-gold">
            محاسبة
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Assalamu alaikum</h1>
          <p className="mt-2 text-sidebar-muted">
            You&apos;ve been invited to join the class. Fill this in once, and your teacher will confirm.
          </p>
        </div>
      </header>

      <Form method="post" className="mx-auto max-w-xl space-y-8 px-4 py-8 sm:px-6">
        <FormError message={actionData?.error} />

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-stone-900">About you</h2>
          <div>
            <label htmlFor="guardianName" className={label}>
              Your name
            </label>
            <input id="guardianName" name="guardianName" required autoComplete="name" className={input} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="phone" className={label}>
                Phone
              </label>
              <input id="phone" name="phone" type="tel" autoComplete="tel" className={input} />
            </div>
            <div>
              <label htmlFor="email" className={label}>
                Email
              </label>
              <input id="email" name="email" type="email" required autoComplete="email" className={input} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="password" className={label}>
                Choose a password
              </label>
              <input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" className={input} />
            </div>
            <div>
              <label htmlFor="confirmPassword" className={label}>
                Type it again
              </label>
              <input id="confirmPassword" name="confirmPassword" type="password" minLength={8} required autoComplete="new-password" className={input} />
            </div>
          </div>
          <p className="text-xs text-stone-500">You&apos;ll sign in with this email and password to see bills, receipts and progress.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-stone-900">Your {count > 1 ? "children" : "child"}</h2>
          {lines.map(({ child, program }, i) => (
            <div key={child.key} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm shadow-stone-900/5">
              <input type="hidden" name="childProgram" value={program.id} />
              <input type="hidden" name="childDays" value={child.days} />
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label htmlFor={`child-${child.key}`} className={label}>
                    {count > 1 ? `Child ${i + 1}: full name` : "Child's full name"}
                  </label>
                  <input id={`child-${child.key}`} name="childName" required className={input} />
                </div>
                {count > 1 ? (
                  <button
                    type="button"
                    onClick={() => setChildren(children.filter((c) => c.key !== child.key))}
                    aria-label={`Remove child ${i + 1}`}
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <fieldset>
                <legend className={label}>Program</legend>
                <div className="mt-1 space-y-2">
                  {link.programs.map((p) => {
                    const selected = p.id === program.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => update(child.key, { programId: p.id, days: p.choices.at(-1)!.days })}
                        className={`block w-full rounded-xl border p-3 text-left transition-colors ${
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
                <legend className={label}>How many days a week?</legend>
                <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {program.choices.map((c) => {
                    const selected = c.days === child.days;
                    return (
                      <button
                        key={c.days}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => update(child.key, { days: c.days })}
                        className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                          selected ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20" : "border-stone-200 hover:bg-stone-50"
                        }`}
                      >
                        <span className="block text-sm font-semibold text-stone-900">
                          {c.days === program.daysPerWeek && program.choices.length > 1 ? `All ${c.days} days` : daysLabel(c.days)}
                        </span>
                        <span className="block text-sm text-stone-500 tabular-nums">{formatCurrency(c.price)}/month</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          ))}
          {count < MAX_CHILDREN ? (
            <button
              type="button"
              onClick={() => setChildren([...children, blankChild(Math.max(...children.map((c) => c.key)) + 1)])}
              className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline"
            >
              <Plus className="h-4 w-4" /> Add another child
            </button>
          ) : null}
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900">When are they starting?</h2>
          <p className="mb-3 text-sm text-stone-500">
            Everyone pays on the 1st. Starting mid-month adds the rest of that month to the first bill.
          </p>
          <JoinDateCalendar name="joinedAt" value={joinedAt} onChange={setJoinedAt} />
          <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold text-stone-900">First bill · due {formatDate(dueDate)}</span>
              <span className="text-xl font-bold text-stone-900 tabular-nums">{formatCurrency(firstTotal)}</span>
            </div>
            {count > 1 ? (
              <ul className="mt-2 space-y-0.5 text-xs text-stone-500">
                {lines.map((l, i) => (
                  <li key={l.child.key} className="flex justify-between gap-3">
                    <span>
                      Child {i + 1} · {l.program.name}, {daysLabel(l.child.days)}
                    </span>
                    <span className="tabular-nums">{formatCurrency(l.bill.total)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-1 text-xs text-stone-500">
              {leftoverDays > 0 ? `Includes ${leftoverDays} leftover days. ` : ""}
              Then {formatCurrency(monthlyTotal)} on the 1st of every month.
            </p>
          </div>
        </section>

        <button type="submit" disabled={pending} className={`${primaryButton} h-12 w-full text-[15px]`}>
          {pending ? "Sending…" : "Sign up"}
        </button>
        <p className="text-center text-xs text-stone-500">Your teacher will confirm before anything is due.</p>
      </Form>
    </main>
  );
}
