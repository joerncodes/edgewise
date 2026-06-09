import { z } from "zod";

export const SharpeningSessionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  angle: z.number().positive().max(45),
  notes: z.string().optional().default(""),
});
export type SharpeningSession = z.infer<typeof SharpeningSessionSchema>;

export const KnifeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  ownerId: z.string().min(1),
  manufacturer: z.string().optional().default(""),
  steel: z.string().optional().default(""),
  type: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  sessions: z.array(SharpeningSessionSchema).default([]),
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

export interface Storage {
  listKnives(): Promise<Knife[]>;
  getKnife(id: string): Promise<Knife | null>;
  saveKnife(knife: Knife): Promise<void>;
  deleteKnife(id: string): Promise<boolean>;

  listOwners(): Promise<Owner[]>;
  getOwner(id: string): Promise<Owner | null>;
  saveOwner(owner: Owner): Promise<void>;
  deleteOwner(id: string): Promise<boolean>;
}
