"use client";

import { appHref } from "@/lib/app-links";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight, RotateCcw } from "lucide-react";
import { CoilArt } from "./coil-art";
import { CopyPromptButton, DissolveMark, Sprite } from "./bits";
import { HERO_SESSION, frameAt, totalMs, typed, type Phase, type Step } from "./session";

const TOTAL = totalMs(HERO_SESSION);
const SPIN = ["✶", "✻", "✽", "✻"];

const CAPTION: Record<Phase, string> = {
  setup: "loose pixels · nothing traced yet",
  running: "the run, step by step",
  failed: "knotted at refund.issue",
  explain: "uncoil reads the knot",
  fixing: "running it again",
  passed: "uncoiled",
};

const STATUS: Record<Phase, string> = {
  setup: "connecting",
  running: "running",
  failed: "failed",
  explain: "explaining",
  fixing: "re-running",
  passed: "passed",
};

const noSubscribe = () => () => {};
function frozenFromUrl() {
  const value = Number(new URLSearchParams(window.location.search).get("t"));
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Session clock. `?t=<ms>` freezes the session at that moment, which keeps screenshots repeatable. */
function useSessionClock(active: boolean, reduce: boolean | null) {
  const [t, setT] = useState(0);
  const [run, setRun] = useState(0);
  const frozen = useSyncExternalStore(noSubscribe, frozenFromUrl, () => null);
  // Where the clock resumes when the session scrolls back into view.
  const resumeAt = useRef(0);

  useEffect(() => {
    if (reduce || frozen !== null || !active) return;
    const start = performance.now() - resumeAt.current;
    const id = window.setInterval(() => {
      const next = performance.now() - start;
      resumeAt.current = next;
      setT(next);
      if (next >= TOTAL) window.clearInterval(id);
    }, 40);
    return () => window.clearInterval(id);
  }, [active, reduce, frozen, run]);

  const now = reduce ? TOTAL : (frozen ?? t);
  return {
    now,
    replay: () => {
      resumeAt.current = 0;
      setT(0);
      setRun((r) => r + 1);
    },
  };
}

function SessionLine({ step, progress, live, tick }: { step: Step; progress: number; live: boolean; tick: number }) {
  const reduce = useReducedMotion();
  const enter = reduce ? false : { opacity: 0, y: 6 };
  switch (step.k) {
    case "prompt":
      return (
        <motion.p initial={enter} animate={{ opacity: 1, y: 0 }} className="mt-4 flex gap-3 text-[#eceae3] first:mt-0">
          <span className="text-[#f4d44d]">&gt;</span>
          <span>
            {typed(step.text, progress)}
            {live && <span className="ml-0.5 inline-block h-[1.05em] w-[0.6em] translate-y-[0.15em] animate-pulse bg-[#f4d44d]" />}
          </span>
        </motion.p>
      );
    case "paste":
      return <p className="ml-6 mt-1.5 inline-block bg-white/10 px-2 py-0.5 text-[#eceae3]/70">{step.text}</p>;
    case "tool":
      return (
        <motion.div initial={enter} animate={{ opacity: 1, y: 0 }} className="mt-2.5">
          <p className="flex gap-3">
            <span className={live ? "text-[#f4d44d]" : "text-[#eceae3]"}>{live ? SPIN[tick % SPIN.length] : "⏺"}</span>
            <span className="min-w-0">
              <span className="font-medium text-[#eceae3]">{step.verb}</span>
              <span className="text-[#eceae3]/60">(</span>
              <span className="text-[#eceae3]">{step.arg}</span>
              <span className="text-[#eceae3]/60">)</span>
            </span>
          </p>
          <p className="ml-6 flex gap-2 text-[#eceae3]/55">
            <span>⎿</span>
            <span className="min-w-0">{live ? "Running…" : step.out}</span>
          </p>
        </motion.div>
      );
    case "span": {
      const tone = step.status === "fail" ? "text-[#ff4d3d]" : step.status === "warn" ? "text-[#fff4b5]" : "text-[#eceae3]";
      return (
        <motion.p initial={reduce ? false : { opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className={`ml-6 mt-1 flex items-center gap-3 ${tone}`}>
          <span className="text-[#eceae3]/35">├─</span>
          <span className="shrink-0">{step.name}</span>
          <span aria-hidden="true" className="min-w-4 flex-1 overflow-hidden whitespace-nowrap text-[#eceae3]/20">
            {"·".repeat(80)}
          </span>
          <span className={step.status === "ok" ? "text-[#eceae3]/55" : ""}>{step.meta}</span>
          <Sprite kind={step.status} className={step.status === "ok" ? "text-[#f4d44d]" : ""} />
        </motion.p>
      );
    }
    case "verdict":
      return (
        <motion.p
          initial={reduce ? false : { clipPath: "inset(0 100% 0 0)" }}
          animate={{ clipPath: "inset(0 0% 0 0)" }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className={`ml-6 mt-3 inline-flex items-center gap-3 px-3 py-1.5 font-medium uppercase tracking-[0.08em] text-[#090909] ${step.status === "fail" ? "bg-[#ff4d3d]" : "bg-[#f4d44d]"}`}
        >
          <Sprite kind={step.status === "fail" ? "fail" : "ok"} />
          {step.text}
        </motion.p>
      );
    case "uncoil":
      return (
        <motion.div
          initial={reduce ? false : { opacity: 0, clipPath: "inset(0 0 100% 0)" }}
          animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="ml-6 mt-3 border border-[#f4d44d] bg-[#f4d44d]/[0.06]"
        >
          <p className="flex items-center gap-2.5 border-b border-[#f4d44d]/40 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[#f4d44d]">
            <DissolveMark className="h-2.5 w-auto" loop={false} />
            {step.title}
          </p>
          <p className="px-3 pt-2.5 font-sans text-[15px] leading-6 text-[#eceae3]">{step.body}</p>
          <p className="flex items-center gap-2 px-3 pb-2.5 pt-1.5 text-[#fff4b5]">
            <Sprite kind="ok" /> {step.foot}
          </p>
        </motion.div>
      );
  }
}

export function HeroSession() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.25 });
  const { now, replay } = useSessionClock(inView, reduce);
  const frame = frameAt(HERO_SESSION, now);
  const visible = HERO_SESSION.slice(0, Math.min(HERO_SESSION.length, frame.shown + (frame.done ? 0 : 1)));
  const tick = Math.floor(now / 120);

  return (
    <section ref={ref} className="relative bg-[#eceae3] px-3 pb-10 pt-4 sm:px-5 md:px-8 md:pb-14 md:pt-6" aria-labelledby="terminal-hero-title">
      <div className="mx-auto flex max-w-[1380px] flex-col border-2 border-[#090909] bg-[#090909] text-[#eceae3] shadow-[10px_10px_0_0_#f4d44d] md:shadow-[14px_14px_0_0_#f4d44d] lg:h-[calc(100svh-64px-3.5rem)] lg:min-h-[640px] lg:max-h-[940px]">
        {/* Window bar */}
        <div className="flex items-center justify-between gap-4 border-b border-white/15 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/55">
          <span className="flex items-center gap-2.5 text-[#eceae3]">
            <DissolveMark className="h-3 w-auto" />
            uncoil
          </span>
          <span className="hidden truncate sm:block">claude code — ~/support-agent</span>
          <span className="flex items-center gap-3">
            {frame.done && !reduce && (
              <button type="button" onClick={replay} className="inline-flex items-center gap-1.5 border border-white/25 px-2 py-1 uppercase tracking-[0.16em] text-white/70 hover:bg-white hover:text-black">
                <RotateCcw className="size-3" aria-hidden="true" /> Replay
              </button>
            )}
            <span className="flex items-center gap-2" aria-live="polite">
            <span className={`size-2 ${frame.phase === "failed" ? "bg-[#ff4d3d]" : frame.phase === "passed" ? "bg-[#f4d44d]" : "animate-pulse bg-[#eceae3]"}`} />
            {STATUS[frame.phase]}
            </span>
          </span>
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* The art pane: headline, coil, calls to action */}
          <div className="relative flex min-h-0 flex-col border-white/15 p-5 md:p-8 lg:order-2 lg:border-l">
            <h1 id="terminal-hero-title" className="font-pixel text-[clamp(2.6rem,min(4.6vw,7.6svh),5rem)] leading-[0.88] tracking-[-0.07em]">
              Your agent broke.
              <br />
              <span className="text-[#f4d44d]">Now you know why.</span>
            </h1>
            <p className="mt-4 max-w-[30rem] font-sans text-base leading-7 text-[#eceae3]/70">
              Uncoil traces every step your coding agent ships, finds the one that failed, and hands you a fix prompt to paste back.
            </p>
            <div className="relative mt-4 h-[180px] min-h-0 flex-1 sm:h-[240px] lg:h-auto">
              <CoilArt phase={frame.phase} label={`Pixel coil showing the run: ${CAPTION[frame.phase]}`} />
              <p className="absolute bottom-0 left-0 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                fig. 1 — <span className={frame.phase === "passed" ? "text-[#f4d44d]" : ""}>{CAPTION[frame.phase]}</span>
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <CopyPromptButton />
              <Link href={appHref("/sign-up")} className="group inline-flex min-h-12 items-center gap-3 border border-[#eceae3]/50 px-5 font-mono text-[11px] uppercase tracking-[0.14em] hover:bg-[#eceae3] hover:text-black">
                Start free <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* The transcript: newest line at the bottom, older lines scroll off the top like a real terminal */}
          <div className="relative flex h-[520px] min-h-0 flex-col justify-end overflow-hidden border-t border-white/15 px-4 pb-4 font-mono text-[12px] leading-[1.6] sm:text-[13px] lg:order-1 lg:h-auto lg:border-t-0 lg:px-7 lg:pb-6">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-[#090909] to-transparent" />
            <div className="sr-only">
              Example session: the setup prompt installs Uncoil, the agent runs, refund.issue fails, Uncoil explains why and copies a fix prompt, and the second run passes for less money.
            </div>
            <div aria-hidden="true">
              <div className="mb-6 flex items-center gap-5 border border-white/20 p-4">
                <DissolveMark className="h-12 w-auto shrink-0" loop={false} />
                <div className="min-w-0 text-[11px] leading-5 text-white/50">
                  <p className="text-[13px] text-[#eceae3]">✻ Welcome back</p>
                  <p>cwd: ~/support-agent</p>
                  <p className="truncate">tip: paste the Uncoil setup prompt to start tracing</p>
                </div>
              </div>
              {visible.map((step, i) => (
                <SessionLine key={i} step={step} progress={i < frame.shown ? 1 : frame.progress} live={i === frame.shown && !frame.done} tick={tick} />
              ))}
              {frame.done && (
                <p className="mt-4 flex items-center gap-3">
                  <span className="text-[#f4d44d]">&gt;</span>
                  <span className="inline-block h-[1.05em] w-[0.6em] animate-pulse bg-[#f4d44d]" />
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
