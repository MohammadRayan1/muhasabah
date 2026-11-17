import { Form, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/login";
import { prisma } from "@/lib/prisma.server";
import { createSessionRedirect, getSession, homeFor } from "@/lib/auth/session.server";
import { verifyPassword } from "@/lib/auth/password.server";
import { googleConfigured } from "@/lib/auth/google.server";
import GoogleButton from "@/components/GoogleButton";
import FormError from "@/components/FormError";
import GeometricPattern from "@/components/GeometricPattern";
import Rosette from "@/components/Rosette";
import { stagger } from "@/components/ui";
import { metaTitle, useT } from "@/lib/useT";

const inputClass =
  "mt-1.5 h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-[15px] text-stone-900 transition-[border-color,box-shadow] outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/15";

export const meta: Route.MetaFunction = ({ matches }) => [{ title: metaTitle(matches, "Sign in") }];

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  if (session) throw redirect(homeFor(session.role));
  return { google: googleConfigured(), googleProblem: new URL(request.url).searchParams.get("google") };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid email or password" };
  }

  return createSessionRedirect(user.id, user.role);
}

const GOOGLE_PROBLEMS: Record<string, string> = {
  "no-account": "There's no account for that Google email yet. To join a class, use the registration link your teacher sent you.",
  "has-account": "You already have an account with that Google email. Sign in below.",
  failed: "Google sign-in didn't go through. Please try again.",
};

export default function LoginPage({ loaderData, actionData }: Route.ComponentProps) {
  const t = useT();
  const pending = useNavigation().state !== "idle";

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="relative flex flex-col justify-between gap-10 overflow-hidden bg-sidebar px-6 py-8 text-sidebar-foreground sm:px-10 lg:px-14 lg:py-14">
        <GeometricPattern className="text-sidebar-foreground opacity-[0.06]" />

        <p className="relative text-sm font-semibold tracking-wide text-sidebar-muted">Muhasabah</p>

        <div className="relative">
          <Rosette
            hairline
            className="slow-turn pointer-events-none absolute -top-16 -end-10 h-64 w-64 text-gold opacity-25 lg:-top-24 lg:-start-16 lg:end-auto lg:h-96 lg:w-96"
          />
          <p
            lang="ar"
            className="page-enter relative text-end font-arabic text-6xl leading-[1.3] text-gold sm:text-7xl lg:text-start lg:text-8xl"
          >
            محاسبة
          </p>
          <p className="rise relative mt-5 max-w-sm text-lg leading-relaxed text-sidebar-foreground lg:mt-8 lg:text-xl" style={stagger(2)}>
            {t("Muhasabah means taking account. Here, that's your class: who's enrolled, who's paid, and what's due on the 1st.")}
          </p>
        </div>

        <p className="relative hidden text-sm text-sidebar-muted lg:block">{t("Tuition management")}</p>
      </section>

      <section className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="rise w-full max-w-sm" style={stagger(1)}>
          <h1 className="text-3xl font-bold text-stone-900">{t("Assalamu alaikum")}</h1>
          <p className="mt-2 text-stone-500">{t("Welcome back. Sign in to see your class.")}</p>

          {loaderData.google ? (
            <div className="mt-8 space-y-5">
              <GoogleButton href="/auth/google?for=login" label={t("Continue with Google")} />
              <div className="flex items-center gap-3 text-xs font-medium text-stone-400">
                <span className="h-px flex-1 bg-stone-200" />
                {t("or with email")}
                <span className="h-px flex-1 bg-stone-200" />
              </div>
            </div>
          ) : null}

          <Form method="post" className={`${loaderData.google ? "mt-5" : "mt-8"} space-y-5`}>
            <FormError message={actionData?.error ?? (loaderData.googleProblem ? GOOGLE_PROBLEMS[loaderData.googleProblem] : undefined)} />

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-stone-700">
                {t("Email")}
              </label>
              <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-stone-700">
                {t("Password")}
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
              {pending ? t("Signing in…") : t("Sign in")}
            </button>
          </Form>
        </div>
      </section>
    </main>
  );
}
