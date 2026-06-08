export type Ecosystem = "microsoft" | "google" | "both";

export type ToolCategory =
  | "Productivity"
  | "Comms"
  | "CRM & Sales"
  | "Finance"
  | "Storage"
  | "Marketing"
  | "Support"
  | "Project & Ops"
  | "Data"
  | "HR"
  | "Other";

export interface Tool {
  id: string;
  name: string;
  category: ToolCategory;
  /** Set when the tool is native to an ecosystem (M365 / Google Workspace). */
  ecosystem?: "microsoft" | "google";
  /** Domain used to fetch the brand logo (e.g. "slack.com"). */
  domain?: string;
}

export interface Department {
  id: string;
  name: string;
  /** Tool ids this department uses. */
  toolIds: string[];
}

export interface AuditState {
  company: string;
  ecosystem: Ecosystem;
  /** All tool ids the organisation uses (selected in step 2). */
  toolIds: string[];
  departments: Department[];
}

export type NodeType = "company" | "ecosystem" | "department" | "tool" | "context";

export interface GraphNode {
  id: string;
  name: string;
  type: NodeType;
  category?: string;
  /** Render size. */
  val: number;
  /** True for a tool used by more than one department. */
  shared?: boolean;
  /** Number of departments using this tool. */
  deptCount?: number;
  /** Domain for the brand logo. */
  domain?: string;
  /** Pinned layout position (radial layout). */
  fx?: number;
  fy?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  kind: "dept" | "tool" | "ecosystem" | "shared" | "context" | "access";
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export type InsightKind = "scattered" | "silo" | "shared" | "ai";

export interface Insight {
  kind: InsightKind;
  title: string;
  detail: string;
}
