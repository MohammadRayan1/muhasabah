import { useId } from "react";

/**
 * Tone-on-tone eight-point star lattice (the khatam), tiled. Purely decorative:
 * it inherits `currentColor`, so the caller sets its tint with a text color and
 * opacity.
 */
export default function GeometricPattern({ className = "" }: { className?: string }) {
  const id = useId();
  return (
    <svg aria-hidden className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}>
      <defs>
        <pattern id={id} width="56" height="56" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1">
            {/* Two overlapping squares make the eight-point star */}
            <rect x="16" y="16" width="24" height="24" />
            <rect x="16" y="16" width="24" height="24" transform="rotate(45 28 28)" />
            {/* Lines joining each star to its neighbours */}
            <path d="M28 11 V0 M28 45 V56 M11 28 H0 M45 28 H56" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
