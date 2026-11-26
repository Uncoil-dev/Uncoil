"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Check, Copy } from "lucide-react";
import { appHref } from "@/lib/app-links";
import { Eyebrow } from "./eyebrow";
import { numberLines } from "./story";
import { AGENTS, BY_HAND, promptFor, type Agent } from "./prompt";
import { AFTER_EYEBROW, BODY, DUR, EASE, H2, LABEL, SECTION, WRAP, primary, secondary } from "./ui";
import { useCalm } from "./use-calm";

// The same setup prompt the live homepage hands out, so both pages give identical instructions.
const WHY = [
  ["0", "docs to read"],
  ["0", "keys to copy"],
  ["30s", "to first trace"],
] as const;

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
          <motion.li key={`${agent}-${i}`} initial={calm ? false : { opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: DUR.fast, ease: EASE }} className="flex items-baseline gap-3">
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
  const [lang, setLang] = useState<(typeof BY_HAND)[number]["id"]>("ts");
  const { done, copy } = useCopy();
  const prompt = promptFor(agent);
  const manual = BY_HAND.find((b) => b.id === lang)!;

  return (
    <section id="pw-setup" className={`scroll-mt-16 bg-[#eceae3] text-[#090909] ${SECTION}`} aria-labelledby="mix-setup-title">
      <div className={WRAP}>
        <Eyebrow n="05" on="cream">The prompt</Eyebrow>

        <div className={`${AFTER_EYEBROW} grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-end`}>
          <h2 id="mix-setup-title" className={H2}>
            One prompt sets it up.
          </h2>
          <div>
            <p className={`max-w-md text-black/75 ${BODY}`}>Copy it into your coding agent. It installs Uncoil, signs you in, connects this project and sends your first trace while you watch.</p>
            <dl className="mt-6 grid grid-cols-3 border-y border-black">
              {WHY.map(([n, label], i) => (
                <div key={label} className={`py-3 ${i ? "border-l border-black/25 pl-4" : ""}`}>
                  <dt className="font-pixel text-4xl tracking-[-0.06em]">{n}</dt>
                  <dd className={`mt-1 text-black/65 ${LABEL}`}>{label}</dd>
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
                className={`relative min-h-12 px-2 py-4 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#f4d44d] ${agent === a ? "bg-[#eceae3] text-black" : "text-[#eceae3]/60 hover:bg-[#eceae3]/10 hover:text-[#eceae3]"}`}
              >
                {a}
                {agent === a && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-[#f4d44d]" />}
              </button>
            ))}
          </div>
          <div className="grid lg:grid-cols-[1.1fr_1fr]">
            <div className="flex min-w-0 flex-col border-b-2 border-black lg:border-b-0 lg:border-r-2">
              <pre className="max-h-[19rem] overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-[12px] leading-6 text-[#eceae3]/85 md:p-6">
                {numberLines(prompt).map(({ n, line }, i) =>
                  n ? (
                    <span key={i} className="grid grid-cols-[1.75rem_1fr] gap-3">
                      <span aria-hidden="true" className="select-none text-right text-[#f4d44d]/70">{n}</span>
                      <span>{line}</span>
                    </span>
                  ) : (
                    <span key={i} className="block h-3" aria-hidden="true" />
                  ),
                )}
              </pre>
              <button
                type="button"
                onClick={() => copy("prompt", prompt)}
                className="group mt-auto flex w-full items-center justify-between gap-4 bg-[#f4d44d] px-5 py-5 text-left font-mono text-black transition-colors hover:bg-[#fff4b5] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#090909] md:px-6"
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

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
          <div className="min-w-0">
            <p className={`text-black/65 ${LABEL}`}>No coding agent? Do it by hand</p>
            <div className="mt-3 border-2 border-black bg-[#090909] text-[#eceae3]">
              <div role="tablist" aria-label="Language" className={`flex border-b border-[#eceae3]/15 ${LABEL}`}>
                {BY_HAND.map((b) => (
                  <button key={b.id} type="button" role="tab" aria-selected={lang === b.id} onClick={() => setLang(b.id)} className={`min-h-11 px-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#f4d44d] ${lang === b.id ? "bg-[#eceae3] text-black" : "text-[#eceae3]/55 hover:text-[#eceae3]"}`}>
                    {b.label}
                  </button>
                ))}
                <span className="ml-auto hidden items-center px-4 text-[#eceae3]/45 sm:flex">{manual.note}</span>
              </div>
              <div className="grid">
                <div className="relative border-b border-[#eceae3]/15">
                  <pre className="overflow-x-auto p-4 pr-14 font-mono text-[12px] leading-6"><code>{manual.shell.split("\n").map((l) => <span key={l} className="block"><span className="select-none text-[#f4d44d]/70">$ </span>{l}</span>)}</code></pre>
                  <button type="button" onClick={() => copy("shell", manual.shell)} aria-label="Copy install commands" className="absolute right-0 top-0 grid size-12 place-items-center hover:bg-[#f4d44d] hover:text-black focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#f4d44d]">
                    {done === "shell" ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                  </button>
                </div>
                <div className="relative">
                  <pre className="overflow-x-auto p-4 pr-14 font-mono text-[12px] leading-6"><code>{manual.code}</code></pre>
                  <button type="button" onClick={() => copy("code", manual.code)} aria-label="Copy code" className="absolute right-0 top-0 grid size-12 place-items-center hover:bg-[#f4d44d] hover:text-black focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#f4d44d]">
                    {done === "code" ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 lg:justify-end">
            <Link href={appHref("/sign-up")} className={primary("cream")}>
              Start free <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link href="/docs" className={secondary("cream")}>
              Read the docs
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
