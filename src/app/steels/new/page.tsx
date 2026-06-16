"use client";

import { ArrowLeft, Atom } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { SteelForm } from "@/components/steel-form";
import { api } from "@/lib/api-client";
import type { SteelInput } from "@/lib/storage/types";

export default function NewSteelPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillName = searchParams.get("name") ?? "";

  async function handleSubmit(values: SteelInput) {
    try {
      const steel = await api.createSteel(values);
      toast.success(`Added ${steel.name}`);
      router.push(`/steels/${steel.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save steel");
    }
  }

  return (
    <div className="max-w-xl space-y-8">
      <header className="space-y-3">
        <Link
          href="/steels"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          <Atom className="h-3 w-3" />
          All steels
        </Link>
        <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-brass">
          <Atom className="h-7 w-7" />
          New steel
        </h1>
      </header>

      <SteelForm
        defaultValues={prefillName ? { name: prefillName } : undefined}
        submitLabel="Create steel"
        onSubmit={handleSubmit}
        onCancel={() => router.push("/steels")}
      />
    </div>
  );
}
