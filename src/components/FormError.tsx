import { useT } from "@/lib/useT";
export default function FormError({ message }: { message?: string }) {
  const t = useT();
  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {t(message)}
    </p>
  );
}
