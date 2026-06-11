"use client";

import {
  ArrowLeft,
  Atom,
  Factory,
  Gem,
  Handshake,
  Inbox,
  PocketKnife,
  Tags,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Photo } from "@/components/photo";
import { Markdown } from "@/components/markdown";
import { PropertyList, PropertyRow } from "@/components/property-row";
import { Stars } from "@/components/stars";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { slugify } from "@/lib/storage/ids";
import { isStrop } from "@/lib/abrasives";
import type { Abrasive, Knife, Owner } from "@/lib/storage/types";

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
  const [abrasives, setAbrasives] = useState<Abrasive[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [togglingLoan, setTogglingLoan] = useState(false);

  const abrasiveById = useMemo(
    () => Object.fromEntries(abrasives.map((a) => [a.id, a])),
    [abrasives],
  );

  async function toggleBacklog() {
    if (!knife || toggling) return;
    const next = !knife.backlog;
    setToggling(true);
    try {
      const updated = await api.updateKnife(knife.id, { backlog: next });
      setKnife(updated);
      toast(next ? "Added to backlog" : "Removed from backlog", {
        icon: <Inbox className="h-4 w-4" />,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setToggling(false);
    }
  }

  async function toggleOnLoan() {
    if (!knife || togglingLoan) return;
    const next = !knife.onLoan;
    setTogglingLoan(true);
    try {
      const updated = await api.updateKnife(knife.id, { onLoan: next });
      setKnife(updated);
      toast(next ? "Marked as on loan" : "Marked as returned", {
        icon: <Handshake className="h-4 w-4" />,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setTogglingLoan(false);
    }
  }

  useEffect(() => {
    api
      .getKnife(id)
      .then(async (k) => {
        setKnife(k);
        const hasAbrasives = k.sessions.some((s) => s.abrasives?.length);
        const tasks: Promise<unknown>[] = [];
        if (k.ownerId) {
          tasks.push(
            api
              .getOwner(k.ownerId)
              .then(setOwner)
              .catch(() => {
                // owner may have been deleted directly via files; ignore
              }),
          );
        }
        if (hasAbrasives) {
          tasks.push(api.listAbrasives().then(setAbrasives).catch(() => {}));
        }
        await Promise.all(tasks);
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
        <Photo
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
        <h1 className="flex flex-wrap items-center gap-3 text-4xl font-semibold tracking-tight text-brass">
          <PocketKnife className="h-8 w-8" />
          {knife.name}
          {knife.backlog && (
            <Link
              href="/backlog"
              aria-label="In backlog"
              title="In backlog"
              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-brass/40 bg-brass/10 text-brass hover:bg-brass/20"
            >
              <Inbox className="h-3 w-3" />
            </Link>
          )}
          {knife.onLoan && (
            <span
              aria-label="On loan"
              title="On loan — here but not mine"
              className="inline-flex items-center gap-1 rounded-md border border-brass/40 bg-brass/10 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-brass"
            >
              <Handshake className="h-3 w-3" />
              On loan
            </span>
          )}
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
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="xs"
            onClick={toggleBacklog}
            disabled={toggling}
          >
            <Inbox />
            {knife.backlog ? "Remove from backlog" : "Add to backlog"}
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={toggleOnLoan}
            disabled={togglingLoan}
          >
            <Handshake />
            {knife.onLoan ? "Mark as returned" : "Mark as on loan"}
          </Button>
        </div>
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
          <PropertyRow label="Steel">
            {knife.steel ? (
              <Link
                href={`/steels/${slugify(knife.steel)}`}
                className="inline-flex items-center gap-1.5 hover:underline"
              >
                <Atom className="h-3.5 w-3.5" />
                {knife.steel}
              </Link>
            ) : null}
          </PropertyRow>
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
                <Photo
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
                {s.abrasives?.length ? (
                  <SessionAbrasives abrasives={s.abrasives} abrasiveById={abrasiveById} />
                ) : null}
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
          <Markdown>{knife.notes}</Markdown>
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

function SessionAbrasives({
  abrasives,
  abrasiveById,
}: {
  abrasives: string[];
  abrasiveById: Record<string, Abrasive>;
}) {
  return (
    <div
      className="mt-1 flex flex-wrap items-center gap-1 text-xs"
      title="Abrasive progression"
    >
      <Gem className="h-3 w-3 shrink-0 text-muted-foreground/60" />
      {abrasives.map((aid, i) => {
        const a = abrasiveById[aid];
        return (
          <span key={`${aid}-${i}`} className="inline-flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground/40">→</span>}
            {a ? (
              <Link
                href={`/abrasives/${aid}`}
                className="inline-flex items-center rounded-md border border-border px-1.5 py-0.5 font-mono text-muted-foreground hover:text-foreground hover:underline"
                title={a.name}
              >
                {isStrop(a) ? a.compound.trim() || "STROP" : a.grit}
              </Link>
            ) : (
              <span
                className="inline-flex items-center rounded-md border border-border px-1.5 py-0.5 font-mono text-muted-foreground/60 line-through"
                title="Unknown abrasive"
              >
                {aid}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
