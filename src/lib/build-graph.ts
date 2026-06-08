import { TOOL_BY_ID, contextFor } from "./catalog";
import type { AuditState, GraphData, GraphNode, GraphLink, Insight, Tool } from "./types";

const ECOSYSTEM_LABEL: Record<string, string> = {
  microsoft: "Microsoft 365",
  google: "Google Workspace",
};

/** Turn the onboarding answers into a graph plus a set of audit insights. */
export function buildGraph(
  state: AuditState,
  extraTools: Tool[] = [],
): {
  graph: GraphData;
  insights: Insight[];
} {
  const catalog: Record<string, Tool> = {
    ...TOOL_BY_ID,
    ...Object.fromEntries(extraTools.map((t) => [t.id, t])),
  };
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const seen = new Set<string>();

  const add = (n: GraphNode) => {
    if (seen.has(n.id)) return;
    seen.add(n.id);
    nodes.push(n);
  };

  // Company hub
  const companyId = "company";
  add({
    id: companyId,
    name: state.company.trim() || "Your business",
    type: "company",
    val: 26,
  });

  // Ecosystem hub(s)
  const ecosystems =
    state.ecosystem === "both" ? (["microsoft", "google"] as const) : [state.ecosystem];
  for (const eco of ecosystems) {
    add({
      id: `eco:${eco}`,
      name: ECOSYSTEM_LABEL[eco],
      type: "ecosystem",
      val: 16,
      domain: eco === "microsoft" ? "microsoft.com" : "google.com",
    });
    links.push({ source: companyId, target: `eco:${eco}`, kind: "ecosystem" });
  }

  // How many departments use each tool
  const deptCount = new Map<string, number>();
  for (const dept of state.departments) {
    for (const toolId of dept.toolIds) {
      deptCount.set(toolId, (deptCount.get(toolId) ?? 0) + 1);
    }
  }

  const ensureTool = (toolId: string) => {
    const tool = catalog[toolId];
    const name = tool?.name ?? toolId;
    const count = deptCount.get(toolId) ?? 0;
    if (!seen.has(`tool:${toolId}`)) {
      add({
        id: `tool:${toolId}`,
        name,
        type: "tool",
        category: tool?.category,
        val: 4 + count * 1.5,
        shared: count > 1,
        deptCount: count,
        domain: tool?.domain,
      });
    }
  };

  // Departments + their tools
  for (const dept of state.departments) {
    const deptId = `dept:${dept.id}`;
    add({ id: deptId, name: dept.name, type: "department", val: 11 });
    links.push({ source: companyId, target: deptId, kind: "dept" });
    for (const toolId of dept.toolIds) {
      ensureTool(toolId);
      links.push({
        source: deptId,
        target: `tool:${toolId}`,
        kind: (deptCount.get(toolId) ?? 0) > 1 ? "shared" : "tool",
      });
    }
  }

  // Tools selected but never mapped to a department (ungoverned context)
  for (const toolId of state.toolIds) {
    if (!deptCount.has(toolId)) {
      ensureTool(toolId);
      links.push({ source: companyId, target: `tool:${toolId}`, kind: "tool" });
    }
  }

  // ---- Context sub-nodes: the data that lives inside each tool ----
  const toolNodes = nodes.filter((n) => n.type === "tool");
  const perTool = Math.min(
    20,
    Math.max(8, Math.round(440 / Math.max(1, toolNodes.length))),
  );
  const contextByTool = new Map<string, string[]>();
  for (const tn of toolNodes) {
    const toolId = tn.id.slice("tool:".length);
    const tool = catalog[toolId];
    const labels = (tool ? contextFor(tool) : []).slice(0, perTool);
    const cids: string[] = [];
    labels.forEach((label, i) => {
      const cid = `ctx:${toolId}:${i}`;
      add({ id: cid, name: label, type: "context", val: 1.5, category: tn.category });
      links.push({ source: tn.id, target: cid, kind: "context" });
      cids.push(cid);
    });
    contextByTool.set(toolId, cids);
  }

  // Department -> context access links: which teams reach into which data
  // inside each tool. Thin lines; shared tools draw from multiple departments.
  for (const d of state.departments) {
    const deptId = `dept:${d.id}`;
    for (const toolId of d.toolIds) {
      const cids = contextByTool.get(toolId);
      if (!cids) continue;
      for (const cid of cids) {
        links.push({ source: deptId, target: cid, kind: "access" });
      }
    }
  }

  // ---- Insights ----
  const toolCount = new Set([...state.toolIds, ...deptCount.keys()]).size;
  const departmentCount = state.departments.length;
  const siloed = [...deptCount.entries()].filter(([, c]) => c === 1).length;
  const shared = [...deptCount.entries()].filter(([, c]) => c > 1).length;
  const unmappedCount = state.toolIds.filter((t) => !deptCount.has(t)).length;

  const insights: Insight[] = [];

  insights.push({
    kind: "scattered",
    title: `Your business runs on ${toolCount} tools across ${departmentCount} ${
      departmentCount === 1 ? "department" : "departments"
    }.`,
    detail:
      "That is where your business context lives. Right now it is scattered across all of them, with no single place to see or query it.",
  });

  if (siloed > 0) {
    insights.push({
      kind: "silo",
      title: `${siloed} ${siloed === 1 ? "tool is" : "tools are"} siloed in a single department.`,
      detail:
        "Knowledge created in these rarely reaches the rest of the business, so the same questions get answered over and over.",
    });
  }

  if (shared > 0) {
    insights.push({
      kind: "shared",
      title: `${shared} ${shared === 1 ? "tool spans" : "tools span"} multiple departments.`,
      detail:
        "These shared tools are the natural seams to connect first when you bring everything into one graph.",
    });
  }

  if (unmappedCount > 0) {
    insights.push({
      kind: "silo",
      title: `${unmappedCount} ${unmappedCount === 1 ? "tool is" : "tools are"} not owned by any department.`,
      detail:
        "Ungoverned tools are where context quietly goes missing. Worth deciding who owns each one.",
    });
  }

  insights.push({
    kind: "ai",
    title: `One knowledge graph could connect all ${toolCount} of these.`,
    detail:
      "So your team, and AI agents, can reason across every department instead of one tool at a time. That is the custom solution we build at Sentry.",
  });

  return { graph: { nodes, links }, insights };
}
