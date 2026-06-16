"use client";

import { ArrowLeft, Atom, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { ALL_COLUMNS, KnivesView } from "@/components/knives-view";
import { ListViewToggle, useViewMode } from "@/components/list-view-toggle";
import { SteelForm } from "@/components/steel-form";
import {
  TableColumnsToggle,
  useTableColumns,
} from "@/components/table-columns-toggle";
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
import { findSteel } from "@/lib/steels";
import type { Knife, Owner, Steel, SteelInput } from "@/lib/storage/types";

export default function SteelDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [knives, setKnives] = useState<Knife[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [steels, setSteels] = useState<Steel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useViewMode();
  const columns = useTableColumns({
    routeKey: "steels",
    available: ALL_COLUMNS,
    pageHidden: ["steel"],
  });

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

  async function handleSave(values: SteelInput) {
    if (!record) return;
    try {
      const updated = await api.updateSteel(record.id, values);
      setSteels((curr) => curr.map((s) => (s.id === updated.id ? updated : s)));
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
      await api.deleteSteel(record.id);
      toast.success(`Deleted ${record.name}`);
      router.push("/steels");
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-3 text-4xl font-semibold tracking-tight text-brass">
            <Atom className="h-8 w-8" />
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
                            Removes the steel record. Cannot be undone.
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
                        this steel — change the knives first.
                      </TooltipContent>
                    </Tooltip>
                  )}
                </>
              ) : (
                <Link
                  href={`/steels/new?name=${encodeURIComponent(entry.displayName)}`}
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
          <SteelForm
            defaultValues={{
              name: record.name,
              composition: record.composition ?? "",
              notes: record.notes ?? "",
            }}
            submitLabel="Save changes"
            onSubmit={handleSave}
            onCancel={() => setEditing(false)}
            pinnedSlug={record.id}
            knivesUsing={entry.count}
          />
        </section>
      ) : (
        <>
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
                hint={
                  record
                    ? "Use Edit to add care tips, sharpening behaviour, or anything else worth keeping next to this steel."
                    : "Use Add notes to create a steel record with care tips, sharpening behaviour, or anything else worth keeping next to this steel."
                }
              />
            )}
          </section>
        </>
      )}

      {knivesOfSteel.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-sm uppercase tracking-wider text-foreground/80">
              Knives with this steel
            </h2>
            <ListViewToggle mode={viewMode} onModeChange={setViewMode} />
            {viewMode === "table" && <TableColumnsToggle control={columns} />}
          </div>
          <KnivesView
            knives={knivesOfSteel}
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
