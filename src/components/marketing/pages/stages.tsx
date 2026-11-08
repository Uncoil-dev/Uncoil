"use client";

import { AnimatePresence, motion } from "framer-motion";
import { clamp, type StageProps } from "./page-kit";

const mono = "font-mono text-[10px] uppercase tracking-[0.14em]";
const Fade = ({ k, children }: { k: string | number; children: React.ReactNode }) => (
  <AnimatePresence mode="wait">
    <motion.div key={k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      {children}
    </motion.div>
  </AnimatePresence>
);
const Chip = ({ children, hot }: { children: React.ReactNode; hot?: boolean }) => (
  <span className={`${mono} inline-block px-2 py-1 ${hot ? "bg-[#090909] text-[#f4d44d]" : "border border-black/30"}`}>{children}</span>
);
const Head = ({ left, right }: { left: string; right: string }) => (
  <div className={`${mono} mb-5 flex justify-between border-b border-black pb-3 text-black/60`}>
    <span>{left}</span>
    <span>{right}</span>
  </div>
);

/* ---------- Trace viewer: a waterfall that plays as you scroll ---------- */

const spans = [
  ["agent.run", 0, 100, "root"],
  ["llm.plan", 2, 16, "model"],
  ["tool.search", 16, 42, "tool"],
  ["tool.search  retry", 42, 66, "error"],
  ["llm.answer", 66, 94, "model"],
] as const;

export function TraceStage({ p, active }: StageProps) {
  return (
    <div>
      <Head left="run_7f3a · production · v2.14" right="2.84s · $0.031" />
      <div className="space-y-3">
        {spans.map(([name, a, b, kind], i) => {
          const f = clamp((p * 1.5 - i * 0.12) / 0.2);
          const err = kind === "error";
          return (
            <div key={name} className="grid grid-cols-[96px_1fr] items-center gap-3 sm:grid-cols-[150px_1fr]">
              <span className={`${mono} truncate text-black/70`}>{name}</span>
              <div className="relative h-7 bg-black/[0.07]">
                <div
                  className={`absolute inset-y-0 origin-left ${err ? "bg-[#090909]" : "bg-[#090909]/80"}`}
                  style={{ left: `${a}%`, width: `${b - a}%`, transform: `scaleX(${f})`, backgroundImage: err ? "none" : undefined }}
                />
                {err && f > 0.9 ? <span className={`${mono} absolute inset-y-0 left-[42%] flex items-center bg-[#f4d44d] px-2 text-[#090909]`}>timeout</span> : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-8 border border-black p-4 text-sm leading-6">
        <Fade k={active}>
          {active === 0 ? (
            <div>
              <Chip>4 spans</Chip> <Chip>2 model calls</Chip> <Chip>1 retry</Chip>
              <p className="mt-3 text-black/70">Filtered to production, release 2.14. This is the run a customer flagged.</p>
            </div>
          ) : active === 1 ? (
            <div>
              <Chip hot>first error</Chip>
              <pre className="mt-3 overflow-x-auto font-mono text-[11px] leading-5">{`tool.search  →  timeout after 1,200ms\n{ "query": "refund policy 2024", "retries": 1 }`}</pre>
            </div>
          ) : (
            <div>
              <Chip>comment added</Chip> <Chip>added to dataset</Chip>
              <p className="mt-3 text-black/70">“Search retried with a stale query.” Saved to regression set support-12.</p>
            </div>
          )}
        </Fade>
      </div>
    </div>
  );
}

/* ---------- Cost: bars, then a ranking, then the trace behind it ---------- */

const days = [22, 24, 21, 26, 23, 25, 62, 58, 27, 24];

export function CostStage({ p, active }: StageProps) {
  const total = Math.round(1840 * clamp(p * 1.3));
  return (
    <div>
      <Head left="Spend / last 10 days" right={`$${total.toLocaleString()}`} />
      <Fade k={active}>
        {active === 0 ? (
          <div className="flex h-56 items-end gap-2">
            {days.map((d, i) => (
              <motion.div key={i} className={`flex-1 ${i === 6 || i === 7 ? "bg-[#090909]" : "bg-[#090909]/25"}`} initial={{ height: 0 }} animate={{ height: `${d * 3.3}px` }} transition={{ delay: i * 0.04, duration: 0.5 }} />
            ))}
          </div>
        ) : active === 1 ? (
          <div className="space-y-4">
            {[
              ["Large model", 58],
              ["Retries", 24],
              ["tool.search", 11],
              ["Fast model", 7],
            ].map(([n, v], i) => (
              <div key={n} className="grid grid-cols-[110px_1fr_44px] items-center gap-3">
                <span className={`${mono} text-black/70`}>{n}</span>
                <motion.div className={`h-6 origin-left ${i === 1 ? "bg-[#090909]" : "bg-[#090909]/30"}`} initial={{ scaleX: 0 }} animate={{ scaleX: Number(v) / 58 }} transition={{ delay: i * 0.08 }} />
                <span className={`${mono} text-right`}>{v}%</span>
              </div>
            ))}
            <p className="pt-2 text-sm text-black/65">Retries alone cost a quarter of the bill. That is the thing worth opening.</p>
          </div>
        ) : (
          <div className="border border-black p-5">
            <Chip hot>run_8f2c · $0.41</Chip>
            <pre className="mt-4 overflow-x-auto font-mono text-[11px] leading-6">{`llm.plan         $0.02\ntool.search  x6   $0.00  ← same query\nllm.answer       $0.39  ← 31k tokens in`}</pre>
            <p className="mt-3 text-sm text-black/65">Six identical searches fed one oversized prompt. Duplicated work, not necessary work.</p>
          </div>
        )}
      </Fade>
    </div>
  );
}

/* ---------- Tool calls: a payload that types itself out ---------- */

const calls = [
  { tool: "search_docs", status: "ok", code: `{\n  "tool": "search_docs",\n  "args": { "query": "refund policy" },\n  "latency_ms": 212,\n  "result": "3 documents"\n}` },
  { tool: "issue_refund", status: "rejected", code: `{\n  "tool": "issue_refund",\n  "args": { "amount": 149, "currency": "USD" },\n  "error": "schema rejected:\\n  currency must be lowercase"\n}` },
  { tool: "evaluator", status: "added", code: `check("issue_refund", {\n  currency: /^[a-z]{3}$/,\n  amount: (n) => n > 0,\n})\n// runs on every release` },
];

export function ToolStage({ p, active, count }: StageProps) {
  const local = clamp(p * count - active) * 1.6 + 0.4;
  const c = calls[active];
  const shown = c.code.slice(0, Math.floor(c.code.length * clamp(local)));
  return (
    <div>
      <Head left="tool calls / today" right="1,204 calls" />
      <div className="mb-5 flex flex-wrap gap-2">
        {calls.map((x, i) => (
          <Chip key={x.tool} hot={i === active}>
            {x.tool}
          </Chip>
        ))}
      </div>
      <pre className="min-h-[190px] overflow-x-auto bg-[#090909] p-5 font-mono text-[12px] leading-6 text-[#eceae3]">
        {shown}
        <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-[#f4d44d] align-middle" />
      </pre>
      <div className="mt-4 flex items-center gap-3">
        <Chip hot={c.status !== "ok"}>{c.status === "ok" ? "succeeded" : c.status === "rejected" ? "schema rejected" : "check added"}</Chip>
        <span className="text-sm text-black/65">{active === 1 ? "The agent chose the right tool. The arguments were wrong." : active === 2 ? "A deterministic check now guards this call." : "Selected by llm.plan, 212ms."}</span>
      </div>
    </div>
  );
}

/* ---------- LLM calls: two models side by side ---------- */

const rows = [
  ["Input tokens", 3200, 3200, ""],
  ["Output tokens", 410, 880, ""],
  ["Latency", 0.8, 2.4, "s"],
  ["First token", 220, 640, "ms"],
  ["Cost", 0.004, 0.031, "$"],
] as const;

export function ModelStage({ p, active }: StageProps) {
  const f = clamp(p * 1.4);
  return (
    <div>
      <Head left="llm.answer · same prompt" right="2 models" />
      <div className="grid grid-cols-[110px_1fr_1fr] gap-3">
        <span />
        <span className={`${mono} bg-black/10 p-2`}>Fast model</span>
        <span className={`${mono} bg-[#090909] p-2 text-[#f4d44d]`}>Large model</span>
        {rows.map(([label, a, b, u], i) => {
          const hl = active === 0 ? i < 2 : active === 1 ? i >= 2 : i === 4;
          const max = Math.max(a, b);
          const fmt = (n: number) => (u === "$" ? `$${n.toFixed(3)}` : `${n}${u}`);
          return (
            <div key={label} className={`col-span-3 grid grid-cols-subgrid items-center transition-opacity duration-300 ${hl ? "opacity-100" : "opacity-35"}`}>
              <span className={`${mono} text-black/70`}>{label}</span>
              {[a, b].map((v, k) => (
                <div key={k} className="relative h-8 bg-black/[0.07]">
                  <div className={`absolute inset-y-0 left-0 ${k ? "bg-[#090909]" : "bg-[#090909]/40"}`} style={{ width: `${(v / max) * 100 * f}%` }} />
                  <span className={`${mono} absolute inset-y-0 left-2 flex items-center ${k ? "text-[#eceae3]" : ""} mix-blend-normal`}>{fmt(v)}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <p className="mt-6 border-l-4 border-[#090909] pl-4 text-sm leading-6 text-black/70">
        {active === 0 ? "Pick the generation that made the decision, not the final answer." : active === 1 ? "Latency and first-token time move separately. Streaming feel is not total time." : "Score both on the same dataset before you promote the expensive one."}
      </p>
    </div>
  );
}

/* ---------- Failures: the first crack versus the error you see ---------- */

const chain = ["search", "empty result", "fallback guess", "tool call", "retry x3", "run failed"];

export function FailureStage({ p, active }: StageProps) {
  return (
    <div>
      <Head left="run_c91d · production" right={active === 0 ? "alert firing" : active === 1 ? "tracing back" : "recurrence closed"} />
      {active === 0 ? <div className="mb-5 bg-[#090909] p-3 font-mono text-[11px] uppercase tracking-[0.1em] text-[#f4d44d]">Error rate 4.2% · threshold 1% · release 2.14</div> : null}
      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {chain.map((n, i) => {
          const on = clamp(p * 1.7 - i * 0.12) > 0.4;
          const crack = i === 1;
          const surface = i === chain.length - 1;
          return (
            <li key={n} className={`min-h-24 border p-3 transition-all duration-500 ${on ? "" : "opacity-20"} ${crack && on && active >= 1 ? "border-[#090909] bg-[#f4d44d]" : surface && on ? "border-[#090909] bg-[#090909] text-[#eceae3]" : "border-black/30"}`}>
              <span className={`${mono} text-black/40 ${surface ? "!text-white/50" : ""}`}>0{i + 1}</span>
              <p className="mt-4 font-pixel text-2xl leading-none tracking-[-0.05em]">{n}</p>
              {crack && active >= 1 && on ? <p className={`${mono} mt-2`}>first crack</p> : null}
              {surface && on ? <p className={`${mono} mt-2 text-white/50`}>what you see</p> : null}
            </li>
          );
        })}
      </ol>
      <p className="mt-6 text-sm leading-6 text-black/65">{active === 2 ? "Case added to the evaluation set. The next release is checked before it ships." : "The error surfaced at step six. It started at step two."}</p>
    </div>
  );
}

/* ---------- Use cases: a run that reveals row by row ---------- */

export type ChainRow = { label: string; note: string; flag?: boolean };
export type Meter = { label: string; to: number; prefix?: string; suffix?: string; decimals?: number };

export function ChainStage({ p, active, count, rows, title, flagTag, meter }: StageProps & { rows: readonly ChainRow[]; title: string; flagTag: string; meter?: Meter }) {
  const n = rows.length;
  const flagAt = rows.findIndex((r) => r.flag);
  const mp = meter ? clamp((p - (flagAt + 1) / n) / (1 - (flagAt + 1) / n)) : 0;
  void count;
  return (
    <div>
      <Head left={title} right={`${Math.min(n, active + 1)} / ${n} steps`} />
      <ol className="divide-y divide-black/20 border-y border-black/20">
        {rows.map((r, i) => {
          const on = i <= active;
          return (
            <li key={r.label} className={`grid grid-cols-[34px_1fr_auto] items-center gap-3 px-3 py-2.5 transition-all duration-500 ${on ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"} ${r.flag && on ? "bg-[#090909] text-[#eceae3]" : ""}`}>
              <span className={`${mono} ${r.flag && on ? "text-[#f4d44d]" : "text-black/40"}`}>0{i + 1}</span>
              <div>
                <p className="font-pixel text-xl leading-none tracking-[-0.05em] md:text-2xl">{r.label}</p>
                <p className={`mt-1 text-xs leading-5 ${r.flag && on ? "text-white/65" : "text-black/55"}`}>{r.note}</p>
              </div>
              <span className={`${mono} ${r.flag && on ? "text-[#f4d44d]" : "text-black/40"}`}>{r.flag ? flagTag : "ok"}</span>
            </li>
          );
        })}
      </ol>
      {meter ? (
        <div className="mt-5">
          <div className={`${mono} flex justify-between`}>
            <span>{meter.label}</span>
            <span>
              {meter.prefix}
              {(meter.to * mp).toFixed(meter.decimals ?? 0)}
              {meter.suffix}
            </span>
          </div>
          <div className="mt-2 h-3 bg-black/10">
            <div className="h-full origin-left bg-[#090909]" style={{ transform: `scaleX(${mp})` }} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ---------- Evaluation: cases against evaluators, then a monitor ---------- */

const evalRows = [
  ["refund-policy-01", true, true, true],
  ["refund-policy-02", true, false, true],
  ["order-status-07", true, true, true],
  ["escalation-03", false, true, false],
  ["tone-check-11", true, true, true],
] as const;

export function EvalStage({ p, active }: StageProps) {
  const shown = Math.min(evalRows.length, Math.floor(clamp(p * 2.2) * evalRows.length) + 1);
  return (
    <div>
      <Head left="suite support-v12 · 3 evaluators" right={active === 2 ? "monitoring live traffic" : `${shown} / ${evalRows.length} cases`} />
      {active < 2 ? (
        <div className="border border-black/30">
          <div className={`${mono} grid grid-cols-[1fr_repeat(3,64px)] border-b border-black/30 p-3 text-black/50`}>
            <span>Case</span>
            <span>Valid</span>
            <span>Grounded</span>
            <span>Policy</span>
          </div>
          {evalRows.slice(0, active === 0 ? 2 : shown).map(([name, ...r]) => (
            <div key={name} className="grid grid-cols-[1fr_repeat(3,64px)] items-center border-b border-black/15 p-3 last:border-b-0">
              <span className={`${mono} truncate`}>{name}</span>
              {r.map((ok, i) => (
                <span key={i} className={`${mono} w-fit px-2 py-1 ${ok ? "border border-black/30" : "bg-[#090909] text-[#f4d44d]"}`}>
                  {ok ? "pass" : "fail"}
                </span>
              ))}
            </div>
          ))}
          <p className="p-3 text-sm text-black/65">{active === 0 ? "Examples and expected outcomes that match the promise you ship." : "Open any failed cell for the evaluator's explanation and the linked trace."}</p>
        </div>
      ) : (
        <div>
          <div className="relative h-44 border-b border-l border-black/40">
            {[82, 88, 91, 86, 78, 71, 69].map((v, i) => (
              <div key={i} className={`absolute bottom-0 w-[9%] ${v < 80 ? "bg-[#090909]" : "bg-[#090909]/25"}`} style={{ left: `${4 + i * 13.5}%`, height: `${v * (clamp(p * 3 - 2 + 0.3 + i * 0.02) )}%` }} />
            ))}
            <div className="absolute inset-x-0 border-t-2 border-dashed border-black" style={{ bottom: "80%" }} />
          </div>
          <p className={`${mono} mt-3`}>Grounded score · threshold 80%</p>
          <div className="mt-4 bg-[#090909] p-3 font-mono text-[11px] uppercase tracking-[0.1em] text-[#f4d44d]">Alert · average fell below 80% for 2 days</div>
        </div>
      )}
    </div>
  );
}

/* ---------- Runtime control: a ceiling that observe mode only watches ---------- */

const runCosts = [0.06, 0.11, 0.09, 0.31, 0.14, 0.07, 0.42, 0.1];

export function ControlStage({ p, active }: StageProps) {
  const ceiling = 0.25;
  const enforce = active === 2;
  return (
    <div>
      <Head left="policy · run ceiling $0.25" right={enforce ? "mode: enforce" : "mode: observe"} />
      <div className="relative flex h-52 items-end gap-2 border-b border-black/40">
        {runCosts.map((c, i) => {
          const over = c > ceiling;
          const shownCost = enforce && over ? ceiling : c;
          const f = clamp(p * 2.4 - i * 0.1);
          return (
            <div key={i} className="flex flex-1 flex-col items-center justify-end">
              <div className={`w-full transition-colors ${over ? (enforce ? "bg-[#f4d44d] outline outline-1 outline-black" : "bg-[#090909]") : "bg-[#090909]/25"}`} style={{ height: `${(shownCost / 0.45) * 200 * f}px` }} />
            </div>
          );
        })}
        <div className="absolute inset-x-0 border-t-2 border-dashed border-black" style={{ bottom: `${(ceiling / 0.45) * 200}px` }} />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="border border-black/30 p-3">
          <p className={`${mono} text-black/50`}>{active === 0 ? "Baseline" : enforce ? "Blocked" : "Would have blocked"}</p>
          <p className="mt-2 font-pixel text-4xl tracking-[-0.05em]">{active === 0 ? "$0.42 max" : "2 runs"}</p>
        </div>
        <div className="border border-black/30 p-3">
          <p className={`${mono} text-black/50`}>Fallback chain</p>
          <p className="mt-2 font-mono text-[11px] uppercase leading-5 tracking-[0.08em]">large model → fast model → stop</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-black/65">{enforce ? "Enforcement is on. Runs that would cross the ceiling stop at it." : active === 1 ? "Observe mode changes nothing. It records what the policy would have done." : "Look at ordinary and worst-case runs before you pick a number."}</p>
    </div>
  );
}

/* ---------- Reports: a printable page that fills in ---------- */

export function ReportStage({ p, active }: StageProps) {
  const f = clamp(p * 1.6);
  return (
    <div>
      <Head left="Project report · Oct 1 to Oct 14" right={active === 2 ? "print / save as PDF" : "operating record"} />
      <div className="grid grid-cols-3 gap-3">
        {[["Runs", Math.round(48200 * f).toLocaleString()], ["Spend", `$${Math.round(1840 * f).toLocaleString()}`], ["Failed", `${(2.1 * f).toFixed(1)}%`]].map(([k, v]) => (
          <div key={k} className="border border-black/30 p-3">
            <p className={`${mono} text-black/50`}>{k}</p>
            <p className="mt-2 font-pixel text-3xl tracking-[-0.05em]">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {[["Large model", 64], ["Fast model", 22], ["tool.search", 9], ["Other", 5]].map(([n, v], i) => (
          <div key={n} className="grid grid-cols-[100px_1fr_36px] items-center gap-3">
            <span className={`${mono} text-black/70`}>{n}</span>
            <div className="h-4 bg-black/10">
              <div className={`h-full origin-left ${i === 0 ? "bg-[#090909]" : "bg-[#090909]/35"}`} style={{ width: `${Number(v) * clamp(p * 2 - i * 0.12)}%` }} />
            </div>
            <span className={`${mono} text-right`}>{v}%</span>
          </div>
        ))}
      </div>
      <div className={`mt-5 border p-3 transition-colors ${active >= 1 ? "border-[#090909] bg-[#090909] text-[#eceae3]" : "border-black/30"}`}>
        <p className={`${mono} ${active >= 1 ? "text-[#f4d44d]" : "text-black/50"}`}>Failure evidence</p>
        <p className="mt-1 text-sm">run_c91d · empty search result at step 2 · release 2.14</p>
      </div>
    </div>
  );
}
