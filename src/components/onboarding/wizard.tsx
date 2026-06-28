"use client";

import { useMemo, useState } from "react";
import {
  TOOL_CATALOG,
  TOOL_BY_ID,
  CATEGORY_ORDER,
  DEPARTMENT_SUGGESTIONS,
  EXAMPLE_AUDIT,
  AI_TOOLS,
} from "@/lib/catalog";
import type { AuditState, Department, Ecosystem, Tool } from "@/lib/types";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const ECOSYSTEMS: { id: Ecosystem; label: string; hint: string; domain?: string }[] = [
  { id: "microsoft", label: "Microsoft 365", hint: "Outlook, Teams, SharePoint", domain: "microsoft.com" },
  { id: "google", label: "Google Workspace", hint: "Gmail, Drive, Meet", domain: "google.com" },
  { id: "both", label: "A mix of both", hint: "Microsoft and Google" },
];

const STEP_LABELS = ["Ecosystem", "AI", "Tools", "Teams", "Mapping"];
const TOTAL = 5;

function favicon(domain: string, size = 64) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

const AI_LOGO: Record<string, string> = {
  copilot: "/copilot.png",
};

export default function Wizard({
  onComplete,
}: {
  onComplete: (state: AuditState, extraTools: Tool[]) => void;
}) {
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState("");
  const [ecosystem, setEcosystem] = useState<Ecosystem | null>(null);
  const [aiTools, setAiTools] = useState<string[]>([]);
  const [toolIds, setToolIds] = useState<string[]>([]);
  const [extraTools, setExtraTools] = useState<Tool[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [customTool, setCustomTool] = useState("");
  const [newDept, setNewDept] = useState("");

  const allTools = useMemo(() => [...TOOL_CATALOG, ...extraTools], [extraTools]);
  const visibleTools = useMemo(
    () =>
      allTools.filter(
        (t) => !t.ecosystem || ecosystem === "both" || ecosystem === null || t.ecosystem === ecosystem,
      ),
    [allTools, ecosystem],
  );
  const selectedTools = useMemo(
    () => allTools.filter((t) => toolIds.includes(t.id)),
    [allTools, toolIds],
  );

  const selectEcosystem = (id: Ecosystem) => {
    setEcosystem(id);
    if (id !== "both") {
      const opposite = id === "microsoft" ? "google" : "microsoft";
      setToolIds((prev) => prev.filter((tid) => TOOL_BY_ID[tid]?.ecosystem !== opposite));
    }
  };

  const toggleTool = (id: string) =>
    setToolIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleAiTool = (id: string) =>
    setAiTools((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      // "No AI tools" is mutually exclusive with any actual tool.
      if (id === "none") return ["none"];
      return [...prev.filter((x) => x !== "none"), id];
    });

  const addCustomTool = () => {
    const name = customTool.trim();
    if (!name) return;
    const id = `c-${slugify(name)}`;
    if (!allTools.some((t) => t.id === id)) {
      setExtraTools((p) => [...p, { id, name, category: "Other" }]);
    }
    setToolIds((p) => (p.includes(id) ? p : [...p, id]));
    setCustomTool("");
  };

  const addDept = (name: string) => {
    const n = name.trim();
    if (!n) return;
    const id = slugify(n) || `d-${departments.length}`;
    if (departments.some((d) => d.id === id)) return;
    setDepartments((p) => [...p, { id, name: n, toolIds: [] }]);
    setNewDept("");
  };

  const removeDept = (id: string) => setDepartments((p) => p.filter((d) => d.id !== id));

  const toggleDeptTool = (deptId: string, toolId: string) =>
    setDepartments((p) =>
      p.map((d) =>
        d.id !== deptId
          ? d
          : {
              ...d,
              toolIds: d.toolIds.includes(toolId)
                ? d.toolIds.filter((t) => t !== toolId)
                : [...d.toolIds, toolId],
            },
      ),
    );

  const unusedTools = useMemo(
    () => selectedTools.filter((t) => !departments.some((d) => d.toolIds.includes(t.id))),
    [selectedTools, departments],
  );

  const removeTool = (id: string) => {
    setToolIds((prev) => prev.filter((t) => t !== id));
    setDepartments((prev) => prev.map((d) => ({ ...d, toolIds: d.toolIds.filter((t) => t !== id) })));
  };

  const removeAllUnused = () => {
    const ids = new Set(unusedTools.map((t) => t.id));
    setToolIds((prev) => prev.filter((t) => !ids.has(t)));
  };

  const canNext =
    (step === 0 && !!ecosystem) ||
    step === 1 ||
    (step === 2 && toolIds.length > 0) ||
    (step === 3 && departments.length > 0) ||
    step === 4;

  const finish = () =>
    onComplete(
      {
        company,
        ecosystem: ecosystem ?? "both",
        toolIds,
        departments,
        aiTools: aiTools.filter((x) => x !== "none"),
      },
      extraTools,
    );

  const Chip = ({
    active,
    onClick,
    children,
    domain,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    domain?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm border transition-all flex items-center gap-1.5 ${
        active
          ? "bg-white border-white text-black font-medium"
          : "bg-white/[0.04] border-white/12 text-white/70 hover:border-white/35 hover:text-white"
      }`}
    >
      {domain && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={favicon(domain)} alt="" width={15} height={15} className="rounded-sm" />
      )}
      {children}
    </button>
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-10">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex-1">
            <div className="flex items-center gap-2">
              <div
                className={`size-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 transition-colors ${
                  i < step
                    ? "bg-white text-black"
                    : i === step
                      ? "bg-white text-black"
                      : "bg-white/8 text-white/40"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i === step ? "text-white" : "text-white/40"}`}>
                {label}
              </span>
            </div>
            <div className={`h-0.5 rounded-full mt-2 transition-colors ${i <= step ? "bg-white/70" : "bg-white/10"}`} />
          </div>
        ))}
      </div>

      {/* Step 0 — ecosystem */}
      {step === 0 && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-3xl font-serif italic text-white">Let&apos;s map your business</h2>
            <p className="text-white/50 mt-2">First, the basics. This takes about two minutes.</p>
          </div>
          <div>
            <label className="text-sm text-white/55">Company name (optional)</label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Co."
              className="mt-2 w-full rounded-xl bg-white/[0.04] border border-white/12 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/45 transition-colors"
            />
          </div>
          <div>
            <label className="text-sm text-white/55">Is your business on Microsoft or Google?</label>
            <div className="grid sm:grid-cols-3 gap-3 mt-2.5">
              {ECOSYSTEMS.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => selectEcosystem(e.id)}
                  className={`text-left rounded-2xl border p-4 transition-all ${
                    ecosystem === e.id
                      ? "border-white bg-white/[0.08]"
                      : "border-white/12 bg-white/[0.03] hover:border-white/30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {e.domain ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={favicon(e.domain, 128)} alt="" width={22} height={22} className="rounded" />
                    ) : (
                      <div className="flex -space-x-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={favicon("microsoft.com", 128)} alt="" width={20} height={20} className="rounded ring-1 ring-black" />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={favicon("google.com", 128)} alt="" width={20} height={20} className="rounded ring-1 ring-black" />
                      </div>
                    )}
                  </div>
                  <div className="font-semibold text-white text-sm">{e.label}</div>
                  <div className="text-xs text-white/45 mt-0.5">{e.hint}</div>
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onComplete(EXAMPLE_AUDIT, [])}
            className="text-sm text-white/40 hover:text-white text-left w-fit transition-colors"
          >
            Short on time? See an example company →
          </button>
        </div>
      )}

      {/* Step 1 — AI subscriptions */}
      {step === 1 && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-3xl font-serif italic text-white">
              What AI subscription are you currently using?
            </h2>
            <p className="text-white/50 mt-2">
              Tap any your team has today. Skip if you&apos;re not using one yet.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {AI_TOOLS.map((ai) => {
              const active = aiTools.includes(ai.id);
              return (
                <button
                  key={ai.id}
                  type="button"
                  onClick={() => toggleAiTool(ai.id)}
                  className={`text-left rounded-2xl border p-4 flex items-center gap-3 transition-all ${
                    active
                      ? "border-white bg-white/[0.08]"
                      : "border-white/12 bg-white/[0.03] hover:border-white/30"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={AI_LOGO[ai.id] ?? favicon(ai.domain, 128)} alt="" width={28} height={28} className="rounded" />
                  <div className="font-semibold text-white text-sm">{ai.label}</div>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => toggleAiTool("none")}
              className={`text-left rounded-2xl border p-4 flex items-center gap-3 transition-all ${
                aiTools.includes("none")
                  ? "border-white bg-white/[0.08]"
                  : "border-white/12 bg-white/[0.03] hover:border-white/30"
              }`}
            >
              <span className="flex items-center justify-center w-7 h-7 rounded bg-white/[0.06] text-white/50 text-base">
                ✕
              </span>
              <div className="font-semibold text-white text-sm">No AI tools yet</div>
            </button>
          </div>
          <p className="text-xs text-white/40">
            {aiTools.filter((x) => x !== "none").length} selected
          </p>
        </div>
      )}

      {/* Step 2 — tools */}
      {step === 2 && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-3xl font-serif italic text-white">Which tools does your team use?</h2>
            <p className="text-white/50 mt-2">Tap everything you use. Add anything we&apos;ve missed.</p>
          </div>
          <div className="flex flex-col gap-5 max-h-[44vh] overflow-y-auto pr-1 -mr-1">
            {CATEGORY_ORDER.map((cat) => {
              const tools = visibleTools.filter((t) => t.category === cat);
              if (tools.length === 0) return null;
              return (
                <div key={cat}>
                  <div className="text-xs uppercase tracking-[0.15em] text-white/35 mb-2.5">{cat}</div>
                  <div className="flex flex-wrap gap-2">
                    {tools.map((t) => (
                      <Chip key={t.id} active={toolIds.includes(t.id)} onClick={() => toggleTool(t.id)} domain={t.domain}>
                        {t.name}
                      </Chip>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input
              value={customTool}
              onChange={(e) => setCustomTool(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomTool()}
              placeholder="Add another tool…"
              className="flex-1 rounded-xl bg-white/[0.04] border border-white/12 px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-white/45 transition-colors"
            />
            <button
              type="button"
              onClick={addCustomTool}
              className="px-4 rounded-xl border border-white/15 text-white/80 hover:bg-white/5 transition-colors"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-white/40">{toolIds.length} selected</p>
        </div>
      )}

      {/* Step 3 — departments */}
      {step === 3 && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-3xl font-serif italic text-white">What are your departments?</h2>
            <p className="text-white/50 mt-2">Add the teams that make up your business.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {DEPARTMENT_SUGGESTIONS.filter((s) => !departments.some((d) => d.name === s)).map((s) => (
              <Chip key={s} active={false} onClick={() => addDept(s)}>
                + {s}
              </Chip>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addDept(newDept)}
              placeholder="Add a department…"
              className="flex-1 rounded-xl bg-white/[0.04] border border-white/12 px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-white/45 transition-colors"
            />
            <button
              type="button"
              onClick={() => addDept(newDept)}
              className="px-4 rounded-xl border border-white/15 text-white/80 hover:bg-white/5 transition-colors"
            >
              Add
            </button>
          </div>
          {departments.length > 0 && (
            <div className="flex flex-col gap-2">
              {departments.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <span className="text-white">{d.name}</span>
                  <button
                    type="button"
                    onClick={() => removeDept(d.id)}
                    className="text-white/40 hover:text-white text-sm transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 4 — mapping */}
      {step === 4 && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-3xl font-serif italic text-white">Who uses what?</h2>
            <p className="text-white/50 mt-2">
              For each department, tap the tools they use. This is what reveals your context.
            </p>
          </div>
          <div className="flex flex-col gap-3 max-h-[44vh] overflow-y-auto pr-1 -mr-1">
            {departments.map((d) => (
              <div key={d.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="font-semibold text-white mb-3">{d.name}</div>
                <div className="flex flex-wrap gap-2">
                  {selectedTools.map((t) => (
                    <Chip
                      key={t.id}
                      active={d.toolIds.includes(t.id)}
                      onClick={() => toggleDeptTool(d.id, t.id)}
                      domain={t.domain}
                    >
                      {t.name}
                    </Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {unusedTools.length > 0 && (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-4">
              <div className="text-sm font-semibold text-amber-100">
                {unusedTools.length} tool{unusedTools.length > 1 ? "s" : ""} not used by any department
              </div>
              <p className="text-xs text-white/55 mt-1">
                For an accurate map, assign each one to a team above, or remove it. Tap to remove:
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {unusedTools.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => removeTool(t.id)}
                    className="px-3 py-1.5 rounded-full text-sm border border-amber-400/40 bg-amber-400/10 text-amber-50 hover:bg-amber-400/20 flex items-center gap-1.5 transition-colors"
                  >
                    {t.name}
                    <span className="text-amber-200/80">✕</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={removeAllUnused}
                className="mt-3 text-xs text-amber-100/80 hover:text-amber-50 underline underline-offset-2"
              >
                Remove all unused
              </button>
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <div className="flex items-center justify-between mt-10">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className={`text-sm text-white/50 hover:text-white transition-colors ${step === 0 ? "invisible" : ""}`}
        >
          ← Back
        </button>
        {step < TOTAL - 1 ? (
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setStep((s) => s + 1)}
            className="px-6 py-3 rounded-xl bg-white text-black font-medium hover:bg-white/90 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
          >
            Continue
          </button>
        ) : (
          <div className="flex flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={finish}
              disabled={unusedTools.length > 0}
              className="px-6 py-3 rounded-xl bg-white text-black font-medium hover:bg-white/90 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
            >
              Build my knowledge graph →
            </button>
            {unusedTools.length > 0 && (
              <span className="text-xs text-amber-200/70">
                Assign or remove the unused tools first
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
