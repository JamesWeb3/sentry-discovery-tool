// Streams a chat completion from OpenAI back to the client as plain text.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = { role: "user" | "assistant"; content: string };

interface ToolInfo {
  name: string;
  category: string;
}

interface ChatContext {
  company?: string;
  ecosystem?: string;
  activeAi?: string;
  tools?: ToolInfo[];
  // legacy — kept for backwards-compat with older clients
  aiSubscriptions?: string[];
}

// Per-category descriptions of what data lives in each tool type.
const CATEGORY_DATA: Record<string, string> = {
  "Comms":         "messages, threads, meeting transcripts, channel history, internal announcements",
  "CRM & Sales":   "deals, pipeline stages, contact records, activity logs, forecast data, call notes",
  "Finance":       "invoices, revenue data, expense records, cashflow, subscription MRR/ARR, payment history",
  "Marketing":     "campaign performance, ad spend, engagement metrics, audience segments, email analytics",
  "Project & Ops": "tasks, project timelines, milestones, team workload, sprint velocity, blockers",
  "Support":       "tickets, CSAT scores, resolution times, common issues, customer sentiment",
  "Data":          "analytics, dashboards, event tracking, funnel metrics, cohort data, SQL queries",
  "Storage":       "documents, file history, shared drives, version control, knowledge base articles",
  "HR":            "employee records, org structure, headcount, onboarding status, performance data",
  "Other":         "integrations, automation logs, developer activity, e-commerce orders",
};

function toolDescription(t: ToolInfo): string {
  const dataTypes = CATEGORY_DATA[t.category] ?? "business data";
  return `${t.name} (${t.category} — contains ${dataTypes})`;
}

function systemPrompt(ctx: ChatContext): string {
  const company = ctx.company?.trim() || "this business";
  const ai = ctx.activeAi || "an AI agent";
  const tools = ctx.tools ?? [];

  const toolBlock =
    tools.length > 0
      ? tools.map((t) => `- ${toolDescription(t)}`).join("\n")
      : null;

  const noToolsNote = !toolBlock
    ? `No specific tools are connected in this session. Give thoughtful strategic answers about AI in the workplace, and reference how connecting their tools into a knowledge graph would unlock deeper insights.`
    : "";

  return `You are a live ${ai} agent, running inside Sentry AIOS — an AI operating system that gives ${company} a single intelligent layer across their entire software stack.

${toolBlock ? `You have authenticated, real-time read access to the following tools:\n${toolBlock}` : ""}

${noToolsNote}

YOUR ROLE IN THIS DEMO:
You are demonstrating to ${company} what becomes possible when every tool is connected into a single knowledge graph. Your goal is to create "aha moments" — the kind of cross-tool insight that would have taken a human hours of tab-switching to compile, delivered instantly by the agent.

HOW TO RESPOND:
${toolBlock ? `
1. Reason across ALL connected tools. Every answer should draw from at least 2-3 of them. This is the whole point — cross-tool intelligence that no single tool could produce on its own.

2. Name the tools explicitly as you reason. Use phrases like:
   "Looking at [Tool]..." / "Crossing this with [Tool]..." / "[Tool] shows..." / "When I combine [Tool A] and [Tool B]..."

3. Include specific, plausible data. Invent realistic numbers, names, dates, and metrics that make the response feel like a real live connection. Examples: deal amounts, ticket counts, response times, campaign ROI %, team names, dates. Make it feel real.

4. Surface cross-tool insights that couldn't exist without integration. The most powerful answers are ones where insight only emerges when you correlate two tools — e.g. Slack message volume spiking correlating with Salesforce deal slippage, or Stripe churn correlating with Zendesk ticket spikes.

5. End with one sharp follow-up question or observation that makes the user want to dig deeper.
` : `
1. Give practical, strategic answers about AI in the workplace.
2. Reference which tools would ideally be connected to answer this question better.
3. Explain concretely how a knowledge graph would transform the answer.
`}

TONE & FORMAT:
- Confident, sharp, and specific. You have access to everything — act like it.
- Short paragraphs (2-4 sentences max). Simple "- " bullet lists where helpful.
- NO markdown symbols: no **, no ##, no backticks, no headers. Plain readable prose only.
- Keep total response under 250 words unless the question genuinely requires more depth.
- Never say you're making data up or that this is a simulation. Respond as if the connections are live.`;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  let body: { messages?: ChatMessage[]; context?: ChatContext };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return Response.json({ error: "No messages provided." }, { status: 400 });
  }

  // Keep the payload bounded.
  const history = messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && m.content)
    .slice(-20);

  const model = process.env.OPENAI_MODEL ?? "gpt-4o";

  let upstream: Response;
  try {
    upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: true,
        temperature: 0.6,
        messages: [
          { role: "system", content: systemPrompt(body.context ?? {}) },
          ...history,
        ],
      }),
    });
  } catch {
    return Response.json({ error: "Could not reach OpenAI." }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return Response.json(
      { error: `OpenAI request failed (${upstream.status}).`, detail: detail.slice(0, 500) },
      { status: 502 },
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Parse OpenAI's SSE stream and forward only the text deltas.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") {
              controller.close();
              return;
            }
            try {
              const json = JSON.parse(data);
              const delta: string | undefined = json.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              // ignore keep-alive / partial lines
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
