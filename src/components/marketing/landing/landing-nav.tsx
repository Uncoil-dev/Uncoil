"use client";

import { appHref } from "@/lib/app-links";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight, ArrowUpRight, Menu } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { authClient } from "@/lib/auth-client";
import { DitherEmber } from "./dither-ember";
import { traceReachY } from "./trace-reach";
import { NAV_MENUS, NAV_PRICING } from "./nav-links";
import { PhoneMenu } from "./phone-menu/phone-menu";

const art = "[image-rendering:pixelated]";

const menus = NAV_MENUS;

type MenuName = keyof typeof menus;
const names = Object.keys(menus) as MenuName[];

function Logo() {
  return (
    <Link href="/" aria-label="Uncoil home" className="flex items-center">
      {/* Pixel-snapped lockup: 1 logo pixel = 1 screen pixel, so it stays sharp */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logos/uncoil/uncoil-logo-crisp-on-dark.svg" alt="Uncoil" width={204} height={38} className="block h-[38px] w-[204px] max-w-none" />
    </Link>
  );
}

export function LandingNav({ solidAlways = false }: { solidAlways?: boolean }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<MenuName | null>(null);
  const [mobile, setMobile] = useState(false);
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  // The nav item the trace has reached, and the hovered step inside the open menu
  // (x: how far the trace runs along the menu's top line before it drops into the column).
  const [lit, setLit] = useState<{ left: number; width: number } | null>(null);
  const [reach, setReach] = useState<{ col: number; x: number; y: number } | null>(null);
  const { scrollY } = useScroll();
  const { data: session } = authClient.useSession();
  const pathname = usePathname();
  const opener = useRef<HTMLButtonElement>(null);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setSolid(y > 40);
    setHidden(y > 400 && y > prev && !active);
  });

  // The phone menu closes on any navigation (a tap inside it, Back, a link elsewhere) and when
  // the window grows to the desktop layout, where the navbar shows the menus itself.
  const [shownFor, setShownFor] = useState(pathname);
  if (shownFor !== pathname) {
    setShownFor(pathname);
    if (mobile) setMobile(false);
  }
  useEffect(() => {
    if (!mobile) return;
    const desk = window.matchMedia("(min-width: 1024px)");
    const onDesk = () => desk.matches && setMobile(false);
    desk.addEventListener("change", onDesk);
    return () => desk.removeEventListener("change", onDesk);
  }, [mobile]);
  const closeMobile = useCallback(() => {
    setMobile(false);
    requestAnimationFrame(() => opener.current?.focus());
  }, []);

  const menu = active ? menus[active] : null;

  const reachItem = (el: HTMLElement) => {
    const bar = barRef.current?.getBoundingClientRect();
    if (!bar) return;
    const r = el.getBoundingClientRect();
    setLit({ left: r.left - bar.left, width: r.width });
  };

  const reachStep = (c: number, el: HTMLElement) => {
    const col = el.closest<HTMLElement>("[data-trace-col]");
    setReach({ col: c, x: col ? Math.max(0, col.offsetLeft - 20) : 0, y: traceReachY(el) });
  };

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-50"
        animate={{ y: hidden && !mobile ? -90 : 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onMouseLeave={() => {
          setActive(null);
          setLit(null);
          setReach(null);
        }}
      >
        <div ref={barRef} className={`relative border-b transition-colors duration-300 ${solidAlways || solid || active ? "border-white/15 bg-[#090909]/90 backdrop-blur-md" : "border-transparent bg-transparent"}`}>
          {/* The trace: a thin line runs in from the left along the bar, then thickens under the hovered item. */}
          <div className="pointer-events-none absolute inset-x-0 -bottom-px hidden h-0.5 lg:block" aria-hidden="true" style={{ opacity: lit ? 1 : 0, transition: "opacity 300ms" }}>
            <div
              className="absolute bottom-0 left-0 h-px bg-[linear-gradient(to_right,rgba(244,212,77,0),rgba(244,212,77,0.85))] transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
              style={{ width: lit?.left ?? 0 }}
            />
            <div
              className="absolute bottom-0 h-0.5 bg-[#f4d44d] shadow-[0_0_10px_rgba(244,212,77,0.6)] transition-[left,width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
              style={{ left: lit?.left ?? 0, width: lit?.width ?? 0 }}
            />
          </div>
          <nav className="mx-auto flex h-[64px] max-w-[1440px] items-center justify-between px-5 md:px-8" aria-label="Main">
            <Logo />
            <ul className="hidden h-full items-stretch border-x border-white/15 lg:flex">
              {names.map((name, i) => (
                <li key={name} className="relative border-r border-white/15 last:border-r-0">
                  <button
                    type="button"
                    onMouseEnter={(e) => {
                      setActive(name);
                      reachItem(e.currentTarget);
                    }}
                    onFocus={(e) => {
                      setActive(name);
                      reachItem(e.currentTarget);
                    }}
                    onClick={() => setActive(active === name ? null : name)}
                    aria-expanded={active === name}
                    className={`relative flex h-full items-center gap-1.5 px-5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${active === name ? "bg-white/[0.04] text-white" : "text-white/65 hover:text-white"}`}
                  >
                    <span className="text-[#f4d44d]">0{i + 1}</span> / {name}
                  </button>
                </li>
              ))}
              <li className="relative">
                <Link href={NAV_PRICING.href} onMouseEnter={(e) => { setActive(null); reachItem(e.currentTarget); }} onFocus={(e) => { setActive(null); reachItem(e.currentTarget); }} className="flex h-full items-center gap-1.5 px-5 font-mono text-[11px] uppercase tracking-[0.14em] text-white/65 hover:text-white">
                  <span className="text-[#f4d44d]">05</span> / {NAV_PRICING.label}
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
              <button ref={opener} type="button" onClick={() => setMobile(true)} aria-label="Open menu" aria-expanded={mobile} aria-haspopup="dialog" className="flex size-10 items-center justify-center border border-white/25 text-white lg:hidden">
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
                    {/* Hovering the right column lights the top line first, so the trace runs 01-03 → 04-06. */}
                    <div
                      className="pointer-events-none absolute left-5 top-8 h-px bg-[#f4d44d] shadow-[0_0_8px_#f4d44d] transition-[width,opacity] duration-300 ease-out motion-reduce:transition-none"
                      style={{ width: reach?.x ?? 0, opacity: reach && reach.x > 0 ? 1 : 0 }}
                      aria-hidden="true"
                    />
                    {[menu.links.slice(0, 3), menu.links.slice(3)].map((col, c) => (
                      <div key={c} data-trace-col className="relative pl-5" onMouseLeave={() => setReach(null)}>
                        <span className={`absolute -left-[3.5px] -top-[3.5px] size-2 transition-colors ${reach && reach.col >= c ? "bg-[#f4d44d] shadow-[0_0_12px_#f4d44d]" : "bg-white/60"}`} aria-hidden="true" />
                        <span className="absolute bottom-1 left-0 top-0 w-px bg-white/15" aria-hidden="true" />
                        <span
                          className="pointer-events-none absolute left-0 top-0 w-px bg-[#f4d44d] shadow-[0_0_8px_#f4d44d] transition-[height,opacity] duration-300 ease-out motion-reduce:transition-none"
                          style={{ height: reach?.col === c ? reach.y : 0, opacity: reach?.col === c ? 1 : 0 }}
                          aria-hidden="true"
                        />
                        <span
                          className="pointer-events-none absolute -left-[2px] size-[5px] bg-[#f4d44d] transition-[top,opacity] duration-300 ease-out motion-reduce:transition-none"
                          style={{ top: (reach?.col === c ? reach.y : 0) - 2.5, opacity: reach?.col === c ? 1 : 0 }}
                          aria-hidden="true"
                        />
                        <ul className="grid gap-1 pt-3">
                          {col.map(([t, b, href], j) => (
                            <motion.li
                              key={href}
                              variants={{ hide: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}
                              onMouseEnter={(e) => reachStep(c, e.currentTarget)}
                              onFocus={(e) => reachStep(c, e.currentTarget)}
                            >
                              <Link href={href} onClick={() => setActive(null)} className="group flex items-start py-2.5">
                                <span data-trace-tick className="-ml-5 mr-3 mt-3 h-px w-2.5 shrink-0 bg-white/20 transition-all group-hover:w-4 group-hover:bg-[#f4d44d]" aria-hidden="true" />
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

      {mobile && <PhoneMenu currentPath={pathname} signedIn={!!session} onClose={closeMobile} />}
    </>
  );
}
