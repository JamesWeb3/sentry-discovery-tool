import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

export const revalidate = 0;

const ECOSYSTEM_LABEL: Record<string, string> = {
  microsoft: "Microsoft 365",
  google: "Google Workspace",
  both: "Microsoft + Google",
};

export default async function Home() {
  const { data: clients } = await supabase
    .from("discovery_clients")
    .select("id, name, ecosystem, ai_tools, tool_ids, departments, suggestions, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 md:px-10 py-12">

        {/* Header */}
        <header className="flex items-center gap-3 mb-14">
          <Image src="/sentry-logo.png" alt="Sentry AI" width={24} height={24} className="rounded-md" />
          <span className="font-serif text-white text-base">Sentry AI</span>
        </header>

        {/* Hero row */}
        <div className="flex items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-3">
              Knowledge Graph Audits
            </p>
            <h1 className="text-4xl font-serif italic text-white leading-tight">
              {clients && clients.length > 0
                ? `${clients.length} client${clients.length === 1 ? "" : "s"} audited`
                : "Run your first audit"}
            </h1>
          </div>
          <Link
            href="/audit"
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            New audit
          </Link>
        </div>

        {/* Client list */}
        {clients && clients.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {clients.map((client) => {
              const dept_count = Array.isArray(client.departments) ? client.departments.length : 0;
              const tool_count = Array.isArray(client.tool_ids) ? client.tool_ids.length : 0;
              const has_suggestions = Array.isArray(client.suggestions) && client.suggestions.length > 0;
              const date = new Date(client.created_at).toLocaleDateString("en-NZ", {
                day: "numeric", month: "short", year: "numeric",
              });

              return (
                <Link
                  key={client.id}
                  href={`/audit?client=${client.id}`}
                  className="group rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/25 p-5 transition-all flex items-center gap-5"
                >
                  {/* Ecosystem icon */}
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center">
                    {client.ecosystem === "microsoft" || client.ecosystem === "both" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`https://www.google.com/s2/favicons?domain=microsoft.com&sz=32`}
                        alt=""
                        width={18}
                        height={18}
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`https://www.google.com/s2/favicons?domain=google.com&sz=32`}
                        alt=""
                        width={18}
                        height={18}
                      />
                    )}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">
                      {client.name && client.name !== "Anonymous" ? client.name : "Unnamed company"}
                    </div>
                    <div className="text-sm text-white/45 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>{ECOSYSTEM_LABEL[client.ecosystem] ?? client.ecosystem}</span>
                      <span className="text-white/20">·</span>
                      <span>{tool_count} tool{tool_count !== 1 ? "s" : ""}</span>
                      <span className="text-white/20">·</span>
                      <span>{dept_count} team{dept_count !== 1 ? "s" : ""}</span>
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="shrink-0 flex items-center gap-4">
                    {has_suggestions && (
                      <span className="text-xs border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 rounded-full px-2.5 py-0.5">
                        AI ready
                      </span>
                    )}
                    <div className="text-right">
                      <div className="text-xs text-white/35">{date}</div>
                    </div>
                    <div className="text-white/25 group-hover:text-white/60 transition-colors text-sm">
                      →
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/15 p-14 text-center">
            <p className="text-white/35 text-sm">No audits yet.</p>
            <p className="text-white/20 text-xs mt-1">Click &ldquo;New audit&rdquo; to map your first client.</p>
          </div>
        )}
      </div>
    </main>
  );
}
