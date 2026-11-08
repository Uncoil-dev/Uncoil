"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";
import { BudgetForm } from "./budget-form";
import { EmptyState } from "../empty/empty-state";
import { SampleBudgets } from "../empty/samples";

const COLORS = { ok: "#5BE3A0", warning: "#F4D44D", over: "#FF6B6B" } as const;
const LABELS = { ok: "ON TRACK", warning: "WARNING", over: "OVER" } as const;
const usd = (value: number) => `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function BudgetsPanel({ projectId }: { projectId: string }) {
  const data = useQuery(api.budgets.overview, { projectId: projectId as Id<"projects"> });
  const setEnabled = useMutation(api.budgets.setEnabled);
  const remove = useMutation(api.budgets.remove);
  const { data: session } = authClient.useSession();
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const budgets = data?.budgets ?? [];
  const attention = budgets.filter((budget) => budget.enabled && budget.level !== "ok");
  const button = "h-6 border border-[#262C35] px-2 text-[11px] text-[#8B93A1] hover:border-[#4A5260] hover:text-[#E6E9EE]";

  return (
    <div className="flex min-h-0 flex-1 flex-col font-[family-name:var(--font-geist-sans)] text-[13px] text-[#E6E9EE]">
      <header className="flex flex-wrap items-center gap-2 border-b border-[#1F242C] px-4 py-2">
        <h1 className="mr-2 text-base font-semibold tracking-tight">Cost budgets</h1>
        <span className="text-[12px] text-[#8B93A1]">Get a warning before spending gets out of hand.</span>
        <button type="button" onClick={() => setCreating(true)} className="ml-auto h-7 bg-[#F4D44D] px-3 font-bold text-[#090909]">+ New budget</button>
      </header>
      {data === undefined ? (
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading budgets">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-40 animate-pulse border border-[#1F242C] bg-[#0E1115]" />)}</div>
      ) : data === null ? (
        <p className="p-6 text-[#8B93A1]">You don’t have access to this project’s budgets.</p>
      ) : budgets.length === 0 ? (
        <div className="p-4"><EmptyState eyebrow="Budgets" title="Never get surprised by the bill" why="Set a weekly or monthly limit. You get a warning at 80% and another when you pass it." sample={<SampleBudgets />} action={{ label: "Set your first budget", onClick: () => setCreating(true) }} /></div>
      ) : (
        <>
          <div className={`flex items-center gap-3 border-b border-[#1F242C] px-4 py-3 ${attention.length ? "bg-gradient-to-r from-[#2a1214] to-[#0B0D10]" : ""}`} role="status">
            <span className={`font-mono text-3xl font-bold ${attention.length ? "text-[#FF6B6B]" : "text-[#5BE3A0]"}`}>{attention.length || "✓"}</span>
            <div>
              <b className="text-[15px]">{attention.length ? (attention.length === 1 ? "budget needs a look" : "budgets need a look") : "Spending is on track"}</b>
              <div className="text-[11px] text-[#8B93A1]">{attention.length ? `${attention.map((b) => b.name).join(" and ")} ${attention.length === 1 ? "has" : "have"} passed the warning level.` : "Every active budget is under its warning level."} Checked every 15 minutes.{data.truncated ? " Very busy projects may be slightly under-counted." : ""}</div>
            </div>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {budgets.map((budget) => {
              const color = budget.enabled ? COLORS[budget.level] : "#6B7380";
              const percent = Math.min(100, (budget.spent / budget.limitUsd) * 100);
              const days = Math.max(0, Math.ceil((budget.periodEnd - data.now) / 86_400_000));
              return (
                <article key={budget._id} className={`border border-[#1F242C] bg-[#0E1115] p-3 ${budget.enabled && budget.level === "over" ? "shadow-[inset_2px_0_0_#FF6B6B]" : ""} ${budget.enabled ? "" : "opacity-60"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><b className="block truncate">{budget.name}</b><span className="text-[11px] text-[#8B93A1]">{budget.period === "week" ? "Per week" : "Per month"} · {budget.environment ?? "all environments"}</span></div>
                    <span className="border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.1em]" style={{ color, borderColor: color }}>{budget.enabled ? LABELS[budget.level] : "PAUSED"}</span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2"><span className="font-mono text-xl font-bold" style={{ color }}>{usd(budget.spent)}</span><span className="font-mono text-[11px] text-[#6B7380]">of {usd(budget.limitUsd)}</span></div>
                  <div className="relative mt-2 h-2 bg-[#171B21]" role="progressbar" aria-label={`${budget.name} spend`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}>
                    <i className="absolute inset-y-0 left-0 block" style={{ width: `${percent}%`, background: color }} />
                    <i className="absolute inset-y-[-3px] block w-px bg-[#8B93A1]" style={{ left: `${budget.warnAtPercent}%` }} title={`Warning at ${budget.warnAtPercent}%`} />
                  </div>
                  <p className="mt-2 text-[11px] text-[#8B93A1]">
                    {budget.projected === null ? "Not enough data yet to forecast." : <>On this pace: <b className={budget.projected > budget.limitUsd ? "text-[#FF8A8A]" : "text-[#E6E9EE]"}>{usd(budget.projected)}</b> by the end</>} · resets in {days} {days === 1 ? "day" : "days"}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[#6B7380]">
                    <span className="font-mono">{[budget.emailTo.length ? `✉ ${budget.emailTo.length}` : "", budget.hasSlack ? "Slack" : "", budget.hasWebhook ? "Webhook" : ""].filter(Boolean).join(" · ")}</span>
                    {confirming === budget._id ? (
                      <span className="flex gap-1.5"><button type="button" onClick={() => { void remove({ budgetId: budget._id }); setConfirming(null); }} className="h-6 border border-[#FF6B6B] px-2 text-[11px] text-[#FF8A8A]">Delete {budget.name}?</button><button type="button" onClick={() => setConfirming(null)} className={button}>Keep</button></span>
                    ) : (
                      <span className="flex gap-1.5"><button type="button" onClick={() => void setEnabled({ budgetId: budget._id, enabled: !budget.enabled })} aria-label={`${budget.enabled ? "Pause" : "Resume"} ${budget.name}`} className={button}>{budget.enabled ? "Pause" : "Resume"}</button><button type="button" onClick={() => setConfirming(budget._id)} aria-label={`Delete ${budget.name}`} className={button}>Delete</button></span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
      {creating ? <BudgetForm projectId={projectId} defaultEmail={session?.user?.email ?? ""} onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
