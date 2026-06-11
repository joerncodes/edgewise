import { z } from "zod";

export const SharpeningSessionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  angle: z.number().positive().max(45),
  notes: z.string().optional().default(""),
  rating: z.number().min(1).max(5).optional(),
  // Abrasive IDs used in this session, in progression order
  // (coarse → fine: 400 → 1000 → 5000 → strop). Array order is
  // preserved and meaningful — don't sort it. Covers both stones
  // and strops; see docs/todos/strops.md.
  abrasives: z.array(z.string().min(1)).optional(),
});
export type SharpeningSession = z.infer<typeof SharpeningSessionSchema>;

// One image record on disk. Same shape for every entity that carries
// images — Knife, Stone, anything we add later — so the schema lives
// here once and gets reused.
export const ImageRefSchema = z.object({
  filename: z.string().min(1),
  caption: z.string().optional().default(""),
  addedAt: z.string(),
});
export type ImageRef = z.infer<typeof ImageRefSchema>;

export const IMAGE_MIME_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
export type ImageMimeType = keyof typeof IMAGE_MIME_TYPES;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const EXT_TO_MIME: Record<string, ImageMimeType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function mimeFromFilename(filename: string): ImageMimeType | null {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  return EXT_TO_MIME[ext] ?? null;
}

export const KnifeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  ownerId: z.string().min(1),
  manufacturer: z.string().optional().default(""),
  steel: z.string().optional().default(""),
  handle: z.string().optional().default(""),
  type: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  backlog: z.boolean().optional().default(false),
  backlogPosition: z.number().int().positive().optional(),
  onLoan: z.boolean().optional().default(false),
  sessions: z.array(SharpeningSessionSchema).default([]),
  images: z.array(ImageRefSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Knife = z.infer<typeof KnifeSchema>;

export const KnifeInputSchema = KnifeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string().optional(),
});
export type KnifeInput = z.infer<typeof KnifeInputSchema>;

export const OwnerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  contact: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Owner = z.infer<typeof OwnerSchema>;

export const OwnerInputSchema = OwnerSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string().optional(),
});
export type OwnerInput = z.infer<typeof OwnerInputSchema>;

export const SteelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  composition: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Steel = z.infer<typeof SteelSchema>;

export const SteelInputSchema = SteelSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string().optional(),
});
export type SteelInput = z.infer<typeof SteelInputSchema>;

export const HandleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  notes: z.string().optional().default(""),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Handle = z.infer<typeof HandleSchema>;

export const HandleInputSchema = HandleSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string().optional(),
});
export type HandleInput = z.infer<typeof HandleInputSchema>;

// Abrasive covers stones, strops, and anything else you push an edge
// against to refine it. `type` discriminates ("waterstone", "diamond
// plate", "ceramic", "strop"). `compound` and `substrate` are
// strop-specific but optional everywhere so a stone record can leave
// them blank.
export const AbrasiveSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  grit: z.number().positive(),
  type: z.string().optional().default(""),
  compound: z.string().optional().default(""),
  substrate: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  images: z.array(ImageRefSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Abrasive = z.infer<typeof AbrasiveSchema>;

export const AbrasiveInputSchema = AbrasiveSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string().optional(),
});
export type AbrasiveInput = z.infer<typeof AbrasiveInputSchema>;

export interface ImageBlob {
  bytes: Buffer;
  contentType: ImageMimeType;
}

export type ImageSize = "original" | "thumb";

export interface Storage {
  listKnives(): Promise<Knife[]>;
  getKnife(id: string): Promise<Knife | null>;
  saveKnife(knife: Knife): Promise<void>;
  deleteKnife(id: string): Promise<boolean>;

  saveKnifeImage(
    knifeId: string,
    filename: string,
    contentType: ImageMimeType,
    bytes: Buffer,
  ): Promise<void>;
  readKnifeImage(
    knifeId: string,
    filename: string,
    size?: ImageSize,
  ): Promise<ImageBlob | null>;
  deleteKnifeImage(knifeId: string, filename: string): Promise<boolean>;

  listOwners(): Promise<Owner[]>;
  getOwner(id: string): Promise<Owner | null>;
  saveOwner(owner: Owner): Promise<void>;
  deleteOwner(id: string): Promise<boolean>;

  listSteels(): Promise<Steel[]>;
  getSteel(id: string): Promise<Steel | null>;
  saveSteel(steel: Steel): Promise<void>;
  deleteSteel(id: string): Promise<boolean>;

  listHandles(): Promise<Handle[]>;
  getHandle(id: string): Promise<Handle | null>;
  saveHandle(handle: Handle): Promise<void>;
  deleteHandle(id: string): Promise<boolean>;

  listAbrasives(): Promise<Abrasive[]>;
  getAbrasive(id: string): Promise<Abrasive | null>;
  saveAbrasive(abrasive: Abrasive): Promise<void>;
  deleteAbrasive(id: string): Promise<boolean>;

  saveAbrasiveImage(
    abrasiveId: string,
    filename: string,
    contentType: ImageMimeType,
    bytes: Buffer,
  ): Promise<void>;
  readAbrasiveImage(
    abrasiveId: string,
    filename: string,
    size?: ImageSize,
  ): Promise<ImageBlob | null>;
  deleteAbrasiveImage(abrasiveId: string, filename: string): Promise<boolean>;
}
