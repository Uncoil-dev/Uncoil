import { buildOpenAiBody, DEFAULT_OPENAI_MODEL } from "./openai-chat.ts";

export type LlmFailure = "quota" | "rate" | "auth" | "error";
export type LlmAttempt = { text: string; failure?: LlmFailure; status?: number };
type Prompt = { system: string; user: string; temperature?: number; maxOutputTokens: number; timeoutMs?: number };

/** Server logs only: what the provider said, trimmed, so "429" is never a mystery again. */
function logFailure(label: string, provider: string, status: number, message: string) {
  console.error(`${label} provider error:`, provider, status, status === 401 || status === 403 ? "(key rejected)" : message.slice(0, 200));
}

function classify(status: number, message: string): LlmFailure {
  if (status === 429) return /quota|billing|credit/i.test(message) ? "quota" : "rate";
  if (status === 401 || status === 403) return "auth";
  return "error";
}

/** The alternate provider asks every client to identify itself and to send a session id with each request. */
function altHeaders(label: string) {
  return { "user-agent": "Tracify/1.0 (+https://tracify.tech)", "x-opencode-session": `tracify-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${crypto.randomUUID()}` };
}

/** OpenAI-compatible chat call, shared by OpenAI and the alternate provider. */
async function callChat(provider: "openai" | "alt", url: string, label: string, apiKey: string, model: string, prompt: Prompt): Promise<LlmAttempt> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}`, ...(provider === "alt" ? altHeaders(label) : {}) },
      body: JSON.stringify(buildOpenAiBody(model, [{ role: "system", content: prompt.system }, { role: "user", content: prompt.user }], { temperature: prompt.temperature, maxOutputTokens: prompt.maxOutputTokens })),
      signal: AbortSignal.timeout(prompt.timeoutMs ?? 20_000),
    });
    const data = await response.json().catch(() => ({})) as { choices?: Array<{ message?: { content?: string | null } }>; error?: { message?: string } };
    if (!response.ok) {
      const message = data.error?.message ?? "";
      logFailure(label, provider, response.status, message);
      return { text: "", failure: classify(response.status, message), status: response.status };
    }
    return { text: data.choices?.[0]?.message?.content?.trim() ?? "" };
  } catch (error) {
    console.error(`${label} request failed:`, provider, error instanceof Error ? error.name : "unknown");
    return { text: "", failure: "error" };
  }
}

export function callOpenAi(label: string, apiKey: string, model: string | undefined, prompt: Prompt) {
  return callChat("openai", "https://api.openai.com/v1/chat/completions", label, apiKey, model || DEFAULT_OPENAI_MODEL, prompt);
}

/** The alternate provider is an OpenAI-compatible service set by env (base URL, key, model). A model is sent only if it is listed in ASK_AI_ALT_MODELS_ALLOWED. */
export function isAllowedModel(model: string, allowed = process.env.ASK_AI_ALT_MODELS_ALLOWED ?? "") {
  return allowed.split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean).includes(model);
}

function altTarget(label: string, model: string | undefined): { url: string; model: string } | null {
  const baseUrl = (process.env.ASK_AI_ALT_BASE_URL ?? "").replace(/\/+$/, "");
  const chosen = (model ?? "").trim().toLowerCase();
  if (!baseUrl.startsWith("https://") || !chosen || !isAllowedModel(chosen)) {
    console.error(`${label} alternate provider skipped: missing address, or model not on the allowed list:`, chosen || "(none)");
    return null;
  }
  return { url: `${baseUrl}/chat/completions`, model: chosen };
}

export async function callAlt(label: string, apiKey: string, model: string | undefined, prompt: Prompt): Promise<LlmAttempt> {
  const target = altTarget(label, model);
  if (!target) return { text: "", failure: "error" };
  return callChat("alt", target.url, label, apiKey, target.model, prompt);
}

/** Pulls the text pieces out of an OpenAI-style event stream ("data: {...}" lines). Reasoning pieces are ignored. */
export function sseTextPieces(buffer: string): { pieces: string[]; rest: string } {
  const lines = buffer.split("\n");
  const rest = lines.pop() ?? "";
  const pieces: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const piece = (JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string | null } }> }).choices?.[0]?.delta?.content;
      if (piece) pieces.push(piece);
    } catch {
      // A broken line is skipped; the next one carries on.
    }
  }
  return { pieces, rest };
}

/** Same call as callChat, but hands each piece of the answer to onText as it arrives. */
async function streamChat(provider: "openai" | "alt", url: string, label: string, apiKey: string, model: string, prompt: Prompt, onText: (piece: string) => void): Promise<LlmAttempt> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}`, ...(provider === "alt" ? altHeaders(label) : {}) },
      body: JSON.stringify({ ...buildOpenAiBody(model, [{ role: "system", content: prompt.system }, { role: "user", content: prompt.user }], { temperature: prompt.temperature, maxOutputTokens: prompt.maxOutputTokens }), stream: true }),
      signal: AbortSignal.timeout(prompt.timeoutMs ?? 20_000),
    });
    if (!response.ok || !response.body) {
      const data = await response.json().catch(() => ({})) as { error?: { message?: string } };
      const message = data.error?.message ?? "";
      logFailure(label, provider, response.status, message);
      return { text: "", failure: classify(response.status, message), status: response.status };
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = sseTextPieces(buffer);
      buffer = parsed.rest;
      for (const piece of parsed.pieces) { text += piece; onText(piece); }
    }
    for (const piece of sseTextPieces(`${buffer}\n`).pieces) { text += piece; onText(piece); }
    return { text: text.trim() };
  } catch (error) {
    console.error(`${label} stream failed:`, provider, error instanceof Error ? error.name : "unknown");
    return { text: "", failure: "error" };
  }
}

/** Like completeWithFallback, but the answer arrives piece by piece through onText. Once text has started, it is not retried elsewhere. */
export async function streamWithFallback(label: string, keys: { alt?: string; openai?: string }, models: { alt?: string; openai?: string }, prompt: Prompt, onText: (piece: string) => void) {
  const failures: LlmFailure[] = [];
  if (keys.alt) {
    const target = altTarget(label, models.alt);
    const first = target ? await streamChat("alt", target.url, label, keys.alt, target.model, prompt, onText) : { text: "", failure: "error" as LlmFailure };
    if (first.text) return { text: first.text, provider: "alt" as const, failures };
    failures.push(first.failure ?? "error");
  }
  if (keys.openai) {
    const first = await streamChat("openai", "https://api.openai.com/v1/chat/completions", label, keys.openai, models.openai || DEFAULT_OPENAI_MODEL, prompt, onText);
    if (first.text) return { text: first.text, provider: "openai" as const, failures };
    failures.push(first.failure ?? "error");
  }
  return { text: "", provider: null, failures };
}

/** The alternate provider first when its key is set, then OpenAI; each is skipped when missing, busy, out of credit or empty. */
export async function completeWithFallback(label: string, keys: { alt?: string; openai?: string }, models: { alt?: string; openai?: string }, prompt: Prompt) {
  const failures: LlmFailure[] = [];
  if (keys.alt) {
    const first = await callAlt(label, keys.alt, models.alt, prompt);
    if (first.text) return { text: first.text, provider: "alt" as const, failures };
    failures.push(first.failure ?? "error");
  }
  if (keys.openai) {
    const first = await callOpenAi(label, keys.openai, models.openai, prompt);
    if (first.text) return { text: first.text, provider: "openai" as const, failures };
    failures.push(first.failure ?? "error");
  }
  return { text: "", provider: null, failures };
}
