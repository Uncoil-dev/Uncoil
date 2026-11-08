"use client";

import Link from "next/link";

type ArrivedRun = {
  runId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  spanCount: number;
  totalCostUsd: number;
  primaryModel?: string;
};

function clock(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Hints get more specific the longer the wait lasts. */
function hintFor(elapsed: number, probeAccepted: boolean) {
  if (elapsed < 20) return null;
  if (elapsed < 60) return "Run your agent once now. A single run is enough.";
  if (probeAccepted) return "Your key and our servers work. Check that your agent loads the .env file before it starts.";
  return "Still quiet. Open “Not seeing anything?” below and send a test span to find out which side is stuck.";
}

export function FirstRunPanel({
  projectName,
  projectId,
  keyDisplay,
  elapsed,
  run,
  probeAccepted,
}: {
  projectName: string;
  projectId: string;
  keyDisplay: string;
  elapsed: number;
  run: ArrivedRun | null;
  probeAccepted: boolean;
}) {
  if (run) {
    return (
      <div className="border border-black bg-[#f4d44d] p-5 text-black" role="status" aria-live="polite">
        <div className="flex items-center gap-4">
          <span style={{ backgroundColor: "#050505", color: "#f4d44d" }} className="grid size-11 shrink-0 place-items-center font-mono text-2xl leading-none" aria-hidden="true">✓</span>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/70">Found in {clock(elapsed)}</p>
            <p className="font-pixel text-[clamp(1.6rem,4vw,2.25rem)] leading-none tracking-[-0.05em]">First run received.</p>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-3 gap-px border border-[#050505] bg-[#050505]">
          {[
            ["Spans", String(run.spanCount)],
            ["Status", run.status],
            ["Model", run.primaryModel ?? "none"],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0 bg-[#090909] px-3 py-2.5">
              <dt style={{ color: "rgba(236,234,227,.55)" }} className="font-mono text-[9px] uppercase tracking-[0.14em]">{label}</dt>
              <dd style={{ color: "#f4d44d" }} className="mt-1 truncate font-mono text-[12px]">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 break-all font-mono text-[11px] text-black/65">{run.runId}</p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link href={`/dashboard/${projectId}/runs/${encodeURIComponent(run.runId)}`} style={{ color: "#eceae3" }} className="inline-flex h-12 items-center justify-center border border-[#050505] bg-[#050505] px-6 font-mono text-[12px] uppercase tracking-[0.1em] transition-opacity hover:opacity-80">Open your trace →</Link>
          <Link href={`/dashboard/${projectId}/tracing`} className="inline-flex h-12 items-center justify-center border border-[#050505] px-6 font-mono text-[12px] uppercase tracking-[0.1em] transition-colors hover:bg-[#fff4b5]">Go to dashboard</Link>
        </div>
      </div>
    );
  }

  const hint = hintFor(elapsed, probeAccepted);
  return (
    <div className="border border-black bg-[#090909] px-6 py-5 text-[#eceae3]" role="status" aria-live="polite">
      <div className="flex items-center gap-4">
        <span className="relative flex size-3 shrink-0" aria-hidden="true">
          <span className="absolute inset-0 animate-ping bg-[#f4d44d] opacity-60 motion-reduce:animate-none" style={{ animationDuration: "2.4s" }} />
          <span className="relative size-3 bg-[#f4d44d]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">Listening for your first run</p>
          <p className="mt-1 truncate font-pixel text-2xl tracking-[-0.05em]">{projectName}</p>
        </div>
        <p className="font-mono text-sm tabular-nums text-[#f4d44d]">{clock(elapsed)}</p>
      </div>
      <p className="mt-4 truncate border-t border-white/10 pt-3 font-mono text-[11px] text-white/45">{keyDisplay}</p>
      {hint ? <p className="mt-3 font-sans text-sm leading-6 text-[#f4d44d]">{hint}</p> : null}
    </div>
  );
}
