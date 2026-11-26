import { explainFailure, type ExplainSpan } from "@/lib/explain-failure.ts";

/** The stages the hero session moves through. The coil artwork reacts to each one. */
export type Phase = "setup" | "running" | "failed" | "explain" | "fixing" | "passed";

export type Line =
  | { k: "prompt"; text: string }
  | { k: "paste"; text: string }
  | { k: "tool"; verb: string; arg: string; out?: string }
  | { k: "span"; name: string; meta: string; status: "ok" | "warn" | "fail" }
  | { k: "verdict"; status: "fail" | "pass"; text: string }
  | { k: "uncoil"; title: string; body: string; foot: string };

/** One line of the scripted session: how long it takes to appear (`ms`) and how long it rests afterwards (`rest`). */
export type Step = Line & { phase: Phase; ms: number; rest?: number };

export type Frame = {
  /** Steps that have fully appeared. */
  shown: number;
  /** 0..1 progress of the step currently appearing (index `shown`), or 1 when the session is over. */
  progress: number;
  phase: Phase;
  done: boolean;
};

export function totalMs(steps: readonly Step[]) {
  return steps.reduce((sum, s) => sum + s.ms + (s.rest ?? 0), 0);
}

/** Where the session is `t` milliseconds after it started. */
export function frameAt(steps: readonly Step[], t: number): Frame {
  let start = 0;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const end = start + step.ms;
    if (t < end) return { shown: i, progress: step.ms ? Math.max(0, (t - start) / step.ms) : 1, phase: step.phase, done: false };
    start = end + (step.rest ?? 0);
    if (t < start) return { shown: i + 1, progress: 0, phase: step.phase, done: i === steps.length - 1 };
  }
  return { shown: steps.length, progress: 1, phase: steps[steps.length - 1]?.phase ?? "setup", done: true };
}

/** The part of a typed line that is visible at `progress`, never splitting the text mid-character. */
export function typed(text: string, progress: number) {
  const chars = Array.from(text);
  return chars.slice(0, Math.round(Math.min(1, Math.max(0, progress)) * chars.length)).join("");
}

const at = (s: number) => new Date(Date.UTC(2026, 10, 26, 9, 0, 0) + s).toISOString();

/** The failing example run. Its explanation and cost come from the same helper the trace viewer uses. */
export const BROKEN_RUN: ExplainSpan[] = [
  { spanId: "1", spanType: "llm", modelId: "llm.chat", createdAt: at(12), latencyMs: 820, costUsd: 0.0121, inputTokens: 412, outputTokens: 96 },
  { spanId: "2", spanType: "tool", toolName: "order.lookup", createdAt: at(840), latencyMs: 140, output: '{"order":"A-1182"}' },
  { spanId: "3", spanType: "tool", toolName: "docs.search", createdAt: at(990), latencyMs: 160, output: "[]" },
  { spanId: "4", spanType: "llm", modelId: "llm.chat", label: "llm.chat · retry", createdAt: at(1170), latencyMs: 1100, costUsd: 0.0187, inputTokens: 980, outputTokens: 140 },
  { spanId: "5", spanType: "tool", toolName: "refund.issue", createdAt: at(2350), latencyMs: 5000, errorType: "timeout", errorMessage: "502 upstream, timed out", timedOut: true },
  { spanId: "6", spanType: "llm", modelId: "llm.reply", createdAt: at(7400), latencyMs: 700, costUsd: 0.0102, inputTokens: 610, outputTokens: 120 },
];

export const FIXED_COST_USD = 0.012;
export const EXPLANATION = explainFailure(BROKEN_RUN)!;

export const usd = (v: number) => `$${v.toFixed(3)}`;
const plain = (text: string) => text.replace(/`/g, "");

export const HERO_SESSION: readonly Step[] = [
  { k: "prompt", text: "set up uncoil tracing in this project", phase: "setup", ms: 1300, rest: 150 },
  { k: "paste", text: "[Pasted setup prompt · 4 steps]", phase: "setup", ms: 0, rest: 450 },
  { k: "tool", verb: "Bash", arg: "npm install @uncoil.dev/sdk", out: "added 1 package in 1.8s", phase: "setup", ms: 500, rest: 350 },
  { k: "tool", verb: "Bash", arg: "npx @uncoil.dev/sdk login", out: "signed in · project support-agent · key saved to .env.local", phase: "setup", ms: 600, rest: 350 },
  { k: "tool", verb: "Bash", arg: "npx @uncoil.dev/sdk doctor", out: "All good. Your setup is ready to send traces.", phase: "setup", ms: 500, rest: 600 },
  { k: "prompt", text: "run the support agent on the refund ticket", phase: "running", ms: 1200, rest: 300 },
  { k: "span", name: "llm.chat", meta: "508 tok · 820ms", status: "ok", phase: "running", ms: 250, rest: 200 },
  { k: "span", name: "order.lookup", meta: "140ms", status: "ok", phase: "running", ms: 250, rest: 200 },
  { k: "span", name: "docs.search", meta: "0 results", status: "warn", phase: "running", ms: 250, rest: 200 },
  { k: "span", name: "llm.chat · retry", meta: `1,120 tok · ${usd(0.0187)}`, status: "ok", phase: "running", ms: 250, rest: 500 },
  { k: "span", name: "refund.issue", meta: "502 · 5000ms", status: "fail", phase: "failed", ms: 300, rest: 200 },
  { k: "verdict", status: "fail", text: `FAILED at refund.issue · step ${EXPLANATION.stepIndex} of ${EXPLANATION.totalSteps}`, phase: "failed", ms: 0, rest: 1800 },
  {
    k: "uncoil",
    title: "uncoil · why it broke",
    body: plain(EXPLANATION.sentence1),
    foot: `burned ${usd(EXPLANATION.burnedUsd)} · fix prompt copied`,
    phase: "explain",
    ms: 400,
    rest: 2000,
  },
  { k: "prompt", text: "[paste fix prompt]", phase: "fixing", ms: 700, rest: 300 },
  { k: "tool", verb: "Edit", arg: "src/tools/refund.ts", out: "+ timeout: 8_000 · + idempotency key · − blind retry", phase: "fixing", ms: 600, rest: 500 },
  { k: "prompt", text: "run it again", phase: "fixing", ms: 600, rest: 300 },
  { k: "span", name: "docs.search", meta: "3 results", status: "ok", phase: "fixing", ms: 220, rest: 150 },
  { k: "span", name: "refund.issue", meta: "200 · 210ms", status: "ok", phase: "fixing", ms: 220, rest: 300 },
  { k: "verdict", status: "pass", text: `PASSED · ${usd(FIXED_COST_USD)} a run, was ${usd(EXPLANATION.burnedUsd)}`, phase: "passed", ms: 0, rest: 0 },
];
