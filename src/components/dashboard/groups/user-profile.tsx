"use client";

import { chip } from "./group-controls";
import { compactNumber, formatCost, formatDuration, formatTime, previewText, relativeTime } from "../tracing/format";
import type { GroupView } from "./group-view";
import { PixelId, RunCells } from "./pixel";
import { useCopy, useGroupDetail } from "./use-group-detail";

const PAGE_FONT = "font-[family-name:var(--font-geist-pixel-square)]";

/** One user as a black profile card that slides over the ledger: identity, totals, their sessions and their runs. */
export function UserProfile({ view, id }: { view: GroupView; id: string }) {
  const { projectId, basePath, clock, stats } = view;
  const { detail, runs, error, retry, row, loaded, runRows } = useGroupDetail(projectId, "user", id, view.selectedRow);
  const { label: copyText, copy } = useCopy();
  const tracingBase = `${basePath}/tracing`;
  const encoded = encodeURIComponent(encodeURIComponent(id));
  const share = row && stats?.totalCostUsd ? row.totalCostUsd / stats.totalCostUsd : null;
  return (
    <aside aria-label={`User ${id}`} className="fixed inset-y-0 right-0 z-30 flex min-h-0 w-full max-w-[480px] flex-col border-l border-[#f4d44d] bg-[#090909] text-[#eceae3] shadow-[-24px_0_48px_rgba(0,0,0,0.45)]">
      <div className="flex items-center gap-2 border-b border-[#2A2A25] px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#f4d44d]">User profile</span>
        <span className="flex-1" />
        <button type="button" className={chip} onClick={() => copy("id", id)}>{copyText("id", "Copy id")}</button>
        <button type="button" className={chip} onClick={() => copy("link", window.location.href)}>{copyText("link", "Copy link")}</button>
        <button type="button" className={chip} onClick={() => view.selectIndex(-1)} aria-label="Previous user">↑</button>
        <button type="button" className={chip} onClick={() => view.selectIndex(1)} aria-label="Next user">↓</button>
        <button type="button" className={chip} onClick={() => view.update({ id: "" }, false)} aria-label="Close profile">×</button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {error ? (
          <div role="alert" className="m-4 border border-[#FF6B6B] p-3">
            <p className="text-[#FF8A8A]">{error}</p>
            <button type="button" className="mt-2 bg-[#f4d44d] px-3 py-1.5 font-mono text-[11px] uppercase text-[#090909]" onClick={retry}>Try again</button>
          </div>
        ) : null}
        {!loaded && !error ? <div className="p-5 text-[#a9a693]" role="status">Loading…</div> : null}
        {loaded && !row ? (
          <div className="p-8 text-center">
            <p className={`${PAGE_FONT} text-xl`}>Nothing recorded</p>
            <p className="mt-1 text-[#a9a693]">Nothing for this user in the last 90 days. The id may be misspelled, or its data has expired.</p>
            <button type="button" className="mt-4 bg-[#f4d44d] px-3 py-1.5 font-mono text-[11px] uppercase text-[#090909]" onClick={() => view.update({ id: "" }, false)}>Back to the ledger</button>
          </div>
        ) : null}

        {row ? (
          <>
            <div className="flex items-center gap-4 px-5 py-5">
              <PixelId id={id} size={72} />
              <div className="min-w-0">
                <h2 className={`${PAGE_FONT} break-all text-2xl leading-tight`} title={id}>{id}</h2>
                <p className="mt-1 font-mono text-[11px] text-[#a9a693]" title={formatTime(row.lastSeenAt)}>Active {relativeTime(row.lastSeenAt, clock)} · since {formatTime(row.firstSeenAt)}</p>
              </div>
            </div>
            <RunCells runs={row.runs} failed={row.failedRuns} max={40} className="mx-5" />
            <dl className="mt-5 grid grid-cols-3 border-y border-[#2A2A25]">
              {([
                ["Runs", compactNumber(row.runs), ""],
                ["Failed", row.failedRuns ? compactNumber(row.failedRuns) : "–", row.failedRuns ? "text-[#FF6B6B]" : "text-[#8f8c7b]"],
                ["Cost", formatCost(row.totalCostUsd), ""],
                ["Tokens", compactNumber(row.inputTokens + row.outputTokens), ""],
                ["Active for", row.spanSeconds ? formatDuration(row.spanSeconds * 1000) : "–", ""],
                ["Share of spend", share === null ? "–" : `${Math.round(share * 100)}%`, "text-[#f4d44d]"],
              ] as const).map(([label, value, tone], index) => (
                <div key={label} className={`px-4 py-3 ${index % 3 ? "border-l border-[#2A2A25]" : ""} ${index > 2 ? "border-t border-[#2A2A25]" : ""}`}>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8c7b]">{label}</dt>
                  <dd className={`mt-0.5 font-mono text-lg ${tone}`}>{value}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-2 border-b border-[#2A2A25] px-5 py-3">
              <a className={`${chip} inline-flex items-center`} href={`${tracingBase}?endUserId=${encoded}&range=90d`}>Open all in Tracing</a>
              {row.failedRuns ? <a className={`${chip} inline-flex items-center`} href={`${tracingBase}?endUserId=${encoded}&status=error&range=90d`}>Only failed runs</a> : null}
            </div>
          </>
        ) : null}

        {row && detail?.siblings.length ? (
          <section aria-label="Sessions">
            <h3 className="px-5 pb-1 pt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[#f4d44d]">Sessions, newest first</h3>
            <ul>
              {detail.siblings.map((item) => (
                <li key={item.id} className="border-t border-[#1c1c19]">
                  <button type="button" onClick={() => view.open("session", item.id)} className="flex w-full items-center gap-3 px-5 py-2 text-left hover:bg-[#121210]">
                    <span className="min-w-0 flex-1 truncate font-mono text-xs">{item.id}</span>
                    <span className="font-mono text-[11px] text-[#a9a693]">{item.runs} runs</span>
                    {item.failedRuns ? <span className="font-mono text-[11px] text-[#FF8A8A]">{item.failedRuns} failed</span> : null}
                    <span className="font-mono text-[11px] text-[#a9a693]">{formatCost(item.totalCostUsd)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {row ? (
          <section aria-label="Runs">
            <h3 className="px-5 pb-1 pt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[#f4d44d]">
              Runs, oldest first{runs && runs.total > runRows.length ? ` · first ${runRows.length} of ${compactNumber(runs.total)}` : ""}
            </h3>
            {!runs ? <p className="px-5 pb-3 text-[#a9a693]">Loading runs…</p> : null}
            {runs && !runRows.length ? <p className="px-5 pb-3 text-[#a9a693]">No runs in the last 90 days.</p> : null}
            <ol>
              {runRows.map((run) => {
                const prompt = previewText(run.inputPreview), answer = previewText(run.outputPreview);
                return (
                  <li key={run.runId} className="border-t border-[#1c1c19]">
                    <a href={`${tracingBase}?trace=${encodeURIComponent(run.runId)}&range=90d`} className="block px-5 py-2.5 hover:bg-[#121210] focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-[#f4d44d]">
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className={`size-2 shrink-0 ${run.errorCount ? "bg-[#FF6B6B]" : "bg-[#f4d44d]"}`} aria-label={run.errorCount ? "Failed" : "Succeeded"} />
                        <span className="truncate">{run.traceName || run.runId}</span>
                        <span className="ml-auto shrink-0 text-[#a9a693]" title={formatTime(run.startedAt)}>{relativeTime(run.startedAt, clock)}</span>
                      </div>
                      {prompt ? <p className="mt-1 line-clamp-2 text-xs text-[#eceae3]"><span className="text-[#8f8c7b]">In </span>{prompt}</p> : null}
                      {answer ? <p className="mt-0.5 line-clamp-2 text-xs text-[#a9a693]"><span className="text-[#8f8c7b]">Out </span>{answer}</p> : null}
                      <div className="mt-1 flex flex-wrap gap-x-3 font-mono text-[10px] text-[#8f8c7b]">
                        <span>{formatDuration(run.durationMs)}</span><span>{formatCost(run.totalCostUsd)}</span><span>{run.spanCount} steps</span>
                        {run.errorCount ? <span className="text-[#FF8A8A]">{run.errorCount} errors</span> : null}
                        {run.modelId ? <span>{run.modelId}</span> : null}
                      </div>
                    </a>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : null}
      </div>
    </aside>
  );
}
