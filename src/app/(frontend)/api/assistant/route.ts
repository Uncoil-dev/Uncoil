import { NextRequest, NextResponse } from "next/server";

import { isAuthenticated } from "@/lib/auth-server";
import { ASSISTANT_SYSTEM_PROMPT, buildAssistantPrompt, failureReply, parseAssistantReply, sanitizeContext, sanitizeTurns } from "@/lib/assistant";
import { completeWithFallback, streamWithFallback } from "@/lib/llm-chain";
import { consumeRateLimit } from "@/lib/redis-cache";

export const maxDuration = 30;

const recent = new Map<string, number[]>();

function limit(name: string, fallback: number) {
  const value = Number((process.env[name] ?? process.env[name.replace("UNCOIL_", "TRACIFY_")]) ?? fallback);
  return Number.isFinite(value) ? Math.min(1000, Math.max(1, Math.floor(value))) : fallback;
}

/** The dashboard assistant proposes one action per turn. It runs nothing: the browser runs an approved action with the person's own sign-in. */
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const body = await req.json().catch(() => null) as { messages?: unknown; context?: unknown; stream?: unknown } | null;
  const turns = sanitizeTurns(body?.messages);
  if (!turns.length || turns[turns.length - 1].role === "assistant") return NextResponse.json({ error: "Say something first." }, { status: 422 });

  const context = sanitizeContext(body?.context);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  const perMinute = limit("UNCOIL_ASSISTANT_ACTIONS_PER_MINUTE", 15);
  const perDay = limit("UNCOIL_ASSISTANT_ACTIONS_PER_DAY", 300);
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((time) => now - time < 60_000);
  if (hits.length >= perMinute) return NextResponse.json({ error: "Too many messages. Wait a moment." }, { status: 429 });
  recent.set(ip, [...hits, now]);
  try {
    const minute = await consumeRateLimit(`uncoil:dashassist:min:${ip}`, 1, perMinute, 60);
    const day = await consumeRateLimit(`uncoil:dashassist:day:${ip}:${new Date(now).toISOString().slice(0, 10)}`, 1, perDay, 86_400);
    if (!minute.allowed || !day.allowed) return NextResponse.json({ error: !day.allowed ? "You've reached today's assistant limit." : "Too many messages. Wait a moment." }, { status: 429 });
  } catch {
    // Redis is optional; the in-memory guard stays active.
  }

  const alt = process.env.ASK_AI_ALT_API_KEY || "";
  const openai = alt ? undefined : (process.env.UNCOIL_ASK_AI_API_KEY ?? process.env.TRACIFY_ASK_AI_API_KEY) || process.env.OPENAI_API_KEY || undefined;
  const prompt = {
    system: ASSISTANT_SYSTEM_PROMPT,
    user: buildAssistantPrompt(context, turns),
    temperature: 0.2,
    maxOutputTokens: 700,
    timeoutMs: 25_000,
  };
  const keys = { alt: alt || undefined, openai };
  const models = { alt: process.env.ASK_AI_ALT_MODEL, openai: (process.env.UNCOIL_ASK_AI_MODEL ?? process.env.TRACIFY_ASK_AI_MODEL) };
  const configured = Boolean(alt || openai);
  const busyFrom = (failures: string[]) => failures.some((failure) => failure === "rate" || failure === "quota");

  // The chat page asks for a stream: pieces of the answer arrive as they are written, then one final message with the parsed reply.
  if (body?.stream === true) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (line: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(line)}
`));
        try {
          const result = await streamWithFallback("Assistant", keys, models, prompt, (piece) => send({ delta: piece }));
          send({ done: result.text ? parseAssistantReply(result.text) : { reply: failureReply(busyFrom(result.failures), configured), action: null } });
        } catch {
          send({ done: { reply: failureReply(false, configured), action: null } });
        }
        controller.close();
      },
    });
    return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store, no-transform", "x-accel-buffering": "no" } });
  }

  const result = await completeWithFallback("Assistant", keys, models, prompt);
  if (!result.text) return NextResponse.json({ reply: failureReply(busyFrom(result.failures), configured), action: null });
  return NextResponse.json(parseAssistantReply(result.text));
}
