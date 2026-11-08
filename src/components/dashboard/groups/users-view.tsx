"use client";

import type { GroupRow } from "@/lib/tinybird-groups";
import { compactNumber, formatCost, formatTime, relativeTime } from "../tracing/format";
import { FilterChips, GroupControls, GroupFooter } from "./group-controls";
import type { GroupView } from "./group-view";
import { PixelId } from "./pixel";
import { UserProfile } from "./user-profile";
import { EmptyState } from "../empty/empty-state";
import { SampleUsers } from "../empty/samples";

const PAGE_FONT = "font-[family-name:var(--font-geist-pixel-square)]";
const SHARES = ["#090909", "#f4d44d", "#55534a", "#8f8c7b", "#b9b6a4"];

const COLUMNS = [
  { label: "User", sort: "id", first: "asc" },
  { label: "Runs", sort: "runs", first: "desc", right: true },
  { label: "Failure rate", sort: "failedRuns", first: "desc" },
  { label: "Sessions", right: true },
  { label: "Tokens", sort: "tokens", first: "desc", right: true },
  { label: "Cost", sort: "totalCostUsd", first: "desc", right: true },
  { label: "Last active", sort: "lastSeenAt", first: "desc", right: true },
] as const;

function FailureMeter({ row }: { row: GroupRow }) {
  const rate = row.runs ? row.failedRuns / row.runs : 0;
  const lit = rate > 0 ? Math.max(1, Math.round(rate * 10)) : 0;
  return (
    <span role="img" aria-label={`${Math.round(rate * 100)}% of runs failed`} className="flex items-center gap-2">
      <span className="flex gap-px">{Array.from({ length: 10 }, (_, index) => <span key={index} className={`h-3 w-1.5 ${index < lit ? "bg-[#C2362B]" : "bg-[#d3d0c1]"}`} />)}</span>
      <span className={`font-mono text-[11px] ${row.failedRuns ? "text-[#C2362B]" : "text-[#55534a]"}`}>{row.failedRuns ? `${Math.round(rate * 100)}%` : "0%"}</span>
    </span>
  );
}

/** Users: a ranked ledger on cream paper. Who costs what, who fails, who is active, with the profile opening in a black drawer. */
export function UsersView({ view }: { view: GroupView }) {
  const { rows, stats, selected, loading, data, error, fresh, clock, update, sort, direction, page, pageSize } = view;
  const maxRuns = Math.max(1, ...rows.map((row) => row.runs));
  const totalCost = stats?.totalCostUsd ?? 0;
  // The bar covers the users on this page, so its shares add up to 100% of what is shown.
  const pageCost = rows.reduce((sum, row) => sum + row.totalCostUsd, 0);
  const byCost = [...rows].sort((a, b) => b.totalCostUsd - a.totalCostUsd).filter((row) => row.totalCostUsd > 0);
  const top = byCost.slice(0, 5);
  const topShare = pageCost > 0 ? byCost.slice(0, 3).reduce((sum, row) => sum + row.totalCostUsd, 0) / pageCost : 0;
  const restShare = pageCost > 0 ? Math.max(0, 1 - top.reduce((sum, row) => sum + row.totalCostUsd, 0) / pageCost) : 0;
  const percent = (value: number) => (value > 0 && value < 0.01 ? "<1%" : `${Math.round(value * 100)}%`);
  const setSort = (column: (typeof COLUMNS)[number]) => {
    if (!("sort" in column)) return;
    update(sort === column.sort ? { sort: column.sort, dir: direction === "desc" ? "asc" : "desc" } : { sort: column.sort, dir: column.first });
  };

  return (
    <div className="flex min-h-svh min-w-0 flex-col bg-[#ECEAE3] font-[family-name:var(--font-geist-sans)] text-[13px] text-[#090909]">
      <header className="bg-[#090909] pb-4 pl-12 pr-5 pt-5 text-[#eceae3]">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#f4d44d]">Customers</p>
            <h1 className={`${PAGE_FONT} !ml-0 mt-1 text-4xl leading-none`}>Users</h1>
          </div>
          <p className="max-w-md text-[12px] leading-5 text-[#a9a693]">Everyone your agent has talked to, ranked. Click a column to rank by it, a person to open their profile.</p>
        </div>
        <div className="mt-4"><GroupControls view={view} /></div>
        <FilterChips view={view} />
      </header>

      <section aria-label="Summary" className="border-b border-[#090909]">
        <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {([
            ["Users", stats ? compactNumber(stats.groups) : "–", ""],
            ["Runs", stats ? compactNumber(stats.runs) : "–", ""],
            ["Failed runs", stats ? compactNumber(stats.failedRuns) : "–", stats?.failedRuns ? "text-[#C2362B]" : ""],
            ["Users with errors", stats ? compactNumber(stats.groupsWithErrors) : "–", ""],
            ["Cost", stats ? formatCost(stats.totalCostUsd) : "–", ""],
            ["Tokens", stats ? compactNumber(stats.tokens) : "–", ""],
          ] as const).map(([label, value, tone], index) => (
            <div key={label} className={`border-[#090909] px-5 py-4 ${index % 2 ? "border-l" : ""} ${index > 1 ? "border-t sm:border-t-0" : ""} sm:border-l sm:first:border-l-0 lg:border-t-0 ${index === 3 ? "sm:border-t" : ""} ${index > 2 ? "sm:border-t lg:border-t-0" : ""}`}>
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#55534a]">{label}</dt>
              <dd className={`${PAGE_FONT} mt-1 text-3xl leading-none ${tone}`}>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {top.length ? (
        <section aria-label="Where the spend goes" className="border-b border-[#090909] px-5 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#55534a]">Where the spend goes</h2>
            <p className="text-[12px]"><span className="font-semibold">{percent(topShare)}</span> of the cost on this page comes from the top {Math.min(3, byCost.length)} {byCost.length === 1 ? "user" : "users"}.</p>
          </div>
          <div role="img" aria-label={`Cost share: ${top.map((row) => `${row.id} ${percent(row.totalCostUsd / pageCost)}`).join(", ")}`} className="mt-3 flex h-7 border border-[#090909]">
            {top.map((row, index) => <span key={row.id} className="h-full min-w-[3px]" style={{ width: `${(row.totalCostUsd / pageCost) * 100}%`, background: SHARES[index] }} />)}
            {restShare > 0.001 ? <span className="h-full min-w-[3px] flex-1 bg-[repeating-linear-gradient(45deg,#d3d0c1_0_3px,#eceae3_3px_6px)]" style={{ flexBasis: `${restShare * 100}%` }} /> : null}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px]">
            {top.map((row, index) => <li key={row.id} className="flex items-center gap-1.5"><span className="size-2.5 border border-[#090909]" style={{ background: SHARES[index] }} /><span className="max-w-[22ch] truncate">{row.id}</span><span className="text-[#55534a]">{percent(row.totalCostUsd / pageCost)}</span></li>)}
            {restShare > 0.001 ? <li className="flex items-center gap-1.5 text-[#55534a]"><span className="size-2.5 border border-[#090909] bg-[#d3d0c1]" />Everyone else {percent(restShare)}</li> : null}
          </ul>
        </section>
      ) : null}

      <main className="min-h-0 min-w-0 flex-1">
        {error ? (
          <div role="alert" className="m-5 border border-[#C2362B] p-4">
            <p className="text-[#C2362B]">{error}</p>
            <button type="button" onClick={view.load} className="mt-3 bg-[#090909] px-3 py-1.5 font-mono text-[11px] uppercase text-[#eceae3]">Try again</button>
          </div>
        ) : null}
        {!data && !error ? <div className="p-6 text-[#55534a]" role="status">Loading users…</div> : null}
        {data && !rows.length && !error && !view.filters.length ? (
          <EmptyState tone="paper" eyebrow="Users" title="See who your agent is working for" why="Spend, errors and runs per end user show you who is struggling and who costs the most." sample={<SampleUsers />} action={{ label: "Add an end user id", href: `${view.basePath}/quickstart` }} />
        ) : null}
        {data && !rows.length && !error && view.filters.length ? (
          <div className="mx-auto max-w-sm p-10 text-center">
            <p className={`${PAGE_FONT} text-xl`}>{view.filters.length ? "Nobody matches" : "No users yet"}</p>
            <p className="mt-2 leading-5 text-[#55534a]">{view.filters.length ? "Clear a filter or widen the time range." : "Users appear once your agent sends an end user id with its steps. Add endUserId to your SDK calls."}</p>
            {view.filters.length ? <button type="button" className="mt-4 bg-[#090909] px-4 py-2 font-mono text-[11px] uppercase text-[#eceae3]" onClick={() => { view.setDraft(""); update({ q: "", environment: "", status: "", range: "90d", from: "", to: "" }); }}>Clear filters, show 90 days</button>
              : <a className="mt-4 inline-block bg-[#090909] px-4 py-2 font-mono text-[11px] uppercase text-[#eceae3]" href={`${view.basePath}/quickstart`}>Open quickstart</a>}
          </div>
        ) : null}

        {rows.length ? (
          <>
            <div className={`hidden overflow-x-auto md:block ${loading ? "opacity-60" : ""}`}>
              <table aria-label="Users" className="w-full min-w-[860px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#090909] font-mono text-[10px] uppercase tracking-[0.14em] text-[#55534a]">
                    <th scope="col" className="w-12 py-2.5 pl-5 pr-2 font-normal">#</th>
                    {COLUMNS.map((column) => {
                      const active = "sort" in column && sort === column.sort;
                      return (
                        <th key={column.label} scope="col" aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : undefined} className={`px-3 py-2.5 font-normal last:pr-5 ${"right" in column && column.right ? "text-right" : ""}`}>
                          {"sort" in column ? <button type="button" onClick={() => setSort(column)} className={`uppercase tracking-[0.14em] hover:text-[#090909] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#090909] ${active ? "text-[#090909] underline decoration-[#f4d44d] decoration-2 underline-offset-4" : ""}`}>{column.label}{active ? (direction === "asc" ? " ↑" : " ↓") : ""}</button> : column.label}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const on = selected === row.id;
                    return (
                      <tr key={row.id} className={`border-b border-[#090909]/25 ${on ? "bg-[#f4d44d]" : fresh.has(row.id) ? "bg-[#fff4b5]" : "hover:bg-[#e2dfd1]"}`}>
                        <td className="py-3 pl-5 pr-2 font-mono text-[11px] text-[#55534a]">{String(page * pageSize + index + 1).padStart(2, "0")}</td>
                        <td className="px-3 py-3">
                          <button type="button" aria-current={on} onClick={() => update({ id: row.id }, false)} className="flex min-w-0 items-center gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#090909]">
                            <PixelId id={row.id} size={32} />
                            <span className="min-w-0"><span className="block max-w-[26ch] truncate font-mono text-[13px] font-semibold" title={row.id}>{row.id}</span><span className="block max-w-[26ch] truncate font-mono text-[10px] text-[#55534a]">{row.topModel || "no model"}</span></span>
                          </button>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="font-mono text-[13px]">{compactNumber(row.runs)}</span>
                          <span className="ml-auto mt-1 block h-1 w-full max-w-[96px] bg-[#d3d0c1] [direction:rtl]"><span className="block h-full bg-[#090909]" style={{ width: `${(row.runs / maxRuns) * 100}%` }} /></span>
                        </td>
                        <td className="px-3 py-3"><FailureMeter row={row} /></td>
                        <td className="px-3 py-3 text-right font-mono text-[13px]">{compactNumber(row.others)}</td>
                        <td className="px-3 py-3 text-right font-mono text-[13px]">{compactNumber(row.inputTokens + row.outputTokens)}</td>
                        <td className="px-3 py-3 text-right"><span className="font-mono text-[13px] font-semibold">{formatCost(row.totalCostUsd)}</span>{totalCost > 0 ? <span className="block font-mono text-[10px] text-[#55534a]">{percent(row.totalCostUsd / totalCost)} of spend</span> : null}</td>
                        <td className="px-3 py-3 pr-5 text-right font-mono text-[11px] text-[#55534a]" title={formatTime(row.lastSeenAt)}>{relativeTime(row.lastSeenAt, clock)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul aria-label="Users" className={`md:hidden ${loading ? "opacity-60" : ""}`}>
              {rows.map((row, index) => (
                <li key={row.id} className="border-b border-[#090909]/25">
                  <button type="button" onClick={() => update({ id: row.id }, false)} className={`flex w-full items-center gap-3 px-5 py-3 text-left ${selected === row.id ? "bg-[#f4d44d]" : ""}`}>
                    <PixelId id={row.id} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-[13px] font-semibold">{row.id}</span>
                      <span className="block font-mono text-[10px] text-[#55534a]">#{page * pageSize + index + 1} · {compactNumber(row.runs)} runs · {row.failedRuns ? `${Math.round((row.failedRuns / Math.max(1, row.runs)) * 100)}% failed` : "no failures"}</span>
                    </span>
                    <span className="font-mono text-[13px] font-semibold">{formatCost(row.totalCostUsd)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </main>

      {selected ? <UserProfile key={selected} view={view} id={selected} /> : null}
      <GroupFooter view={view} className="border-t border-[#090909] text-[#55534a]" />
    </div>
  );
}
