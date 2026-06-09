"use client";

import { ChevronRight, Tags } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { api } from "@/lib/api-client";
import { groupKnifeTypes } from "@/lib/knife-types";
import type { Knife } from "@/lib/storage/types";

export default function KnifeTypesPage() {
  const [knives, setKnives] = useState<Knife[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listKnives()
      .then(setKnives)
      .finally(() => setLoading(false));
  }, []);

  const types = useMemo(() => {
    return groupKnifeTypes(knives).sort(
      (a, b) => b.count - a.count || a.displayName.localeCompare(b.displayName),
    );
  }, [knives]);

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-brass">
        <Tags className="h-7 w-7" />
        Types
      </h1>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : types.length === 0 ? (
        <EmptyState
          title="No types yet"
          hint="Add a `type` to a knife's frontmatter via the API and it will appear here."
        />
      ) : (
        <ul className="-mx-2 divide-y divide-border/70">
          {types.map((t) => (
            <li key={t.slug}>
              <Link
                href={`/types/${t.slug}`}
                className="group flex items-center gap-4 rounded-md px-2 py-3 transition-colors hover:bg-accent/40"
              >
                <Tags className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-foreground">
                    {t.displayName}
                  </div>
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  {t.count} {t.count === 1 ? "knife" : "knives"}
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
