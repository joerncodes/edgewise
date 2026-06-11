"use client";

import { ChevronRight, Grip } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { api } from "@/lib/api-client";
import { groupHandles } from "@/lib/handles";
import type { Handle, Knife } from "@/lib/storage/types";

export default function HandlesPage() {
  const [knives, setKnives] = useState<Knife[]>([]);
  const [handles, setHandles] = useState<Handle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.listKnives(), api.listHandles()])
      .then(([k, h]) => {
        setKnives(k);
        setHandles(h);
      })
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    return groupHandles(knives, handles).sort(
      (a, b) =>
        b.count - a.count ||
        Number(b.hasRecord) - Number(a.hasRecord) ||
        a.displayName.localeCompare(b.displayName),
    );
  }, [knives, handles]);

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-brass">
        <Grip className="h-7 w-7" />
        Handles
      </h1>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : grouped.length === 0 ? (
        <EmptyState
          title="No handle materials yet"
          hint="Add a handle to a knife's frontmatter via the API and it will appear here."
        />
      ) : (
        <ul className="-mx-2 divide-y divide-border/70">
          {grouped.map((h) => (
            <li key={h.slug}>
              <Link
                href={`/handles/${h.slug}`}
                className="group flex items-center gap-4 rounded-md px-2 py-3 transition-colors hover:bg-accent/40"
              >
                <Grip className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-foreground">
                    {h.displayName}
                  </div>
                  {!h.hasRecord && (
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                      No notes yet
                    </div>
                  )}
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  {h.count} {h.count === 1 ? "knife" : "knives"}
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
