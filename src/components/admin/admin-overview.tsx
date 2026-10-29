"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { compactNumber, formatCost } from "@/components/dashboard/tracing/format";

const tabs = ["Overview", "Users", "Projects", "Billing", "Usage", "Alerts", "Leads", "Activity", "Audit"] as const;
type Tab = (typeof tabs)[number];

const ago = (ms: number | string) => {
  const t = typeof ms === "number" ? ms : Date.parse(ms);
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
const abs = (ms: number | string) => new Date(ms).toLocaleString();

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="border-r border-[#1F242C] px-4 py-3 last:border-r-0">
      <div className="font-mono text-[10px] uppercase tracking-wider text-[#6B7380]">{label}</div>
      <div className="mt-1 font-mono text-xl text-[#E6E9EE]">{value}</div>
      {sub ? <div className="font-mono text-[10px] text-[#8B93A1]">{sub}</div> : null}
    </div>
  );
}

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

function Table({ head, rows, empty }: { head: string[]; rows: React.ReactNode[][]; empty: string }) {
  return (
    <div className="overflow-x-auto border border-[#1F242C] bg-[#0E1115]">
      <table className="w-full min-w-[640px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-[#1F242C] bg-[#111418] font-mono text-[10px] uppercase tracking-wider text-[#6B7380]">
            {head.map((h) => <th key={h} className="px-3 py-2 font-normal">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="h-8 border-b border-[#1F242C]/60 text-[#E6E9EE] last:border-0 hover:bg-[#111418]">
              {r.map((c, j) => <td key={j} className="px-3 py-1.5 align-middle">{c}</td>)}
            </tr>
          ))}
          {rows.length === 0 ? <tr><td colSpan={head.length} className="px-3 py-6 text-center text-[#8B93A1]">{empty}</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

type AdminProject = AdminData["projects"][number];
const ownerCell = (p: AdminProject, openUser: (email: string) => void) =>
  p.ownerEmail ? (
    <button type="button" onClick={() => openUser(p.ownerEmail!)} className="text-left hover:text-[#F4D44D]" title="Show this user">
      {p.ownerEmail}{p.ownerName ? <span className="ml-2 text-[#8B93A1]">{p.ownerName}</span> : null}
    </button>
  ) : p.owner ? pill("unknown owner", "warn") : dim("—");

const mono = (v: React.ReactNode) => <span className="font-mono text-[12px]">{v}</span>;
const dim = (v: React.ReactNode) => <span className="font-mono text-[12px] text-[#8B93A1]">{v}</span>;
const pill = (text: string, tone: "ok" | "bad" | "warn" | "mute") => (
  <span className={`font-mono text-[11px] ${{ ok: "text-[#5BE3A0]", bad: "text-[#FF6B6B]", warn: "text-[#F4D44D]", mute: "text-[#8B93A1]" }[tone]}`}>{text}</span>
);

export type AdminData = NonNullable<ReturnType<typeof useQuery<typeof api.admin.overview>>>;

export function AdminOverview() {
  const data = useQuery(api.admin.overview, {});
  return <AdminView data={data} />;
}

export function AdminView({ data }: { data: AdminData | undefined }) {
  const [tab, setTab] = useState<Tab>("Overview");
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  function openUser(email: string) { setTab("Users"); setSearch(email); }
  function exportTab() {
    if (!data) return;
    const d = data;
    const sets: Record<string, [string[], unknown[][]]> = {
      Users: [["name", "email", "verified", "projects", "signed up"], d.users.map((u) => [u.name, u.email, u.verified, u.projectCount, new Date(u.signedUpAt).toISOString()])],
      Projects: [["project", "owner email", "owner name", "plan", "subscription", "api key", "created"], d.projects.map((p) => [p.name, p.ownerEmail ?? "", p.ownerName ?? "", p.plan, p.subscription, p.hasApiKey, new Date(p.createdAt).toISOString()])],
      Billing: [["project", "plan", "subscription", "renews", "cancelling"], d.projects.map((p) => [p.name, p.plan, p.subscription, p.periodEnd ? new Date(p.periodEnd).toISOString() : "", p.cancelling])],
      Usage: [["project", "runs 7d", "steps", "failed", "cost usd"], d.usage.map((u) => [u.project, u.runs, u.spans, u.failed, u.costUsd])],
      Alerts: [["project", "type", "message", "state", "triggered"], d.alerts.map((a) => [a.project, a.type, a.message, a.state, a.triggeredAt])],
      Leads: [["name", "email", "company", "intent", "status", "source", "created"], d.leads.map((l) => [l.name, l.email, l.company, l.intent, l.status, l.source, new Date(l.createdAt).toISOString()])],
      Activity: [["run", "project", "model", "status", "steps", "cost usd", "started"], d.recentRuns.map((r) => [r.runId, r.project, r.model, r.status, r.spans, r.costUsd, r.startedAt])],
      Audit: [["actor", "action", "summary", "project", "when"], d.audit.map((a) => [a.actor, a.action, a.summary, a.project, new Date(a.createdAt).toISOString()])],
    };
    const set = sets[tab] ?? sets.Users;
    downloadCsv((sets[tab] ? tab : "Users").toLowerCase(), set[0], set[1]);
  }

  return (
    <div className="min-h-screen bg-[#0B0D10] font-sans text-[#E6E9EE]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#1F242C] px-4 py-3">
        <h1 className="text-[15px] font-medium">Admin</h1>
        <span className="font-mono text-[11px] text-[#6B7380]">Read-only · admins only</span>
        <span className="ml-auto flex items-center gap-2 font-mono text-[11px] text-[#5BE3A0]">
          <span className="h-1.5 w-1.5 animate-pulse bg-[#5BE3A0]" /> Live
        </span>
        <button type="button" onClick={() => exportTab()} disabled={!data}
          className="h-8 border border-[#262C35] bg-[#0E1115] px-3 font-mono text-[11px] uppercase tracking-wider text-[#E6E9EE] hover:border-[#F4D44D] disabled:opacity-40">
          Export CSV
        </button>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter this tab"
          aria-label="Filter this tab"
          className="h-8 w-48 border border-[#262C35] bg-[#0E1115] px-2 text-[13px] text-[#E6E9EE] placeholder:text-[#6B7380] focus:border-[#F4D44D] focus:outline-none"
        />
      </header>

      <nav className="flex gap-px overflow-x-auto border-b border-[#1F242C] px-2" aria-label="Admin sections">
        {tabs.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} aria-current={tab === t}
            className={`h-9 border-b-2 px-3 font-mono text-[11px] uppercase tracking-wider ${tab === t ? "border-[#F4D44D] text-[#E6E9EE]" : "border-transparent text-[#8B93A1] hover:text-[#E6E9EE]"}`}>
            {t}
          </button>
        ))}
      </nav>

      {data === undefined ? <p className="p-6 text-[13px] text-[#8B93A1]">Loading…</p> : (
        <main className="space-y-4 p-4">
          <section className="grid grid-cols-2 border border-[#1F242C] bg-[#0E1115] md:grid-cols-4 xl:grid-cols-9">
            <Stat label="Users" value={data.totals.users} sub={`${data.totals.verifiedUsers} verified`} />
            <Stat label="Signups 7d" value={data.totals.signups7d} />
            <Stat label="Projects" value={data.totals.projects} sub={`${data.totals.projectsWithKey} with API key`} />
            <Stat label="Paid" value={data.totals.paidProjects} sub="projects on a plan" />
            <Stat label="Runs 24h" value={compactNumber(data.totals.runs24h)} sub={`${compactNumber(data.totals.runs7d)} in 7d`} />
            <Stat label="Steps 7d" value={compactNumber(data.totals.spans7d)} />
            <Stat label="Cost 24h" value={formatCost(data.totals.cost24hUsd)} sub={`${formatCost(data.totals.cost7dUsd)} in 7d`} />
            <Stat label="New leads" value={data.newLeads} />
            <Stat label="Open alerts" value={data.totals.activeAlerts} sub={`${data.totals.alertRules} rules · ${data.totals.failed7d} failed runs 7d`} />
          </section>
          {data.capped.users || data.capped.projects || data.capped.runs ? (
            <p className="font-mono text-[11px] text-[#F4D44D]">Some totals are capped at 500 rows and may be higher.</p>
          ) : null}

          {tab === "Overview" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <h2 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[#8B93A1]">Newest signups</h2>
                <Table head={["Email", "Verified", "Joined"]} empty="No users yet."
                  rows={data.users.slice(0, 8).map((u) => [u.email, u.verified ? pill("yes", "ok") : pill("no", "warn"), <span key="t" title={abs(u.signedUpAt)}>{dim(ago(u.signedUpAt))}</span>])} />
              </div>
              <div>
                <h2 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[#8B93A1]">Plans</h2>
                <Table head={["Plan", "Projects"]} empty="No projects."
                  rows={Object.entries(data.planCounts).map(([plan, n]) => [plan, mono(n)])} />
              </div>
              <div className="lg:col-span-2">
                <h2 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[#8B93A1]">Latest runs</h2>
                <Table head={["Run", "Project", "Status", "Steps", "Cost", "Started"]} empty="No runs yet."
                  rows={data.recentRuns.slice(0, 10).map((r) => [mono(r.runId.slice(0, 14)), r.project, pill(r.status, r.status === "failed" ? "bad" : r.status === "completed" ? "ok" : "mute"), mono(r.spans), mono(formatCost(r.costUsd)), dim(ago(r.startedAt))])} />
              </div>
            </div>
          )}

          {tab === "Users" && (
            <Table head={["Name", "Email", "Verified", "Projects", "Signed up"]} empty="No matching users."
              rows={data.users.filter((u) => !q || `${u.name} ${u.email}`.toLowerCase().includes(q)).map((u) => [u.name || "—", u.email, u.verified ? pill("verified", "ok") : pill("not verified", "warn"), mono(u.projectCount), <span key="t" title={abs(u.signedUpAt)}>{dim(ago(u.signedUpAt))}</span>])} />
          )}

          {tab === "Projects" && (
            <Table head={["Project", "Owner", "Plan", "Subscription", "API key", "Last key use", "Created"]} empty="No matching projects."
              rows={data.projects.filter((p) => !q || `${p.name} ${p.ownerEmail ?? ""} ${p.ownerName ?? ""}`.toLowerCase().includes(q)).map((p) => [p.name, ownerCell(p, openUser), p.plan, dim(p.subscription ?? "—"), p.hasApiKey ? pill("active", "ok") : pill("none", "mute"), dim(p.lastKeyUseAt ? ago(p.lastKeyUseAt) : "never"), dim(ago(p.createdAt))])} />
          )}

          {tab === "Billing" && (
            <Table head={["Project", "Owner", "Plan", "Subscription", "Renews", "Cancelling"]} empty="No matching projects."
              rows={data.projects.filter((p) => p.plan !== "free" || p.subscription).filter((p) => !q || `${p.name} ${p.ownerEmail ?? ""}`.toLowerCase().includes(q)).map((p) => [p.name, ownerCell(p, openUser), p.plan, dim(p.subscription ?? "—"), dim(p.periodEnd ? abs(p.periodEnd) : "—"), p.cancelling ? pill("yes", "warn") : dim("no")])} />
          )}

          {tab === "Leads" && (
            <Table head={["Name", "Email", "Company", "Intent", "Status", "Source", "Received"]} empty="No matching leads."
              rows={data.leads.filter((l) => !q || `${l.name} ${l.email} ${l.company ?? ""} ${l.intent}`.toLowerCase().includes(q)).map((l) => [l.name, l.email, l.company ?? "—", dim(l.intent), pill(l.status, l.status === "new" ? "warn" : "mute"), dim(l.source), dim(ago(l.createdAt))])} />
          )}

          {tab === "Audit" && (
            <Table head={["Who", "Action", "What", "Project", "When"]} empty="No audit entries."
              rows={data.audit.filter((a) => !q || `${a.actor} ${a.action} ${a.summary} ${a.project}`.toLowerCase().includes(q)).map((a) => [a.actor, mono(a.action), <span key="s" className="line-clamp-1 max-w-md">{a.summary}</span>, a.project, dim(ago(a.createdAt))])} />
          )}

          {tab === "Usage" && (
            <Table head={["Project", "Runs 7d", "Steps", "Failed", "Cost"]} empty="No usage in the last 7 days."
              rows={data.usage.filter((u) => !q || u.project.toLowerCase().includes(q)).map((u) => [u.project, mono(u.runs), mono(compactNumber(u.spans)), u.failed ? pill(String(u.failed), "bad") : dim("0"), mono(formatCost(u.costUsd))])} />
          )}

          {tab === "Alerts" && (
            <Table head={["Project", "Type", "Message", "State", "Triggered"]} empty="No alerts."
              rows={data.alerts.filter((a) => !q || `${a.project} ${a.type} ${a.message}`.toLowerCase().includes(q)).map((a) => [a.project, mono(a.type), <span key="m" className="line-clamp-1 max-w-md">{a.message}</span>, pill(a.state, a.state === "active" ? "bad" : "mute"), dim(ago(a.triggeredAt))])} />
          )}

          {tab === "Activity" && (
            <Table head={["Run", "Project", "Model", "Status", "Steps", "Cost", "Started"]} empty="No activity."
              rows={data.recentRuns.filter((r) => !q || `${r.project} ${r.model ?? ""} ${r.runId}`.toLowerCase().includes(q)).map((r) => [mono(r.runId.slice(0, 14)), r.project, dim(r.model ?? "—"), pill(r.status, r.status === "failed" ? "bad" : r.status === "completed" ? "ok" : "mute"), mono(r.spans), mono(formatCost(r.costUsd)), dim(ago(r.startedAt))])} />
          )}
        </main>
      )}
    </div>
  );
}
