"use client";

import { ArrowLeft, Grip } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { KnivesView } from "@/components/knives-view";
import { ListViewToggle, useViewMode } from "@/components/list-view-toggle";
import { Markdown } from "@/components/markdown";
import { api } from "@/lib/api-client";
import { findHandle } from "@/lib/handles";
import type { Handle, Knife, Owner } from "@/lib/storage/types";

export default function HandleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [knives, setKnives] = useState<Knife[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [handles, setHandles] = useState<Handle[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useViewMode();

  useEffect(() => {
    Promise.all([api.listKnives(), api.listOwners(), api.listHandles()])
      .then(([k, o, h]) => {
        setKnives(k);
        setOwners(o);
        setHandles(h);
      })
      .finally(() => setLoading(false));
  }, []);

  const entry = useMemo(
    () => findHandle(knives, handles, slug),
    [knives, handles, slug],
  );
  const record = useMemo(
    () => handles.find((h) => h.id === slug),
    [handles, slug],
  );
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
          hint="No knife or handle record matches this slug."
        />
      </div>
    );
  }

  return (
    <div className="space-y-10">
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

      <section className="space-y-3">
        {record?.notes ? (
          <Markdown>{record.notes}</Markdown>
        ) : (
          <EmptyState
            title="No notes yet"
            hint="PATCH /api/handles/<id> with a markdown `notes` body to describe the material — grip, water tolerance, sharpening-relevant quirks."
          />
        )}
      </section>

      {knivesWithHandle.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-sm uppercase tracking-wider text-foreground/80">
              Knives with this handle
            </h2>
            <ListViewToggle mode={viewMode} onModeChange={setViewMode} />
          </div>
          <KnivesView
            knives={knivesWithHandle}
            owners={owners}
            now={now}
            mode={viewMode}
            gridClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          />
        </section>
      )}
    </div>
  );
}
