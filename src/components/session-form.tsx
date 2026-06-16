"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { StarsInput } from "@/components/stars-input";
import {
  Form,
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm, FormProvider } from "react-hook-form";
import { api } from "@/lib/api-client";
import { isStrop } from "@/lib/abrasives";
import { cn } from "@/lib/utils";
import type { Abrasive, Knife, SharpeningSession } from "@/lib/storage/types";

function todayIso(): string {
  // Local-time YYYY-MM-DD; matches what the API expects.
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function abrasiveLabel(a: Abrasive): string {
  if (isStrop(a)) {
    const cmp = a.compound.trim();
    return cmp ? `${a.name} (${cmp})` : a.name;
  }
  return `${a.name} · ${a.grit}`;
}

export interface SessionFormProps {
  knifeId: string;
  abrasives: Abrasive[];
  existingSessions: SharpeningSession[];
  // Provided when editing an existing session; absent when adding.
  initial?: SharpeningSession;
  onSaved: (knife: Knife) => void;
  onCancel: () => void;
}

export function SessionForm({
  knifeId,
  abrasives,
  existingSessions,
  initial,
  onSaved,
  onCancel,
}: SessionFormProps) {
  const isEdit = Boolean(initial);
  // Auto-fill angle: in create mode, default to the most-recent
  // session's angle if any. Re-profiling is rare.
  const lastAngle = useMemo(
    () =>
      [...existingSessions].sort((a, b) => b.date.localeCompare(a.date))[0]
        ?.angle ?? 20,
    [existingSessions],
  );

  const form = useForm<{
    date: string;
    angle: number;
    notes: string;
    rating: number | undefined;
    abrasives: string[];
  }>({
    defaultValues: {
      date: initial?.date ?? todayIso(),
      angle: initial?.angle ?? lastAngle,
      notes: initial?.notes ?? "",
      rating: initial?.rating,
      abrasives: initial?.abrasives ?? [],
    },
  });
  const watchedDate = form.watch("date");
  const watchedAbrasives = form.watch("abrasives");
  const watchedRating = form.watch("rating");

  const [submitting, setSubmitting] = useState(false);

  const abrasivesById = useMemo(
    () => Object.fromEntries(abrasives.map((a) => [a.id, a])),
    [abrasives],
  );
  const availableAbrasives = useMemo(
    () =>
      [...abrasives]
        .filter((a) => !watchedAbrasives.includes(a.id))
        .sort((a, b) => a.grit - b.grit || a.name.localeCompare(b.name)),
    [abrasives, watchedAbrasives],
  );

  // Date collision: only on create, and only against *other* sessions.
  const collision = useMemo(() => {
    if (isEdit) return null;
    return existingSessions.find((s) => s.date === watchedDate) ?? null;
  }, [existingSessions, watchedDate, isEdit]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleAddAbrasive(id: string) {
    if (!id || watchedAbrasives.includes(id)) return;
    form.setValue("abrasives", [...watchedAbrasives, id], {
      shouldDirty: true,
    });
  }

  function handleRemoveAbrasive(id: string) {
    form.setValue(
      "abrasives",
      watchedAbrasives.filter((x) => x !== id),
      { shouldDirty: true },
    );
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = [...watchedAbrasives];
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    form.setValue("abrasives", arrayMove(ids, oldIndex, newIndex), {
      shouldDirty: true,
    });
  }

  async function onSubmit(values: {
    date: string;
    angle: number;
    notes: string;
    rating: number | undefined;
    abrasives: string[];
  }) {
    if (collision) return;
    setSubmitting(true);
    try {
      const payload: SharpeningSession = {
        date: values.date,
        angle: Number(values.angle),
        notes: values.notes,
        rating: values.rating,
        abrasives: values.abrasives.length ? values.abrasives : undefined,
      };
      const updated = isEdit
        ? await api.editSession(knifeId, initial!.date, {
            angle: payload.angle,
            notes: payload.notes,
            rating: payload.rating,
            abrasives: payload.abrasives,
          })
        : await api.addSession(knifeId, payload);
      onSaved(updated);
      toast.success(isEdit ? "Session updated" : "Session added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save session");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5 rounded-md border border-border bg-card/40 p-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...form.register("date", { required: true })}
                  disabled={isEdit}
                />
              </FormControl>
              {isEdit ? (
                <FormDescription>
                  The date is the session's primary key — delete and re-add to
                  change it.
                </FormDescription>
              ) : collision ? (
                <FormDescription className="text-destructive">
                  A session already exists on {watchedDate} — edit it instead.
                </FormDescription>
              ) : (
                <FormDescription>Defaults to today.</FormDescription>
              )}
              <FormMessage />
            </FormItem>

            <FormItem>
              <FormLabel>Angle (° per side)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={45}
                  step={0.5}
                  {...form.register("angle", {
                    required: true,
                    valueAsNumber: true,
                    min: 1,
                    max: 45,
                  })}
                />
              </FormControl>
              <FormDescription>
                1–45. Inclusive angle = {Number(form.watch("angle")) * 2}°.
              </FormDescription>
              <FormMessage />
            </FormItem>
          </div>

          <FormItem>
            <FormLabel>Abrasive progression</FormLabel>
            <FormControl>
              <div className="space-y-2">
                <Select
                  // Reset on every change so the select itself doesn't
                  // hold the chosen value — it's a "+ add" button only.
                  value=""
                  onValueChange={(v) =>
                    typeof v === "string" && handleAddAbrasive(v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="+ add abrasive…" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAbrasives.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        {abrasives.length === 0
                          ? "No abrasives in the library yet."
                          : "All abrasives already in the progression."}
                      </div>
                    ) : (
                      availableAbrasives.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {abrasiveLabel(a)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {watchedAbrasives.length > 0 && (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={watchedAbrasives}
                      strategy={horizontalListSortingStrategy}
                    >
                      <ul className="flex flex-wrap items-center gap-2">
                        {watchedAbrasives.map((id, i) => (
                          <li
                            key={id}
                            className="flex items-center gap-1 text-xs text-muted-foreground"
                          >
                            {i > 0 && (
                              <span className="text-muted-foreground/40">→</span>
                            )}
                            <ProgressionChip
                              id={id}
                              label={
                                abrasivesById[id]
                                  ? abrasiveLabel(abrasivesById[id])
                                  : id
                              }
                              missing={!abrasivesById[id]}
                              onRemove={() => handleRemoveAbrasive(id)}
                            />
                          </li>
                        ))}
                      </ul>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </FormControl>
            <FormDescription>
              Coarse → fine. Drag chips to reorder.
            </FormDescription>
          </FormItem>

          <FormItem>
            <FormLabel>Rating</FormLabel>
            <FormControl>
              <StarsInput
                value={watchedRating}
                onChange={(v) =>
                  form.setValue("rating", v, { shouldDirty: true })
                }
              />
            </FormControl>
            <FormDescription>How did it feel? Optional.</FormDescription>
          </FormItem>

          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <Textarea
                rows={4}
                placeholder="What was done, what dished, what bit, what surprised you."
                className="font-mono text-sm"
                {...form.register("notes")}
              />
            </FormControl>
          </FormItem>

          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || Boolean(collision)}>
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Add session"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}

function ProgressionChip({
  id,
  label,
  missing,
  onRemove,
}: {
  id: string;
  label: string;
  missing?: boolean;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  return (
    <span
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-xs",
        missing && "border-destructive/40 text-destructive line-through",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${label}`}
        className="cursor-grab text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="text-muted-foreground/60 hover:text-destructive"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
