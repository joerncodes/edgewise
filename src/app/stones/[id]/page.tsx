"use client";

import { ArrowLeft, Layers, PocketKnife } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { Photo } from "@/components/photo";
import { Markdown } from "@/components/markdown";
import { PropertyList, PropertyRow } from "@/components/property-row";
import { api } from "@/lib/api-client";
import { usagesForStone } from "@/lib/stones";
import { cn } from "@/lib/utils";
import type { Knife, Stone } from "@/lib/storage/types";

const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "short" });

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return dateFmt.format(new Date(y, m - 1, d));
}

export default function StoneDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [stone, setStone] = useState<Stone | null>(null);
  const [knives, setKnives] = useState<Knife[]>([]);
  const [stones, setStones] = useState<Stone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getStone(id), api.listKnives(), api.listStones()])
      .then(([st, k, all]) => {
        setStone(st);
        setKnives(k);
        setStones(all);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  const stoneById = useMemo(
    () => Object.fromEntries(stones.map((s) => [s.id, s])),
    [stones],
  );
  const usages = useMemo(() => usagesForStone(knives, id), [knives, id]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!stone) {
    return (
      <div className="space-y-6">
        <Link
          href="/stones"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          <Layers className="h-3 w-3" />
          All stones
        </Link>
        <EmptyState title="Stone not found" hint="No record matches this slug." />
      </div>
    );
  }

  const hero = stone.images[0];
  const galleryImages = stone.images.slice(1);

  return (
    <div className="space-y-10">
      {hero && (
        <Photo
          src={api.stoneImageUrl(stone.id, hero.filename)}
          alt={hero.caption || stone.name}
          className="w-full overflow-hidden rounded-md bg-muted/40"
          imgClassName="h-auto"
          loadingMinHeight="14rem"
        />
      )}
      <header className="space-y-3">
        <Link
          href="/stones"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          <Layers className="h-3 w-3" />
          All stones
        </Link>
        <h1 className="flex items-center gap-3 text-4xl font-semibold tracking-tight text-brass">
          <Layers className="h-8 w-8" />
          {stone.name}
        </h1>
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          <span className="font-mono">{stone.grit}</span>
          {stone.type && (
            <>
              <span>·</span>
              <span>{stone.type}</span>
            </>
          )}
          <span>·</span>
          <span className="font-mono">{usages.length}</span>
          <span>{usages.length === 1 ? "session" : "sessions"}</span>
        </p>
      </header>

      <section>
        <PropertyList>
          <PropertyRow label="Grit">
            <span className="font-mono">{stone.grit}</span>
          </PropertyRow>
          {stone.type && <PropertyRow label="Type">{stone.type}</PropertyRow>}
        </PropertyList>
      </section>

      <section className="space-y-3">
        {stone.notes ? (
          <Markdown>{stone.notes}</Markdown>
        ) : (
          <EmptyState
            title="No notes yet"
            hint="PATCH /api/stones/<id> with a markdown `notes` body — soak time, dishing observations, anything worth keeping next to the stone."
          />
        )}
      </section>

      {galleryImages.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-heading text-sm uppercase tracking-wider text-foreground/80">
            {galleryImages.length === 1 ? "1 more image" : `${galleryImages.length} more images`}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {galleryImages.map((img) => (
              <figure key={img.filename} className="space-y-1.5">
                <Photo
                  src={api.stoneImageUrl(stone.id, img.filename)}
                  alt={img.caption || stone.name}
                  className="w-full overflow-hidden rounded-md bg-muted/40"
                  imgClassName="h-auto"
                  loadingMinHeight="10rem"
                />
                {img.caption && (
                  <figcaption className="text-xs text-muted-foreground">{img.caption}</figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-heading text-sm uppercase tracking-wider text-foreground/80">
          Sessions using this stone
        </h2>
        {usages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No sharpening session has referenced this stone yet.
          </p>
        ) : (
          <ol className="relative space-y-5 border-l border-border/60 pl-6">
            {usages.map((u, i) => (
              <li key={`${u.knifeId}-${u.date}-${i}`} className="relative space-y-1.5">
                <span className="absolute -left-[27px] top-2 h-2 w-2 rounded-full bg-border" />
                <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  {formatDate(u.date)}
                </div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Link
                    href={`/knives/${u.knifeId}`}
                    className="inline-flex items-center gap-1.5 text-base font-medium hover:underline"
                  >
                    <PocketKnife className="h-3.5 w-3.5" />
                    {u.knifeName}
                  </Link>
                  <span className="font-mono text-sm text-muted-foreground">
                    {u.angle}°
                  </span>
                </div>
                {u.stones.length > 1 && (
                  <StoneProgression
                    stones={u.stones}
                    stoneById={stoneById}
                    activeId={id}
                  />
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function StoneProgression({
  stones,
  stoneById,
  activeId,
}: {
  stones: string[];
  stoneById: Record<string, Stone>;
  activeId?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-xs">
      {stones.map((sid, i) => {
        const s = stoneById[sid];
        const label = s ? `${s.grit}` : sid;
        const isActive = sid === activeId;
        return (
          <span key={`${sid}-${i}`} className="inline-flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground/50">→</span>}
            {s ? (
              <Link
                href={`/stones/${sid}`}
                className={cn(
                  "inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono hover:underline",
                  isActive
                    ? "border-brass/50 bg-brass/10 text-brass"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            ) : (
              <span className="inline-flex items-center rounded-md border border-border px-1.5 py-0.5 font-mono text-muted-foreground/60 line-through">
                {label}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
