"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BookOpen, Check, Copy } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { DitherEmber } from "@/components/marketing/landing/dither-ember";
import { keyEnvLines } from "@/lib/quickstart-env";
import { scoreSnippet } from "@/lib/score-snippets";
import { getDeploymentRegion, getUncoilRegion } from "@/lib/regions";

type Lang = "python" | "typescript";

type StepId = "method" | "prompt" | "install" | "instrument" | "key" | "verify";

const STEP_INFO: Record<StepId, { label: string; title: string; hint: string }> = {
  method: { label: "Start", title: "How do you want to connect?", hint: "Both take about two minutes. Pick what suits you." },
  prompt: { label: "Paste", title: "Paste this into your coding agent", hint: "Claude Code, Cursor or Codex will install, wire up and send the first trace." },
  install: { label: "Install", title: "Install the library", hint: "One package, no config files." },
  instrument: { label: "Instrument", title: "Instrument your agent", hint: "Put this at the top of your agent's main file. Every model call it makes is then recorded." },
  key: { label: "Add your key", title: "Add your key", hint: "Put it in your agent's environment. It is shown in full only once, at creation." },
  verify: { label: "First trace", title: "Run your agent once", hint: "Start your agent. This page updates by itself when the trace lands." },
};

const BARS = [
  { name: "your-agent", left: 0, width: 100 },
  { name: "llm.chat", left: 3, width: 34 },
  { name: "tool.call", left: 40, width: 18 },
  { name: "llm.chat", left: 60, width: 38 },
] as const;

export const SNIPPETS: Record<Lang, { install: string; doctor: string; code: string; file: string }> = {
  python: {
    install: "pip install uncoil-sdk",
    doctor: "python -m uncoil doctor",
    file: "agent.py",
    code: `import uncoil

uncoil.init()  # reads UNCOIL_API_KEY, traces OpenAI, Anthropic and LangChain

# Your agent code stays as it is. Run it once to send your first trace.
# To record your own steps instead: https://www.uncoil.dev/docs/quickstart`,
  },
  typescript: {
    install: "npm install @uncoil.dev/sdk",
    doctor: "npx @uncoil.dev/sdk doctor",
    file: "agent.ts",
    code: `import { init } from "@uncoil.dev/sdk";

const tracing = init(); // reads UNCOIL_API_KEY, traces OpenAI and Anthropic

async function main() {
  await tracing.ready; // once, before the first model call
  // Your agent code, as it is today.
}

main(); // run it once to send your first trace
// To record your own steps instead: https://www.uncoil.dev/docs/quickstart`,
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

export function QuickstartGuide({ projectId, apiKey, embedded = false }: { projectId: string; apiKey?: string; embedded?: boolean }) {
  const reduce = useReducedMotion();
  const region = getUncoilRegion(getDeploymentRegion());
  const project = useQuery(api.projects.getProjectById, projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  const runs = useQuery(api.agentRuns.listByProject, projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  const firstRun = useMemo(() => (runs ?? []).filter((run) => !run.runId.startsWith("onboarding-")).at(-1) ?? null, [runs]);
  const arrived = Boolean(firstRun);

  const updateProgress = useMutation(api.projects.updateOnboardingProgress);
  const [pickedLang, setPickedLang] = useState<Lang | null>(null);
  const lang: Lang = pickedLang ?? project?.onboardingSdk ?? "python";
  const [mode, setMode] = useState<"agent" | "manual">("agent");
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const { done, copy } = useCopy();
  const snippet = SNIPPETS[lang];

  const steps: StepId[] = mode === "agent" ? ["method", "prompt", "verify"] : ["method", "install", "instrument", "key", "verify"];
  const current = steps[Math.min(step, steps.length - 1)];
  const info = STEP_INFO[current];
  const isLast = step >= steps.length - 1;

  useEffect(() => {
    if (arrived || current !== "verify") return;
    const id = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [arrived, current]);

  const shownEnv = keyEnvLines(`${project?.apiKeyPrefix || `uncoil_sk_live_${region.id}_`}••••••••${project?.apiKeyLast4 || "••••"}`, region.id);
  const copyEnv = keyEnvLines(apiKey || "YOUR_API_KEY", region.id);
  const agentPrompt = `Set up Uncoil tracing in this project.\n\n1. Install: ${snippet.install}\n2. Wrap the main agent function with the Uncoil tracing helper and record each model call.\n3. Read UNCOIL_API_KEY and UNCOIL_REGION=${region.id} from the environment. Never print or commit the key.\n4. Run the agent once and tell me where to see the trace.`;
  function pickLang(value: Lang) {
    setPickedLang(value);
    if (projectId) void updateProgress({ projectId: projectId as Id<"projects">, sdk: value }).catch(() => undefined);
  }
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className={embedded ? "w-full" : "mx-auto w-full max-w-[920px] px-4 pb-24 pt-8 lg:px-6"}>
      {/* Progress */}
      <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-[#8a8a84]">
        <span>Setup · step {Math.min(step + 1, steps.length)} of {steps.length}</span>
        <span>{arrived ? "Connected" : "About 2 minutes"}</span>
      </div>
      <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }} aria-label="Setup progress">
        {steps.map((id, i) => (
          <li key={id}>
            <button type="button" onClick={() => setStep(i)} aria-current={i === step ? "step" : undefined} className="group block w-full text-left">
              <span className={`block h-1.5 transition-colors ${i < step || arrived ? "bg-[#f4d44d]" : i === step ? "bg-[#f4f3ee]" : "bg-[#2a2a2a]"}`} />
              <span className={`mt-2 hidden font-mono text-[10px] uppercase tracking-[0.14em] sm:block ${i === step ? "text-[#f4f3ee]" : "text-[#6f6f6a] group-hover:text-[#b4b4ad]"}`}>{STEP_INFO[id].label}</span>
            </button>
          </li>
        ))}
      </ol>

      {/* Stage */}
      <section className="relative mt-6 min-h-[520px] overflow-hidden border border-[#2a2a2a] bg-[#070707]">
        {current === "method" || current === "verify" ? (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 rotate-180 [mask-image:linear-gradient(to_top_right,black,transparent_45%)]">
            <DitherEmber className="!opacity-30" />
          </div>
        ) : null}
        <motion.div key={`${current}-${mode}`} initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} className="relative flex min-h-[520px] flex-col p-6 md:p-10">
          <div className="flex-1">
            <span className="font-pixel text-[72px] leading-none tracking-[-0.06em] text-[#f4d44d]">{String(step + 1).padStart(2, "0")}</span>
            <h2 className="mt-4 font-pixel text-[clamp(2rem,4vw,3.25rem)] leading-[0.95] tracking-[-0.06em] text-[#f4f3ee]">{info.title}</h2>
            <p className="mt-4 max-w-[52ch] font-sans text-[15px] leading-relaxed text-[#9b9b95]">{info.hint}</p>

            <div className="mt-8">
              {current === "method" ? (
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {([["agent", "Use my coding agent", "One paste. Fastest."], ["manual", "Do it step by step", "Install, add code, add key."]] as const).map(([value, label, sub]) => (
                      <button key={value} type="button" onClick={() => setMode(value)} aria-pressed={mode === value} className={`border p-5 text-left transition-colors ${mode === value ? "border-[#f4d44d] bg-[#14120a]" : "border-[#333] bg-[#0c0c0c] hover:border-[#666]"}`}>
                        <span className="block font-mono text-[12px] uppercase tracking-[0.14em] text-[#f4f3ee]">{label}</span>
                        <span className="mt-1 block font-sans text-[13px] text-[#9b9b95]">{sub}</span>
                      </button>
                    ))}
                  </div>
                  <div role="tablist" aria-label="Language" className="inline-flex gap-1 border border-[#333] bg-[#0c0c0c] p-1">
                    {(["python", "typescript"] as const).map((value) => (
                      <button key={value} type="button" role="tab" aria-selected={lang === value} onClick={() => pickLang(value)} className={`h-9 px-5 font-mono text-[11px] uppercase tracking-widest transition-colors ${lang === value ? "bg-[#f4f3ee] !text-[#090909]" : "text-[#8a8a84] hover:text-[#f4f3ee]"}`}>{value}</button>
                    ))}
                  </div>
                </div>
              ) : null}
              {current === "prompt" ? (
                <div className="space-y-4">
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap border border-[#2a2a2a] bg-[#050505] p-4 font-mono text-[12px] leading-relaxed text-[#eceae3]">{agentPrompt}</pre>
                  <button type="button" onClick={() => copy("prompt", agentPrompt)} className="inline-flex h-10 items-center gap-2 bg-[#f4d44d] px-5 font-mono text-[11px] uppercase tracking-[0.14em] !text-[#090909] transition-transform hover:-translate-y-0.5">
                    {done === "prompt" ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {done === "prompt" ? "Copied" : "Copy prompt"}
                  </button>
                </div>
              ) : null}
              {current === "install" ? <Code code={snippet.install} id="install" file="terminal" copied={done === "install"} onCopy={() => copy("install", snippet.install)} /> : null}
              {current === "instrument" ? <Code code={snippet.code} id="code" file={snippet.file} copied={done === "code"} onCopy={() => copy("code", snippet.code)} /> : null}
              {current === "key" ? (
                <div className="space-y-4">
                  <Code code={shownEnv.dotenv} id="env" file=".env" copied={done === "env"} onCopy={() => copy("env", copyEnv.dotenv)} />
                  <Code code={shownEnv.powershell} id="powershell" file="Windows PowerShell" copied={done === "powershell"} onCopy={() => copy("powershell", copyEnv.powershell)} />
                </div>
              ) : null}
              {current === "verify" ? (
                <div className="max-w-[560px] border border-[#3a3a3a] bg-[#000000cc] font-mono" role="status" aria-live="polite">
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
                  <div className="border-t border-[#2a2a2a] px-4 py-3 text-[11px] text-[#8a8a84]">{arrived ? "Your agent is connected." : <>Nothing yet? Run <code className="font-mono text-[#eceae3]">{snippet.doctor}</code> to check your setup.</>}</div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-10 flex items-center justify-between border-t border-[#2a2a2a] pt-5">
            <button type="button" onClick={() => setStep((v) => Math.max(0, v - 1))} disabled={step === 0} className="h-10 border border-[#444] px-5 font-mono text-[11px] uppercase tracking-[0.14em] !text-[#eceae3] transition-colors hover:border-[#f4d44d] disabled:opacity-30">Back</button>
            {!isLast ? (
              <button type="button" onClick={() => setStep((v) => v + 1)} className="inline-flex h-10 items-center gap-2 bg-[#f4d44d] px-6 font-mono text-[11px] uppercase tracking-[0.14em] !text-[#090909] transition-transform hover:-translate-y-0.5">Next <ArrowRight className="size-4" /></button>
            ) : (
              <Link href={`/dashboard/${projectId}/tracing`} className="inline-flex h-10 items-center gap-2 bg-[#f4d44d] px-6 font-mono text-[11px] uppercase tracking-[0.14em] !text-[#090909] transition-transform hover:-translate-y-0.5">{arrived ? "Open your trace" : "Open tracing"} <ArrowRight className="size-4" /></Link>
            )}
          </div>
        </motion.div>
      </section>

      {embedded ? null : (<>
      <details className="mt-6 border border-[#2a2a2a] bg-[#0a0a0a]">
        <summary className="cursor-pointer px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#c9c9c2]">Optional · grade your own runs from code</summary>
        <div className="space-y-3 px-4 pb-4">
          <p className="font-sans text-[13px] text-[#9b9b95]">Let your agent score each run. Scores appear on the Scores page.</p>
          <Code code={scoreSnippet(lang, projectId)} id="score" file={lang === "python" ? "score.py" : "score.ts"} copied={done === "score"} onCopy={() => copy("score", scoreSnippet(lang, projectId))} />
        </div>
      </details>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 font-sans text-[13px] text-[#9b9b95]">
        <span>Stuck? The full guide covers frameworks, environments and troubleshooting.</span>
        <a href="https://www.uncoil.dev/docs/quickstart" className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] !text-[#eceae3] hover:!text-[#f4d44d]"><BookOpen className="size-4" /> Full guide</a>
      </div>
      </>)}
    </div>
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
      <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed text-[#eceae3]">{code}</pre>
    </div>
  );
}
