"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Wizard from "@/components/onboarding/wizard";
import KnowledgeGraph from "@/components/graph/knowledge-graph";
import { buildGraph } from "@/lib/build-graph";
import { EXAMPLE_AUDIT } from "@/lib/catalog";
import type { AuditState, GraphData, Insight, Tool } from "@/lib/types";
import type { AiSuggestion, SuggestionCategory } from "@/lib/ai-suggestions";

const LEGEND = [
  { c: "#ffffff", label: "Your business" },
  { c: "#e2e8f0", label: "Ecosystem" },
  { c: "#a78bfa", label: "Department" },
  { c: "#94a3b8", label: "Tool" },
  { c: "#fbbf24", label: "Shared across teams" },
];

const INSIGHT_ACCENT: Record<Insight["kind"], string> = {
  scattered: "border-white/10 bg-white/[0.03]",
  silo: "border-white/10 bg-white/[0.03]",
  shared: "border-amber-400/20 bg-amber-400/[0.05]",
  ai: "border-white/25 bg-white/[0.07]",
};

// Each Sentry pillar gets its own accent so the roadmap reads at a glance.
const CATEGORY_STYLE: Record<
  SuggestionCategory,
  { badge: string; dot: string; blurb: string }
> = {
  Enablement: {
    badge: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    dot: "bg-emerald-400",
    blurb: "Get more from the AI you already pay for",
  },
  Infrastructure: {
    badge: "border-violet-400/30 bg-violet-400/10 text-violet-200",
    dot: "bg-violet-400",
    blurb: "The base layer that lets AI use your data safely",
  },
  Development: {
    badge: "border-sky-400/30 bg-sky-400/10 text-sky-200",
    dot: "bg-sky-400",
    blurb: "Custom agents and automations built on top",
  },
};

type Audit = { state: AuditState; extraTools: Tool[] };

export default function AuditPage() {
  const [result, setResult] = useState<{
    graph: GraphData;
    insights: Insight[];
  } | null>(null);
  const [audit, setAudit] = useState<Audit | null>(null);

  const [suggestions, setSuggestions] = useState<AiSuggestion[] | null>(null);
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "error">("idle");

  const run = useCallback((state: AuditState, extraTools: Tool[]) => {
    setResult(buildGraph(state, extraTools));
    setAudit({ state, extraTools });
  }, []);

  // Auto-load the example when arriving from the homepage button (/audit?example=1)
  useEffect(() => {
    if (typeof window !== "undefined" && /[?&]example/.test(window.location.search)) {
      run(EXAMPLE_AUDIT, []);
    }
  }, [run]);

  // Ask Sentry's AI for its top 3 recommendations whenever a fresh audit is built.
  useEffect(() => {
    if (!audit) return;
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

  const reset = () => {
    setResult(null);
    setAudit(null);
    setSuggestions(null);
    setAiStatus("idle");
  };

  const retry = () => audit && setAudit({ ...audit });

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-16 md:py-24">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/45 hover:text-white"
        >
          <Image src="/sentry-logo.png" alt="Sentry AI" width={22} height={22} className="rounded" />
          Knowledge Graph Audit
        </Link>

        {!result ? (
          <div className="mt-12">
            <Wizard onComplete={run} />
          </div>
        ) : (
          <div className="mt-10 flex flex-col gap-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-white/45">
                  Your audit
                </div>
                <h1 className="text-3xl md:text-4xl font-semibold mt-2">
                  This is your business as a knowledge graph
                </h1>
                <p className="text-white/50 mt-2 max-w-2xl">
                  Drag the nodes around, zoom in, explore. Every connection is a place
                  your business context lives today.
                </p>
              </div>
              <button
                onClick={reset}
                className="text-sm text-white/50 hover:text-white border border-white/15 rounded-lg px-3 py-1.5"
              >
                Start over
              </button>
            </div>

            <KnowledgeGraph data={result.graph} />

            {/* Legend */}
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {LEGEND.map((l) => (
                <div key={l.label} className="flex items-center gap-2 text-sm text-white/55">
                  <span className="size-2.5 rounded-full" style={{ background: l.c }} />
                  {l.label}
                </div>
              ))}
            </div>

            {/* Insights */}
            <div>
              <h2 className="text-xl font-semibold mb-4">What the graph reveals</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {result.insights.map((ins, i) => (
                  <div
                    key={i}
                    className={`rounded-xl border p-5 ${INSIGHT_ACCENT[ins.kind]}`}
                  >
                    <div className="font-semibold text-white">{ins.title}</div>
                    <p className="text-sm text-white/55 mt-1.5 leading-relaxed">
                      {ins.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI recommendations */}
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <Image src="/sentry-logo.png" alt="" width={20} height={20} className="rounded" />
                <h2 className="text-xl font-semibold">Sentry&apos;s top 3 AI recommendations</h2>
              </div>
              <p className="text-white/45 text-sm mb-4">
                Where we&apos;d start, mapped to how Sentry delivers: enablement,
                development, and infrastructure.
              </p>

              {aiStatus === "loading" && (
                <div className="grid md:grid-cols-3 gap-4">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-5 animate-pulse"
                    >
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
                  <p className="text-sm text-white/55">
                    We couldn&apos;t generate recommendations just now.
                  </p>
                  <button
                    onClick={retry}
                    className="text-sm border border-white/15 rounded-lg px-3 py-1.5 hover:bg-white/5 shrink-0"
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
                      <div
                        key={i}
                        className="rounded-xl border border-white/10 bg-white/[0.03] p-5 flex flex-col gap-3"
                      >
                        <span
                          className={`inline-flex items-center gap-1.5 self-start text-xs font-medium border rounded-full px-2.5 py-1 ${style.badge}`}
                        >
                          <span className={`size-1.5 rounded-full ${style.dot}`} />
                          {s.category}
                        </span>
                        <div className="font-semibold text-white leading-snug">{s.title}</div>
                        <p className="text-sm text-white/55 leading-relaxed">{s.rationale}</p>
                        <div className="mt-auto pt-2 border-t border-white/10">
                          <div className="text-xs uppercase tracking-wider text-white/35 mb-1">
                            First step
                          </div>
                          <p className="text-sm text-white/70 leading-relaxed">{s.firstStep}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
