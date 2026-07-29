import { AlertTriangle, Clock, CheckCircle2, type LucideIcon } from "lucide-react";

const COLOR_STYLES: Record<
  "red" | "amber" | "emerald",
  { card: string; circle: string; icon: LucideIcon }
> = {
  red: {
    card: "bg-red-50 border-red-200 text-red-700",
    circle: "bg-red-100 text-red-600",
    icon: AlertTriangle,
  },
  amber: {
    card: "bg-amber-50 border-amber-200 text-amber-700",
    circle: "bg-amber-100 text-amber-600",
    icon: Clock,
  },
  emerald: {
    card: "bg-emerald-50 border-emerald-200 text-emerald-700",
    circle: "bg-emerald-100 text-emerald-600",
    icon: CheckCircle2,
  },
};

export default function SummaryCard({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: keyof typeof COLOR_STYLES;
}) {
  const { card, circle, icon: Icon } = COLOR_STYLES[color];

  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-4 shadow-sm shadow-stone-900/5 ${card}`}>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${circle}`}>
        <Icon className="h-5 w-5" strokeWidth={2} />
      </div>
      <div>
        <p className="text-2xl font-semibold leading-tight">{count}</p>
        <p className="text-sm">{label}</p>
      </div>
    </div>
  );
}
