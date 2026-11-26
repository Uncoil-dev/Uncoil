"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Pause, Play } from "lucide-react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { KIT, SPRITE, spritePaths, type KitItem } from "./kit";
import { DUR, EASE, H2, H3, LABEL, SECTION, WRAP } from "./ui";
import { useCalm } from "./use-calm";
import { useCell } from "./use-grid";

/** Border widths for one cursor corner: one page cell on the two sides it draws. */
function cornerWidths(c: string, cell: number) {
  return { borderLeftWidth: c.includes("border-l") ? cell : 0, borderRightWidth: c.includes("border-r") ? cell : 0, borderTopWidth: c.includes("border-t") ? cell : 0, borderBottomWidth: c.includes("border-b") ? cell : 0 };
}

/** An item sprite drawn on the page grid: one sprite pixel is one page cell. */
function Sprite({ item, cell, className }: { item: KitItem; cell: number; className?: string }) {
  const { cream, yellow } = spritePaths(item.sprite);
  return (
    <svg viewBox={`-1 -1 ${SPRITE + 2} ${SPRITE + 2}`} width={(SPRITE + 2) * cell} height={(SPRITE + 2) * cell} shapeRendering="crispEdges" className={className} aria-hidden="true">
      <path d={cream} fill="#eceae3" />
      <path d={yellow} fill="#f4d44d" />
    </svg>
  );
}

/**
 * "What you get" as the robot's inventory screen: the headline sits in the screen's title bar,
 * six slots, one selected, and an item panel that reads it out. It steps through the slots on its
 * own while on screen, until the visitor picks one, pauses it, or hovers or focuses inside it.
 */
export function Inventory() {
  const calm = useCalm();
  const cell = useCell();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  const [active, setActive] = useState(0);
  const [touched, setTouched] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hold, setHold] = useState(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const item = KIT[active];
  const cycling = !calm && !touched && !paused;

  useEffect(() => {
    if (!cycling || hold || !inView) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % KIT.length), 2600);
    return () => window.clearInterval(id);
  }, [cycling, hold, inView]);

  const pick = (i: number) => {
    setTouched(true);
    setActive(i);
  };
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const cols = 3;
    const map: Record<string, number> = { ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + cols, ArrowUp: i - cols, Home: 0, End: KIT.length - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    const n = (map[e.key] + KIT.length) % KIT.length;
    pick(n);
    tabs.current[n]?.focus();
  };

  return (
    <section id="kit" className={`scroll-mt-16 bg-[#090909] text-[#eceae3] ${SECTION}`} aria-labelledby="mix-kit-title">
      <div className={WRAP}>
        <div ref={ref} className="border-2 border-[#eceae3] p-2 shadow-[inset_0_0_0_4px_#090909,inset_0_0_0_6px_#eceae3] sm:p-3" onPointerEnter={() => setHold(true)} onPointerLeave={() => setHold(false)} onFocus={() => setHold(true)} onBlur={() => setHold(false)}>
          <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-[#eceae3] px-3 pb-5 pt-4 sm:px-5 md:px-6 md:pt-6">
            <div>
              <p className={`text-[#eceae3]/60 ${LABEL}`}>05 · Inventory · what you get</p>
              <h2 id="mix-kit-title" className={`mt-3 max-w-[20ch] ${H2}`}>Built for reading agent runs, not log files.</h2>
            </div>
            {!calm && !touched && (
              <button type="button" onClick={() => setPaused((p) => !p)} aria-pressed={paused} className={`inline-flex min-h-11 items-center gap-2 border border-[#eceae3]/40 px-3 hover:border-[#eceae3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4d44d] ${LABEL}`}>
                {paused ? <Play className="size-3.5" aria-hidden="true" /> : <Pause className="size-3.5" aria-hidden="true" />}
                {paused ? "Play" : "Pause"}
              </button>
            )}
          </div>

          <div className="grid gap-4 p-3 sm:p-5 md:p-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-8">
            <div role="tablist" aria-label="What Uncoil gives you" className="grid grid-cols-3 gap-2 self-start sm:gap-3">
              {KIT.map((k, i) => {
                const on = i === active;
                return (
                  <button
                    key={k.id}
                    ref={(el) => {
                      tabs.current[i] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`kit-tab-${k.id}`}
                    aria-selected={on}
                    aria-controls="kit-panel"
                    aria-label={k.title}
                    tabIndex={on ? 0 : -1}
                    onClick={() => pick(i)}
                    onKeyDown={(e) => onKey(e, i)}
                    className={`group relative grid aspect-square place-items-center border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eceae3] ${on ? "border-[#f4d44d] bg-[#eceae3]/10" : "border-[#eceae3]/25 hover:border-[#eceae3]/70"}`}
                  >
                    <Sprite item={k} cell={cell} />
                    <span className="absolute left-1.5 top-1 font-mono text-[9px] text-[#eceae3]/45">{String(i + 1).padStart(2, "0")}</span>
                    {on && (
                      <motion.span layoutId={calm ? undefined : "kit-cursor"} aria-hidden="true" className="pointer-events-none absolute" style={{ inset: -cell }} transition={{ type: "spring", stiffness: 500, damping: 40 }}>
                        {["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "bottom-0 left-0 border-b border-l", "bottom-0 right-0 border-b border-r"].map((c) => (
                          <span key={c} className={`absolute border-[#f4d44d] ${c}`} style={{ width: 3 * cell, height: 3 * cell, ...cornerWidths(c, cell) }} />
                        ))}
                      </motion.span>
                    )}
                  </button>
                );
              })}
            </div>

            <div id="kit-panel" role="tabpanel" aria-labelledby={`kit-tab-${item.id}`} className="relative min-h-[23rem] border border-[#eceae3]/30 p-5 sm:min-h-[16rem] md:p-7">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={item.id}
                  initial={calm ? false : { opacity: 0, clipPath: "inset(0 100% 0 0)" }}
                  animate={{ opacity: 1, clipPath: "inset(0 0% 0 0)" }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  transition={{ duration: DUR.fast, ease: EASE }}
                  className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-8"
                >
                  <Sprite item={item} cell={cell} />
                  <div className="min-w-0">
                    <p className={`text-[#eceae3]/55 ${LABEL}`}>
                      Item {String(active + 1).padStart(2, "0")} / {String(KIT.length).padStart(2, "0")}
                    </p>
                    <h3 className={`mt-3 ${H3}`}>{item.title}</h3>
                    <p className="mt-4 max-w-md text-base leading-7 text-[#eceae3]/80">{item.body}</p>
                    <ul className="mt-6 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.1em]" aria-label="Example">
                      {item.sample.map((x, i) => (
                        <li key={x} className={i === 0 ? "bg-[#f4d44d] px-2 py-1 text-black" : "border border-[#eceae3]/40 px-2 py-1 text-[#eceae3]/80"}>
                          {x}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
