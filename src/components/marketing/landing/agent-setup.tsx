"use client";

import { appHref } from "@/lib/app-links";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Copy } from "lucide-react";
import { DitherEmber } from "./dither-ember";
import { Reveal } from "./reveal";

// PLACEHOLDER prompt: swap in the tested text from the "Write the agent setup prompt" work when it lands.
const STEPS = [
  "Install the Tracify SDK in this project.",
  "Run `npx tracify-sdk login` so I can sign in or sign up in the browser and pick this project.",
  "Add the one-line init() call at the start of the app.",
  "Run `npx tracify-sdk doctor`, then send one test trace and tell me where to see it.",
];

const AGENTS = ["Claude Code", "Cursor", "Codex"] as const;
type Agent = (typeof AGENTS)[number];

const PM = [
  { id: "npm", cmd: "npm install tracify-sdk" },
  { id: "pnpm", cmd: "pnpm add tracify-sdk" },
  { id: "pip", cmd: "pip install tracify-sdk" },
] as const;

const WHY = [
  ["0", "docs to read"],
  ["0", "keys to copy"],
  ["30s", "to first trace"],
] as const;

function promptFor(agent: Agent) {
  return `Set up Tracify tracing in this project (${agent}).\n\n${STEPS.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nDo not invent an API key. Never print or commit the key.`;
}

function useCopy() {
  const [done, setDone] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setDone(id);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDone(null), 1800);
  }
  return { done, copy };
}

type Line = { k: "you" | "run" | "ok"; text: string; meta?: string };

function replayFor(agent: Agent): Line[] {
  return [
    { k: "you", text: "Set up Tracify tracing in this project", meta: agent },
    { k: "run", text: "npm install tracify-sdk", meta: "1.8s" },
    { k: "run", text: "npx tracify-sdk login", meta: "opening browser" },
    { k: "ok", text: "Signed in · connected to support-agent" },
    { k: "run", text: "init() added to src/index.ts" },
    { k: "run", text: "npx tracify-sdk doctor", meta: "key ok · project ok" },
    { k: "ok", text: "First trace sent" },
  ];
}

const BARS = [
  { name: "support-agent", left: 0, width: 100 },
  { name: "llm.chat", left: 2, width: 34 },
  { name: "tool.search", left: 38, width: 18 },
  { name: "llm.chat", left: 58, width: 40 },
] as const;

/** A looping example agent session that shows what the prompt does, ending in a tiny trace waterfall. */
function AgentReplay({ agent }: { agent: Agent }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const lines = replayFor(agent);
  const total = lines.length + 1;
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduce || !inView) return;
    const id = window.setInterval(() => setStep((s) => (s >= total + 4 ? 0 : s + 1)), 700);
    return () => window.clearInterval(id);
  }, [reduce, inView, total]);

  const at = reduce ? total : step;
  const shown = Math.min(at, lines.length);
  const showTrace = at > lines.length;

  return (
    <div ref={ref} className="flex h-full min-h-[420px] flex-col border border-white/20 bg-black font-mono text-[12px] text-[#eceae3]" aria-label="Example of what your agent does with the prompt">
      <div className="flex items-center justify-between border-b border-white/15 px-4 py-3 text-[9px] uppercase tracking-[0.16em] text-white/50">
        <span className="flex items-center gap-2">
          <span className="size-2 bg-[#f4d44d]" />
          {agent} · your project
        </span>
        <span className={showTrace ? "text-[#f4d44d]" : ""}>{showTrace ? "trace live" : "setting up"}</span>
      </div>
      <ul className="space-y-2.5 px-4 py-4" aria-hidden="true">
        {lines.slice(0, shown).map((line, i) => (
          <motion.li
            key={`${agent}-${i}`}
            initial={reduce ? false : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-baseline gap-3"
          >
            <span className={`w-4 shrink-0 ${line.k === "ok" ? "text-[#f4d44d]" : "text-white/40"}`}>
              {line.k === "you" ? ">" : line.k === "ok" ? "✓" : "$"}
            </span>
            <span className={`min-w-0 flex-1 truncate ${line.k === "you" ? "text-white" : line.k === "ok" ? "text-[#f4d44d]" : "text-white/80"}`}>{line.text}</span>
            {line.meta && <span className="hidden shrink-0 text-[10px] text-white/40 sm:inline">{line.meta}</span>}
          </motion.li>
        ))}
        {!showTrace && (
          <li className="flex gap-3">
            <span className="w-4" />
            <span className="h-4 w-2 animate-pulse bg-[#f4d44d]" />
          </li>
        )}
      </ul>
      <div className="mt-auto border-t border-white/15 px-4 py-4">
        <p className="mb-3 text-[9px] uppercase tracking-[0.16em] text-white/45">Your first trace</p>
        <div className="space-y-2">
          {BARS.map((bar, i) => (
            <div key={i} className="grid grid-cols-[96px_1fr] items-center gap-3">
              <span className="truncate text-[10px] text-white/60">{bar.name}</span>
              <div className="relative h-3">
                <motion.div
                  className="absolute inset-y-0 origin-left bg-[#f4d44d] [background-image:repeating-linear-gradient(90deg,transparent_0_3px,rgba(0,0,0,0.35)_3px_4px)]"
                  style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
                  initial={false}
                  animate={{ scaleX: showTrace ? 1 : 0, opacity: showTrace ? 1 : 0.15 }}
                  transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : i * 0.12, ease: [0.23, 1, 0.32, 1] }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepLabel({ n, active, done, children }: { n: number; active: boolean; done: boolean; children: ReactNode }) {
  return (
    <p className={`flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${active || done ? "text-white" : "text-white/50"}`}>
      <span className={`grid size-7 place-items-center ${done ? "bg-[#f4d44d] text-black" : active ? "bg-[#eceae3] text-black" : "border border-white/30"}`}>
        {done ? <Check className="size-3.5" aria-hidden="true" /> : n}
      </span>
      {children}
    </p>
  );
}

export function AgentSetup() {
  const reduce = useReducedMotion();
  const [agent, setAgent] = useState<Agent>("Claude Code");
  const [pm, setPm] = useState<(typeof PM)[number]["id"]>("npm");
  const [copied, setCopied] = useState(false);
  const { done, copy } = useCopy();
  const prompt = promptFor(agent);
  const install = PM.find((p) => p.id === pm)!.cmd;

  function copyPrompt() {
    copy("prompt", prompt);
    setCopied(true);
  }

  return (
    <section id="agent-setup" className="relative overflow-hidden bg-[#f4d44d] px-5 py-24 text-black md:px-10 md:py-32" aria-labelledby="agent-setup-title">
      <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-72 w-2/3 rotate-180 [mask-image:linear-gradient(to_top,black,transparent)]">
        <DitherEmber rgb={[9, 9, 9]} className="!opacity-25" />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-64 [mask-image:linear-gradient(to_top,black,transparent)]">
        <DitherEmber rgb={[9, 9, 9]} className="!opacity-30" />
      </div>

      <div className="relative mx-auto max-w-[1320px]">
        <Reveal className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 bg-black px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#f4d44d]">
              <span className="size-1.5 animate-pulse bg-[#f4d44d]" /> New · let your agent do it
            </p>
            <h2 id="agent-setup-title" className="mt-6 font-pixel text-[clamp(3.75rem,10vw,9rem)] leading-[0.84] tracking-[-0.08em]">
              One paste.
              <br />
              First trace.
            </h2>
          </div>
          <div>
            <p className="max-w-md text-lg leading-8 text-black/75">
              Copy one prompt into your coding agent. It installs Tracify, signs you in, connects this project and sends your first trace while you watch.
            </p>
            <dl className="mt-6 grid grid-cols-3 border-y-2 border-black">
              {WHY.map(([n, label], i) => (
                <div key={label} className={`py-4 ${i ? "border-l-2 border-black pl-4" : ""}`}>
                  <dt className="font-pixel text-4xl tracking-[-0.06em]">{n}</dt>
                  <dd className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-black/65">{label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-14 grid border-2 border-black bg-[#090909] text-[#eceae3] shadow-[12px_12px_0_0_#090909] lg:grid-cols-[1fr_1.05fr]">
          <div className="flex flex-col p-6 md:p-10">
            <ol className="space-y-8">
              <li>
                <StepLabel n={1} active={!copied} done={copied}>Pick your agent</StepLabel>
                <div role="tablist" aria-label="Coding agent" className="mt-4 grid grid-cols-3 border border-white/25 font-mono text-[10px] uppercase tracking-[0.12em] sm:text-[11px]">
                  {AGENTS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      role="tab"
                      aria-selected={agent === a}
                      onClick={() => setAgent(a)}
                      className={`px-2 py-3.5 transition-colors ${agent === a ? "bg-[#eceae3] text-black" : "text-white/60 hover:bg-white/10 hover:text-white"}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </li>

              <li>
                <StepLabel n={2} active={!copied} done={copied}>Copy the setup prompt</StepLabel>
                <div className="relative mt-4">
                  {!copied && !reduce && (
                    <motion.span
                      aria-hidden="true"
                      className="pointer-events-none absolute -inset-1.5 border-2 border-[#f4d44d]"
                      animate={{ opacity: [0.9, 0.15, 0.9] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
                  {!copied && <span className="absolute -top-3 right-4 z-10 bg-[#eceae3] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-black">Start here</span>}
                  <button
                    type="button"
                    onClick={copyPrompt}
                    className="group relative flex w-full items-center justify-between gap-4 bg-[#f4d44d] px-6 py-6 text-left font-mono text-black transition-colors hover:bg-white md:px-8 md:py-7"
                  >
                    <span>
                      <span className="block text-[13px] uppercase tracking-[0.14em] md:text-[15px]">{done === "prompt" ? "Copied" : "Copy setup prompt"}</span>
                      <span className="mt-1 block text-[10px] uppercase tracking-[0.12em] text-black/60">for {agent}</span>
                    </span>
                    <span className="grid size-12 shrink-0 place-items-center bg-black text-[#f4d44d] transition-transform group-hover:scale-105">
                      {done === "prompt" ? <Check className="size-5" aria-hidden="true" /> : <Copy className="size-5" aria-hidden="true" />}
                    </span>
                  </button>
                  <span className="sr-only" role="status">{done === "prompt" ? "Prompt copied" : ""}</span>
                </div>
                <details className="group mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white/50">
                  <summary className="cursor-pointer list-none hover:text-white">
                    <span className="group-open:hidden">+ See what the prompt says</span>
                    <span className="hidden group-open:inline">− Hide prompt</span>
                  </summary>
                  <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words border border-white/15 p-4 text-[11px] normal-case leading-6 tracking-normal text-white/80">{prompt}</pre>
                </details>
              </li>

              <li>
                <StepLabel n={3} active={copied} done={false}>Paste it in {agent}</StepLabel>
                <p className={`mt-3 max-w-sm text-sm leading-6 transition-colors ${copied ? "text-white" : "text-white/55"}`}>
                  {copied ? "Now paste it and press enter. Sign in when the browser opens, and your first trace lands in the dashboard." : "Sign in when the browser opens. No account yet? You make one right there, free."}
                </p>
              </li>
            </ol>
          </div>

          <div className="border-t-2 border-black p-3 md:p-4 lg:border-l-2 lg:border-t-0">
            <AgentReplay key={agent} agent={agent} />
          </div>
        </Reveal>

        <Reveal delay={0.15} className="mt-14 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/65">Prefer doing it yourself?</p>
            <div className="mt-3 flex flex-wrap border-2 border-black bg-[#090909] text-[#eceae3]">
              <div role="tablist" aria-label="Package manager" className="flex w-full shrink-0 border-b border-white/15 font-mono text-[10px] uppercase tracking-[0.12em] sm:w-auto sm:border-b-0 sm:border-r">
                {PM.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={pm === p.id}
                    onClick={() => setPm(p.id)}
                    className={`px-4 py-2.5 sm:py-0 ${pm === p.id ? "text-[#f4d44d]" : "text-white/45 hover:text-white"}`}
                  >
                    {p.id}
                  </button>
                ))}
              </div>
              <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap px-4 py-4 font-mono text-[13px]">{install}</code>
              <button
                type="button"
                onClick={() => copy("install", install)}
                aria-label="Copy install command"
                className="grid w-14 shrink-0 place-items-center border-l border-white/15 hover:bg-[#f4d44d] hover:text-black"
              >
                {done === "install" ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={appHref("/sign-up")} className="group inline-flex items-center gap-3 bg-black px-7 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#f4d44d] hover:bg-white hover:text-black">
              Start free <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link href="/docs" className="inline-flex items-center border-2 border-black px-7 py-4 font-mono text-[11px] uppercase tracking-[0.14em] hover:bg-black hover:text-[#f4d44d]">
              Read the docs
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
