import {
  data,
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";
import ThemeToggle from "@/components/ThemeToggle";
import TextSizeToggle, { TEXT_SIZE_KEY } from "@/components/TextSizeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import NavProgress from "@/components/NavProgress";
import Toaster from "@/components/Toaster";
import { readToast } from "@/lib/toast.server";
import FontSwitcher from "@/components/FontSwitcher";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { langFromCookie, setCurrentLang } from "@/lib/i18n";
import { useLang, useT } from "@/lib/useT";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.ico" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    // Inter for the interface, Tajawal for Arabic text in it, and Amiri, a classical
    // naskh, for the Arabic wordmark and Bismillah.
    href: "https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Inter:wght@400..700&family=Tajawal:wght@400;500;700;800&display=swap",
  },
];

export function loader({ request }: Route.LoaderArgs) {
  const lang = langFromCookie(request.headers.get("Cookie"));
  const { toast, clear } = readToast(request);
  return data({ lang, toast }, clear ? { headers: { "Set-Cookie": clear } } : undefined);
}

export const meta: Route.MetaFunction = () => [
  { title: "Muhasabah · محاسبة" },
  { name: "description", content: "Track student tuition payments and due dates" },
];

// Runs before first paint so there's no flash of the wrong theme: saved choice
// first, otherwise follow the device's light/dark setting.
const themeScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}if(localStorage.getItem(${JSON.stringify(TEXT_SIZE_KEY)})==="large"){document.documentElement.classList.add("text-large")}}catch(e){}})();`;

export function Layout({ children }: { children: React.ReactNode }) {
  const lang = useLang();
  setCurrentLang(lang);
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} className="h-full antialiased" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Meta />
        <Links />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <LanguageToggle />
        <ThemeToggle />
        <TextSizeToggle />
        {import.meta.env.DEV ? <FontSwitcher /> : null}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <>
      <NavProgress />
      <Outlet />
      <Toaster />
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const t = useT();
  let title = "Something went wrong";
  let details = "Please try again. If it keeps happening, refresh the page.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "Page not found";
      details = "That page doesn't exist, or it was removed.";
    } else {
      details = error.statusText || details;
    }
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 text-center">
      <h1 className="text-xl font-bold text-stone-900">{t(title)}</h1>
      <p className="mt-2 text-sm text-stone-500">{t(details)}</p>
      <a href="/" className="mt-6 text-sm font-semibold text-emerald-700 hover:underline">
        {t("Back to the dashboard")}
      </a>
    </main>
  );
}
