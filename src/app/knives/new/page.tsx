"use client";

import { ArrowLeft, PocketKnife } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KnifeForm } from "@/components/knife-form";
import { api } from "@/lib/api-client";
import type { KnifeInput, Owner } from "@/lib/storage/types";

export default function NewKnifePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ownerId = searchParams.get("ownerId") ?? "";

  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listOwners()
      .then(setOwners)
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(values: KnifeInput, file: File | null) {
    try {
      const knife = await api.createKnife(values);
      if (file) {
        try {
          await api.uploadKnifeImage(knife.id, file);
          toast.success(`Added ${knife.name}`);
        } catch (uploadErr) {
          // The knife saved; only the image step failed. Land on
          // the detail page so the user can retry the upload there.
          toast.warning(
            `${knife.name} saved, but the photo upload failed: ${
              uploadErr instanceof Error ? uploadErr.message : "unknown error"
            }`,
          );
        }
      } else {
        toast.success(`Added ${knife.name}`);
      }
      router.push(`/knives/${knife.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save knife");
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <header className="space-y-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          <PocketKnife className="h-3 w-3" />
          All knives
        </Link>
        <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-brass">
          <PocketKnife className="h-7 w-7" />
          New knife
        </h1>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading owners…</p>
      ) : owners.length === 0 ? (
        <div className="rounded-md border border-border bg-muted/30 p-6 text-sm">
          <p className="mb-2 font-medium">No owners yet.</p>
          <p className="text-muted-foreground">
            Every knife needs an owner.{" "}
            <Link
              href="/owners/new?returnTo=/knives/new"
              className="text-foreground underline-offset-2 hover:underline"
            >
              Add the first owner
            </Link>{" "}
            to get started.
          </p>
        </div>
      ) : (
        <KnifeForm
          owners={owners}
          defaultValues={ownerId ? { ownerId } : undefined}
          submitLabel="Create knife"
          onSubmit={handleSubmit}
          onCancel={() => router.push(ownerId ? `/owners/${ownerId}` : "/")}
          showImageField
        />
      )}
    </div>
  );
}
