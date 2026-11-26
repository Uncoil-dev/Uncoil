"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { motion, useInView } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { LEGS, ROBOT_TOP } from "../pixel-world/pixels";
import { ManualCopy, useCopy } from "./copy-prompt";
import { Eyebrow } from "./eyebrow";
import { promptLines } from "./story";
import { AGENTS, BY_HAND, promptFor, type Agent } from "./prompt";
import { AFTER_EYEBROW, BODY, DUR, EASE, H2, LABEL, SECTION, WRAP } from "./ui";
import { useCalm } from "./use-calm";

type Line = { k: "you" | "run" | "ok"; text: string; meta?: string };

const replayFor = (agent: Agent): Line[] => [
  { k: "you", text: "Set up Uncoil tracing in this project", meta: agent },
  { k: "run", text: "npm install @uncoil.dev/sdk" },
  { k: "run", text: "npx @uncoil.dev/sdk login", meta: "opening browser" },
  { k: "ok", text: "Signed in · connected to support-agent" },
  { k: "run", text: "init() added to src/index.ts" },
  { k: "run", text: "npx @uncoil.dev/sdk doctor", meta: "key ok · project ok" },
  { k: "ok", text: "First trace sent" },
];
const LINES = replayFor("Claude Code").length;
/** Ticks the replay holds on each of its last two beats before it starts over. */
const HOLD = 5;

/** The three stops of the walk, and which replay tick reaches each. */
const STOPS = [
  { label: "Paste the prompt", at: 0 },
  { label: "First trace lands", at: LINES + 1 },
  { label: "Next failure comes marked", at: LINES + 1 + HOLD },
] as const;
const stageAt = (tick: number) => (tick >= STOPS[2].at ? 2 : tick >= STOPS[1].at ? 1 : 0);

const BARS = [
  { name: "support-agent", left: 0, width: 100 },
  { name: "llm.chat", left: 2, width: 22 },
  { name: "docs.search", left: 26, width: 10, cause: true },
  { name: "llm.chat", left: 38, width: 30 },
  { name: "refund.issue", left: 70, width: 30, failed: true },
] as const;

function cells(rows: readonly string[], ch: string) {
  let d = "";
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === ch) d += `M${x} ${y}h1v1h-1z`;
  });
  return d;
}

/** The robot from the hero, inked for the cream page. */
function Robot({ frame }: { frame: number }) {
  const body = [...ROBOT_TOP, ...LEGS[frame % 4]];
  return (
    <svg viewBox="0 0 10 13" shapeRendering="crispEdges" className="h-[52px] w-10" aria-hidden="true">
      <path d={cells(body, "C")} fill="#090909" />
      <path d={cells(body, "Y")} fill="#f4d44d" />
    </svg>
  );
}

/** A short walk across the top of the setup panel: three stops, the robot moving with the replay. */
function Walk({ stage, moving }: { stage: number; moving: boolean }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!moving) return;
    const id = window.setInterval(() => setFrame((f) => f + 1), 140);
    return () => window.clearInterval(id);
  }, [moving]);
  const pos = ["8%", "50%", "92%"][stage];
  return (
    <div className="relative" aria-hidden="true">
      <div className="relative h-16">
        <motion.div className="absolute bottom-1 -translate-x-1/2" animate={{ left: pos }} transition={{ duration: 1.2, ease: EASE }} style={{ left: pos }}>
          <Robot frame={moving ? frame : 0} />
        </motion.div>
      </div>
      <div className="h-1 bg-[#090909] [background-image:repeating-linear-gradient(90deg,#090909_0_22px,#eceae3_22px_24px)]" />
      <ol className="grid grid-cols-3">
        {STOPS.map((s, i) => (
          <li key={s.label} className={`flex flex-col gap-1 pt-2 ${i === 0 ? "items-start" : i === 1 ? "items-center text-center" : "items-end text-right"}`}>
            <span className={`grid h-6 min-w-8 place-items-center px-1 font-mono text-[11px] ${i <= stage ? "bg-[#090909] text-[#f4d44d]" : "border border-black/40 text-black/50"}`}>{String(i + 1).padStart(2, "0")}</span>
            <span className={`${LABEL} ${i <= stage ? "text-black" : "text-black/45"}`}>{s.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** What the coding agent does with the prompt, replayed as an example session ending in a first trace. */
function Replay({ agent, tick, calm }: { agent: Agent; tick: number; calm: boolean }) {
  const lines = replayFor(agent);
  const traced = tick > lines.length;
  const marked = stageAt(tick) === 2;
  return (
    <div className="flex h-full min-h-[22rem] min-w-0 flex-col font-mono text-[12px]" aria-label={`Example of what ${agent} does with the prompt`}>
      <div className="flex items-center justify-between border-b border-[#eceae3]/20 px-4 py-3 text-[9px] uppercase tracking-[0.16em] text-[#eceae3]/55">
        <span>{agent} · your project · example</span>
        <span className={traced ? "text-[#f4d44d]" : ""}>{marked ? "failure marked" : traced ? "trace in" : "setting up"}</span>
      </div>
      <ul className="space-y-2.5 px-4 py-4" aria-hidden="true">
        {lines.slice(0, Math.min(tick, lines.length)).map((line, i) => (
          <motion.li key={`${agent}-${i}`} initial={calm ? false : { opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: DUR.fast, ease: EASE }} className="flex items-baseline gap-3">
            <span className={`w-3 shrink-0 ${line.k === "ok" ? "text-[#f4d44d]" : "text-[#eceae3]/40"}`}>{line.k === "you" ? ">" : line.k === "ok" ? "✓" : "$"}</span>
            <span className={`min-w-0 flex-1 truncate ${line.k === "run" ? "text-[#eceae3]/75" : "text-[#eceae3]"}`}>{line.text}</span>
            {line.meta && <span className="hidden shrink-0 text-[10px] text-[#eceae3]/40 sm:inline">{line.meta}</span>}
          </motion.li>
        ))}
        {!traced && <li className="ml-6 h-4 w-2 animate-pulse bg-[#f4d44d]" />}
      </ul>
      <div className="mt-auto border-t border-[#eceae3]/20 px-4 py-4">
        <p className="mb-3 text-[9px] uppercase tracking-[0.16em] text-[#eceae3]/45">{marked ? "A later run · failed · cause marked" : "Your first trace"}</p>
        <div className="space-y-2">
          {BARS.map((bar, i) => {
            const show = traced && (marked || !("failed" in bar));
            const tone = marked && "failed" in bar ? "bg-[#ff4d3d]" : marked && "cause" in bar ? "bg-[#f4d44d] outline outline-2 outline-offset-1 outline-[#f4d44d]" : "bg-[#eceae3]/80";
            return (
              <div key={i} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3">
                <span className={`truncate text-[10px] ${marked && "cause" in bar ? "text-[#f4d44d]" : "text-[#eceae3]/60"}`}>{bar.name}</span>
                <div className="relative h-3">
                  <motion.div
                    className={`absolute inset-y-0 origin-left ${tone}`}
                    style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
                    initial={false}
                    animate={{ scaleX: show ? 1 : 0, opacity: show ? 1 : 0.15 }}
                    transition={{ duration: calm ? 0 : 0.45, delay: calm ? 0 : i * 0.08 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const TABS = [...AGENTS, "By hand"] as const;
type Tab = (typeof TABS)[number];

function ByHand() {
  const [lang, setLang] = useState<(typeof BY_HAND)[number]["id"]>("ts");
  const { done, manual, copy, closeManual } = useCopy();
  const m = BY_HAND.find((b) => b.id === lang)!;
  const block = (id: "shell" | "code", text: string, body: ReactNode, label: string) => (
    <div className="relative border-b border-[#eceae3]/15 last:border-b-0">
      <pre className="overflow-x-auto p-4 pr-14 font-mono text-[12px] leading-6"><code>{body}</code></pre>
      <button type="button" onClick={() => copy(id, text)} aria-label={label} className="absolute right-0 top-0 grid size-12 place-items-center hover:bg-[#f4d44d] hover:text-black focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#f4d44d]">
        {done === id ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
      </button>
      {manual === id && <ManualCopy text={text} onClose={closeManual} className="right-0 top-12" />}
    </div>
  );
  return (
    <div className="min-w-0 lg:col-span-2">
      <div className={`flex flex-wrap items-center border-b border-[#eceae3]/15 ${LABEL}`}>
        {BY_HAND.map((b) => (
          <button key={b.id} type="button" aria-pressed={lang === b.id} onClick={() => setLang(b.id)} className={`min-h-11 px-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#f4d44d] ${lang === b.id ? "bg-[#eceae3] text-black" : "text-[#eceae3]/55 hover:text-[#eceae3]"}`}>
            {b.label}
          </button>
        ))}
        <span className="px-4 py-3 text-[#eceae3]/45">{m.note}</span>
      </div>
      {block("shell", m.shell, m.shell.split("\n").map((l) => <span key={l} className="block"><span className="select-none text-[#f4d44d]/70">$ </span>{l}</span>), "Copy install commands")}
      {block("code", m.code, m.code, "Copy code")}
      <span className="sr-only" role="status">{done ? "Copied" : ""}</span>
    </div>
  );
}

export function Setup() {
  const calm = useCalm();
  const [tab, setTab] = useState<Tab>("Claude Code");
  const agent: Agent = tab === "By hand" ? "Claude Code" : tab;
  const { done, manual, copy, closeManual } = useCopy();
  const prompt = promptFor(agent);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const [tick, setTick] = useState(0);
  const end = STOPS[2].at + HOLD;

  useEffect(() => {
    if (calm || !inView) return;
    const id = window.setInterval(() => setTick((s) => (s >= end ? 0 : s + 1)), 650);
    return () => window.clearInterval(id);
  }, [calm, inView, end]);
  const at = calm ? STOPS[1].at : tick;
  const stage = stageAt(at);
  const moving = !calm && [STOPS[1].at, STOPS[1].at + 1, STOPS[2].at, STOPS[2].at + 1, 0, 1].includes(at);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const n = (next + TABS.length) % TABS.length;
    setTab(TABS[n]);
    setTick(0);
    tabRefs.current[n]?.focus();
  };

  return (
    <section id="pw-setup" className={`scroll-mt-16 bg-[#eceae3] text-[#090909] ${SECTION}`} aria-labelledby="mix-setup-title">
      <div className={WRAP}>
        <Eyebrow n="06" on="cream">Setup</Eyebrow>
        <div className={`${AFTER_EYEBROW} grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-end`}>
          <h2 id="mix-setup-title" className={H2}>One prompt sets it up.</h2>
          <p className={`max-w-md text-black/75 ${BODY}`}>Paste it into your coding agent. It installs Uncoil, signs you in in the browser and sends a first trace. About five minutes, start to finish.</p>
        </div>

        <div ref={ref} className="mt-10 md:mt-12">
          <Walk stage={stage} moving={moving} />
          <div className="mt-6 border-2 border-black bg-[#090909] text-[#eceae3]">
            <div role="tablist" aria-label="How to set it up" className="grid grid-cols-2 border-b-2 border-black font-mono text-[10px] uppercase tracking-[0.12em] sm:grid-cols-4 sm:text-[11px]">
              {TABS.map((a, i) => (
                <button
                  key={a}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`setup-tab-${i}`}
                  aria-selected={tab === a}
                  aria-controls="setup-panel"
                  tabIndex={tab === a ? 0 : -1}
                  onClick={() => {
                    setTab(a);
                    setTick(0);
                  }}
                  onKeyDown={(e) => onKey(e, i)}
                  className={`relative min-h-12 px-2 py-3 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#f4d44d] ${tab === a ? "bg-[#eceae3] text-black" : "text-[#eceae3]/60 hover:bg-[#eceae3]/10 hover:text-[#eceae3]"}`}
                >
                  {a}
                  {tab === a && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-[#f4d44d]" />}
                </button>
              ))}
            </div>
            <div id="setup-panel" role="tabpanel" aria-labelledby={`setup-tab-${TABS.indexOf(tab)}`} className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              {tab === "By hand" ? (
                <ByHand />
              ) : (
                <>
                  <div className="relative flex min-w-0 flex-col border-b-2 border-black lg:border-b-0 lg:border-r-2">
                    <div className="p-5 font-mono text-[12px] leading-6 text-[#eceae3]/85 md:p-6">
                      {promptLines(prompt).map(({ num, text }, i) =>
                        num ? (
                          <p key={i} className="grid grid-cols-[1.5rem_minmax(0,1fr)]">
                            <span className="text-[#f4d44d]">{num}.</span>
                            <span>{text}</span>
                          </p>
                        ) : text ? (
                          <p key={i}>{text}</p>
                        ) : (
                          <span key={i} className="block h-3" aria-hidden="true" />
                        ),
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => copy("prompt", prompt)}
                      className="group mt-auto flex w-full items-center justify-between gap-4 bg-[#f4d44d] px-5 py-5 text-left font-mono text-black transition-colors hover:bg-[#fff4b5] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#090909] md:px-6"
                    >
                      <span className="min-w-0">
                        <span className="block text-[13px] uppercase tracking-[0.14em] md:text-[15px]">{done === "prompt" ? `Copied. Paste it in ${agent}` : "Copy setup prompt"}</span>
                        <span className="mt-1 block text-[10px] uppercase tracking-[0.12em] text-black/60">Sign in when the browser opens. No account? Make one there.</span>
                      </span>
                      <span className="grid size-12 shrink-0 place-items-center bg-black text-[#f4d44d]">
                        {done === "prompt" ? <Check className="size-5" aria-hidden="true" /> : <Copy className="size-5" aria-hidden="true" />}
                      </span>
                    </button>
                    {manual === "prompt" && <ManualCopy text={prompt} onClose={closeManual} className="bottom-full left-0 mb-2" />}
                    <span className="sr-only" role="status">{done === "prompt" ? "Prompt copied" : ""}</span>
                  </div>
                  <Replay key={agent} agent={agent} tick={at} calm={calm} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
