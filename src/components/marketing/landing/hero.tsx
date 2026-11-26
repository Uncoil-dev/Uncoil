"use client";

import { appHref } from "@/lib/app-links";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HeroDemo } from "./hero-demo";
import { Check, Copy } from "lucide-react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { getCopy, type Locale } from "@/lib/i18n";
import { copyToClipboard, setupPrompt } from "@/lib/setup-prompt";

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
  const prompt = setupPrompt();
  const [state, setState] = useState<"idle" | "copied" | "blocked">("idle");
  const fallback = useRef<HTMLTextAreaElement>(null);
  const demo = useRef<HTMLDivElement>(null);
  const [pulse, setPulse] = useState(0);

  // Where the demo card is shown, the secondary link scrolls to it instead of leaving the page.
  function goToDemo(e: React.MouseEvent) {
    const el = demo.current;
    if (!el || el.offsetParent === null) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    el.focus({ preventScroll: true });
  }

  async function copyPrompt() {
    const ok = await copyToClipboard(prompt);
    setState(ok ? "copied" : "blocked");
  }

  useEffect(() => {
    if (state === "blocked") {
      fallback.current?.focus();
      fallback.current?.select();
    }
  }, [state]);

  return (
    <section
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[#090909] text-[#eceae3]"
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
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,#090909_0%,#090909_56%,rgba(9,9,9,0.7)_70%,rgba(9,9,9,0)_88%)]" />

      <div className="mx-auto flex w-full max-w-[1320px] flex-col items-center px-5 pt-28 text-center md:pt-[clamp(5rem,10svh,9rem)]">
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
          className="mt-[clamp(1.25rem,3svh,2rem)] max-w-[1100px] font-pixel text-[clamp(3.2rem,min(10vw,13svh),9.5rem)] leading-[0.9] tracking-[-0.07em]"
        >
          {t.heroA} <span className="block text-[#f4d44d]">{t.heroB}</span>
        </motion.h1>
        <motion.p
          initial={reduce ? false : { y: 8 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-[clamp(1.25rem,3.5svh,2.25rem)] max-w-[640px] text-base leading-7 text-white/70 md:text-lg md:leading-7"
        >
          {t.lede}
        </motion.p>
        <motion.div
          initial={reduce ? false : { y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
          className="mt-[clamp(1.25rem,3.5svh,2.25rem)] flex flex-wrap justify-center gap-3"
        >
          <button
            type="button"
            onClick={copyPrompt}
            className="group relative inline-flex min-h-13 items-center gap-3 bg-[#f4d44d] px-7 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-black hover:bg-white"
          >
            {pulse > 0 && !reduce && (
              <motion.span
                key={pulse}
                aria-hidden="true"
                className="pointer-events-none absolute -inset-1 border-2 border-[#f4d44d]"
                initial={{ opacity: 0.9, scale: 1 }}
                animate={{ opacity: 0, scale: 1.18 }}
                transition={{ duration: 1.1, ease: "easeOut" }}
              />
            )}
            {state === "copied" ? t.ctaCopied : t.ctaPrimary}
            {state === "copied" ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          </button>
          <Link href={appHref("/demo/project")} onClick={goToDemo} className="inline-flex min-h-13 items-center gap-3 border border-white/30 bg-black/40 px-7 py-4 font-mono text-[11px] uppercase tracking-[0.14em] backdrop-blur-sm hover:bg-white hover:text-black">
            {t.ctaSecondary}
          </Link>
        </motion.div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white/55" role="status">
          {state === "blocked" ? t.ctaCopyFailed : t.ctaNote}
        </p>
        {state === "blocked" && (
          <textarea
            ref={fallback}
            readOnly
            value={prompt}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Setup prompt"
            className="mt-3 h-40 w-full max-w-[640px] resize-none border border-white/30 bg-black p-3 text-left font-mono text-[11px] leading-5 text-white/85"
          />
        )}
      </div>

      {/* The demo sits in the flow at the bottom of the screen, so it never pushes the hero past one viewport. */}
      <div className="mx-auto mt-auto hidden w-full max-w-[1440px] justify-center px-8 pb-[clamp(1.5rem,4svh,3rem)] pt-6 lg:flex">
        <motion.div
          style={{ x: cardX, y: cardY }}
          initial={reduce ? false : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.8 }}
          className="flex w-full justify-center"
        >
          <HeroDemo ref={demo} onFixed={() => setPulse((n) => n + 1)} />
        </motion.div>
      </div>
      <div className="h-[30svh] min-h-[200px] lg:hidden" aria-hidden="true" />
    </section>
  );
}
