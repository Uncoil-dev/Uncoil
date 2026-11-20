"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { compactNumber, formatCost, formatDuration } from "@/components/dashboard/tracing/format";
import { DEMO_BASE_PATH, DEMO_PROJECT_NAME } from "@/lib/demo/demo-config";
import { useSampleProjectHidden } from "@/lib/demo/sample-project-state";

type Row = { runId: string; traceName: string; startedAt: string; durationMs: number; errorCount: number; totalCostUsd: number; inputTokens: number; outputTokens: number };

/** A few sample runs shown inside a project that has no data yet, next to the setup steps. Never stored, never counted. */
export function SampleRuns() {
  const [hidden, setHidden] = useSampleProjectHidden();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (hidden) return;
    let cancelled = false;
    fetch("/api/projects/demo/traces?pageSize=10")
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => { if (!cancelled && body?.rows) setRows(body.rows.slice(0, 6)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [hidden]);

  if (hidden) {
    return <button type="button" onClick={() => setHidden(false)} className="mt-4 font-mono text-[11px] text-[#8B93A1] underline-offset-4 hover:text-white hover:underline">Show sample runs</button>;
  }
  if (!rows?.length) return null;

  return (
    <section data-testid="sample-runs" aria-label="Sample runs" className="mx-auto mt-6 w-full max-w-4xl border border-[#262C35] bg-[#0E1115] text-left">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#1F242C] px-3 py-2">
        <span className="bg-[#F4D44D] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-[#090909]">Sample</span>
        <span className="font-mono text-xs text-[#9AA2AF]">Runs from {DEMO_PROJECT_NAME} · not your data, not counted in your limits</span>
        <button type="button" onClick={() => setHidden(true)} className="ml-auto font-mono text-[11px] text-[#8B93A1] underline-offset-4 hover:text-white hover:underline">Hide</button>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-xs">
          <thead className="font-mono text-[11px] text-[#6B7380]">
            <tr><th className="px-3 py-1.5 text-left font-normal">Run</th><th className="px-3 py-1.5 text-left font-normal">Result</th><th className="px-3 py-1.5 text-right font-normal">Time</th><th className="px-3 py-1.5 text-right font-normal">Tokens</th><th className="px-3 py-1.5 text-right font-normal">Cost</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.runId} className="border-t border-[#1F242C] hover:bg-[#111418]">
                <td className="px-3 py-2"><Link href={`${DEMO_BASE_PATH}/tracing?trace=${encodeURIComponent(row.runId)}`} className="!text-[#E6E9EE] hover:underline">{row.traceName}</Link></td>
                <td className={`px-3 py-2 font-mono ${row.errorCount ? "text-[#FF8A8A]" : "text-[#5BE3A0]"}`}>{row.errorCount ? `${row.errorCount} error${row.errorCount > 1 ? "s" : ""}` : "ok"}</td>
                <td className="px-3 py-2 text-right font-mono text-[#C9CED6]">{formatDuration(row.durationMs)}</td>
                <td className="px-3 py-2 text-right font-mono text-[#C9CED6]">{compactNumber(row.inputTokens + row.outputTokens)}</td>
                <td className="px-3 py-2 text-right font-mono text-[#C9CED6]">{formatCost(row.totalCostUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
