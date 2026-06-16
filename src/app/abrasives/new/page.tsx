"use client";

import { ArrowLeft, Gem } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AbrasiveForm } from "@/components/abrasive-form";
import { api } from "@/lib/api-client";
import type { AbrasiveInput } from "@/lib/storage/types";

export default function NewAbrasivePage() {
  const router = useRouter();

  async function handleSubmit(values: AbrasiveInput) {
    try {
      const abrasive = await api.createAbrasive(values);
      toast.success(`Added ${abrasive.name}`);
      router.push(`/abrasives/${abrasive.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save abrasive");
    }
  }

  return (
    <div className="max-w-xl space-y-8">
      <header className="space-y-3">
        <Link
          href="/abrasives"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          <Gem className="h-3 w-3" />
          All abrasives
        </Link>
        <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-brass">
          <Gem className="h-7 w-7" />
          New abrasive
        </h1>
      </header>

      <AbrasiveForm
        submitLabel="Create abrasive"
        onSubmit={handleSubmit}
        onCancel={() => router.push("/abrasives")}
      />
    </div>
  );
}
