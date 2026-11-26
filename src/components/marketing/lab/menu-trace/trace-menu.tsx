"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, Check, Copy, X } from "lucide-react";
import { appHref } from "@/lib/app-links";
import { Bubble, Caret, Robot, Sun } from "./art";
import { SETUP_PROMPT } from "./prompt";
import { buildTrace, findHere } from "./trace";
import s from "./menu-trace.module.css";

const { sections: SECTIONS, total: N } = buildTrace();
const LAST = SECTIONS.length - 1;
const GAP = 2;
// Horizontal centre of timeline cell k inside a lane of N cells with GAP px between them.
const at = (k: number) => `calc((100% + ${GAP}px) * ${(k + 0.5) / N} - ${GAP / 2}px)`;
const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
const plural = (n: number) => `${n} page${n === 1 ? "" : "s"}`;
const href = (h: string) => (h.startsWith("/demo") ? appHref(h) : h);

const mono = "font-mono uppercase tracking-[0.14em]";
const line = "pointer-events-none absolute bg-[#eceae3]/25";
const STARS = [
  [6, 18, 0],
  [19, 46, 0],
  [31, 12, 1],
  [47, 34, 0],
  [58, 8, 0],
  [72, 26, 0],
  [86, 10, 1],
] as const;

type View = { start: number; len: number };
const FULL: View = { start: 0, len: N };
const cols = { gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))`, columnGap: GAP };
const bar = (from: number, len: number, delay: number, per = 28) =>
  ({ gridColumn: `${from + 1} / span ${len}`, gridRow: 1, "--n": len, "--d": `${delay}ms`, "--t": `${len * per + 40}ms` }) as CSSProperties;

/** A strip of the timeline. Zooming widens the inner track and slides it, like the trace viewer. */
function Zoom({ view, className, children, outside }: { view: View; className: string; children: ReactNode; outside?: ReactNode }) {
  return (
    <span className={`block overflow-hidden ${className}`}>
      <span
        className={`absolute inset-y-0 left-0 grid ${s.zoom}`}
        style={{ ...cols, width: `${(N / view.len) * 100}%`, transform: `translateX(calc(${(-view.start / N) * 100}% - ${(view.start * GAP) / N}px))` }}
      >
        {children}
      </span>
      {outside}
    </span>
  );
}

type LaneProps = { view: View; from: number; len: number; kind: "root" | "step" | "child"; here: number | null; play: number; delay: number; label?: string; wait?: number };

/** One row of the waterfall: the span's bar, the yellow cell where you are, and its label beside it. */
function Lane({ view, from, len, kind, here, play, delay, label, wait }: LaneProps) {
  const inView = from + len > view.start && from < view.start + view.len;
  const after = (from + len / 2 - view.start) / view.len < 0.55;
  const per = kind === "root" ? 16 : 28;
  return (
    <Zoom
      view={view}
      className={`relative ${kind === "step" ? "h-[26px]" : kind === "child" ? "h-5" : "h-3.5"} ${s.track}`}
      outside={
        !inView && label ? (
          <span className={`${mono} absolute inset-y-0 flex items-center text-[9px] text-[#eceae3]/40 ${from < view.start ? "left-0" : "right-0"}`}>
            {from < view.start ? `◂ ${label}` : `${label} ▸`}
          </span>
        ) : null
      }
    >
      {wait !== undefined && wait < from && <span className="h-0.5 self-center bg-[#eceae3]/40" style={{ gridColumn: `${wait + 1} / ${from + 1}`, gridRow: 1 }} />}
      <span className={`${s.bar} ${kind === "root" ? s.dither : s.solid}`} style={bar(from, len, delay, per)} />
      {here !== null && <span className={`${s.bar} ${s.here}`} style={bar(here, 1, delay + (here - from) * per)} />}
      {label && inView && (
        <span
          className={`z-10 self-center whitespace-nowrap px-1.5 font-mono text-[10px] text-[#eceae3]/55 ${after ? "ml-1.5 justify-self-start" : "mr-1.5 justify-self-end bg-[#090909]"}`}
          style={{ gridColumn: after ? `${from + len + 1} / -1` : `1 / ${from + 1}`, gridRow: 1 }}
        >
          {label}
        </span>
      )}
      <span className={`pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-[#f4d44d] ${s.walk}`} style={{ left: at(play) }} />
    </Zoom>
  );
}

export function TraceMenu({ currentPath, onClose }: { currentPath: string; onClose: () => void }) {
  const here = findHere(SECTIONS, currentPath);
  const [open, setOpen] = useState<number | null>(null);
  const [armed, setArmed] = useState(false);
  const [walking, setWalking] = useState(false);
  const [copy, setCopy] = useState<"idle" | "copied" | "blocked">("idle");
  const root = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<number | undefined>(undefined);

  // The playhead sweeps from the start of the run to the step you are on, then follows
  // whichever section you unfold.
  const target = open === null ? (here?.cell ?? 0) : here?.section === open ? here.cell : SECTIONS[open].start;
  const play = armed ? target : 0;
  const view = open === null ? FULL : { start: SECTIONS[open].start, len: SECTIONS[open].len };

  // Legs move only while the robot is travelling to a new step.
  const walkTimer = useRef<number | undefined>(undefined);
  const walk = () => {
    setWalking(true);
    window.clearTimeout(walkTimer.current);
    walkTimer.current = window.setTimeout(() => setWalking(false), 560);
  };

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setArmed(true);
      walk();
    });
    return () => {
      cancelAnimationFrame(id);
      window.clearTimeout(walkTimer.current);
    };
  }, []);

  // Focus in, trap Tab, close on Escape, lock page scroll.
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
    return () => {
      document.removeEventListener("keydown", onKey);
      [html.style.overflow, document.body.style.overflow] = prev;
      window.clearTimeout(timer.current);
    };
  }, [onClose]);

  useEffect(() => {
    if (open === null) return;
    // If the unfolded steps run past the bottom, bring the section to the top of the list.
    const nav = list.current;
    const tail = nav?.querySelector(`[data-tail="${open}"]`);
    const row = nav?.querySelector<HTMLElement>(`[data-step="${open}"]`);
    if (!nav || !tail || !row || tail.getBoundingClientRect().bottom <= nav.getBoundingClientRect().bottom) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    nav.scrollTo({ top: row.offsetTop, behavior: reduce ? "auto" : "smooth" });
  }, [open]);

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

  return (
    <div ref={root} role="dialog" aria-modal="true" aria-label="Menu" className={`${s.shell} fixed inset-0 z-[80] bg-[#090909] text-[#eceae3]`}>
      {/* Run header */}
      <div className={`${s.head} flex h-16 items-center justify-between gap-3 border-b border-[#eceae3]/15 pl-4 pr-2`}>
        <div className="flex min-w-0 items-center gap-3">
          <Image src="/logos/uncoil/uncoil-icon.svg" alt="" width={34} height={34} unoptimized className="size-[34px] shrink-0" />
          <div className="min-w-0">
            <p className={`${mono} flex items-center gap-2 text-[11px] text-[#eceae3]`}>
              <span className={`size-1.5 shrink-0 bg-[#f4d44d] ${s.blink}`} aria-hidden="true" />
              Trace · uncoil.dev
            </p>
            <p className={`${mono} mt-1 truncate text-[10px] text-[#eceae3]/50`}>
              {here ? `on ${SECTIONS[here.section].links[here.link].href} · ` : ""}5 steps · {N} pages
            </p>
          </div>
        </div>
        <button ref={closeBtn} type="button" onClick={onClose} aria-label="Close menu" className="flex size-12 shrink-0 items-center justify-center bg-[#f4d44d] text-[#090909] outline-offset-2 focus-visible:outline-2 focus-visible:outline-[#eceae3]">
          <X className="size-6" aria-hidden="true" />
        </button>
      </div>

      {/* Sky and timeline ruler: the robot rides the playhead */}
      <div className={`${s.sky} relative grid h-[84px] grid-cols-[56px_minmax(0,1fr)] overflow-hidden pr-4`} aria-hidden="true">
        {STARS.map(([x, y, yel]) => (
          <span key={`${x}-${y}`} className={`absolute size-[3px] ${yel ? "bg-[#f4d44d]" : "bg-[#eceae3]/70"}`} style={{ left: `${x}%`, top: y }} />
        ))}
        <span className={`${mono} self-end pb-[1px] pl-4 text-[9px] text-[#eceae3]/45`}>step</span>
        <div className="relative">
          <Sun className="absolute bottom-[17px] right-[-22px] h-[36px] w-[75px]" />
          <span className="absolute inset-x-0 bottom-[14px] h-[3px] bg-[#eceae3]" />
          <Zoom view={view} className="absolute inset-0">
            {Array.from({ length: N }, (_, i) => {
              const major = SECTIONS.find((x) => x.start === i);
              return (
                <span key={i} className="relative self-end" style={{ gridRow: 1, gridColumn: i + 1 }}>
                  <span className="block h-3.5">
                    <span className={`absolute bottom-[6px] left-0 w-0.5 ${major ? "h-2 bg-[#eceae3]" : "h-1 bg-[#eceae3]/35"}`} />
                    {major && <span className={`absolute bottom-0 font-mono text-[9px] leading-none text-[#f4d44d] ${i > N - 3 ? "right-full mr-1" : "left-1"}`}>0{major.index + 1}</span>}
                  </span>
                </span>
              );
            })}
          </Zoom>
          <span className={`absolute bottom-[17px] w-[30px] -translate-x-1/2 ${s.walk} ${walking ? s.walking : ""}`} style={{ left: `${((play + 0.5 - view.start) / view.len) * 100}%` }}>
            {copy === "copied" && <Bubble className="absolute -top-[26px] left-[18px] w-[27px]" />}
            <Robot className="block h-[39px] w-[30px]" legClass={[s.legA, s.legB]} />
          </span>
        </div>
      </div>

      {/* The waterfall */}
      <nav ref={list} aria-label="Site" className={`${s.list} relative overflow-y-auto overscroll-contain pb-3`}>
        <Link href="/" onClick={onClose} className="group relative grid min-h-16 grid-cols-[56px_minmax(0,1fr)] pr-4 pt-2">
          <span className="pointer-events-none absolute left-[5px] top-[18px] size-3 border-2 border-[#eceae3] bg-[#090909]" />
          <span className={`${line} bottom-0 left-[10px] top-[30px] w-0.5`} />
          <span className="col-start-2 grid gap-2">
            <span className="flex h-8 items-baseline gap-2">
              <span className="font-pixel text-[26px] leading-none tracking-[-0.05em] group-hover:text-[#fff4b5]">uncoil.dev</span>
              <span className={`${mono} text-[10px] text-[#eceae3]/45`}>home · {N} pages</span>
            </span>
            <Lane view={view} from={0} len={N} kind="root" here={null} play={play} delay={0} />
          </span>
        </Link>

        <ul>
          {SECTIONS.map((sec) => {
            const isOpen = open === sec.index;
            const holdsHere = here?.section === sec.index;
            const last = sec.index === LAST;
            const rowCls = `group relative grid w-full grid-cols-[56px_minmax(0,1fr)] pr-4 pb-2.5 pt-2 text-left ${s.rise} outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-[#f4d44d]`;
            const body = (
              <>
                <span className={`${line} left-[10px] top-0 w-0.5 ${last ? "h-[32px]" : "bottom-0"}`} />
                <span className={`${line} left-[10px] top-[31px] h-0.5 w-3.5`} />
                <span className={`pointer-events-none absolute left-[22px] top-[27px] size-2.5 ${holdsHere ? "bg-[#f4d44d]" : "bg-[#eceae3]"}`} />
                {isOpen && <span className={`${line} bottom-0 left-[26px] top-[37px] w-0.5`} />}
                <span className={`pointer-events-none absolute left-[36px] top-[26px] font-mono text-[10px] leading-none ${isOpen ? "text-[#f4d44d]" : "text-[#eceae3]/45"}`}>0{sec.index + 1}</span>
                <span className="col-start-2 grid gap-1.5">
                  <span className="flex h-[46px] items-center justify-between gap-3">
                    <span className={`font-pixel text-[clamp(32px,10.5vw,46px)] leading-none tracking-[-0.05em]`}>{sec.name}</span>
                    {sec.href ? (
                      <ArrowRight className="size-6 shrink-0 text-[#f4d44d]" aria-hidden="true" />
                    ) : (
                      <Caret className={`h-[14px] w-[10px] shrink-0 text-[#f4d44d] transition-transform duration-150 motion-reduce:transition-none ${isOpen ? "rotate-90" : ""}`} />
                    )}
                  </span>
                  <Lane view={view} from={sec.start} len={sec.len} kind="step" here={holdsHere ? here.cell : null} play={play} delay={60 + sec.start * 14} label={plural(sec.len)} />
                </span>
              </>
            );
            return (
              <li key={sec.name} data-step={sec.index}>
                {sec.href ? (
                  <Link href={sec.href} onClick={onClose} aria-current={holdsHere ? "page" : undefined} className={rowCls} style={d(sec.index * 40)}>
                    {body}
                  </Link>
                ) : (
                  <button type="button" onClick={() => {
                      setOpen(isOpen ? null : sec.index);
                      walk();
                    }} aria-expanded={isOpen} aria-controls={`trace-${sec.index}`} className={rowCls} style={d(sec.index * 40)}>
                    {body}
                  </button>
                )}
                {!sec.href && (
                  <ul id={`trace-${sec.index}`} hidden={!isOpen}>
                    {isOpen &&
                      sec.links.map((ln, j) => {
                        const isHere = holdsHere && here.link === j;
                        const tail = j === sec.links.length - 1;
                        return (
                          <li key={ln.href + j} data-tail={tail ? sec.index : undefined}>
                            <Link
                              href={href(ln.href)}
                              onClick={onClose}
                              aria-current={isHere ? "page" : undefined}
                              className={`group relative grid min-h-[58px] grid-cols-[56px_minmax(0,1fr)] pb-2.5 pr-4 pt-2 ${s.rise} outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-[#f4d44d] ${isHere ? "bg-[#eceae3]/[0.06]" : ""}`}
                              style={d(j * 40)}
                            >
                              {isHere && <span className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-[#f4d44d]" />}
                              <span className={`${line} bottom-0 left-[10px] top-0 w-0.5`} />
                              <span className={`${line} left-[26px] top-0 w-0.5 ${tail ? "h-[24px]" : "bottom-0"}`} />
                              <span className={`${line} left-[26px] top-[23px] h-0.5 w-3.5`} />
                              <span className={`pointer-events-none absolute left-[39px] top-[20px] size-2 ${isHere ? "bg-[#f4d44d]" : "bg-[#eceae3]"}`} />
                              <span className="col-start-2 grid gap-1.5">
                                <span className="flex h-[30px] min-w-0 items-center gap-2.5">
                                  <span className="shrink-0 font-pixel text-[clamp(21px,6.6vw,27px)] leading-none tracking-[-0.04em] group-hover:text-[#fff4b5]">{ln.label}</span>
                                  {isHere && <span className={`${mono} shrink-0 bg-[#f4d44d] px-1.5 py-1 text-[9px] leading-none text-[#090909]`}>You are here</span>}
                                </span>
                                <Lane view={view} from={ln.cell} len={1} kind="child" here={isHere ? ln.cell : null} play={play} wait={sec.start} delay={j * 45 + 60} label={ln.href} />
                              </span>
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
      <div className={`${s.acts} grid gap-2 border-t border-[#eceae3]/15 bg-[#090909] p-3 pb-[max(12px,env(safe-area-inset-bottom))]`}>
        {copy === "blocked" && (
          <div className="grid gap-2 border border-[#eceae3]/30 p-3">
            <p className={`${mono} text-[10px] text-[#eceae3]/70`}>Copy blocked · select the prompt and copy it</p>
            <textarea ref={box} readOnly value={SETUP_PROMPT} rows={5} aria-label="Setup prompt" className="w-full resize-none bg-[#090909] p-2 font-mono text-[11px] leading-5 text-[#eceae3] outline outline-1 outline-[#eceae3]/20 focus:outline-[#f4d44d]" />
            <button type="button" onClick={() => setCopy("idle")} className={`${mono} h-12 border border-[#eceae3]/30 text-[11px]`}>
              Done
            </button>
          </div>
        )}
        <Link href={appHref("/sign-up")} onClick={onClose} className={`${mono} flex h-14 items-center justify-between bg-[#f4d44d] px-5 text-[12px] text-[#090909] outline-offset-2 focus-visible:outline-2 focus-visible:outline-[#eceae3]`}>
          Start free <ArrowRight className="size-5" aria-hidden="true" />
        </Link>
        <div className={`${s.pair} grid grid-cols-[minmax(0,1fr)_auto] gap-2`}>
          <button type="button" onClick={copyPrompt} className={`${mono} flex h-12 min-w-0 items-center justify-between gap-2 border px-4 text-[11px] outline-offset-2 focus-visible:outline-2 focus-visible:outline-[#f4d44d] ${copy === "copied" ? "border-[#eceae3] bg-[#eceae3] text-[#090909]" : "border-[#eceae3]/35"}`}>
            <span className="truncate">{copy === "copied" ? "Copied · paste it in" : "Copy setup prompt"}</span>
            {copy === "copied" ? <Check className="size-4 shrink-0" aria-hidden="true" /> : <Copy className="size-4 shrink-0" aria-hidden="true" />}
          </button>
          <Link href="/cloud?next=/sign-in" onClick={onClose} className={`${mono} flex h-12 items-center border border-[#eceae3]/35 px-4 text-[11px] outline-offset-2 focus-visible:outline-2 focus-visible:outline-[#f4d44d]`}>
            Sign in
          </Link>
        </div>
        <span className="sr-only" role="status">
          {copy === "copied" ? "Setup prompt copied" : ""}
        </span>
      </div>
    </div>
  );
}
