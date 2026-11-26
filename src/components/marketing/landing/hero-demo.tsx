"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { Check, Copy, RotateCcw } from "lucide-react";
import { copyToClipboard } from "@/lib/setup-prompt";
import { frameAt, phaseTimes, SAVED_COST, type DemoPhase, type RowStatus } from "./hero-demo-timeline";

const FIX_PROMPT =
  "In support-agent, docs.search returned 0 results for the refund policy, so the model guessed and refund.issue timed out after 5000 ms. Make docs.search fall back to the full policy page when it finds nothing, tell the model to say so instead of guessing, and give refund.issue a 15 second timeout with one retry.";

const RED = "#ff4d3d";

const barColor: Record<RowStatus, string> = {
  idle: "bg-white/10",
  running: "bg-[#f4d44d]",
  ok: "bg-[#eceae3]",
  warn: "bg-[#eceae3]",
  fail: "",
  skipped: "bg-white/10",
};

const PIXELS = "[background-image:repeating-linear-gradient(90deg,transparent_0_3px,rgba(0,0,0,0.4)_3px_4px)]";

type Mode = "idle" | "break" | "broken" | "fix" | "fixed";

/** A self-contained break-it, fix-it loop. No network, same frames every time. */
export const HeroDemo = forwardRef<HTMLDivElement, { onFixed?: () => void }>(function HeroDemo({ onFixed }, outerRef) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.6, once: true });
  const [mode, setMode] = useState<Mode>("idle");
  const [ms, setMs] = useState(0);
  const [copied, setCopied] = useState<"no" | "yes" | "blocked">("no");
  const fixedCb = useRef(onFixed);
  fixedCb.current = onFixed;

  const phase: DemoPhase = mode === "fix" || mode === "fixed" ? "fix" : "break";
  const still = reduce === true;
  const shownMode: Mode = still && mode === "idle" ? "broken" : mode;

  useEffect(() => {
    if (inView && mode === "idle" && !still) {
      setMs(0);
      setMode("break");
    }
  }, [inView, mode, still]);

  useEffect(() => {
    if (mode !== "break" && mode !== "fix") return;
    const { end } = phaseTimes(mode);
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const el = Math.min(end, now - t0);
      setMs(el);
      if (el >= end) {
        setMode(mode === "break" ? "broken" : "fixed");
        if (mode === "fix") fixedCb.current?.();
      } else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode]);

  const at = shownMode === "broken" ? phaseTimes("break").end : shownMode === "fixed" ? phaseTimes("fix").end : ms;
  const frame = frameAt(phase, at);
  const failed = frame.rows.some((r) => r.status === "fail");

  async function copyFix() {
    setCopied((await copyToClipboard(FIX_PROMPT)) ? "yes" : "blocked");
  }

  function rerun() {
    if (still) {
      setMode("fixed");
      fixedCb.current?.();
      return;
    }
    setMs(0);
    setMode("fix");
  }

  function setRefs(node: HTMLDivElement | null) {
    ref.current = node;
    if (typeof outerRef === "function") outerRef(node);
    else if (outerRef) outerRef.current = node;
  }

  return (
    <div
      ref={setRefs}
      id="hero-demo"
      tabIndex={-1}
      aria-label="Demo: an agent run that fails, and the same run after the fix"
      className="grid w-full max-w-[980px] grid-cols-[1fr_300px] border border-white/20 bg-[#090909]/90 text-left font-mono text-white outline-none backdrop-blur-sm focus-visible:border-[#f4d44d]"
    >
      <div className="min-w-0">
        <div className="flex items-center justify-between border-b border-white/15 px-4 py-2.5 text-[9px] uppercase tracking-[0.14em] text-white/55">
          <span>run_9f3a · support-agent</span>
          <span className="flex items-baseline gap-2">
            {frame.costStopped && failed && <span style={{ color: RED }}>stopped</span>}
            <span className="text-[15px] tracking-normal text-white tabular-nums" aria-live="off">${frame.cost.toFixed(2)}</span>
          </span>
        </div>
        <ol className="px-4 py-3">
          {frame.rows.map((row, i) => {
            const visible = row.status !== "idle";
            const isFail = row.status === "fail";
            return (
              <li key={i} className={`grid grid-cols-[104px_1fr_132px] items-center gap-3 py-[5px] text-[11px] transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-25"}`}>
                <span className="truncate" style={isFail ? { color: RED } : undefined}>{row.name}</span>
                <span className="relative h-3 bg-white/[0.04]" aria-hidden="true">
                  <span
                    className={`absolute inset-y-0 origin-left ${PIXELS} ${barColor[row.status]}`}
                    style={{ left: `${row.left}%`, width: `${row.width * row.progress}%`, ...(isFail ? { backgroundColor: RED } : null) }}
                  />
                </span>
                <span className="truncate text-right text-[10px] text-white/50" style={isFail ? { color: RED } : undefined}>{row.detail}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="relative min-h-[196px] overflow-hidden border-l border-white/15">
        <AnimatePresence mode="wait">
          {frame.showCard && failed && (
            <motion.div
              key="broken"
              initial={reduce ? false : { x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 flex flex-col border-l-2 border-[#f4d44d] bg-black p-4"
            >
              <p className="text-[9px] uppercase tracking-[0.14em] text-white/55">What broke</p>
              <p className="mt-2 text-[12px] leading-5">refund.issue timed out, so the run stopped before it could reply.</p>
              <p className="mt-2 text-[11px] leading-5 text-white/60">docs.search found nothing, so the model guessed the refund policy.</p>
              <div className="mt-auto flex flex-col gap-2 pt-3">
                <button
                  type="button"
                  onClick={copyFix}
                  className="inline-flex items-center justify-center gap-2 bg-[#f4d44d] px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] text-black hover:bg-white"
                >
                  {copied === "yes" ? "Copied" : "Copy fix prompt"}
                  {copied === "yes" ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
                </button>
                {copied === "blocked" && (
                  <textarea
                    readOnly
                    value={FIX_PROMPT}
                    autoFocus
                    onFocus={(e) => e.currentTarget.select()}
                    aria-label="Fix prompt"
                    className="h-16 resize-none border border-white/30 bg-black p-2 text-[10px] leading-4 text-white/80"
                  />
                )}
                {copied !== "no" && (
                  <button
                    type="button"
                    onClick={rerun}
                    className="inline-flex items-center justify-center gap-2 border border-white/40 px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] hover:bg-white hover:text-black"
                  >
                    <RotateCcw className="size-3.5" aria-hidden="true" /> Re-run with fix
                  </button>
                )}
              </div>
            </motion.div>
          )}
          {frame.showCard && !failed && (
            <motion.div
              key="fixed"
              initial={reduce ? false : { x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 flex flex-col justify-center border-l-2 border-[#f4d44d] bg-black p-4"
            >
              <p className="font-pixel text-[28px] leading-none tracking-[-0.05em] text-[#f4d44d]">FIXED.</p>
              <p className="mt-2 text-[13px]">Cost -${SAVED_COST.toFixed(2)}.</p>
              <p className="mt-2 text-[11px] leading-5 text-white/60">Every step passed. Set it up on your own agent with the button above.</p>
            </motion.div>
          )}
        </AnimatePresence>
        {!frame.showCard && <p className="p-4 text-[9px] uppercase tracking-[0.14em] text-white/35">Watching the run</p>}
      </div>
      <span className="sr-only" role="status">{shownMode === "broken" ? "The run failed at refund.issue." : shownMode === "fixed" ? "Fixed. Cost down 36 cents." : ""}</span>
    </div>
  );
});
