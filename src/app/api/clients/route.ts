import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/clients — list all clients, newest first
export async function GET() {
  const { data, error } = await supabase
    .from("discovery_clients")
    .select("id, name, ecosystem, ai_tools, tool_ids, suggestions, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/clients — create a new client record after wizard completes
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { state, extraTools, graph, insights } = body;

  const { data, error } = await supabase
    .from("discovery_clients")
    .insert({
      name: state.company || "Anonymous",
      ecosystem: state.ecosystem,
      ai_tools: state.aiTools ?? [],
      tool_ids: state.toolIds,
      extra_tools: extraTools ?? [],
      departments: state.departments,
      graph,
      insights,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
