"use client";

import {
  Check,
  Gem,
  Globe,
  Loader2,
  MessageCircle,
  NotebookPen,
  Pencil,
  PocketKnife,
  Send,
  StickyNote,
  Wrench,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type Role = "user" | "assistant";

interface Citation {
  url: string;
  title?: string;
}

interface ToolCall {
  id: string;
  name: string;
  serverSide?: boolean;
  done?: boolean;
  ok?: boolean;
}

interface ChatMessage {
  role: Role;
  content: string;
  citations?: Citation[];
  toolCalls?: ToolCall[];
}

interface KnifeChatProps {
  knifeId: string;
  knifeName: string;
  // Fired after every successful write tool so the host page can
  // re-fetch the knife. router.refresh() is useless here — the
  // detail page holds the knife in client state, so the parent has
  // to refetch itself.
  onWrite?: () => void;
}

type StreamEvent =
  | { type: "text"; text: string }
  | { type: "tool_start"; id: string; name: string; serverSide?: boolean }
  | { type: "tool_end"; id: string; name: string; ok: boolean }
  | { type: "citation"; url: string; title?: string }
  | { type: "done"; usage?: { input: number; output: number } }
  | { type: "error"; message: string };

const TOOL_LABELS: Record<string, { label: string; Icon: typeof Globe }> = {
  web_search: { label: "Searching the web", Icon: Globe },
  list_knives: { label: "Listing your knives", Icon: PocketKnife },
  get_knife: { label: "Loading knife", Icon: PocketKnife },
  list_abrasives: { label: "Listing abrasives", Icon: Gem },
  get_abrasive: { label: "Loading abrasive", Icon: Gem },
  list_steels: { label: "Checking your steels", Icon: PocketKnife },
  list_handles: { label: "Checking handle materials", Icon: PocketKnife },
  list_manufacturers: { label: "Checking manufacturers", Icon: PocketKnife },
  log_session: { label: "Logging session", Icon: NotebookPen },
  edit_session: { label: "Editing session", Icon: Pencil },
  append_knife_note: { label: "Adding to notes", Icon: StickyNote },
};

// Tools that mutate data — the detail view behind the chat dialog
// needs a router.refresh() when any of them succeed so the new state
// is visible after the dialog closes.
const WRITE_TOOLS = new Set([
  "log_session",
  "edit_session",
  "append_knife_note",
]);

export function KnifeChat({ knifeId, knifeName, onWrite }: KnifeChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages, open]);

  if (disabled) return null;

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    setInput("");

    const history: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ];
    setMessages(history);
    setSending(true);

    try {
      const res = await fetch(`/api/knives/${knifeId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.slice(0, -1).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
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

      while (true) {
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
          applyEvent(event);
          // Side effect: tell the host page to refetch the knife when
          // a write tool succeeds, so the change shows up in the
          // detail view without closing the chat.
          if (
            event.type === "tool_end" &&
            event.ok &&
            WRITE_TOOLS.has(event.name)
          ) {
            onWrite?.();
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  }

  function applyEvent(event: StreamEvent) {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (!last || last.role !== "assistant") return prev;
      const updated = { ...last };

      if (event.type === "text") {
        updated.content += event.text;
      } else if (event.type === "tool_start") {
        const calls = updated.toolCalls ?? [];
        if (!calls.find((c) => c.id === event.id)) {
          updated.toolCalls = [
            ...calls,
            {
              id: event.id,
              name: event.name,
              serverSide: event.serverSide,
              done: event.serverSide ? true : false,
              ok: event.serverSide ? true : undefined,
            },
          ];
        }
      } else if (event.type === "tool_end") {
        updated.toolCalls = (updated.toolCalls ?? []).map((c) =>
          c.id === event.id ? { ...c, done: true, ok: event.ok } : c,
        );
      } else if (event.type === "citation") {
        const citations = updated.citations ?? [];
        if (!citations.find((c) => c.url === event.url)) {
          updated.citations = [
            ...citations,
            { url: event.url, title: event.title },
          ];
        }
      } else if (event.type === "error") {
        setError(event.message);
      }
      next[next.length - 1] = updated;
      return next;
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="xs">
            <MessageCircle />
            Chat
          </Button>
        }
      />
      <DialogContent className="flex h-[80vh] max-h-[80vh] w-full max-w-2xl flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border p-4">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Chat about {knifeName}
          </DialogTitle>
        </DialogHeader>

        <div
          ref={scrollerRef}
          className="flex-1 space-y-4 overflow-y-auto p-4"
        >
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Ask anything about this knife — steel properties, comparable
              models, sharpening angles, prices. The assistant can also
              browse the rest of your knives and abrasive library, and
              search the web.
            </p>
          )}
          {messages.map((m, i) => (
            <ChatBubble key={i} message={m} />
          ))}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="border-t border-border p-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about this knife…"
              rows={2}
              className="resize-none"
              disabled={sending}
              autoFocus
            />
            <Button
              size="sm"
              onClick={send}
              disabled={sending || input.trim().length === 0}
            >
              <Send />
              Send
            </Button>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Enter to send · Shift+Enter for newline · Conversation resets on
            refresh
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  if (isUser) {
    return (
      <div className="ml-auto max-w-[85%] rounded-md bg-muted px-3 py-2 text-sm">
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    );
  }

  const hasContent = message.content.length > 0;
  const hasTools = (message.toolCalls?.length ?? 0) > 0;

  return (
    <div className="max-w-[85%] space-y-2 text-sm">
      {hasTools && (
        <div className="flex flex-wrap gap-1.5">
          {message.toolCalls!.map((c) => (
            <ToolChip key={c.id} call={c} />
          ))}
        </div>
      )}
      {hasContent ? (
        <Markdown>{message.content}</Markdown>
      ) : (
        !hasTools && (
          <p className="text-xs text-muted-foreground">Thinking…</p>
        )
      )}
      {message.citations && message.citations.length > 0 && (
        <div className="space-y-1 border-l border-border pl-3 text-xs">
          <p className="font-medium text-muted-foreground">Sources</p>
          <ul className="space-y-0.5">
            {message.citations.map((c) => (
              <li key={c.url}>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  {c.title || c.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
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
