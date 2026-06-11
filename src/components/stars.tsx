import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";

// Render a 0-to-5 rating as a row of stars. The exact value is rounded
// to the nearest half-step for display only — the underlying number
// stays exact in the data. See docs/todos/session-rating.md.
export function Stars({
  value,
  size = "sm",
  className,
}: {
  value: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const half = Math.round(value * 2) / 2;
  const full = Math.floor(half);
  const hasHalf = half - full === 0.5;
  const dim = size === "md" ? "h-4 w-4" : "h-3 w-3";
  const label = value.toFixed(1);
  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      aria-label={`${label} out of 5 stars`}
      title={`${label} / 5`}
    >
      <span className="inline-flex items-center gap-px text-amber-500">
        {Array.from({ length: 5 }).map((_, i) => {
          if (i < full) {
            return <Star key={i} className={cn(dim, "fill-current")} />;
          }
          if (i === full && hasHalf) {
            return <StarHalf key={i} className={cn(dim, "fill-current")} />;
          }
          return <Star key={i} className={cn(dim, "text-muted-foreground/30")} />;
        })}
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">{label}</span>
    </span>
  );
}
