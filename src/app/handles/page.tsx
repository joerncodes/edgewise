"use client";

import { ChevronRight, Grip } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { api } from "@/lib/api-client";
import { groupHandles } from "@/lib/handles";
import type { Knife } from "@/lib/storage/types";

export default function HandlesPage() {
  const [knives, setKnives] = useState<Knife[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listKnives()
      .then(setKnives)
      .finally(() => setLoading(false));
  }, []);

  const handles = useMemo(() => {
    return groupHandles(knives).sort(
      (a, b) => b.count - a.count || a.displayName.localeCompare(b.displayName),
    );
  }, [knives]);

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-brass">
        <Grip className="h-7 w-7" />
        Handles
      </h1>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : handles.length === 0 ? (
        <EmptyState
          title="No handle materials yet"
          hint="Add a handle to a knife's frontmatter via the API and it will appear here."
        />
      ) : (
        <ul className="-mx-2 divide-y divide-border/70">
          {handles.map((h) => (
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
