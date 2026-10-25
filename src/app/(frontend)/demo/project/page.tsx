import Link from "next/link";

import { OverviewChart } from "@/components/demo/overview-chart";
import { compactNumber, formatCost, formatDuration } from "@/components/dashboard/tracing/format";
import { DemoHeader, Page, RangeLinks } from "@/components/demo/demo-ui";
import { DEMO_BASE_PATH } from "@/lib/demo/demo-config";
import { demoSummary } from "@/lib/demo/demo-queries";

export const dynamic = "force-dynamic";

const RANGES = [["7", "7 days"], ["30", "30 days"], ["90", "90 days"]] as const;
const panel = "border border-[#1F242C] bg-[#0E1115]";

function change(now: number, before: number, lowerIsBetter = false) {
  if (!before) return null;
  const delta = (now - before) / before;
  const good = lowerIsBetter ? delta <= 0 : delta >= 0;
  return { text: `${delta >= 0 ? "↑" : "↓"} ${Math.abs(delta * 100).toFixed(Math.abs(delta) < 0.1 ? 1 : 0)}%`, tone: Math.abs(delta) < 0.005 ? "text-[#8B93A1]" : good ? "text-[#5BE3A0]" : "text-[#FF8A8A]" };
}

export default async function DemoOverviewPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const days = RANGES.some(([value]) => value === range) ? Number(range) : 7;
  const summary = demoSummary(days);
  const { stats, previous } = summary;
  const rate = stats.traces ? stats.errors / stats.traces : 0;
  const previousRate = previous.traces ? previous.errors / previous.traces : 0;
  const tiles = [
    { label: "Traces", value: compactNumber(stats.traces), delta: change(stats.traces, previous.traces) },
    { label: "Error rate", value: `${(rate * 100).toFixed(1)}%`, hint: `${compactNumber(stats.errors)} with errors`, delta: change(rate, previousRate, true), tone: "text-[#FF8A8A]" },
    { label: "Latency p50", value: formatDuration(stats.p50DurationMs), delta: change(stats.p50DurationMs, previous.p50DurationMs, true) },
    { label: "Latency p95", value: formatDuration(stats.p95DurationMs), delta: change(stats.p95DurationMs, previous.p95DurationMs, true) },
    { label: "Total cost", value: formatCost(stats.totalCostUsd), hint: `${formatCost(stats.totalCostUsd / Math.max(1, stats.traces))} per trace`, delta: change(stats.totalCostUsd, previous.totalCostUsd, true) },
    { label: "Tokens", value: compactNumber(stats.inputTokens + stats.outputTokens), hint: `${compactNumber(stats.inputTokens)} in · ${compactNumber(stats.outputTokens)} out`, delta: null },
  ];
  const groups = summary.errorGroups.groups.slice(0, 5);

  return (
    <Page>
      <DemoHeader title="Home">
        <RangeLinks base={DEMO_BASE_PATH} days={days} options={RANGES} />
      </DemoHeader>

      <div className="space-y-4 p-4">
        <section aria-label="Summary" className="grid grid-cols-2 gap-px border border-[#1F242C] bg-[#1F242C] md:grid-cols-3 xl:grid-cols-6">
          {tiles.map((tile) => (
            <div key={tile.label} className="bg-[#0E1115] px-3 py-2.5">
              <p className="text-[11px] text-[#8B93A1]">{tile.label}</p>
              <p className={`mt-1 font-mono text-xl ${tile.tone ?? "text-white"}`}>{tile.value}</p>
              <p className="mt-0.5 flex flex-wrap gap-x-2 font-mono text-[11px] text-[#6B7380]">
                {tile.delta ? <span className={tile.delta.tone}>{tile.delta.text}</span> : null}
                {tile.hint ? <span>{tile.hint}</span> : null}
                {tile.delta && !tile.hint ? <span>vs previous {days}d</span> : null}
              </p>
            </div>
          ))}
        </section>

        <section className="border border-[#f4d44d]/60 bg-[#f4d44d]/[0.06] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#f4d44d]">A story in this data</p>
          <h2 className="mt-1.5 text-base font-semibold text-white">Release v1.14.0 made refunds time out. v1.14.1 fixed it.</h2>
          <p className="mt-1 max-w-3xl text-[#C9CED6]">The refund agent&apos;s payment call started failing after the release and recovered a few days later. Follow the same path you would use on a real incident.</p>
          <div className="mt-3 flex flex-wrap gap-2 font-mono text-xs">
            <Link href={`${DEMO_BASE_PATH}/tracing?release=v1.14.0&status=error&range=30d`} className="bg-[#f4d44d] px-3 py-1.5 !text-[#090909] hover:bg-[#fff4b5]">See the failing traces</Link>
            <Link href={`${DEMO_BASE_PATH}/tracing?traceName=refund-agent&release=v1.14.1&range=30d`} className="border border-white/25 px-3 py-1.5 !text-white hover:border-white">See refunds after the fix</Link>
          </div>
        </section>

        <section className={panel} aria-label="Traces over time">
          <OverviewChart histogram={summary.histogram} range={summary.range} />
          <div className="h-3" />
        </section>

        <div className="grid gap-4 xl:grid-cols-2">
          <section className={panel} aria-label="Most common errors">
            <div className="flex items-center justify-between border-b border-[#1F242C] px-3 py-2"><h2 className="text-xs font-medium">Most common errors</h2><Link href={`${DEMO_BASE_PATH}/tracing?status=error&range=${days}d&errors=1`} className="font-mono text-[11px] !text-[#8AB4FF] hover:underline">All error groups →</Link></div>
            {groups.length ? (
              <ul>
                {groups.map((group) => (
                  <li key={group.id} className="border-b border-[#1F242C] last:border-0">
                    <Link href={`${DEMO_BASE_PATH}/tracing?errorGroup=${group.id}&range=${days}d`} className="flex items-start gap-3 px-3 py-2 hover:bg-[#111418]">
                      <span className="mt-0.5 min-w-10 font-mono text-sm text-[#FF8A8A]">{group.count}</span>
                      <span className="min-w-0"><span className="block font-mono text-xs text-[#E6E9EE]">{group.tool} · {group.errorType}</span><span className="block truncate text-xs text-[#8B93A1]">{group.message}</span></span>
                      <span className="ml-auto shrink-0 font-mono text-[11px] text-[#6B7380]">{group.traces} traces</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="px-3 py-6 text-center text-xs text-[#6B7380]">No errors in this period.</p>}
          </section>

          <section className={panel} aria-label="Releases">
            <div className="border-b border-[#1F242C] px-3 py-2"><h2 className="text-xs font-medium">Releases</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left">
                <thead className="font-mono text-[11px] text-[#6B7380]"><tr><th className="px-3 py-1.5 font-normal">Release</th><th className="px-3 py-1.5 text-right font-normal">Traces</th><th className="px-3 py-1.5 text-right font-normal">Error rate</th><th className="px-3 py-1.5 text-right font-normal">p95</th></tr></thead>
                <tbody className="font-mono text-xs">
                  {summary.releases.map((row) => {
                    const share = row.errors / Math.max(1, row.traces);
                    return (
                      <tr key={row.release} className="border-t border-[#1F242C] hover:bg-[#111418]">
                        <td className="px-3 py-1.5"><Link href={`${DEMO_BASE_PATH}/tracing?release=${encodeURIComponent(row.release)}&range=${days}d`} className="!text-[#8AB4FF] hover:underline">{row.release}</Link></td>
                        <td className="px-3 py-1.5 text-right text-[#C9CED6]">{compactNumber(row.traces)}</td>
                        <td className={`px-3 py-1.5 text-right ${share > 0.08 ? "text-[#FF8A8A]" : "text-[#C9CED6]"}`}>{(share * 100).toFixed(1)}%</td>
                        <td className="px-3 py-1.5 text-right text-[#C9CED6]">{formatDuration(row.p95DurationMs)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className={panel} aria-label="Recent failed traces">
          <div className="flex items-center justify-between border-b border-[#1F242C] px-3 py-2"><h2 className="text-xs font-medium">Latest failed traces</h2><Link href={`${DEMO_BASE_PATH}/tracing?status=error&range=${days}d`} className="font-mono text-[11px] !text-[#8AB4FF] hover:underline">Open in Tracing →</Link></div>
          {summary.failed.length ? (
            <ul>
              {summary.failed.map((run) => (
                <li key={run.runId} className="border-b border-[#1F242C] last:border-0">
                  <Link href={`${DEMO_BASE_PATH}/tracing?trace=${run.runId}&range=${days}d`} className="flex flex-wrap items-center gap-x-4 gap-y-0.5 px-3 py-2 hover:bg-[#111418]">
                    <span className="font-mono text-xs text-[#E6E9EE]">{run.traceName}</span>
                    <span className="font-mono text-xs text-[#FF8A8A]">{run.errorType}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-[#8B93A1]">{run.message}</span>
                    <span className="font-mono text-[11px] text-[#6B7380]">{run.release} · {formatDuration(run.durationMs)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="px-3 py-6 text-center text-xs text-[#6B7380]">No failed traces in this period.</p>}
        </section>
      </div>
    </Page>
  );
}
