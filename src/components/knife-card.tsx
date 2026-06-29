"use client";

import {
  ChevronDown,
  ChevronRight,
  Handshake,
  User,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BacklogWaitedBadge } from "@/components/backlog-waited-badge";
import { EdgeV } from "@/components/edge-v";
import { KnifeChips } from "@/components/knife-chips";
import { Photo } from "@/components/photo";
import { Stars } from "@/components/stars";
import { api } from "@/lib/api-client";
import { backlogAgeBucket, inBacklog } from "@/lib/backlog";
import { cn } from "@/lib/utils";
import type { Knife, Owner, SharpeningSession } from "@/lib/storage/types";

const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "short" });
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return dateFmt.format(new Date(y, m - 1, d));
}

export function ago(iso: string, now: Date): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const then = new Date(y, m - 1, d);
  const days = Math.floor((now.getTime() - then.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return rtf.format(-days, "day");
  if (days < 60) return rtf.format(-Math.round(days / 7), "week");
  if (days < 365) return rtf.format(-Math.round(days / 30), "month");
  return rtf.format(-Math.round(days / 365), "year");
}

export function lastSession(k: Knife): SharpeningSession | undefined {
  if (k.sessions.length === 0) return undefined;
  return [...k.sessions].sort((a, b) => b.date.localeCompare(a.date))[0];
}

export function KnifeCard({
  knife,
  owner,
  now,
  featured = false,
  showBacklogAge = false,
}: {
  knife: Knife;
  owner?: Owner;
  now: Date;
  // When true, lay out side-by-side on desktop with a taller image —
  // same content, just more room. Mobile is unchanged.
  featured?: boolean;
  // Render the backlog-age cue (left-border accent + pill). Only meaningful
  // on the backlog page; cards on `/` should stay neutral.
  showBacklogAge?: boolean;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const last = lastSession(knife);
  const ownerName = owner?.name ?? knife.ownerId;
  const sortedSessions = [...knife.sessions].sort((a, b) => b.date.localeCompare(a.date));
  const cover = knife.images[0];
  const showAge = showBacklogAge && inBacklog(knife);
  const ageBucket = showAge ? backlogAgeBucket(knife, now) : null;

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-lg border transition-colors",
        featured
          ? "border-brass/30 bg-brass/5 hover:border-brass/50 dark:border-brass/25 dark:bg-brass/[0.06] dark:hover:border-brass/40 md:flex-row"
          : "border-border/70 bg-card/30 hover:border-border dark:border-border dark:bg-accent",
        ageBucket === "warm" && "border-l-2 border-l-amber-500/60",
        ageBucket === "stale" && "border-l-2 border-l-red-500/70",
      )}
    >
      {cover && (
        <Photo
          src={api.imageUrl(knife.id, cover.filename, featured ? undefined : "thumb")}
          alt={cover.caption || knife.name}
          className={cn(
            "w-full overflow-hidden bg-muted/40",
            featured
              ? "aspect-[3/1] md:aspect-auto md:h-auto md:w-1/2 md:shrink-0 md:self-stretch"
              : "aspect-[3/1]",
          )}
          imgClassName="h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      )}
      <div
        className={cn(
          featured && "md:flex md:flex-1 md:flex-col",
        )}
      >
      <div
        className={cn(
          "space-y-3 p-4",
          featured && "md:p-6",
        )}
      >
        <div className="font-heading text-xs uppercase tracking-wider text-brass">
          <Link
            href={`/owners/${knife.ownerId}`}
            className="relative z-10 inline-flex items-center gap-1.5 hover:underline"
          >
            <User className="h-3 w-3" />
            {ownerName}
          </Link>
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold leading-tight text-foreground group-hover:underline">
            <Link
              href={`/knives/${knife.id}`}
              className="after:absolute after:inset-0 after:content-['']"
            >
              {knife.name}
            </Link>
          </h2>
          {knife.onLoan && (
            <span className="relative z-10 inline-flex shrink-0 items-center gap-1 rounded-md border border-brass/40 bg-brass/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brass">
              <Handshake className="h-3 w-3" />
              On loan
            </span>
          )}
          {showAge && (
            <BacklogWaitedBadge
              knife={knife}
              now={now}
              className="relative z-10 shrink-0"
            />
          )}
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
        </div>

        <KnifeChips knife={knife} className="relative z-10" />

        <div className="flex items-center gap-3 pt-1">
          {last ? (
            <>
              <EdgeV angle={last.angle} />
              <div className="font-mono text-sm leading-tight">
                <div className="text-foreground">{last.angle}°/side</div>
                <div className="text-xs text-muted-foreground">
                  {last.angle * 2}° inclusive
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs italic text-muted-foreground">
              No bevel recorded yet
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
          {last ? (
            <>
              <span className="font-mono">{formatDate(last.date)}</span>
              <span>·</span>
              <span>{ago(last.date, now)}</span>
              {last.rating !== undefined && (
                <>
                  <span>·</span>
                  <Stars value={last.rating} />
                </>
              )}
            </>
          ) : (
            <span>Never sharpened</span>
          )}
        </div>

        {knife.notes && (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {knife.notes}
          </p>
        )}
      </div>

      {sortedSessions.length > 0 && (
        <div className="relative z-10 mx-4 mb-4 mt-1 border-t border-border/50 pt-2">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground"
            aria-expanded={showHistory}
          >
            <span>
              History ({sortedSessions.length}{" "}
              {sortedSessions.length === 1 ? "sharpening" : "sharpenings"})
            </span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                showHistory && "rotate-180",
              )}
            />
          </button>
          {showHistory && (
            <ol className="mt-2 space-y-2 text-xs">
              {sortedSessions.map((s, i) => (
                <li key={i} className="space-y-0.5">
                  <div className="flex items-baseline justify-between gap-2 font-mono">
                    <span className="text-muted-foreground">{formatDate(s.date)}</span>
                    <span className="flex items-center gap-2 text-foreground">
                      {s.rating !== undefined && <Stars value={s.rating} />}
                      <span>{s.angle}°</span>
                    </span>
                  </div>
                  {s.notes && (
                    <p className="leading-snug text-muted-foreground">{s.notes}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
      </div>
    </article>
  );
}
