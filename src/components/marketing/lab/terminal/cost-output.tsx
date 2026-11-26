"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { OutputHead, usePrinted } from "./turn";
import { EXPLANATION, FIXED_COST_USD, usd } from "./session";

function CountTo({ value, start }: { value: number; start: boolean }) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!start || reduce) return;
    const controls = animate(0, value, { duration: 1.4, ease: [0.16, 1, 0.3, 1], onUpdate: setV });
    return () => controls.stop();
  }, [start, reduce, value]);
  return <>{usd(reduce ? value : v)}</>;
}

export function CostOutput() {
  const inView = usePrinted();
  const burned = EXPLANATION.burnedUsd;
  const saved = Math.round((1 - FIXED_COST_USD / burned) * 100);

  return (
    <div className="border-2 border-[#090909] bg-[#090909] text-[#eceae3]">
      <OutputHead left="cost · run_9f3a vs run_a07c" right="priced per model call" />
      <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="relative aspect-[1401/1002] overflow-hidden lg:aspect-auto lg:min-h-[520px]">
          <Image src="/images/landing/cost-city.png" alt="Pixel city of cost columns with one tall yellow column standing out" fill unoptimized sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover [image-rendering:pixelated]" />
          <p className="absolute left-4 top-4 bg-[#090909] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#f4d44d] md:left-6 md:top-6">the retry that cost the most</p>
        </div>
        <div className="flex flex-col justify-between gap-8 border-t border-white/15 p-5 md:p-8 lg:border-l lg:border-t-0">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">broken run burned</p>
            <p className="mt-2 font-pixel text-[clamp(3.4rem,7vw,6.5rem)] leading-[0.85] tracking-[-0.07em] text-[#eceae3]/45 line-through decoration-[#eceae3]/45 decoration-4">
              <CountTo value={burned} start={inView} />
            </p>
            <p className="mt-2 font-mono text-[12px] text-white/50">{usd(EXPLANATION.afterUsd)} of it after refund.issue had already failed</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">fixed run costs</p>
            <p className="mt-2 font-pixel text-[clamp(4.2rem,9vw,8.5rem)] leading-[0.85] tracking-[-0.07em] text-[#f4d44d]">
              <CountTo value={FIXED_COST_USD} start={inView} />
            </p>
            <p className="mt-3 inline-block bg-[#f4d44d] px-2 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#090909]">−{saved}% per run</p>
          </div>
          <p className="max-w-sm font-sans text-base leading-7 text-[#eceae3]/70">
            Uncoil prices every model call as it lands, so you see what a bad loop costs before the invoice does. Example numbers.
          </p>
        </div>
      </div>
    </div>
  );
}
