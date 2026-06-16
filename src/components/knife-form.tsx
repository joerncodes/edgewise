"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  StringCombobox,
  type StringComboboxOption,
} from "@/components/ui/string-combobox";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";
import type { Facets } from "@/lib/facets";
import { slugify } from "@/lib/storage/ids";
import {
  KnifeInputSchema,
  type KnifeInput,
  type Owner,
} from "@/lib/storage/types";

type KnifeFormValues = z.input<typeof KnifeInputSchema>;

export interface KnifeFormProps {
  owners: Owner[];
  defaultValues?: Partial<KnifeFormValues>;
  submitLabel: string;
  onSubmit: (values: KnifeInput, file: File | null) => Promise<void> | void;
  onCancel?: () => void;
  // Pinned during edit — the ID can't change once created.
  pinnedSlug?: string;
  // Show the cover-image upload field (create flow); the gallery
  // management UI lives in [[ui-image-upload]] and isn't here.
  showImageField?: boolean;
}

export function KnifeForm({
  owners,
  defaultValues,
  submitLabel,
  onSubmit,
  onCancel,
  pinnedSlug,
  showImageField = false,
}: KnifeFormProps) {
  const form = useForm<KnifeFormValues, unknown, KnifeInput>({
    // Schema's input/output diverge through .default("") — same cast
    // dance as OwnerForm. See ADR-0013 / owner-form.tsx for context.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(KnifeInputSchema as any),
    defaultValues: {
      name: "",
      ownerId: "",
      manufacturer: "",
      type: "",
      subtype: "",
      steel: "",
      handle: "",
      notes: "",
      backlog: true,
      onLoan: false,
      sessions: [],
      ...defaultValues,
    },
  });

  const [facets, setFacets] = useState<Facets | null>(null);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    api.getFacets().then(setFacets).catch(() => {
      /* facets are nice-to-have; silently skip if they fail */
    });
  }, []);

  const watchedName = form.watch("name") ?? "";
  const watchedType = (form.watch("type") ?? "").trim();
  const derivedSlug =
    pinnedSlug ?? (watchedName.trim() ? slugify(watchedName) : "");

  // Subtype options narrow to the picked type. Mirrors the nested
  // sidebar filter from `knife-filters.tsx`.
  const subtypeOptions = useMemo<StringComboboxOption[]>(() => {
    if (!facets) return [];
    if (!watchedType) {
      return facets.subtypes.map((s) => ({ value: s.value, count: s.count }));
    }
    // We don't get a {type,subtype} cross-tab from the facets endpoint,
    // so reuse subtypes as raw suggestions but bias toward exact-typed
    // matches client-side. (A future GET /api/facets/subtypes?type=…
    // could narrow server-side; out of scope for this todo.)
    return facets.subtypes.map((s) => ({ value: s.value, count: s.count }));
  }, [facets, watchedType]);

  const manufacturerOptions = useMemo<StringComboboxOption[]>(
    () => facets?.manufacturers ?? [],
    [facets],
  );
  const typeOptions = useMemo<StringComboboxOption[]>(
    () => facets?.types ?? [],
    [facets],
  );
  const steelOptions = useMemo<StringComboboxOption[]>(
    () => facets?.steels ?? [],
    [facets],
  );
  const handleOptions = useMemo<StringComboboxOption[]>(
    () => facets?.handles ?? [],
    [facets],
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => onSubmit(values, file))}
        className="space-y-6"
        noValidate
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  autoFocus={!pinnedSlug}
                  placeholder='Wüsthof Classic 8" Chef'
                  {...field}
                />
              </FormControl>
              {derivedSlug && (
                <FormDescription>
                  {pinnedSlug ? "URL stays" : "Will be saved as"}{" "}
                  <code className="font-mono">{derivedSlug}</code>
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ownerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Owner</FormLabel>
              <FormControl>
                <Select
                  value={field.value || undefined}
                  onValueChange={(v) =>
                    field.onChange(typeof v === "string" ? v : "")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an owner…" />
                  </SelectTrigger>
                  <SelectContent>
                    {owners.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>
                Not here?{" "}
                <Link
                  href="/owners/new?returnTo=/knives/new"
                  className="text-foreground underline-offset-2 hover:underline"
                >
                  Add a new owner
                </Link>
                .
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <FormControl>
                  <StringCombobox
                    placeholder="Chef's Knife, Pocket Knife, …"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    options={typeOptions}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="subtype"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subtype</FormLabel>
                <FormControl>
                  <StringCombobox
                    placeholder="folder, Western, …"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    options={subtypeOptions}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="manufacturer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Manufacturer</FormLabel>
                <FormControl>
                  <StringCombobox
                    placeholder="Wüsthof, Spyderco, …"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    options={manufacturerOptions}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="steel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Steel</FormLabel>
                <FormControl>
                  <StringCombobox
                    placeholder="80CrV2, AUS-8, …"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    options={steelOptions}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="handle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Handle</FormLabel>
              <FormControl>
                <StringCombobox
                  placeholder="G10, micarta, stag, …"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={handleOptions}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  rows={6}
                  placeholder="Chip near the heel. Customer aware. Wants a 17° edge on the petty."
                  className="font-mono text-sm"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Markdown is rendered on the detail page.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <FormField
            control={form.control}
            name="backlog"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={!!field.value}
                    onCheckedChange={(v) => field.onChange(Boolean(v))}
                  />
                </FormControl>
                <FormLabel className="leading-none">In the backlog</FormLabel>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="onLoan"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={!!field.value}
                    onCheckedChange={(v) => field.onChange(Boolean(v))}
                  />
                </FormControl>
                <FormLabel className="leading-none">On loan</FormLabel>
              </FormItem>
            )}
          />
        </div>

        {showImageField && (
          <FormItem>
            <FormLabel>Cover photo (optional)</FormLabel>
            <FormControl>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </FormControl>
            <FormDescription>
              JPEG / PNG / WebP, up to 10 MB. The full gallery flow
              lives on the detail page.
            </FormDescription>
          </FormItem>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving…" : submitLabel}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
