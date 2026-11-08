"use client";

import { compactNumber, formatCost, formatDuration, formatTime, relativeTime } from "../tracing/format";
import { FilterChips, GroupControls, GroupFooter } from "./group-controls";
import type { GroupView } from "./group-view";
import { RunCells } from "./pixel";
import { SessionReader } from "./session-reader";
import { EmptyState } from "../empty/empty-state";
import { SampleSessions } from "../empty/samples";

const PAGE_FONT = "font-[family-name:var(--font-geist-pixel-square)]";

/** Sessions: a flight recorder. A dark reel of conversations on the left, the selected one read like a printed transcript on the right. */
export function SessionsView({ view }: { view: GroupView }) {
  const { rows, stats, selected, loading, data, error, fresh, clock, update } = view;
  return (
    <div className="flex min-h-svh min-w-0 flex-col bg-[#090909] font-[family-name:var(--font-geist-sans)] text-[13px] text-[#eceae3]">
      <header className="border-b border-[#2A2A25] pb-4 pl-12 pr-5 pt-5">
        <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#f4d44d]">Conversations</p>
            <h1 className={`${PAGE_FONT} !ml-0 mt-1 text-4xl leading-none`}>Sessions</h1>
          </div>
          <dl aria-label="Summary" className="flex flex-wrap gap-x-8 gap-y-2 font-mono">
            {([
              ["Sessions", stats ? compactNumber(stats.groups) : "–", ""],
              ["Runs", stats ? compactNumber(stats.runs) : "–", ""],
              ["Failed", stats ? compactNumber(stats.failedRuns) : "–", stats?.failedRuns ? "text-[#FF6B6B]" : ""],
              ["With errors", stats ? compactNumber(stats.groupsWithErrors) : "–", ""],
              ["Cost", stats ? formatCost(stats.totalCostUsd) : "–", ""],
              ["Tokens", stats ? compactNumber(stats.tokens) : "–", ""],
            ] as const).map(([label, value, tone]) => (
              <div key={label}><dt className="text-[10px] uppercase tracking-[0.16em] text-[#8f8c7b]">{label}</dt><dd className={`text-xl leading-7 ${tone}`}>{value}</dd></div>
            ))}
          </dl>
        </div>
        <div className="mt-4"><GroupControls view={view} /></div>
        <FilterChips view={view} />
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
        <main className={`min-w-0 border-[#2A2A25] lg:border-r ${selected ? "hidden lg:block" : ""}`}>
          {error ? (
            <div role="alert" className="m-4 border border-[#FF6B6B] p-4">
              <p className="text-[#FF8A8A]">{error}</p>
              <button type="button" onClick={view.load} className="mt-3 bg-[#f4d44d] px-3 py-1.5 font-mono text-[11px] uppercase text-[#090909]">Try again</button>
            </div>
          ) : null}
          {!data && !error ? <div className="p-6 text-[#a9a693]" role="status">Loading sessions…</div> : null}
          {data && !rows.length && !error && !view.filters.length ? (
            <EmptyState eyebrow="Sessions" title="Follow one user through a whole conversation" why="A session groups every run that shares an id, so you see the full journey and where it went wrong." sample={<SampleSessions />} action={{ label: "Add a session id", href: `${view.basePath}/quickstart` }} />
          ) : null}
          {data && !rows.length && !error && view.filters.length ? (
            <div className="mx-auto max-w-sm p-10 text-center">
              <p className={`${PAGE_FONT} text-xl`}>{view.filters.length ? "Nothing matches" : "No sessions yet"}</p>
              <p className="mt-2 leading-5 text-[#a9a693]">{view.filters.length ? "Clear a filter or widen the time range." : "Sessions appear once your agent sends a session id with its steps. Add sessionId to your SDK calls."}</p>
              {view.filters.length ? <button type="button" className="mt-4 bg-[#f4d44d] px-4 py-2 font-mono text-[11px] uppercase text-[#090909]" onClick={() => { view.setDraft(""); update({ q: "", environment: "", status: "", range: "90d", from: "", to: "" }); }}>Clear filters, show 90 days</button>
                : <a className="mt-4 inline-block bg-[#f4d44d] px-4 py-2 font-mono text-[11px] uppercase text-[#090909]" href={`${view.basePath}/quickstart`}>Open quickstart</a>}
            </div>
          ) : null}
          {rows.length ? (
            <ul aria-label="Sessions" className={loading ? "opacity-60" : ""}>
              {rows.map((row) => (
                <li key={row.id} className={`border-b border-[#1c1c19] ${fresh.has(row.id) ? "bg-[#1e1b0a]" : ""}`}>
                  <button type="button" aria-current={selected === row.id} onClick={() => update({ id: row.id }, false)} className={`block w-full px-5 py-3.5 text-left hover:bg-[#121210] focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-[#f4d44d] ${selected === row.id ? "bg-[#141411] shadow-[inset_3px_0_0_#f4d44d]" : ""}`}>
                    <span className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate font-mono text-[13px] font-medium" title={row.id}>{row.id}</span>
                      <span className="shrink-0 font-mono text-[11px] text-[#8f8c7b]" title={formatTime(row.lastSeenAt)}>{relativeTime(row.lastSeenAt, clock)}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-[#a9a693]">{row.other ? `${row.other}${row.others > 1 ? ` +${row.others - 1}` : ""}` : "No user recorded"}</span>
                    <RunCells runs={row.runs} failed={row.failedRuns} className="mt-2.5" />
                    <span className="mt-2 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.06em] text-[#8f8c7b]">
                      <span>{compactNumber(row.runs)} runs</span>
                      {row.failedRuns ? <span className="text-[#FF8A8A]">{compactNumber(row.failedRuns)} failed</span> : null}
                      <span className="ml-auto">{row.spanSeconds ? formatDuration(row.spanSeconds * 1000) : ""}</span>
                      <span>{formatCost(row.totalCostUsd)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </main>

        {selected ? (
          <SessionReader key={selected} view={view} id={selected} />
        ) : (
          <div className="hidden bg-[#ECEAE3] p-10 text-[#090909] lg:grid lg:place-items-center">
            <div className="max-w-xs text-center">
              <p className={`${PAGE_FONT} text-2xl`}>Pick a session</p>
              <p className="mt-2 leading-5 text-[#55534a]">The whole conversation opens here as a printed transcript, question by answer, in order. Use ↑ and ↓ to move between sessions.</p>
            </div>
          </div>
        )}
      </div>
      <GroupFooter view={view} className="border-t border-[#2A2A25] text-[#8f8c7b]" />
    </div>
  );
}
