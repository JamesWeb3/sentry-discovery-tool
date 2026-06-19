"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { TOOL_BY_ID, AI_TOOLS } from "@/lib/catalog";
import type { AuditState, Tool } from "@/lib/types";

type Msg = { role: "user" | "assistant"; content: string };
type SidebarItem = { id: string; label: string; domain?: string };

const AI_BY_ID = Object.fromEntries(AI_TOOLS.map((a) => [a.id, a]));

const favicon = (domain?: string) =>
  domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : undefined;

const STARTERS = [
  "Where is my business context most scattered right now?",
  "Which tools should we connect into one knowledge graph first?",
  "How would a Claude cowork setup work for my team?",
];

export default function ChatScreen() {
  const [audit, setAudit] = useState<{ state: AuditState; extraTools: Tool[] } | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [selectedAi, setSelectedAi] = useState<Set<string>>(new Set());
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Pull the audit captured on the results screen.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("sentry:audit");
      if (raw) {
        const parsed = JSON.parse(raw) as { state: AuditState; extraTools: Tool[] };
        setAudit(parsed);
        setSelectedAi(new Set(parsed.state.aiTools ?? []));
        // Tools start unselected — the user opts into the ones they want as context.
        setSelectedTools(new Set());
      }
    } catch {
      // ignore malformed storage
    }
    setLoaded(true);
  }, []);

  const aiItems: SidebarItem[] = useMemo(() => {
    if (!audit) return [];
    return (audit.state.aiTools ?? []).map((id) => ({
      id,
      label: AI_BY_ID[id]?.label ?? id,
      domain: AI_BY_ID[id]?.domain,
    }));
  }, [audit]);

  const toolItems: SidebarItem[] = useMemo(() => {
    if (!audit) return [];
    const catalog: Record<string, Tool> = {
      ...TOOL_BY_ID,
      ...Object.fromEntries(audit.extraTools.map((t) => [t.id, t])),
    };
    return audit.state.toolIds.map((id) => ({
      id,
      label: catalog[id]?.name ?? id,
      domain: catalog[id]?.domain,
    }));
  }, [audit]);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  // Keep pinned to the bottom as content streams.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const history: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    setError(null);

    const context = {
      company: audit?.state.company,
      ecosystem: audit?.state.ecosystem,
      aiSubscriptions: aiItems.filter((a) => selectedAi.has(a.id)).map((a) => a.label),
      tools: toolItems.filter((t) => selectedTools.has(t.id)).map((t) => t.label),
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, context }),
      });
      if (!res.ok || !res.body) throw new Error("request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { ...last, content: last.content + chunk };
          return copy;
        });
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setMessages((prev) => {
        const copy = [...prev];
        if (copy[copy.length - 1]?.role === "assistant" && !copy[copy.length - 1].content) {
          copy.pop();
        }
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  };

  // No audit in storage — nudge the user back to build one.
  if (loaded && !audit) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6 text-center">
        <div className="max-w-sm">
          <h1 className="text-xl font-semibold">No knowledge graph yet</h1>
          <p className="text-white/50 mt-2 text-sm">
            Build your knowledge graph first, then open the assistant from the results screen.
          </p>
          <Link
            href="/audit"
            className="inline-block mt-5 px-5 py-2.5 rounded-xl bg-white text-black font-medium hover:bg-white/90 transition-colors"
          >
            Start an audit
          </Link>
        </div>
      </main>
    );
  }

  const Toggle = ({
    item,
    active,
    onClick,
  }: {
    item: SidebarItem;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm text-left transition-all ${
        active
          ? "border-violet-400/50 bg-violet-400/15 text-white"
          : "border-white/10 bg-white/[0.03] text-white/55 hover:text-white hover:border-white/25"
      }`}
    >
      {item.domain ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={favicon(item.domain)} alt="" width={18} height={18} className="rounded-sm shrink-0" />
      ) : (
        <span className="size-[18px] rounded-sm bg-white/10 flex items-center justify-center text-[10px] shrink-0">
          {item.label[0]?.toUpperCase()}
        </span>
      )}
      <span className="truncate flex-1">{item.label}</span>
      <span
        className={`size-4 rounded-full border flex items-center justify-center text-[10px] shrink-0 ${
          active ? "border-violet-300 bg-violet-400 text-black" : "border-white/20 text-transparent"
        }`}
      >
        ✓
      </span>
    </button>
  );

  return (
    <main className="h-screen bg-black text-white flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 shrink-0 border-r border-white/10 flex flex-col bg-white/[0.015]">
        <div className="p-4 border-b border-white/10">
          <Link
            href="/audit"
            className="inline-flex items-center gap-2 text-sm text-white/55 hover:text-white"
          >
            <Image src="/sentry-logo.png" alt="Sentry AI" width={20} height={20} className="rounded" />
            Back to graph
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          <div>
            <div className="text-xs uppercase tracking-[0.15em] text-white/35 mb-1">Context</div>
            <p className="text-xs text-white/40">
              Tap to include in the chat. The assistant focuses on whatever is selected.
            </p>
          </div>

          {aiItems.length > 0 && (
            <div>
              <div className="text-xs font-medium text-white/45 mb-2">AI subscriptions</div>
              <div className="flex flex-col gap-1.5">
                {aiItems.map((item) => (
                  <Toggle
                    key={item.id}
                    item={item}
                    active={selectedAi.has(item.id)}
                    onClick={() => toggle(selectedAi, setSelectedAi, item.id)}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-medium text-white/45 mb-2">
              Tools{" "}
              <span className="text-white/25">
                ({selectedTools.size}/{toolItems.length})
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {toolItems.map((item) => (
                <Toggle
                  key={item.id}
                  item={item}
                  active={selectedTools.has(item.id)}
                  onClick={() => toggle(selectedTools, setSelectedTools, item.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Chat */}
      <section className="flex-1 flex flex-col min-w-0">
        <header className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
          <Image src="/sentry-logo.png" alt="" width={26} height={26} className="rounded-lg" />
          <div>
            <div className="font-semibold leading-tight">Sentry Assistant</div>
            <div className="text-xs text-white/40">
              Grounded in {selectedAi.size + selectedTools.size} pinned items
            </div>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto w-full px-6 py-8 flex flex-col gap-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center text-center mt-10">
                <Image src="/sentry-logo.png" alt="" width={48} height={48} className="rounded-2xl" />
                <h1 className="text-2xl font-semibold mt-5">
                  Ask anything about your stack
                </h1>
                <p className="text-white/50 mt-2 max-w-md">
                  Your assistant knows the tools and AI subscriptions you mapped. Pin or
                  unpin items on the left to steer the conversation.
                </p>
                <div className="flex flex-col gap-2 mt-8 w-full max-w-md">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-left text-sm rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 px-4 py-3 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "assistant" && (
                    <Image
                      src="/sentry-logo.png"
                      alt=""
                      width={28}
                      height={28}
                      className="size-7 rounded-lg mr-3 mt-1 shrink-0 self-start object-contain"
                    />
                  )}
                  <div
                    className={`max-w-[80%] leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-white text-black rounded-2xl rounded-br-md px-4 py-2.5"
                        : "bg-white/[0.04] border border-white/10 text-white/90 rounded-2xl rounded-tl-md px-4 py-3"
                    }`}
                  >
                    {m.content ||
                      (streaming && i === messages.length - 1 ? (
                        <span className="inline-flex gap-1 py-1">
                          <span className="size-1.5 rounded-full bg-white/50 animate-bounce [animation-delay:-0.3s]" />
                          <span className="size-1.5 rounded-full bg-white/50 animate-bounce [animation-delay:-0.15s]" />
                          <span className="size-1.5 rounded-full bg-white/50 animate-bounce" />
                        </span>
                      ) : null)}
                  </div>
                </div>
              ))
            )}
            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-white/10 px-6 py-4">
          <div className="max-w-3xl mx-auto w-full">
            <div className="flex items-end gap-2 rounded-2xl border border-white/15 bg-white/[0.03] focus-within:border-white/40 transition-colors px-3 py-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                placeholder="Ask about your tools, teams, or where AI could help…"
                className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm placeholder:text-white/30 focus:outline-none max-h-40"
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || streaming}
                className="size-9 shrink-0 rounded-xl bg-white text-black font-medium hover:bg-white/90 disabled:opacity-25 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                aria-label="Send"
              >
                ↑
              </button>
            </div>
            <p className="text-[11px] text-white/25 mt-2 text-center">
              Sentry Assistant can make mistakes. Verify important details.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
