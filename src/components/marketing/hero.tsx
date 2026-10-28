"use client";

import { appHref } from "@/lib/app-links";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { authClient } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TracePreview } from "@/components/marketing/trace-preview";
import { Typewriter } from "@/components/marketing/typewriter";

// ── Animation Variants ─────────────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: {},
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.23, 1, 0.32, 1]
    },
  },
};

// ── Data ───────────────────────────────────────────────────────────────────

const PROOF_ITEMS = [
  "Python + TypeScript SDKs",
  "Works with any LLM",
  "First span in 5 minutes",
  "Built for production agents",
];

const TYPEWRITER_WORDS = ["takes.", "decides.", "breaks.", "retries.", "costs."];

// ── Main Component ─────────────────────────────────────────────────────────

export function Hero() {
  const { data: session } = authClient.useSession();
  return (
    <section
      className="relative flex items-center overflow-hidden"
      style={{
        minHeight: "calc(100vh - 64px)",
        paddingTop: "64px",
        paddingBottom: "64px",
        backgroundColor: "#050505",
      }}
      aria-labelledby="hero-headline"
    >
      {/* Subtle Monochrome Dot Pattern */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
        style={{
          backgroundImage: "radial-gradient(circle, #1A1A1A 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          opacity: 0.35,
        }}
      />

      <div
        className="relative z-10 mx-auto w-full px-6 md:px-8"
        style={{ maxWidth: "1200px" }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-16 xl:gap-24">

          {/* ── LEFT: Content ────────────────────────────────────────── */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex-1 flex flex-col items-start"
          >
            {/* Eyebrow Badge — Monochrome */}
            <motion.div variants={itemVariants}>
              <Badge
                variant="outline"
                className="mb-8 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] transition-none"
                style={{
                  borderColor: "#3A3A3A",
                  color: "#999999",
                  backgroundColor: "#111111",
                  borderRadius: "0px",
                }}
              >
                Agent Observability Infrastructure
              </Badge>
            </motion.div>

            {/* Headline — Geist Mono + Geist Pixel Typewriter */}
            <motion.h1
              id="hero-headline"
              variants={itemVariants}
              className="font-pixel font-bold text-white mb-6 uppercase flex flex-wrap gap-x-[0.3em]"
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "clamp(44px, 6.5vw, 80px)",
                lineHeight: "1.0",
                letterSpacing: "-0.05em",
              }}
            >
              <span className="whitespace-nowrap">Every step your</span>
              <span className="whitespace-nowrap">
                agent{" "}
                <Typewriter
                  words={TYPEWRITER_WORDS}
                  className="font-pixel inline-block min-w-[2.5em]"
                />
              </span>
            </motion.h1>

            {/* Subheadline — Geist Sans, Monochrome */}
            <motion.p
              variants={itemVariants}
              className="font-sans mb-10"
              style={{
                fontSize: "clamp(16px, 1.8vw, 18px)",
                lineHeight: "1.55",
                color: "#999999",
                maxWidth: "520px",
                letterSpacing: "-0.01em",
              }}
            >
              Uncoil shows what your AI agent did, why it failed, what it cost,
              and what to fix next. Trace every step, tool call, retry, and
              alert across production AI workflows.
            </motion.p>

            {/* CTA Row — Strict Monochrome Button System */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mb-4"
            >
              {!session ? (
                <Link href={appHref("/sign-up")} className="w-full sm:w-auto">
                  <Button
                    variant="default"
                    size="lg"
                    className="h-11 px-8 font-mono text-[13px] w-full sm:w-auto uppercase tracking-wide"
                  >
                    Start free — no credit card
                  </Button>
                </Link>
              ) : null}

              {session ? (
                <Link href={appHref("/dashboard")} className="w-full sm:w-auto">
                  <Button
                    variant="default"
                    size="lg"
                    className="h-11 px-8 font-mono text-[13px] w-full uppercase tracking-wide"
                  >
                    Open Dashboard
                  </Button>
                </Link>
              ) : null}

              <Link href="#workspace-terminal" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-11 px-8 font-mono text-[13px] w-full sm:w-auto uppercase tracking-wide"
                >
                  View live demo →
                </Button>
              </Link>
            </motion.div>

            {/* Microcopy — Monochrome */}
            <motion.p
              variants={itemVariants}
              className="font-mono text-[11px] mb-12 uppercase tracking-tight"
              style={{ color: "#666666" }}
            >
              Install the SDK. Run your agent. Watch spans appear live.
            </motion.p>

            {/* Proof Row — Monochrome */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap items-center gap-y-3"
            >
              {PROOF_ITEMS.map((item, i) => (
                <div key={item} className="flex items-center">
                  {i > 0 && (
                    <div className="mx-4 w-px h-3 bg-[#2A2A2A]" aria-hidden="true" />
                  )}
                  <span className="font-mono text-[11px] text-[#666666] uppercase tracking-widest whitespace-nowrap">
                    {item}
                  </span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* ── RIGHT: Trace Preview (Semantic Color Allowed) ────────── */}
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="show"
            className="flex-1 flex justify-center lg:justify-end w-full"
          >
            <TracePreview />
          </motion.div>

        </div>
      </div>
    </section>
  );
}
