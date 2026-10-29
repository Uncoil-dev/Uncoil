"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { DashboardEmptyState } from "./dashboard-primitives";

type Result = { runId: string; sessionId: string; endUserId: string; environment: string; release: string; traceName: string; startedAt: string; lastSeenAt: string; spanCount: number; totalCostUsd: number; maxLatencyMs: number; ttftMs: number; retryCount: number; errorCount: number };
type SavedSearch = { id: string; name: string; q: string; environment: string; release: string; status: string; days: string };

export function TraceSearch({ projectId }: { projectId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [environment, setEnvironment] = useState(() => searchParams.get("environment") ?? "");
  const [release, setRelease] = useState(() => searchParams.get("release") ?? "");
  const [status, setStatus] = useState(() => searchParams.get("status") ?? "all");
  const [days, setDays] = useState(() => searchParams.get("days") ?? "30");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`uncoil.saved-searches.${projectId}`);
      if (stored) setSavedSearches(JSON.parse(stored) as SavedSearch[]);
    } catch {
      setSavedSearches([]);
    }
  }, [projectId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function persistSavedSearches(next: SavedSearch[]) {
    setSavedSearches(next);
    window.localStorage.setItem(`uncoil.saved-searches.${projectId}`, JSON.stringify(next));
  }

  async function performSearch(values: { q: string; environment: string; release: string; status: string; days: string }) {
    setLoading(true);
    setHasSearched(true);
    setUnavailable(false);
    const params = new URLSearchParams({ q: values.q, status: values.status, days: values.days });
    if (values.environment.trim()) params.set("environment", values.environment.trim());
    if (values.release.trim()) params.set("release", values.release.trim());
    router.replace(`/dashboard/${projectId}/search?${params.toString()}`, { scroll: false });
    try {
      const response = await fetch(`/api/projects/${projectId}/search?${params}`);
      const body = await response.json();
      setResults(body.results ?? []);
      setUnavailable(Boolean(body.unavailable));
    } catch {
      setResults([]);
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }

  async function runSearch(event: React.FormEvent, overrides?: { status?: string; days?: string }) {
    event.preventDefault();
    const nextStatus = overrides?.status ?? status;
    const nextDays = overrides?.days ?? days;
    setStatus(nextStatus);
    setDays(nextDays);
    await performSearch({ q: query, environment, release, status: nextStatus, days: nextDays });
  }

  function applyPreset(nextStatus: string, nextDays: string) {
    setStatus(nextStatus);
    setDays(nextDays);
    const params = new URLSearchParams({ q: query, status: nextStatus, days: nextDays });
    router.replace(`/dashboard/${projectId}/search?${params.toString()}`, { scroll: false });
    void runSearch({ preventDefault() {} } as React.FormEvent, { status: nextStatus, days: nextDays });
  }

  function saveCurrentSearch() {
    const name = window.prompt("Name this search");
    if (!name?.trim()) return;
    const next: SavedSearch = { id: crypto.randomUUID(), name: name.trim(), q: query, environment, release, status, days };
    persistSavedSearches([next, ...savedSearches].slice(0, 12));
  }

  function restoreSearch(saved: SavedSearch) {
    setQuery(saved.q); setEnvironment(saved.environment); setRelease(saved.release); setStatus(saved.status); setDays(saved.days);
    void performSearch(saved);
  }

  function clearSearchField(field: "q" | "environment" | "release" | "status") {
    const values = { q: field === "q" ? "" : query, environment: field === "environment" ? "" : environment, release: field === "release" ? "" : release, status: field === "status" ? "all" : status, days };
    setQuery(values.q); setEnvironment(values.environment); setRelease(values.release); setStatus(values.status);
    void performSearch(values);
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-widest text-black/55">Presets</span>
      <button type="button" onClick={saveCurrentSearch} className="border border-black/30 px-3 py-2 font-mono text-[10px] uppercase text-black transition-colors hover:bg-black hover:text-white">Save current</button>
      <button type="button" onClick={() => applyPreset("error", "1")} className="border border-black/15 px-3 py-2 font-mono text-[10px] uppercase text-black/60 transition-colors hover:border-black hover:text-black">Failures · 24h</button>
      <button type="button" onClick={() => applyPreset("all", "7")} className="border border-black/15 px-3 py-2 font-mono text-[10px] uppercase text-black/60 transition-colors hover:border-black hover:text-black">All traces · 7d</button>
      <button type="button" onClick={() => applyPreset("healthy", "30")} className="border border-black/15 px-3 py-2 font-mono text-[10px] uppercase text-black/60 transition-colors hover:border-black hover:text-black">Healthy · 30d</button>
    </div>
    {savedSearches.length > 0 && <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] uppercase tracking-widest text-black/55">Saved</span>{savedSearches.map((saved) => <span key={saved.id} className="flex items-center border border-black/15"><button type="button" onClick={() => restoreSearch(saved)} className="px-3 py-2 font-mono text-[10px] text-black/70 hover:text-black">{saved.name}</button><button type="button" onClick={() => persistSavedSearches(savedSearches.filter((item) => item.id !== saved.id))} aria-label={`Delete saved search ${saved.name}`} className="border-l border-black/15 px-2 py-2 font-mono text-[10px] text-black/55 hover:text-black">×</button></span>)}</div>}
    <form onSubmit={runSearch} className="flex flex-col gap-3 border border-border bg-muted/10 p-4">
      <div className="flex flex-col gap-3 lg:flex-row">
      <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-black/55" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Run ID, trace name, session…" className="h-10 rounded-none border-black/15 bg-white pl-10 font-mono text-xs" /></div>
      <Input value={environment} onChange={(event) => setEnvironment(event.target.value)} placeholder="Environment…" aria-label="Filter by environment" className="h-10 rounded-none border-black/15 bg-white font-mono text-xs lg:w-40" />
      <Input value={release} onChange={(event) => setRelease(event.target.value)} placeholder="Release…" aria-label="Filter by release" className="h-10 rounded-none border-black/15 bg-white font-mono text-xs lg:w-40" />
      <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 border border-black/15 bg-white px-3 font-mono text-xs text-black/70"><option value="all">All statuses</option><option value="error">Has errors</option><option value="healthy">No errors</option></select>
      <select value={days} onChange={(event) => setDays(event.target.value)} className="h-10 border border-black/15 bg-white px-3 font-mono text-xs text-black/70"><option value="1">1 day</option><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option></select>
      <button type="submit" disabled={loading} className="h-10 bg-black px-5 font-mono text-xs uppercase tracking-widest text-white disabled:opacity-50">{loading ? "Searching…" : "Search"}</button>
      </div>
    </form>
    <div className="flex flex-wrap items-center gap-2" aria-label="Active search filters"><span className="font-mono text-[10px] uppercase tracking-widest text-black/55">Active</span>{query && <button type="button" onClick={() => clearSearchField("q")} className="border border-black/25 px-2 py-1 font-mono text-[10px] text-black/70">query:{query} ×</button>}{environment && <button type="button" onClick={() => clearSearchField("environment")} className="border border-black/25 px-2 py-1 font-mono text-[10px] text-black/70">env:{environment} ×</button>}{release && <button type="button" onClick={() => clearSearchField("release")} className="border border-black/25 px-2 py-1 font-mono text-[10px] text-black/70">release:{release} ×</button>}{status !== "all" && <button type="button" onClick={() => clearSearchField("status")} className="border border-black/25 px-2 py-1 font-mono text-[10px] text-black/70">status:{status} ×</button>}<span className="font-mono text-[10px] text-black/55">window:{days}d</span></div>
    {unavailable && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border border-amber-400/30 bg-amber-400/5 p-4 font-mono text-xs text-amber-200"><span>Analytics is temporarily unavailable. Try again shortly.</span><button type="button" onClick={() => void performSearch({ q: query, environment, release, status, days })} className="border border-amber-300/40 px-3 py-2 text-[10px] uppercase tracking-widest text-amber-100 transition-colors hover:border-black hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black">Retry</button></div>}
    <div className="border border-border">
      {results.length === 0 ? <DashboardEmptyState title={hasSearched ? "No traces match" : "Search your traces"} description={hasSearched ? "Broaden the query, clear a filter, or try a longer time window." : "Search by run ID, trace name, session, environment, or release to find evidence quickly."} /> : results.map((result) => <Link key={result.runId} href={`/dashboard/${projectId}/runs/${result.runId}`} className="flex flex-col gap-3 border-b border-border p-4 last:border-0 transition-colors hover:bg-muted/20 focus-visible:outline focus-visible:outline-1 focus-visible:outline-white md:flex-row md:items-center md:justify-between"><div><div className="font-mono text-sm text-black">{result.traceName || result.runId}</div><div className="mt-1 font-mono text-[10px] text-black/55">{result.sessionId && `session:${result.sessionId} · `}{result.environment || "unknown env"} · {result.spanCount} spans</div></div><div className="flex gap-4 font-mono text-xs text-black/55"><span>{formatCurrency(result.totalCostUsd)}</span><span>{result.errorCount ? `${result.errorCount} errors` : "healthy"}</span><span>{formatRelativeTime(result.lastSeenAt)}</span></div></Link>)}
    </div>
  </div>;
}
