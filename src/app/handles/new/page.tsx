"use client";

import { ArrowLeft, Grip } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { HandleForm } from "@/components/handle-form";
import { api } from "@/lib/api-client";
import type { HandleInput } from "@/lib/storage/types";

export default function NewHandlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillName = searchParams.get("name") ?? "";

  async function handleSubmit(values: HandleInput) {
    try {
      const handle = await api.createHandle(values);
      toast.success(`Added ${handle.name}`);
      router.push(`/handles/${handle.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save handle");
    }
  }

  return (
    <div className="max-w-xl space-y-8">
      <header className="space-y-3">
        <Link
          href="/handles"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          <Grip className="h-3 w-3" />
          All handles
        </Link>
        <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-brass">
          <Grip className="h-7 w-7" />
          New handle
        </h1>
      </header>

      <HandleForm
        defaultValues={prefillName ? { name: prefillName } : undefined}
        submitLabel="Create handle"
        onSubmit={handleSubmit}
        onCancel={() => router.push("/handles")}
      />
    </div>
  );
}
