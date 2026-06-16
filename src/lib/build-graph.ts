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

  // ---- Radial "wheel" layout ---------------------------------------------
  // Pin the structural nodes into clean concentric rings so the graph reads as
  // an orchestrated wheel instead of an organic (overlapping) cloud: company at
  // the hub, ecosystems/departments on inner rings, each department's own tools
  // fanned into its angular wedge, widely-shared tools on a ring between the
  // departments, and the tiny context dots left to halo their tool.
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const pin = (id: string, r: number, a: number) => {
    const n = byId.get(id);
    if (!n) return;
    n.x = n.fx = Math.cos(a) * r;
    n.y = n.fy = Math.sin(a) * r;
  };
  const TOP = -Math.PI / 2; // first spoke points to 12 o'clock

  pin(companyId, 0, 0);

  const deptN = Math.max(1, state.departments.length);
  const deptAngle = new Map<string, number>();
  state.departments.forEach((d, i) => {
    const a = TOP + (2 * Math.PI * i) / deptN;
    deptAngle.set(d.id, a);
    pin(`dept:${d.id}`, 210, a);
  });

  ecosystems.forEach((eco, i) => {
    pin(`eco:${eco}`, 95, TOP + (2 * Math.PI * (i + 0.5)) / ecosystems.length);
  });

  // Which departments touch each tool
  const toolDepts = new Map<string, string[]>();
  for (const d of state.departments) {
    for (const tid of d.toolIds) {
      const arr = toolDepts.get(tid) ?? [];
      arr.push(d.id);
      toolDepts.set(tid, arr);
    }
  }

  const singleByDept = new Map<string, string[]>();
  const sharedTools: string[] = [];
  for (const [tid, ds] of toolDepts) {
    if (ds.length === 1) {
      const arr = singleByDept.get(ds[0]) ?? [];
      arr.push(tid);
      singleByDept.set(ds[0], arr);
    } else {
      sharedTools.push(tid);
    }
  }

  // A department's own tools fan out across its wedge, just past the dept node.
  const halfWedge = (Math.PI / deptN) * 0.85;
  for (const [dId, tids] of singleByDept) {
    const base = deptAngle.get(dId) ?? TOP;
    tids.forEach((tid, j) => {
      const a =
        tids.length === 1
          ? base
          : base - halfWedge + (2 * halfWedge * j) / (tids.length - 1);
      pin(`tool:${tid}`, 360, a);
    });
  }

  // Shared tools sit on a ring between the departments. Order them by the mean
  // angle of the departments that use them, then space them evenly so that
  // near-universal tools (whose mean angle is ambiguous) never pile up.
  const meanAngle = (ids: string[]) => {
    let sx = 0;
    let sy = 0;
    for (const id of ids) {
      const a = deptAngle.get(id) ?? 0;
      sx += Math.cos(a);
      sy += Math.sin(a);
    }
    return Math.atan2(sy, sx);
  };
  sharedTools
    .sort((a, b) => meanAngle(toolDepts.get(a)!) - meanAngle(toolDepts.get(b)!))
    .forEach((tid, i) => {
      pin(`tool:${tid}`, 300, TOP + (2 * Math.PI * i) / sharedTools.length);
    });

  // Tools selected but never mapped to a team float on the outer ring.
  const unmapped = state.toolIds.filter((t) => !deptCount.has(t));
  unmapped.forEach((tid, i) => {
    pin(`tool:${tid}`, 415, TOP + (2 * Math.PI * i) / Math.max(1, unmapped.length));
  });

  // Seed context dots in a tight phyllotaxis spiral around their tool so the
  // force pass only has to relax them into a clean halo (they stay unpinned).
  const ctxSeen = new Map<string, number>();
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  for (const n of nodes) {
    if (n.type !== "context") continue;
    const rest = n.id.slice(4); // drop "ctx:"
    const toolId = rest.slice(0, rest.lastIndexOf(":"));
    const parent = byId.get(`tool:${toolId}`);
    if (parent?.fx == null || parent.fy == null) continue;
    const k = ctxSeen.get(toolId) ?? 0;
    ctxSeen.set(toolId, k + 1);
    const rr = 6 + 3.2 * Math.sqrt(k);
    n.x = parent.fx + Math.cos(k * GOLDEN) * rr;
    n.y = parent.fy + Math.sin(k * GOLDEN) * rr;
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
