"use client";

import {
  ArrowLeft,
  Atom,
  Factory,
  Gem,
  Grip,
  Handshake,
  Inbox,
  Pencil,
  Plus,
  PocketKnife,
  Tags,
  Trash2,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ImageGallery } from "@/components/image-gallery";
import { KnifeChat } from "@/components/knife-chat";
import { KnifeForm } from "@/components/knife-form";
import { Photo } from "@/components/photo";
import { SessionForm } from "@/components/session-form";
import { Markdown } from "@/components/markdown";
import { PropertyList, PropertyRow } from "@/components/property-row";
import { RatingSparkline } from "@/components/rating-sparkline";
import { Stars } from "@/components/stars";
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
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import { slugify } from "@/lib/storage/ids";
import { isStrop } from "@/lib/abrasives";
import type {
  Abrasive,
  Knife,
  KnifeInput,
  Owner,
  SharpeningSession,
} from "@/lib/storage/types";

const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "short" });

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return dateFmt.format(new Date(y, m - 1, d));
}

export default function KnifeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [knife, setKnife] = useState<Knife | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [abrasives, setAbrasives] = useState<Abrasive[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [togglingLoan, setTogglingLoan] = useState(false);
  const [editing, setEditing] = useState(false);
  const [allOwners, setAllOwners] = useState<Owner[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [addingSession, setAddingSession] = useState(false);
  const [editingSessionDate, setEditingSessionDate] = useState<string | null>(null);
  const [deletingSessionDate, setDeletingSessionDate] = useState<string | null>(null);
  const [deletingSession, setDeletingSession] = useState(false);

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

  async function enterEdit() {
    if (allOwners.length === 0) {
      try {
        const list = await api.listOwners();
        setAllOwners(list);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load owners",
        );
        return;
      }
    }
    setEditing(true);
  }

  async function handleSave(values: KnifeInput) {
    if (!knife) return;
    try {
      const updated = await api.updateKnife(knife.id, values);
      setKnife(updated);
      if (updated.ownerId !== owner?.id) {
        api
          .getOwner(updated.ownerId)
          .then(setOwner)
          .catch(() => {
            /* owner may have been deleted; just clear */
          });
      }
      setEditing(false);
      toast.success(`Saved ${updated.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  }

  async function handleDelete() {
    if (!knife || deleting) return;
    setDeleting(true);
    try {
      await api.deleteKnife(knife.id);
      toast.success(`Deleted ${knife.name}`);
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
      setDeleting(false);
    }
  }

  async function handleImageUpload(file: File): Promise<Knife["images"]> {
    if (!knife) return [];
    const updated = await api.uploadKnifeImage(knife.id, file);
    setKnife(updated);
    return updated.images;
  }

  async function handleSaveImages(
    next: Knife["images"],
  ): Promise<Knife["images"]> {
    if (!knife) return [];
    const updated = await api.updateKnife(knife.id, { images: next });
    setKnife(updated);
    return updated.images;
  }

  async function handleImageDelete(filename: string): Promise<Knife["images"]> {
    if (!knife) return [];
    const updated = await api.deleteImage(knife.id, filename);
    setKnife(updated);
    return updated.images;
  }

  function handleSessionSaved(updated: Knife) {
    setKnife(updated);
    setAddingSession(false);
    setEditingSessionDate(null);
  }

  async function handleSessionDelete(date: string) {
    if (!knife || deletingSession) return;
    setDeletingSession(true);
    try {
      const updated = await api.deleteSession(knife.id, date);
      setKnife(updated);
      setDeletingSessionDate(null);
      toast.success(`Deleted session from ${date}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete session");
    } finally {
      setDeletingSession(false);
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
        // Always fetch — the session form needs them too, not just the
        // existing session abrasive chips.
        tasks.push(api.listAbrasives().then(setAbrasives).catch(() => {}));
        await Promise.all(tasks);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  // Re-pull the knife after a chat write tool succeeds. Chat tools
  // mutate via the API, but this page holds the knife in client
  // state — router.refresh() doesn't reach it, so the parent has
  // to refetch.
  async function refetchKnife() {
    try {
      const k = await api.getKnife(id);
      setKnife(k);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reload");
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!knife) return <p className="text-sm text-muted-foreground">Not found.</p>;

  const sortedSessions = [...knife.sessions].sort((a, b) => b.date.localeCompare(a.date));
  const last = sortedSessions[0];
  const hero = knife.images[0];

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
        <RatingSparkline sessions={knife.sessions} className="w-full max-w-sm" />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="xs"
            onClick={toggleBacklog}
            disabled={toggling || editing}
          >
            <Inbox />
            {knife.backlog ? "Remove from backlog" : "Add to backlog"}
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={toggleOnLoan}
            disabled={togglingLoan || editing}
          >
            <Handshake />
            {knife.onLoan ? "Mark as returned" : "Mark as on loan"}
          </Button>
          {!editing && (
            <>
              <KnifeChat
                knifeId={knife.id}
                knifeName={knife.name}
                onWrite={refetchKnife}
              />
              <Button variant="outline" size="xs" onClick={enterEdit}>
                <Pencil />
                Edit
              </Button>
              <AlertDialog
                onOpenChange={(open) => {
                  if (!open) setDeleteConfirm("");
                }}
              >
                <AlertDialogTrigger
                  render={
                    <Button variant="destructive" size="xs">
                      <Trash2 />
                      Delete
                    </Button>
                  }
                />
                <DeleteKnifeDialog
                  knife={knife}
                  deleting={deleting}
                  confirmValue={deleteConfirm}
                  onConfirmChange={setDeleteConfirm}
                  onDelete={handleDelete}
                />
              </AlertDialog>
            </>
          )}
        </div>
      </header>

      {editing ? (
        <section className="max-w-2xl">
          <KnifeForm
            owners={allOwners}
            defaultValues={{
              name: knife.name,
              ownerId: knife.ownerId,
              manufacturer: knife.manufacturer ?? "",
              type: knife.type ?? "",
              subtype: knife.subtype ?? "",
              steel: knife.steel ?? "",
              handle: knife.handle ?? "",
              notes: knife.notes ?? "",
              backlog: knife.backlog ?? false,
              onLoan: knife.onLoan ?? false,
              sessions: knife.sessions,
            }}
            submitLabel="Save changes"
            onSubmit={handleSave}
            onCancel={() => setEditing(false)}
            pinnedSlug={knife.id}
          />
        </section>
      ) : (
        <DetailBody
          knife={knife}
          owner={owner}
          last={last}
          sortedSessions={sortedSessions}
          abrasives={abrasives}
          abrasiveById={abrasiveById}
          onImageUpload={handleImageUpload}
          onSaveImages={handleSaveImages}
          onImageDelete={handleImageDelete}
          addingSession={addingSession}
          editingSessionDate={editingSessionDate}
          deletingSessionDate={deletingSessionDate}
          deletingSession={deletingSession}
          onAddSession={() => {
            setEditingSessionDate(null);
            setAddingSession(true);
          }}
          onEditSession={(date) => {
            setAddingSession(false);
            setEditingSessionDate(date);
          }}
          onDeleteSession={(date) => setDeletingSessionDate(date)}
          onCancelSessionEdit={() => {
            setAddingSession(false);
            setEditingSessionDate(null);
          }}
          onSessionSaved={handleSessionSaved}
          onConfirmDeleteSession={handleSessionDelete}
          onCloseDeleteSession={() => setDeletingSessionDate(null)}
        />
      )}
    </div>
  );
}

function DetailBody({
  knife,
  owner,
  last,
  sortedSessions,
  abrasives,
  abrasiveById,
  onImageUpload,
  onSaveImages,
  onImageDelete,
  addingSession,
  editingSessionDate,
  deletingSessionDate,
  deletingSession,
  onAddSession,
  onEditSession,
  onDeleteSession,
  onCancelSessionEdit,
  onSessionSaved,
  onConfirmDeleteSession,
  onCloseDeleteSession,
}: {
  knife: Knife;
  owner: Owner | null;
  last: SharpeningSession | undefined;
  sortedSessions: SharpeningSession[];
  abrasives: Abrasive[];
  abrasiveById: Record<string, Abrasive>;
  onImageUpload: (file: File) => Promise<Knife["images"]>;
  onSaveImages: (images: Knife["images"]) => Promise<Knife["images"]>;
  onImageDelete: (filename: string) => Promise<Knife["images"]>;
  addingSession: boolean;
  editingSessionDate: string | null;
  deletingSessionDate: string | null;
  deletingSession: boolean;
  onAddSession: () => void;
  onEditSession: (date: string) => void;
  onDeleteSession: (date: string) => void;
  onCancelSessionEdit: () => void;
  onSessionSaved: (knife: Knife) => void;
  onConfirmDeleteSession: (date: string) => void;
  onCloseDeleteSession: () => void;
}) {
  return (
    <>
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
              <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
                <Link
                  href={`/types/${slugify(knife.type)}`}
                  className="inline-flex items-center gap-1.5 hover:underline"
                >
                  <Tags className="h-3.5 w-3.5" />
                  {knife.type}
                </Link>
                {knife.subtype && (
                  <>
                    <span className="text-muted-foreground/60">—</span>
                    <Link
                      href={`/types/${slugify(knife.type)}?subtype=${encodeURIComponent(knife.subtype)}`}
                      className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {knife.subtype}
                    </Link>
                  </>
                )}
              </span>
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
          <PropertyRow label="Handle">
            {knife.handle ? (
              <Link
                href={`/handles/${slugify(knife.handle)}`}
                className="inline-flex items-center gap-1.5 hover:underline"
              >
                <Grip className="h-3.5 w-3.5" />
                {knife.handle}
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

      <ImageGallery
        images={knife.images}
        imageUrl={(filename, size) => api.imageUrl(knife.id, filename, size)}
        alt={knife.name}
        onUpload={onImageUpload}
        onSaveImages={onSaveImages}
        onDelete={onImageDelete}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <SectionLabel>
            {knife.sessions.length === 1
              ? "1 sharpening"
              : `${knife.sessions.length} sharpenings`}
          </SectionLabel>
          {!addingSession && editingSessionDate === null && (
            <Button size="sm" onClick={onAddSession}>
              <Plus className="h-3.5 w-3.5" />
              Add session
            </Button>
          )}
        </div>
        {addingSession && (
          <SessionForm
            knifeId={knife.id}
            abrasives={abrasives}
            existingSessions={knife.sessions}
            onSaved={onSessionSaved}
            onCancel={onCancelSessionEdit}
          />
        )}
        {sortedSessions.length === 0 ? (
          !addingSession && (
            <p className="text-sm text-muted-foreground">None yet.</p>
          )
        ) : (
          <ol className="relative space-y-5 border-l border-border/60 pl-6">
            {sortedSessions.map((s) => {
              const isEditing = editingSessionDate === s.date;
              return (
                <li key={s.date} className="relative">
                  <span className="absolute -left-[27px] top-2 h-2 w-2 rounded-full bg-border" />
                  {isEditing ? (
                    <SessionForm
                      knifeId={knife.id}
                      abrasives={abrasives}
                      existingSessions={knife.sessions}
                      initial={s}
                      onSaved={onSessionSaved}
                      onCancel={onCancelSessionEdit}
                    />
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                            {formatDate(s.date)}
                          </div>
                          <div className="mt-0.5 flex items-center gap-3">
                            <span className="text-2xl font-semibold tracking-tight font-mono">
                              {s.angle}°
                            </span>
                            {s.rating !== undefined && (
                              <Stars value={s.rating} size="md" />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit session from ${s.date}`}
                            onClick={() => onEditSession(s.date)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Delete session from ${s.date}`}
                            onClick={() => onDeleteSession(s.date)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {s.abrasives?.length ? (
                        <SessionAbrasives
                          abrasives={s.abrasives}
                          abrasiveById={abrasiveById}
                        />
                      ) : null}
                      {s.notes && (
                        <p className="mt-1 text-sm text-muted-foreground">{s.notes}</p>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
      <AlertDialog
        open={deletingSessionDate !== null}
        onOpenChange={(open) => {
          if (!open) onCloseDeleteSession();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete session from {deletingSessionDate}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Removes this single sharpening event. Cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletingSession}
              onClick={() =>
                deletingSessionDate && onConfirmDeleteSession(deletingSessionDate)
              }
            >
              {deletingSession ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {knife.notes && (
        <section className="space-y-3">
          <SectionLabel>Notes</SectionLabel>
          <Markdown>{knife.notes}</Markdown>
        </section>
      )}
    </>
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

function DeleteKnifeDialog({
  knife,
  deleting,
  confirmValue,
  onConfirmChange,
  onDelete,
}: {
  knife: Knife;
  deleting: boolean;
  confirmValue: string;
  onConfirmChange: (v: string) => void;
  onDelete: () => void;
}) {
  const sessions = knife.sessions.length;
  const photos = knife.images.length;
  // Typed confirmation is required when there's anything non-trivial
  // attached. A stray Enter shouldn't blow away months of records.
  const requiresTyped = sessions > 0 || photos > 0;
  const canDelete = !requiresTyped || confirmValue.trim() === "delete";

  const cascade: string[] = [];
  if (sessions > 0) cascade.push(`${sessions} ${sessions === 1 ? "session" : "sessions"}`);
  if (photos > 0) cascade.push(`${photos} ${photos === 1 ? "photo" : "photos"}`);

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete {knife.name}?</AlertDialogTitle>
        <AlertDialogDescription>
          {cascade.length > 0
            ? `Deletes the knife and its ${cascade.join(" + ")} on disk.`
            : "Deletes the knife record."}{" "}
          Cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      {requiresTyped && (
        <div className="space-y-1.5">
          <label
            htmlFor="delete-confirm"
            className="text-xs text-muted-foreground"
          >
            Type <code className="font-mono">delete</code> to confirm.
          </label>
          <Input
            id="delete-confirm"
            value={confirmValue}
            onChange={(e) => onConfirmChange(e.target.value)}
            placeholder="delete"
            autoComplete="off"
          />
        </div>
      )}
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          onClick={onDelete}
          disabled={deleting || !canDelete}
        >
          {deleting ? "Deleting…" : "Delete"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}
