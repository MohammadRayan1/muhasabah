import { login } from "@/lib/auth-actions";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <p className="mb-1 text-sm font-medium text-emerald-700">Muhasabah</p>
      <h1 className="mb-6 text-2xl font-semibold text-stone-900">Log in</h1>

      <form action={login} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-stone-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-stone-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          Log in
        </button>
      </form>
    </main>
  );
}
