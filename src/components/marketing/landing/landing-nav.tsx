"use client";

import { appHref } from "@/lib/app-links";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { authClient } from "@/lib/auth-client";
import { useCell } from "@/components/marketing/home/use-grid";
import { NAV_MENUS, NAV_PRICING } from "./nav-links";
import { PhoneMenu } from "./phone-menu/phone-menu";
import { buildTrace, findHere } from "./phone-menu/trace";
import { ChromeScene } from "./chrome-scene";
import { deviceShift, waterfallBar } from "./chrome-layout";
import s from "./landing-nav.module.css";

const menus = NAV_MENUS;
type MenuName = keyof typeof menus;
const names = Object.keys(menus) as MenuName[];
const { sections: SECTIONS, total: PAGES } = buildTrace();
const MARKS = SECTIONS.map((x) => x.start);

const mono = "font-mono uppercase tracking-[0.14em]";
// One focus ring for the whole bar: yellow on black, drawn inside so nothing clips it.
const ring = "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-[-2px] focus-visible:outline-[#f4d44d]";

/**
 * The Dissolve lockup at one logo pixel per CSS pixel, so it stays sharp. Between 1024 and 1179px
 * wide the bar shows only its three bars, which frees the room the menu needs there.
 */
function Logo() {
  return (
    <Link href="/" aria-label="Uncoil home" className={`flex h-11 shrink-0 items-center ${ring} outline-offset-4`}>
      <span className="block w-[204px] overflow-hidden lg:max-[1179px]:w-[46px]">
        <Image src="/logos/uncoil/uncoil-logo-crisp-on-dark.svg" alt="Uncoil" width={204} height={38} unoptimized loading="eager" className="block h-[38px] w-[204px] max-w-none" />
      </span>
    </Link>
  );
}

/** A 5x3 pixel caret at two CSS px per pixel; turns to point up while its menu is open. */
function Caret({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 5 3" width={10} height={6} shapeRendering="crispEdges" className={`${s.caret} shrink-0 ${open ? "rotate-180" : ""}`} aria-hidden="true">
      <rect x="0" y="0" width="5" height="1" fill="currentColor" />
      <rect x="1" y="1" width="3" height="1" fill="currentColor" />
      <rect x="2" y="2" width="1" height="1" fill="currentColor" />
    </svg>
  );
}

/** The menu button's icon: three bars stepping in, like the logo's and a trace's spans. */
function BarsIcon() {
  return (
    <svg viewBox="0 0 10 10" width={20} height={20} shapeRendering="crispEdges" aria-hidden="true">
      <rect x="0" y="1" width="10" height="2" fill="currentColor" />
      <rect x="3" y="4" width="7" height="2" fill="#f4d44d" />
      <rect x="5" y="7" width="5" height="2" fill="currentColor" />
    </svg>
  );
}

export function LandingNav({ solidAlways = false }: { solidAlways?: boolean }) {
  const [active, setActive] = useState<MenuName | null>(null);
  const [swap, setSwap] = useState(false);
  const [point, setPoint] = useState<number | null>(null);
  const [mobile, setMobile] = useState(false);
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { scrollY } = useScroll();
  const { data: session } = authClient.useSession();
  const pathname = usePathname();
  const cell = useCell();
  const opener = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const triggers = useRef<Partial<Record<MenuName, HTMLButtonElement | null>>>({});
  const pricing = useRef<HTMLAnchorElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const hoverAt = useRef(0);
  const leaveTimer = useRef<number | undefined>(undefined);
  const here = findHere(SECTIONS, pathname);

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
    if (active) setActive(null);
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

  const open = (name: MenuName | null) => {
    setSwap(active !== null && name !== null);
    setActive(name);
    setPoint(null);
  };
  const close = (focusTrigger = false) => {
    const was = active;
    open(null);
    if (focusTrigger && was) triggers.current[was]?.focus();
  };

  // Everything Tab and the arrow keys move between, in bar order.
  const tops = () => [...names.map((n) => triggers.current[n] ?? null), pricing.current].filter((el): el is HTMLButtonElement | HTMLAnchorElement => !!el);
  const panelLinks = () => [...(panel.current?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? [])];

  const onTriggerKey = (name: MenuName, e: KeyboardEvent<HTMLButtonElement>) => {
    const list = tops();
    const at = list.indexOf(e.currentTarget);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      open(name);
      requestAnimationFrame(() => panelLinks()[0]?.focus());
    } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      list[(at + (e.key === "ArrowRight" ? 1 : list.length - 1)) % list.length]?.focus();
    } else if (e.key === "Escape" && active) {
      e.preventDefault();
      close(true);
    } else if (e.key === "Tab" && !e.shiftKey && active === name) {
      // The open panel's links come right after its button in the reading order.
      const first = panelLinks()[0];
      if (first) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const onPanelKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!active) return;
    const links = panelLinks();
    const at = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      links[(at + (e.key === "ArrowDown" ? 1 : links.length - 1)) % links.length]?.focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      links[e.key === "Home" ? 0 : links.length - 1]?.focus();
    } else if (e.key === "Tab" && !e.shiftKey && at === links.length - 1) {
      // Leaving the last link moves on to the next item in the bar and folds the panel.
      const list = tops();
      const next = list[list.indexOf(triggers.current[active] as HTMLButtonElement) + 1];
      if (next) {
        e.preventDefault();
        open(null);
        next.focus();
      }
    } else if (e.key === "Tab" && e.shiftKey && at === 0) {
      e.preventDefault();
      triggers.current[active]?.focus();
    }
  };

  // Escape anywhere closes the open menu; focus leaving the header closes it too.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") close(header.current?.contains(document.activeElement));
    };
    const onFocus = (e: FocusEvent) => {
      if (header.current && e.target instanceof Node && !header.current.contains(e.target)) open(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocus);
    };
  });

  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

  const sectionIndex = active ? names.indexOf(active) : -1;
  const menu = active ? menus[active] : null;
  const section = sectionIndex >= 0 ? SECTIONS[sectionIndex] : null;
  const hereInMenu = here && here.section === sectionIndex ? here.link : null;
  const robotAt = section ? section.start + (point ?? hereInMenu ?? 0) : 0;

  return (
    <>
      <motion.header
        ref={header}
        className="fixed inset-x-0 top-0 z-50"
        animate={{ y: hidden && !mobile ? -90 : 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{ "--c": `${cell}px` } as CSSProperties}
        onMouseEnter={() => window.clearTimeout(leaveTimer.current)}
        onMouseLeave={() => {
          window.clearTimeout(leaveTimer.current);
          leaveTimer.current = window.setTimeout(() => open(null), 140);
        }}
      >
        {/* The rule under the bar is an inset shadow, so the bar is exactly 64px tall, the height of the spacer under it. */}
        <div className={`relative transition-colors duration-300 ${solidAlways || solid || active ? "bg-[#090909] shadow-[inset_0_-1px_0_rgb(236_234_227/0.15)]" : "bg-transparent"}`}>
          <nav className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-5 md:px-8" aria-label="Main">
            <Logo />
            <ul className="hidden h-full min-w-0 flex-1 items-stretch justify-center lg:flex">
              {names.map((name, i) => {
                const isOpen = active === name;
                const isHere = here?.section === i;
                return (
                  <li key={name} className="relative flex">
                    <button
                      ref={(el) => {
                        triggers.current[name] = el;
                      }}
                      type="button"
                      onMouseEnter={() => {
                        hoverAt.current = performance.now();
                        open(name);
                      }}
                      onClick={() => {
                        // A tap or click right after the pointer opened the menu keeps it open.
                        if (isOpen && performance.now() - hoverAt.current < 500) return;
                        open(isOpen ? null : name);
                      }}
                      onKeyDown={(e) => onTriggerKey(name, e)}
                      onFocus={() => active && active !== name && open(null)}
                      aria-expanded={isOpen}
                      aria-controls="site-menu-panel"
                      className={`group relative flex h-full items-center gap-2 whitespace-nowrap px-3 text-[11px] xl:px-5 ${mono} ${ring} ${isOpen ? "text-[#eceae3]" : "text-[#eceae3]/70 hover:text-[#eceae3]"}`}
                    >
                      <span className={isHere ? "bg-[#f4d44d] px-1 text-[#090909]" : "text-[#f4d44d]"}>0{i + 1}</span>
                      {name}
                      {isHere && <span className="sr-only">(current section)</span>}
                      <Caret open={isOpen} />
                      <span className={`${s.mark} pointer-events-none absolute inset-x-0 bottom-0 bg-[#f4d44d] ${isOpen ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`} style={{ height: cell }} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
              <li className="relative flex">
                <Link
                  ref={pricing}
                  href={NAV_PRICING.href}
                  onMouseEnter={() => open(null)}
                  onFocus={() => active && open(null)}
                  aria-current={here?.section === names.length ? "page" : undefined}
                  className={`group relative flex h-full items-center gap-2 whitespace-nowrap px-3 text-[11px] text-[#eceae3]/70 hover:text-[#eceae3] xl:px-5 ${mono} ${ring}`}
                >
                  <span className={here?.section === names.length ? "bg-[#f4d44d] px-1 text-[#090909]" : "text-[#f4d44d]"}>0{names.length + 1}</span>
                  {NAV_PRICING.label}
                  <span className={`${s.mark} pointer-events-none absolute inset-x-0 bottom-0 scale-x-0 bg-[#f4d44d] group-hover:scale-x-100`} style={{ height: cell }} aria-hidden="true" />
                </Link>
              </li>
            </ul>
            {/* The margin keeps Pricing clear of Sign in: wider than the gap between two menu items. */}
            <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-4">
              {session ? (
                <Link href={appHref("/dashboard")} className={`hidden h-11 items-center bg-[#f4d44d] px-4 text-[10px] text-[#090909] hover:bg-[#fff4b5] sm:inline-flex ${mono} focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-[#eceae3]`}>
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/cloud?next=/sign-in" className={`hidden h-11 items-center whitespace-nowrap px-3 text-[10px] text-[#eceae3]/75 hover:text-[#eceae3] sm:inline-flex ${mono} ${ring}`}>
                    Sign in
                  </Link>
                  <Link href={appHref("/sign-up")} className={`group hidden h-11 items-center gap-2 whitespace-nowrap bg-[#f4d44d] px-4 text-[10px] text-[#090909] hover:bg-[#fff4b5] min-[480px]:inline-flex ${mono} focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-[#eceae3]`}>
                    Start free <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
                  </Link>
                </>
              )}
              <button
                ref={opener}
                type="button"
                onClick={() => setMobile(true)}
                aria-label="Open menu"
                aria-expanded={mobile}
                aria-haspopup="dialog"
                className={`flex size-11 items-center justify-center border border-[#eceae3]/30 text-[#eceae3] hover:border-[#eceae3] lg:hidden ${ring}`}
              >
                <BarsIcon />
              </button>
            </div>
          </nav>

          {menu && active && section && (
            <div
              ref={panel}
              id="site-menu-panel"
              role="region"
              aria-label={`${active} menu`}
              data-swap={swap}
              onKeyDown={onPanelKey}
              className={`${s.panel} absolute inset-x-0 top-full hidden border-b border-[#eceae3]/15 bg-[#090909] text-[#eceae3] lg:block`}
            >
              <MenuPanel name={active} index={sectionIndex} cell={cell} hereLink={hereInMenu} onPoint={setPoint} onPick={() => open(null)}>
                <Link
                  href={menu.feature.href}
                  onClick={() => open(null)}
                  onMouseEnter={() => setPoint(null)}
                  onFocus={() => setPoint(null)}
                  className={`group flex flex-col border border-[#eceae3]/15 hover:border-[#eceae3]/40 ${ring}`}
                >
                  <ChromeScene fill rows={26} pages={PAGES} marks={MARKS} lit={sectionIndex} target={robotAt} className="border-b border-[#eceae3]/15" />
                  <span className="flex flex-col p-5">
                    <span className={`${mono} text-[10px] text-[#eceae3]/55`}>
                      Featured · step <span className="text-[#f4d44d]">0{sectionIndex + 1}</span> of 05
                    </span>
                    <span className="mt-2 font-pixel text-[26px] leading-[1.05] tracking-[-0.04em] group-hover:text-[#fff4b5]">{menu.feature.title}</span>
                    <span className="mt-2 text-sm leading-5 text-[#eceae3]/65">{menu.feature.body}</span>
                    <span className={`${mono} mt-4 inline-flex items-center gap-2 pt-4 text-[10px] text-[#f4d44d]`}>
                      {menu.feature.label} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
                    </span>
                  </span>
                </Link>
              </MenuPanel>
            </div>
          )}
        </div>
      </motion.header>

      {mobile && <PhoneMenu currentPath={pathname} signedIn={!!session} onClose={closeMobile} />}
    </>
  );
}

/**
 * One open menu: its six pages as a waterfall, one row per page. Each row is the page's number,
 * title and one-line description, and its bar on the menu's run: page n starts where page n-1
 * ended, so the bars step down to the right like spans in a trace.
 */
function MenuPanel({ name, index, cell, hereLink, onPoint, onPick, children }: {
  name: MenuName;
  index: number;
  cell: number;
  hereLink: number | null;
  onPoint: (j: number | null) => void;
  onPick: () => void;
  children: React.ReactNode;
}) {
  const links = menus[name].links;
  const lane = useRef<HTMLSpanElement>(null);
  const [geo, setGeo] = useState({ cells: 0, shift: 0 });

  useLayoutEffect(() => {
    const el = lane.current;
    if (!el) return;
    const measure = () => setGeo({ cells: Math.floor(el.clientWidth / cell), shift: deviceShift(el.getBoundingClientRect().left, window.devicePixelRatio || 1) });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // The rows (and so the measured lane) are new elements for each menu.
  }, [cell, name]);

  return (
    <div className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)_minmax(300px,360px)] gap-8 px-8 pb-8 pt-5 xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-12">
      <div onMouseLeave={() => onPoint(null)}>
        <p className={`${mono} flex items-center justify-between gap-4 border-b border-[#eceae3]/15 pb-3 text-[10px] text-[#eceae3]/55`}>
          <span>
            <span className="text-[#f4d44d]">0{index + 1}</span> / {name} · {links.length} pages
          </span>
          <span className="normal-case tracking-[0.08em]">run · uncoil.dev/{name.toLowerCase()}</span>
        </p>
        <ul className="mt-1">
          {links.map(([title, body, href], j) => {
            const bar = waterfallBar(geo.cells, links.length, j);
            const isHere = hereLink === j;
            return (
              <li key={href} className={s.row} style={{ "--d": `${j * 25}ms` } as CSSProperties}>
                <Link
                  href={href}
                  onClick={onPick}
                  onMouseEnter={() => onPoint(j)}
                  onFocus={() => onPoint(j)}
                  aria-current={isHere ? "page" : undefined}
                  className={`group grid grid-cols-[2rem_minmax(0,19rem)_minmax(0,1fr)] items-center gap-4 py-2 ${ring} ${isHere ? "bg-[#eceae3]/[0.05]" : "hover:bg-[#eceae3]/[0.04] focus-visible:bg-[#eceae3]/[0.04]"}`}
                >
                  <span className={`${mono} pl-1 text-[10px] text-[#f4d44d]`}>0{j + 1}</span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-pixel text-[21px] leading-7 tracking-[-0.04em] group-hover:text-[#fff4b5] group-focus-visible:text-[#fff4b5]">{title}</span>
                      {isHere && <span className={`${mono} shrink-0 bg-[#f4d44d] px-1.5 py-1 text-[9px] leading-none text-[#090909]`}>You are here</span>}
                    </span>
                    <span className="block truncate text-[13px] leading-5 text-[#eceae3]/60 group-hover:text-[#eceae3]/80">{body}</span>
                  </span>
                  <span ref={j === 0 ? lane : undefined} className="relative block self-stretch" aria-hidden="true">
                    {geo.cells > 0 && (
                      <span className="absolute inset-y-0 left-0 right-0" style={{ transform: `translateX(${geo.shift}px)` }}>
                        {bar.start > 0 && <span className={`${s.wait} absolute left-0`} style={{ top: `calc(50% - ${cell / 2}px)`, height: cell, width: (bar.start - 1) * cell }} />}
                        <span
                          className={`${s.bar} absolute ${isHere ? "bg-[#f4d44d] shadow-[inset_0_var(--c)_0_#fff4b5]" : "bg-[#eceae3] group-hover:bg-[#f4d44d] group-focus-visible:bg-[#f4d44d]"}`}
                          style={{ left: bar.start * cell, width: bar.width * cell, top: `calc(50% - ${(3 * cell) / 2}px)`, height: 3 * cell, "--d": `${60 + j * 40}ms` } as CSSProperties}
                        />
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      {children}
    </div>
  );
}
