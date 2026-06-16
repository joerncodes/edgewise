"use client";

import { ArrowLeft, Pencil, Trash2, User } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ALL_COLUMNS, KnivesView } from "@/components/knives-view";
import { ListViewToggle, useViewMode } from "@/components/list-view-toggle";
import { OwnerForm } from "@/components/owner-form";
import {
  TableColumnsToggle,
  useTableColumns,
} from "@/components/table-columns-toggle";
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
import type { Knife, Owner, OwnerInput } from "@/lib/storage/types";

export default function OwnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [owner, setOwner] = useState<Owner | null>(null);
  const [knives, setKnives] = useState<Knife[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useViewMode();
  const columns = useTableColumns({
    routeKey: "owners",
    available: ALL_COLUMNS,
    pageHidden: ["owner"],
  });

  useEffect(() => {
    Promise.all([api.getOwner(id), api.listKnives()])
      .then(([o, k]) => {
        setOwner(o);
        setKnives(k.filter((knife) => knife.ownerId === id));
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  const now = useMemo(() => new Date(), []);

  async function handleSave(values: OwnerInput) {
    try {
      const updated = await api.updateOwner(id, values);
      setOwner(updated);
      setEditing(false);
      toast.success(`Saved ${updated.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await api.deleteOwner(id);
      toast.success(`Deleted ${owner?.name ?? id}`);
      router.push("/owners");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
      setDeleting(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!owner) return <p className="text-sm text-muted-foreground">Not found.</p>;

  const knivesCount = knives.length;
  const canDelete = knivesCount === 0;

  return (
    <div className="space-y-12">
      <header className="space-y-3">
        <Link
          href="/owners"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          <User className="h-3 w-3" />
          All owners
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-3 text-4xl font-semibold tracking-tight text-brass">
            <User className="h-8 w-8" />
            {owner.name}
          </h1>
          {!editing && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              {canDelete ? (
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
                      <AlertDialogTitle>Delete {owner.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        The owner record will be removed. Cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={deleting}
                      >
                        {deleting ? "Deleting…" : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                // Disabled buttons swallow pointer events, so a tooltip
                // attached to the Button itself never fires. Anchor on a
                // wrapping span instead.
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
                    Reassign or delete the {knivesCount}{" "}
                    {knivesCount === 1 ? "knife" : "knives"} first.
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </header>

      {editing ? (
        <section className="max-w-xl">
          <OwnerForm
            defaultValues={{
              name: owner.name,
              contact: owner.contact ?? "",
              notes: owner.notes ?? "",
            }}
            submitLabel="Save changes"
            onSubmit={handleSave}
            onCancel={() => setEditing(false)}
            pinnedSlug={owner.id}
          />
        </section>
      ) : (
        <>
          <section>
            <PropertyList>
              <PropertyRow label="Contact">{owner.contact}</PropertyRow>
              <PropertyRow label="Knives">
                <span className="font-mono">{knivesCount}</span>
              </PropertyRow>
            </PropertyList>
          </section>

          {owner.notes && (
            <section className="space-y-3">
              <SectionLabel>Notes</SectionLabel>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{owner.notes}</p>
            </section>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <SectionLabel>
                {knivesCount === 1 ? "1 knife" : `${knivesCount} knives`}
              </SectionLabel>
              {knivesCount > 0 && (
                <div className="flex items-center gap-2">
                  <ListViewToggle mode={viewMode} onModeChange={setViewMode} />
                  {viewMode === "table" && <TableColumnsToggle control={columns} />}
                </div>
              )}
            </div>
            {knivesCount === 0 ? (
              <p className="text-sm text-muted-foreground">No knives for this owner yet.</p>
            ) : (
              <KnivesView
                knives={knives}
                owners={[owner]}
                now={now}
                mode={viewMode}
                hideColumns={columns.hideColumns}
                gridClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              />
            )}
          </section>
        </>
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
