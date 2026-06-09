"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PropertyList, PropertyRow } from "@/components/property-row";
import { api } from "@/lib/api-client";
import type { Knife, Owner } from "@/lib/storage/types";

const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "short" });

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return dateFmt.format(new Date(y, m - 1, d));
}

export default function KnifeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [knife, setKnife] = useState<Knife | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getKnife(id)
      .then(async (k) => {
        setKnife(k);
        if (k.ownerId) {
          try {
            setOwner(await api.getOwner(k.ownerId));
          } catch {
            // owner may have been deleted directly via files; ignore
          }
        }
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!knife) return <p className="text-sm text-muted-foreground">Not found.</p>;

  const sortedSessions = [...knife.sessions].sort((a, b) => b.date.localeCompare(a.date));
  const last = sortedSessions[0];

  return (
    <div className="space-y-12">
      <header className="space-y-3">
        <Link
          href="/knives"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          All knives
        </Link>
        <h1 className="text-4xl font-semibold tracking-tight text-brass">{knife.name}</h1>
        <p className="text-sm text-muted-foreground">
          {owner ? (
            <Link href={`/owners/${owner.id}`} className="hover:text-foreground hover:underline">
              {owner.name}
            </Link>
          ) : (
            <span>{knife.ownerId}</span>
          )}
        </p>
      </header>

      <section>
        <PropertyList>
          {owner && (
            <PropertyRow label="Owner">
              <Link href={`/owners/${owner.id}`} className="hover:underline">
                {owner.name}
              </Link>
            </PropertyRow>
          )}
          <PropertyRow label="Type">{knife.type}</PropertyRow>
          <PropertyRow label="Manufacturer">{knife.manufacturer}</PropertyRow>
          <PropertyRow label="Steel">{knife.steel}</PropertyRow>
          {last && (
            <PropertyRow label="Last sharpened">
              <span className="font-mono">{formatDate(last.date)}</span>
              <span className="mx-2 text-muted-foreground">@</span>
              <span className="font-mono">{last.angle}°</span>
            </PropertyRow>
          )}
          <PropertyRow label="Sharpenings">
            <span className="font-mono">{knife.sessions.length}</span>
          </PropertyRow>
        </PropertyList>
      </section>

      {knife.images.length > 0 && (
        <section className="space-y-3">
          <SectionLabel>
            {knife.images.length === 1 ? "1 image" : `${knife.images.length} images`}
          </SectionLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {knife.images.map((img) => (
              <figure key={img.filename} className="space-y-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={api.imageUrl(knife.id, img.filename)}
                  alt={img.caption || knife.name}
                  className="w-full rounded-md object-cover"
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
        <SectionLabel>
          {knife.sessions.length === 1 ? "1 sharpening" : `${knife.sessions.length} sharpenings`}
        </SectionLabel>
        {sortedSessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ol className="relative space-y-5 border-l border-border/60 pl-6">
            {sortedSessions.map((s, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[27px] top-2 h-2 w-2 rounded-full bg-border" />
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                  {formatDate(s.date)}
                </div>
                <div className="mt-0.5 text-2xl font-semibold tracking-tight font-mono">
                  {s.angle}°
                </div>
                {s.notes && (
                  <p className="mt-1 text-sm text-muted-foreground">{s.notes}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {knife.notes && (
        <section className="space-y-3">
          <SectionLabel>Notes</SectionLabel>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{knife.notes}</p>
        </section>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </h2>
  );
}
