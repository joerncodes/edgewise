"use client";

import {
  Check,
  Globe,
  Link2,
  Loader2,
  PocketKnife,
  ScanLine,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Mirrors the server's StreamEvent (src/lib/chat/agent-stream.ts). Kept
// local so this client component doesn't pull the server module.
type StreamEvent =
  | { type: "text"; text: string }
  | { type: "tool_start"; id: string; name: string; serverSide?: boolean }
  | { type: "tool_end"; id: string; name: string; ok: boolean }
  | { type: "citation"; url: string; title?: string }
  | { type: "proposal"; suggestion: Record<string, string> }
  | { type: "done"; usage?: { input: number; output: number } }
  | { type: "error"; message: string };

interface ToolCall {
  id: string;
  name: string;
  serverSide?: boolean;
  done?: boolean;
  ok?: boolean;
}

const TOOL_LABELS: Record<string, { label: string; Icon: typeof Globe }> = {
  web_search: { label: "Searching the web", Icon: Globe },
  fetch_url: { label: "Reading the page", Icon: Link2 },
  list_knives: { label: "Scanning your knives", Icon: PocketKnife },
  list_steels: { label: "Checking your steels", Icon: PocketKnife },
  list_handles: { label: "Checking handle materials", Icon: PocketKnife },
  list_manufacturers: { label: "Checking manufacturers", Icon: PocketKnife },
  list_owners: { label: "Checking owners", Icon: Users },
  propose_knife: { label: "Drafting the record", Icon: Sparkles },
};

export interface KnifeScanDialogProps {
  // Fired once the agent submits propose_knife. The suggestion seeds the
  // form's defaults; the file becomes the knife's cover photo.
  onProposal: (suggestion: Record<string, string>, file: File) => void;
}

export function KnifeScanDialog({ onProposal }: KnifeScanDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [scanning, setScanning] = useState(false);
  const [text, setText] = useState("");
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Follow the streamed reasoning — matters most on short mobile screens
  // where the progress would otherwise scroll out of view.
  useEffect(() => {
    if (scanning && scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [text, toolCalls, scanning]);

  if (disabled) return null;

  function reset() {
    setFile(null);
    setSourceUrl("");
    setInstructions("");
    setText("");
    setToolCalls([]);
    setError(null);
    setScanning(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function applyEvent(event: StreamEvent, scannedFile: File): boolean {
    if (event.type === "text") {
      setText((t) => t + event.text);
    } else if (event.type === "tool_start") {
      setToolCalls((calls) =>
        calls.find((c) => c.id === event.id)
          ? calls
          : [
              ...calls,
              {
                id: event.id,
                name: event.name,
                serverSide: event.serverSide,
                done: event.serverSide ? true : false,
                ok: event.serverSide ? true : undefined,
              },
            ],
      );
    } else if (event.type === "tool_end") {
      setToolCalls((calls) =>
        calls.map((c) =>
          c.id === event.id ? { ...c, done: true, ok: event.ok } : c,
        ),
      );
    } else if (event.type === "proposal") {
      // Got the structured suggestion — hand it up, close, and reset.
      onProposal(event.suggestion, scannedFile);
      setOpen(false);
      reset();
      return true;
    } else if (event.type === "error") {
      setError(event.message);
    }
    return false;
  }

  async function scan() {
    if (!file || scanning) return;
    setError(null);
    setText("");
    setToolCalls([]);
    setScanning(true);

    const scannedFile = file;
    try {
      const fd = new FormData();
      fd.append("file", scannedFile);
      if (sourceUrl.trim()) fd.append("sourceUrl", sourceUrl.trim());
      if (instructions.trim()) fd.append("instructions", instructions.trim());

      const res = await fetch("/api/knives/scan", {
        method: "POST",
        body: fd,
      });

      if (res.status === 503) {
        setDisabled(true);
        return;
      }
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `${res.status} ${res.statusText}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;

      while (!finished) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let event: StreamEvent;
          try {
            event = JSON.parse(line) as StreamEvent;
          } catch {
            continue;
          }
          if (applyEvent(event, scannedFile)) {
            finished = true;
            break;
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Don't let the dialog close mid-scan.
        if (scanning) return;
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <ScanLine />
            Scan from photo
          </Button>
        }
      />
      <DialogContent className="flex max-h-[85dvh] w-full max-w-[calc(100%-2rem)] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border p-4">
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-4 w-4" />
            Scan a knife
          </DialogTitle>
          <DialogDescription>
            Upload a photo and Claude will pre-fill the form — model, steel,
            handle, and notes. Review and fix before saving.
          </DialogDescription>
        </DialogHeader>

        <div ref={scrollerRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="space-y-2">
            <Label htmlFor="scan-file">Photo</Label>
            <Input
              id="scan-file"
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={scanning}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scan-url">Source URL (optional)</Label>
            <Input
              id="scan-url"
              type="url"
              inputMode="url"
              placeholder="https://… product page"
              value={sourceUrl}
              disabled={scanning}
              onChange={(e) => setSourceUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scan-instructions">Instructions (optional)</Label>
            <Textarea
              id="scan-instructions"
              rows={2}
              className="resize-none"
              placeholder="Anything Claude should know — the maker if you can read it, who it's for, what to focus on."
              value={instructions}
              disabled={scanning}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>

          {(toolCalls.length > 0 || text || scanning) && (
            <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
              {toolCalls.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {toolCalls.map((c) => (
                    <ToolChip key={c.id} call={c} />
                  ))}
                </div>
              )}
              {text ? (
                <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                  {text}
                </p>
              ) : (
                scanning && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Looking at the photo…
                  </p>
                )
              )}
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="border-t border-border p-3">
          <Button
            onClick={scan}
            disabled={!file || scanning}
            className="w-full"
          >
            {scanning ? (
              <>
                <Loader2 className="animate-spin" />
                Scanning…
              </>
            ) : (
              <>
                <ScanLine />
                Scan
              </>
            )}
          </Button>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Takes ~10–15s. The photo is also used as the knife&apos;s cover.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ToolChip({ call }: { call: ToolCall }) {
  const meta = TOOL_LABELS[call.name] ?? { label: call.name, Icon: Wrench };
  const { Icon } = meta;
  const stateIcon = !call.done ? (
    <Loader2 className="h-3 w-3 animate-spin" />
  ) : call.ok === false ? (
    <span className="text-destructive">✕</span>
  ) : (
    <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
  );
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
      title={call.name}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
      {stateIcon}
    </span>
  );
}
