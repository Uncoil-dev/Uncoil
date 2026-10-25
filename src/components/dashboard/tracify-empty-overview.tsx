"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useProjectStats } from "@/hooks/use-project-stats";
import { ChevronDown, ExternalLink, Info, PanelLeft, Pencil, Search, SlidersHorizontal } from "lucide-react";

type ChartPanelProps = {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
};

const WIDGET_OPTIONS = ["Trace volume", "Cost by model", "Latency percentiles", "Score analytics"];

function ChartPanel({ title, subtitle, children, className = "" }: ChartPanelProps) {
  return (
    <section className={`tracify-panel ${className}`}>
      <div className="tracify-panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {children ?? <div className="tracify-empty-chart"><span>No data</span><Info aria-hidden="true" /></div>}
    </section>
  );
}

function MetricCard({ title, value, label }: { title: string; value: string; label: string }) {
  return (
    <ChartPanel title={title} className="tracify-metric-card">
      <div className="tracify-metric-value">{value}</div>
      <div className="tracify-metric-label">{label}</div>
      <div className="tracify-empty-chart"><span>No data</span><Info aria-hidden="true" /></div>
    </ChartPanel>
  );
}

function TabStrip({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (tab: string) => void }) {
  return (
    <div className="tracify-tabs" role="tablist">
      {tabs.length === 1 ? <span role="tab" aria-selected="true" className="is-active">{tabs[0]}</span> : tabs.map((tab) => (
        <button key={tab} type="button" role="tab" aria-selected={active === tab} className={active === tab ? "is-active" : ""} onClick={() => onChange(tab)}>
          {tab}
        </button>
      ))}
    </div>
  );
}

export function TracifyEmptyOverview({ projectId, dashboardId, dashboardMode = false, liveData = false }: { projectId: string; dashboardId?: string; dashboardMode?: boolean; liveData?: boolean }) {
  const [range, setRange] = useState("1d");
  const [environment, setEnvironment] = useState("default");
  const [model, setModel] = useState("All models");
  const [usageTab, setUsageTab] = useState("Cost by model");
  const [consumptionTab, setConsumptionTab] = useState("Token cost");
  const [latencyTab, setLatencyTab] = useState("50th Percentile");
  const [widgetNotice, setWidgetNotice] = useState("");
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [traceFilter, setTraceFilter] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [releaseFilter, setReleaseFilter] = useState("");
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>([]);
  const [dashboards, setDashboards] = useState(["Tracify Home"]);
  const [activeDashboard, setActiveDashboard] = useState("Tracify Home");
  const summary = useQuery(api.projects.getProjectManagementSummary, liveData && projectId ? { projectId: projectId as Id<"projects">, environment, days: range === "1d" ? 1 : range === "7d" ? 7 : 30, traceName: traceFilter || undefined, sessionId: sessionFilter || undefined, endUserId: userFilter || undefined, release: releaseFilter || undefined, model: model === "All models" ? undefined : model } : "skip");
  const evaluation = useQuery(api.evaluationEngine.overview, liveData && projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  const persistedDashboards = useQuery(api.dashboards.list, liveData && projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  const createDashboard = useMutation(api.dashboards.create);
  const addPersistedWidget = useMutation(api.dashboards.addWidget);
  const removePersistedWidget = useMutation(api.dashboards.removeWidget);
  const renamePersistedDashboard = useMutation(api.dashboards.rename);
  const removePersistedDashboard = useMutation(api.dashboards.remove);
  const resetPersistedDashboard = useMutation(api.dashboards.reset);
  const reorderPersistedWidgets = useMutation(api.dashboards.reorderWidgets);
  const { stats } = useProjectStats({ projectId: liveData ? projectId : "", range: range === "1d" ? 1 : range === "7d" ? 7 : 30, liveRefreshKey: summary?.latestActivityAt });
  const liveModelCost = stats?.modelCosts.reduce((total, item) => total + item.totalCostUsd, 0) ?? null;
  const liveTokenCost = stats?.userCosts?.reduce((total, item) => total + item.totalCostUsd, 0) ?? null;
  const selectedModelCosts = stats?.modelCosts.filter((item) => model === "All models" || item.modelId === model) ?? [];
  const selectedModelCost = selectedModelCosts.reduce((total, item) => total + item.totalCostUsd, 0);
  const selectedModelSpans = selectedModelCosts.reduce((total, item) => total + item.spanCount, 0);
  const selectedToolCost = stats?.toolCosts?.reduce((total, item) => total + item.totalCostUsd, 0) ?? 0;
  const selectedToolSpans = stats?.toolCosts?.reduce((total, item) => total + item.spanCount, 0) ?? 0;
  const modelUsageValue = usageTab === "Cost by model" ? selectedModelCost : usageTab === "Cost by type" ? selectedModelCost + selectedToolCost : usageTab === "Usage by type" ? selectedModelSpans + selectedToolSpans : selectedModelSpans;
  const modelUsageLabel = usageTab.startsWith("Cost") ? "Cost" : "Spans";
  const userConsumptionValue = stats?.userCosts?.reduce((total, item) => total + (consumptionTab === "Token cost" ? item.totalCostUsd : item.spanCount), 0) ?? null;
  const userConsumptionLabel = consumptionTab === "Token cost" ? "Token cost" : "Count of traces";
  const latencyField = latencyTab === "50th Percentile" ? "p50LatencyMs" : latencyTab === "75th Percentile" ? "p75LatencyMs" : latencyTab === "90th Percentile" ? "p90LatencyMs" : latencyTab === "95th Percentile" ? "p95LatencyMs" : "p99LatencyMs";
  const selectedLatencyValues = selectedModelCosts.map((item) => item[latencyField]).filter((value): value is number => typeof value === "number");
  const liveModelLatency = stats?.modelCosts.filter((item) => item.avgLatencyMs !== undefined).reduce((total, item, _, all) => total + (item.avgLatencyMs ?? 0) / all.length, 0) ?? null;
  const widgetOptions = WIDGET_OPTIONS;

  useEffect(() => {
    if (!dashboardMode || liveData) return;
    const stored = window.localStorage.getItem(`tracify.dashboard.widgets.${projectId}.${activeDashboard}`);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as unknown;
      if (Array.isArray(parsed)) {
        // The browser-only storage read hydrates the editor after the server render.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedWidgets(parsed.filter((item): item is string => typeof item === "string" && WIDGET_OPTIONS.includes(item)));
      }
    } catch {
      window.localStorage.removeItem(`tracify.dashboard.widgets.${projectId}`);
    }
  }, [activeDashboard, dashboardMode, liveData, projectId]);

  useEffect(() => {
    function onFilterToggle() { setFiltersOpen((current) => !current); }
    window.addEventListener("tracify:toggle-dashboard-filters", onFilterToggle);
    return () => window.removeEventListener("tracify:toggle-dashboard-filters", onFilterToggle);
  }, []);

  useEffect(() => {
    if (!dashboardMode) return;
    const stored = window.localStorage.getItem(`tracify.dashboard.list.${projectId}`);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as unknown;
      if (Array.isArray(parsed) && parsed.length) {
        const values = parsed.filter((item): item is string => typeof item === "string");
        if (values.length) {
          // The browser-only storage read hydrates the dashboard selector after the server render.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setDashboards(values);
          setActiveDashboard(values[0]);
        }
      }
    } catch {
      window.localStorage.removeItem(`tracify.dashboard.list.${projectId}`);
    }
  }, [dashboardMode, projectId]);

  useEffect(() => {
    if (!liveData || !persistedDashboards) return;
    const names = persistedDashboards.map((dashboard) => dashboard.name);
    if (!names.includes("Tracify Home")) names.unshift("Tracify Home");
    // Sync the authenticated editor with project-owned dashboard records.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDashboards(names);
    setActiveDashboard((current) => names.includes(current) ? current : names[0]);
  }, [liveData, persistedDashboards]);

  useEffect(() => {
    if (!liveData || !dashboardId || !persistedDashboards?.length) return;
    const selected = persistedDashboards.find((dashboard) => dashboard._id === dashboardId);
    // The route's dashboard record arrives asynchronously; hydrate the selected name once it is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (selected) setActiveDashboard(selected.name);
  }, [dashboardId, liveData, persistedDashboards]);

  useEffect(() => {
    if (!liveData || !persistedDashboards) return;
    const selected = persistedDashboards.find((dashboard) => dashboard.name === activeDashboard);
    // The Convex dashboard record is the source of truth for authenticated editors.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedWidgets(selected?.widgets.slice().sort((a, b) => a.position - b.position).map((widget) => widget.widgetType) ?? []);
  }, [activeDashboard, liveData, persistedDashboards]);

  useEffect(() => {
    if (dashboardMode && !liveData) window.localStorage.setItem(`tracify.dashboard.widgets.${projectId}.${activeDashboard}`, JSON.stringify(selectedWidgets));
  // The dashboard name is intentionally omitted: switching names first loads the new layout,
  // then this effect persists that layout when its widget state changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardMode, liveData, projectId, selectedWidgets]);

  async function addWidget(widget: string) {
    if (liveData) {
      try {
        let dashboard = persistedDashboards?.find((item) => item.name === activeDashboard);
        if (!dashboard) {
          const dashboardId = await createDashboard({ projectId: projectId as Id<"projects">, name: activeDashboard, isDefault: activeDashboard === "Tracify Home" });
          dashboard = { _id: dashboardId, name: activeDashboard } as NonNullable<typeof persistedDashboards>[number];
        }
        await addPersistedWidget({ projectId: projectId as Id<"projects">, dashboardId: dashboard._id, widgetType: widget });
      } catch (error) {
        setWidgetNotice(error instanceof Error ? error.message : "Could not persist widget");
        return;
      }
    }
    setSelectedWidgets((current) => current.includes(widget) ? current : [...current, widget]);
    setWidgetNotice(`${widget} added to this dashboard`);
    setWidgetOpen(false);
  }

  async function cloneDashboard() {
    const copyName = `${activeDashboard} copy ${dashboards.length}`;
    if (liveData) {
      try { await createDashboard({ projectId: projectId as Id<"projects">, name: copyName, isDefault: false }); } catch (error) { setWidgetNotice(error instanceof Error ? error.message : "Could not create dashboard"); return; }
    }
    const next = [...dashboards, copyName];
    setDashboards(next);
    setActiveDashboard(copyName);
    setSelectedWidgets([]);
    window.localStorage.setItem(`tracify.dashboard.list.${projectId}`, JSON.stringify(next));
    setWidgetNotice(`${copyName} created`);
  }

  async function renameDashboard() {
    if (activeDashboard === "Tracify Home") return;
    const nextName = window.prompt("Rename dashboard", activeDashboard)?.trim();
    if (!nextName || nextName === activeDashboard || dashboards.includes(nextName)) return;
    if (liveData) {
      const dashboard = persistedDashboards?.find((item) => item.name === activeDashboard);
      if (dashboard) { try { await renamePersistedDashboard({ projectId: projectId as Id<"projects">, dashboardId: dashboard._id, name: nextName }); } catch (error) { setWidgetNotice(error instanceof Error ? error.message : "Could not rename dashboard"); return; } }
    }
    const next = dashboards.map((dashboard) => dashboard === activeDashboard ? nextName : dashboard);
    window.localStorage.setItem(`tracify.dashboard.list.${projectId}`, JSON.stringify(next));
    setDashboards(next);
    setActiveDashboard(nextName);
    setWidgetNotice(`${nextName} renamed`);
  }

  async function deleteDashboard() {
    if (activeDashboard === "Tracify Home") return;
    if (liveData) {
      const dashboard = persistedDashboards?.find((item) => item.name === activeDashboard);
      if (dashboard) { try { await removePersistedDashboard({ projectId: projectId as Id<"projects">, dashboardId: dashboard._id }); } catch (error) { setWidgetNotice(error instanceof Error ? error.message : "Could not delete dashboard"); return; } }
    }
    const next = dashboards.filter((dashboard) => dashboard !== activeDashboard);
    window.localStorage.setItem(`tracify.dashboard.list.${projectId}`, JSON.stringify(next));
    window.localStorage.removeItem(`tracify.dashboard.widgets.${projectId}.${activeDashboard}`);
    setDashboards(next);
    setActiveDashboard("Tracify Home");
    setSelectedWidgets([]);
    setWidgetNotice(`${activeDashboard} deleted`);
  }

  async function resetDashboardLayout() {
    if (liveData) {
      const dashboard = persistedDashboards?.find((item) => item.name === activeDashboard);
      if (dashboard) { try { await resetPersistedDashboard({ projectId: projectId as Id<"projects">, dashboardId: dashboard._id }); } catch (error) { setWidgetNotice(error instanceof Error ? error.message : "Could not reset dashboard"); return; } }
    }
    setSelectedWidgets([]);
    window.localStorage.removeItem(`tracify.dashboard.widgets.${projectId}.${activeDashboard}`);
    setWidgetNotice(`${activeDashboard} layout reset`);
  }

  async function moveWidget(widget: string, direction: -1 | 1) {
    setSelectedWidgets((current) => {
      const index = current.indexOf(widget);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    if (liveData) {
      const dashboard = persistedDashboards?.find((item) => item.name === activeDashboard);
      const nextWidgets = dashboard?.widgets.slice().sort((a, b) => a.position - b.position) ?? [];
      const currentIndex = nextWidgets.findIndex((item) => item.widgetType === widget);
      const target = currentIndex + direction;
      if (dashboard && currentIndex >= 0 && target >= 0 && target < nextWidgets.length) { [nextWidgets[currentIndex], nextWidgets[target]] = [nextWidgets[target], nextWidgets[currentIndex]]; await reorderPersistedWidgets({ projectId: projectId as Id<"projects">, dashboardId: dashboard._id, widgetIds: nextWidgets.map((item) => item._id) }); }
    }
  }

  async function removeWidget(widget: string) {
    if (liveData) {
      const dashboard = persistedDashboards?.find((item) => item.name === activeDashboard);
      const persistedWidget = dashboard?.widgets.find((item) => item.widgetType === widget);
      if (dashboard && persistedWidget) {
        try {
          await removePersistedWidget({ projectId: projectId as Id<"projects">, dashboardId: dashboard._id, widgetId: persistedWidget._id });
        } catch (error) {
          setWidgetNotice(error instanceof Error ? error.message : "Could not remove widget");
          return;
        }
      }
    }
    setSelectedWidgets((current) => current.filter((item) => item !== widget));
    setWidgetNotice(`${widget} removed from this dashboard`);
  }

  if (liveData && dashboardId && persistedDashboards === undefined) {
    return <div className="tracify-overview p-6 font-mono text-sm text-black/55" role="status">Loading dashboard…</div>;
  }

  if (liveData && dashboardId && persistedDashboards && !persistedDashboards.some((dashboard) => dashboard._id === dashboardId)) {
    return <div className="tracify-overview m-6 border border-black bg-white p-6" role="alert"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/50">Dashboard unavailable</p><h1 className="mt-3 font-pixel text-3xl tracking-[-0.05em]">That saved view could not be found.</h1><p className="mt-3 text-sm leading-6 text-black/60">It may have been deleted, or it may belong to another project.</p><Link href={`/dashboard/${projectId}/dashboards`} className="mt-6 inline-flex border border-black bg-black px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white hover:bg-[#f4d44d] hover:text-black">Back to dashboards</Link></div>;
  }

  return (
    <div className="tracify-overview">
      <header className="tracify-page-header">
        <div className="tracify-breadcrumbs">
          <button type="button" className="tracify-icon-button" aria-label="Toggle sidebar" onClick={() => window.dispatchEvent(new Event("tracify:toggle-sidebar"))}><PanelLeft /></button>
          <Link href="/dashboard/organizations" className="tracify-crumb">Tracify workspace <ChevronDown /></Link>
          <span>/</span>
          <button type="button" className="tracify-crumb" onClick={() => window.dispatchEvent(new Event("tracify:open-project-switcher"))}>{projectId.slice(0, 8)} <ChevronDown /></button>
        </div>
        <div className="tracify-header-actions">
          <label className="tracify-select-wrap" aria-label="Time range">
            <select value={range} onChange={(event) => setRange(event.target.value)}>
              <option value="1d">1d</option><option value="7d">7d</option><option value="30d">30d</option>
            </select><span>{range === "1d" ? "Past 1 day" : `Past ${range.slice(0, -1)} days`}</span><ChevronDown />
          </label>
          <button type="button" className="tracify-assistant" onClick={() => window.dispatchEvent(new Event("tracify:open-command"))}><Search /> Assistant <kbd>Ctrl I</kbd></button>
        </div>
      </header>

      <div className="tracify-toolbar">
        <h1>Home</h1>
        <label className="tracify-control"><span>Env</span><select value={environment} onChange={(event) => setEnvironment(event.target.value)}><option value="default">default</option><option value="all environments">all environments</option>{summary?.environments.filter((value) => value !== "default" && value !== "all environments").map((value) => <option key={value} value={value}>{value}</option>)}</select><ChevronDown /></label>
        <button type="button" className="tracify-control" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((current) => !current)}><SlidersHorizontal /> Filters {traceFilter || sessionFilter || userFilter || releaseFilter ? <strong>active</strong> : null}<ChevronDown /></button>
        <div className="tracify-toolbar-spacer" />
        <label className="tracify-control"><span className="tracify-dot" /><select aria-label="Dashboard" value={activeDashboard} onChange={(event) => setActiveDashboard(event.target.value)}>{dashboards.map((dashboard) => <option key={dashboard}>{dashboard}</option>)}</select><strong>{activeDashboard === "Tracify Home" ? "Default" : "Custom"}</strong><ChevronDown /></label>
        {dashboardMode ? <><button type="button" className="tracify-control" aria-expanded={widgetOpen} onClick={() => setWidgetOpen((current) => !current)}>Add Widget</button><button type="button" className="tracify-control" onClick={cloneDashboard}>Clone</button><button type="button" className="tracify-control" onClick={renameDashboard} disabled={activeDashboard === "Tracify Home"}>Rename</button><button type="button" className="tracify-control" onClick={resetDashboardLayout}>Reset</button><button type="button" className="tracify-control" onClick={deleteDashboard} disabled={activeDashboard === "Tracify Home"}>Delete</button></> : <Link className="tracify-icon-button" href={`/dashboard/${projectId}/dashboards`} aria-label="Edit dashboard"><Pencil /></Link>}
        <Link className="tracify-configure" href={`/dashboard/${projectId}/quickstart`}>Configure Tracing <ExternalLink /></Link>
      </div>
      {widgetNotice ? <div className="tracify-dashboard-notice" role="status">{widgetNotice}</div> : null}
      {filtersOpen ? <div className="tracify-filter-popover" role="dialog" aria-label="Dashboard filters"><div className="tracify-filter-heading"><strong>Filters</strong><button type="button" onClick={() => { setTraceFilter(""); setSessionFilter(""); setUserFilter(""); setReleaseFilter(""); }}>Clear all</button></div><label>Trace name<input value={traceFilter} onChange={(event) => setTraceFilter(event.target.value)} placeholder="e.g. support-agent" /></label><label>Session ID<input value={sessionFilter} onChange={(event) => setSessionFilter(event.target.value)} placeholder="session_…" /></label><label>End user<input value={userFilter} onChange={(event) => setUserFilter(event.target.value)} placeholder="user_…" /></label><label>Release<input value={releaseFilter} onChange={(event) => setReleaseFilter(event.target.value)} placeholder="release name" /></label></div> : null}
      {widgetOpen ? <div className="tracify-widget-library" role="dialog" aria-label="Add dashboard widget"><div><strong>Widget library</strong><button type="button" onClick={() => setWidgetOpen(false)} aria-label="Close widget library">×</button></div>{widgetOptions.map((widget) => <button type="button" key={widget} onClick={() => addWidget(widget)} disabled={selectedWidgets.includes(widget)}>{widget}{selectedWidgets.includes(widget) ? " · added" : ""}</button>)}</div> : null}

      <main className="tracify-grid">
        <MetricCard title="Traces" value={summary ? String(summary.totals.totalRuns) : liveData ? "—" : "0"} label="Total traces tracked" />
        <MetricCard title="Model costs" value={summary ? `$${summary.totals.totalCostUsd.toFixed(2)}` : liveData ? "—" : "$0.00"} label="Total cost" />
        <MetricCard title="Scores" value={evaluation ? String(evaluation.resultCount) : liveData ? "—" : "0"} label="Total scores tracked" />

        <ChartPanel title="Observations by time" className="tracify-wide">
          <TabStrip tabs={["Observations by Level"]} active="Observations by Level" onChange={() => undefined} />
          <div className="tracify-stat">{summary ? summary.totals.totalSpans : liveData ? "—" : 0} <span>Observations tracked</span></div>
        </ChartPanel>
        <ChartPanel title="Model Usage" className="tracify-wide tracify-usage">
          <label className="tracify-model-select"><select value={model} onChange={(event) => setModel(event.target.value)}><option>All models</option>{summary?.models.map((value) => <option key={value}>{value}</option>)}</select><ChevronDown /></label>
          <TabStrip tabs={["Cost by model", "Cost by type", "Usage by model", "Usage by type"]} active={usageTab} onChange={setUsageTab} />
          <div className="tracify-stat">{stats ? (usageTab.startsWith("Cost") ? `$${modelUsageValue.toFixed(2)}` : modelUsageValue.toLocaleString()) : liveModelCost !== null ? `$${liveModelCost.toFixed(2)}` : summary ? `$${summary.totals.totalCostUsd.toFixed(2)}` : liveData ? "—" : "$0.00"} <span>{stats ? modelUsageLabel : "Cost"}</span></div>
          {selectedModelCosts.length ? <div className="tracify-live-breakdown">{selectedModelCosts.slice(0, 4).map((item) => <div key={item.modelId}><span>{item.modelId}</span><strong>${item.totalCostUsd.toFixed(2)}</strong></div>)}</div> : null}
        </ChartPanel>

        <ChartPanel title="User consumption">
          <TabStrip tabs={["Token cost", "Count of Traces"]} active={consumptionTab} onChange={setConsumptionTab} />
          {userConsumptionValue !== null ? <div className="tracify-stat">{consumptionTab === "Token cost" ? `$${userConsumptionValue.toFixed(2)}` : userConsumptionValue.toLocaleString()} <span>{userConsumptionLabel}</span></div> : liveTokenCost !== null ? <div className="tracify-stat">${liveTokenCost.toFixed(2)} <span>Token cost</span></div> : null}
          {stats?.userCosts?.length ? <div className="tracify-live-breakdown">{stats.userCosts.slice(0, 4).map((item) => <div key={item.endUserId}><span>{item.endUserId}</span><strong>{item.totalTokens.toLocaleString()} tokens</strong></div>)}</div> : null}
        </ChartPanel>
        <ChartPanel title="Scores" subtitle="Moving average per score" />
        <ChartPanel title="Trace latency percentiles" />
        <ChartPanel title="Generation latency percentiles" />
        <ChartPanel title="Observation latency percentiles" />
        <ChartPanel title="Model latencies" subtitle="Latencies (seconds) per LLM generation">
          <label className="tracify-model-select"><select value={model} onChange={(event) => setModel(event.target.value)}><option>All models</option>{summary?.models.map((value) => <option key={value}>{value}</option>)}</select><ChevronDown /></label>
          <TabStrip tabs={["50th Percentile", "75th Percentile", "90th Percentile", "95th Percentile", "99th Percentile"]} active={latencyTab} onChange={setLatencyTab} />
          {selectedLatencyValues.length ? <div className="tracify-stat">{(selectedLatencyValues.reduce((total, value) => total + value, 0) / selectedLatencyValues.length / 1000).toFixed(2)}s <span>{latencyTab} model latency</span></div> : liveModelLatency !== null ? <div className="tracify-stat">{(liveModelLatency / 1000).toFixed(2)}s <span>Average model latency</span></div> : null}
        </ChartPanel>
        <ChartPanel title="Scores Analytics" subtitle="Aggregate scores and averages over time" />
      </main>
      {selectedWidgets.length ? <section className="tracify-added-widgets" aria-label="Added dashboard widgets"><div className="tracify-added-widgets-heading"><span>ADDED WIDGETS</span><span>{selectedWidgets.length}</span></div>{selectedWidgets.map((widget, index) => <div key={widget} className="tracify-added-widget-wrap"><ChartPanel title={widget} subtitle="Custom dashboard widget" className="tracify-added-widget"><div className="tracify-empty-chart"><span>No data</span><Info aria-hidden="true" /></div></ChartPanel><div className="tracify-widget-actions"><button type="button" onClick={() => moveWidget(widget, -1)} disabled={index === 0} aria-label={`Move ${widget} up`}>↑</button><button type="button" onClick={() => moveWidget(widget, 1)} disabled={index === selectedWidgets.length - 1} aria-label={`Move ${widget} down`}>↓</button><button type="button" className="tracify-remove-widget" onClick={() => void removeWidget(widget)} aria-label={`Remove ${widget}`}>×</button></div></div>)}</section> : null}
    </div>
  );
}
