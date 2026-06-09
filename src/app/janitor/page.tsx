"use client";

import { Check, ChevronRight, ListChecks, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { api } from "@/lib/api-client";
import type { Janitor, KnifeRef, StaleKnifeRef } from "@/lib/janitor";

export default function JanitorPage() {
  const [janitor, setJanitor] = useState<Janitor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getJanitor()
      .then(setJanitor)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-brass">
          <ListChecks className="h-7 w-7" />
          Janitor
        </h1>
        <p className="text-sm text-muted-foreground">
          Quiet backfill list — knives that are missing fields you might want to
          fill in. Click through and patch via the API.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !janitor ? (
        <EmptyState title="Couldn't load" />
      ) : (
        <div className="space-y-8">
          <Section
            title="No photo"
            rows={janitor.noPhoto}
            hint="Knives without a single uploaded image."
          />
          <Section
            title="No sessions yet"
            rows={janitor.noSessions}
            hint="Knives that have never been sharpened — at least not in this app."
          />
          <Section
            title="No steel recorded"
            rows={janitor.noSteel}
          />
          <Section
            title="No type recorded"
            rows={janitor.noType}
          />
          <Section
            title="No manufacturer recorded"
            rows={janitor.noManufacturer}
          />
          <Section
            title="No notes"
            rows={janitor.noNotes}
          />
          <StaleSection
            title={`Not sharpened in over ${Math.floor(
              janitor.staleAfterDays / 30,
            )} months`}
            rows={janitor.stale}
          />
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  rows,
  hint,
}: {
  title: string;
  rows: KnifeRef[];
  hint?: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-3">
        <h2 className="font-heading text-sm uppercase tracking-wider text-foreground/80">
          {title}
        </h2>
        <span className="font-mono text-xs text-muted-foreground">
          {rows.length} {rows.length === 1 ? "knife" : "knives"}
        </span>
      </div>
      {hint && <p className="-mt-1 text-xs text-muted-foreground">{hint}</p>}
      {rows.length === 0 ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Check className="h-3.5 w-3.5 text-brass" />
          All clean.
        </p>
      ) : (
        <ul className="-mx-2 divide-y divide-border/60">
          {rows.map((r) => (
            <li key={r.id}>
              <RowLink r={r} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StaleSection({
  title,
  rows,
}: {
  title: string;
  rows: StaleKnifeRef[];
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-3">
        <h2 className="font-heading text-sm uppercase tracking-wider text-foreground/80">
          {title}
        </h2>
        <span className="font-mono text-xs text-muted-foreground">
          {rows.length} {rows.length === 1 ? "knife" : "knives"}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Check className="h-3.5 w-3.5 text-brass" />
          All clean.
        </p>
      ) : (
        <ul className="-mx-2 divide-y divide-border/60">
          {rows.map((r) => (
            <li key={r.id}>
              <RowLink
                r={r}
                trailing={
                  <span className="font-mono text-xs text-muted-foreground">
                    {r.daysSince}d
                  </span>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RowLink({
  r,
  trailing,
}: {
  r: KnifeRef;
  trailing?: React.ReactNode;
}) {
  return (
    <Link
      href={`/knives/${r.id}`}
      className="group flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent/40"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-foreground">{r.name}</div>
        <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <User className="h-3 w-3" />
          {r.ownerName}
        </div>
      </div>
      {trailing}
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
    </Link>
  );
}
