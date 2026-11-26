"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { appHref } from "@/lib/app-links";
import { KIT, SPRITE, spritePaths, type KitItem } from "./kit";
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
    <section id="kit" className="bg-[#090909] px-5 pb-24 pt-12 text-[#eceae3] md:px-10 md:pb-32 md:pt-16" aria-labelledby="mix-kit-title">
      <div className="mx-auto max-w-[1320px]">
        <p className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.18em]">
          <span>06</span>
          <span className="h-px flex-1 bg-[#eceae3]/60" />
          <span>What you get</span>
        </p>
        <h2 id="mix-kit-title" className="mt-10 max-w-[14ch] font-pixel text-[clamp(2.6rem,6.4vw,6.5rem)] leading-[0.9] tracking-[-0.07em]">
          Pack for the 2am incident.
        </h2>

        <div ref={ref} className="mt-12 grid gap-6 md:mt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10">
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
                  className={`group relative grid aspect-square place-items-center border transition-colors ${on ? "border-[#f4d44d] bg-[#eceae3]/10" : "border-[#eceae3]/25 hover:border-[#eceae3]/70"}`}
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
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="grid gap-6 sm:grid-cols-[auto_1fr] sm:gap-8"
              >
                <Sprite item={item} className="size-16 sm:size-24 md:size-32" />
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#eceae3]/55">
                    Item {String(active + 1).padStart(2, "0")} / {String(KIT.length).padStart(2, "0")}
                  </p>
                  <h3 className="mt-3 font-pixel text-[clamp(2rem,3.4vw,3rem)] leading-[0.92] tracking-[-0.06em]">{item.title}</h3>
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

        <Link
          href={appHref("/demo/project")}
          className="group mt-12 flex flex-col gap-4 border-y-2 border-[#eceae3] py-6 transition-colors hover:bg-[#eceae3] hover:text-black sm:flex-row sm:items-end sm:justify-between md:mt-16 md:px-2"
        >
          <span>
            <span className="block font-mono text-[10px] uppercase tracking-[0.18em] opacity-60">Check it yourself · no sign-up</span>
            <span className="mt-3 block font-pixel text-[clamp(2.2rem,5vw,4.5rem)] leading-[0.9] tracking-[-0.07em]">Open the live demo</span>
          </span>
          <span className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.14em]">
            A sample project with a week of example runs
            <ArrowUpRight className="size-5 shrink-0 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </Link>
      </div>
    </section>
  );
}
