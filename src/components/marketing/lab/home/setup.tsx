"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Check, Copy } from "lucide-react";
import { appHref } from "@/lib/app-links";
import { useCalm } from "./use-calm";

// The same setup prompt the live homepage hands out, so both pages give identical instructions.
const STEPS = [
  "Install the Uncoil SDK: `@uncoil.dev/sdk` for a JavaScript or TypeScript project, `uncoil-sdk` for a Python project.",
  "Run `npx @uncoil.dev/sdk login` so I can sign in or sign up in the browser and pick this project.",
  "Add the one-line init() call at the start of the app.",
  "Run `npx @uncoil.dev/sdk doctor` (JavaScript or TypeScript) or `python -m uncoil doctor` (Python), then send one test trace and tell me where to see it.",
];

const AGENTS = ["Claude Code", "Cursor", "Codex"] as const;
type Agent = (typeof AGENTS)[number];

const PM = [
  { id: "npm", cmd: "npm install @uncoil.dev/sdk" },
  { id: "pnpm", cmd: "pnpm add @uncoil.dev/sdk" },
  { id: "pip", cmd: "pip install uncoil-sdk" },
] as const;

const WHY = [
  ["0", "docs to read"],
  ["0", "keys to copy"],
  ["30s", "to first trace"],
] as const;

function promptFor(agent: Agent) {
  return `Set up Uncoil tracing in this project (${agent}).\n\n${STEPS.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nDo not invent an API key. Never print or commit the key.`;
}

type Line = { k: "you" | "run" | "ok"; text: string; meta?: string };

const replayFor = (agent: Agent): Line[] => [
  { k: "you", text: "Set up Uncoil tracing in this project", meta: agent },
  { k: "run", text: "npm install @uncoil.dev/sdk", meta: "1.8s" },
  { k: "run", text: "npx @uncoil.dev/sdk login", meta: "opening browser" },
  { k: "ok", text: "Signed in · connected to support-agent" },
  { k: "run", text: "init() added to src/index.ts" },
  { k: "run", text: "npx @uncoil.dev/sdk doctor", meta: "key ok · project ok" },
  { k: "ok", text: "First trace sent" },
];

const BARS = [
  { name: "support-agent", left: 0, width: 100 },
  { name: "llm.chat", left: 2, width: 34 },
  { name: "docs.search", left: 38, width: 18 },
  { name: "llm.chat", left: 58, width: 40 },
] as const;

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

/** What the coding agent does with the prompt, replayed as an example session ending in a first trace. */
function Replay({ agent }: { agent: Agent }) {
  const calm = useCalm();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const lines = replayFor(agent);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (calm || !inView) return;
    const id = window.setInterval(() => setStep((s) => (s >= lines.length + 6 ? 0 : s + 1)), 650);
    return () => window.clearInterval(id);
  }, [calm, inView, lines.length]);

  const at = calm ? lines.length + 1 : step;
  const traced = at > lines.length;

  return (
    <div ref={ref} className="flex h-full min-h-[22rem] flex-col font-mono text-[12px]" aria-label={`Example of what ${agent} does with the prompt`}>
      <div className="flex items-center justify-between border-b border-[#eceae3]/20 px-4 py-3 text-[9px] uppercase tracking-[0.16em] text-[#eceae3]/55">
        <span>{agent} · your project · example</span>
        <span className={traced ? "text-[#f4d44d]" : ""}>{traced ? "trace in" : "setting up"}</span>
      </div>
      <ul className="space-y-2.5 px-4 py-4" aria-hidden="true">
        {lines.slice(0, Math.min(at, lines.length)).map((line, i) => (
          <motion.li key={`${agent}-${i}`} initial={calm ? false : { opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }} className="flex items-baseline gap-3">
            <span className={`w-3 shrink-0 ${line.k === "ok" ? "text-[#f4d44d]" : "text-[#eceae3]/40"}`}>{line.k === "you" ? ">" : line.k === "ok" ? "✓" : "$"}</span>
            <span className={`min-w-0 flex-1 truncate ${line.k === "run" ? "text-[#eceae3]/75" : "text-[#eceae3]"}`}>{line.text}</span>
            {line.meta && <span className="hidden shrink-0 text-[10px] text-[#eceae3]/40 sm:inline">{line.meta}</span>}
          </motion.li>
        ))}
        {!traced && <li className="ml-6 h-4 w-2 animate-pulse bg-[#f4d44d]" />}
      </ul>
      <div className="mt-auto border-t border-[#eceae3]/20 px-4 py-4">
        <p className="mb-3 text-[9px] uppercase tracking-[0.16em] text-[#eceae3]/45">Your first trace</p>
        <div className="space-y-2">
          {BARS.map((bar, i) => (
            <div key={i} className="grid grid-cols-[6.5rem_1fr] items-center gap-3">
              <span className="truncate text-[10px] text-[#eceae3]/60">{bar.name}</span>
              <div className="relative h-3">
                <motion.div
                  className="absolute inset-y-0 origin-left bg-[#f4d44d] [background-image:repeating-linear-gradient(90deg,transparent_0_3px,rgba(9,9,9,0.4)_3px_4px)]"
                  style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
                  initial={false}
                  animate={{ scaleX: traced ? 1 : 0, opacity: traced ? 1 : 0.15 }}
                  transition={{ duration: calm ? 0 : 0.45, delay: calm ? 0 : i * 0.1 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Setup() {
  const [agent, setAgent] = useState<Agent>("Claude Code");
  const [pm, setPm] = useState<(typeof PM)[number]["id"]>("npm");
  const { done, copy } = useCopy();
  const prompt = promptFor(agent);
  const install = PM.find((p) => p.id === pm)!.cmd;

  return (
    <section id="pw-setup" className="scroll-mt-16 bg-[#eceae3] px-5 pb-20 pt-10 text-[#090909] md:px-10 md:pb-28 md:pt-14" aria-labelledby="mix-setup-title">
      <div className="mx-auto max-w-[1320px]">
        <p className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.18em]">
          <span>05</span>
          <span className="h-px flex-1 bg-black" />
          <span>The prompt</span>
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <h2 id="mix-setup-title" className="font-pixel text-[clamp(3rem,7vw,6.5rem)] leading-[0.86] tracking-[-0.08em]">
            One paste.
            <br />
            First trace.
          </h2>
          <div>
            <p className="max-w-md text-lg leading-8 text-black/75">Copy it into your coding agent. It installs Uncoil, signs you in, connects this project and sends your first trace while you watch.</p>
            <dl className="mt-5 grid grid-cols-3 border-y-2 border-black">
              {WHY.map(([n, label], i) => (
                <div key={label} className={`py-3 ${i ? "border-l-2 border-black pl-4" : ""}`}>
                  <dt className="font-pixel text-4xl tracking-[-0.06em]">{n}</dt>
                  <dd className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-black/65">{label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="mt-12 border-2 border-black bg-[#090909] text-[#eceae3] shadow-[10px_10px_0_0_#090909] md:mt-16">
          <div role="tablist" aria-label="Coding agent" className="grid grid-cols-3 border-b-2 border-black font-mono text-[10px] uppercase tracking-[0.12em] sm:text-[11px]">
            {AGENTS.map((a) => (
              <button
                key={a}
                type="button"
                role="tab"
                aria-selected={agent === a}
                onClick={() => setAgent(a)}
                className={`relative px-2 py-4 transition-colors ${agent === a ? "bg-[#eceae3] text-black" : "text-[#eceae3]/60 hover:bg-[#eceae3]/10 hover:text-[#eceae3]"}`}
              >
                {a}
                {agent === a && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-[#f4d44d]" />}
              </button>
            ))}
          </div>
          <div className="grid lg:grid-cols-[1.1fr_1fr]">
            <div className="flex min-w-0 flex-col border-b-2 border-black lg:border-b-0 lg:border-r-2">
              <pre className="max-h-[19rem] overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-[12px] leading-6 text-[#eceae3]/85 md:p-6">
                {prompt.split("\n").map((line, i) => (
                  <span key={i} className="grid grid-cols-[1.75rem_1fr] gap-3">
                    <span aria-hidden="true" className="select-none text-right text-[#f4d44d]/70">{String(i + 1).padStart(2, "0")}</span>
                    <span>{line || " "}</span>
                  </span>
                ))}
              </pre>
              <button
                type="button"
                onClick={() => copy("prompt", prompt)}
                className="group mt-auto flex w-full items-center justify-between gap-4 bg-[#f4d44d] px-5 py-5 text-left font-mono text-black transition-colors hover:bg-[#fff4b5] md:px-6"
              >
                <span>
                  <span className="block text-[13px] uppercase tracking-[0.14em] md:text-[15px]">{done === "prompt" ? "Copied. Paste it in " + agent : "Copy setup prompt"}</span>
                  <span className="mt-1 block text-[10px] uppercase tracking-[0.12em] text-black/60">Sign in when the browser opens. No account? Make one there, free.</span>
                </span>
                <span className="grid size-12 shrink-0 place-items-center bg-black text-[#f4d44d]">
                  {done === "prompt" ? <Check className="size-5" aria-hidden="true" /> : <Copy className="size-5" aria-hidden="true" />}
                </span>
              </button>
              <span className="sr-only" role="status">{done === "prompt" ? "Prompt copied" : ""}</span>
            </div>
            <Replay key={agent} agent={agent} />
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div className="min-w-0 max-w-xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/65">Prefer doing it yourself?</p>
            <div className="mt-3 flex flex-wrap border-2 border-black bg-[#090909] text-[#eceae3]">
              <div role="tablist" aria-label="Package manager" className="flex w-full shrink-0 border-b border-[#eceae3]/15 font-mono text-[10px] uppercase tracking-[0.12em] sm:w-auto sm:border-b-0 sm:border-r">
                {PM.map((p) => (
                  <button key={p.id} type="button" role="tab" aria-selected={pm === p.id} onClick={() => setPm(p.id)} className={`px-4 py-2.5 sm:py-0 ${pm === p.id ? "text-[#f4d44d]" : "text-[#eceae3]/45 hover:text-[#eceae3]"}`}>
                    {p.id}
                  </button>
                ))}
              </div>
              <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap px-4 py-4 font-mono text-[13px]">{install}</code>
              <button type="button" onClick={() => copy("install", install)} aria-label="Copy install command" className="grid w-14 shrink-0 place-items-center border-l border-[#eceae3]/15 hover:bg-[#f4d44d] hover:text-black">
                {done === "install" ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={appHref("/sign-up")} className="group inline-flex items-center gap-3 bg-black px-7 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#eceae3] hover:bg-[#f4d44d] hover:text-black">
              Start free <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link href="/docs" className="inline-flex items-center border-2 border-black px-7 py-4 font-mono text-[11px] uppercase tracking-[0.14em] hover:bg-black hover:text-[#eceae3]">
              Read the docs
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
