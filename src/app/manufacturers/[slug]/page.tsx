"use client";

import { ArrowLeft, Factory } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { ALL_COLUMNS, KnivesView } from "@/components/knives-view";
import { ListViewToggle, useViewMode } from "@/components/list-view-toggle";
import {
  TableColumnsToggle,
  useTableColumns,
} from "@/components/table-columns-toggle";
import { api } from "@/lib/api-client";
import { findManufacturer } from "@/lib/manufacturers";
import type { Knife, Owner } from "@/lib/storage/types";

export default function ManufacturerDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [knives, setKnives] = useState<Knife[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useViewMode();
  const columns = useTableColumns({
    routeKey: "manufacturers",
    available: ALL_COLUMNS,
    pageHidden: ["manufacturer"],
  });

  useEffect(() => {
    Promise.all([api.listKnives(), api.listOwners()])
      .then(([k, o]) => {
        setKnives(k);
        setOwners(o);
      })
      .finally(() => setLoading(false));
  }, []);

  const entry = useMemo(() => findManufacturer(knives, slug), [knives, slug]);
  const knivesByMaker = useMemo(() => {
    if (!entry) return [];
    const ids = new Set(entry.knifeIds);
    return knives
      .filter((k) => ids.has(k.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [knives, entry]);

  const now = useMemo(() => new Date(), []);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!entry) {
    return (
      <div className="space-y-6">
        <Link
          href="/manufacturers"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          <Factory className="h-3 w-3" />
          All manufacturers
        </Link>
        <EmptyState
          title="Manufacturer not found"
          hint="No knife frontmatter matches this slug."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <Link
          href="/manufacturers"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          <Factory className="h-3 w-3" />
          All manufacturers
        </Link>
        <h1 className="flex items-center gap-3 text-4xl font-semibold tracking-tight text-brass">
          <Factory className="h-8 w-8" />
          {entry.displayName}
        </h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono">{entry.count}</span>{" "}
          {entry.count === 1 ? "knife" : "knives"}
        </p>
      </header>

      <div className="flex justify-end gap-2">
        <ListViewToggle mode={viewMode} onModeChange={setViewMode} />
        {viewMode === "table" && <TableColumnsToggle control={columns} />}
      </div>

      <KnivesView
        knives={knivesByMaker}
        owners={owners}
        now={now}
        mode={viewMode}
        hideColumns={columns.hideColumns}
        gridClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      />
    </div>
  );
}
