import { isKnownColumn, isMetaColumn, orderColumns } from "./trace-columns";
const KEYS = new Set([
  "range",
  "from",
  "to",
  "q",
  "status",
  "sort",
  "dir",
  "mode",
  "groupBy",
  "pageSize",
  "traceName",
  "spanType",
  "toolName",
  "modelId",
  "errorType",
  "environment",
  "release",
  "endUserId",
  "sessionId",
  "tag",
  "minLatencyMs",
  "maxLatencyMs",
  "minTokens",
  "maxTokens",
  "not_traceName",
  "not_spanType",
  "not_toolName",
  "not_modelId",
  "not_errorType",
  "not_environment",
  "not_release",
  "not_endUserId",
  "not_sessionId",
  "not_tag",
  "minCostUsd",
  "maxCostUsd",
  "node",
  "edge",
  "errorGroup",
  "topic",
]);
export function savedViewQuery(query: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(query)
      .filter(
        ([key, value]) =>
          KEYS.has(key) &&
          value &&
          value.length <= (key === "q" || key === "sort" ? 200 : 4096),
      )
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}
export function savedViewColumns(columns: string[]) {
  return orderColumns([
    ...new Set(
      columns.filter(
        (id) =>
          isKnownColumn(id) &&
          (!isMetaColumn(id) || /^[\w.\- :/]{1,60}$/.test(id.slice(5))),
      ),
    ),
  ]).filter(
    (id, index, all) =>
      !isMetaColumn(id) || all.slice(0, index).filter(isMetaColumn).length < 20,
  );
}
export function savedViewState(
  query: Record<string, string>,
  columns: string[],
) {
  return JSON.stringify({
    query: savedViewQuery(query),
    columns: savedViewColumns(columns),
  });
}
export function columnsFromUrl(raw?: string) {
  if (!raw) return null;
  try {
    const values = JSON.parse(raw);
    return Array.isArray(values) && values.every((v) => typeof v === "string")
      ? savedViewColumns(values)
      : null;
  } catch {
    return null;
  }
}
type SavedViewBody = Record<string, unknown>;
/** Reads a saved-view POST body and rejects input problems the backend would only report as a generic failure. */
export async function readSavedViewRequest(
  request: Request,
): Promise<{ body: SavedViewBody } | { error: string }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: "Invalid JSON body" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return { error: "Invalid JSON body" };
  const view = body as SavedViewBody;
  if (
    view.action !== "delete" &&
    (typeof view.name !== "string" || !view.name.trim())
  )
    return { error: "Give the view a name" };
  return { body: view };
}
