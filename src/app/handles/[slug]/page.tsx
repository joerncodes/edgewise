"use client";

import { ArrowLeft, Grip, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { HandleForm } from "@/components/handle-form";
import { ALL_COLUMNS, KnivesView } from "@/components/knives-view";
import { ListViewToggle, useViewMode } from "@/components/list-view-toggle";
import {
  TableColumnsToggle,
  useTableColumns,
} from "@/components/table-columns-toggle";
import { Markdown } from "@/components/markdown";
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
import { findHandle } from "@/lib/handles";
import type { Handle, HandleInput, Knife, Owner } from "@/lib/storage/types";

export default function HandleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [knives, setKnives] = useState<Knife[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [handles, setHandles] = useState<Handle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useViewMode();
  const columns = useTableColumns({ routeKey: "handles", available: ALL_COLUMNS });

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

  async function handleSave(values: HandleInput) {
    if (!record) return;
    try {
      const updated = await api.updateHandle(record.id, values);
      setHandles((curr) => curr.map((h) => (h.id === updated.id ? updated : h)));
      setEditing(false);
      toast.success(`Saved ${updated.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  }

  async function handleDelete() {
    if (!record || deleting) return;
    setDeleting(true);
    try {
      await api.deleteHandle(record.id);
      toast.success(`Deleted ${record.name}`);
      router.push("/handles");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
      setDeleting(false);
    }
  }

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-3 text-4xl font-semibold tracking-tight text-brass">
            <Grip className="h-8 w-8" />
            {entry.displayName}
          </h1>
          {!editing && (
            <div className="flex items-center gap-2">
              {record ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  {entry.count === 0 ? (
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
                          <AlertDialogTitle>Delete {record.name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Removes the handle record. Cannot be undone.
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
                        {entry.count}{" "}
                        {entry.count === 1 ? "knife references" : "knives reference"}{" "}
                        this handle — change the knives first.
                      </TooltipContent>
                    </Tooltip>
                  )}
                </>
              ) : (
                <Link
                  href={`/handles/new?name=${encodeURIComponent(entry.displayName)}`}
                >
                  <Button variant="outline" size="sm">
                    <Plus className="h-3.5 w-3.5" />
                    Add notes
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono">{entry.count}</span>{" "}
          {entry.count === 1 ? "knife" : "knives"}
        </p>
      </header>

      {editing && record ? (
        <section className="max-w-xl">
          <HandleForm
            defaultValues={{ name: record.name, notes: record.notes ?? "" }}
            submitLabel="Save changes"
            onSubmit={handleSave}
            onCancel={() => setEditing(false)}
            pinnedSlug={record.id}
            knivesUsing={entry.count}
          />
        </section>
      ) : (
      <section className="space-y-3">
        {record?.notes ? (
          <Markdown>{record.notes}</Markdown>
        ) : (
          <EmptyState
            title="No notes yet"
            hint={
              record
                ? "Use Edit to describe the material — grip, water tolerance, sharpening-relevant quirks."
                : "Use Add notes to create a handle record describing the material — grip, water tolerance, sharpening-relevant quirks."
            }
          />
        )}
      </section>
      )}

      {knivesWithHandle.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-sm uppercase tracking-wider text-foreground/80">
              Knives with this handle
            </h2>
            <ListViewToggle mode={viewMode} onModeChange={setViewMode} />
            {viewMode === "table" && <TableColumnsToggle control={columns} />}
          </div>
          <KnivesView
            knives={knivesWithHandle}
            owners={owners}
            now={now}
            mode={viewMode}
            hideColumns={columns.hideColumns}
            gridClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          />
        </section>
      )}
    </div>
  );
}
