"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { LABEL } from "./ui";
import { useCalm } from "./use-calm";
import { useCell } from "./use-grid";

// Only what the SDK READMEs document: init() traces OpenAI and Anthropic, LangChain / LangGraph
// use the handler, the Vercel AI SDK uses the middleware, and the API ingests OpenTelemetry.
const MODELS = ["OpenAI", "Anthropic", "Vercel AI SDK", "LangChain", "LangGraph"] as const;
const WIRES = ["OpenTelemetry", "TypeScript", "Python", "HTTP"] as const;

/** A bridge plank from the pixel world, used as the separator between names, on the page grid. */
function Plank({ lit, ink, cell }: { lit?: boolean; ink?: boolean; cell: number }) {
  const fill = ink ? "#090909" : lit ? "#f4d44d" : "#eceae3";
  return (
    <svg viewBox="0 0 8 3" width={8 * cell} height={3 * cell} shapeRendering="crispEdges" className="shrink-0" aria-hidden="true">
      <rect width="8" height="2" fill={fill} />
      <rect x="2" y="1" width="1" height="1" fill={ink ? "#f4d44d" : "#090909"} />
      <rect x="1" y="2" width="6" height="1" fill={fill} />
    </svg>
  );
}

function Row({ items, reverse, lit, calm }: { items: readonly string[]; reverse?: boolean; lit?: boolean; calm: boolean }) {
  const cell = useCell();
  // Four copies keep the strip wider than a 1920 screen while it slides by half its width.
  const run = [...items, ...items, ...items, ...items];
  return (
    <div className="overflow-hidden">
      <motion.div
        className="flex w-max items-center gap-[0.55em] whitespace-nowrap font-pixel text-[clamp(2rem,4.4vw,4rem)] leading-none tracking-[-0.06em]"
        animate={calm ? undefined : { x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{ duration: reverse ? 46 : 72, ease: "linear", repeat: Infinity }}
      >
        {run.map((name, i) => (
          <span key={`${name}-${i}`} className={`flex items-center gap-[0.55em] ${lit ? "text-[#090909]" : ""}`}>
            {name}
            <Plank lit={!lit && i % items.length === 0} ink={lit} cell={cell} />
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export function Tools() {
  const reduce = useCalm();
  const [paused, setPaused] = useState(false);
  const calm = reduce || paused;
  return (
    <section className="relative bg-[#090909] pt-4 text-[#eceae3] md:pt-5" aria-labelledby="mix-tools-title">
      <div className={`mx-auto flex max-w-[1360px] items-center gap-4 px-5 md:px-10 ${LABEL}`}>
        <h2 id="mix-tools-title">Works with what you already use</h2>
        <span className="h-px flex-1 bg-[#eceae3]" />
        {!reduce && (
          <button type="button" onClick={() => setPaused((p) => !p)} aria-pressed={paused} aria-label={paused ? "Play the list of integrations" : "Pause the list of integrations"} className="grid size-11 shrink-0 place-items-center border border-[#eceae3]/40 hover:border-[#eceae3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4d44d]">
            {paused ? <Play className="size-3.5" aria-hidden="true" /> : <Pause className="size-3.5" aria-hidden="true" />}
          </button>
        )}
      </div>
      <ul className="sr-only">
        {[...MODELS, ...WIRES].map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
      {/* One strip: a single line between the hero and the story, not a section of its own. */}
      <div aria-hidden="true" className="mt-4 bg-[#f4d44d] py-3 md:mt-5">
        <Row items={[...MODELS, ...WIRES]} lit calm={calm} />
      </div>
    </section>
  );
}
