function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + second).toUpperCase();
}

export default function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const dimensions = size === "lg" ? "h-16 w-16 text-xl" : "h-10 w-10 text-sm";

  return (
    <div
      className={`flex ${dimensions} shrink-0 items-center justify-center rounded-full bg-accent-circle font-bold text-white`}
    >
      {initials(name)}
    </div>
  );
}
