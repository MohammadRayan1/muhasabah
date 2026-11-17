import { ArrowLeft, ArrowRight } from "lucide-react";

/** An arrow that points the reading direction (→ in English, ← in Arabic). */
export default function Arrow({ back = false }: { back?: boolean }) {
  const Icon = back ? ArrowLeft : ArrowRight;
  return <Icon aria-hidden className="inline-block h-[1em] w-[1em] align-[-0.125em] rtl:-scale-x-100" strokeWidth={2.25} />;
}
