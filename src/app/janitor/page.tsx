"use client";

import { Check, ChevronRight, ListChecks, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
          fill in. Click a row to open the section, then click through to patch
          via the API.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !janitor ? (
        <EmptyState title="Couldn't load" />
      ) : (
        <Accordion multiple className="space-y-0">
          <Section value="no-photo" title="No photo" rows={janitor.noPhoto} />
          <Section
            value="no-sessions"
            title="No sessions yet"
            rows={janitor.noSessions}
          />
          <Section value="no-steel" title="No steel recorded" rows={janitor.noSteel} />
          <Section value="no-type" title="No type recorded" rows={janitor.noType} />
          <Section
            value="no-manufacturer"
            title="No manufacturer recorded"
            rows={janitor.noManufacturer}
          />
          <Section
            value="no-handle"
            title="No handle material recorded"
            rows={janitor.noHandle}
          />
          <Section value="no-notes" title="No notes" rows={janitor.noNotes} />
          <StaleSection
            value="stale"
            title={`Not sharpened in over ${Math.floor(
              janitor.staleAfterDays / 30,
            )} months`}
            rows={janitor.stale}
          />
        </Accordion>
      )}
    </div>
  );
}

function Section({
  value,
  title,
  rows,
}: {
  value: string;
  title: string;
  rows: KnifeRef[];
}) {
  const empty = rows.length === 0;
  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="text-foreground/90">
        <div className="flex items-baseline gap-3">
          <span className="font-heading text-sm uppercase tracking-wider">
            {title}
          </span>
          {empty ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="h-3 w-3 text-brass" />
              all clean
            </span>
          ) : (
            <span className="font-mono text-xs text-muted-foreground">
              {rows.length} {rows.length === 1 ? "knife" : "knives"}
            </span>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        {empty ? (
          <p className="text-xs text-muted-foreground">Nothing here.</p>
        ) : (
          <ul className="-mx-2 divide-y divide-border/60">
            {rows.map((r) => (
              <li key={r.id}>
                <RowLink r={r} />
              </li>
            ))}
          </ul>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

function StaleSection({
  value,
  title,
  rows,
}: {
  value: string;
  title: string;
  rows: StaleKnifeRef[];
}) {
  const empty = rows.length === 0;
  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="text-foreground/90">
        <div className="flex items-baseline gap-3">
          <span className="font-heading text-sm uppercase tracking-wider">
            {title}
          </span>
          {empty ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="h-3 w-3 text-brass" />
              all clean
            </span>
          ) : (
            <span className="font-mono text-xs text-muted-foreground">
              {rows.length} {rows.length === 1 ? "knife" : "knives"}
            </span>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        {empty ? (
          <p className="text-xs text-muted-foreground">Nothing here.</p>
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
      </AccordionContent>
    </AccordionItem>
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
