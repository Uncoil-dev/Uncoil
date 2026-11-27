export type SearchableSpan = {
  spanId: string;
  parentSpanId: string;
  spanType: string;
  toolName: string;
  modelId: string;
  errorMessage: string;
};

export type SpanSearchResult = {
  /** False when the query is blank, in which case every span is visible. */
  active: boolean;
  /** Span ids that match, in the input order. */
  matches: string[];
  /** Matching spans plus all of their ancestors. */
  visible: Set<string>;
};

function matchesQuery(span: SearchableSpan, needle: string): boolean {
  return [span.spanType, span.toolName, span.modelId, span.errorMessage].some((field) =>
    (field ?? "").toLowerCase().includes(needle),
  );
}

/**
 * Finds spans whose type, tool name, model or error text contains the query
 * (case-insensitive). Ancestors of every match stay visible so a hit keeps its
 * place in the tree; the parent walk stops on cycles in malformed data.
 */
export function searchSpans(spans: SearchableSpan[], query: string): SpanSearchResult {
  const needle = query.trim().toLowerCase();
  if (!needle) return { active: false, matches: [], visible: new Set(spans.map((s) => s.spanId)) };

  const byId = new Map(spans.map((s) => [s.spanId, s]));
  const matches: string[] = [];
  const visible = new Set<string>();
  for (const span of spans) {
    if (!matchesQuery(span, needle)) continue;
    matches.push(span.spanId);
    let current: SearchableSpan | undefined = span;
    while (current && !visible.has(current.spanId)) {
      visible.add(current.spanId);
      current = current.parentSpanId ? byId.get(current.parentSpanId) : undefined;
    }
  }
  return { active: true, matches, visible };
}

/** Splits text into [before, match, after] around the first case-insensitive hit. */
export function splitMatch(text: string, query: string): [string, string, string] {
  const needle = query.trim().toLowerCase();
  const index = needle ? text.toLowerCase().indexOf(needle) : -1;
  if (index < 0) return [text, "", ""];
  return [text.slice(0, index), text.slice(index, index + needle.length), text.slice(index + needle.length)];
}
