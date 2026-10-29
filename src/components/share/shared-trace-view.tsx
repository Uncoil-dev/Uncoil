"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronRight, Lock } from "lucide-react";
import { formatCurrency, formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type SharedSpan = {
  spanId: string;
  parentSpanId: string;
  spanType: string;
  label: string;
  input: string;
  output: string;
  latencyMs: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  errorMessage: string;
  createdAt: string;
};

type SharedRun = {
  runId: string;
  status: string;
  spanCount: number;
  totalCostUsd: number;
  startedAt: string;
  finishedAt: string | null;
  primaryModel: string | null;
};

function pretty(value: string) {
  if (!value) return "";
  try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
}

function depthOf(span: SharedSpan, byId: Map<string, SharedSpan>) {
  let depth = 0;
  let current = span;
  const seen = new Set<string>();
  while (current.parentSpanId && byId.has(current.parentSpanId) && !seen.has(current.spanId) && depth < 8) {
    seen.add(current.spanId);
    current = byId.get(current.parentSpanId)!;
    depth += 1;
  }
  return depth;
}

export function SharedTraceView({ run, spans, unavailable }: { run: SharedRun; spans: SharedSpan[]; unavailable: boolean }) {
  const byId = new Map(spans.map((span) => [span.spanId, span]));
  const duration = run.finishedAt ? new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime() : null;
  const maxLatency = Math.max(1, ...spans.map((span) => span.latencyMs));
  const [open, setOpen] = useState<string | null>(spans.find((span) => span.errorMessage || span.spanType === "error")?.spanId ?? spans[0]?.spanId ?? null);

  return (
    <main className="min-h-screen bg-[#eceae3] text-[#090909]">
      <header className="border-b border-black/15 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <Link href={process.env.NEXT_PUBLIC_MARKETING_ORIGIN || "https://www.uncoil.dev"} className="font-pixel text-xl tracking-[-0.06em]">uncoil</Link>
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-black/55"><Lock className="size-3" />Shared read-only trace</span>
        </div>
      </header>
      <div className="mx-auto max-w-5xl space-y-6 px-5 py-8">
        <section className="border border-black/15 bg-white p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/45">Run</p>
          <h1 className="mt-1 break-all font-mono text-lg">{run.runId}</h1>
          <dl className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Status" value={<span className="capitalize">{run.status}</span>} />
            <Stat label="Total cost" value={formatCurrency(run.totalCostUsd)} />
            <Stat label="Steps" value={String(run.spanCount)} />
            <Stat label="Duration" value={duration === null ? "Running" : formatDuration(duration)} />
          </dl>
          {run.primaryModel ? <p className="mt-4 font-mono text-[11px] text-black/55">Main model: {run.primaryModel}</p> : null}
        </section>

        {unavailable ? <p className="border border-black/15 bg-white p-4 font-mono text-[11px] text-black/60">The steps could not be loaded right now. Try again in a minute.</p> : null}

        <section className="border border-black/15 bg-white">
          <h2 className="border-b border-black/15 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">Steps</h2>
          <ol className="divide-y divide-black/10">
            {spans.map((span) => {
              const isOpen = open === span.spanId;
              const failed = span.spanType === "error" || Boolean(span.errorMessage);
              return (
                <li key={span.spanId}>
                  <button type="button" onClick={() => setOpen(isOpen ? null : span.spanId)} aria-expanded={isOpen}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                    style={{ paddingLeft: `${20 + depthOf(span, byId) * 18}px` }}>
                    {isOpen ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
                    <span className={cn("shrink-0 border px-2 py-0.5 font-mono text-[10px] uppercase", failed ? "border-red-700/40 bg-red-50 text-red-800" : "border-black/20")}>{span.spanType}</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-[12px]">{span.label}</span>
                    <span className="hidden h-1.5 w-24 bg-black/10 sm:block"><span className="block h-full bg-[#f4d44d]" style={{ width: `${Math.max(4, (span.latencyMs / maxLatency) * 100)}%` }} /></span>
                    <span className="shrink-0 font-mono text-[11px] text-black/55">{formatDuration(span.latencyMs)}</span>
                    <span className="hidden shrink-0 font-mono text-[11px] text-black/55 sm:inline">{formatCurrency(span.costUsd)}</span>
                  </button>
                  {isOpen ? (
                    <div className="space-y-4 border-t border-black/10 bg-[#f7f6f1] px-5 py-4">
                      {span.errorMessage ? <Payload title="Error" body={span.errorMessage} /> : null}
                      <Payload title="Input" body={pretty(span.input)} />
                      <Payload title="Output" body={pretty(span.output)} />
                      {span.inputTokens || span.outputTokens ? <p className="font-mono text-[11px] text-black/55">{span.inputTokens} tokens in · {span.outputTokens} tokens out</p> : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </section>
        <p className="text-center font-mono text-[10px] text-black/45">Shared with a private link. The owner can turn it off at any time.</p>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/45">{label}</dt><dd className="mt-1 font-mono text-sm">{value}</dd></div>;
}

function Payload({ title, body }: { title: string; body: string }) {
  if (!body) return null;
  return <div><p className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-black/45">{title}</p><pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words border border-black/10 bg-white p-3 font-mono text-[11px] leading-relaxed">{body}</pre></div>;
}
