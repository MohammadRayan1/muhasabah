import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";

/** The same large "Back to …" button, in the same spot, on every inner page. */
export default function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="mb-6 inline-flex min-h-12 items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-base font-semibold text-stone-800 shadow-[0_1px_2px_rgb(28_25_23/0.04)] transition-colors hover:bg-stone-50"
    >
      <ArrowLeft aria-hidden className="h-5 w-5 rtl:-scale-x-100" />
      {label}
    </Link>
  );
}
