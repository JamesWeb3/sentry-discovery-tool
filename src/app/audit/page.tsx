"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Wizard from "@/components/onboarding/wizard";
import KnowledgeGraph from "@/components/graph/knowledge-graph";
import InlineChat from "@/components/graph/inline-chat";
import { buildGraph } from "@/lib/build-graph";
import { EXAMPLE_AUDIT, TOOL_BY_ID, AI_TOOLS } from "@/lib/catalog";
import type { AuditState, GraphData, Insight, Tool } from "@/lib/types";
import type { AiSuggestion, OutcomeType, SuggestionCategory } from "@/lib/ai-suggestions";

const LEGEND = [
  { c: "#ffffff", label: "Your business" },
  { c: "#e2e8f0", label: "Ecosystem" },
  { c: "#a78bfa", label: "Department" },
  { c: "#94a3b8", label: "Tool" },
  { c: "#fbbf24", label: "Shared across teams" },
];

const INSIGHT_KIND: Record<
  Insight["kind"],
  { bar: string; icon: string }
> = {
  scattered: { bar: "bg-white/25",     icon: "⚡" },
  silo:      { bar: "bg-white/25",     icon: "🔒" },
  shared:    { bar: "bg-amber-400/70", icon: "✦" },
  ai:        { bar: "bg-sky-400/70",   icon: "◆" },
};

const CATEGORY_STYLE: Record<SuggestionCategory, { badge: string; dot: string }> = {
  Enablement:     { badge: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200", dot: "bg-emerald-400" },
  Infrastructure: { badge: "border-violet-400/30 bg-violet-400/10 text-violet-200",   dot: "bg-violet-400" },
  Development:    { badge: "border-sky-400/30 bg-sky-400/10 text-sky-200",             dot: "bg-sky-400" },
};

// ── Tool badge helpers ──────────────────────────────────────────────────────

// Custom logos for tools where Google favicon gives a bad result.
const CUSTOM_LOGO: Record<string, string> = { copilot: "/copilot.png" };

// Build an ordered registry of { name, logoSrc } sorted longest→shortest so
// the regex matches "Microsoft 365" before "Microsoft".
const BADGE_REGISTRY: { name: string; logoSrc: string }[] = [
  // Ecosystem aliases first (they won't be in TOOL_BY_ID)
  { name: "Google Workspace",   logoSrc: `https://www.google.com/s2/favicons?domain=google.com&sz=64` },
  { name: "Microsoft 365",      logoSrc: `https://www.google.com/s2/favicons?domain=microsoft.com&sz=64` },
  // AI tools
  ...AI_TOOLS.map((a) => ({
    name: a.label,
    logoSrc: CUSTOM_LOGO[a.id] ?? `https://www.google.com/s2/favicons?domain=${a.domain}&sz=64`,
  })),
  // Regular tools from catalog
  ...Object.values(TOOL_BY_ID).map((t) => ({
    name: t.name,
    logoSrc: CUSTOM_LOGO[t.id] ?? `https://www.google.com/s2/favicons?domain=${t.domain}&sz=64`,
  })),
].sort((a, b) => b.name.length - a.name.length);

// Regex that matches any known tool name (case-insensitive).
const BADGE_NAME_MAP = new Map(BADGE_REGISTRY.map((r) => [r.name.toLowerCase(), r.logoSrc]));
const BADGE_REGEX = new RegExp(
  `(${BADGE_REGISTRY.map((r) => r.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
  "gi",
);

/** Render prose text with any known tool/service names replaced by inline logo badges. */
function TextWithBadges({ text }: { text: string }) {
  const parts = text.split(BADGE_REGEX);
  return (
    <>
      {parts.map((part, i) => {
        const logo = BADGE_NAME_MAP.get(part.toLowerCase());
        if (logo) {
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1 align-middle rounded-md border border-white/10 bg-white/[0.07] px-1.5 py-0.5 mx-0.5 text-xs font-medium text-white/80 whitespace-nowrap"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt="" width={12} height={12} className="rounded-sm shrink-0" />
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ── Outcome badges ──────────────────────────────────────────────────────────

const OUTCOME_CONFIG: Record<OutcomeType, { icon: string; classes: string }> = {
  "Save time":        { icon: "⏱", classes: "border-sky-400/30 bg-sky-400/10 text-sky-200" },
  "Increase revenue": { icon: "↑", classes: "border-emerald-400/35 bg-emerald-400/10 text-emerald-200" },
  "Save money":       { icon: "$", classes: "border-amber-400/30 bg-amber-400/10 text-amber-200" },
  "Reduce risk":      { icon: "⚡", classes: "border-red-400/30 bg-red-400/10 text-red-200" },
  "Better decisions": { icon: "◆", classes: "border-violet-400/30 bg-violet-400/10 text-violet-200" },
  "Team alignment":   { icon: "↔", classes: "border-white/20 bg-white/[0.06] text-white/65" },
};

// ───────────────────────────────────────────────────────────────────────────

type Tab = "graph" | "suggestions" | "simulate";
type Audit = { state: AuditState; extraTools: Tool[] };

export default function AuditPage() {
  const [result, setResult]           = useState<{ graph: GraphData; insights: Insight[] } | null>(null);
  const [audit, setAudit]             = useState<Audit | null>(null);
  const [suggestions, setSuggestions] = useState<AiSuggestion[] | null>(null);
  const [aiStatus, setAiStatus]       = useState<"idle" | "loading" | "error">("idle");
  const [clientId, setClientId]       = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [activeTab, setActiveTab]     = useState<Tab>("graph");

  const clientIdRef = useRef<string | null>(null);
  useEffect(() => { clientIdRef.current = clientId; }, [clientId]);

  const run = useCallback(async (state: AuditState, extraTools: Tool[]) => {
    const graphResult = buildGraph(state, extraTools);
    setResult(graphResult);
    setAudit({ state, extraTools });
    setActiveTab("graph");

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, extraTools, ...graphResult }),
      });
      if (res.ok) {
        const { id } = await res.json();
        setClientId(id);
        window.history.replaceState(null, "", `/audit?client=${id}`);
      }
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("client");

    if (id) {
      setLoading(true);
      fetch(`/api/clients/${id}`)
        .then((r) => r.json())
        .then((data) => {
          setResult({ graph: data.graph, insights: data.insights });
          setAudit({ state: data.state, extraTools: data.extraTools ?? [] });
          if (data.suggestions) { setSuggestions(data.suggestions); setAiStatus("idle"); }
          setClientId(id);
          clientIdRef.current = id;
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else if (/[?&]example/.test(window.location.search)) {
      run(EXAMPLE_AUDIT, []);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!audit || clientIdRef.current) return;
    const controller = new AbortController();
    setAiStatus("loading");
    setSuggestions(null);
    fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(audit),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "failed");
        return res.json();
      })
      .then((data: { suggestions: AiSuggestion[] }) => {
        setSuggestions(data.suggestions);
        setAiStatus("idle");
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setAiStatus("error");
      });
    return () => controller.abort();
  }, [audit]);

  useEffect(() => {
    if (!suggestions || !clientId) return;
    fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestions }),
    }).catch(() => {});
  }, [suggestions, clientId]);

  const reset = () => {
    setResult(null); setAudit(null); setSuggestions(null);
    setAiStatus("idle"); setClientId(null); setActiveTab("graph");
    clientIdRef.current = null;
    window.history.replaceState(null, "", "/audit");
  };

  const retry = () => audit && setAudit({ ...audit });

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 md:py-14">

        {/* Top nav */}
        <div className="flex items-center justify-between mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            <Image src="/sentry-logo.png" alt="Sentry AI" width={20} height={20} className="rounded" />
            <span className="font-serif text-xl text-white/70">Knowledge Graph Audit</span>
          </Link>
          {result && (
            <div className="flex items-center gap-3">
              <Link href="/" className="text-sm text-white/35 hover:text-white/70 transition-colors">
                ← All clients
              </Link>
              <button
                onClick={reset}
                className="text-sm text-white/35 hover:text-white/70 border border-white/10 hover:border-white/25 rounded-lg px-3 py-1.5 transition-all"
              >
                New audit
              </button>
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-24 flex flex-col items-center gap-4 text-white/35">
            <div className="w-5 h-5 border-2 border-white/15 border-t-white/50 rounded-full animate-spin" />
            <p className="text-sm">Loading audit…</p>
          </div>
        )}

        {/* Wizard */}
        {!loading && !result && (
          <div className="mt-4">
            <Wizard onComplete={run} />
          </div>
        )}

        {/* Results */}
        {!loading && result && (
          <div className="flex flex-col gap-0">

            {/* Client + title */}
            <div className="mb-8">
              {audit?.state.company && (
                <p className="text-xs uppercase tracking-[0.2em] text-white/35 mb-2">
                  {audit.state.company}
                </p>
              )}
              <h1 className="text-3xl md:text-4xl font-serif italic text-white leading-tight">
                This is your business as a knowledge graph
              </h1>
            </div>

            {/* Tab bar */}
            <div className="flex items-end gap-0 border-b border-white/10 mb-8">
              <button
                onClick={() => setActiveTab("graph")}
                className={`relative px-5 py-3 text-sm font-medium transition-colors ${
                  activeTab === "graph" ? "text-white" : "text-white/35 hover:text-white/65"
                }`}
              >
                Graph
                {activeTab === "graph" && (
                  <span className="absolute bottom-0 left-0 right-0 h-px bg-white" />
                )}
              </button>

              <button
                onClick={() => setActiveTab("suggestions")}
                className={`relative px-5 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === "suggestions" ? "text-white" : "text-white/35 hover:text-white/65"
                }`}
              >
                Suggestions
                {aiStatus === "loading" && (
                  <span className="flex h-1.5 w-1.5 rounded-full bg-white/40 animate-pulse" />
                )}
                {aiStatus === "idle" && suggestions && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/60">
                    {suggestions.length}
                  </span>
                )}
                {activeTab === "suggestions" && (
                  <span className="absolute bottom-0 left-0 right-0 h-px bg-white" />
                )}
              </button>

              <button
                onClick={() => setActiveTab("simulate")}
                className={`relative px-5 py-3 text-sm font-medium transition-colors ${
                  activeTab === "simulate" ? "text-white" : "text-white/35 hover:text-white/65"
                }`}
              >
                Simulate
                {activeTab === "simulate" && (
                  <span className="absolute bottom-0 left-0 right-0 h-px bg-white" />
                )}
              </button>
            </div>

            {/* ── Graph tab ── */}
            <div className={activeTab === "graph" ? "flex flex-col gap-7" : "hidden"}>
              <KnowledgeGraph data={result.graph} />

              {/* Legend */}
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {LEGEND.map((l) => (
                  <div key={l.label} className="flex items-center gap-2 text-sm text-white/45">
                    <span className="size-2 rounded-full" style={{ background: l.c }} />
                    {l.label}
                  </div>
                ))}
              </div>

              {/* Insights — horizontal stat cards */}
              <div className="flex gap-3 overflow-x-auto pb-1">
                {result.insights.map((ins, i) => {
                  const style = INSIGHT_KIND[ins.kind];
                  return (
                    <div
                      key={i}
                      className="min-w-[210px] flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 flex flex-col gap-3 shrink-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`h-1 w-6 rounded-full ${style.bar}`} />
                        <span className="text-[10px] text-white/30">{style.icon}</span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white leading-snug">
                          {ins.title}
                        </div>
                        <p className="text-xs text-white/40 mt-1.5 leading-relaxed line-clamp-3">
                          {ins.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Suggestions tab ── */}
            <div className={activeTab === "suggestions" ? "flex flex-col gap-6" : "hidden"}>
              <div className="flex items-center gap-2.5">
                <Image src="/sentry-logo.png" alt="" width={18} height={18} className="rounded" />
                <p className="text-sm text-white/45">
                  Sentry&apos;s top 3 AI recommendations — mapped to enablement, infrastructure, and development.
                </p>
              </div>

              {aiStatus === "loading" && (
                <div className="grid md:grid-cols-3 gap-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-5 animate-pulse">
                      <div className="h-5 w-24 rounded-full bg-white/10" />
                      <div className="h-4 w-3/4 rounded bg-white/10 mt-4" />
                      <div className="h-3 w-full rounded bg-white/[0.07] mt-3" />
                      <div className="h-3 w-5/6 rounded bg-white/[0.07] mt-2" />
                    </div>
                  ))}
                </div>
              )}

              {aiStatus === "error" && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 flex items-center justify-between gap-4">
                  <p className="text-sm text-white/50">We couldn&apos;t generate recommendations right now.</p>
                  <button
                    onClick={retry}
                    className="text-sm border border-white/15 rounded-lg px-3 py-1.5 hover:bg-white/5 shrink-0 transition-colors"
                  >
                    Try again
                  </button>
                </div>
              )}

              {suggestions && (
                <div className="grid md:grid-cols-3 gap-4">
                  {suggestions.map((s, i) => {
                    const style = CATEGORY_STYLE[s.category];
                    return (
                      <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-5 flex flex-col gap-3">
                        {/* Category pill */}
                        <span className={`inline-flex items-center gap-1.5 self-start text-xs font-medium border rounded-full px-2.5 py-1 ${style.badge}`}>
                          <span className={`size-1.5 rounded-full ${style.dot}`} />
                          {s.category}
                        </span>

                        {/* Title */}
                        <div className="font-semibold text-white leading-snug">
                          <TextWithBadges text={s.title} />
                        </div>

                        {/* Rationale */}
                        <p className="text-sm text-white/55 leading-relaxed">
                          <TextWithBadges text={s.rationale} />
                        </p>

                        {/* First step */}
                        <div className="pt-3 border-t border-white/10">
                          <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1.5">First step</div>
                          <p className="text-sm text-white/65 leading-relaxed">
                            <TextWithBadges text={s.firstStep} />
                          </p>
                        </div>

                        {/* Outcomes */}
                        {s.outcomes && s.outcomes.length > 0 && (
                          <div className="pt-2.5 border-t border-white/10">
                            <div className="text-[10px] uppercase tracking-widest text-white/30 mb-2">Outcome</div>
                            <div className="flex flex-wrap gap-1.5">
                              {s.outcomes.map((outcome) => {
                                const cfg = OUTCOME_CONFIG[outcome];
                                if (!cfg) return null;
                                return (
                                  <span
                                    key={outcome}
                                    className={`inline-flex items-center gap-1 text-xs font-medium border rounded-full px-2.5 py-1 ${cfg.classes}`}
                                  >
                                    <span className="text-[10px]">{cfg.icon}</span>
                                    {outcome}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Simulate tab ── */}
            <div className={activeTab === "simulate" ? "block" : "hidden"}>
              {audit && <InlineChat audit={audit} />}
            </div>

          </div>
        )}
      </div>
    </main>
  );
}
