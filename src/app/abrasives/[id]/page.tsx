"use client";

import { ArrowLeft, Gem, PocketKnife } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { Photo } from "@/components/photo";
import { Markdown } from "@/components/markdown";
import { PropertyList, PropertyRow } from "@/components/property-row";
import { api } from "@/lib/api-client";
import { isStrop, usagesForAbrasive } from "@/lib/abrasives";
import { cn } from "@/lib/utils";
import type { Abrasive, Knife } from "@/lib/storage/types";

const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "short" });

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return dateFmt.format(new Date(y, m - 1, d));
}

export default function AbrasiveDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [abrasive, setAbrasive] = useState<Abrasive | null>(null);
  const [knives, setKnives] = useState<Knife[]>([]);
  const [abrasives, setAbrasives] = useState<Abrasive[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getAbrasive(id), api.listKnives(), api.listAbrasives()])
      .then(([a, k, all]) => {
        setAbrasive(a);
        setKnives(k);
        setAbrasives(all);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  const abrasiveById = useMemo(
    () => Object.fromEntries(abrasives.map((a) => [a.id, a])),
    [abrasives],
  );
  const usages = useMemo(() => usagesForAbrasive(knives, id), [knives, id]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!abrasive) {
    return (
      <div className="space-y-6">
        <Link
          href="/abrasives"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          <Gem className="h-3 w-3" />
          All abrasives
        </Link>
        <EmptyState title="Abrasive not found" hint="No record matches this slug." />
      </div>
    );
  }

  const hero = abrasive.images[0];
  const galleryImages = abrasive.images.slice(1);
  const strop = isStrop(abrasive);

  return (
    <div className="space-y-10">
      {hero && (
        <Photo
          src={api.abrasiveImageUrl(abrasive.id, hero.filename)}
          alt={hero.caption || abrasive.name}
          className="w-full overflow-hidden rounded-md bg-muted/40"
          imgClassName="h-auto"
          loadingMinHeight="14rem"
        />
      )}
      <header className="space-y-3">
        <Link
          href="/abrasives"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          <Gem className="h-3 w-3" />
          All abrasives
        </Link>
        <h1 className="flex items-center gap-3 text-4xl font-semibold tracking-tight text-brass">
          <Gem className="h-8 w-8" />
          {abrasive.name}
        </h1>
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          {strop && abrasive.compound ? (
            <span>{abrasive.compound}</span>
          ) : (
            <span className="font-mono">{abrasive.grit}</span>
          )}
          {abrasive.type && (
            <>
              <span>·</span>
              <span>{abrasive.type}</span>
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
            <span className="font-mono">{abrasive.grit}</span>
          </PropertyRow>
          {abrasive.type && <PropertyRow label="Type">{abrasive.type}</PropertyRow>}
          {abrasive.compound && (
            <PropertyRow label="Compound">{abrasive.compound}</PropertyRow>
          )}
          {abrasive.substrate && (
            <PropertyRow label="Substrate">{abrasive.substrate}</PropertyRow>
          )}
        </PropertyList>
      </section>

      <section className="space-y-3">
        {abrasive.notes ? (
          <Markdown>{abrasive.notes}</Markdown>
        ) : (
          <EmptyState
            title="No notes yet"
            hint="PATCH /api/abrasives/<id> with a markdown `notes` body — soak time, dishing observations, anything worth keeping next to the abrasive."
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
                  src={api.abrasiveImageUrl(abrasive.id, img.filename)}
                  alt={img.caption || abrasive.name}
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
          Sessions using this abrasive
        </h2>
        {usages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No sharpening session has referenced this abrasive yet.
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
                {u.abrasives.length > 1 && (
                  <AbrasiveProgression
                    abrasives={u.abrasives}
                    abrasiveById={abrasiveById}
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

function AbrasiveProgression({
  abrasives,
  abrasiveById,
  activeId,
}: {
  abrasives: string[];
  abrasiveById: Record<string, Abrasive>;
  activeId?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-xs">
      {abrasives.map((aid, i) => {
        const a = abrasiveById[aid];
        const label = a ? chipLabel(a) : aid;
        const isActive = aid === activeId;
        return (
          <span key={`${aid}-${i}`} className="inline-flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground/50">→</span>}
            {a ? (
              <Link
                href={`/abrasives/${aid}`}
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

// Chip label rule: for a strop, prefer the compound shorthand
// (`CrOx`, `Diamond 1µm`) if present, else `STROP`. For a stone,
// the grit number.
function chipLabel(a: Abrasive): string {
  if (isStrop(a)) {
    return a.compound.trim() || "STROP";
  }
  return String(a.grit);
}
