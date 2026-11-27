"use client";

import { compactNumber, formatCost, formatDuration, formatTime, parseTime, previewText, relativeTime } from "../tracing/format";
import type { GroupView } from "./group-view";
import { PixelId } from "./pixel";
import { useCopy, useGroupDetail, type Run } from "./use-group-detail";

const PAGE_FONT = "font-[family-name:var(--font-geist-pixel-square)]";
const RED = "#C2362B";
const ghost = "h-8 border border-[#090909] bg-transparent px-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-[#090909] hover:bg-[#090909] hover:text-[#eceae3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#090909] disabled:opacity-40";

/** The run timeline: where each run sits in the session, to scale. Failed runs are red. */
function Timeline({ runs }: { runs: Run[] }) {
  if (!runs.length) return null;
  const starts = runs.map((run) => parseTime(run.startedAt));
  const t0 = Math.min(...starts);
  const t1 = Math.max(...runs.map((run, index) => starts[index] + run.durationMs), t0 + 1);
  const span = t1 - t0;
  return (
    <div className="px-5 pb-4 pt-4">
      <div className="mb-1.5 flex justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-[#55534a]"><span>Timeline, to scale</span><span>{formatDuration(span)}</span></div>
      <div role="list" aria-label="Runs on a timeline" className="relative h-7 border-y border-[#090909]">
        {runs.map((run, index) => (
          <a key={run.runId} role="listitem" href={`#run-${run.runId}`} title={`${run.traceName || "run"} · ${formatTime(run.startedAt)} · ${formatDuration(run.durationMs)}${run.errorCount ? " · failed" : ""}`}
            aria-label={`Jump to run ${index + 1}${run.errorCount ? ", failed" : ""}`} className="absolute inset-y-0 min-w-[3px] hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#090909]"
            style={{ left: `${((starts[index] - t0) / span) * 100}%`, width: `${Math.max(0.4, (run.durationMs / span) * 100)}%`, background: run.errorCount ? RED : "#090909" }} />
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-[#55534a]"><span>{formatTime(runs[0].startedAt)}</span><span>{formatTime(new Date(t1).toISOString())}</span></div>
    </div>
  );
}

function Transcript({ runs, tracingBase }: { runs: Run[]; tracingBase: string }) {
  return (
    <ol className="relative mx-5 mb-6 ml-7 border-l border-[#090909] pl-7">
      {runs.map((run, index) => {
        const prompt = previewText(run.inputPreview), answer = previewText(run.outputPreview);
        const failed = run.errorCount > 0;
        return (
          <li key={run.runId} id={`run-${run.runId}`} className="relative scroll-mt-4 pb-7 last:pb-0">
            <span aria-hidden className="absolute -left-[35px] top-0.5 grid size-[17px] place-items-center border border-[#090909] bg-[#ECEAE3] font-mono text-[8px] leading-none" style={failed ? { background: RED, borderColor: RED, color: "#eceae3" } : undefined}>{index + 1}</span>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#55534a]">
              <span title={formatTime(run.startedAt)}>{formatTime(run.startedAt)}</span><span className="h-px flex-1 bg-[#090909]/20" /><span>{run.traceName || "run"}</span>
            </div>
            {prompt ? <p className="mt-2 w-fit max-w-[92%] whitespace-pre-wrap bg-[#090909] px-4 py-2.5 text-[14px] leading-6 text-[#eceae3]">{prompt}</p> : null}
            {answer ? <p className="mt-2 w-fit max-w-[92%] whitespace-pre-wrap border border-[#090909] bg-[#f7f5ef] px-4 py-2.5 text-[14px] leading-6">{answer}</p>
              : failed ? <p className="mt-2 w-fit border px-4 py-2.5 text-[13px]" style={{ borderColor: RED, color: RED }}>This run failed before it gave an answer.</p> : null}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.06em] text-[#55534a]">
              <span>{formatDuration(run.durationMs)}</span><span>{formatCost(run.totalCostUsd)}</span><span>{run.spanCount} steps</span>
              {failed ? <span style={{ color: RED }}>{run.errorCount} {run.errorCount === 1 ? "error" : "errors"}</span> : null}
              {run.modelId ? <span>{run.modelId}</span> : null}
              <a href={`${tracingBase}?trace=${encodeURIComponent(run.runId)}&range=90d`} className="ml-auto text-[#090909] underline underline-offset-2 hover:no-underline">Open trace</a>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** One session on cream paper: ticket header, to-scale timeline, then the conversation. */
export function SessionReader({ view, id }: { view: GroupView; id: string }) {
  const { projectId, basePath, clock } = view;
  const { detail, runs, error, retry, row, loaded, runRows } = useGroupDetail(projectId, "session", id, view.selectedRow);
  const { label: copyText, copy } = useCopy();
  const tracingBase = `${basePath}/tracing`;
  const encoded = encodeURIComponent(encodeURIComponent(id));
  return (
    <aside aria-label={`Session ${id}`} className="min-w-0 bg-[#ECEAE3] text-[#090909] lg:sticky lg:top-0 lg:h-svh lg:overflow-auto">
      <div className="flex flex-wrap items-start gap-2 border-b border-[#090909] px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#55534a]">Session transcript</div>
          <h2 className={`${PAGE_FONT} mt-1 break-all text-2xl leading-tight`} title={id}>{id}</h2>
        </div>
        <button type="button" className={ghost} onClick={() => copy("id", id)}>{copyText("id", "Copy id")}</button>
        <button type="button" className={ghost} onClick={() => copy("link", window.location.href)}>{copyText("link", "Copy link")}</button>
        <button type="button" className={ghost} onClick={view.selectIndex.bind(null, -1)} aria-label="Previous session">↑</button>
        <button type="button" className={ghost} onClick={view.selectIndex.bind(null, 1)} aria-label="Next session">↓</button>
        <button type="button" className={ghost} onClick={() => view.update({ id: "" }, false)} aria-label="Close transcript">×</button>
      </div>

      {error ? (
        <div role="alert" className="m-5 border p-4" style={{ borderColor: RED }}>
          <p style={{ color: RED }}>{error}</p>
          <button type="button" className="mt-2 bg-[#090909] px-3 py-1.5 font-mono text-[11px] uppercase text-[#eceae3]" onClick={retry}>Try again</button>
        </div>
      ) : null}
      {!loaded && !error ? <div className="p-6 text-[#55534a]" role="status">Loading…</div> : null}
      {loaded && !row ? (
        <div className="p-8 text-center">
          <p className={`${PAGE_FONT} text-xl`}>Nothing recorded</p>
          <p className="mt-1 text-[#55534a]">Nothing in the last 90 days. The id may be misspelled, or its data has expired.</p>
          <button type="button" className={`${ghost} mt-3`} onClick={() => view.update({ id: "" }, false)}>Back to the list</button>
        </div>
      ) : null}

      {row ? (
        <>
          <dl className="grid grid-cols-3 border-b border-[#090909] sm:grid-cols-6">
            {([
              ["Runs", compactNumber(row.runs), ""],
              ["Failed", row.failedRuns ? compactNumber(row.failedRuns) : "–", row.failedRuns ? RED : ""],
              ["Cost", formatCost(row.totalCostUsd), ""],
              ["Tokens", compactNumber(row.inputTokens + row.outputTokens), ""],
              ["Length", row.spanSeconds ? formatDuration(row.spanSeconds * 1000) : "–", ""],
              ["Steps", compactNumber(row.spanCount), ""],
            ] as const).map(([label, value, color], index) => (
              <div key={label} className={`px-4 py-3 ${index % 3 ? "border-l border-[#090909]" : ""} ${index > 2 ? "border-t border-[#090909] sm:border-t-0" : ""} ${index === 3 ? "sm:border-l" : ""}`}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#55534a]">{label}</dt>
                <dd className="mt-0.5 font-mono text-lg leading-6" style={color ? { color } : undefined}>{value}</dd>
              </div>
            ))}
          </dl>
          <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1 border-b border-[#090909] px-5 py-3 font-mono text-[11px]">
            <dt className="text-[#55534a]">First seen</dt><dd>{formatTime(row.firstSeenAt)}</dd>
            <dt className="text-[#55534a]">Last seen</dt><dd title={formatTime(row.lastSeenAt)}>{relativeTime(row.lastSeenAt, clock)}</dd>
            <dt className="text-[#55534a]">Environment</dt><dd>{row.environment || "–"}</dd>
            <dt className="text-[#55534a]">Top model</dt><dd>{row.topModel || "–"}</dd>
          </dl>
          <div className="flex flex-wrap gap-2 border-b border-[#090909] px-5 py-3">
            <a className={`${ghost} inline-flex items-center`} href={`${tracingBase}?sessionId=${encoded}&range=90d`}>Open all in Tracing</a>
            {row.failedRuns ? <a className={`${ghost} inline-flex items-center`} href={`${tracingBase}?sessionId=${encoded}&status=error&range=90d`}>Only failed runs</a> : null}
          </div>
          {detail?.siblings.length ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-[#090909] px-5 py-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#55534a]">Spoke with</span>
              {detail.siblings.map((item) => (
                <button key={item.id} type="button" onClick={() => view.open("user", item.id)} className="flex items-center gap-2 border border-[#090909] py-0.5 pl-0.5 pr-2.5 font-mono text-[11px] hover:bg-[#090909] hover:text-[#eceae3]">
                  <PixelId id={item.id} size={20} /><span className="max-w-[18ch] truncate">{item.id}</span><span className="text-[#55534a]">{item.runs} runs</span>
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {row ? (
        <section aria-label="Conversation">
          <Timeline runs={runRows} />
          <h3 className="px-5 pb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#55534a]">
            Conversation, oldest first{runs && runs.total > runRows.length ? ` · first ${runRows.length} of ${compactNumber(runs.total)}` : ""}
          </h3>
          {!runs ? <p className="px-5 pb-5 text-[#55534a]">Loading runs…</p> : null}
          {runs && !runRows.length ? <p className="px-5 pb-5 text-[#55534a]">No runs in the last 90 days.</p> : null}
          <Transcript runs={runRows} tracingBase={tracingBase} />
        </section>
      ) : null}
    </aside>
  );
}
