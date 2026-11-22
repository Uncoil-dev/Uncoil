"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BookOpen, Check, Copy } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { DitherEmber } from "@/components/marketing/landing/dither-ember";
import { scoreSnippet } from "@/lib/score-snippets";
import { getDeploymentRegion, getUncoilRegion } from "@/lib/regions";

type Lang = "python" | "typescript";

const STEPS = [
  { id: "install", label: "Install" },
  { id: "instrument", label: "Instrument" },
  { id: "key", label: "Add your key" },
  { id: "verify", label: "First trace" },
] as const;

const BARS = [
  { name: "your-agent", left: 0, width: 100 },
  { name: "llm.chat", left: 3, width: 34 },
  { name: "tool.call", left: 40, width: 18 },
  { name: "llm.chat", left: 60, width: 38 },
] as const;

const SNIPPETS: Record<Lang, { install: string; code: string; file: string }> = {
  python: {
    install: "pip install uncoil-sdk",
    file: "agent.py",
    code: `from uncoil import trace_agent, llm_call

@trace_agent()
async def run_my_agent():
    llm_call(
        input_data="What is Uncoil?",
        output_data="Observability for AI agents.",
        model_id="gpt-4o",
        cost_usd=0.002,
        latency_ms=450
    )
    return "Success"`,
  },
  typescript: {
    install: "npm install @uncoil.dev/sdk",
    file: "agent.ts",
    code: `import { traceAgent, llmCall } from '@uncoil.dev/sdk';

const runAgent = traceAgent(async () => {
  await llmCall({
    input: "What is Uncoil?",
    output: "Observability for AI agents.",
    modelId: "gpt-4o",
    costUsd: 0.002,
    latencyMs: 450
  });
  return "Success";
});`,
  },
};

function useCopy() {
  const [done, setDone] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  function copy(id: string, text: string) {
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    setDone(id);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDone(null), 1800);
  }
  return { done, copy };
}

export function QuickstartGuide({ projectId }: { projectId: string }) {
  const reduce = useReducedMotion();
  const region = getUncoilRegion(getDeploymentRegion());
  const project = useQuery(api.projects.getProjectById, projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  const runs = useQuery(api.agentRuns.listByProject, projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  const firstRun = useMemo(() => (runs ?? []).filter((run) => !run.runId.startsWith("onboarding-")).at(-1) ?? null, [runs]);
  const arrived = Boolean(firstRun);

  const [lang, setLang] = useState<Lang>("python");
  const [elapsed, setElapsed] = useState(0);
  const { done, copy } = useCopy();
  const snippet = SNIPPETS[lang];

  useEffect(() => {
    if (arrived) return;
    const id = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [arrived]);

  const keyLine = `UNCOIL_API_KEY=${project?.apiKeyPrefix || `uncoil_sk_live_${region.id}_`}••••••••${project?.apiKeyLast4 || "••••"}\nUNCOIL_REGION=${region.id}`;
  const envCopy = `UNCOIL_API_KEY=YOUR_API_KEY\nUNCOIL_REGION=${region.id}`;
  const agentPrompt = `Set up Uncoil tracing in this project.\n\n1. Install: ${snippet.install}\n2. Wrap the main agent function with the Uncoil tracing helper and record each model call.\n3. Read UNCOIL_API_KEY and UNCOIL_REGION=${region.id} from the environment. Never print or commit the key.\n4. Run the agent once and tell me where to see the trace.`;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="mx-auto max-w-[1180px] space-y-6 px-4 pb-24 pt-6 lg:px-6">
      {/* Hero */}
      <section className="relative overflow-hidden border border-[#2a2a2a] bg-[#070707]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_top_right,black,transparent_55%)]">
          <DitherEmber className="!opacity-35" />
        </div>
        <div className="relative grid gap-8 p-6 md:p-10 lg:grid-cols-[1.25fr_1fr] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 bg-[#f4d44d] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#090909]">
              <span className="size-1.5 animate-pulse bg-[#090909]" /> Setup · about 5 minutes
            </p>
            <h2 className="mt-6 font-pixel text-[clamp(2.75rem,6vw,5rem)] leading-[0.86] tracking-[-0.07em] text-[#f4f3ee]">
              Connect your
              <br />
              <span className="text-[#f4d44d]">agent.</span>
            </h2>
            <p className="mt-5 max-w-[46ch] font-sans text-[15px] leading-relaxed text-[#b4b4ad]">
              Add four lines, run your agent once, and watch the trace land here. Nothing else to configure.
            </p>
          </div>

          {/* Live status */}
          <div className="border border-[#3a3a3a] bg-[#000000cc] font-mono backdrop-blur" role="status" aria-live="polite">
            <div className="flex items-center justify-between border-b border-[#2a2a2a] px-4 py-3 text-[10px] uppercase tracking-[0.16em]">
              <span className="flex items-center gap-2 text-[#eceae3]">
                <span className={`size-2 ${arrived ? "bg-[#5be3a0]" : "animate-pulse bg-[#f4d44d]"}`} />
                {arrived ? "Trace received" : "Waiting for first trace"}
              </span>
              <span className="text-[#8a8a84]">{arrived ? "connected" : `${mm}:${ss}`}</span>
            </div>
            <div className="space-y-2.5 px-4 py-5">
              {BARS.map((bar, i) => (
                <div key={i} className="grid grid-cols-[80px_1fr] items-center gap-3">
                  <span className="truncate text-[10px] text-[#8a8a84]">{bar.name}</span>
                  <div className="relative h-3 bg-[#ffffff0d]">
                    <motion.div
                      className="absolute inset-y-0 origin-left bg-[#f4d44d] [background-image:repeating-linear-gradient(90deg,transparent_0_3px,rgba(0,0,0,0.35)_3px_4px)]"
                      style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
                      initial={false}
                      animate={arrived || reduce ? { scaleX: 1, opacity: arrived ? 1 : 0.25 } : { scaleX: [0, 1, 1, 0], opacity: [0.2, 0.55, 0.55, 0.2] }}
                      transition={arrived || reduce ? { duration: 0.4 } : { duration: 3.2, repeat: Infinity, delay: i * 0.25, ease: "easeInOut" }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[#2a2a2a] px-4 py-3 text-[11px]">
              {arrived ? (
                <Link href={`/dashboard/${projectId}/tracing`} className="flex items-center justify-between !text-[#f4d44d] hover:underline">
                  Open your first trace <ArrowRight className="size-3.5" />
                </Link>
              ) : (
                <span className="text-[#8a8a84]">Run your agent once. This page updates by itself.</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Progress rail */}
      <ol className="grid grid-cols-2 gap-px border border-[#2a2a2a] bg-[#2a2a2a] md:grid-cols-4" aria-label="Setup progress">
        {STEPS.map((step, i) => {
          const complete = arrived;
          return (
            <li key={step.id}>
              <a href={`#qs-${step.id}`} className="flex items-center gap-3 bg-[#0c0c0c] px-4 py-3.5 font-mono text-[11px] uppercase tracking-[0.12em] !text-[#c9c9c2] transition-colors hover:bg-[#161616]">
                <span className={`grid size-6 shrink-0 place-items-center text-[11px] ${complete ? "bg-[#f4d44d] text-[#090909]" : "border border-[#444] text-[#8a8a84]"}`}>
                  {complete ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
                </span>
                {step.label}
              </a>
            </li>
          );
        })}
      </ol>

      {/* Agent prompt */}
      <section className="relative overflow-hidden bg-[#f4d44d] p-6 text-[#090909] md:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-1/2 [mask-image:linear-gradient(to_left,black,transparent)]">
          <DitherEmber rgb={[9, 9, 9]} className="!opacity-20" />
        </div>
        <div className="relative grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em]">Fastest way</p>
            <h3 className="mt-3 font-pixel text-[clamp(1.75rem,2.6vw,2.4rem)] leading-[0.95] tracking-[-0.06em]">Let your coding agent do it.</h3>
            <p className="mt-3 max-w-[40ch] font-sans text-[14px] leading-relaxed text-[#090909cc]">Paste this into Claude Code, Cursor or Codex. It installs, wires up and sends the first trace.</p>
            <button
              type="button"
              onClick={() => copy("prompt", agentPrompt)}
              className="mt-5 inline-flex h-10 items-center gap-2 bg-[#090909] px-5 font-mono text-[11px] uppercase tracking-[0.14em] !text-[#f4d44d] transition-transform hover:-translate-y-0.5"
            >
              {done === "prompt" ? <Check className="size-4" /> : <Copy className="size-4" />}
              {done === "prompt" ? "Copied" : "Copy prompt"}
            </button>
          </div>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap bg-[#090909] p-4 font-mono text-[11px] leading-relaxed text-[#eceae3]">{agentPrompt}</pre>
        </div>
      </section>

      {/* Manual steps */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
        <h3 className="font-pixel text-2xl tracking-[-0.05em] text-[#f4f3ee]">Or do it by hand</h3>
        <div role="tablist" aria-label="Language" className="inline-flex gap-1 border border-[#333] bg-[#0c0c0c] p-1">
          {(["python", "typescript"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={lang === value}
              onClick={() => setLang(value)}
              className={`h-9 px-5 font-mono text-[11px] uppercase tracking-widest transition-colors ${lang === value ? "bg-[#f4d44d] !text-[#090909]" : "text-[#8a8a84] hover:text-[#f4f3ee]"}`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <Step n={1} id="install" title="Install the library" hint="One package, no config files.">
        <Code code={snippet.install} id="install" file="terminal" copied={done === "install"} onCopy={() => copy("install", snippet.install)} />
      </Step>
      <Step n={2} id="instrument" title="Instrument your agent" hint="Wrap the function that runs your agent and record each model call.">
        <Code code={snippet.code} id="code" file={snippet.file} copied={done === "code"} onCopy={() => copy("code", snippet.code)} />
      </Step>
      <Step n={3} id="key" title="Add your key" hint="Put it in your agent's environment. It is shown in full only once, at creation.">
        <Code code={keyLine} id="env" file=".env" copied={done === "env"} onCopy={() => copy("env", envCopy)} />
      </Step>
      <Step n={4} id="verify" title="Run it once" hint="Start your agent. The status panel at the top turns green when the trace lands.">
        <div className={`flex items-center gap-3 border px-4 py-4 font-mono text-[12px] ${arrived ? "border-[#5be3a0] !text-[#5be3a0]" : "border-[#333] text-[#b4b4ad]"}`}>
          <span className={`size-2 ${arrived ? "bg-[#5be3a0]" : "animate-pulse bg-[#f4d44d]"}`} />
          {arrived ? "Your first trace arrived." : "Listening for your first trace…"}
        </div>
      </Step>

      <Step n={5} id="score" title="Grade your own runs" hint="Optional. Let your agent score each run from code; scores appear on the Scores page." optional>
        <Code code={scoreSnippet(lang, projectId)} id="score" file={lang === "python" ? "score.py" : "score.ts"} copied={done === "score"} onCopy={() => copy("score", scoreSnippet(lang, projectId))} />
      </Step>

      {/* CTA */}
      <section className="flex flex-wrap items-center justify-between gap-4 border border-[#f4d44d] bg-[#0c0c0c] p-6">
        <div>
          <p className="font-pixel text-2xl tracking-[-0.05em] text-[#f4f3ee]">Stuck? We read every message.</p>
          <p className="mt-1 font-sans text-[13px] text-[#9b9b95]">The full guide covers frameworks, environments and troubleshooting.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/docs/quickstart" className="inline-flex h-10 items-center gap-2 bg-[#f4d44d] px-5 font-mono text-[11px] uppercase tracking-[0.14em] !text-[#090909] transition-transform hover:-translate-y-0.5">
            <BookOpen className="size-4" /> Full guide
          </Link>
          <Link href={`/dashboard/${projectId}/tracing`} className="inline-flex h-10 items-center gap-2 border border-[#444] px-5 font-mono text-[11px] uppercase tracking-[0.14em] !text-[#eceae3] hover:border-[#f4d44d]">
            Open tracing <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function Step({ n, id, title, hint, optional, children }: { n: number; id: string; title: string; hint: string; optional?: boolean; children: ReactNode }) {
  return (
    <section id={`qs-${id}`} className="grid scroll-mt-24 gap-4 border-t border-[#2a2a2a] pt-6 md:grid-cols-[220px_1fr] md:gap-8">
      <div>
        <span className="font-pixel text-[56px] leading-none tracking-[-0.06em] text-[#f4d44d]">{String(n).padStart(2, "0")}</span>
        <h4 className="mt-3 font-mono text-[12px] uppercase tracking-[0.14em] text-[#f4f3ee]">
          {title} {optional ? <span className="text-[#8a8a84]">· optional</span> : null}
        </h4>
        <p className="mt-2 font-sans text-[13px] leading-relaxed text-[#9b9b95]">{hint}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function Code({ code, file, copied, onCopy }: { code: string; id: string; file: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="overflow-hidden border border-[#2a2a2a] bg-[#050505]">
      <div className="flex items-center justify-between border-b border-[#2a2a2a] bg-[#0c0c0c] px-3 py-2">
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8a8a84]">
          <span className="size-1.5 bg-[#f4d44d]" /> {file}
        </span>
        <button type="button" onClick={onCopy} className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] !text-[#c9c9c2] hover:!text-[#f4d44d]" aria-label={`Copy ${file}`}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-relaxed text-[#f4d44d]">{code}</pre>
    </div>
  );
}
