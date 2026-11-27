
import { reportHandledError } from "@/lib/crash-report";
import { projectForApiKeyRequest } from "@/lib/api-key-auth";
import { redactString } from "@/lib/redaction";
import { listTraces } from "@/lib/tinybird";

const STATUSES = { any: "all", failed: "error", succeeded: "healthy" } as const;

function intParam(value: string | null, fallback: number, min: number, max: number) {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return parsed >= min && parsed <= max ? parsed : null;
}

/** Read-only list of the key's own project runs, newest first. */
export async function GET(request: Request) {
  const auth = await projectForApiKeyRequest(request);
  if ("error" in auth) return auth.error;

  const search = new URL(request.url).searchParams;
  const status = search.get("status") ?? "any";
  const limit = intParam(search.get("limit"), 10, 1, 20);
  const sinceMinutes = intParam(search.get("sinceMinutes"), 1440, 1, 10080);
  const agentName = search.get("agentName")?.trim().slice(0, 200);
  if (!(status in STATUSES) || limit === null || sinceMinutes === null) {
    return Response.json({ error: "Invalid query. status: any|failed|succeeded, limit: 1-20, sinceMinutes: 1-10080." }, { status: 400 });
  }

  const toMs = Date.now();
  try {
    const { rows } = await listTraces(
      auth.projectId,
      {
        fromMs: toMs - sinceMinutes * 60_000,
        toMs,
        status: STATUSES[status as keyof typeof STATUSES],
        facets: agentName ? { traceName: [agentName] } : undefined,
        sort: "startedAt",
        direction: "desc",
        pageSize: Math.max(limit, 10),
      },
      { extras: ["firstErrorMessage"] },
    );
    const runs = rows.slice(0, limit).map((row) => ({
      runId: row.runId,
      name: row.traceName,
      status: Number(row.errorCount) > 0 ? "failed" : "succeeded",
      startedAt: row.startedAt,
      durationMs: Number(row.durationMs),
      spanCount: Number(row.spanCount),
      totalCostUsd: Number(row.totalCostUsd),
      totalTokens: Number(row.inputTokens) + Number(row.outputTokens),
      firstError: row.firstErrorMessage ? redactString(String(row.firstErrorMessage), auth.redactionRules?.length ? auth.redactionRules : undefined) : null,
    }));
    return Response.json({ runs });
  } catch (error) {
    await reportHandledError("GET /api/v1/runs", error);
    return Response.json({ error: "Run data is temporarily unavailable. Try again in a moment." }, { status: 503 });
  }
}
