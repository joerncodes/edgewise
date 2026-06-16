"use client";

import { ArrowLeft, Tags } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { ALL_COLUMNS, KnivesView } from "@/components/knives-view";
import { ListViewToggle, useViewMode } from "@/components/list-view-toggle";
import {
  TableColumnsToggle,
  useTableColumns,
} from "@/components/table-columns-toggle";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { findKnifeType } from "@/lib/knife-types";
import type { Knife, Owner } from "@/lib/storage/types";

export default function KnifeTypeDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const subtypeFilter = searchParams.get("subtype") ?? "";
  const [knives, setKnives] = useState<Knife[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useViewMode();
  const columns = useTableColumns({
    routeKey: "types",
    available: ALL_COLUMNS,
    pageHidden: ["type"],
  });

  useEffect(() => {
    Promise.all([api.listKnives(), api.listOwners()])
      .then(([k, o]) => {
        setKnives(k);
        setOwners(o);
      })
      .finally(() => setLoading(false));
  }, []);

  const entry = useMemo(() => findKnifeType(knives, slug), [knives, slug]);

  // All knives of this type, before the subtype filter narrows them.
  // Used to roll up the subtype chip counts so the user sees the
  // full distribution and can switch between subtypes.
  const allOfType = useMemo(() => {
    if (!entry) return [];
    const ids = new Set(entry.knifeIds);
    return knives.filter((k) => ids.has(k.id));
  }, [knives, entry]);

  const subtypeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const k of allOfType) {
      const s = (k.subtype ?? "").trim();
      if (!s) continue;
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  }, [allOfType]);

  const knivesOfType = useMemo(() => {
    const filtered = subtypeFilter
      ? allOfType.filter((k) => (k.subtype ?? "").trim() === subtypeFilter)
      : allOfType;
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [allOfType, subtypeFilter]);

  function setSubtype(next: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("subtype", next);
    else params.delete("subtype");
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }

  const now = useMemo(() => new Date(), []);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!entry) {
    return (
      <div className="space-y-6">
        <Link
          href="/types"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          <Tags className="h-3 w-3" />
          All types
        </Link>
        <EmptyState
          title="Type not found"
          hint="No knife frontmatter matches this slug."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <Link
          href="/types"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          <Tags className="h-3 w-3" />
          All types
        </Link>
        <h1 className="flex items-center gap-3 text-4xl font-semibold tracking-tight text-brass">
          <Tags className="h-8 w-8" />
          {entry.displayName}
        </h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono">{knivesOfType.length}</span>
          {subtypeFilter ? (
            <>
              {" "}
              {knivesOfType.length === 1 ? "knife" : "knives"} of{" "}
              <span className="text-foreground">{subtypeFilter}</span>{" "}
              <span className="text-muted-foreground/60">
                ({entry.count} total)
              </span>
            </>
          ) : (
            <> {entry.count === 1 ? " knife" : " knives"}</>
          )}
        </p>
        {subtypeCounts.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSubtype(null)}
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-0.5 text-xs",
                subtypeFilter
                  ? "border-border text-muted-foreground hover:text-foreground"
                  : "border-brass/40 bg-brass/10 text-brass",
              )}
            >
              All
            </button>
            {subtypeCounts.map(({ value, count }) => {
              const active = subtypeFilter === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSubtype(active ? null : value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs",
                    active
                      ? "border-brass/40 bg-brass/10 text-brass"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {value}
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      <div className="flex justify-end gap-2">
        <ListViewToggle mode={viewMode} onModeChange={setViewMode} />
        {viewMode === "table" && <TableColumnsToggle control={columns} />}
      </div>

      <KnivesView
        knives={knivesOfType}
        owners={owners}
        now={now}
        mode={viewMode}
        hideColumns={columns.hideColumns}
        gridClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      />
    </div>
  );
}
