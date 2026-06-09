"use client";

import { Atom, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { api } from "@/lib/api-client";
import { groupSteels } from "@/lib/steels";
import type { Knife, Steel } from "@/lib/storage/types";

export default function SteelsPage() {
  const [knives, setKnives] = useState<Knife[]>([]);
  const [steels, setSteels] = useState<Steel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.listKnives(), api.listSteels()])
      .then(([k, s]) => {
        setKnives(k);
        setSteels(s);
      })
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    return groupSteels(knives, steels).sort(
      (a, b) =>
        b.count - a.count ||
        Number(b.hasRecord) - Number(a.hasRecord) ||
        a.displayName.localeCompare(b.displayName),
    );
  }, [knives, steels]);

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-brass">
        <Atom className="h-7 w-7" />
        Steels
      </h1>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : grouped.length === 0 ? (
        <EmptyState
          title="No steels yet"
          hint="Add a steel via the API or set the `steel` field on a knife."
        />
      ) : (
        <ul className="-mx-2 divide-y divide-border/70">
          {grouped.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/steels/${s.slug}`}
                className="group flex items-center gap-4 rounded-md px-2 py-3 transition-colors hover:bg-accent/40"
              >
                <Atom className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-foreground">
                    {s.displayName}
                  </div>
                  {!s.hasRecord && (
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                      No notes yet
                    </div>
                  )}
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  {s.count} {s.count === 1 ? "knife" : "knives"}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
