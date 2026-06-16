"use client";

import { ArrowLeft, Gem, Pencil, PocketKnife, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AbrasiveForm } from "@/components/abrasive-form";
import { EmptyState } from "@/components/empty-state";
import { ImageGallery } from "@/components/image-gallery";
import { Photo } from "@/components/photo";
import { Markdown } from "@/components/markdown";
import { PropertyList, PropertyRow } from "@/components/property-row";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/api-client";
import { isStrop, usagesForAbrasive } from "@/lib/abrasives";
import { cn } from "@/lib/utils";
import type { Abrasive, AbrasiveInput, Knife } from "@/lib/storage/types";

const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "short" });

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return dateFmt.format(new Date(y, m - 1, d));
}

export default function AbrasiveDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [abrasive, setAbrasive] = useState<Abrasive | null>(null);
  const [knives, setKnives] = useState<Knife[]>([]);
  const [abrasives, setAbrasives] = useState<Abrasive[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
  const strop = isStrop(abrasive);
  const abrasiveId = abrasive.id;

  async function handleImageUpload(file: File) {
    const updated = await api.uploadAbrasiveImage(abrasiveId, file);
    setAbrasive(updated);
    return updated.images;
  }

  async function handleSaveImages(next: Abrasive["images"]) {
    const updated = await api.updateAbrasive(abrasiveId, { images: next });
    setAbrasive(updated);
    return updated.images;
  }

  async function handleImageDelete(filename: string) {
    const updated = await api.deleteAbrasiveImage(abrasiveId, filename);
    setAbrasive(updated);
    return updated.images;
  }

  async function handleSave(values: AbrasiveInput) {
    try {
      const updated = await api.updateAbrasive(abrasiveId, values);
      setAbrasive(updated);
      setEditing(false);
      toast.success(`Saved ${updated.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  }

  async function handleDelete() {
    if (deleting) return;
    const name = abrasive!.name;
    setDeleting(true);
    try {
      await api.deleteAbrasive(abrasiveId);
      toast.success(`Deleted ${name}`);
      router.push("/abrasives");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
      setDeleting(false);
    }
  }

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-3 text-4xl font-semibold tracking-tight text-brass">
            <Gem className="h-8 w-8" />
            {abrasive.name}
          </h1>
          {!editing && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              {usages.length === 0 ? (
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    }
                  />
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {abrasive.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Removes the abrasive record and any images on disk.
                        Cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        disabled={deleting}
                        onClick={handleDelete}
                      >
                        {deleting ? "Deleting…" : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span tabIndex={0} className="inline-block">
                        <Button variant="destructive" size="sm" disabled>
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </span>
                    }
                  />
                  <TooltipContent>
                    Referenced by {usages.length}{" "}
                    {usages.length === 1 ? "session" : "sessions"} — remove from
                    those sessions first.
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </div>
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

      {editing ? (
        <section className="max-w-xl">
          <AbrasiveForm
            defaultValues={{
              name: abrasive.name,
              grit: abrasive.grit,
              type: abrasive.type ?? "",
              compound: abrasive.compound ?? "",
              substrate: abrasive.substrate ?? "",
              notes: abrasive.notes ?? "",
            }}
            submitLabel="Save changes"
            onSubmit={handleSave}
            onCancel={() => setEditing(false)}
            pinnedSlug={abrasive.id}
          />
        </section>
      ) : (
        <>
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
                hint="Use Edit to add soak time, dishing observations, or anything worth keeping next to the abrasive."
              />
            )}
          </section>
        </>
      )}

      <ImageGallery
        images={abrasive.images}
        imageUrl={(filename, size) =>
          api.abrasiveImageUrl(abrasive.id, filename, size)
        }
        alt={abrasive.name}
        onUpload={handleImageUpload}
        onSaveImages={handleSaveImages}
        onDelete={handleImageDelete}
      />

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
