"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GroupKind } from "@/lib/group-filters";
import type { GroupRow } from "@/lib/tinybird-groups";
import { readJson } from "@/lib/safe-json";

export type Detail = { row: GroupRow | null; siblings: Array<{ id: string; runs: number; failedRuns: number; totalCostUsd: number; lastSeenAt: string }>; error?: string };
export type Run = { runId: string; traceName: string; startedAt: string; durationMs: number; spanCount: number; errorCount: number; totalCostUsd: number; modelId: string; inputPreview: string; outputPreview: string };
type RunsResponse = { rows: Run[]; total: number; error?: string };

const RUN_LIMIT = 100;
const DAY = 86_400_000;

/** One session or user: its totals, every run in order, and the opposite kind. Stays current while open: polls every 5s, skips hidden tabs, backs off to 60s on failures. */
export function useGroupDetail(projectId: string, kind: GroupKind, id: string, listRow: GroupRow | null) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [runs, setRuns] = useState<RunsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const field = kind === "session" ? "sessionId" : "endUserId";
  const encoded = encodeURIComponent(id);

  const load = useCallback(async (quiet: boolean) => {
    const issued = ++requestId.current;
    const to = Date.now();
    const runParams = new URLSearchParams({ from: String(to - 90 * DAY), to: String(to), [field]: encoded, sort: "startedAt", dir: "asc", pageSize: String(RUN_LIMIT) });
    try {
      const [detailResponse, runsResponse] = await Promise.all([
        fetch(`/api/projects/${encodeURIComponent(projectId)}/groups/${kind}?id=${encoded}`, { cache: "no-store" }),
        fetch(`/api/projects/${encodeURIComponent(projectId)}/traces?${runParams}`, { cache: "no-store" }),
      ]);
      const detailBody = await readJson<Detail>(detailResponse);
      const runsBody = await readJson<RunsResponse>(runsResponse);
      if (!detailResponse.ok) throw new Error(detailBody.error ?? `Could not load this ${kind} (error ${detailResponse.status}). Try again in a moment.`);
      if (!runsResponse.ok) throw new Error(runsBody.error ?? `Could not load its runs (error ${runsResponse.status}). Try again in a moment.`);
      if (issued !== requestId.current) return true;
      setDetail(detailBody);
      setRuns(runsBody);
      setError(null);
      return true;
    } catch (reason) {
      if (issued === requestId.current && !quiet) setError(reason instanceof Error ? reason.message : "Could not load this " + kind);
      return false;
    }
  }, [encoded, field, kind, projectId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(false); }, [load]);
  useEffect(() => {
    let delay = 5000;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (!document.hidden) delay = (await load(true)) ? 5000 : Math.min(delay * 2, 60_000);
      if (!stopped) timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, delay);
    return () => { stopped = true; clearTimeout(timer); };
  }, [load]);

  return { detail, runs, error, retry: () => void load(false), row: detail?.row ?? listRow, loaded: detail !== null, runRows: runs?.rows ?? [], field, encoded };
}

type CopyResult = { label: string; ok: boolean } | null;

/** Writes text to the clipboard and reports whether it worked; a blocked or missing clipboard is a failure. */
export async function writeClipboard(clipboard: Pick<Clipboard, "writeText"> | undefined, value: string) {
  try {
    if (!clipboard) return false;
    await clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

/** Button text: "Copied" or "Copy failed" on the button just pressed, its idle text everywhere else. */
export function copyLabel(result: CopyResult, label: string, idle: string) {
  if (result?.label !== label) return idle;
  return result.ok ? "Copied" : "Copy failed";
}

export function useCopy() {
  const [result, setResult] = useState<CopyResult>(null);
  return {
    label: (label: string, idle: string) => copyLabel(result, label, idle),
    copy(label: string, value: string) {
      void writeClipboard(navigator.clipboard, value).then((ok) => { setResult({ label, ok }); setTimeout(() => setResult(null), ok ? 1500 : 3000); });
    },
  };
}
