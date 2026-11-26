"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, ArrowUpRight, Check, Copy, X } from "lucide-react";
import { appHref } from "@/lib/app-links";
import { authClient } from "@/lib/auth-client";
import { MapCanvas } from "./map-canvas";
import { mapLayout } from "./map-layout";
import { SETUP_PROMPT } from "./setup-prompt";
import { isCurrent, STOPS, stopForPath } from "./stops";
import { useCalm } from "./use-calm";

const mono = "font-mono text-[10px] uppercase tracking-[0.16em]";
const LINKS = STOPS.reduce((n, s) => n + s.links.length, 0);
const QUICK = [
  ["Docs", "/docs"],
  ["Demo", appHref("/demo/project")],
  ["Pricing", "/pricing"],
] as const;

/**
 * The phone menu as a level-select map: five signs on a switchback trail, a robot that walks to
 * the sign you tap, and a notice board with that stop's pages. Links are plain anchors, so a tap
 * never waits for the robot.
 */
export function MenuMap({ path, onClose }: { path: string; onClose: () => void }) {
  const calm = useCalm();
  const { data: session } = authClient.useSession();
  const [stop, setStop] = useState(() => stopForPath(path) + 1);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [copy, setCopy] = useState<"idle" | "done" | "blocked">("idle");
  const [cheer, setCheer] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const map = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const prompt = useRef<HTMLTextAreaElement>(null);
  const layout = useMemo(() => mapLayout(size.w, size.h), [size]);
  const scale = size.h < 300 || size.w < 340 ? 2 : size.w >= 380 && size.h >= 420 ? 4 : 3;

  useEffect(() => {
    close.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const el = map.current;
    if (!el) return;
    const measure = () => {
      const m = el.getBoundingClientRect();
      setSize((s) => (s.w === m.width && s.h === m.height ? s : { w: m.width, h: m.height }));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (copy === "blocked") prompt.current?.focus();
    if (copy !== "done") return;
    const id = window.setTimeout(() => setCopy("idle"), 2200);
    return () => window.clearTimeout(id);
  }, [copy]);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(SETUP_PROMPT);
      setCopy("done");
      setCheer((n) => n + 1);
    } catch {
      setCopy("blocked");
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !root.current) return;
    const items = [...root.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), textarea")];
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const open = stop > 0 ? STOPS[stop - 1] : null;
  const ready = size.w > 0;

  return (
    <div ref={root} role="dialog" aria-modal="true" aria-label="Site menu" onKeyDown={onKeyDown} className="fixed inset-0 z-[90] flex flex-col bg-[#090909] text-[#eceae3]">
      <style>{KEYFRAMES}</style>
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/15 pl-4 pr-1.5">
        <Link href="/" onClick={onClose} aria-label="Uncoil home" className="flex min-h-12 items-center">
          <Image src="/logos/uncoil/uncoil-logo-crisp-on-dark.svg" alt="Uncoil" width={150} height={28} unoptimized className="h-7 w-[150px]" />
        </Link>
        <div className="flex items-center gap-1">
          {session ? null : (
            <Link href="/cloud?next=/sign-in" onClick={onClose} className={`${mono} flex min-h-12 items-center px-3 text-white/75 hover:text-white`}>
              Sign in
            </Link>
          )}
          <button ref={close} type="button" onClick={onClose} aria-label="Close menu" className="flex size-12 items-center justify-center bg-[#f4d44d] text-black">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mm-body grid min-h-0 flex-1">
        <div ref={map} className="mm-map relative min-h-0 overflow-hidden">
          {ready && <MapCanvas layout={layout} scale={scale} target={stop} cheer={cheer} calm={calm} />}
          <p className={`${mono} pointer-events-none absolute right-2 top-1.5 bg-[#090909] px-1.5 py-1 text-white/55`} aria-hidden="true">
            World 01 · <span className="text-[#f4d44d]">0{Math.max(stop, 0)}</span>/05
          </p>
          <nav aria-label="Site sections">
            <ul>
              {ready &&
                STOPS.map((s, i) => {
                  const box = layout.signs[i];
                  const on = stop === i + 1;
                  const left = layout.sides[i + 1] === "left";
                  return (
                    <li key={s.name} className={`absolute flex ${left ? "justify-end" : ""}`} style={{ left: box.x, top: box.y, width: box.w, height: box.h }}>
                      <button
                        type="button"
                        onClick={() => setStop(i + 1)}
                        aria-expanded={on}
                        aria-controls="mm-board"
                        className={`flex h-full min-w-0 max-w-full items-center gap-1.5 border-2 px-2 shadow min-[360px]:gap-2 min-[360px]:px-3-[3px_3px_0_0_rgba(236,234,227,0.22)] transition-colors ${on ? "border-[#f4d44d] bg-[#f4d44d] text-black" : "border-[#eceae3] bg-[#090909] hover:border-[#f4d44d]"}`}
                      >
                        <span className={`font-mono text-[10px] tracking-[0.1em] ${on ? "text-black" : "text-[#f4d44d]"}`}>0{i + 1}</span>
                        <span className="min-w-0 truncate font-pixel text-[15px] leading-none min-[360px]:text-[17px] tracking-[-0.03em]">{s.name}</span>
                      </button>
                    </li>
                  );
                })}
            </ul>
          </nav>
        </div>

        <section id="mm-board" aria-labelledby="mm-board-title" className="mm-board relative flex min-h-0 flex-col border-2 border-[#eceae3] bg-[#090909]">
          <div className="flex shrink-0 items-center justify-between gap-3 bg-[#eceae3] px-3 py-2 text-black">
            <h2 id="mm-board-title" className="flex items-baseline gap-2 font-pixel text-[22px] leading-none tracking-[-0.04em]">
              <span className="font-mono text-[11px] tracking-[0.1em]">0{stop}</span>
              {open ? open.name : "Trailhead"}
            </h2>
            <span className={`${mono} text-black/60`}>{open ? `${open.links.length} ${open.links.length === 1 ? "page" : "pages"}` : `05 stops · ${LINKS} pages`}</span>
          </div>
          <div key={stop} className="mm-rise min-h-0 flex-1 overflow-y-auto p-1.5">
            {open ? (
              <ul className={`grid h-full gap-1.5 ${open.links.length > 1 ? "grid-cols-2" : ""}`}>
                {open.links.map((l, j) => {
                  const here = isCurrent(l.href, path);
                  return (
                    <li key={l.href} className="mm-tile" style={{ animationDelay: calm ? undefined : `${j * 35}ms` }}>
                      <Link
                        href={l.href}
                        onClick={onClose}
                        aria-current={here ? "page" : undefined}
                        className={`group flex h-full min-h-14 flex-col justify-center border px-2.5 py-2 hover:border-[#f4d44d] focus-visible:border-[#f4d44d] ${here ? "border-[#f4d44d]" : "border-white/20"} ${open.links.length === 1 ? "min-h-32 px-4" : ""}`}
                      >
                        <span className="flex items-center justify-between font-mono text-[10px] tracking-[0.1em] text-[#f4d44d]">
                          {here ? "YOU ARE HERE" : `0${stop}.${j + 1}`}
                          <ArrowUpRight className="size-3.5 opacity-60 group-hover:opacity-100" aria-hidden="true" />
                        </span>
                        <span className={`mt-1 font-pixel leading-[0.95] tracking-[-0.03em] ${open.links.length === 1 ? "text-4xl" : "text-[16px]"}`}>{l.title}</span>
                        <span className="mt-1 truncate text-[11px] leading-tight text-white/55">{l.note}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="flex h-full flex-col justify-between gap-3 px-2 pb-0.5 pt-2">
                <div>
                  <p className="font-pixel text-[clamp(2rem,10vw,2.75rem)] leading-[0.85] tracking-[-0.06em]">Pick a stop.</p>
                  <p className="mt-2 max-w-[32ch] text-[13px] leading-snug text-white/65">Tap a sign on the trail. The robot walks there and this board fills with its pages.</p>
                </div>
                <ul className="grid grid-cols-3 gap-1.5" aria-label="Shortcuts">
                  {QUICK.map(([title, href]) => (
                    <li key={href}>
                      <Link href={href} onClick={onClose} className={`${mono} flex min-h-12 items-center justify-between gap-1 border border-white/20 px-2 hover:border-[#f4d44d]`}>
                        {title} <ArrowUpRight className="size-3.5 shrink-0 text-[#f4d44d]" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        <div className="mm-dock relative grid shrink-0 grid-cols-[1fr_1.2fr] gap-2 p-3">
          {copy === "blocked" && (
            <div className="absolute inset-x-3 bottom-full z-10 mb-2 border-2 border-[#eceae3] bg-[#090909] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className={`${mono} text-white/75`}>Copy blocked. Select the prompt and copy it.</p>
                <button type="button" onClick={() => setCopy("idle")} aria-label="Close prompt" className="flex size-12 shrink-0 items-center justify-center border border-white/30">
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
              <textarea readOnly value={SETUP_PROMPT} ref={prompt} onFocus={(e) => e.currentTarget.select()} aria-label="Setup prompt" className="mt-2 h-36 w-full resize-none border border-white/30 bg-[#090909] p-2 font-mono text-[11px] leading-snug text-[#eceae3]" />
            </div>
          )}
          <Link
            href={session ? appHref("/dashboard") : appHref("/sign-up")}
            onClick={onClose}
            className={`${mono} flex min-h-[52px] items-center justify-between gap-2 whitespace-nowrap bg-[#f4d44d] px-3 text-black max-[359px]:tracking-[0.08em] min-[360px]:text-[11px]`}
          >
            {session ? "Dashboard" : "Start free"} <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
          </Link>
          <button type="button" onClick={copyPrompt} className={`${mono} flex min-h-[52px] items-center justify-between gap-2 whitespace-nowrap border-2 px-3 text-left max-[359px]:tracking-[0.08em] min-[360px]:text-[11px] ${copy === "done" ? "border-[#f4d44d]" : "border-[#eceae3]"}`}>
            <span>{copy === "done" ? "Prompt copied" : "Copy setup prompt"}</span>
            {copy === "done" ? <Check className="size-4 shrink-0 text-[#f4d44d]" aria-hidden="true" /> : <Copy className="hidden size-4 shrink-0 min-[360px]:block" aria-hidden="true" />}
          </button>
          <p className="sr-only" aria-live="polite">
            {copy === "done" ? "Setup prompt copied" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

// Portrait: map, board, dock stacked. Short landscape: map on the left, board and dock on the
// right. The board rises out of the ground in pixel steps when a stop opens.
const KEYFRAMES = `
.mm-body{grid-template-rows:minmax(0,1fr) auto auto}
.mm-board{height:min(272px,calc((100dvh - 132px) * 0.45));margin:0 12px}
@media (orientation:landscape) and (max-height:520px){
  .mm-body{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);grid-template-rows:minmax(0,1fr) auto}
  .mm-map{grid-row:span 2}
  .mm-board{height:auto;margin:10px 12px 0 0}
  .mm-dock{padding-left:0}
}
@keyframes mm-rise{from{clip-path:inset(100% 0 0 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes mm-pop{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.mm-rise{animation:mm-rise 200ms steps(5,end)}
.mm-tile{animation:mm-pop 220ms steps(4,end) both}
@media (prefers-reduced-motion:reduce){.mm-rise,.mm-tile{animation:none}}
`;
