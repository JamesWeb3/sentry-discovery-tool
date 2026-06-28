"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import Image from "next/image";
import { TOOL_BY_ID, AI_TOOLS } from "@/lib/catalog";
import type { AuditState, Tool } from "@/lib/types";

type Msg = { role: "user" | "assistant"; content: string };
type ToolItem = { id: string; name: string; domain: string; category: string };
type AiItem = { id: string; label: string; domain: string };

const AI_BY_ID = Object.fromEntries(AI_TOOLS.map((a) => [a.id, a]));
const CUSTOM_LOGO: Record<string, string> = { copilot: "/copilot.png" };
const getAiLogo = (id: string, domain: string) =>
  CUSTOM_LOGO[id] ?? `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
const favicon = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

const AI_THEME: Record<
  string,
  { name: string; activePill: string; headerAccent: string; bubbleBg: string; inputBorder: string; inputFocus: string; glow: string }
> = {
  claude: {
    name: "Claude",
    activePill: "border-violet-400/70 bg-violet-400/20 text-violet-100",
    headerAccent: "border-violet-500/20 bg-violet-950/30",
    bubbleBg: "bg-violet-950/50 border border-violet-500/20 text-white/90 rounded-2xl rounded-tl-md px-4 py-3",
    inputBorder: "border-violet-500/30",
    inputFocus: "focus-within:border-violet-400/60",
    glow: "shadow-[0_0_80px_rgba(139,92,246,0.08)]",
  },
  chatgpt: {
    name: "ChatGPT",
    activePill: "border-emerald-400/70 bg-emerald-400/15 text-emerald-100",
    headerAccent: "border-emerald-500/20 bg-emerald-950/25",
    bubbleBg: "bg-emerald-950/40 border border-emerald-500/20 text-white/90 rounded-2xl rounded-tl-md px-4 py-3",
    inputBorder: "border-emerald-500/30",
    inputFocus: "focus-within:border-emerald-400/60",
    glow: "shadow-[0_0_80px_rgba(52,211,153,0.07)]",
  },
  copilot: {
    name: "Microsoft Copilot",
    activePill: "border-blue-400/70 bg-blue-400/15 text-blue-100",
    headerAccent: "border-blue-500/20 bg-blue-950/25",
    bubbleBg: "bg-blue-950/40 border border-blue-500/20 text-white/90 rounded-2xl rounded-tl-md px-4 py-3",
    inputBorder: "border-blue-500/30",
    inputFocus: "focus-within:border-blue-400/60",
    glow: "shadow-[0_0_80px_rgba(59,130,246,0.09)]",
  },
  gemini: {
    name: "Google Gemini",
    activePill: "border-sky-400/70 bg-sky-400/15 text-sky-100",
    headerAccent: "border-sky-500/20 bg-sky-950/25",
    bubbleBg: "bg-sky-950/40 border border-sky-500/20 text-white/90 rounded-2xl rounded-tl-md px-4 py-3",
    inputBorder: "border-sky-500/30",
    inputFocus: "focus-within:border-sky-400/60",
    glow: "shadow-[0_0_80px_rgba(56,189,248,0.07)]",
  },
};

const DEFAULT_THEME = {
  name: "Sentry AI",
  activePill: "border-white/40 bg-white/10 text-white",
  headerAccent: "border-white/10 bg-white/[0.04]",
  bubbleBg: "bg-white/[0.05] border border-white/10 text-white/90 rounded-2xl rounded-tl-md px-4 py-3",
  inputBorder: "border-white/15",
  inputFocus: "focus-within:border-white/40",
  glow: "",
};

const STARTERS = [
  "What's our biggest context gap right now?",
  "Which teams are the most information-siloed?",
  "Where should we start with AI automation?",
  "Show me a cross-tool view of last quarter.",
];

export default function InlineChat({
  audit,
}: {
  audit: { state: AuditState; extraTools: Tool[] };
}) {
  const [activeAi, setActiveAi] = useState<string | null>(
    audit.state.aiTools?.[0] ?? null,
  );
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [querying, setQuerying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstChunkRef = useRef(false);

  const theme = activeAi ? (AI_THEME[activeAi] ?? DEFAULT_THEME) : DEFAULT_THEME;

  const aiItems: AiItem[] = useMemo(
    () =>
      (audit.state.aiTools ?? []).map((id) => ({
        id,
        label: AI_BY_ID[id]?.label ?? id,
        domain: AI_BY_ID[id]?.domain ?? "",
      })),
    [audit],
  );

  const toolItems: ToolItem[] = useMemo(() => {
    const catalog: Record<string, Tool> = {
      ...TOOL_BY_ID,
      ...Object.fromEntries(audit.extraTools.map((t) => [t.id, t])),
    };
    return audit.state.toolIds.map((id) => ({
      id,
      name: catalog[id]?.name ?? id,
      domain: catalog[id]?.domain ?? "",
      category: (catalog[id] as { category?: string })?.category ?? "Tool",
    }));
  }, [audit]);

  const activeToolItems = toolItems.filter((t) => selectedTools.has(t.id));

  const toggleTool = (id: string) =>
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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
    firstChunkRef.current = false;
    if (activeToolItems.length > 0) setQuerying(true);

    const context = {
      company: audit.state.company,
      ecosystem: audit.state.ecosystem,
      activeAi: activeAi ? (AI_THEME[activeAi]?.name ?? activeAi) : undefined,
      tools: activeToolItems.map((t) => ({ name: t.name, category: t.category })),
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
        if (!firstChunkRef.current) { firstChunkRef.current = true; setQuerying(false); }
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { ...last, content: last.content + chunk };
          return copy;
        });
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setQuerying(false);
      setMessages((prev) => {
        const copy = [...prev];
        if (copy[copy.length - 1]?.role === "assistant" && !copy[copy.length - 1].content) copy.pop();
        return copy;
      });
    } finally {
      setStreaming(false);
      setQuerying(false);
    }
  };

  const avatarSrc = activeAi
    ? getAiLogo(activeAi, AI_BY_ID[activeAi]?.domain ?? "")
    : "/sentry-logo.png";

  return (
    /* ── Two-column shell ───────────────────────────────────────────────── */
    <div
      className={`flex rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden transition-shadow duration-500 ${theme.glow}`}
      style={{ minHeight: 560 }}
    >
      {/* ── Left panel: context selectors (≈1/4 width) ─────────────────── */}
      <div className="w-[220px] shrink-0 border-r border-white/10 flex flex-col gap-7 p-5 overflow-y-auto bg-black/10">

        {/* AI Provider */}
        <div className="flex flex-col gap-3">
          <span className="text-[10px] uppercase tracking-[0.15em] text-white/35 font-semibold">
            AI Provider
          </span>
          <div className="flex flex-col gap-1.5">
            {aiItems.map((ai) => {
              const active = activeAi === ai.id;
              const t = AI_THEME[ai.id];
              return (
                <button
                  key={ai.id}
                  onClick={() => setActiveAi(active ? null : ai.id)}
                  className={`w-full flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-sm font-medium transition-all text-left ${
                    active
                      ? (t?.activePill ?? "border-white/40 bg-white/10 text-white")
                      : "border-white/8 text-white/50 hover:border-white/20 hover:text-white/75 bg-transparent"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getAiLogo(ai.id, ai.domain)}
                    alt=""
                    width={16}
                    height={16}
                    className="rounded-sm shrink-0"
                  />
                  <span className="flex-1 truncate text-xs">{ai.label}</span>
                  {active && <span className="size-1.5 shrink-0 rounded-full bg-current opacity-60" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Connected Tools */}
        {toolItems.length > 0 && (
          <div className="flex flex-col gap-3">
            <div>
              <span className="text-[10px] uppercase tracking-[0.15em] text-white/35 font-semibold">
                Tools
              </span>
              <span className="ml-1.5 text-[10px] text-white/20">
                {selectedTools.size}/{toolItems.length}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {toolItems.map((t) => {
                const active = selectedTools.has(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTool(t.id)}
                    className={`w-full flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-all text-left ${
                      active
                        ? "border-white/25 bg-white/[0.08] text-white"
                        : "border-transparent text-white/40 hover:border-white/10 hover:text-white/65"
                    }`}
                  >
                    {t.domain && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={favicon(t.domain)} alt="" width={12} height={12} className="rounded-sm shrink-0" />
                    )}
                    <span className="flex-1 truncate">{t.name}</span>
                    <span
                      className={`size-3.5 shrink-0 rounded-sm border flex items-center justify-center text-[9px] transition-all ${
                        active ? "border-white/40 bg-white text-black" : "border-white/15 text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Right panel: chat (≈3/4 width) ──────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Provider header bar */}
        {activeAi && (
          <div className={`flex items-center gap-2.5 px-5 py-3 border-b ${theme.headerAccent}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={getAiLogo(activeAi, AI_BY_ID[activeAi]?.domain ?? "")} alt="" width={16} height={16} className="rounded-sm" />
            <span className="text-xs text-white/50">
              Simulating{" "}
              <span className="text-white/80 font-semibold">{theme.name}</span> agent
              {activeToolItems.length > 0 && (
                <> with {activeToolItems.length} connected tool{activeToolItems.length !== 1 ? "s" : ""}</>
              )}
            </span>
            {activeToolItems.length > 0 && (
              <div className="ml-auto flex items-center gap-1 flex-wrap justify-end">
                {activeToolItems.slice(0, 8).map((t) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={t.id} src={favicon(t.domain)} alt={t.name} title={t.name} width={13} height={13} className="rounded-sm opacity-50" />
                ))}
                {activeToolItems.length > 8 && (
                  <span className="text-[10px] text-white/25">+{activeToolItems.length - 8}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ maxHeight: 480 }}>
          <div className="px-6 py-6 flex flex-col gap-5">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center text-center py-10 gap-5">
                {activeAi ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getAiLogo(activeAi, AI_BY_ID[activeAi]?.domain ?? "")} alt="" width={36} height={36} className="rounded-xl opacity-70" />
                ) : (
                  <Image src="/sentry-logo.png" alt="" width={32} height={32} className="rounded-xl opacity-50" />
                )}
                <div>
                  <p className="text-sm font-semibold text-white/70">
                    {activeAi ? `Simulate ${theme.name} across your stack` : "Select an AI provider to begin"}
                  </p>
                  <p className="text-xs text-white/35 mt-1">
                    {activeToolItems.length > 0
                      ? `${activeToolItems.length} tool${activeToolItems.length !== 1 ? "s" : ""} connected — ask anything`
                      : "Select tools on the left to include them in reasoning"}
                  </p>
                </div>
                {activeAi && (
                  <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
                    {STARTERS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="text-left text-xs rounded-xl border border-white/10 bg-white/[0.025] hover:bg-white/[0.055] hover:border-white/20 px-3.5 py-3 text-white/55 hover:text-white/80 transition-all leading-relaxed"
                      >
                        &ldquo;{s}&rdquo;
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              messages.map((m, i) => {
                const isLast = i === messages.length - 1;
                const isQueryingMsg = m.role === "assistant" && !m.content && querying && isLast;
                const isTypingMsg   = m.role === "assistant" && !m.content && streaming && !querying && isLast;

                return (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    {m.role === "assistant" && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarSrc} alt="" width={22} height={22} className="size-[22px] rounded-lg mr-2.5 mt-0.5 shrink-0 self-start object-contain" />
                    )}

                    {isQueryingMsg ? (
                      <div className="flex flex-col gap-2.5 py-1">
                        <div className="flex items-center gap-1.5 text-xs text-white/40">
                          <svg className="size-3 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" />
                          </svg>
                          Querying connected tools
                        </div>
                        {activeToolItems.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {activeToolItems.map((t, ti) => (
                              <div
                                key={t.id}
                                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/45 animate-pulse"
                                style={{ animationDelay: `${ti * 80}ms` }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={favicon(t.domain)} alt="" width={12} height={12} className="rounded-sm" />
                                {t.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : isTypingMsg ? (
                      <span className="inline-flex gap-1 py-2">
                        <span className="size-1.5 rounded-full bg-white/50 animate-bounce [animation-delay:-0.3s]" />
                        <span className="size-1.5 rounded-full bg-white/50 animate-bounce [animation-delay:-0.15s]" />
                        <span className="size-1.5 rounded-full bg-white/50 animate-bounce" />
                      </span>
                    ) : m.role === "assistant" ? (
                      <div className="flex flex-col gap-2 max-w-[85%]">
                        {activeToolItems.length > 0 && m.content && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {activeToolItems.slice(0, 8).map((t) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={t.id} src={favicon(t.domain)} alt={t.name} title={t.name} width={13} height={13} className="rounded-sm opacity-35" />
                            ))}
                            <span className="text-[10px] text-white/25">{activeToolItems.length} source{activeToolItems.length !== 1 ? "s" : ""}</span>
                          </div>
                        )}
                        <div className={`text-sm leading-relaxed whitespace-pre-wrap ${theme.bubbleBg}`}>
                          {m.content}
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap bg-white text-black rounded-2xl rounded-br-md px-4 py-2.5">
                        {m.content}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            {error && <p className="text-xs text-red-400 text-center">{error}</p>}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-white/10 px-5 py-3.5 bg-black/15">
          <div className={`flex items-end gap-2 rounded-xl border bg-black/30 transition-colors px-3 py-2 ${theme.inputBorder} ${theme.inputFocus}`}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
              }}
              rows={1}
              placeholder={activeAi ? `Ask ${theme.name} anything about your stack…` : "Select an AI provider to start…"}
              disabled={!activeAi}
              className="flex-1 resize-none bg-transparent px-1 py-1 text-sm placeholder:text-white/25 focus:outline-none max-h-28 disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || streaming || !activeAi}
              className="size-8 shrink-0 rounded-lg bg-white text-black font-bold hover:bg-white/90 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center justify-center"
              aria-label="Send"
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
