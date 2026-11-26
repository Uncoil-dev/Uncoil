"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { KIT, SPRITE, spritePaths, type KitItem } from "./kit";
import { Eyebrow, NextStep } from "./eyebrow";
import { AFTER_EYEBROW, AFTER_HEADLINE, DUR, EASE, H2, H3, LABEL, SECTION, WRAP } from "./ui";
import { useCalm } from "./use-calm";

function Sprite({ item, className }: { item: KitItem; className?: string }) {
  const { cream, yellow } = spritePaths(item.sprite);
  return (
    <svg viewBox={`-1 -1 ${SPRITE + 2} ${SPRITE + 2}`} shapeRendering="crispEdges" className={className} aria-hidden="true">
      <path d={cream} fill="#eceae3" />
      <path d={yellow} fill="#f4d44d" />
    </svg>
  );
}

/**
 * "What you get" as the robot's inventory screen: eight slots, one selected, and an item panel
 * that reads it out. It steps through the slots on its own while on screen, until the visitor
 * picks one.
 */
export function Inventory() {
  const calm = useCalm();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  const [active, setActive] = useState(0);
  const [touched, setTouched] = useState(false);
  const item = KIT[active];

  useEffect(() => {
    if (calm || touched || !inView) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % KIT.length), 2600);
    return () => window.clearInterval(id);
  }, [calm, touched, inView]);

  const pick = (i: number) => {
    setTouched(true);
    setActive(i);
  };

  return (
    <section id="kit" className={`scroll-mt-16 bg-[#090909] text-[#eceae3] ${SECTION}`} aria-labelledby="mix-kit-title">
      <div className={WRAP}>
        <Eyebrow n="06" on="ink">What you get</Eyebrow>
        <h2 id="mix-kit-title" className={`${AFTER_EYEBROW} max-w-[18ch] ${H2}`}>
          Built for reading agent runs, not log files.
        </h2>

        <div ref={ref} className={`${AFTER_HEADLINE} grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10`}>
          <div role="tablist" aria-label="What Uncoil gives you" className="grid grid-cols-4 gap-2 self-start border-2 border-[#eceae3] p-2 shadow-[inset_0_0_0_4px_#090909,inset_0_0_0_6px_#eceae3] sm:gap-3 sm:p-4 md:p-5">
            {KIT.map((k, i) => {
              const on = i === active;
              return (
                <button
                  key={k.id}
                  type="button"
                  role="tab"
                  id={`kit-tab-${k.id}`}
                  aria-selected={on}
                  aria-controls="kit-panel"
                  aria-label={k.title}
                  onClick={() => pick(i)}
                  className={`group relative grid aspect-square place-items-center border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eceae3] ${on ? "border-[#f4d44d] bg-[#eceae3]/10" : "border-[#eceae3]/25 hover:border-[#eceae3]/70"}`}
                >
                  <Sprite item={k} className="size-[62%] transition-transform group-hover:-translate-y-0.5" />
                  <span className="absolute left-1.5 top-1 font-mono text-[9px] text-[#eceae3]/45">{String(i + 1).padStart(2, "0")}</span>
                  {on && (
                    <motion.span layoutId={calm ? undefined : "kit-cursor"} aria-hidden="true" className="pointer-events-none absolute -inset-[5px]" transition={{ type: "spring", stiffness: 500, damping: 40 }}>
                      {["left-0 top-0 border-l-4 border-t-4", "right-0 top-0 border-r-4 border-t-4", "bottom-0 left-0 border-b-4 border-l-4", "bottom-0 right-0 border-b-4 border-r-4"].map((c) => (
                        <span key={c} className={`absolute size-3 border-[#f4d44d] ${c}`} />
                      ))}
                    </motion.span>
                  )}
                </button>
              );
            })}
          </div>

          <div id="kit-panel" role="tabpanel" aria-labelledby={`kit-tab-${item.id}`} className="relative min-h-[25rem] border-2 border-[#eceae3] bg-[#090909] p-5 sm:min-h-[17rem] md:p-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={item.id}
                initial={calm ? false : { opacity: 0, clipPath: "inset(0 100% 0 0)" }}
                animate={{ opacity: 1, clipPath: "inset(0 0% 0 0)" }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={{ duration: DUR.fast, ease: EASE }}
                className="grid gap-6 sm:grid-cols-[auto_1fr] sm:gap-8"
              >
                <Sprite item={item} className="size-16 sm:size-24 md:size-32" />
                <div className="min-w-0">
                  <p className={`text-[#eceae3]/55 ${LABEL}`}>
                    Item {String(active + 1).padStart(2, "0")} / {String(KIT.length).padStart(2, "0")}
                  </p>
                  <h3 className={`mt-3 ${H3}`}>{item.title}</h3>
                  <p className="mt-4 max-w-md text-base leading-7 text-[#eceae3]/80">{item.body}</p>
                  <ul className="mt-6 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.1em]" aria-label="Example">
                    {item.sample.map((s, i) => (
                      <li key={s} className={i === 0 ? "bg-[#f4d44d] px-2 py-1 text-black" : "border border-[#eceae3]/40 px-2 py-1 text-[#eceae3]/80"}>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <NextStep href="#price" on="ink">What each plan includes</NextStep>
      </div>
    </section>
  );
}
