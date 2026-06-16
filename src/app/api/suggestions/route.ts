import {
  RULEBOOK,
  buildUserPrompt,
  summarizeAudit,
  SUGGESTION_CATEGORIES,
  type AiSuggestion,
} from "@/lib/ai-suggestions";
import type { AuditState, Tool } from "@/lib/types";

// Reads process.env and calls OpenAI at request time, so never prerender/cache.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  let body: { state?: AuditState; extraTools?: Tool[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { state, extraTools } = body ?? {};
  if (!state || !Array.isArray(state.departments)) {
    return Response.json({ error: "Missing or malformed audit state." }, { status: 400 });
  }

  const summary = summarizeAudit(state, extraTools ?? []);
  const model = process.env.OPENAI_MODEL ?? "gpt-4o";

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: RULEBOOK },
          { role: "user", content: buildUserPrompt(summary) },
        ],
      }),
    });
  } catch {
    return Response.json({ error: "Could not reach OpenAI." }, { status: 502 });
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return Response.json(
      { error: `OpenAI request failed (${res.status}).`, detail: detail.slice(0, 500) },
      { status: 502 },
    );
  }

  const data = await res.json().catch(() => null);
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) {
    return Response.json({ error: "OpenAI returned an empty response." }, { status: 502 });
  }

  let parsed: { suggestions?: AiSuggestion[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    return Response.json({ error: "The model returned malformed JSON." }, { status: 502 });
  }

  const suggestions = (parsed.suggestions ?? [])
    .filter(
      (s): s is AiSuggestion =>
        !!s &&
        SUGGESTION_CATEGORIES.includes(s.category) &&
        typeof s.title === "string" &&
        typeof s.rationale === "string" &&
        typeof s.firstStep === "string",
    )
    .slice(0, 3);

  if (suggestions.length === 0) {
    return Response.json({ error: "No valid suggestions were returned." }, { status: 502 });
  }

  return Response.json({ suggestions });
}
