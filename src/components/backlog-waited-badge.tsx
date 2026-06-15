import { backlogAgeBucket, backlogAgeDays, inBacklog } from "@/lib/backlog";
import { cn } from "@/lib/utils";
import type { Knife } from "@/lib/storage/types";

export function BacklogWaitedBadge({
  knife,
  now,
  showFresh = false,
  className,
}: {
  knife: Knife;
  now: Date;
  // When false (default), fresh items render nothing — used on cards where
  // the badge is a warning cue. Pass true in the backlog table so the
  // `added` column is never empty.
  showFresh?: boolean;
  // Extra classes the caller needs for layout (e.g. `relative z-10 shrink-0`
  // inside a card header that fights with link-overlays).
  className?: string;
}) {
  if (!inBacklog(knife)) return null;
  const bucket = backlogAgeBucket(knife, now);
  if (bucket === "fresh" && !showFresh) return null;
  const days = backlogAgeDays(knife, now);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        bucket === "fresh" && "border-border/60 bg-muted/40 text-muted-foreground",
        bucket === "warm" &&
          "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        bucket === "stale" &&
          "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300",
        className,
      )}
      title={`Added ${days} day${days === 1 ? "" : "s"} ago`}
    >
      Waited {days} d
    </span>
  );
}
