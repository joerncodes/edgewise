import { cn } from "@/lib/utils";

// Knife-edge cross-section: apex pointing down, spine opening up.
// The per-side angle is measured from the vertical centerline, so a
// smaller angle visibly produces a narrower edge.
//
// Shared by the knife card (small, inline) and the detail page's bevel
// readout (scaled up). The geometry lives in a 32×28 viewBox; `size`
// just scales the rendered box — strokes scale with it.
export function EdgeV({
  angle,
  size = 32,
  className,
}: {
  angle: number;
  size?: number;
  className?: string;
}) {
  const len = 24;
  const rad = (angle * Math.PI) / 180;
  const dx = len * Math.sin(rad);
  const dy = len * Math.cos(rad);
  const apex = { x: 16, y: 26 };
  return (
    <svg
      width={size}
      height={(size * 28) / 32}
      viewBox="0 0 32 28"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <line
        x1={apex.x}
        y1={apex.y}
        x2={apex.x - dx}
        y2={apex.y - dy}
        stroke="var(--brass)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <line
        x1={apex.x}
        y1={apex.y}
        x2={apex.x + dx}
        y2={apex.y - dy}
        stroke="var(--brass)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}
