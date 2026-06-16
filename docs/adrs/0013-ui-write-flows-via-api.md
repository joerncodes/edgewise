---
filetype: adr
id: "0013"
title: UI write flows via the same /api/* contract
status: accepted
date: 2026-06-16
supersedes: "0006"
---

# Context

ADR-0006 kept the UI strictly read-only and routed every write
through `/api/*`. The reasoning was sound at v1: one validation
layer, one auth boundary, one shape to reason about. External
clients (Claude, curl, scripts) and the UI would share the same
contract instead of forking into Server Actions + API.

That stance has aged into friction. Day-to-day operation now means
switching to a terminal and curling hand-rolled JSON every time a
knife shows up, a session happens, or a photo needs adding. The
gap between "API is ready" and "I can do it from a phone in the
kitchen" is the whole point of writing the app at all.

What hasn't aged is the *contract* part — the API as the single
write path is still the right answer. The supersession is about
adding a UI surface on top, not about replacing the API or
introducing a second write path.

# Decision

Grow UI write flows that call `/api/*` through
`src/lib/api-client.ts`, the same path external clients use.

**Form library: react-hook-form + @hookform/resolvers + zod.**
Validation reuses the existing `*InputSchema` Zod definitions in
`src/lib/storage/types.ts` — no parallel client-side schema. The
big knife form is the load-bearing case; the same pattern downscales
cleanly to owner/steel/handle/abrasive.

**Where forms live:**

- **Create** → dedicated page (`/knives/new`, `/owners/new`, …).
  Deep-linkable, survives reloads, navigates back to the list via
  the same `← All …` pattern the read-only detail pages already use.
- **Edit** → inline on the detail page, toggled by a pencil button.
  The photo + history + related links stay visible — that context
  is half the reason the form is being filled in.
- **Delete** → `AlertDialog` from the detail page. Spell out the
  cascade in the dialog body ("Deletes the knife, N sessions, M
  photos."). High-stakes deletes (owner with knives still attached)
  get a typed-confirmation field; one-button deletes are fine for
  leaf entities with no incoming refs.

**Feedback:** `sonner` toast on success and on error. Error
messages come from the API response body (`{ "error": "..." }`),
not handcrafted client-side strings.

**Refetch over optimistic.** After a successful mutation, refetch
the affected entity and replace local state. The API responds with
the full entity, the file read is cheap, and the toast confirms the
action — the savings from optimistic updates aren't worth the
diverged-state risk. Backlog reorder stays the one optimistic
exception because dnd feels broken without it.

**Open-list autocomplete.** Free-string fields (`type`, `subtype`,
`manufacturer`, `steel`, `handle`, `Abrasive.type`) source their
suggestions from `GET /api/facets`. Combobox surfaces the observed
values; new values still allowed.

**No Server Actions.** Explicit non-decision. The UI calls the same
`fetch`-backed `api.*` helpers external clients use. Two write
paths is exactly the failure mode this ADR is trying to avoid.

# Consequences

- Single validation surface: `*InputSchema` validates on the
  client (in the form) and on the server (in the route handler).
  A field added to the schema lights up the form by name.
- Same auth boundary: `src/proxy.ts` already gates `/api/*` by
  cookie *or* bearer; UI writes ride the cookie path.
- ADR-0006's preserved consequences still hold: one auth
  boundary, one shape to document, the API is the public
  surface.
- New deps: `react-hook-form` (~25 kB gzipped), `@hookform/resolvers`
  (~3 kB). One-time cost, amortized across every form.
- Larger client bundle on form-bearing routes. Acceptable for a
  single-user homelab app; revisit only if cold-start latency
  becomes noticeable.
- Shadcn primitives added in support: `alert-dialog`, `command`,
  `popover`, `input-group`. The thin `<Form>` wrapper (a few
  lines of `FormProvider` + a `<FormField>` helper) isn't in the
  base-nova registry — the first concrete form todo
  (likely `ui-owner-crud` or `ui-knife-create`) writes it in
  `src/components/ui/form.tsx` so it's there for the rest.

# Alternatives considered

- **Stay read-only (ADR-0006 unchanged).** Tested. Operationally
  punishing once the corpus grew past a handful of knives.
- **Server Actions for the UI + API for external clients.** Two
  write paths, diverging validation, harder to reason about. The
  whole point of the API-as-contract is to *not* do this. Same
  reasoning as ADR-0006; that part stays.
- **`useSWR` / `react-query` for the data layer.** Worth it on a
  larger app with concurrent invalidation and shared queries; on
  this single-user app, `useState` + `useEffect` + refetch covers
  every mutation flow and stays grep-able. Revisit when a real
  cache hit-rate problem materializes.
- **Optimistic-by-default mutations.** Each entity is one
  markdown file; the round-trip on `PATCH` is fast enough that
  the diverged-state risk dominates. Backlog reorder is the
  precedent for opting in case-by-case.

# How to apply

The pattern, made concrete for any entity that has a Zod
`*InputSchema` and `/api/*` POST/PATCH/DELETE:

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { OwnerInputSchema, type OwnerInput } from "@/lib/storage";

export function NewOwnerForm() {
  const router = useRouter();
  const form = useForm<OwnerInput>({
    resolver: zodResolver(OwnerInputSchema),
    defaultValues: { name: "", contact: "", notes: "" },
  });

  async function onSubmit(values: OwnerInput) {
    try {
      const owner = await api.createOwner(values);
      toast.success(`Added ${owner.name}`);
      router.push(`/owners/${owner.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* fields */}
    </form>
  );
}
```

For inline edit on a detail page, same shape — `defaultValues` is
the loaded entity, `onSubmit` calls `api.updateOwner(id, values)`,
success toggles edit mode off and replaces local state with the
server response.

For delete, `AlertDialog` opens, the action handler calls
`api.deleteOwner(id)`, success toasts and navigates back to the
list. Cascade deletes (entity removed → 409 from server) become
toast errors with the server's `error` string.

The per-entity todos that implement this — [[ui-knife-create]],
[[ui-knife-edit-delete]], [[ui-session-form]], [[ui-image-upload]],
[[ui-owner-crud]], [[ui-library-crud]] — all lean on this shape.
