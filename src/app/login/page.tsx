"use client";

import { useActionState } from "react";
import { login } from "@/lib/auth-actions";
import { initialActionState } from "@/lib/action-state";
import FormError from "@/components/FormError";
import GeometricPattern from "@/components/GeometricPattern";

const inputClass =
  "mt-1.5 h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-[15px] text-stone-900 transition-[border-color,box-shadow] outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/15";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialActionState);

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="relative flex flex-col justify-between gap-10 overflow-hidden bg-sidebar px-6 py-8 text-sidebar-foreground sm:px-10 lg:px-14 lg:py-14">
        <GeometricPattern className="text-sidebar-foreground opacity-[0.06]" />

        <p className="relative text-sm font-semibold tracking-wide text-sidebar-muted">Muhasabah</p>

        <div className="relative">
          <p
            lang="ar"
            dir="rtl"
            className="text-right font-arabic text-6xl leading-[1.3] text-gold sm:text-7xl lg:text-left lg:text-8xl"
          >
            محاسبة
          </p>
          <p className="mt-5 max-w-sm text-lg leading-relaxed text-sidebar-foreground lg:mt-8 lg:text-xl">
            Muhasabah means taking account. Here, that&apos;s your class: who&apos;s enrolled,
            who&apos;s paid, and what&apos;s due on the 1st.
          </p>
        </div>

        <p className="relative hidden text-sm text-sidebar-muted lg:block">Tuition tracker</p>
      </section>

      <section className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">Assalamu alaikum</h1>
          <p className="mt-2 text-stone-500">Welcome back. Sign in to see your class.</p>

          <form action={formAction} className="mt-8 space-y-5">
            <FormError message={state.error} />

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-stone-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-stone-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="h-12 w-full rounded-xl bg-emerald-600 px-4 text-[15px] font-semibold text-white shadow-sm shadow-emerald-900/20 transition-colors hover:bg-emerald-700 disabled:opacity-60"
            >
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
