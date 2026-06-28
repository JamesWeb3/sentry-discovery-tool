import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/clients/[id] — fetch a single client's full record
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("discovery_clients")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  // Reshape into the shape the audit page expects
  return NextResponse.json({
    id: data.id,
    state: {
      company: data.name,
      ecosystem: data.ecosystem,
      aiTools: data.ai_tools,
      toolIds: data.tool_ids,
      departments: data.departments,
    },
    extraTools: data.extra_tools,
    graph: data.graph,
    insights: data.insights,
    suggestions: data.suggestions,
  });
}

// PATCH /api/clients/[id] — update suggestions once AI returns them
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { suggestions } = await req.json();

  const { error } = await supabase
    .from("discovery_clients")
    .update({ suggestions })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
