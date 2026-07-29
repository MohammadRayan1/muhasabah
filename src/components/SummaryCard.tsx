const COLOR_STYLES = {
  red: "bg-red-50 border-red-200 text-red-700",
  amber: "bg-amber-50 border-amber-200 text-amber-700",
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
} as const;

export default function SummaryCard({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: keyof typeof COLOR_STYLES;
}) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm shadow-stone-900/5 ${COLOR_STYLES[color]}`}>
      <p className="text-2xl font-semibold">{count}</p>
      <p className="text-sm">{label}</p>
    </div>
  );
}
