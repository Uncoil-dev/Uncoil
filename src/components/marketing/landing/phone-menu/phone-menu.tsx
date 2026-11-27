"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, Check, Copy, X } from "lucide-react";
import { appHref } from "@/lib/app-links";
import { SETUP_PROMPT } from "../setup-prompt";
import { CELL, Px, drawScene, snapCell, type SceneState } from "./pixel-art";
import { buildTrace, findHere, onLine, pitch, type Here } from "./trace";
import s from "./phone-menu.module.css";

const { sections: SECTIONS, total: N } = buildTrace();

// Grid lengths, in cells. Section lanes grow from 14 to 20 cells to fill the screen, page lanes
// are 12, with a 2-cell gap that the risers bridge. The list's side padding is 4 cells; 12 cells
// on the right stay free for the step number and caret.
const PAD = 4;
const RESERVE = 12;
const GAP = 2;
const PAGE_H = 12;
const TEXT_X = 2;

const mono = "font-mono uppercase tracking-[0.14em]";
const focus = "outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-[#f4d44d]";
const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

type View = { start: number; len: number; p: number };
type Layout = { cells: number; c: number; full: number; zoom: (len: number) => number; step: number };

function useReduced() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduce(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduce;
}

/**
 * One lane of the waterfall: a bar at its place on the timeline with the label running across
 * it. Where the label crosses the bar it is drawn again in ink, clipped to the bar, so it reads
 * on both. Every position is whole cells from the lane's left edge.
 */
function Lane({ view, layout, from, len, here, h, delay, riser, wait, children }: {
  view: View;
  layout: Layout;
  from: number;
  len: number;
  here: number | null;
  h: number;
  delay: number;
  riser: boolean;
  wait?: number;
  children: ReactNode;
}) {
  const { c } = layout;
  const left = (from - view.start) * view.p * c;
  const width = len * view.p * c;
  const inView = from + len > view.start && from < view.start + view.len;
  const label = (ink: boolean, x: number) => (
    <span className={`${s.zoom} pointer-events-none absolute inset-y-0 flex items-center whitespace-nowrap ${ink ? "text-[#090909]" : ""}`} style={{ left: x }} aria-hidden={ink || undefined}>
      {children}
    </span>
  );
  return (
    <span className="relative block" style={{ height: h * c }}>
      {wait !== undefined && wait < from && inView && <span className={`${s.wait} ${s.zoom}`} style={{ left: (wait - view.start) * view.p * c, width: (from - wait) * view.p * c }} />}
      {riser && inView && <span className={`${s.riser} ${s.zoom}`} style={{ left: Math.max(0, left - c), top: -GAP * c, height: GAP * c }} />}
      {label(false, TEXT_X * c)}
      {inView && (
        <span className={s.bar} style={{ left, width: width - c }}>
          <span className={s.fill} style={{ "--n": len, "--d": `${delay}ms`, "--t": `${len * 45}ms` } as CSSProperties}>
            <span className={`${s.blocks} ${s.zoom}`} style={{ width, "--p": view.p } as CSSProperties} />
            {here !== null && <span className={`${s.here} ${s.zoom}`} style={{ left: (here - from) * view.p * c, width: (view.p - 1) * c }} />}
            {label(true, TEXT_X * c - left)}
          </span>
        </span>
      )}
    </span>
  );
}

/** The scene strip: sky, sun, the site's timeline as a ruler, and the robot walking it. */
function Scene({ view, layout, here, target, copied, reduce, rows }: { view: View; layout: Layout; here: Here | null; target: number; copied: boolean; reduce: boolean; rows: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ view, here, target, copied, rows, layout });
  const motion = useRef({ pos: 0, from: 0, t0: 0, walk: 0, hop: -1, frame: 0 });

  useEffect(() => {
    const m = motion.current;
    if (live.current.target !== target) {
      m.from = m.pos;
      m.t0 = performance.now();
    }
    live.current = { view, here, target, copied, rows, layout };
  });

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    let raf = 0;
    let px: Px | null = null;
    const m = motion.current;
    m.t0 = performance.now();
    const draw = (now: number) => {
      const { view: v, here: hr, target: tg, copied: cp, rows: H, layout: L } = live.current;
      if (!px || px.w !== L.cells || px.h !== H) {
        px = new Px(L.cells, H);
        el.width = L.cells;
        el.height = H;
      }
      // Walk at a steady pace, at most 600ms for any trip, then hop once on arrival.
      const dist = tg - m.from;
      const dur = Math.min(600, Math.abs(dist) * 40);
      const k = reduce || dur === 0 ? 1 : Math.min(1, (now - m.t0) / dur);
      const before = m.pos;
      m.pos = m.from + dist * k;
      if (m.pos !== before) m.walk += Math.abs(m.pos - before) * v.p;
      if (k === 1 && before !== m.pos && !reduce) m.hop = now;
      const hopT = m.hop < 0 ? 99 : (now - m.hop) / 60;
      const lift = reduce ? 0 : ([1, 2, 2, 1][Math.floor(hopT)] ?? 0);
      const walking = k < 1;
      const state: SceneState = {
        pitch: v.p,
        pages: v.len,
        ox: PAD,
        ruler: H - 12,
        trail: hr !== null,
        pos: m.pos - v.start,
        frame: walking ? Math.floor(m.walk / 2) % 4 : 0,
        lift,
        antenna: reduce || now % 1600 > 140,
        copied: cp,
        boards: v.len === N ? SECTIONS.map((x) => ({ at: x.start, n: x.index + 1, lit: hr?.section === x.index })) : Array.from({ length: v.len }, (_, j) => ({ at: j, n: j + 1, lit: hr?.cell === v.start + j })),
      };
      drawScene(px, state);
      px.blit(ctx);
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    draw(performance.now());
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  // Under reduced motion the scene is drawn once per change instead of every frame.
  useEffect(() => {
    if (!reduce) return;
    motion.current.pos = target;
    motion.current.from = target;
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const px = new Px(layout.cells, rows);
    el.width = layout.cells;
    el.height = rows;
    drawScene(px, {
      pitch: view.p,
      pages: view.len,
      ox: PAD,
      ruler: rows - 12,
      trail: here !== null,
      pos: target - view.start,
      frame: 0,
      lift: 0,
      antenna: true,
      copied,
      boards: view.len === N ? SECTIONS.map((x) => ({ at: x.start, n: x.index + 1, lit: here?.section === x.index })) : Array.from({ length: view.len }, (_, j) => ({ at: j, n: j + 1, lit: here?.cell === view.start + j })),
    });
    px.blit(ctx);
  }, [reduce, target, view, layout, here, copied, rows]);

  return <canvas ref={canvas} className="block [image-rendering:pixelated]" style={{ width: layout.cells * layout.c, height: rows * layout.c }} aria-hidden="true" />;
}

export function PhoneMenu({ currentPath, signedIn, onClose }: { currentPath: string; signedIn: boolean; onClose: () => void }) {
  const here = findHere(SECTIONS, currentPath);
  const reduce = useReduced();
  const [open, setOpen] = useState<number | null>(null);
  const [armed, setArmed] = useState(false);
  const [copy, setCopy] = useState<"idle" | "copied" | "blocked">("idle");
  const [layout, setLayout] = useState<Layout>({ cells: 97, c: CELL, full: 3, zoom: () => 12, step: 16 });
  const [rows, setRows] = useState(34);
  const root = useRef<HTMLDivElement>(null);
  const sky = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<number | undefined>(undefined);

  // Measure the column in whole cells before the first paint, and again on resize or a change
  // of display scale, so every bar and the scene snap to the same grid.
  useLayoutEffect(() => {
    const measure = () => {
      const c = snapCell(CELL, window.devicePixelRatio || 1);
      const width = sky.current?.clientWidth ?? window.innerWidth;
      const cells = Math.floor(width / c);
      const lane = cells - 2 * PAD;
      const listCells = Math.floor((list.current?.clientHeight ?? 0) / c);
      const step = Math.min(20, Math.max(14, Math.floor((listCells - 4) / SECTIONS.length) - GAP));
      setLayout({ cells, c, full: pitch(lane, N, RESERVE), zoom: (len) => pitch(lane, len, RESERVE), step });
      setRows(window.innerHeight < 700 ? 29 : 34);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (sky.current) ro.observe(sky.current);
    if (list.current) ro.observe(list.current);
    const dpr = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    dpr.addEventListener("change", measure);
    return () => {
      ro.disconnect();
      dpr.removeEventListener("change", measure);
    };
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Focus in, trap Tab, close on Escape and on Back, lock page scroll.
  useEffect(() => {
    closeBtn.current?.focus();
    const html = document.documentElement;
    const prev = [html.style.overflow, document.body.style.overflow];
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !root.current) return;
      const items = [...root.current.querySelectorAll<HTMLElement>("a[href], button, textarea")].filter((el) => el.getClientRects().length > 0);
      const first = items[0];
      const last = items[items.length - 1];
      const inside = root.current.contains(document.activeElement);
      if (e.shiftKey && (!inside || document.activeElement === first)) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onClose);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onClose);
      [html.style.overflow, document.body.style.overflow] = prev;
      window.clearTimeout(timer.current);
    };
  }, [onClose]);

  useEffect(() => {
    if (open === null) return;
    // If the unfolded pages run past the bottom, bring the section to the top of the list.
    const nav = list.current;
    const tail = nav?.querySelector(`[data-tail="${open}"]`);
    const row = nav?.querySelector<HTMLElement>(`[data-step="${open}"]`);
    if (!nav || !tail || !row || tail.getBoundingClientRect().bottom <= nav.getBoundingClientRect().bottom) return;
    nav.scrollTo({ top: row.offsetTop, behavior: reduce ? "auto" : "smooth" });
  }, [open, reduce]);

  useEffect(() => {
    if (copy === "blocked") box.current?.select();
  }, [copy]);

  async function copyPrompt() {
    try {
      if (!navigator.clipboard) throw new Error("no clipboard");
      await navigator.clipboard.writeText(SETUP_PROMPT);
      setCopy("copied");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopy("idle"), 2400);
    } catch {
      setCopy("blocked");
    }
  }

  const view: View = open === null ? { start: 0, len: N, p: layout.full } : { start: SECTIONS[open].start, len: SECTIONS[open].len, p: layout.zoom(SECTIONS[open].len) };
  // The robot walks from the start of the run to the page you are on, then to whichever
  // section you unfold.
  const goal = open === null ? (here?.cell ?? 0) : here?.section === open ? here.cell : SECTIONS[open].start;
  const target = armed || reduce ? goal : 0;
  const c = layout.c;
  const laneW = (layout.cells - 2 * PAD) * c;
  const lanePad = { paddingInline: PAD * c };

  return (
    <div ref={root} role="dialog" aria-modal="true" aria-label="Menu" className={`${s.shell} fixed inset-0 z-[80] bg-[#090909] text-[#eceae3]`} style={{ "--c": `${c}px` } as CSSProperties}>
      {/* Run header */}
      <div className={`${s.head} flex h-16 items-center justify-between gap-2 pl-2 pr-2`} style={{ boxShadow: `inset 0 -${c}px 0 rgb(236 234 227 / 0.12)` }}>
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/" onClick={onClose} aria-label="Uncoil home" className={`flex size-12 shrink-0 items-center justify-center ${focus}`}>
            <Image src="/logos/uncoil/uncoil-icon.svg" alt="" width={32} height={32} unoptimized className="size-8" />
          </Link>
          <div className="min-w-0">
            <p className={`${mono} flex items-center gap-2 text-[11px] text-[#eceae3]`}>
              <span className="shrink-0 bg-[#f4d44d]" style={{ width: 2 * c, height: 2 * c }} aria-hidden="true" />
              Trace · uncoil.dev
            </p>
            <p className={`${mono} mt-1 truncate text-[10px] text-[#eceae3]/55`}>
              {onLine(here, currentPath)} · {SECTIONS.length} steps · {N} pages
            </p>
          </div>
        </div>
        <button ref={closeBtn} type="button" onClick={onClose} aria-label="Close menu" className="flex size-12 shrink-0 items-center justify-center bg-[#f4d44d] text-[#090909] outline-offset-2 focus-visible:outline-2 focus-visible:outline-[#eceae3]">
          <X className="size-6" aria-hidden="true" />
        </button>
      </div>

      <div ref={sky} className={`${s.sky} overflow-hidden`}>
        <Scene view={view} layout={layout} here={here} target={target} copied={copy === "copied"} reduce={reduce} rows={rows} />
      </div>

      {/* The waterfall */}
      <nav ref={list} aria-label="Site" className={`${s.list} relative overflow-y-auto overflow-x-hidden overscroll-contain`} style={{ paddingBottom: 4 * c }}>
        <ul>
          {SECTIONS.map((sec) => {
            const isOpen = open === sec.index;
            const holdsHere = here?.section === sec.index;
            const off = sec.start + sec.len <= view.start ? "◂" : sec.start >= view.start + view.len ? "▸" : "";
            const rowCls = `group relative block w-full text-left ${s.rise} ${focus}`;
            const body = (
              <>
                <Lane view={view} layout={layout} from={sec.start} len={sec.len} here={holdsHere ? here.cell : null} h={layout.step} delay={140 + sec.start * 34} riser={open === null && sec.index > 0}>
                  <span className="font-pixel text-[clamp(30px,11.5vw,48px)] leading-none tracking-[-0.05em]">{sec.name}</span>
                </Lane>
                <span className="pointer-events-none absolute flex items-start gap-2" style={{ right: PAD * c, top: GAP * c, height: layout.step * c, paddingTop: 6 * c }}>
                  <span className={`font-mono text-[11px] leading-5 ${isOpen || holdsHere ? "text-[#f4d44d]" : "text-[#eceae3]/50"}`}>
                    {off && <span className="mr-1 text-[#eceae3]/50">{off}</span>}0{sec.index + 1}
                  </span>
                  {sec.href ? <ArrowRight className="size-5 text-[#f4d44d]" aria-hidden="true" /> : <Caret open={isOpen} c={c} />}
                </span>
              </>
            );
            const rowStyle = { ...lanePad, paddingTop: GAP * c, ...d(sec.index * 40) };
            return (
              <li key={sec.name} data-step={sec.index} style={{ width: laneW + 2 * PAD * c }}>
                {sec.href ? (
                  <Link href={sec.href} onClick={onClose} aria-current={holdsHere ? "page" : undefined} className={rowCls} style={rowStyle}>
                    {body}
                  </Link>
                ) : (
                  <button type="button" onClick={() => setOpen(isOpen ? null : sec.index)} aria-expanded={isOpen} aria-controls={`phone-menu-${sec.index}`} className={rowCls} style={rowStyle}>
                    {body}
                    <span className="sr-only">{`, ${sec.len} pages`}</span>
                  </button>
                )}
                {!sec.href && (
                  <ul id={`phone-menu-${sec.index}`} hidden={!isOpen}>
                    {isOpen &&
                      sec.links.map((ln, j) => {
                        const isHere = holdsHere && here.link === j;
                        return (
                          <li key={ln.href + j} data-tail={j === sec.links.length - 1 ? sec.index : undefined}>
                            <Link href={ln.href} onClick={onClose} aria-current={isHere ? "page" : undefined} className={`group relative block ${s.rise} ${focus}`} style={{ ...lanePad, paddingTop: GAP * c, ...d(j * 40) }}>
                              <Lane view={view} layout={layout} from={ln.cell} len={1} here={isHere ? ln.cell : null} h={PAGE_H} delay={60 + j * 50} riser wait={sec.start}>
                                <span className="font-pixel text-[clamp(22px,7vw,28px)] leading-none tracking-[-0.04em]">{ln.label}</span>
                                {isHere && <span className={`${mono} ml-3 bg-[#f4d44d] px-1.5 py-1 text-[9px] leading-none text-[#090909]`}>You are here</span>}
                              </Lane>
                            </Link>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Pinned actions */}
      <div className={`${s.acts} grid gap-2 bg-[#090909] p-3 pb-[max(12px,env(safe-area-inset-bottom))]`} style={{ boxShadow: `inset 0 ${c}px 0 rgb(236 234 227 / 0.12)`, paddingTop: 3 * c + c }}>
        {copy === "blocked" && (
          <div className="grid gap-2 border border-[#eceae3]/30 p-3">
            <p className={`${mono} text-[10px] text-[#eceae3]/70`}>Copy blocked · select the prompt and copy it</p>
            <textarea ref={box} readOnly value={SETUP_PROMPT} rows={5} aria-label="Setup prompt" className="w-full resize-none bg-[#090909] p-2 font-mono text-[11px] leading-5 text-[#eceae3] outline outline-1 outline-[#eceae3]/20 focus:outline-[#f4d44d]" />
            <button type="button" onClick={() => setCopy("idle")} className={`${mono} h-12 border border-[#eceae3]/30 text-[11px]`}>
              Done
            </button>
          </div>
        )}
        <Link href={appHref(signedIn ? "/dashboard" : "/sign-up")} onClick={onClose} className={`${mono} flex h-14 items-center justify-between bg-[#f4d44d] px-5 text-[12px] text-[#090909] outline-offset-2 focus-visible:outline-2 focus-visible:outline-[#eceae3]`}>
          {signedIn ? "Dashboard" : "Start free"} <ArrowRight className="size-5" aria-hidden="true" />
        </Link>
        <div className={`${s.pair} grid gap-2 ${signedIn ? "grid-cols-1" : "grid-cols-[minmax(0,1fr)_auto]"}`}>
          <button type="button" onClick={copyPrompt} className={`${mono} flex h-12 min-w-0 items-center justify-between gap-2 border px-4 text-[11px] outline-offset-2 focus-visible:outline-2 focus-visible:outline-[#f4d44d] ${copy === "copied" ? "border-[#eceae3] bg-[#eceae3] text-[#090909]" : "border-[#eceae3]/35"}`}>
            <span className="truncate">{copy === "copied" ? "Copied · paste it in" : "Copy setup prompt"}</span>
            {copy === "copied" ? <Check className="size-4 shrink-0" aria-hidden="true" /> : <Copy className="size-4 shrink-0" aria-hidden="true" />}
          </button>
          {!signedIn && (
            <Link href="/cloud?next=/sign-in" onClick={onClose} className={`${mono} flex h-12 items-center border border-[#eceae3]/35 px-4 text-[11px] outline-offset-2 focus-visible:outline-2 focus-visible:outline-[#f4d44d]`}>
              Sign in
            </Link>
          )}
        </div>
        <span className="sr-only" role="status">
          {copy === "copied" ? "Setup prompt copied" : ""}
        </span>
      </div>
    </div>
  );
}

/** Pixel caret for a foldable step, 3x5 cells: points right, turns down when open. */
function Caret({ open, c }: { open: boolean; c: number }) {
  return (
    <svg viewBox="0 0 3 5" width={3 * c} height={5 * c} className={`${s.caret} shrink-0 text-[#f4d44d] ${open ? "rotate-90" : ""}`} shapeRendering="crispEdges" aria-hidden="true">
      {[1, 2, 3, 2, 1].map((w, y) => (
        <rect key={y} x="0" y={y} width={w} height="1" fill="currentColor" />
      ))}
    </svg>
  );
}
