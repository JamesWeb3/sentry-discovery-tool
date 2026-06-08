"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { GraphData, GraphNode } from "@/lib/types";

// react-force-graph touches `window`, so it must never render on the server.
// Typed loosely because the dynamic import drops the lib's prop/ref types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
}) as any;

const COLORS = {
  company: "#ffffff", // white hub
  department: "#a78bfa", // violet
  toolShared: "#fbbf24", // amber
  context: "#64748b", // slate
} as const;

type PaintNode = GraphNode & { x: number; y: number };
type PaintLink = { kind: string; source: string | { id: string }; target: string | { id: string } };

const linkEndId = (x: string | { id: string }) => (typeof x === "string" ? x : x.id);

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default function KnowledgeGraph({ data }: { data: GraphData }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  const fitted = useRef(false);
  const logos = useRef<Map<string, HTMLImageElement>>(new Map());
  const requested = useRef<Set<string>>(new Set());
  const [size, setSize] = useState({ width: 800, height: 560 });
  const [isFull, setIsFull] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [focusSet, setFocusSet] = useState<Set<string> | null>(null);

  // Preload brand logos (Clearbit, falling back to Google favicons).
  useEffect(() => {
    for (const n of data.nodes) {
      const domain = n.domain;
      if (!domain || requested.current.has(domain)) continue;
      requested.current.add(domain);
      const img = new Image();
      img.onload = () => logos.current.set(domain, img);
      img.onerror = () => {
        const fav = new Image();
        fav.onload = () => logos.current.set(domain, fav);
        fav.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      };
      img.src = `https://logo.clearbit.com/${domain}`;
    }
  }, [data]);

  // Size to container (also fires on fullscreen enter/exit)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ width: Math.max(320, r.width), height: Math.max(420, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Tune the forces: organic spread, loose context clusters.
  useEffect(() => {
    fitted.current = false;
    let tries = 0;
    const id = setInterval(() => {
      const fg = fgRef.current;
      tries++;
      if (fg?.d3Force) {
        fg.d3Force("charge")?.strength(-78);
        const link = fg.d3Force("link");
        if (link) {
          link.distance((l: PaintLink) =>
            l.kind === "context"
              ? 36
              : l.kind === "access"
                ? 66
                : l.kind === "tool" || l.kind === "shared"
                  ? 44
                  : 80,
          );
          link.strength((l: PaintLink) =>
            l.kind === "access"
              ? 0.03
              : l.kind === "context"
                ? 0.2
                : l.kind === "tool" || l.kind === "shared"
                  ? 0.5
                  : 0.35,
          );
        }
        fg.d3ReheatSimulation?.();
        clearInterval(id);
      }
      if (tries > 25) clearInterval(id);
    }, 80);
    return () => clearInterval(id);
  }, [data]);

  // Track fullscreen state
  useEffect(() => {
    const onChange = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const graphData = useMemo(
    () => ({
      nodes: data.nodes.map((n) => ({ ...n })),
      links: data.links.map((l) => ({ ...l })),
    }),
    [data],
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return graphData.nodes
      .filter(
        (n) => (n.type === "tool" || n.type === "department") && n.name.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [query, graphData]);

  const fit = () => fgRef.current?.zoomToFit(600, 70);

  const clearFocus = () => {
    setHighlightId(null);
    setFocusSet(null);
  };

  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else wrapRef.current?.requestFullscreen?.();
  };

  const focusNode = (n: GraphNode & { x?: number; y?: number }) => {
    setHighlightId(n.id);
    const set = new Set<string>([n.id]);
    for (const l of graphData.links) {
      const a = linkEndId(l.source as never);
      const b = linkEndId(l.target as never);
      if (a === n.id) set.add(b);
      else if (b === n.id) set.add(a);
    }
    setFocusSet(set);
    setQuery("");
    if (typeof n.x === "number" && typeof n.y === "number") {
      fgRef.current?.centerAt(n.x, n.y, 700);
      fgRef.current?.zoom(3, 700);
    }
  };

  // The full node painter (early-returns are fine; the wrapper resets alpha).
  const paintNode = (node: PaintNode, ctx: CanvasRenderingContext2D, scale: number) => {
    if (node.id === highlightId) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 24, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = 2.5 / scale;
      ctx.stroke();
    }

    if (node.type === "context") {
      const r = 2.2;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(148,163,184,0.7)";
      ctx.fill();
      if (scale > 2.6) {
        drawLabel(ctx, node.name, node.x, node.y + r + 1.5, scale, "rgba(255,255,255,0.55)", 9);
      }
      return;
    }

    if (node.type === "company") {
      const r = 24;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = COLORS.company;
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.font = `bold ${r}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText((node.name[0] || "?").toUpperCase(), node.x, node.y + 1);
      drawLabel(ctx, node.name, node.x, node.y + r + 4, scale, "#fff", 13, true);
      return;
    }

    if (node.type === "department") {
      const r = 13;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(167,139,250,0.2)";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = COLORS.department;
      ctx.stroke();
      drawLabel(ctx, node.name, node.x, node.y + r + 4, scale, "#e9d5ff", 12, true);
      return;
    }

    // tool + ecosystem render as app-style logo tiles
    const img = node.domain ? logos.current.get(node.domain) : undefined;
    const hasImg = !!img && img.complete && img.naturalWidth > 0;
    const box = node.type === "ecosystem" ? 42 : node.shared ? 32 : 27;
    const half = box / 2;
    const radius = box * 0.24;

    if (node.shared) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, half + 4, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(251,191,36,0.16)";
      ctx.fill();
    }

    ctx.save();
    roundRectPath(ctx, node.x - half, node.y - half, box, box, radius);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    if (node.shared) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = COLORS.toolShared;
      ctx.stroke();
    }
    ctx.clip();
    if (hasImg) {
      const pad = box * 0.16;
      ctx.drawImage(img!, node.x - half + pad, node.y - half + pad, box - pad * 2, box - pad * 2);
    } else {
      ctx.fillStyle = "#1e293b";
      ctx.font = `bold ${box * 0.5}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText((node.name[0] || "?").toUpperCase(), node.x, node.y + 1);
    }
    ctx.restore();

    if (node.type === "ecosystem" || node.shared || scale > 1.3) {
      drawLabel(ctx, node.name, node.x, node.y + half + 3, scale, "rgba(255,255,255,0.8)", 11, node.type === "ecosystem");
    }
  };

  return (
    <div
      ref={wrapRef}
      className={`relative overflow-hidden bg-[#070707] ${
        isFull
          ? "w-screen h-screen rounded-none"
          : "w-full h-[64vh] min-h-[460px] rounded-2xl border border-white/10"
      }`}
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.05), transparent 60%)",
      }}
    >
      <ForceGraph2D
        ref={fgRef}
        width={size.width}
        height={size.height}
        graphData={graphData}
        backgroundColor="rgba(0,0,0,0)"
        cooldownTicks={220}
        nodeRelSize={4}
        nodeVal={(n: GraphNode) => n.val}
        nodeLabel={(n: GraphNode) => n.name}
        enableNodeDrag
        onBackgroundClick={clearFocus}
        onEngineStop={() => {
          if (!fitted.current) {
            fit();
            fitted.current = true;
          }
        }}
        linkColor={(l: PaintLink) => {
          if (highlightId) {
            const a = linkEndId(l.source);
            const b = linkEndId(l.target);
            if (a !== highlightId && b !== highlightId) return "rgba(255,255,255,0.02)";
          }
          return l.kind === "shared"
            ? "rgba(251,191,36,0.4)"
            : l.kind === "access"
              ? "rgba(255,255,255,0.04)"
              : l.kind === "context"
                ? "rgba(255,255,255,0.08)"
                : "rgba(255,255,255,0.12)";
        }}
        linkWidth={(l: PaintLink) =>
          l.kind === "shared" ? 1.4 : l.kind === "access" ? 0.3 : l.kind === "context" ? 0.45 : 0.9
        }
        nodeCanvasObjectMode={() => "replace"}
        nodeCanvasObject={(node: PaintNode, ctx: CanvasRenderingContext2D, scale: number) => {
          const dim = focusSet ? !focusSet.has(node.id) : false;
          ctx.globalAlpha = dim ? 0.08 : 1;
          paintNode(node, ctx, scale);
          ctx.globalAlpha = 1;
        }}
      />

      {/* Search (top-left) */}
      <div className="absolute top-3 left-3 w-64 max-w-[70vw]">
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (focusSet) clearFocus();
            }}
            placeholder="Search tools or departments…"
            className="w-full rounded-lg bg-black/60 backdrop-blur border border-white/15 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/45"
          />
          {focusSet && (
            <button
              onClick={clearFocus}
              className="text-xs text-white/60 hover:text-white border border-white/15 bg-black/50 backdrop-blur rounded-lg px-2.5 py-2 shrink-0"
            >
              Clear
            </button>
          )}
        </div>
        {matches.length > 0 && (
          <div className="mt-1 rounded-lg bg-black/80 backdrop-blur border border-white/10 overflow-hidden">
            {matches.map((m) => (
              <button
                key={m.id}
                onClick={() => focusNode(m)}
                className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/10 flex items-center gap-2"
              >
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ background: m.type === "department" ? COLORS.department : "#e2e8f0" }}
                />
                {m.name}
                <span className="ml-auto text-xs text-white/35">{m.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Controls (bottom-right) */}
      <div className="absolute bottom-3 right-3 flex gap-2">
        <button
          onClick={fit}
          className="text-xs text-white/60 hover:text-white border border-white/15 bg-black/40 backdrop-blur rounded-lg px-3 py-1.5"
        >
          Re-center
        </button>
        <button
          onClick={toggleFull}
          className="text-xs text-white/60 hover:text-white border border-white/15 bg-black/40 backdrop-blur rounded-lg px-3 py-1.5"
        >
          {isFull ? "Exit full screen" : "Full screen"}
        </button>
      </div>
    </div>
  );
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  scale: number,
  color: string,
  px: number,
  bold = false,
) {
  const fontSize = Math.max(px / scale, 1.2);
  ctx.font = `${bold ? "600 " : ""}${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
