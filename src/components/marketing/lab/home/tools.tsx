"use client";

import { motion } from "framer-motion";
import { useCalm } from "./use-calm";

const MODELS = ["OpenAI", "Anthropic", "Vercel AI SDK", "LangChain", "LlamaIndex"] as const;
const WIRES = ["OpenTelemetry", "TypeScript", "Python", "HTTP"] as const;

/** A bridge plank from the pixel world, used as the separator between names. */
function Plank({ lit, ink }: { lit?: boolean; ink?: boolean }) {
  const fill = ink ? "#090909" : lit ? "#f4d44d" : "#eceae3";
  return (
    <svg viewBox="0 0 11 4" shapeRendering="crispEdges" className="h-[0.32em] w-[0.88em] shrink-0" aria-hidden="true">
      <rect width="11" height="3" fill={fill} />
      <rect x="2" y="1" width="2" height="1" fill={ink ? "#f4d44d" : "#090909"} />
      <rect y="3" width="11" height="1" fill={fill} opacity="0.35" />
    </svg>
  );
}

function Row({ items, reverse, lit, calm }: { items: readonly string[]; reverse?: boolean; lit?: boolean; calm: boolean }) {
  // Four copies keep the strip wider than a 1920 screen while it slides by half its width.
  const run = [...items, ...items, ...items, ...items];
  return (
    <div className="overflow-hidden">
      <motion.div
        className="flex w-max items-center gap-[0.55em] whitespace-nowrap font-pixel text-[clamp(2rem,4.4vw,4rem)] leading-none tracking-[-0.06em]"
        animate={calm ? undefined : { x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{ duration: reverse ? 46 : 38, ease: "linear", repeat: Infinity }}
      >
        {run.map((name, i) => (
          <span key={`${name}-${i}`} className={`flex items-center gap-[0.55em] ${lit ? "text-[#090909]" : ""}`}>
            {name}
            <Plank lit={!lit && i % items.length === 0} ink={lit} />
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export function Tools() {
  const calm = useCalm();
  return (
    <section className="relative bg-[#090909] pb-2 pt-8 text-[#eceae3] md:pt-10" aria-labelledby="mix-tools-title">
      <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-5 font-mono text-[10px] uppercase tracking-[0.18em] md:px-10">
        <h2 id="mix-tools-title">Works with what you already use</h2>
        <span className="h-px flex-1 bg-[#eceae3]/40" />
      </div>
      <ul className="sr-only">
        {[...MODELS, ...WIRES].map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
      <div aria-hidden="true" className="mt-6 grid gap-3 md:mt-8">
        <div className="py-2">
          <Row items={MODELS} calm={calm} />
        </div>
        <div className="bg-[#f4d44d] py-3">
          <Row items={WIRES} reverse lit calm={calm} />
        </div>
      </div>
    </section>
  );
}
