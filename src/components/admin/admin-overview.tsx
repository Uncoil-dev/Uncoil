"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { BrandLogo } from "@/components/brand-logo";
import { compactNumber, formatCost } from "@/components/dashboard/tracing/format";
import { AdminStyles, Panel, PixelBars, Table, Tile, abs, ago, dim, mono, pill } from "./admin-ui";
import { SearchTab, useSearchReports, type SearchReports } from "./admin-search";

const tabs = [
  { id: "Today", label: "Today", note: "What needs you" },
  { id: "People", label: "People", note: "Everyone who signed up" },
  { id: "Projects", label: "Projects", note: "Every project and its owner" },
  { id: "Money", label: "Money", note: "Who pays, who is leaving" },
  { id: "Usage", label: "Usage", note: "Who sends the most data" },
  { id: "Leads", label: "Leads", note: "People who wrote to us" },
  { id: "Search", label: "Search", note: "Google and Bing" },
  { id: "Alerts", label: "Alerts", note: "What went wrong" },
  { id: "Activity", label: "Activity", note: "Latest runs" },
  { id: "Audit", label: "Audit log", note: "Who changed what" },
] as const;
type Tab = (typeof tabs)[number]["id"];

function csvCell(v: unknown) {
  const t = String(v ?? "");
  return /^[=+\-@\t\r]/.test(t) ? `'${t}` : t;
}
function downloadCsv(name: string, head: string[], rows: unknown[][]) {
  const body = [head, ...rows].map((r) => r.map((c) => `"${csvCell(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([body], { type: "text/csv" }));
  a.download = `uncoil-${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}


type AdminProject = AdminData["projects"][number];
const ownerCell = (p: AdminProject, openUser: (email: string) => void) =>
  p.ownerEmail ? (
    <button type="button" onClick={() => openUser(p.ownerEmail!)} className="text-left hover:underline" title="Show this person">
      {p.ownerEmail}{p.ownerName ? <span className="ml-2 text-[#090909]/55">{p.ownerName}</span> : null}
    </button>
  ) : p.owner ? pill("unknown owner", "warn") : dim("—");

export type AdminData = NonNullable<ReturnType<typeof useQuery<typeof api.admin.overview>>>;

export function AdminOverview() {
  const data = useQuery(api.admin.overview, {});
  return <AdminView data={data} />;
}

export function AdminView({ data, initialTab = "Today", searchPreset }: { data: AdminData | undefined; initialTab?: Tab; searchPreset?: SearchReports }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [search, setSearch] = useState("");
  const { reports, failed } = useSearchReports(tab === "Search", searchPreset);
  const q = search.trim().toLowerCase();
  const current = tabs.find((t) => t.id === tab)!;
  const go = (t: Tab) => { setTab(t); setSearch(""); };
  function openUser(email: string) { setTab("People"); setSearch(email); }
  function exportTab() {
    if (!data) return;
    const d = data;
    const sets: Record<string, [string[], unknown[][]]> = {
      People: [["name", "email", "verified", "projects", "signed up"], d.users.map((u) => [u.name, u.email, u.verified, u.projectCount, new Date(u.signedUpAt).toISOString()])],
      Projects: [["project", "owner email", "owner name", "plan", "subscription", "api key", "created"], d.projects.map((p) => [p.name, p.ownerEmail ?? "", p.ownerName ?? "", p.plan, p.subscription, p.hasApiKey, new Date(p.createdAt).toISOString()])],
      Money: [["project", "plan", "subscription", "renews", "cancelling"], d.projects.map((p) => [p.name, p.plan, p.subscription, p.periodEnd ? new Date(p.periodEnd).toISOString() : "", p.cancelling])],
      Usage: [["project", "runs 7d", "steps", "failed", "cost usd"], d.usage.map((u) => [u.project, u.runs, u.spans, u.failed, u.costUsd])],
      Alerts: [["project", "type", "message", "state", "triggered"], d.alerts.map((a) => [a.project, a.type, a.message, a.state, a.triggeredAt])],
      Leads: [["name", "email", "company", "intent", "status", "source", "created"], d.leads.map((l) => [l.name, l.email, l.company, l.intent, l.status, l.source, new Date(l.createdAt).toISOString()])],
      Activity: [["run", "project", "model", "status", "steps", "cost usd", "started"], d.recentRuns.map((r) => [r.runId, r.project, r.model, r.status, r.spans, r.costUsd, r.startedAt])],
      Audit: [["actor", "action", "summary", "project", "when"], d.audit.map((a) => [a.actor, a.action, a.summary, a.project, new Date(a.createdAt).toISOString()])],
    };
    const set = sets[tab] ?? sets.People;
    downloadCsv((sets[tab] ? tab : "People").toLowerCase(), set[0], set[1]);
  }
  const canExport = !!data && tab !== "Today" && tab !== "Search";

  return (
    <div className="min-h-screen bg-[#eceae3] font-sans text-[#090909] lg:flex">
      <AdminStyles />
      <aside className="flex shrink-0 flex-col bg-[#090909] text-[#eceae3] lg:sticky lg:top-0 lg:h-screen lg:w-60">
        <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5 lg:block">
          <BrandLogo className="text-2xl" />
          <p className="mt-0 font-mono text-[10px] uppercase tracking-[0.2em] text-[#f4d44d] lg:mt-3">Admin · team only</p>
        </div>
        <Link href="/dashboard" className="mx-5 mb-3 hidden bg-[#f4d44d] px-3 py-2.5 text-center font-mono text-[11px] font-medium uppercase tracking-wider text-[#090909] hover:bg-[#fff4b5] lg:block">
          ← Back to dashboard
        </Link>
        <nav className="flex gap-px overflow-x-auto px-2 pb-2 lg:block lg:flex-1 lg:overflow-y-auto lg:pb-0" aria-label="Admin sections">
          <Link href="/dashboard" className="shrink-0 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-[#f4d44d] lg:hidden">← Dashboard</Link>
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => go(t.id)} aria-current={tab === t.id ? "page" : undefined}
              className={`block shrink-0 px-3 py-2 text-left font-mono text-[12px] uppercase tracking-wider lg:w-full lg:py-2.5 ${tab === t.id ? "bg-[#eceae3] text-[#090909]" : "text-[#eceae3]/70 hover:bg-white/10 hover:text-[#eceae3]"}`}>
              {t.label}
              {t.id === "Leads" && data?.newLeads ? <span className="ml-2 bg-[#f4d44d] px-1 text-[10px] text-[#090909]">{data.newLeads}</span> : null}
            </button>
          ))}
        </nav>
        <p className="hidden px-5 py-4 font-mono text-[10px] leading-4 text-[#eceae3]/45 lg:block">
          <span className="adm-live mr-1.5 inline-block h-1.5 w-1.5 bg-[#f4d44d]" />Live · read only
        </p>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-end gap-4 border-b border-[#090909]/15 px-5 pb-5 pt-8 lg:px-10">
          <div className="min-w-0 flex-1">
            <h1 className="font-pixel text-5xl leading-none tracking-[-0.04em] lg:text-6xl">{current.label}</h1>
            <p className="mt-3 text-sm text-[#090909]/60">{current.note}</p>
          </div>
          {canExport ? (
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type to filter" aria-label="Filter this page"
              className="h-10 w-full border border-[#090909]/30 bg-[#f6f4ee] px-3 text-[13px] placeholder:text-[#090909]/45 focus:border-[#090909] focus:outline-none sm:w-56" />
          ) : null}
          {canExport ? (
            <button type="button" onClick={() => exportTab()} className="h-10 border border-[#090909] bg-[#090909] px-4 font-mono text-[11px] uppercase tracking-wider text-[#eceae3] hover:bg-[#f4d44d] hover:text-[#090909]">
              Download CSV
            </button>
          ) : null}
        </header>

        <main className="space-y-6 px-5 py-8 lg:px-10">
          {tab === "Search" ? <SearchTab reports={reports} failed={failed} /> : data === undefined ? <p className="text-[13px] text-[#090909]/60">Loading…</p> : (
            <>
              {data.capped.users || data.capped.projects || data.capped.runs ? (
                <p className="bg-[#f4d44d] px-3 py-2 font-mono text-[11px]">Some totals stop at 500 rows, so the real number may be higher.</p>
              ) : null}

              {tab === "Today" && <Today data={data} go={go} />}

              {tab === "People" && (
                <Table head={["Name", "Email", "Email check", "Projects", "Signed up"]} empty="No one matches."
                  rows={data.users.filter((u) => !q || `${u.name} ${u.email}`.toLowerCase().includes(q)).map((u) => [u.name || "—", u.email, u.verified ? pill("verified", "ok") : pill("not verified", "warn"), mono(u.projectCount), <span key="t" title={abs(u.signedUpAt)}>{dim(ago(u.signedUpAt))}</span>])} />
              )}

              {tab === "Projects" && (
                <Table head={["Project", "Owner", "Plan", "Payment", "API key", "Last data in", "Created"]} empty="No projects match."
                  rows={data.projects.filter((p) => !q || `${p.name} ${p.ownerEmail ?? ""} ${p.ownerName ?? ""}`.toLowerCase().includes(q)).map((p) => [p.name, ownerCell(p, openUser), pill(p.plan, p.plan === "free" ? "mute" : "ok"), dim(p.subscription ?? "—"), p.hasApiKey ? pill("active", "ok") : pill("none", "mute"), dim(p.lastKeyUseAt ? ago(p.lastKeyUseAt) : "never"), <span key="t" title={abs(p.createdAt)}>{dim(ago(p.createdAt))}</span>])} />
              )}

              {tab === "Money" && <Money data={data} q={q} openUser={openUser} />}

              {tab === "Leads" && (
                <Table head={["Name", "Email", "Company", "Wants", "Status", "From page", "Received"]} empty="No leads match."
                  rows={data.leads.filter((l) => !q || `${l.name} ${l.email} ${l.company ?? ""} ${l.intent}`.toLowerCase().includes(q)).map((l) => [l.name, l.email, l.company ?? "—", dim(l.intent), pill(l.status, l.status === "new" ? "warn" : "mute"), dim(l.source), <span key="t" title={abs(l.createdAt)}>{dim(ago(l.createdAt))}</span>])} />
              )}

              {tab === "Audit" && (
                <Table head={["Who", "Action", "What", "Project", "When"]} empty="No entries."
                  rows={data.audit.filter((a) => !q || `${a.actor} ${a.action} ${a.summary} ${a.project}`.toLowerCase().includes(q)).map((a) => [a.actor, mono(a.action), <span key="s" className="line-clamp-1 max-w-md">{a.summary}</span>, a.project, <span key="t" title={abs(a.createdAt)}>{dim(ago(a.createdAt))}</span>])} />
              )}

              {tab === "Usage" && (
                <Table head={["Project", "Runs (7 days)", "Steps", "Failed", "Cost"]} empty="No data in the last 7 days."
                  rows={data.usage.filter((u) => !q || u.project.toLowerCase().includes(q)).map((u) => [u.project, mono(u.runs), mono(compactNumber(u.spans)), u.failed ? pill(String(u.failed), "bad") : dim("0"), mono(formatCost(u.costUsd))])} />
              )}

              {tab === "Alerts" && (
                <Table head={["Project", "Type", "Message", "State", "Triggered"]} empty="No alerts. All quiet."
                  rows={data.alerts.filter((a) => !q || `${a.project} ${a.type} ${a.message}`.toLowerCase().includes(q)).map((a) => [a.project, mono(a.type), <span key="m" className="line-clamp-1 max-w-md">{a.message}</span>, pill(a.state, a.state === "active" ? "warn" : "mute"), <span key="t" title={abs(a.triggeredAt)}>{dim(ago(a.triggeredAt))}</span>])} />
              )}

              {tab === "Activity" && (
                <Table head={["Run", "Project", "Model", "Result", "Steps", "Cost", "Started"]} empty="No runs yet."
                  rows={data.recentRuns.filter((r) => !q || `${r.project} ${r.model ?? ""} ${r.runId}`.toLowerCase().includes(q)).map((r) => [mono(r.runId.slice(0, 14)), r.project, dim(r.model ?? "—"), pill(r.status, r.status === "failed" ? "bad" : r.status === "completed" ? "ok" : "mute"), mono(r.spans), mono(formatCost(r.costUsd)), <span key="t" title={abs(r.startedAt)}>{dim(ago(r.startedAt))}</span>])} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Today({ data, go }: { data: AdminData; go: (t: Tab) => void }) {
  const t = data.totals;
  const labels = data.series.map((d) => d.day.slice(5));
  return (
    <>
      <section className="adm-rise bg-[#f4d44d] p-5">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em]">Needs you now</h2>
        {data.attention.length === 0 ? (
          <p className="mt-3 font-pixel text-3xl">Nothing. All quiet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#090909]/20">
            {data.attention.map((a) => (
              <li key={a.kind}>
                <button type="button" onClick={() => go(a.tab as Tab)} className="flex w-full items-center justify-between gap-4 py-2.5 text-left text-[15px] hover:underline">
                  <span>{a.text}</span><span className="font-mono text-[11px] uppercase tracking-wider">Open →</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="People" value={t.users} sub={`${t.verifiedUsers} verified · ${t.signups7d} new this week`} />
        <Tile label="Projects" value={t.projects} sub={`${t.projectsWithKey} sending data`} delay={60} />
        <Tile label="Paying" value={t.paidProjects} sub="projects on a paid plan" delay={120} />
        <Tile label="Runs today" value={compactNumber(t.runs24h)} sub={`${compactNumber(t.runs7d)} this week`} delay={180} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="New people · 14 days" hint={`${t.signups7d} joined this week`}>
          <PixelBars values={data.series.map((d) => d.signups)} labels={labels} />
        </Panel>
        <Panel title="Runs · 14 days" hint="Hatched part = failed runs">
          <PixelBars values={data.series.map((d) => d.runs)} marks={data.series.map((d) => d.failed)} labels={labels} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Newest people" dark={false} className="lg:col-span-1">
          <ul className="space-y-2.5">
            {data.users.slice(0, 6).map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="truncate">{u.email}</span><span className="shrink-0">{dim(ago(u.signedUpAt))}</span>
              </li>
            ))}
            {data.users.length === 0 ? <li className="text-[13px] text-[#090909]/55">No one yet.</li> : null}
          </ul>
        </Panel>
        <Panel title="Plans" dark={false}>
          <ul className="space-y-3">
            {Object.entries(data.planCounts).map(([plan, n]) => (
              <li key={plan} className="text-[13px]">
                <div className="mb-1 flex justify-between"><span className="capitalize">{plan}</span>{mono(n)}</div>
                <div className="h-2 bg-[#090909]/10"><div className="h-2 bg-[#090909]" style={{ width: `${t.projects ? (n / t.projects) * 100 : 0}%` }} /></div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Latest runs" dark={false}>
          <ul className="space-y-2.5">
            {data.recentRuns.slice(0, 6).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="truncate">{r.project}</span>
                <span className="flex shrink-0 items-center gap-2">{pill(r.status, r.status === "failed" ? "bad" : r.status === "completed" ? "ok" : "mute")}{dim(ago(r.startedAt))}</span>
              </li>
            ))}
            {data.recentRuns.length === 0 ? <li className="text-[13px] text-[#090909]/55">No runs yet.</li> : null}
          </ul>
        </Panel>
      </div>
      <p className="font-mono text-[11px] text-[#090909]/50">Cost this week {formatCost(t.cost7dUsd)} · {t.failed7d} failed runs · {t.alertRules} alert rules · updated {ago(data.generatedAt)}</p>
    </>
  );
}

function Money({ data, q, openUser }: { data: AdminData; q: string; openUser: (e: string) => void }) {
  const paid = data.projects.filter((p) => p.plan !== "free" || p.subscription);
  const rows = paid.filter((p) => !q || `${p.name} ${p.ownerEmail ?? ""}`.toLowerCase().includes(q));
  const soon = paid.filter((p) => p.periodEnd && p.periodEnd - data.generatedAt < 7 * 86400000 && p.periodEnd > data.generatedAt);
  const bad = paid.filter((p) => p.subscription === "past_due" || p.subscription === "unpaid");
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Paying" value={paid.length} sub="projects" />
        <Tile label="Leaving" value={paid.filter((p) => p.cancelling).length} sub="cancel at period end" delay={60} />
        <Tile label="Failed payment" value={bad.length} sub="needs a nudge" delay={120} />
        <Tile label="Renew in 7 days" value={soon.length} delay={180} />
      </div>
      <Table head={["Project", "Owner", "Plan", "Payment", "Renews", "Leaving?"]} empty="No paid projects match."
        rows={rows.map((p) => [p.name, ownerCell(p, openUser), pill(p.plan, "ok"), p.subscription === "past_due" || p.subscription === "unpaid" ? pill(p.subscription, "bad") : dim(p.subscription ?? "—"), dim(p.periodEnd ? new Date(p.periodEnd).toLocaleDateString() : "—"), p.cancelling ? pill("yes", "warn") : dim("no")])} />
    </>
  );
}
