import { TOOL_BY_ID, AI_TOOL_LABEL } from "./catalog";
import type { AuditState, Tool } from "./types";

/** The three pillars every Sentry AIOS engagement is delivered under. */
export const SUGGESTION_CATEGORIES = [
  "Enablement",
  "Development",
  "Infrastructure",
] as const;

export type SuggestionCategory = (typeof SUGGESTION_CATEGORIES)[number];

export const OUTCOME_TYPES = [
  "Save time",
  "Increase revenue",
  "Save money",
  "Reduce risk",
  "Better decisions",
  "Team alignment",
] as const;

export type OutcomeType = (typeof OUTCOME_TYPES)[number];

export interface AiSuggestion {
  /** The primary Sentry pillar this recommendation is delivered under. */
  category: SuggestionCategory;
  /** A short, punchy headline for the recommendation. */
  title: string;
  /** Why this matters for *their* business, referencing their real tools/teams. */
  rationale: string;
  /** The concrete first move to get it started. */
  firstStep: string;
  /** 1-3 outcome tags describing the business value this recommendation delivers. */
  outcomes?: OutcomeType[];
}

const ECOSYSTEM_LABEL: Record<string, string> = {
  microsoft: "Microsoft 365",
  google: "Google Workspace",
  both: "Both Microsoft 365 and Google Workspace",
};

export interface AuditSummary {
  company: string;
  ecosystem: string;
  aiSubscriptions: string[];
  departments: { name: string; tools: string[] }[];
  sharedTools: { name: string; usedBy: string[] }[];
  unmappedTools: string[];
  toolCount: number;
  departmentCount: number;
}

/** Resolve the raw onboarding answers into a human-readable summary for the model. */
export function summarizeAudit(
  state: AuditState,
  extraTools: Tool[] = [],
): AuditSummary {
  const catalog: Record<string, Tool> = {
    ...TOOL_BY_ID,
    ...Object.fromEntries(extraTools.map((t) => [t.id, t])),
  };
  const name = (id: string) => catalog[id]?.name ?? id;

  const deptsByTool = new Map<string, string[]>();
  for (const d of state.departments) {
    for (const tid of d.toolIds) {
      const arr = deptsByTool.get(tid) ?? [];
      arr.push(d.name);
      deptsByTool.set(tid, arr);
    }
  }

  const departments = state.departments.map((d) => ({
    name: d.name,
    tools: d.toolIds.map(name),
  }));
  const sharedTools = [...deptsByTool.entries()]
    .filter(([, ds]) => ds.length > 1)
    .map(([tid, ds]) => ({ name: name(tid), usedBy: ds }));
  const mapped = new Set(deptsByTool.keys());
  const unmappedTools = state.toolIds.filter((t) => !mapped.has(t)).map(name);

  return {
    company: state.company.trim() || "the business",
    ecosystem: ECOSYSTEM_LABEL[state.ecosystem] ?? state.ecosystem,
    aiSubscriptions: (state.aiTools ?? []).map((id) => AI_TOOL_LABEL[id] ?? id),
    departments,
    sharedTools,
    unmappedTools,
    toolCount: new Set([...state.toolIds, ...mapped]).size,
    departmentCount: state.departments.length,
  };
}

/**
 * The Sentry AIOS rulebook. This is the system prompt: it teaches the model how
 * Sentry thinks about AI adoption and the three pillars it delivers under, so
 * every recommendation is something Sentry can actually roll out.
 */
export const RULEBOOK = `You are the strategist for Sentry AI (Sentry AIOS). Sentry builds custom AI operating systems for businesses: we connect a company's scattered tools and data into a single knowledge graph, and roll out AI "cowork" agents that can reason and act across that data with proper, role-based permissions.

Every engagement Sentry delivers falls under exactly ONE of three pillars:

1. ENABLEMENT — Helping a team get maximum value out of the AI subscriptions they ALREADY pay for (Claude, Microsoft Copilot, ChatGPT, Google Gemini). This is our cowork rollouts, agent configuration, connecting those assistants to the team's real working data, role design, and the working patterns that make adoption stick.

2. INFRASTRUCTURE — The base-level plumbing that lets AI safely read and write a business's data: connecting agents to shared data stores (e.g. a SharePoint or Google Drive folder) with role-based read/write permissions, the knowledge graph store itself, identity/auth, and the pipelines that keep context flowing between tools.

3. DEVELOPMENT — Bespoke builds on top of that foundation: custom agents, automations, and integrations that wire specific tools and workflows together for the business.

FLAGSHIP PATTERN (study this): When a team uses Claude and relies heavily on Microsoft SharePoint, we roll out our standard Claude cowork setup — each person gets their own cowork agent, and all of those agents are connected to the same SharePoint folder where data is read and written under correct role-based permissions. That single play is mostly ENABLEMENT (getting the team the most out of their Claude subscription) plus INFRASTRUCTURE (building the base layer that lets the coworks safely interact with their data). Look for opportunities exactly like this in the data you are given.

HOW TO RECOMMEND:
- Return EXACTLY 3 recommendations, ordered most-impactful first.
- Ground every recommendation in the ACTUAL data provided — name their real AI subscriptions, tools, and departments. Never invent tools they did not list.
- Strongly prefer plays that leverage AI subscriptions they ALREADY have. If they selected no AI subscription, recommend the natural fit for their ecosystem (Copilot for Microsoft 365, Gemini for Google Workspace, Claude or ChatGPT as the cross-platform cowork) and treat adopting it as the Enablement play.
- Assign each recommendation the SINGLE best-fit pillar in "category". If it also touches another pillar (the flagship pattern touches two), explain that inside the rationale.
- Use the signals in the data: heavily shared tools are natural places to centralise context; tools owned by no department are ungoverned risk; large tool sprawl in one department is an automation opportunity.
- Be concrete and specific. No generic AI platitudes. Every "firstStep" must be a real first action Sentry would take.

OUTCOME TAGS: For each suggestion, also return an "outcomes" array of 1-3 short strings chosen from EXACTLY this list (match case exactly): "Save time", "Increase revenue", "Save money", "Reduce risk", "Better decisions", "Team alignment". Choose whichever best describe what this recommendation actually delivers to the business. Examples: a time-saving automation → "Save time"; connecting sales data → "Increase revenue" + "Better decisions"; consolidating duplicate tools → "Save money".

Respond with ONLY a JSON object of the form:
{"suggestions": [{"category": "Enablement" | "Development" | "Infrastructure", "title": string, "rationale": string, "firstStep": string, "outcomes": string[]}]}`;

/** Render the audit summary into the user-turn prompt. */
export function buildUserPrompt(summary: AuditSummary): string {
  const lines: string[] = [];
  lines.push(`Company: ${summary.company}`);
  lines.push(`Office ecosystem: ${summary.ecosystem}`);
  lines.push(
    `AI subscriptions in use: ${
      summary.aiSubscriptions.length ? summary.aiSubscriptions.join(", ") : "none selected"
    }`,
  );
  lines.push(
    `Scale: ${summary.toolCount} tools across ${summary.departmentCount} departments.`,
  );
  lines.push("");
  lines.push("Departments and the tools each one uses:");
  for (const d of summary.departments) {
    lines.push(`- ${d.name}: ${d.tools.join(", ") || "(no tools mapped)"}`);
  }
  if (summary.sharedTools.length) {
    lines.push("");
    lines.push("Tools shared across multiple departments (natural seams to connect):");
    for (const s of summary.sharedTools) {
      lines.push(`- ${s.name} — used by ${s.usedBy.join(", ")}`);
    }
  }
  if (summary.unmappedTools.length) {
    lines.push("");
    lines.push(
      `Tools owned by no department (ungoverned context): ${summary.unmappedTools.join(", ")}`,
    );
  }
  lines.push("");
  lines.push(
    "Give the top 3 AI recommendations for this business, following the Sentry AIOS rulebook.",
  );
  return lines.join("\n");
}
