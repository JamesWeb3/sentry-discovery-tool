// Streams a chat completion from OpenAI back to the client as plain text.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = { role: "user" | "assistant"; content: string };

interface ChatContext {
  company?: string;
  ecosystem?: string;
  aiSubscriptions?: string[];
  tools?: string[];
}

function systemPrompt(ctx: ChatContext): string {
  const company = ctx.company?.trim() || "the business";
  const subs = ctx.aiSubscriptions?.length
    ? ctx.aiSubscriptions.join(", ")
    : "none selected";
  const tools = ctx.tools?.length ? ctx.tools.join(", ") : "none selected";

  return `You are Sentry Assistant, the AI coworker from Sentry AI (Sentry AIOS). You help ${company} get more out of their tools and the AI subscriptions they already pay for, and you understand how Sentry connects a company's scattered tools into a single knowledge graph with AI agents that act across that data under role-based permissions.

The user has pinned the following context for this conversation:
- Office ecosystem: ${ctx.ecosystem || "unspecified"}
- AI subscriptions in use: ${subs}
- Tools they want you to focus on right now: ${tools}

Ground your answers in those specific tools and AI subscriptions whenever relevant — name them. When recommending AI plays, prefer ones that leverage the subscriptions they already have. Frame bigger initiatives in terms of Sentry's three pillars (Enablement, Development, Infrastructure) when it helps.

Style: warm, concrete, and practical. Keep answers tight. Use short paragraphs and simple hyphen ("- ") bullet lists. Do NOT use markdown symbols like **, ##, or backticks — write clean, readable prose that renders well as plain text.`;
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
