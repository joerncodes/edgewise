"use client";

import { ArrowLeft, Atom } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { KnivesView } from "@/components/knives-view";
import { ListViewToggle, useViewMode } from "@/components/list-view-toggle";
import { Markdown } from "@/components/markdown";
import { PropertyList, PropertyRow } from "@/components/property-row";
import { api } from "@/lib/api-client";
import { findSteel } from "@/lib/steels";
import type { Knife, Owner, Steel } from "@/lib/storage/types";

export default function SteelDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [knives, setKnives] = useState<Knife[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [steels, setSteels] = useState<Steel[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useViewMode();

  useEffect(() => {
    Promise.all([api.listKnives(), api.listOwners(), api.listSteels()])
      .then(([k, o, s]) => {
        setKnives(k);
        setOwners(o);
        setSteels(s);
      })
      .finally(() => setLoading(false));
  }, []);

  const entry = useMemo(() => findSteel(knives, steels, slug), [knives, steels, slug]);
  const record = useMemo(() => steels.find((s) => s.id === slug), [steels, slug]);
  const knivesOfSteel = useMemo(() => {
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
          href="/steels"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          <Atom className="h-3 w-3" />
          All steels
        </Link>
        <EmptyState title="Steel not found" hint="No knife or steel record matches this slug." />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <Link
          href="/steels"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          <Atom className="h-3 w-3" />
          All steels
        </Link>
        <h1 className="flex items-center gap-3 text-4xl font-semibold tracking-tight text-brass">
          <Atom className="h-8 w-8" />
          {entry.displayName}
        </h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono">{entry.count}</span>{" "}
          {entry.count === 1 ? "knife" : "knives"}
        </p>
      </header>

      {record?.composition && (
        <section>
          <PropertyList>
            <PropertyRow label="Composition">
              <span className="font-mono text-sm">{record.composition}</span>
            </PropertyRow>
          </PropertyList>
        </section>
      )}

      <section className="space-y-3">
        {record?.notes ? (
          <Markdown>{record.notes}</Markdown>
        ) : (
          <EmptyState
            title="No notes yet"
            hint="PATCH /api/steels/<id> with a markdown `notes` body to write care tips, sharpening behaviour, or anything else worth keeping next to this steel."
          />
        )}
      </section>

      {knivesOfSteel.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-sm uppercase tracking-wider text-foreground/80">
              Knives with this steel
            </h2>
            <ListViewToggle mode={viewMode} onModeChange={setViewMode} />
          </div>
          <KnivesView
            knives={knivesOfSteel}
            owners={owners}
            now={now}
            mode={viewMode}
            hideColumns={["steel"]}
            gridClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          />
        </section>
      )}
    </div>
  );
}
