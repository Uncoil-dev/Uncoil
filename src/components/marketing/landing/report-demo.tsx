"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { appHref } from "@/lib/app-links";
import { Reveal } from "./reveal";

/* ---------- A sample weekly agent report you can click through, no sign-up ---------- */
/* Numbers are one week of the generated sample data in the public demo project (support-agent), rounded. Every row links to the live demo. */

const DEMO = "/demo/project";

const week = {
  runs: 3013,
  errors: 206,
  cost: 19.95,
  p95: "7.2s",
  prev: { runs: 2909, errors: 163, cost: 19.25 },
  daily: [1.77, 3.32, 1.83, 1.36, 3.45, 3.35, 3.27],
  days: ["Thu", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed"],
};

type Row = { id: string; name: string; value: number; label: string; sub: string; note: string; href: string; hot?: boolean };

const tabs = {
  cost: {
    title: "Where the money went",
    unit: "per week",
    rows: [
      { id: "gpt41", name: "gpt-4.1", value: 16.0, label: "$16.00", sub: "2,934 calls · 80% of spend", note: "Four out of five dollars go to one model. The cheaper model handles about half of all calls for $0.93, so check which steps really need the big one.", href: `${DEMO}/costs?range=7`, hot: true },
      { id: "sonnet", name: "claude-sonnet-4-5", value: 3.03, label: "$3.03", sub: "370 calls · 15%", note: "Used for the harder escalations. Cost per call is the highest here, and it is worth it only if these runs end better.", href: `${DEMO}/costs?range=7` },
      { id: "mini", name: "gpt-4.1-mini", value: 0.93, label: "$0.93", sub: "3,369 calls · 5%", note: "The busiest model and the cheapest. Moving more simple steps here is the fastest saving.", href: `${DEMO}/costs?range=7` },
    ],
  },
  errors: {
    title: "What broke",
    unit: "traces with this error",
    rows: [
      { id: "refund", name: "issue_refund · ToolTimeout", value: 63, label: "63", sub: "Refund call gave no answer in 8 s", note: "One bug caused almost a third of all failures. It started with release v1.14.0 and stopped after v1.14.1. Open the failing traces to see the exact step.", href: `${DEMO}/tracing?release=v1.14.0&status=error&range=30d`, hot: true },
      { id: "kb", name: "search_kb · ConnectionError", value: 41, label: "41", sub: "Knowledge index reset the connection", note: "Spread evenly over the week, so it looks like a flaky dependency, not a release. A retry with a short wait would hide most of these.", href: `${DEMO}/tracing?status=error&range=7d&errors=1` },
      { id: "rate", name: "gpt-4.1-mini · RateLimitError", value: 17, label: "17", sub: "Tokens-per-minute limit hit", note: "Shows up in busy hours. Spread the load or ask for a higher limit.", href: `${DEMO}/tracing?status=error&range=7d&errors=1` },
      { id: "cust", name: "get_customer · ToolTimeout", value: 16, label: "16", sub: "Customer lookup timed out at 3 s", note: "Small, but it hits the first step of a run, so the whole run fails early.", href: `${DEMO}/tracing?status=error&range=7d&errors=1` },
    ],
  },
  slow: {
    title: "Which steps were slowest",
    unit: "average seconds, worst case in grey",
    rows: [
      { id: "s-gpt41", name: "gpt-4.1 call", value: 2.15, label: "2.15 s", sub: "Worst: 9.4 s", note: "The slowest step on average, and it runs in nearly every trace. Shorter prompts or a smaller model pay off here first.", href: `${DEMO}/tracing?range=7d`, hot: true },
      { id: "s-refund", name: "issue_refund", value: 1.37, label: "1.37 s", sub: "Worst: 8.0 s (timeouts)", note: "The average looks fine, the worst case does not. The timeouts here are the top error of the week.", href: `${DEMO}/tracing?release=v1.14.0&status=error&range=30d` },
      { id: "s-sonnet", name: "claude-sonnet-4-5 call", value: 1.6, label: "1.61 s", sub: "Worst: 2.4 s", note: "Steady. No long tail.", href: `${DEMO}/tracing?range=7d` },
      { id: "s-mini", name: "gpt-4.1-mini call", value: 0.48, label: "0.48 s", sub: "Worst: 6.7 s", note: "Fast on average, with a rare long tail from rate limits.", href: `${DEMO}/tracing?range=7d` },
    ],
  },
} satisfies Record<string, { title: string; unit: string; rows: Row[] }>;

type TabKey = keyof typeof tabs;
const tabOrder: Array<[TabKey, string]> = [["cost", "Cost"], ["errors", "Errors"], ["slow", "Slow steps"]];

const pct = (now: number, before: number) => {
  const d = ((now - before) / before) * 100;
  return `${d >= 0 ? "↑" : "↓"} ${Math.abs(d).toFixed(1)}%`;
};

/** A bar built from small square cells, so it matches the dithered pixel look of the rest of the page. */
function PixelBar({ ratio, hot }: { ratio: number; hot?: boolean }) {
  return (
    <div className="relative h-4 bg-black/[0.06]" aria-hidden="true">
      <div
        className="absolute inset-y-0 left-0 transition-[width] duration-500"
        style={{
          width: `${Math.max(2, ratio * 100)}%`,
          background: hot ? "#090909" : "repeating-linear-gradient(90deg,#090909 0 4px,transparent 4px 6px)",
        }}
      />
    </div>
  );
}

export function ReportDemo() {
  const [tab, setTab] = useState<TabKey>("errors");
  const [picked, setPicked] = useState<Record<TabKey, string>>({ cost: "gpt41", errors: "refund", slow: "s-gpt41" });
  const current = tabs[tab];
  const rows: Row[] = current.rows;
  const selected = rows.find((r) => r.id === picked[tab]) ?? rows[0];
  const max = Math.max(...rows.map((r) => r.value));
  const dailyMax = Math.max(...week.daily);

  const stats: Array<[string, string, string]> = [
    ["Runs", week.runs.toLocaleString("en-US"), pct(week.runs, week.prev.runs)],
    ["With errors", `${((week.errors / week.runs) * 100).toFixed(1)}%`, pct(week.errors, week.prev.errors)],
    ["Cost", `$${week.cost.toFixed(2)}`, pct(week.cost, week.prev.cost)],
    ["Slowest 5%", week.p95, "per run"],
  ];

  return (
    <section id="sample-report" className="overflow-hidden bg-[#090909] mk-section px-5 text-[#eceae3] md:px-10" aria-labelledby="sample-report-title">
      <div className="mx-auto max-w-[1320px]">
        <Reveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/55">Sample report · no sign-up</p>
            <h2 id="sample-report-title" className="mt-5 max-w-3xl font-pixel mk-h2 leading-[0.92] tracking-[-0.07em]">
              One week of an agent, <span className="text-[#f4d44d]">on one page.</span>
            </h2>
          </div>
          <p className="max-w-sm text-base leading-7 text-white/65">This is one week of sample data from our public demo project. Click a tab, click a row, then open the exact runs behind it.</p>
        </Reveal>

        <Reveal delay={0.1} className="mk-gap">
          <div className="border-2 border-[#eceae3] bg-[#eceae3] text-black shadow-[16px_16px_0_#f4d44d] max-md:shadow-[8px_8px_0_#f4d44d]">
            {/* report header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] md:px-6">
              <span>Agent health report · support-agent</span>
              <span className="text-black/55">Sample week · 4 agents · 3 models</span>
            </div>

            {/* headline numbers */}
            <dl className="grid grid-cols-2 gap-px bg-black/20 md:grid-cols-4">
              {stats.map(([k, v, d]) => (
                <div key={k} className="bg-[#eceae3] px-4 py-4 md:px-6">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">{k}</dt>
                  <dd className="mt-1 font-pixel text-3xl leading-none tracking-[-0.05em] tabular-nums md:text-4xl">{v}</dd>
                  <p className="mt-1.5 font-mono text-[10px] text-black/55">{d}{d.startsWith("per") ? "" : " vs last week"}</p>
                </div>
              ))}
            </dl>

            {/* tabs */}
            <div role="tablist" aria-label="Report sections" className="flex border-y-2 border-black font-mono text-[11px] uppercase tracking-[0.14em]">
              {tabOrder.map(([key, label]) => (
                <button
                  key={key}
                  role="tab"
                  id={`rep-tab-${key}`}
                  aria-selected={tab === key}
                  aria-controls="rep-panel"
                  type="button"
                  onClick={() => setTab(key)}
                  className={`flex-1 px-3 py-3.5 transition-colors md:flex-none md:px-8 ${tab === key ? "bg-black text-[#f4d44d]" : "hover:bg-[#f4d44d]"}`}
                >
                  {label}
                </button>
              ))}
              <span className="ml-auto hidden items-center px-6 text-black/45 md:flex">Click a row</span>
            </div>

            <div id="rep-panel" role="tabpanel" aria-labelledby={`rep-tab-${tab}`} className="grid lg:grid-cols-[1.25fr_1fr]">
              {/* rows */}
              <div className="border-b-2 border-black p-4 md:p-6 lg:border-b-0 lg:border-r-2">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-pixel text-2xl tracking-[-0.05em] md:text-3xl">{current.title}</h3>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-black/50">{current.unit}</span>
                </div>
                <ul className="mt-5 space-y-2">
                  {rows.map((r) => {
                    const on = r.id === selected.id;
                    return (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => setPicked((p) => ({ ...p, [tab]: r.id }))}
                          aria-pressed={on}
                          className={`block w-full border px-3 py-3 text-left transition-colors ${on ? "border-black bg-white shadow-[4px_4px_0_#f4d44d]" : "border-black/20 hover:border-black"}`}
                        >
                          <span className="flex items-baseline justify-between gap-3 font-mono text-xs">
                            <span className="min-w-0 truncate font-medium">{r.name}</span>
                            <span className="shrink-0 tabular-nums">{r.label}</span>
                          </span>
                          <span className="mt-2 block"><PixelBar ratio={r.value / max} hot={r.hot} /></span>
                          <span className="mt-1.5 block font-mono text-[10px] text-black/55">{r.sub}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* what it means */}
              <div className="flex flex-col justify-between gap-6 bg-[#090909] p-5 text-[#eceae3] md:p-8">
                <div aria-live="polite">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">What it means</p>
                  <p className="mt-3 inline-block bg-[#f4d44d] px-2 py-1 font-mono text-[11px] text-black">{selected.name}</p>
                  <p className="mt-4 text-base leading-7 text-white/80">{selected.note}</p>
                </div>
                <Link href={appHref(selected.href)} className="group inline-flex w-fit items-center gap-3 border border-[#f4d44d] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#f4d44d] hover:bg-[#f4d44d] hover:text-black">
                  Open these runs in the demo <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* daily cost strip */}
            <div className="flex flex-wrap items-end gap-x-8 gap-y-4 border-t-2 border-black px-4 py-4 md:px-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">Daily cost</p>
              <div className="flex h-12 items-end gap-1.5" role="img" aria-label={`Daily cost over the week, from $${Math.min(...week.daily).toFixed(2)} to $${dailyMax.toFixed(2)}`}>
                {week.daily.map((v, i) => (
                  <div key={week.days[i]} className="flex w-7 flex-col items-center gap-1">
                    <div className="w-full bg-black" style={{ height: `${(v / dailyMax) * 40}px` }} />
                  </div>
                ))}
              </div>
              <p className="font-mono text-[10px] text-black/45">{week.days[0]} to {week.days[6]}</p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.15} className="mt-14 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Link href={appHref("/sign-up")} className="group inline-flex min-h-13 items-center gap-3 bg-[#f4d44d] px-7 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-black hover:bg-white">
            Get this for your agent, free <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
          <Link href={appHref(DEMO)} className="inline-flex min-h-13 items-center gap-3 border border-white/30 px-7 py-4 font-mono text-[11px] uppercase tracking-[0.14em] hover:bg-white hover:text-black">
            Explore the whole demo project
          </Link>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/45 sm:ml-2">Sample data · no card</p>
        </Reveal>
      </div>
    </section>
  );
}
