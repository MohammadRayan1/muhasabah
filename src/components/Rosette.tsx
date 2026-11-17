// Eight-point star (khatam): outer points at radius 11, the inner corners where the
// two squares cross at 11 × cos45° / cos22.5°.
const POINTS = Array.from({ length: 16 }, (_, i) => {
  const angle = (Math.PI / 8) * i - Math.PI / 2;
  const radius = i % 2 === 0 ? 11 : 8.42;
  return `${(12 + radius * Math.cos(angle)).toFixed(2)},${(12 + radius * Math.sin(angle)).toFixed(2)}`;
}).join(" ");

/** Decorative star ornament in `currentColor`. */
export default function Rosette({
  className = "",
  solid = false,
  hairline = false,
}: {
  className?: string;
  solid?: boolean;
  /** Keep the line 1.5px however large the star is drawn. */
  hairline?: boolean;
}) {
  const line = hairline ? { strokeWidth: 1.5, vectorEffect: "non-scaling-stroke" as const } : { strokeWidth: 1.2 };
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className}>
      <polygon
        points={POINTS}
        fill={solid ? "currentColor" : "none"}
        fillOpacity={solid ? 0.18 : undefined}
        stroke="currentColor"
        strokeLinejoin="round"
        {...line}
      />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" {...line} />
    </svg>
  );
}
