export function formatDuration(ms: number | null | undefined) {
  const value = Number(ms ?? 0);
  if (!Number.isFinite(value) || value <= 0) return "0 ms";
  if (value < 1000) return `${Math.round(value)} ms`;
  if (value < 60_000) return `${(value / 1000).toFixed(value < 10_000 ? 2 : 1)} s`;
  if (value >= 86_400_000) return `${Math.floor(value / 86_400_000)}d ${Math.floor(value % 86_400_000 / 3_600_000)}h`;
  if (value >= 3_600_000) return `${Math.floor(value / 3_600_000)}h ${Math.floor(value % 3_600_000 / 60_000)}m`;
  const seconds = Math.floor(value / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function formatCost(usd: number | null | undefined) {
  const value = Number(usd ?? 0);
  if (!value) return "$0";
  if (value < 0.01) return `$${value.toFixed(5)}`;
  return `$${value.toFixed(value < 1 ? 4 : 2)}`;
}

export function compactNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value ?? 0));
}

/** Tinybird returns "YYYY-MM-DD hh:mm:ss" in UTC; show it in the viewer's local time. */
export function formatTime(value: string) {
  const parsed = parseTime(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function parseTime(value: string) {
  return Date.parse(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
}

/** "just now", "42s ago", "5m ago", "3h ago"; older than a day falls back to the absolute local time. */
export function relativeTime(value: string, now: number) {
  const parsed = parseTime(value);
  if (!Number.isFinite(parsed)) return value;
  const seconds = Math.max(0, Math.round((now - parsed) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  return formatTime(value);
}

/** Accessible name for a step row: its name, type, whether it failed, and when it ran. */
export function stepRowLabel(row: { name: string; type: string; errors: number; createdAt: string }) {
  return `${row.name}, ${row.type}, ${Number(row.errors) > 0 ? "failed" : "succeeded"}, ${formatTime(row.createdAt)}`;
}

/** RFC 4180 CSV; cells are quoted and leading formula characters are neutralised for spreadsheet safety. */
export function toCsv(header: string[], rows: Array<Array<string | number>>) {
  const cell = (value: string | number) => {
    const text = String(value ?? "");
    const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
}

export function downloadFile(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** One-line preview of a JSON or text payload: the last user/assistant message text when it is a chat. */
export function previewText(raw: string | null | undefined) {
  if (!raw) return "";
  const parsed = parsePayload(raw);
  const messages = chatMessages(parsed);
  const text = messages ? messages[messages.length - 1]?.content ?? "" : typeof parsed === "string" ? parsed : JSON.stringify(parsed);
  return text.replace(/\s+/g, " ").trim().slice(0, 160);
}

export function parsePayload(raw: string | null | undefined): unknown {
  if (raw === null || raw === undefined || raw === "") return "";
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" ? tryJson(parsed) : parsed;
  } catch {
    return raw;
  }
}

function tryJson(value: string): unknown {
  try { return JSON.parse(value); } catch { return value; }
}

export type ChatMessage = { role: string; content: string };

/** Recognises OpenAI/Anthropic-style message arrays (also nested under `messages`). */
export function chatMessages(value: unknown): ChatMessage[] | null {
  const list = Array.isArray(value) ? value : value && typeof value === "object" && Array.isArray((value as { messages?: unknown }).messages) ? (value as { messages: unknown[] }).messages : null;
  if (!list || !list.length) return null;
  const messages: ChatMessage[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object" || typeof (item as { role?: unknown }).role !== "string") return null;
    const content = (item as { content?: unknown }).content;
    const text = typeof content === "string" ? content
      : Array.isArray(content) ? content.map((part) => (part && typeof part === "object" && "text" in part ? String((part as { text: unknown }).text) : "")).join("\n")
      : content === undefined || content === null ? "" : JSON.stringify(content, null, 2);
    messages.push({ role: (item as { role: string }).role, content: text });
  }
  return messages;
}

/** SDK and OpenTelemetry names for the same kinds of step, mapped to the names the views colour and filter by. */
export const TYPE_ALIASES: Record<string, string> = {
  llm_call: "llm", generation: "llm", chat: "llm", tool_call: "tool", function: "tool", run_end: "agent", decision: "agent", chain: "agent",
};

export function stepKind(type: string) {
  const lower = (type || "").toLowerCase();
  return TYPE_ALIASES[lower] ?? lower;
}
