"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/storage/ids";
import { SteelInputSchema, type SteelInput } from "@/lib/storage/types";

type SteelFormValues = z.input<typeof SteelInputSchema>;

export interface SteelFormProps {
  defaultValues?: Partial<SteelFormValues>;
  submitLabel: string;
  onSubmit: (values: SteelInput) => Promise<void> | void;
  onCancel?: () => void;
  pinnedSlug?: string;
  knivesUsing?: number;
}

export function SteelForm({
  defaultValues,
  submitLabel,
  onSubmit,
  onCancel,
  pinnedSlug,
  knivesUsing,
}: SteelFormProps) {
  const form = useForm<SteelFormValues, unknown, SteelInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(SteelInputSchema as any),
    defaultValues: { name: "", composition: "", notes: "", ...defaultValues },
  });

  const watchedName = form.watch("name") ?? "";
  const derivedSlug =
    pinnedSlug ?? (watchedName.trim() ? slugify(watchedName) : "");

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
                  placeholder="80CrV2"
                  {...field}
                />
              </FormControl>
              {derivedSlug && (
                <FormDescription>
                  {pinnedSlug ? "URL stays" : "Will be saved as"}{" "}
                  <code className="font-mono">{derivedSlug}</code>
                  {pinnedSlug && knivesUsing !== undefined && knivesUsing > 0 && (
                    <>
                      {" "}
                      · {knivesUsing}{" "}
                      {knivesUsing === 1 ? "knife references" : "knives reference"}{" "}
                      this name (renames are display-only — the knife strings
                      stay as written).
                    </>
                  )}
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="composition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Composition</FormLabel>
              <FormControl>
                <Input
                  placeholder="0.8% C, 0.5% Cr, 0.15% V"
                  className="font-mono"
                  {...field}
                />
              </FormControl>
              <FormDescription>Free-form alloy formula.</FormDescription>
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
                  placeholder="Care, sharpening behaviour, edge retention, rust character…"
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
