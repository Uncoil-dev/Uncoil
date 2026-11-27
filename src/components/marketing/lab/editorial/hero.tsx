"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowRight } from "lucide-react";
import { appHref } from "@/lib/app-links";
import { CoilArt, FAILED_TURN_X, TURN_COUNT, turnX } from "./coil-art";

const CONTENTS = [
  ["01", "The break", "#break"],
  ["02", "The cost", "#cost"],
  ["03", "The fix", "#fix"],
  ["04", "The setup", "#agent-setup"],
  ["05", "The price", "#price"],
] as const;

const ease = [0.16, 1, 0.3, 1] as const;

export function EditorialHero() {
  const reduce = useReducedMotion();
  const rise = (delay: number) => ({
    initial: reduce ? false : { y: 24, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 0.9, delay, ease },
  });

  return (
    <section className="relative overflow-hidden bg-[#eceae3] px-5 text-[#090909] md:px-10" aria-labelledby="ed-hero-title">
      <div className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-[1320px] flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-black py-3 font-mono text-[10px] uppercase tracking-[0.18em]">
          <span>Uncoil / Field notes</span>
          <span className="hidden md:inline">No. 01 · Agent observability</span>
          <span className="text-right text-black/60">For Claude Code, Cursor &amp; Codex</span>
        </div>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.08fr_1fr] lg:gap-6 lg:py-6">
          <div>
            <motion.h1
              id="ed-hero-title"
              {...rise(0)}
              className="font-pixel text-[clamp(3.6rem,min(8.6vw,15svh),9.25rem)] leading-[0.86] tracking-[-0.075em]"
            >
              Your agent
              <br />
              failed at
              <br />
              <span className="relative inline-block">
                <motion.span
                  aria-hidden="true"
                  className="absolute -inset-x-[0.08em] bottom-[0.02em] top-[0.12em] origin-left bg-[#f4d44d]"
                  initial={reduce ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.7, delay: 0.75, ease }}
                />
                <span className="relative">step 6.</span>
              </span>
            </motion.h1>
            <motion.p {...rise(0.35)} className="mt-8 max-w-[34rem] text-lg leading-8 text-black/75 md:text-xl md:leading-8">
              Uncoil records every step your agent takes. When a run goes wrong you see which step, why, and what it cost, instead of rereading logs and guessing.
            </motion.p>
            <motion.div {...rise(0.5)} className="mt-8 flex flex-wrap gap-3">
              <Link
                href={appHref("/sign-up")}
                className="group inline-flex min-h-13 items-center gap-3 bg-[#090909] px-7 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#eceae3] hover:bg-[#f4d44d] hover:text-black"
              >
                Start free <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
              <a
                href="#agent-setup"
                className="inline-flex min-h-13 items-center gap-3 border-2 border-black px-7 py-4 font-mono text-[11px] uppercase tracking-[0.14em] hover:bg-black hover:text-[#eceae3]"
              >
                Get the setup prompt <ArrowDown className="size-4" aria-hidden="true" />
              </a>
            </motion.div>
          </div>

          <motion.figure
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, delay: 0.2, ease }}
            className="relative lg:-mr-10"
          >
            <div className="relative pt-14">
              <CoilArt />
              <motion.div
                initial={reduce ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.6, duration: 0.6 }}
                className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                style={{ left: `${FAILED_TURN_X}%` }}
              >
                <span className="whitespace-nowrap border border-black bg-[#eceae3] px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em]">
                  <span className="mr-2 inline-block size-2 bg-[#ff4d3d] align-middle" />
                  Step 6 · refund.issue · 502
                </span>
                <span className="h-[clamp(3rem,6.5vw,6rem)] w-px bg-black" />
              </motion.div>
            </div>
            <div className="relative h-5 font-mono text-[10px] tabular-nums text-black/50" aria-hidden="true">
              {Array.from({ length: TURN_COUNT }, (_, i) => (
                <span key={i} className={`absolute top-0 -translate-x-1/2 ${i === 5 ? "font-medium text-[#090909]" : ""}`} style={{ left: `${turnX(i)}%` }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
              ))}
            </div>
            <figcaption className="mt-2 flex justify-between gap-4 border-t border-black/30 pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-black/60">
              <span>Fig. 1 — A run is a coil of steps.</span>
              <span className="hidden sm:inline">Uncoil pulls it straight.</span>
            </figcaption>
          </motion.figure>
        </div>

        <nav aria-label="On this page" className="grid grid-cols-2 border-t border-black sm:grid-cols-5">
          {CONTENTS.map(([n, label, href]) => (
            <a key={n} href={href} className="group flex items-baseline gap-3 border-black py-3 pr-3 font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-black hover:text-[#eceae3] sm:border-l sm:pl-3 sm:first:border-l-0 sm:first:pl-0">
              <span className="text-black/45 group-hover:text-[#f4d44d]">{n}</span>
              {label}
            </a>
          ))}
        </nav>
      </div>
    </section>
  );
}
