"use client";

import { appHref } from "@/lib/app-links";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { getCopy, type Locale } from "@/lib/i18n";

const feed = [
  { t: "00.000", kind: "AGENT", name: "support-agent", meta: "run started" },
  { t: "00.012", kind: "LLM", name: "chat", meta: "412 tok · 820 ms" },
  { t: "00.840", kind: "TOOL", name: "order.lookup", meta: "140 ms" },
  { t: "00.851", kind: "TOOL", name: "docs.search", meta: "0 results" },
  { t: "01.170", kind: "LLM", name: "chat · retry", meta: "$0.0187" },
  { t: "02.350", kind: "TOOL", name: "refund.issue", meta: "502 · 5000 ms", fail: true },
] as const;

function LiveFeed() {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(reduce ? feed.length : 1);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setCount((c) => (c >= feed.length + 3 ? 1 : c + 1)), 900);
    return () => window.clearInterval(id);
  }, [reduce]);

  const shown = feed.slice(0, Math.min(count, feed.length));
  return (
    <div className="w-[340px] border border-white/20 bg-[#090909]/90 font-mono text-[11px] text-white backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-white/15 px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-white/55">
        <span>run_9f3a · live</span>
        <span className="flex items-center gap-1.5 text-[#f4d44d]">
          <span className="size-1.5 animate-pulse bg-[#f4d44d]" /> streaming
        </span>
      </div>
      <ul className="h-[168px] px-3 py-2">
        {shown.map((row) => (
          <motion.li
            key={row.name}
            initial={reduce ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className={`grid grid-cols-[48px_44px_1fr] items-center gap-2 py-[5px] ${"fail" in row ? "text-[#f4d44d]" : ""}`}
          >
            <span className="text-white/40">{row.t}</span>
            <span className="text-[9px] tracking-[0.1em] text-white/60">{row.kind}</span>
            <span className="flex justify-between gap-2 truncate">
              <span>{row.name}</span>
              <span className="text-white/45">{row.meta}</span>
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

export function Hero({ locale = "en" }: { locale?: Locale }) {
  const t = getCopy(locale).home;
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 40, damping: 20 });
  const sy = useSpring(my, { stiffness: 40, damping: 20 });
  const bgX = useTransform(sx, (v) => v * -18);
  const bgY = useTransform(sy, (v) => v * -12);
  const cardX = useTransform(sx, (v) => v * 14);
  const cardY = useTransform(sy, (v) => v * 10);

  return (
    <section
      className="relative isolate min-h-[100svh] overflow-hidden bg-[#090909] text-[#eceae3]"
      onPointerMove={(e) => {
        if (reduce) return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
    >
      <motion.div
        className="absolute inset-[-40px] -z-10"
        style={{ x: bgX, y: bgY }}
        initial={reduce ? false : { scale: 1.12, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <Image
          src="/images/landing/hero-graph.png"
          alt=""
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover object-bottom [image-rendering:pixelated]"
        />
      </motion.div>
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,#090909_0%,#090909_38%,rgba(9,9,9,0.75)_58%,rgba(9,9,9,0)_80%)]" />

      <div className="mx-auto flex max-w-[1320px] flex-col items-center px-5 pt-32 text-center md:pt-40">
        <motion.p
          initial={reduce ? false : { y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 border border-white/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/70"
        >
          <span className="bg-[#f4d44d] px-1.5 text-black">{t.badgeNew}</span> {t.badge}
        </motion.p>
        <motion.h1
          initial={reduce ? false : { y: 30 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 max-w-[1100px] font-pixel text-[clamp(3.2rem,10vw,9.5rem)] leading-[0.9] tracking-[-0.07em]"
        >
          {t.heroA} <span className="text-[#f4d44d]">{t.heroB}</span>
        </motion.h1>
        <motion.p
          initial={reduce ? false : { y: 8 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-7 max-w-[620px] text-base leading-7 text-white/70 md:text-lg md:leading-8"
        >
          {t.lede}
        </motion.p>
        <motion.div
          initial={reduce ? false : { y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
          className="mt-9 flex flex-wrap justify-center gap-3"
        >
          <Link href={appHref("/sign-up")} className="group inline-flex min-h-13 items-center gap-3 bg-[#f4d44d] px-7 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-black hover:bg-white">
            {t.ctaPrimary} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
          <Link href={appHref("/demo/project")} className="inline-flex min-h-13 items-center gap-3 border border-white/30 bg-black/40 px-7 py-4 font-mono text-[11px] uppercase tracking-[0.14em] backdrop-blur-sm hover:bg-white hover:text-black">
            {t.ctaSecondary} <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </motion.div>
      </div>

      <motion.div
        style={{ x: cardX, y: cardY }}
        initial={reduce ? false : { opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.8 }}
        className="absolute bottom-10 left-8 hidden lg:block"
      >
        <LiveFeed />
      </motion.div>
      <motion.div
        style={{ x: cardX, y: cardY }}
        initial={reduce ? false : { opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3, duration: 0.8 }}
        className="absolute bottom-14 right-8 hidden w-[280px] border border-[#f4d44d] bg-[#090909]/90 p-4 text-left font-mono backdrop-blur-sm lg:block"
      >
        <p className="flex items-center justify-between text-[9px] uppercase tracking-[0.14em] text-[#f4d44d]">
          <span>Root cause found</span>
          <span className="size-2 animate-ping bg-[#f4d44d]" />
        </p>
        <p className="mt-3 text-sm text-white">docs.search returned 0 results</p>
        <p className="mt-1 text-[11px] leading-5 text-white/55">→ fallback model guessed the policy → refund.issue timed out</p>
      </motion.div>
      <div className="h-[34vh] min-h-[220px] lg:h-[38vh]" aria-hidden="true" />
    </section>
  );
}
