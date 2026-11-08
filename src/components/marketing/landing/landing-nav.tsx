"use client";

import { appHref } from "@/lib/app-links";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Menu, X } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { authClient } from "@/lib/auth-client";
import { DitherEmber } from "./dither-ember";

const art = "[image-rendering:pixelated]";

const menus = {
  Product: {
    img: "/images/landing/hero-graph.png",
    feature: { title: "See the full loop.", body: "Trace a run, evaluate the output, compare changes, ship with evidence.", href: appHref("/demo/project"), label: "Open the demo" },
    links: [
      ["Observe", "Traces, sessions and costs", "/product/trace-viewer"],
      ["Improve", "Evaluations, datasets, prompts", "/product/evaluation-engine"],
      ["Release", "Experiments, gates, monitors", "/product/lifecycle"],
      ["Operate", "Alerts, reports, integrations", "/integrations"],
      ["Free tools", "Token counter, price and log checkers", "/tools"],
      ["Live demo", "Explore a sample project", appHref("/demo/project")],
    ],
  },
  Solutions: {
    img: "/images/landing/uc-research.png",
    feature: { title: "When an agent gets it wrong.", body: "Follow a bad answer back to the exact step, tool call and prompt.", href: "/use-cases/support", label: "Explore support" },
    links: [
      ["Support", "Find the decision behind every escalation", "/use-cases/support"],
      ["Research", "Verify multi-step investigations", "/use-cases/research"],
      ["Automation", "Debug workflows and retry chains", "/use-cases/automation"],
      ["Tool calling", "Catch failed APIs and loops", "/use-cases/tool-calling"],
      ["Compare", "Uncoil next to other tools", "/compare"],
      ["Alternatives", "The best LLM observability tools", "/best-llm-observability-tools"],
    ],
  },
  Developers: {
    img: "/images/landing/span-anatomy.png",
    feature: { title: "Your first trace.", body: "Install the SDK, send one run, and open it as a map.", href: "/docs", label: "Open the quickstart" },
    links: [
      ["Docs", "Install and send your first trace", "/docs"],
      ["TypeScript SDK", "Trace Node and Next.js agents", "/docs/typescript"],
      ["Python SDK", "Instrument with a decorator", "/docs/python"],
      ["API reference", "Ingest from custom runtimes", "/docs/api"],
      ["Integrations", "LlamaIndex, AutoGen, Mastra and more", "/integrations"],
      ["Glossary", "Agent tracing terms, explained", "/glossary"],
    ],
  },
  Company: {
    img: "/images/landing/globe-orbits.png",
    feature: { title: "Agent observability, explained.", body: "A field guide to traces, evaluations, cost and prompts.", href: "/blog/ai-agent-observability-complete-guide", label: "Read the guide" },
    links: [
      ["Blog", "Agent engineering notes", "/blog"],
      ["Changelog", "What shipped lately", "/changelog"],
      ["Roadmap", "What is shipping next", "/roadmap"],
      ["Security", "How Uncoil handles data", "/security"],
      ["Status", "Is everything running?", "/status"],
      ["Contact", "Talk through your stack", "/contact"],
    ],
  },
} as const;

type MenuName = keyof typeof menus;
const names = Object.keys(menus) as MenuName[];

function Logo() {
  return (
    <Link href="/" aria-label="Uncoil home" className="flex items-center">
      {/* The official logo file, used as-is */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logos/uncoil/uncoil-logo-on-dark.svg" alt="Uncoil" width={155} height={40} className="block h-10 w-auto max-w-none" />
    </Link>
  );
}

export function LandingNav({ solidAlways = false }: { solidAlways?: boolean }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<MenuName | null>(null);
  const [mobile, setMobile] = useState(false);
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { scrollY } = useScroll();
  const { data: session } = authClient.useSession();

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setSolid(y > 40);
    setHidden(y > 400 && y > prev && !active);
  });

  useEffect(() => {
    document.body.style.overflow = mobile ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobile]);

  const menu = active ? menus[active] : null;

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-50"
        animate={{ y: hidden && !mobile ? -90 : 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onMouseLeave={() => setActive(null)}
      >
        <div className={`border-b transition-colors duration-300 ${solidAlways || solid || active ? "border-white/15 bg-[#090909]/90 backdrop-blur-md" : "border-transparent bg-transparent"}`}>
          <nav className="mx-auto flex h-[64px] max-w-[1440px] items-center justify-between px-5 md:px-8" aria-label="Main">
            <Logo />
            <ul className="hidden h-full items-stretch border-x border-white/15 lg:flex">
              {names.map((name, i) => (
                <li key={name} className="relative border-r border-white/15 last:border-r-0">
                  <button
                    type="button"
                    onMouseEnter={() => setActive(name)}
                    onFocus={() => setActive(name)}
                    onClick={() => setActive(active === name ? null : name)}
                    aria-expanded={active === name}
                    className={`relative flex h-full items-center gap-1.5 px-5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${active === name ? "bg-white/[0.04] text-white" : "text-white/65 hover:text-white"}`}
                  >
                    <span className="text-[#f4d44d]">0{i + 1}</span> / {name}
                    {active === name && <motion.span layoutId="nav-underline" className="absolute inset-x-0 bottom-0 h-0.5 bg-[#f4d44d]" />}
                  </button>
                </li>
              ))}
              <li className="relative">
                <Link href="/pricing" onMouseEnter={() => setActive(null)} className="flex h-full items-center gap-1.5 px-5 font-mono text-[11px] uppercase tracking-[0.14em] text-white/65 hover:text-white">
                  <span className="text-[#f4d44d]">05</span> / Pricing
                </Link>
              </li>
            </ul>
            <div className="flex items-center gap-2">
              {session ? (
                <Link href={appHref("/dashboard")} className="hidden bg-[#f4d44d] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-black hover:bg-white sm:inline-flex">
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/cloud?next=/sign-in" className="hidden px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/75 hover:text-white sm:inline-flex">
                    Sign in
                  </Link>
                  <Link href={appHref("/sign-up")} className="group relative hidden overflow-hidden bg-[#f4d44d] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-black sm:inline-flex">
                    <span className="absolute inset-0 -translate-x-full bg-white transition-transform duration-300 group-hover:translate-x-0" />
                    <span className="relative flex items-center gap-2">
                      Start free <ArrowRight className="size-3.5" aria-hidden="true" />
                    </span>
                  </Link>
                </>
              )}
              <button type="button" onClick={() => setMobile(true)} aria-label="Open menu" className="flex size-10 items-center justify-center border border-white/25 text-white lg:hidden">
                <Menu className="size-5" aria-hidden="true" />
              </button>
            </div>
          </nav>
        </div>

        <AnimatePresence>
          {menu && active && (
            <motion.div
              key="panel"
              initial={reduce ? false : { clipPath: "inset(0 0 100% 0)" }}
              animate={{ clipPath: "inset(0 0 0% 0)" }}
              exit={{ clipPath: "inset(0 0 100% 0)" }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative hidden overflow-hidden border-b border-white/15 bg-[#090909] text-[#eceae3] lg:block"
            >
              <DitherEmber className="!opacity-40" />
              <div className="relative mx-auto grid max-w-[1440px] grid-cols-[1.2fr_1fr] gap-6 px-8 py-8">
                <div className="border border-white/15 bg-[#090909]/90">
                  <div className="flex items-center justify-between border-b border-white/15 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">
                    <span className="flex items-center gap-2">
                      <span className="size-1.5 animate-pulse bg-[#f4d44d]" aria-hidden="true" />
                      trace · uncoil.dev/{active.toLowerCase()}
                    </span>
                    <span>{menu.links.length} steps</span>
                  </div>
                  <motion.div key={active} className="relative grid grid-cols-2 gap-x-6 px-5 pb-5 pt-8" initial="hide" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
                    <div className="pointer-events-none absolute left-5 right-5 top-8 h-px bg-white/20" aria-hidden="true" />
                    {[menu.links.slice(0, 3), menu.links.slice(3)].map((col, c) => (
                      <div key={c} className="relative pl-5">
                        <span className="absolute -left-[3.5px] -top-[3.5px] size-2 bg-white/60" aria-hidden="true" />
                        <span className="absolute bottom-1 left-0 top-0 w-px bg-white/15" aria-hidden="true" />
                        <ul className="grid gap-1 pt-3">
                          {col.map(([t, b, href], j) => (
                            <motion.li key={href} variants={{ hide: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}>
                              <Link href={href} onClick={() => setActive(null)} className="group flex items-start py-2.5">
                                <span className="-ml-5 mr-3 mt-3 h-px w-2.5 shrink-0 bg-white/20 transition-all group-hover:w-4 group-hover:bg-[#f4d44d]" aria-hidden="true" />
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-baseline gap-2">
                                    <span className="font-mono text-[10px] text-[#f4d44d]">0{c * 3 + j + 1}</span>
                                    <span className="font-pixel text-2xl tracking-[-0.05em] transition-colors group-hover:text-[#f4d44d]">{t}</span>
                                  </span>
                                  <span className="mt-0.5 block text-sm text-white/50 group-hover:text-white/75">{b}</span>
                                </span>
                                <ArrowUpRight className="mt-2 size-4 shrink-0 text-[#f4d44d] opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                              </Link>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </motion.div>
                </div>
                <Link href={menu.feature.href} onClick={() => setActive(null)} className="group relative min-h-[260px] overflow-hidden border border-white/15">
                  <AnimatePresence mode="popLayout">
                    <motion.div key={active} className="absolute inset-0" initial={reduce ? false : { opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
                      <Image src={menu.img} alt="" fill unoptimized sizes="40vw" className={`object-cover transition-transform duration-700 group-hover:scale-105 ${art}`} />
                    </motion.div>
                  </AnimatePresence>
                  <div className="absolute inset-0 bg-[linear-gradient(to_top,#090909_0%,rgba(9,9,9,0.7)_40%,rgba(9,9,9,0)_75%)]" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#f4d44d]">Featured</p>
                    <p className="mt-2 font-pixel text-3xl tracking-[-0.05em]">{menu.feature.title}</p>
                    <p className="mt-1 max-w-sm text-sm text-white/60">{menu.feature.body}</p>
                    <span className="mt-4 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#f4d44d]">
                      {menu.feature.label} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <AnimatePresence>
        {mobile && (
          <motion.div
            className="fixed inset-0 z-[60] overflow-y-auto bg-[#090909] text-[#eceae3] lg:hidden"
            initial={reduce ? false : { clipPath: "circle(0% at 100% 0%)" }}
            animate={{ clipPath: "circle(150% at 100% 0%)" }}
            exit={{ clipPath: "circle(0% at 100% 0%)" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <Image src="/images/landing/nav-tunnel.png" alt="" fill unoptimized sizes="100vw" className={`object-cover opacity-20 ${art}`} />
            <DitherEmber className="!opacity-15" />
            <div className="relative flex min-h-full flex-col px-5 pb-10">
              <div className="flex h-[64px] items-center justify-between">
                <Logo />
                <button type="button" onClick={() => setMobile(false)} aria-label="Close menu" className="flex size-10 items-center justify-center bg-[#f4d44d] text-black">
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>
              <motion.div className="mt-8 grid gap-10" initial="hide" animate="show" variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } } }}>
                {names.map((name, i) => (
                  <motion.div key={name} variants={{ hide: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }} className="relative pl-5">
                    <span className="absolute -left-[3.5px] -top-[3.5px] size-2 bg-white/60" aria-hidden="true" />
                    <span className="absolute bottom-1 left-0 top-0 w-px bg-white/15" aria-hidden="true" />
                    <p className="pt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                      <span className="text-[#f4d44d]">0{i + 1}</span> / {name}
                    </p>
                    <ul className="mt-3 grid gap-1">
                      {menus[name].links.map(([t, , href]) => (
                        <li key={href}>
                          <Link href={href} onClick={() => setMobile(false)} className="group flex items-center font-pixel text-4xl tracking-[-0.06em] hover:text-[#f4d44d]">
                            <span className="-ml-5 mr-3 h-px w-3 shrink-0 bg-white/25 group-hover:bg-[#f4d44d]" aria-hidden="true" />
                            {t}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
                <motion.div variants={{ hide: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }} className="grid gap-3 border-t border-white/20 pt-8">
                  <Link href="/pricing" onClick={() => setMobile(false)} className="font-pixel text-4xl tracking-[-0.06em]">
                    <span className="mr-3 font-mono text-[10px] tracking-[0.16em] text-[#f4d44d]">05 /</span>Pricing
                  </Link>
                  <Link href={session ? appHref("/dashboard") : appHref("/sign-up")} onClick={() => setMobile(false)} className="mt-4 flex items-center justify-between bg-[#f4d44d] px-5 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-black">
                    {session ? "Dashboard" : "Start free"} <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                  {!session && (
                    <Link href="/cloud?next=/sign-in" onClick={() => setMobile(false)} className="flex items-center justify-between border border-white/30 px-5 py-4 font-mono text-[11px] uppercase tracking-[0.14em]">
                      Sign in <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  )}
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
