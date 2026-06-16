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
import { OwnerInputSchema, type OwnerInput } from "@/lib/storage/types";

// `OwnerInput` is the *output* (post-zod-defaults: notes/contact are
// guaranteed strings). The form state is the *input* (notes/contact
// may be undefined while typing). They line up at runtime; we just
// have to thread both types through useForm.
type OwnerFormValues = z.input<typeof OwnerInputSchema>;

export interface OwnerFormProps {
  defaultValues?: Partial<OwnerFormValues>;
  submitLabel: string;
  onSubmit: (values: OwnerInput) => Promise<void> | void;
  onCancel?: () => void;
  // Pinned during edit — the ID can't change once created.
  pinnedSlug?: string;
}

export function OwnerForm({
  defaultValues,
  submitLabel,
  onSubmit,
  onCancel,
  pinnedSlug,
}: OwnerFormProps) {
  const form = useForm<OwnerFormValues, unknown, OwnerInput>({
    // @hookform/resolvers' bundled types pin zod's minor at the v3
    // shape; our zod is v4 (runtime works — the resolver detects
    // both). Cast the schema arg to satisfy the type-side check.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(OwnerInputSchema as any),
    defaultValues: {
      name: "",
      contact: "",
      notes: "",
      ...defaultValues,
    },
  });

  const watchedName = form.watch("name") ?? "";
  const derivedSlug = pinnedSlug ?? (watchedName.trim() ? slugify(watchedName) : "");

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
                  placeholder="Jane Doe"
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
          name="contact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact</FormLabel>
              <FormControl>
                <Input
                  placeholder="email, phone, Slack handle…"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Free-form; whatever's quickest to reach them.
              </FormDescription>
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
                  placeholder="Anything worth remembering — favourite angle, allergies to certain steels, …"
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
