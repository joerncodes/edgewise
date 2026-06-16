"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  StringCombobox,
  type StringComboboxOption,
} from "@/components/ui/string-combobox";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";
import { slugify } from "@/lib/storage/ids";
import {
  AbrasiveInputSchema,
  type AbrasiveInput,
} from "@/lib/storage/types";

type AbrasiveFormValues = z.input<typeof AbrasiveInputSchema>;

export interface AbrasiveFormProps {
  defaultValues?: Partial<AbrasiveFormValues>;
  submitLabel: string;
  onSubmit: (values: AbrasiveInput) => Promise<void> | void;
  onCancel?: () => void;
  pinnedSlug?: string;
}

// Common abrasive types — surfaced as combobox suggestions but never
// enforced. Open list per ADR-0013.
const TYPE_SUGGESTIONS: StringComboboxOption[] = [
  { value: "waterstone" },
  { value: "diamond plate" },
  { value: "ceramic" },
  { value: "strop" },
];

export function AbrasiveForm({
  defaultValues,
  submitLabel,
  onSubmit,
  onCancel,
  pinnedSlug,
}: AbrasiveFormProps) {
  const form = useForm<AbrasiveFormValues, unknown, AbrasiveInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(AbrasiveInputSchema as any),
    defaultValues: {
      name: "",
      grit: 1000,
      type: "",
      compound: "",
      substrate: "",
      notes: "",
      ...defaultValues,
    },
  });

  const watchedName = form.watch("name") ?? "";
  const watchedType = (form.watch("type") ?? "").trim().toLowerCase();
  const derivedSlug =
    pinnedSlug ?? (watchedName.trim() ? slugify(watchedName) : "");
  const isStrop = watchedType === "strop";

  // Observed types from existing abrasives — added to the suggestion
  // list so a one-off "diamond plate (DMT)" you've used before
  // resurfaces. New values still allowed.
  const [observedTypes, setObservedTypes] = useState<StringComboboxOption[]>([]);
  useEffect(() => {
    api.listAbrasives().then((all) => {
      const seen = new Map<string, number>();
      for (const a of all) {
        const t = (a.type ?? "").trim();
        if (!t) continue;
        seen.set(t, (seen.get(t) ?? 0) + 1);
      }
      setObservedTypes(
        [...seen.entries()].map(([value, count]) => ({ value, count })),
      );
    }).catch(() => {
      /* facets are nice-to-have */
    });
  }, []);

  const typeOptions: StringComboboxOption[] = [
    ...TYPE_SUGGESTIONS,
    ...observedTypes.filter(
      (o) => !TYPE_SUGGESTIONS.some((s) => s.value === o.value),
    ),
  ];

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
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
                  placeholder="Shapton Pro 1000"
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="grit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Grit</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    {...form.register("grit", {
                      required: true,
                      valueAsNumber: true,
                      min: 1,
                    })}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormDescription>
                  Bare number; JIS scale. For a strop, the effective compound
                  grit (chromium oxide ≈ 60000).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <FormControl>
                  <StringCombobox
                    placeholder="waterstone, strop, …"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    options={typeOptions}
                  />
                </FormControl>
                <FormDescription>
                  Open list. <code className="font-mono">strop</code> unlocks
                  the compound + substrate fields.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Strop-only fields stay in state when hidden (so toggling type
            away from strop doesn't wipe a compound you'd already entered). */}
        <div
          className={isStrop ? "grid grid-cols-1 gap-4 sm:grid-cols-2" : "hidden"}
          aria-hidden={!isStrop}
        >
          <FormField
            control={form.control}
            name="compound"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Compound</FormLabel>
                <FormControl>
                  <Input
                    placeholder="chromium oxide 0.5 µm"
                    className="font-mono"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="substrate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Substrate</FormLabel>
                <FormControl>
                  <Input
                    placeholder="kangaroo leather, balsa, …"
                    className="font-mono"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  rows={6}
                  placeholder="Soak time, dishing observations, flattening reminders…"
                  className="font-mono text-sm"
                  {...field}
                />
              </FormControl>
              <FormDescription>Markdown is rendered on the detail page.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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
