"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Check, Copy, X } from "lucide-react";
import { appHref } from "@/lib/app-links";
import { SETUP_PROMPT } from "../setup-prompt";
import { CELL, Px, drawScene, snapCell, type SceneState } from "./pixel-art";
import { barCells, buildTrace, findHere, onLine, pitch, type Here } from "./trace";
import s from "./phone-menu.module.css";

const { sections: SECTIONS, total: N } = buildTrace();

// Grid lengths, in cells. A row is its name on its own line, then the bar on its own lane. Section
// bars grow from 6 to 12 cells tall so the five rows fill the screen; page bars are 5. The list's
// side padding is 4 cells, and 12 cells on the right stay free so a label fits beside the last bar.
// On a short screen the names shrink to 9 cells and the bars to 4, so the five steps need less
// scrolling. On a phone held sideways each name sits beside its bar instead, in a column of
// NAME_W cells, and the scene moves to the right-hand column above the buttons.
const PAD = 4;
const RESERVE = 12;
const NAME_H = 11;
const SHORT_NAME_H = 9;
const NAME_W = 40;
const PAGE_NAME_H = 7;
const PAGE_BAR = 5;
const MIN_BAR = 6;
const INLINE_RESERVE = 4;
const LONGEST = Math.max(...SECTIONS.map((x) => x.len));

const mono = "font-mono uppercase tracking-[0.14em]";
const focus = "outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-[#f4d44d]";
const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

type View = { start: number; len: number; p: number };
type Layout = {
  /** Scene width in cells, and the scene ruler's cells per page for the whole run or one section. */
  cells: number;
  sceneFull: number;
  sceneZoom: (len: number) => number;
  c: number;
  /** The list: row width and bar lane in cells, and the lane's cells per page. */
  row: number;
  lane: number;
  full: number;
  zoom: (len: number) => number;
  step: number;
  nameH: number;
  inline: boolean;
};

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

type Label = { text: string; tag?: boolean; path?: boolean };

// Rough widths of the mono labels in CSS px, enough to choose a side of the bar for them.
const labelPx = (l: Label) => (l.tag ? l.text.length * 6.7 + 12 : l.text.length * 7.4 + 8);

/**
 * One bar lane of the waterfall: the span's bar at its place on the timeline, the yellow block
 * for the page you are on, and its labels beside it on whichever side has room. Every position
 * is whole cells from the lane's left edge.
 */
function BarLane({ view, layout, from, len, here, h, delay, wait, labels, minCells = MIN_BAR }: {
  view: View;
  layout: Layout;
  from: number;
  len: number;
  here: number | null;
  h: number;
  delay: number;
  wait?: number;
  labels: Label[];
  /** The shortest the bar may be, in cells. */
  minCells?: number;
}) {
  const { c, lane } = layout;
  const start = (from - view.start) * view.p;
  const cells = barCells(len, view.p, minCells, lane - start);
  const end = start + cells;
  const inView = from + len > view.start && from < view.start + view.len;
  const mid = Math.floor((h - 1) / 2) * c;
  // Pages narrower than 5 cells would turn a bar into a comb of seams, so such bars are drawn
  // solid, and the page you are on becomes a yellow pin standing a cell out of the bar.
  const seams = view.p >= 5 && len > 1;
  const pin = here !== null && !seams && len > 1;

  // Labels go together on the roomier side; if they do not fit there, the "you are here" tag
  // takes the side it fits on and the rest go to the other.
  const room = { right: lane - end - 2, left: start - 2 };
  const need = (ls: Label[]) => Math.ceil(ls.reduce((n, l) => n + labelPx(l), 0) / c) + (ls.length - 1) * 2;
  let right: Label[] = [];
  let left: Label[] = [];
  if (!inView) (from < view.start ? left : right).push(...labels);
  else if (need(labels) <= room.right) right = labels;
  else if (need(labels) <= room.left) left = labels;
  else {
    const tag = labels.filter((l) => l.tag);
    const rest = labels.filter((l) => !l.tag);
    if (need(tag) <= room.right) [right, left] = [tag, rest];
    else [left, right] = [tag, rest];
  }
  const group = (ls: Label[], side: "left" | "right") =>
    ls.length > 0 && (
      <span
        className={`${s.zoom} pointer-events-none absolute flex items-center gap-2 whitespace-nowrap`}
        style={{ top: 0, height: h * c, ...(side === "right" ? { left: inView ? (end + 2) * c : undefined, right: inView ? undefined : 0 } : { right: inView ? (lane - start + 2) * c : undefined, left: inView ? undefined : 0 }) }}
      >
        {ls.map((l) => (
          <span key={l.text} className={`font-mono tracking-[0.14em] leading-none ${l.path ? "" : "uppercase"} ${l.tag ? "bg-[#f4d44d] px-1.5 py-1 text-[9px] text-[#090909]" : `px-1 text-[10px] text-[#eceae3]/55 ${side === "left" ? "bg-[#090909]" : ""}`}`}>
            {!inView && side === "left" ? `◂ ${l.text}` : !inView ? `${l.text} ▸` : l.text}
          </span>
        ))}
      </span>
    );
  return (
    <span className="relative block" style={{ height: h * c }}>
      {wait !== undefined && wait < from && inView && <span className={`${s.wait} ${s.zoom}`} style={{ top: mid, left: (wait - view.start) * view.p * c, width: (from - wait) * view.p * c - c }} />}
      {inView && (
        <span className={s.bar} style={{ left: start * c, width: cells * c }}>
          <span className={s.fill} style={{ "--n": len, "--d": `${delay}ms`, "--t": `${len * 45}ms` } as CSSProperties}>
            <span className={`${s.blocks} ${s.zoom}`} style={{ width: cells * c, "--p": seams ? view.p : cells + 1 } as CSSProperties} />
            {here !== null && !pin && <span className={`${s.here} ${s.zoom}`} style={{ left: (here - from) * view.p * c, width: (len === 1 ? cells : view.p - 1) * c }} />}
          </span>
        </span>
      )}
      {pin && <span className={`${s.here} ${s.zoom} ${s.pin}`} style={{ left: (start + (here - from) * view.p) * c, width: Math.max(2, view.p - 1) * c, top: -c, bottom: -c, "--d": `${delay + (here - from) * 45}ms` } as CSSProperties} />}
      {group(left, "left")}
      {group(right, "right")}
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
      const sp = v.len === N ? L.sceneFull : L.sceneZoom(v.len);
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
      if (m.pos !== before) m.walk += Math.abs(m.pos - before) * sp;
      if (k === 1 && before !== m.pos && !reduce) m.hop = now;
      const hopT = m.hop < 0 ? 99 : (now - m.hop) / 60;
      const lift = reduce ? 0 : ([1, 2, 2, 1][Math.floor(hopT)] ?? 0);
      const walking = k < 1;
      const state: SceneState = {
        pitch: sp,
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
      pitch: view.len === N ? layout.sceneFull : layout.sceneZoom(view.len),
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
  const [layout, setLayout] = useState<Layout>({ cells: 97, sceneFull: 3, sceneZoom: () => 12, c: CELL, row: 97, lane: 89, full: 3, zoom: () => 12, step: 9, nameH: NAME_H, inline: false });
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
      const cells = Math.floor((sky.current?.clientWidth || window.innerWidth) / c);
      const sceneLane = cells - 2 * PAD;
      const row = Math.floor((list.current?.clientWidth || window.innerWidth) / c);
      // Names go beside their bars only when the bars still get two cells a page there.
      const inline = sideways.matches && row - 2 * PAD - NAME_W - 2 >= 2 * N + INLINE_RESERVE;
      const lane = inline ? row - 2 * PAD - NAME_W - 2 : row - 2 * PAD;
      const per = Math.floor((Math.floor((list.current?.clientHeight ?? 0) / c) - 4) / SECTIONS.length);
      const short = !inline && per - NAME_H - 5 < 6;
      const nameH = short ? SHORT_NAME_H : NAME_H;
      const step = inline ? Math.min(nameH, Math.max(6, per - 4)) : Math.min(12, Math.max(short ? 4 : 6, per - nameH - 5));
      setLayout({
        cells,
        sceneFull: pitch(sceneLane, N, RESERVE),
        sceneZoom: (len) => pitch(sceneLane, len, RESERVE),
        c,
        row,
        lane,
        full: pitch(lane, N, inline ? INLINE_RESERVE : RESERVE),
        zoom: (len) => pitch(lane, len, RESERVE),
        step,
        nameH,
        inline,
      });
      setRows(sideways.matches || window.innerHeight < 600 ? 24 : window.innerHeight < 700 ? 26 : 34);
    };
    const sideways = window.matchMedia("(orientation: landscape) and (max-height: 520px)");
    measure();
    const ro = new ResizeObserver(measure);
    if (sky.current) ro.observe(sky.current);
    if (list.current) ro.observe(list.current);
    const dpr = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    dpr.addEventListener("change", measure);
    sideways.addEventListener("change", measure);
    return () => {
      ro.disconnect();
      dpr.removeEventListener("change", measure);
      sideways.removeEventListener("change", measure);
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
    // If the unfolded pages run past the bottom, or the section's own row has scrolled above the
    // top, bring the section to the top of the list.
    const nav = list.current;
    const tail = nav?.querySelector(`[data-tail="${open}"]`);
    const row = nav?.querySelector<HTMLElement>(`[data-step="${open}"]`);
    if (!nav || !tail || !row) return;
    const box = nav.getBoundingClientRect();
    if (tail.getBoundingClientRect().bottom <= box.bottom && row.getBoundingClientRect().top >= box.top) return;
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
  const lanePad = { paddingInline: PAD * c };
  const { inline, nameH } = layout;
  // Sideways, a name and its bar share one line: the name in a fixed column, the bar after it.
  const line = (name: React.ReactNode, bar: React.ReactNode) =>
    inline ? (
      <span className="flex items-center" style={{ gap: 2 * c }}>
        <span className="block shrink-0" style={{ width: NAME_W * c }}>
          {name}
        </span>
        <span className="block min-w-0 flex-1">{bar}</span>
      </span>
    ) : (
      <>
        {name}
        <span className="block" style={{ height: c }} />
        {bar}
      </>
    );


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
      <nav ref={list} aria-label="Site" className={`${s.list} relative overflow-y-auto overflow-x-hidden overscroll-contain [overflow-anchor:none]`} style={{ paddingBottom: (nameH < NAME_H ? 2 : 4) * c }}>
        <ul>
          {SECTIONS.map((sec) => {
            const isOpen = open === sec.index;
            const holdsHere = here?.section === sec.index;
            const count: Label = { text: `${sec.len} page${sec.len === 1 ? "" : "s"}` };
            const labels: Label[] = isOpen ? [] : holdsHere && open === null ? [count, { text: "You are here", tag: true }] : [count];
            const rowCls = `group relative block w-full text-left ${s.rise} ${focus}`;
            const nameSize = inline ? "text-[28px]" : nameH < NAME_H ? "text-[clamp(28px,9vw,36px)]" : "text-[clamp(30px,11vw,44px)]";
            const body = line(
              <span className="flex items-start justify-between gap-3" style={{ height: nameH * c }}>
                <span className="flex min-w-0 items-start gap-3">
                  <span className={`flex items-center font-pixel ${nameSize} leading-none tracking-[-0.05em] group-hover:text-[#fff4b5]`} style={{ height: nameH * c }}>
                    {sec.name}
                  </span>
                  <span className="shrink-0" style={{ marginTop: Math.floor((nameH - 5) / 2) * c }}>
                    {sec.href ? <PixelArrow c={c} /> : <Caret open={isOpen} c={c} />}
                  </span>
                </span>
                {isOpen && !inline && <span className={`${mono} shrink-0 self-center text-[10px] text-[#eceae3]/55`}>{count.text}</span>}
              </span>,
              // A one-page step (Pricing) is drawn as long as the longest step's bar, as one solid
              // block, so it does not shrink to a speck beside the others; its label still says 1 page.
              <BarLane view={view} layout={layout} from={sec.start} len={sec.len} here={holdsHere ? here.cell : null} h={layout.step} delay={140 + sec.start * 34} labels={isOpen && inline ? [count] : labels} minCells={sec.href ? LONGEST * view.p - 1 : MIN_BAR} />,
            );
            const rowPad = (nameH < NAME_H ? 1 : 2) * c;
            const rowStyle = { ...lanePad, paddingTop: rowPad, paddingBottom: rowPad, ...d(sec.index * 40) };
            return (
              <li key={sec.name} data-step={sec.index} style={{ width: layout.row * c }}>
                {sec.href ? (
                  <Link href={sec.href} onClick={onClose} aria-current={holdsHere ? "page" : undefined} className={rowCls} style={rowStyle}>
                    {body}
                  </Link>
                ) : (
                  <button type="button" onClick={() => setOpen(isOpen ? null : sec.index)} aria-expanded={isOpen} aria-controls={`phone-menu-${sec.index}`} className={rowCls} style={rowStyle}>
                    {body}
                  </button>
                )}
                {!sec.href && (
                  <ul id={`phone-menu-${sec.index}`} hidden={!isOpen}>
                    {isOpen &&
                      sec.links.map((ln, j) => {
                        const isHere = holdsHere && here.link === j;
                        return (
                          <li key={ln.href + j} data-tail={j === sec.links.length - 1 ? sec.index : undefined}>
                            <Link
                              href={ln.href}
                              onClick={onClose}
                              aria-current={isHere ? "page" : undefined}
                              className={`group relative block ${s.rise} ${focus} ${isHere ? "bg-[#eceae3]/[0.06]" : ""}`}
                              style={{ ...lanePad, paddingTop: 2 * c, paddingBottom: 2 * c, ...d(j * 40) }}
                            >
                              {isHere && <span className="pointer-events-none absolute inset-y-0 left-0 bg-[#f4d44d]" style={{ width: c }} />}
                              {line(
                                <span className="flex items-center gap-3" style={{ height: PAGE_NAME_H * c }}>
                                  <span className={`font-pixel ${inline ? "truncate text-[22px]" : "text-[clamp(22px,7vw,28px)]"} leading-none tracking-[-0.04em] group-hover:text-[#fff4b5]`}>{ln.label}</span>
                                  {isHere && !inline && <span className={`${mono} bg-[#f4d44d] px-1.5 py-1 text-[9px] leading-none text-[#090909]`}>You are here</span>}
                                </span>,
                                <BarLane
                                  view={view}
                                  layout={layout}
                                  from={ln.cell}
                                  len={1}
                                  here={isHere ? ln.cell : null}
                                  h={PAGE_BAR}
                                  delay={60 + j * 50}
                                  wait={sec.start}
                                  labels={[{ text: ln.href.replace(/^https?:\/\/[^/]+/, ""), path: true }, ...(isHere && inline ? [{ text: "You are here", tag: true }] : [])]}
                                />,
                              )}
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

/** Pixel arrow for a step that is a single page, 5x5 cells. */
function PixelArrow({ c }: { c: number }) {
  return (
    <svg viewBox="0 0 5 5" width={5 * c} height={5 * c} className="shrink-0 text-[#f4d44d]" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="2" y="0" width="1" height="1" fill="currentColor" />
      <rect x="3" y="1" width="1" height="1" fill="currentColor" />
      <rect x="0" y="2" width="5" height="1" fill="currentColor" />
      <rect x="3" y="3" width="1" height="1" fill="currentColor" />
      <rect x="2" y="4" width="1" height="1" fill="currentColor" />
    </svg>
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
