/** Model providers a project can connect, and the checks that keep a typed address safe to call from our server. Pure. */

export type ProviderPreset = { id: string; label: string; baseUrl: string; defaultModel: string; keyHint: string };

/** All of these speak the OpenAI chat format, so one code path covers them. */
export const PROVIDER_PRESETS: ProviderPreset[] = [
  { id: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1", defaultModel: "gpt-4o-mini", keyHint: "sk-…" },
  { id: "anthropic", label: "Anthropic", baseUrl: "https://api.anthropic.com/v1", defaultModel: "claude-3-5-haiku-latest", keyHint: "sk-ant-…" },
  { id: "google", label: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", defaultModel: "gemini-2.0-flash", keyHint: "AIza…" },
  { id: "openrouter", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", defaultModel: "openai/gpt-4o-mini", keyHint: "sk-or-…" },
  { id: "custom", label: "Other (OpenAI-compatible)", baseUrl: "", defaultModel: "", keyHint: "Your key" },
];

export function presetFor(id: string) {
  return PROVIDER_PRESETS.find((preset) => preset.id === id);
}

const PRIVATE_V4 = [/^10\./, /^127\./, /^0\./, /^169\.254\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./];

/** Returns the cleaned address, or a plain-language reason it can not be used. Our server calls this address, so it must be public HTTPS. */
export function checkBaseUrl(value: string): { ok: true; url: string } | { ok: false; reason: string } {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return { ok: false, reason: "Enter a full address, like https://api.example.com/v1." };
  }
  if (parsed.protocol !== "https:") return { ok: false, reason: "The address must start with https://." };
  if (parsed.username || parsed.password) return { ok: false, reason: "Leave the key out of the address. Paste it in the key box." };
  if (parsed.port && parsed.port !== "443") return { ok: false, reason: "Use the standard HTTPS port." };
  const host = parsed.hostname.toLowerCase();
  const bare = host.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || !host.includes(".") && !bare.includes(":")) return { ok: false, reason: "That address is not reachable from the internet." };
  if (bare.includes(":") || PRIVATE_V4.some((pattern) => pattern.test(bare))) return { ok: false, reason: "Use a public host name, not a private or numeric address." };
  if (/^\d+\.\d+\.\d+\.\d+$/.test(bare)) return { ok: false, reason: "Use a host name, not a numeric address." };
  parsed.hash = "";
  parsed.search = "";
  return { ok: true, url: parsed.toString().replace(/\/+$/, "") };
}

export function lastFour(key: string) {
  return key.trim().slice(-4);
}
