"use client";

import { ArrowLeft, Factory, PocketKnife, Tags, User } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KnifeImage } from "@/components/knife-image";
import { PropertyList, PropertyRow } from "@/components/property-row";
import { Stars } from "@/components/stars";
import { api } from "@/lib/api-client";
import { slugify } from "@/lib/storage/ids";
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
  const hero = knife.images[0];
  const galleryImages = knife.images.slice(1);

  return (
    <div className="space-y-12">
      {hero && (
        <KnifeImage
          src={api.imageUrl(knife.id, hero.filename)}
          alt={hero.caption || knife.name}
          className="w-full overflow-hidden rounded-md bg-muted/40"
          imgClassName="h-auto"
          loadingMinHeight="16rem"
        />
      )}
      <header className="space-y-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          <PocketKnife className="h-3 w-3" />
          All knives
        </Link>
        <h1 className="flex items-center gap-3 text-4xl font-semibold tracking-tight text-brass">
          <PocketKnife className="h-8 w-8" />
          {knife.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {owner ? (
            <Link
              href={`/owners/${owner.id}`}
              className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
            >
              <User className="h-3.5 w-3.5" />
              {owner.name}
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {knife.ownerId}
            </span>
          )}
        </p>
      </header>

      <section>
        <PropertyList>
          {owner && (
            <PropertyRow label="Owner">
              <Link
                href={`/owners/${owner.id}`}
                className="inline-flex items-center gap-1.5 hover:underline"
              >
                <User className="h-3.5 w-3.5" />
                {owner.name}
              </Link>
            </PropertyRow>
          )}
          <PropertyRow label="Type">
            {knife.type ? (
              <Link
                href={`/types/${slugify(knife.type)}`}
                className="inline-flex items-center gap-1.5 hover:underline"
              >
                <Tags className="h-3.5 w-3.5" />
                {knife.type}
              </Link>
            ) : null}
          </PropertyRow>
          <PropertyRow label="Manufacturer">
            {knife.manufacturer ? (
              <Link
                href={`/manufacturers/${slugify(knife.manufacturer)}`}
                className="inline-flex items-center gap-1.5 hover:underline"
              >
                <Factory className="h-3.5 w-3.5" />
                {knife.manufacturer}
              </Link>
            ) : null}
          </PropertyRow>
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

      {galleryImages.length > 0 && (
        <section className="space-y-3">
          <SectionLabel>
            {galleryImages.length === 1 ? "1 more image" : `${galleryImages.length} more images`}
          </SectionLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {galleryImages.map((img) => (
              <figure key={img.filename} className="space-y-1.5">
                <KnifeImage
                  src={api.imageUrl(knife.id, img.filename)}
                  alt={img.caption || knife.name}
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
                <div className="mt-0.5 flex items-center gap-3">
                  <span className="text-2xl font-semibold tracking-tight font-mono">
                    {s.angle}°
                  </span>
                  {s.rating !== undefined && <Stars value={s.rating} size="md" />}
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
