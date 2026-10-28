"use client";

import { useEffect, useState } from "react";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";

export function CapturedSurface({ title, description, projectId }: { title: string; description: string; projectId: string }) {
  const [view, setView] = useState("Overview");
  const [query, setQuery] = useState("");
  const [range, setRange] = useState("Last 7 days");
  const [filter, setFilter] = useState("All environments");
  const [created, setCreated] = useState(false);
  const isCreateSurface = /^(Create|Configure)/.test(title);
  const draftKey = `uncoil.surface-draft.${projectId}.${title.toLowerCase().replace(/\s+/g, "-")}`;
  // Restore the lightweight project-scoped draft marker after a reload.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (isCreateSurface && window.localStorage.getItem(draftKey)) setCreated(true); }, [draftKey, isCreateSurface]);
  return (
    <div className="flex flex-col gap-6">
      <DashboardTopbar title={title} description={description} />
      <div className="px-6 pb-10">
        <div className="flex flex-wrap items-center gap-2 border-b border-black/10 pb-4">
          {['Overview', 'Activity', 'Configuration'].map((item) => (
            <button key={item} type="button" onClick={() => setView(item)} className={`border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] ${view === item ? 'border-black bg-black text-white' : 'border-black/15 bg-white text-black/60 hover:border-black'}`}>{item}</button>
          ))}
          <div className="ml-auto flex flex-wrap gap-2">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" aria-label="Search" className="h-9 w-40 border border-black/15 bg-white px-3 font-mono text-xs outline-none focus:border-black" />
            <select value={range} onChange={(event) => setRange(event.target.value)} aria-label="Time range" className="h-9 border border-black/15 bg-white px-3 font-mono text-xs outline-none focus:border-black"><option>Last 24 hours</option><option>Last 7 days</option><option>Last 30 days</option></select>
            <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Environment" className="h-9 border border-black/15 bg-white px-3 font-mono text-xs outline-none focus:border-black"><option>All environments</option><option>default</option><option>production</option></select>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border border-black/10 bg-white px-4 py-3 text-xs text-black/55">
          <span>{view} · {range} · {filter}{query ? ` · “${query}”` : ""}</span>
          <button type="button" onClick={() => setCreated(true)} className="border border-black bg-black px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white hover:bg-black/80">Create new</button>
        </div>
        {created ? <div role="status" className="mt-3 flex items-center justify-between border border-black/15 bg-black px-4 py-3 text-xs text-white"><span>New {title.toLowerCase().replace(/s$/, "")} draft created.</span><button type="button" onClick={() => setCreated(false)} className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/70 hover:text-white">Dismiss</button></div> : null}
        <section className="mt-4 overflow-hidden border border-black/10 bg-white">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_auto] gap-4 border-b border-black/10 bg-black/[0.02] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-black/45"><span>Name</span><span>Status</span><span>Updated</span><span /></div>
          <div className="flex min-h-28 flex-col items-center justify-center gap-2 px-4 py-6 text-center"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/45">No {title.toLowerCase()} yet</p><p className="text-xs text-black/50">Create your first item to see it appear in this project view.</p></div>
        </section>
        {isCreateSurface ? <form onSubmit={(event) => { event.preventDefault(); window.localStorage.setItem(draftKey, "saved"); setCreated(true); }} className="mt-4 grid gap-4 border border-black/10 bg-white p-5 md:grid-cols-2">
          <label className="grid gap-2 text-xs text-black/65">Name<input required placeholder={`${title.replace(/^Create |^Configure /, "")} name`} className="h-10 border border-black/15 px-3 font-mono text-xs outline-none focus:border-black" /></label>
          <label className="grid gap-2 text-xs text-black/65">Environment<select className="h-10 border border-black/15 bg-white px-3 font-mono text-xs outline-none focus:border-black"><option>default</option><option>production</option></select></label>
          <label className="grid gap-2 text-xs text-black/65 md:col-span-2">Description<textarea rows={3} placeholder="Describe the purpose of this configuration" className="border border-black/15 px-3 py-2 text-xs outline-none focus:border-black" /></label>
          <button type="submit" className="w-fit border border-black bg-black px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white hover:bg-black/80">Save {title.replace(/^Create |^Configure /, "")}</button>
        </form> : null}
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          ["Ready to configure", "Connect this Uncoil surface to your project data and workflows."],
          ["Project scope", projectId],
          ["Activity", "No recent activity in this preview project."],
        ].map(([label, value]) => (
          <section key={label} className="border border-black/10 bg-white p-5 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/45">{label}</p>
            <p className="mt-3 text-sm text-black/70">{value}</p>
          </section>
        ))}
        </div>
      </div>
    </div>
  );
}
