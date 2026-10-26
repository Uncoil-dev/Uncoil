"use client";

import { appHref } from "@/lib/app-links";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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

export function AgentSetup() {
  const [agent, setAgent] = useState<Agent>("Claude Code");
  const [pm, setPm] = useState<(typeof PM)[number]["id"]>("npm");
  const { done, copy } = useCopy();
  const prompt = promptFor(agent);
  const install = PM.find((p) => p.id === pm)!.cmd;

  return (
    <section id="agent-setup" className="relative overflow-hidden border-b border-white/15 bg-[#090909] px-5 py-24 text-[#eceae3] md:px-10 md:py-32" aria-labelledby="agent-setup-title">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-56 [mask-image:linear-gradient(to_top,black,transparent)] md:h-72">
        <DitherEmber className="opacity-70" />
      </div>
      <div className="relative mx-auto grid max-w-[1320px] gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <Reveal>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f4d44d]">Setup · about 30 seconds</p>
          <h2 id="agent-setup-title" className="mt-5 font-pixel text-[clamp(2.75rem,7vw,6rem)] leading-[0.88] tracking-[-0.08em]">
            Let your agent set it up.
          </h2>
          <p className="mt-6 max-w-md text-base leading-7 text-white/70">
            Paste one prompt into your coding agent. It installs the SDK, signs you in from the terminal, connects this project and sends a first trace.
          </p>
          <ol className="mt-8 max-w-md border-t border-white/15 font-mono text-[11px] uppercase tracking-[0.1em]">
            {["Copy the prompt", "Paste it in your agent", "Sign in when the browser opens", "See your first trace"].map((s, i) => (
              <li key={s} className="flex items-center gap-4 border-b border-white/15 py-3.5">
                <span className="grid size-6 place-items-center bg-[#f4d44d] text-black">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal delay={0.1} className="min-w-0">
          <div className="border border-white/25 bg-[#090909]/95 backdrop-blur-sm">
            <div role="tablist" aria-label="Coding agent" className="flex border-b border-white/15 font-mono text-[10px] uppercase tracking-[0.12em]">
              {AGENTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  role="tab"
                  aria-selected={agent === a}
                  onClick={() => setAgent(a)}
                  className={`flex-1 px-3 py-3.5 transition-colors sm:flex-none sm:px-6 ${agent === a ? "bg-[#f4d44d] text-black" : "text-white/60 hover:text-white"}`}
                >
                  {a}
                </button>
              ))}
            </div>
            <pre className="max-h-[300px] overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-[12px] leading-6 text-white/85 md:p-6" aria-label="Setup prompt">{prompt}</pre>
            <div className="border-t border-white/15 p-4 md:p-5">
              <button
                type="button"
                onClick={() => copy("prompt", prompt)}
                className="group flex w-full items-center justify-center gap-3 bg-[#f4d44d] px-6 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-black hover:bg-white"
              >
                {done === "prompt" ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                {done === "prompt" ? "Copied. Paste it in your agent" : `Copy setup prompt for ${agent}`}
              </button>
              <span className="sr-only" role="status">{done === "prompt" ? "Prompt copied" : ""}</span>
            </div>
          </div>

          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">Or install it yourself</p>
          <div className="mt-3 border border-white/25 bg-[#090909]/95">
            <div role="tablist" aria-label="Package manager" className="flex border-b border-white/15 font-mono text-[10px] uppercase tracking-[0.12em]">
              {PM.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={pm === p.id}
                  onClick={() => setPm(p.id)}
                  className={`px-5 py-2.5 ${pm === p.id ? "text-[#f4d44d]" : "text-white/50 hover:text-white"}`}
                >
                  {p.id}
                </button>
              ))}
            </div>
            <div className="flex items-stretch">
              <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap px-5 py-4 font-mono text-[13px]"><span className="text-[#f4d44d]">$ </span>{install}</code>
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

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={appHref("/sign-up")} className="group inline-flex items-center gap-3 border border-[#f4d44d] px-7 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#f4d44d] hover:bg-[#f4d44d] hover:text-black">
              Start free <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link href="/docs" className="inline-flex items-center border border-white/40 px-7 py-4 font-mono text-[11px] uppercase tracking-[0.14em] hover:bg-white hover:text-black">
              Read the docs
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
