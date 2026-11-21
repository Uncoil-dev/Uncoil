export type ColumnGroup = "Trace" | "Performance" | "Usage" | "Context" | "Errors";
export type ColumnDef = { id: string; label: string; group: ColumnGroup; hint: string; extra?: boolean };

/** Optional per-trace values the list fetches only for the traces on the page, and only when their column is on. */
export type TraceRowExtras = {
  lastSeenAt?: string; meta?: Record<string, string>;
  llmCalls?: number; toolCalls?: number; slowestStepMs?: number; avgStepMs?: number; ttftMs?: number; retries?: number; timeouts?: number;
  feedback?: string; firstErrorType?: string; firstErrorMessage?: string; tools?: string; models?: string; rootType?: string;
};
export type RowLike = TraceRowExtras & {
  runId: string; errorCount: number; spanCount: number; inputTokens: number; outputTokens: number; environment: string; release: string;
};

/** Every built-in column. The ids of the first twelve are what older saved column choices hold. */
export const COLUMN_DEFS: ColumnDef[] = [
  { id: "startedAt", label: "Start time", group: "Trace", hint: "When the trace began" },
  { id: "lastSeen", label: "Last seen", group: "Trace", hint: "When its latest step arrived" },
  { id: "status", label: "Status", group: "Trace", hint: "ok, or how many steps failed" },
  { id: "name", label: "Trace name", group: "Trace", hint: "The agent or flow name" },
  { id: "traceId", label: "Trace ID", group: "Trace", hint: "Unique run identifier" },
  { id: "input", label: "Input", group: "Trace", hint: "First input, shortened" },
  { id: "output", label: "Output", group: "Trace", hint: "Last output, shortened" },
  { id: "rootType", label: "Root step type", group: "Trace", hint: "agent, llm, tool…", extra: true },
  { id: "feedback", label: "Feedback", group: "Trace", hint: "Your thumbs up or down" },
  { id: "latency", label: "Latency", group: "Performance", hint: "Total time of the trace" },
  { id: "ttftMs", label: "Time to first token", group: "Performance", hint: "Fastest first token of any step", extra: true },
  { id: "steps", label: "Steps", group: "Performance", hint: "Number of steps" },
  { id: "llmCalls", label: "LLM calls", group: "Performance", hint: "Steps that called a model", extra: true },
  { id: "toolCalls", label: "Tool calls", group: "Performance", hint: "Steps that used a tool", extra: true },
  { id: "slowestStepMs", label: "Slowest step", group: "Performance", hint: "Longest single step", extra: true },
  { id: "avgStepMs", label: "Average step", group: "Performance", hint: "Mean step duration", extra: true },
  { id: "retries", label: "Retries", group: "Performance", hint: "Total retries across steps", extra: true },
  { id: "timeouts", label: "Timeouts", group: "Performance", hint: "Steps that timed out", extra: true },
  { id: "cost", label: "Cost", group: "Usage", hint: "Total spend in USD" },
  { id: "tokens", label: "Tokens", group: "Usage", hint: "Input plus output tokens" },
  { id: "inputTokens", label: "Input tokens", group: "Usage", hint: "Tokens sent to models" },
  { id: "outputTokens", label: "Output tokens", group: "Usage", hint: "Tokens models returned" },
  { id: "model", label: "Model", group: "Context", hint: "Main model" },
  { id: "models", label: "All models", group: "Context", hint: "Every model used", extra: true },
  { id: "tools", label: "Tools used", group: "Context", hint: "Up to six tool names", extra: true },
  { id: "user", label: "User", group: "Context", hint: "End user id" },
  { id: "session", label: "Session", group: "Context", hint: "Session id" },
  { id: "environment", label: "Environment", group: "Context", hint: "For example production" },
  { id: "release", label: "Release", group: "Context", hint: "Deployed version" },
  { id: "tags", label: "Tags", group: "Context", hint: "Labels on the trace" },
  { id: "errors", label: "Error count", group: "Errors", hint: "Failed steps" },
  { id: "firstErrorType", label: "First error type", group: "Errors", hint: "Type of the earliest failure", extra: true },
  { id: "firstErrorMessage", label: "First error message", group: "Errors", hint: "Message of the earliest failure", extra: true },
];
export const DEFAULT_COLUMNS = ["startedAt", "status", "name", "input", "output", "feedback", "latency", "cost", "tokens", "model"];
export const MAX_META_COLUMNS = 20;

export const META_PREFIX = "meta:";
export const GROUPS: ColumnGroup[] = ["Trace", "Performance", "Usage", "Context", "Errors"];
export const metaColumn = (key: string) => `${META_PREFIX}${key}`;
export const isMetaColumn = (id: string) => id.startsWith(META_PREFIX) && id.length > META_PREFIX.length;
export const isKnownColumn = (id: string) => COLUMN_DEFS.some((column) => column.id === id) || isMetaColumn(id);
export const columnLabel = (id: string) => (isMetaColumn(id) ? id.slice(META_PREFIX.length) : COLUMN_DEFS.find((column) => column.id === id)?.label ?? id);

/** Built-in columns keep their menu order; metadata columns follow in the order they were switched on. */
export function orderColumns(ids: string[]) {
  const wanted = new Set(ids);
  return [...COLUMN_DEFS.map((column) => column.id).filter((id) => wanted.has(id)), ...ids.filter(isMetaColumn)];
}
export const extraIdsFor = (ids: string[]) => COLUMN_DEFS.filter((column) => column.extra && ids.includes(column.id)).map((column) => column.id);
export const metaKeysFor = (ids: string[]) => ids.filter(isMetaColumn).map((id) => id.slice(META_PREFIX.length));

