import { NextRequest, NextResponse } from "next/server";

import { isAuthenticated } from "@/lib/auth-server";
import { ASSISTANT_SYSTEM_PROMPT, buildAssistantPrompt, parseAssistantReply, sanitizeContext, sanitizeTurns } from "@/lib/assistant";
import { completeWithFallback } from "@/lib/llm-chain";
import { consumeRateLimit } from "@/lib/redis-cache";

export const maxDuration = 30;

const recent = new Map<string, number[]>();

function limit(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) ? Math.min(1000, Math.max(1, Math.floor(value))) : fallback;
}

/** The dashboard assistant proposes one action per turn. It runs nothing: the browser runs an approved action with the person's own sign-in. */
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const body = await req.json().catch(() => null) as { messages?: unknown; context?: unknown } | null;
  const turns = sanitizeTurns(body?.messages);
  if (!turns.length || turns[turns.length - 1].role === "assistant") return NextResponse.json({ error: "Say something first." }, { status: 422 });

  const context = sanitizeContext(body?.context);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  const perMinute = limit("TRACIFY_ASSISTANT_ACTIONS_PER_MINUTE", 15);
  const perDay = limit("TRACIFY_ASSISTANT_ACTIONS_PER_DAY", 300);
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((time) => now - time < 60_000);
  if (hits.length >= perMinute) return NextResponse.json({ error: "Too many messages. Wait a moment." }, { status: 429 });
  recent.set(ip, [...hits, now]);
  try {
    const minute = await consumeRateLimit(`tracify:dashassist:min:${ip}`, 1, perMinute, 60);
    const day = await consumeRateLimit(`tracify:dashassist:day:${ip}:${new Date(now).toISOString().slice(0, 10)}`, 1, perDay, 86_400);
    if (!minute.allowed || !day.allowed) return NextResponse.json({ error: !day.allowed ? "You've reached today's assistant limit." : "Too many messages. Wait a moment." }, { status: 429 });
  } catch {
    // Redis is optional; the in-memory guard stays active.
  }

  const alt = process.env.ASK_AI_ALT_API_KEY || "";
  const openai = alt ? undefined : process.env.TRACIFY_ASK_AI_API_KEY || process.env.OPENAI_API_KEY || undefined;
  const result = await completeWithFallback("Assistant", { alt: alt || undefined, openai }, { alt: process.env.ASK_AI_ALT_MODEL, openai: process.env.TRACIFY_ASK_AI_MODEL }, {
    system: ASSISTANT_SYSTEM_PROMPT,
    user: buildAssistantPrompt(context, turns),
    temperature: 0.2,
    maxOutputTokens: 700,
    timeoutMs: 25_000,
  });
  if (!result.text) {
    const busy = result.failures.some((failure) => failure === "rate" || failure === "quota");
    const configured = Boolean(alt || openai);
    return NextResponse.json({
      reply: busy ? "I'm busy right now. Try again in a minute." : configured ? "I couldn't reach the AI just now. Try again in a moment." : "The assistant isn't switched on for this workspace yet.",
      action: null,
    });
  }
  return NextResponse.json(parseAssistantReply(result.text));
}
