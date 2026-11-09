"use client";

import { useEffect, useState } from "react";
import type { SearchReport } from "@/lib/search-integrations";
import { compactNumber } from "@/components/dashboard/tracing/format";
import { Panel, PixelBars, Table, Tile, mono, pill } from "./admin-ui";

export type SearchReports = { google: SearchReport; bing: SearchReport };

export function useSearchReports(active: boolean, preset?: SearchReports) {
  const [reports, setReports] = useState<SearchReports | null>(preset ?? null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!active || reports) return;
    let live = true;
    fetch("/api/admin/search", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => { if (live) setReports(j); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [active, reports]);
  return { reports, failed };
}

const SETUP = {
  Google: [
    "Open Google Cloud, turn on “Search Console API”.",
    "Create a service account named uncoil-admin and make a JSON key.",
    "In Search Console, Settings, Users and permissions, add the service account email as Restricted.",
    "In Coolify, add UNCOIL_GSC_SERVICE_ACCOUNT_JSON (the whole file) and UNCOIL_GSC_SITE.",
  ],
  Bing: [
    "Open Bing Webmaster, Settings, API access, press Generate.",
    "In Coolify, add UNCOIL_BING_API_KEY and UNCOIL_BING_SITE (https://www.uncoil.dev/).",
  ],
} as const;

function Source({ name, report }: { name: "Google" | "Bing"; report: SearchReport }) {
  if (report.status === "not_configured") {
    return (
      <Panel title={`${name} · not connected`} hint="Add the keys once and the numbers appear here." dark={false}>
        <ol className="list-decimal space-y-1.5 pl-5 text-[13px]">{SETUP[name].map((s) => <li key={s}>{s}</li>)}</ol>
        <p className="mt-3 font-mono text-[11px] text-[#090909]/55">Missing: {report.missing.join(", ")}</p>
      </Panel>
    );
  }
  if (report.status === "error") {
    return <Panel title={`${name} · problem`} dark={false}><p className="text-[13px]">{report.message}</p></Panel>;
  }
  const { totals, days } = report;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label={`${name} clicks · 30d`} value={compactNumber(totals.clicks)} />
        <Tile label="Impressions" value={compactNumber(totals.impressions)} sub="times shown in results" delay={60} />
        <Tile label="Click rate" value={`${(totals.ctr * 100).toFixed(1)}%`} delay={120} />
        <Tile label="Avg position" value={totals.position ? totals.position.toFixed(1) : "—"} sub="1 is the top" delay={180} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Panel title={`${name} · clicks per day`} hint={days.length ? undefined : "No data for this range yet."}>
          {days.length ? <PixelBars values={days.map((d) => d.clicks)} labels={days.map((d) => d.day.slice(5))} /> : null}
        </Panel>
        <Panel title="Indexing and crawl health" dark={false}>
          <ul className="space-y-2">
            {report.health.length === 0 ? <li className="text-[13px] text-[#090909]/55">Nothing reported.</li> : null}
            {report.health.map((h) => (
              <li key={h.label} className="flex items-center justify-between gap-3 text-[13px]">
                <span>{h.label}</span>{pill(String(h.value), h.tone === "ok" ? "ok" : h.tone)}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#090909]/60">Top searches</h3>
          <Table head={["Search", "Clicks", "Shown", "Pos."]} empty="No searches yet."
            rows={report.queries.map((r) => [r.key, mono(r.clicks), mono(compactNumber(r.impressions)), mono(r.position?.toFixed(1) ?? "—")])} />
        </div>
        <div>
          <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#090909]/60">Top pages</h3>
          <Table head={["Page", "Clicks", "Shown", "Pos."]} empty="No pages yet."
            rows={report.pages.map((r) => [<span key="p" className="line-clamp-1 max-w-[260px]">{r.key.replace(/^https?:\/\/[^/]+/, "") || "/"}</span>, mono(r.clicks), mono(compactNumber(r.impressions)), mono(r.position?.toFixed(1) ?? "—")])} />
        </div>
      </div>
    </div>
  );
}

export function SearchTab({ reports, failed }: { reports: SearchReports | null; failed: boolean }) {
  if (failed) return <p className="text-[13px]">Could not load search numbers. Reload the page to try again.</p>;
  if (!reports) return <p className="text-[13px] opacity-60">Loading search numbers…</p>;
  return (
    <div className="space-y-10">
      <div><h2 className="mb-3 font-pixel text-3xl">Google</h2><Source name="Google" report={reports.google} /></div>
      <div><h2 className="mb-3 font-pixel text-3xl">Bing</h2><Source name="Bing" report={reports.bing} /></div>
    </div>
  );
}
