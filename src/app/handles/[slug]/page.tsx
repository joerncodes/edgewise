"use client";

import { ArrowLeft, Grip } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { KnivesView } from "@/components/knives-view";
import { ListViewToggle, useViewMode } from "@/components/list-view-toggle";
import { api } from "@/lib/api-client";
import { findHandle } from "@/lib/handles";
import type { Knife, Owner } from "@/lib/storage/types";

export default function HandleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [knives, setKnives] = useState<Knife[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useViewMode();

  useEffect(() => {
    Promise.all([api.listKnives(), api.listOwners()])
      .then(([k, o]) => {
        setKnives(k);
        setOwners(o);
      })
      .finally(() => setLoading(false));
  }, []);

  const entry = useMemo(() => findHandle(knives, slug), [knives, slug]);
  const knivesWithHandle = useMemo(() => {
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
          href="/handles"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          <Grip className="h-3 w-3" />
          All handles
        </Link>
        <EmptyState
          title="Handle not found"
          hint="No knife frontmatter matches this slug."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <Link
          href="/handles"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          <Grip className="h-3 w-3" />
          All handles
        </Link>
        <h1 className="flex items-center gap-3 text-4xl font-semibold tracking-tight text-brass">
          <Grip className="h-8 w-8" />
          {entry.displayName}
        </h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono">{entry.count}</span>{" "}
          {entry.count === 1 ? "knife" : "knives"}
        </p>
      </header>

      <div className="flex justify-end">
        <ListViewToggle mode={viewMode} onModeChange={setViewMode} />
      </div>

      <KnivesView
        knives={knivesWithHandle}
        owners={owners}
        now={now}
        mode={viewMode}
        gridClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      />
    </div>
  );
}
