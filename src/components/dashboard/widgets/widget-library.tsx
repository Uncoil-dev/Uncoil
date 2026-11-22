"use client";

import { PageTitle } from "@/components/dashboard/page-title";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { WIDGETS } from "@/lib/widget-utils";

const SOURCE_TEXT = { traces: "From your traces", stats: "From your costs", scores: "From your scores" } as const;
const button = "h-7 rounded border border-[#262C35] bg-[#0E1115] px-2.5 text-xs text-[#C9CED6] hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#F4D44D] disabled:opacity-40";
const friendly = (reason: unknown, fallback: string) => ((reason instanceof Error ? reason.message : "").match(/Uncaught Error: ([^\n]+)/)?.[1] ?? fallback);

export function WidgetLibrary({ projectId }: { projectId: string }) {
  const typedProjectId = projectId as Id<"projects">;
  const dashboards = useQuery(api.dashboards.list, { projectId: typedProjectId });
  const addWidget = useMutation(api.dashboards.addWidget);
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const chosen = dashboards?.find((dashboard) => dashboard._id === target) ?? dashboards?.[0] ?? null;

  async function add(type: string, title: string) {
    if (!chosen) return;
    setBusy(type); setNotice(null);
    try { await addWidget({ projectId: typedProjectId, dashboardId: chosen._id, widgetType: type }); setNotice({ tone: "ok", text: `${title} added to ${chosen.name}.` }); }
    catch (reason) { setNotice({ tone: "error", text: friendly(reason, "Could not add that widget.") }); } finally { setBusy(null); }
  }

  return (
    <div className="flex min-h-svh min-w-0 flex-col bg-[#0B0D10] font-[family-name:var(--font-geist-sans)] text-[13px] text-[#E6E9EE]">
      <header className="flex flex-wrap items-center gap-2 border-b border-[#1F242C] px-4 py-2">
        <PageTitle>Widget library</PageTitle>
        <span className="text-xs text-[#8B93A1]">Every chart you can put on a dashboard.</span>
        <label className="ml-auto flex items-center gap-2 text-xs text-[#8B93A1]">Add to<select value={chosen?._id ?? ""} onChange={(e) => setTarget(e.target.value)} disabled={!dashboards?.length} className="h-7 rounded border border-[#262C35] bg-[#0E1115] px-2 text-xs text-[#E6E9EE]">{dashboards?.length ? dashboards.map((dashboard) => <option key={dashboard._id} value={dashboard._id}>{dashboard.name}</option>) : <option value="">No dashboards yet</option>}</select></label>
        <Link href={`/dashboard/${projectId}/dashboards`} className={`${button} inline-flex items-center`}>Dashboards</Link>
      </header>
      {notice ? <p role={notice.tone === "error" ? "alert" : "status"} className={`mx-4 mt-3 rounded border px-3 py-2 text-xs ${notice.tone === "error" ? "border-[#5B2B2B] bg-[#1A1010] text-[#FF8A8A]" : "border-[#1F4D38] bg-[#0E1A14] text-[#5BE3A0]"}`}>{notice.text}</p> : null}
      {dashboards && !dashboards.length ? <p className="mx-4 mt-3 rounded border border-[#3A3420] bg-[#1A170C] px-3 py-2 text-xs text-[#F4D44D]">You have no dashboard yet. <Link href={`/dashboard/${projectId}/dashboards`} className="underline">Create one</Link> and come back to add widgets.</p> : null}
      <ul className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {WIDGETS.map((widget) => {
          const on = dashboards?.filter((dashboard) => dashboard.widgets.some((w) => w.widgetType === widget.id)) ?? [];
          const here = chosen ? on.some((dashboard) => dashboard._id === chosen._id) : false;
          return (
            <li key={widget.id} className="flex flex-col border border-[#1F242C] bg-[#0E1115] p-4">
              <div className="flex items-start gap-2"><h2 className="flex-1 text-sm font-semibold">{widget.title}</h2><span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-[#6B7380]">{widget.wide ? "Wide" : "Half"}</span></div>
              <p className="mt-1.5 flex-1 text-xs leading-5 text-[#8B93A1]">{widget.description}</p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-[#6B7380]">{SOURCE_TEXT[widget.source]}</p>
              <p className="mt-1 text-[11px] text-[#8B93A1]">{on.length ? `On ${on.map((dashboard) => dashboard.name).join(", ")}` : "Not used yet"}</p>
              <button type="button" disabled={!chosen || here || busy === widget.id} onClick={() => void add(widget.id, widget.title)} className={`${button} mt-3 self-start`}>{here ? `Already on ${chosen?.name}` : busy === widget.id ? "Adding…" : chosen ? `Add to ${chosen.name}` : "Add"}</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
