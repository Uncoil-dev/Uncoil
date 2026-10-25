"use client";

import { appHref } from "@/lib/app-links";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Reveal, Ticker } from "@/components/marketing/landing/reveal";

export const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

export function Button({ href, children, variant = "yellow" }: { href: string; children: ReactNode; variant?: "yellow" | "line" | "ink" }) {
  const base = "group inline-flex items-center gap-3 px-6 py-4 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors";
  const tone = variant === "yellow" ? "bg-[#f4d44d] text-[#090909] hover:bg-[#eceae3]" : variant === "ink" ? "border border-black text-[#090909] hover:bg-[#090909] hover:text-[#f4d44d]" : "border border-white/30 text-[#eceae3] hover:border-[#f4d44d] hover:text-[#f4d44d]";
  return (
    <Link href={href} className={`${base} ${tone}`}>
      {children}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

/* ---------- Hero: four layouts, dithered artwork reveals with a wipe ---------- */

export type HeroVariant = "split" | "full" | "left" | "paper";

export function PageHero({
  eyebrow,
  title,
  lead,
  img,
  facts,
  primary,
  secondary,
  variant = "split",
}: {
  eyebrow: string;
  title: string;
  lead: string;
  img: string;
  facts: readonly (readonly [string, string])[];
  primary: readonly [string, string];
  secondary?: readonly [string, string];
  variant?: HeroVariant;
}) {
  const reduce = useReducedMotion();
  const paper = variant === "paper";
  const long = title.length > 24;
  const size = long ? "text-[clamp(2.9rem,7.4vw,7rem)]" : "text-[clamp(3.6rem,10vw,9.5rem)]";
  const wipeFrom = variant === "left" ? "inset(0 100% 0 0)" : variant === "full" ? "inset(100% 0 0 0)" : "inset(0 0 0 100%)";
  const text = (
    <div className={variant === "left" ? "lg:ml-auto lg:w-[52%]" : variant === "full" ? "max-w-5xl" : ""}>
      <motion.p
        className={`flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] ${paper ? "text-black/60" : "text-[#f4d44d]"}`}
        initial={reduce ? false : { y: 16 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.15, duration: 0.6 }}
      >
        <span className={`size-2 ${paper ? "bg-[#090909]" : "bg-[#f4d44d]"}`} aria-hidden="true" />
        {eyebrow}
      </motion.p>
      <motion.h1
        className={`mt-6 text-balance font-pixel leading-[0.8] tracking-[-0.075em] ${size} ${variant === "full" ? "max-w-[14ch]" : long ? "max-w-[13ch]" : "max-w-[12ch]"}`}
        initial={reduce ? false : { y: 24 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.25, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
      >
        {title}
      </motion.h1>
      <motion.p
        className={`mt-8 max-w-xl text-pretty text-base leading-7 md:text-lg ${paper ? "text-black/70" : "text-[#eceae3]/75"}`}
        initial={reduce ? false : { y: 10 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.55, duration: 0.7 }}
      >
        {lead}
      </motion.p>
      <div className="mt-9 flex flex-wrap gap-3">
        <Button href={primary[1]}>{primary[0]}</Button>
        {secondary ? (
          <Button href={secondary[1]} variant={paper ? "ink" : "line"}>
            {secondary[0]}
          </Button>
        ) : null}
      </div>
    </div>
  );
  const factsRow = (
    <dl className={`mt-14 grid grid-cols-3 border-t pt-6 ${paper ? "border-black/20" : "border-white/15"}`}>
      {facts.map(([k, v]) => (
        <div key={k}>
          <dt className={`font-mono text-[9px] uppercase tracking-[0.16em] ${paper ? "text-black/50" : "text-white/45"}`}>{k}</dt>
          <dd className="mt-2 font-pixel text-2xl tracking-[-0.05em] md:text-4xl">{v}</dd>
        </div>
      ))}
    </dl>
  );
  if (paper) {
    return (
      <header className="bg-[#eceae3] text-[#090909]">
        <div className="mx-auto grid min-h-[88vh] max-w-[1440px] items-center gap-10 px-5 pb-10 pt-16 md:px-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            {text}
            {factsRow}
          </div>
          <motion.div
            className="relative aspect-[4/3] w-full overflow-hidden bg-[#090909]"
            initial={reduce ? false : { clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
          >
            <Image src={img} alt="" fill priority unoptimized sizes="50vw" className="object-cover [image-rendering:pixelated]" />
          </motion.div>
        </div>
      </header>
    );
  }
  const artBox =
    variant === "full"
      ? "inset-0 opacity-60"
      : variant === "left"
        ? "inset-y-0 left-0 w-full opacity-45 lg:w-[56%] lg:opacity-100"
        : "inset-y-0 right-0 w-full opacity-45 lg:w-[56%] lg:opacity-100";
  const fade =
    variant === "full"
      ? "bg-[linear-gradient(to_top,#090909_8%,rgba(9,9,9,0.35)_55%,rgba(9,9,9,0.1)_100%)]"
      : variant === "left"
        ? "bg-[linear-gradient(to_left,#090909_0%,rgba(9,9,9,0.6)_22%,rgba(9,9,9,0)_48%),linear-gradient(to_top,#090909_0%,rgba(9,9,9,0)_25%)]"
        : "bg-[linear-gradient(to_right,#090909_0%,rgba(9,9,9,0.6)_22%,rgba(9,9,9,0)_48%),linear-gradient(to_top,#090909_0%,rgba(9,9,9,0)_25%)]";
  return (
    <header className="relative isolate overflow-hidden bg-[#090909] text-[#eceae3]">
      <motion.div className={`absolute -z-10 ${artBox}`} initial={reduce ? false : { clipPath: wipeFrom }} animate={{ clipPath: "inset(0 0 0 0)" }} transition={{ duration: 1.3, ease: [0.76, 0, 0.24, 1] }}>
        <Image src={img} alt="" fill priority unoptimized sizes="60vw" className={`object-cover [image-rendering:pixelated] ${variant === "left" ? "object-right" : variant === "full" ? "object-center" : "object-left"}`} />
        <div className={`absolute inset-0 ${fade}`} />
      </motion.div>
      <div className="mx-auto flex min-h-[88vh] max-w-[1440px] flex-col justify-end px-5 pb-10 pt-28 md:px-8 md:pb-14">
        {text}
        {factsRow}
      </div>
    </header>
  );
}

export function SignalTicker({ items }: { items: readonly string[] }) {
  return (
    <div className="border-y border-black bg-[#f4d44d] py-5 text-[#090909]">
      <Ticker items={items} />
    </div>
  );
}

/* ---------- Sticky story: a pinned stage driven by scroll position ---------- */

export type StageProps = { p: number; active: number; count: number };

export type StoryLook = { side?: "right" | "left" | "stack"; tone?: "dark" | "yellow" };

export function StickyStory({
  kicker,
  heading,
  steps,
  stage,
  look = {},
}: {
  kicker: string;
  heading: string;
  steps: readonly { title: string; body: string }[];
  stage: (s: StageProps) => ReactNode;
  look?: StoryLook;
}) {
  const { side = "right", tone = "dark" } = look;
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [p, setP] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => setP(Math.round(clamp(v) * 400) / 400));
  const n = steps.length;
  const eff = reduce ? 1 : p;
  const active = Math.min(n - 1, Math.floor(eff * n));
  const yellow = tone === "yellow";
  const stack = side === "stack";
  const jump = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + span * ((i + 0.5) / n), behavior: reduce ? "auto" : "smooth" });
  };
  const frame = yellow ? "border-black" : "border-white/15";
  return (
    <section className={yellow ? "bg-[#f4d44d] text-[#090909]" : "bg-[#090909] text-[#eceae3]"}>
      <div ref={ref} style={{ height: reduce ? "auto" : `${n * 50 + 40}vh` }} className="relative">
        <div className={reduce ? "py-20" : "sticky top-0 flex h-screen items-center overflow-hidden"}>
          <div className={`mx-auto grid w-full max-w-[1440px] gap-6 px-5 pt-16 md:px-8 lg:gap-14 lg:pt-12 ${stack ? "" : side === "left" ? "lg:grid-cols-[1.2fr_0.8fr]" : "lg:grid-cols-[0.8fr_1.2fr]"}`}>
            <div className={`flex flex-col justify-center ${side === "left" ? "lg:order-2" : ""} ${stack ? "lg:grid lg:grid-cols-[0.8fr_1.2fr] lg:gap-14" : ""}`}>
              <div>
                <p className={`font-mono text-[10px] uppercase tracking-[0.18em] ${yellow ? "text-black/60" : "text-[#f4d44d]"}`}>{kicker}</p>
                <h2 className="mt-4 font-pixel text-[clamp(2rem,4.4vw,4rem)] leading-[0.9] tracking-[-0.06em]">{heading}</h2>
              </div>
              <ol className="mt-6 space-y-1 lg:mt-0 lg:self-end">
                {steps.map((s, i) => (
                  <li key={s.title} className={`border-l-2 pl-4 transition-colors duration-300 ${i === active ? (yellow ? "border-black" : "border-[#f4d44d]") : yellow ? "border-black/20" : "border-white/15"}`}>
                    <button type="button" onClick={() => jump(i)} aria-current={i === active ? "step" : undefined} className={`block w-full py-1 text-left font-mono text-[11px] uppercase tracking-[0.14em] transition-colors hover:opacity-100 ${i === active ? "" : yellow ? "text-black/45" : "text-white/40"}`}>
                      <span className={`mr-3 ${yellow ? "text-black/60" : "text-[#f4d44d]/80"}`}>0{i + 1}</span>
                      {s.title}
                    </button>
                    <div className={`grid transition-all duration-500 ${i === active || reduce ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                      <p className={`overflow-hidden text-sm leading-6 ${yellow ? "text-black/70" : "text-white/65"}`}>
                        <span className="block pb-3 pt-1">{s.body}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className={`mt-5 hidden h-px lg:col-span-2 lg:block ${yellow ? "bg-black/20" : "bg-white/15"}`} aria-hidden="true">
                <div className={`h-full origin-left ${yellow ? "bg-black" : "bg-[#f4d44d]"}`} style={{ transform: `scaleX(${eff})` }} />
              </div>
            </div>
            <div className={`border bg-[#eceae3] p-4 text-[#090909] md:p-7 ${frame} ${stack ? "min-h-[260px] lg:min-h-[340px]" : "min-h-[300px] lg:min-h-[520px]"}`}>{stage({ p: eff, active, count: n })}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Art band: artwork drifts as you scroll past ---------- */

export function ArtBand({ img, label, statement, aside, points, flip, dark }: { img: string; label: string; statement: string; aside: string; points?: readonly string[]; flip?: boolean; dark?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  return (
    <section ref={ref} className={`px-5 py-24 md:px-8 md:py-32 ${dark ? "bg-[#090909] text-[#eceae3]" : "bg-[#eceae3] text-[#090909]"}`}>
      <div className="mx-auto grid max-w-[1440px] items-center gap-10 lg:grid-cols-2 lg:gap-20">
        <div className={`relative aspect-[4/3] overflow-hidden ${dark ? "border border-white/15 bg-[#090909]" : "bg-[#090909]"} ${flip ? "lg:order-2" : ""}`}>
          <motion.div style={{ y }} className="absolute -inset-[10%]">
            <Image src={img} alt="" fill unoptimized sizes="50vw" className="object-cover [image-rendering:pixelated]" />
          </motion.div>
        </div>
        <Reveal>
          <p className={`font-mono text-[10px] uppercase tracking-[0.18em] ${dark ? "text-white/50" : "text-black/50"}`}>{label}</p>
          <p className="mt-6 font-pixel text-[clamp(2.2rem,4.6vw,4.4rem)] leading-[0.92] tracking-[-0.06em]">{statement}</p>
          <p className={`mt-6 max-w-lg text-base leading-7 ${dark ? "text-white/65" : "text-black/62"}`}>{aside}</p>
          {points ? (
            <ul className="mt-8 space-y-2 font-mono text-[11px] uppercase tracking-[0.1em]">
              {points.map((t) => (
                <li key={t} className="flex gap-3 border-t border-black/20 pt-2">
                  <span className="mt-1 size-2 shrink-0 bg-[#090909]" />
                  {t}
                </li>
              ))}
            </ul>
          ) : null}
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Capability cards ---------- */

export type CapsVariant = "cards" | "rows" | "sticky";

export function CapabilityGrid({ heading, items, variant = "cards" }: { heading: string; items: readonly { title: string; body: string }[]; variant?: CapsVariant }) {
  if (variant === "sticky") {
    return (
      <section className="bg-[#eceae3] px-5 py-24 text-[#090909] md:px-8 md:py-32">
        <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">What you get</p>
            <h2 className="mt-4 font-pixel text-[clamp(2.4rem,5vw,4.6rem)] leading-[0.9] tracking-[-0.06em]">{heading}</h2>
          </div>
          <div className="space-y-4">
            {items.map((d, i) => (
              <Reveal key={d.title} className={`p-7 md:p-9 ${i % 2 ? "bg-[#f4d44d]" : "bg-[#090909] text-[#eceae3]"}`}>
                <div className="flex items-start justify-between gap-6">
                  <h3 className="font-pixel text-3xl leading-none tracking-[-0.05em] md:text-4xl">{d.title}</h3>
                  <span className="font-mono text-[10px] opacity-50">0{i + 1}</span>
                </div>
                <p className={`mt-4 max-w-xl text-sm leading-6 ${i % 2 ? "text-black/75" : "text-white/65"}`}>{d.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    );
  }
  if (variant === "rows") {
    return (
      <section className="bg-[#090909] px-5 py-24 text-[#eceae3] md:px-8 md:py-32">
        <div className="mx-auto max-w-[1440px]">
          <Reveal>
            <h2 className="max-w-3xl font-pixel text-[clamp(2.4rem,5vw,4.6rem)] leading-[0.9] tracking-[-0.06em]">{heading}</h2>
          </Reveal>
          <div className="mt-14 border-t border-white/20">
            {items.map((d, i) => (
              <Reveal key={d.title} delay={i * 0.05} className="group grid gap-4 border-b border-white/20 px-2 py-8 transition-colors duration-300 hover:bg-[#f4d44d] hover:text-[#090909] md:grid-cols-[90px_1fr_1.2fr] md:items-baseline md:px-6">
                <span className="font-pixel text-4xl tracking-[-0.06em] text-white/25 transition-colors group-hover:text-black/40">0{i + 1}</span>
                <h3 className="font-pixel text-3xl leading-none tracking-[-0.05em] md:text-4xl">{d.title}</h3>
                <p className="max-w-xl text-sm leading-6 text-white/60 transition-colors group-hover:text-black/75">{d.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="bg-[#090909] px-5 py-24 text-[#eceae3] md:px-8 md:py-32">
      <div className="mx-auto max-w-[1440px]">
        <Reveal>
          <h2 className="max-w-3xl font-pixel text-[clamp(2.4rem,5vw,4.6rem)] leading-[0.9] tracking-[-0.06em]">{heading}</h2>
        </Reveal>
        <div className="mt-14 grid gap-px bg-white/15 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((d, i) => (
            <Reveal key={d.title} delay={i * 0.08} className="group relative bg-[#090909] p-7 transition-colors duration-300 hover:bg-[#f4d44d] hover:text-[#090909] md:p-8">
              <span className="font-pixel text-5xl tracking-[-0.06em] text-white/20 transition-colors group-hover:text-black/30">0{i + 1}</span>
              <h3 className="mt-16 font-mono text-[12px] uppercase tracking-[0.14em]">{d.title}</h3>
              <p className="mt-4 text-sm leading-6 text-white/60 transition-colors group-hover:text-black/75">{d.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Faq({ items }: { items: readonly { q: string; a: string }[] }) {
  return (
    <section className="bg-[#eceae3] px-5 py-24 text-[#090909] md:px-8 md:py-32">
      <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[0.7fr_1.3fr]">
        <h2 className="font-pixel text-[clamp(2.4rem,5vw,4.6rem)] leading-[0.9] tracking-[-0.06em]">Questions people ask.</h2>
        <div className="divide-y divide-black border-y border-black">
          {items.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-mono text-[12px] uppercase tracking-[0.1em] marker:content-none">
                {f.q}
                <Plus className="size-4 shrink-0 transition-transform group-open:rotate-45" />
              </summary>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-black/65">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function EndCta({ heading, links }: { heading: string; links: readonly (readonly [string, string])[] }) {
  return (
    <section className="relative isolate overflow-hidden bg-[#090909] px-5 py-24 text-[#eceae3] md:px-8 md:py-36">
      <Image src="/images/landing/nav-tunnel.png" alt="" fill unoptimized sizes="100vw" className="-z-10 object-cover object-center opacity-40 [image-rendering:pixelated]" />
      <div className="mx-auto max-w-[1440px]">
        <Reveal>
          <p className="max-w-5xl font-pixel text-[clamp(3rem,8vw,7.4rem)] leading-[0.84] tracking-[-0.07em]">{heading}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button href={appHref("/sign-up")}>Start tracing free</Button>
            <Button href="/docs" variant="line">
              Read the docs
            </Button>
          </div>
        </Reveal>
        <div className="mt-20 grid gap-px bg-white/15 sm:grid-cols-2 lg:grid-cols-4">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="group flex items-center justify-between bg-[#090909]/90 p-6 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors hover:bg-[#f4d44d] hover:text-[#090909]">
              {label}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
