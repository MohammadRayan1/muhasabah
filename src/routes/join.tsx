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
import { card, input, label, primaryButton } from "@/components/ui";

export const meta: Route.MetaFunction = () => [{ title: "Sign up · Muhasabah" }];

export async function loader({ params }: Route.LoaderArgs) {
  const open = await findOpenLink(params.token);
  if (!open) return { link: null };
  return {
    link: {
      price: open.link.price,
      label: open.link.label,
      programs: open.programs.map((p) => ({ id: p.id, name: p.name, days: p.days, time: p.time, location: p.location })),
    },
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const result = await submitSignup(params.token, await request.formData());
  if ("error" in result) return result;
  return createSessionRedirect(result.userId, "MEMBER", "/portal?welcome=1");
}

export default function JoinPage({ loaderData, actionData }: Route.ComponentProps) {
  const { link } = loaderData;
  const pending = useNavigation().state !== "idle";
  const [children, setChildren] = useState<{ key: number }[]>([{ key: 0 }]);
  const [joinedAt, setJoinedAt] = useState(() => toDateInputValue(new Date()));

  if (!link) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 text-center">
        <h1 className="text-xl font-bold text-stone-900">This link isn&apos;t working</h1>
        <p className="mt-2 text-sm text-stone-500">
          It may have been used already or expired. Ask your teacher to send you a new sign-up link.
        </p>
      </main>
    );
  }

  const bill = calculateFirstBill(link.price, parseDateOnly(joinedAt));
  const count = children.length;

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
        <section className={card}>
          <h2 className="text-sm font-semibold text-stone-500">Joining</h2>
          {link.programs.map((p) => (
            <div key={p.id} className="mt-2">
              <p className="font-semibold text-stone-900">{p.name}</p>
              <p className="text-sm text-stone-500">
                {p.days} · {p.time} · {p.location}
              </p>
            </div>
          ))}
          <p className="mt-3 border-t border-stone-200 pt-3 text-sm text-stone-600">
            <span className="text-lg font-bold text-stone-900 tabular-nums">{formatCurrency(link.price)}</span> per
            child, per month, due on the 1st.
          </p>
        </section>

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
          {children.map((child, i) => (
            <div key={child.key} className="flex items-end gap-2">
              <div className="flex-1">
                <label htmlFor={`child-${child.key}`} className={label}>
                  {count > 1 ? `Child ${i + 1}` : "Child's full name"}
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
          ))}
          {count < MAX_CHILDREN ? (
            <button
              type="button"
              onClick={() => setChildren([...children, { key: Math.max(...children.map((c) => c.key)) + 1 }])}
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
              <span className="font-semibold text-stone-900">First bill · due {formatDate(bill.dueDate)}</span>
              <span className="text-xl font-bold text-stone-900 tabular-nums">{formatCurrency(bill.total * count)}</span>
            </div>
            <p className="mt-1 text-xs text-stone-500">
              {count > 1 ? `${formatCurrency(bill.total)} × ${count} children. ` : ""}
              {bill.hasLeftover
                ? `Includes ${bill.leftoverDays} leftover days. `
                : ""}
              Then {formatCurrency(link.price * count)} on the 1st of every month.
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
