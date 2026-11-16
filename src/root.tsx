import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";
import ThemeToggle from "@/components/ThemeToggle";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.ico" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    // Nunito for the interface; Amiri, a classical naskh, for the Arabic wordmark and Bismillah.
    href: "https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Nunito:wght@400..800&display=swap",
  },
];

export const meta: Route.MetaFunction = () => [
  { title: "Muhasabah · محاسبة" },
  { name: "description", content: "Track student tuition payments and due dates" },
];

// Runs before first paint so there's no flash of the wrong theme: saved choice
// first, otherwise follow the device's light/dark setting.
const themeScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})();`;

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Meta />
        <Links />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <ThemeToggle />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
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
      <h1 className="text-xl font-bold text-stone-900">{title}</h1>
      <p className="mt-2 text-sm text-stone-500">{details}</p>
      <a href="/" className="mt-6 text-sm font-semibold text-emerald-700 hover:underline">
        Back to the dashboard
      </a>
    </main>
  );
}
