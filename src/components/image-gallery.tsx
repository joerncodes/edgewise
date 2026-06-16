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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Star, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ImageRef } from "@/lib/storage/types";

const CAPTION_DEBOUNCE_MS = 500;

export interface ImageGalleryProps {
  images: ImageRef[];
  imageUrl: (filename: string, size?: "thumb") => string;
  alt: string;
  // Multipart POST. Returns the new full images[] (the API returns
  // the whole entity; the parent extracts).
  onUpload: (file: File) => Promise<ImageRef[]>;
  // PATCH with the full images[] — used by reorder and caption edits.
  onSaveImages: (next: ImageRef[]) => Promise<ImageRef[]>;
  // DELETE filename → returns the new full images[].
  onDelete: (filename: string) => Promise<ImageRef[]>;
}

export function ImageGallery({
  images,
  imageUrl,
  alt,
  onUpload,
  onSaveImages,
  onDelete,
}: ImageGalleryProps) {
  const [uploading, setUploading] = useState(false);
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Local mirror of captions so typing is responsive; the actual
  // PATCH is debounced. When `images` updates from the server, the
  // captions follow.
  const [captionDraft, setCaptionDraft] = useState<Record<string, string>>({});
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    setCaptionDraft(
      Object.fromEntries(images.map((img) => [img.filename, img.caption ?? ""])),
    );
  }, [images]);

  // Clipboard paste: any image on the page-level clipboard becomes an
  // upload. Ignore paste events whose target is an editable element so
  // pasting into a caption input doesn't trigger an upload too.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) {
            void handleFiles([f]);
            e.preventDefault();
            break;
          }
        }
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // handleFiles is stable via closure; capturing it as a dep would
    // need a useCallback round-trip — fine to leave the ref-style.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setUploading(true);
      try {
        // Multiple-file drop: upload sequentially so each gets a
        // distinct insertion order on the server side.
        for (const f of files) {
          await onUpload(f);
        }
        toast.success(
          files.length === 1 ? "Photo uploaded" : `${files.length} photos uploaded`,
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to upload");
      } finally {
        setUploading(false);
      }
    },
    [onUpload],
  );

  function captureFiles(list: FileList | null): File[] {
    if (!list) return [];
    return Array.from(list).filter((f) => f.type.startsWith("image/"));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    void handleFiles(captureFiles(e.dataTransfer.files));
  }

  function handleCaptionChange(filename: string, next: string) {
    setCaptionDraft((d) => ({ ...d, [filename]: next }));
    const timer = debounceRef.current[filename];
    if (timer) clearTimeout(timer);
    debounceRef.current[filename] = setTimeout(() => {
      const updated = images.map((img) =>
        img.filename === filename ? { ...img, caption: next } : img,
      );
      onSaveImages(updated).catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to save caption");
      });
    }, CAPTION_DEBOUNCE_MS);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const order = images.map((img) => img.filename);
    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(images, oldIndex, newIndex);
    onSaveImages(next).catch((err) => {
      toast.error(err instanceof Error ? err.message : "Failed to reorder");
    });
  }

  async function confirmDelete() {
    if (!deletingFilename || deleting) return;
    setDeleting(true);
    try {
      await onDelete(deletingFilename);
      toast.success("Photo deleted");
      setDeletingFilename(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  const empty = images.length === 0;

  return (
    <section
      onDragOver={(e) => {
        e.preventDefault();
        if (!dragOver) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        "relative space-y-3 rounded-md transition-colors",
        dragOver && "outline outline-2 outline-brass/60 outline-offset-4",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {empty ? "Photos" : images.length === 1 ? "1 photo" : `${images.length} photos`}
        </h2>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              void handleFiles(captureFiles(e.target.files));
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </div>

      {empty ? (
        <p className="text-sm text-muted-foreground">
          Drop, paste, or click <em>Upload</em>. JPEG / PNG / WebP up to 10 MB.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Drag to reorder. The first photo is the cover — it shows on the
            homepage hero, cards, and list thumbnails. Drop / paste images here
            to upload more.
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={images.map((img) => img.filename)}
              strategy={rectSortingStrategy}
            >
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((img, i) => (
                  <ImageTile
                    key={img.filename}
                    image={img}
                    src={imageUrl(img.filename, "thumb")}
                    alt={img.caption || alt}
                    isCover={i === 0}
                    caption={captionDraft[img.filename] ?? img.caption ?? ""}
                    onCaptionChange={(v) =>
                      handleCaptionChange(img.filename, v)
                    }
                    onDelete={() => setDeletingFilename(img.filename)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </>
      )}

      <AlertDialog
        open={deletingFilename !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingFilename(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
            <AlertDialogDescription>
              The file on disk goes too. Cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={confirmDelete}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function ImageTile({
  image,
  src,
  alt,
  isCover,
  caption,
  onCaptionChange,
  onDelete,
}: {
  image: ImageRef;
  src: string;
  alt: string;
  isCover: boolean;
  caption: string;
  onCaptionChange: (v: string) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: image.filename });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="group relative space-y-1.5 rounded-md border border-border bg-card/40 p-2"
    >
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded bg-muted/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        {isCover && (
          <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded bg-background/85 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-foreground backdrop-blur">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            Cover
          </span>
        )}
        <button
          type="button"
          aria-label={`Reorder ${image.filename}`}
          {...attributes}
          {...listeners}
          className="absolute right-1 top-1 inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-md border border-border bg-background/85 text-muted-foreground backdrop-blur hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label={`Delete ${image.filename}`}
          onClick={onDelete}
          className="absolute bottom-1 right-1 inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background/85 text-muted-foreground backdrop-blur hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <Input
        value={caption}
        onChange={(e) => onCaptionChange(e.target.value)}
        placeholder="Caption (optional)"
        className="h-7 text-xs"
      />
    </li>
  );
}
