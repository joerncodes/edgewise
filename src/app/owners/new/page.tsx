"use client";

import { ArrowLeft, User } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { OwnerForm } from "@/components/owner-form";
import { api } from "@/lib/api-client";
import type { OwnerInput } from "@/lib/storage/types";

export default function NewOwnerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");

  async function handleSubmit(values: OwnerInput) {
    try {
      const owner = await api.createOwner(values);
      toast.success(`Added ${owner.name}`);
      router.push(returnTo ?? `/owners/${owner.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save owner");
    }
  }

  return (
    <div className="space-y-8 max-w-xl">
      <header className="space-y-3">
        <Link
          href="/owners"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          <User className="h-3 w-3" />
          All owners
        </Link>
        <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-brass">
          <User className="h-7 w-7" />
          New owner
        </h1>
      </header>

      <OwnerForm
        submitLabel="Create owner"
        onSubmit={handleSubmit}
        onCancel={() => router.push(returnTo ?? "/owners")}
      />
    </div>
  );
}
