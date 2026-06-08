"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Wizard from "@/components/onboarding/wizard";
import KnowledgeGraph from "@/components/graph/knowledge-graph";
import { buildGraph } from "@/lib/build-graph";
import { EXAMPLE_AUDIT } from "@/lib/catalog";
import type { GraphData, Insight } from "@/lib/types";

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

export default function AuditPage() {
  const [result, setResult] = useState<{
    graph: GraphData;
    insights: Insight[];
  } | null>(null);

  // Auto-load the example when arriving from the homepage button (/audit?example=1)
  useEffect(() => {
    if (typeof window !== "undefined" && /[?&]example/.test(window.location.search)) {
      setResult(buildGraph(EXAMPLE_AUDIT));
    }
  }, []);

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
            <Wizard onComplete={(state, extra) => setResult(buildGraph(state, extra))} />
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
                onClick={() => setResult(null)}
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
          </div>
        )}
      </div>
    </main>
  );
}
