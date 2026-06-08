# Sentry Knowledge Graph Audit

A free, interactive **knowledge-graph audit** for businesses. A 2-minute onboarding turns a company's tools and departments into a draggable, Obsidian-style knowledge graph, then surfaces an instant audit of where their business context is scattered, siloed, and ready to connect. Built as a flagship marketing tool and top-of-funnel lead magnet for Sentry AI.

## How it works

1. **Ecosystem** — Microsoft 365 or Google Workspace (or both).
2. **Tools** — tick the tools the team uses (catalog + add-your-own).
3. **Departments** — add the teams.
4. **Map** — mark which tools each department uses.

→ The answers render as a force-directed knowledge graph (company → ecosystem → departments → tools), with shared tools highlighted, plus audit insight cards and a Discovery Week CTA.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4
- [`react-force-graph-2d`](https://github.com/vasturiano/react-force-graph) for the interactive graph (d3-force + canvas, the Obsidian-style feel)
- Fully client-side. No backend, no signup, answers stay in the browser.

## Structure

```
src/app/page.tsx                  landing
src/app/audit/page.tsx            wizard -> graph + insights + CTA
src/components/onboarding/wizard  the 4-step onboarding
src/components/graph              the force-graph visualiser (ssr:false)
src/lib/catalog.ts                tool catalog + department suggestions
src/lib/build-graph.ts            answers -> nodes/links + audit insights
src/lib/types.ts
```

## Develop

```bash
npm run dev     # http://localhost:3000
npm run build
```

## Roadmap (v2)

- Claude enrichment: auto-write the audit and suggest where AI plugs in
- Email capture + emailed PDF audit (needs a backend)
- Cytoscape clustering / centrality for "smart" silo detection
- Export graph as image + shareable link
- Per-industry templates and Sentry branding
