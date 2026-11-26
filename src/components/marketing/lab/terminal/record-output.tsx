"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { OutputHead, usePrinted } from "./turn";
import { Sprite } from "./bits";

type Node = {
  id: string;
  depth: number;
  kind: "agent" | "llm" | "tool";
  name: string;
  ms: string;
  fields: [string, string][];
  status: "ok" | "warn" | "fail";
};

const RUN: Node[] = [
  { id: "a", depth: 0, kind: "agent", name: "support-agent", ms: "8.1s", status: "fail", fields: [["input", '"Refund order A-1182, it arrived broken."'], ["steps", "6"], ["cost", "$0.041"], ["result", "failed at step 5"]] },
  { id: "b", depth: 1, kind: "llm", name: "llm.chat", ms: "820ms", status: "ok", fields: [["model", "chat"], ["tokens", "412 in · 96 out"], ["cost", "$0.0121"], ["output", '"Look up the order, then check policy."']] },
  { id: "c", depth: 1, kind: "tool", name: "order.lookup", ms: "140ms", status: "ok", fields: [["args", '{ "id": "A-1182" }'], ["output", '{ "order": "A-1182" }'], ["status", "200"]] },
  { id: "d", depth: 1, kind: "tool", name: "docs.search", ms: "160ms", status: "warn", fields: [["args", '{ "q": "refund policy damaged" }'], ["output", "[]"], ["note", "empty result, model kept going"]] },
  { id: "e", depth: 1, kind: "llm", name: "llm.chat · retry", ms: "1.1s", status: "ok", fields: [["model", "chat"], ["tokens", "980 in · 140 out"], ["cost", "$0.0187"], ["output", '"Policy unclear. Issuing full refund."']] },
  { id: "f", depth: 1, kind: "tool", name: "refund.issue", ms: "5.0s", status: "fail", fields: [["args", '{ "order": "A-1182", "amount": 89 }'], ["error", "502 upstream, timed out"], ["latency", "5000ms"], ["after it", "1 more model call, $0.0102"]] },
];

// 7x7 type glyphs: a diamond for the agent, a speech block for model calls, a bracket for tools.
const GLYPH: Record<Node["kind"], string[]> = {
  agent: ["...#...", "..###..", ".#####.", "#######", ".#####.", "..###..", "...#..."],
  llm: ["#######", "#.....#", "#.#.#.#", "#.....#", "#######", ".##....", ".#....."],
  tool: ["###.###", "#.....#", "#.###.#", "#.....#", "#.###.#", "#.....#", "###.###"],
};

function Glyph({ kind }: { kind: Node["kind"] }) {
  let d = "";
  GLYPH[kind].forEach((row, y) => [...row].forEach((c, x) => c === "#" && (d += `M${x} ${y}h1v1h-1z`)));
  return (
    <svg viewBox="0 0 7 7" className="size-3 shrink-0" shapeRendering="crispEdges" aria-hidden="true">
      <path d={d} fill="currentColor" />
    </svg>
  );
}

export function RecordOutput() {
  const reduce = useReducedMotion();
  const printed = usePrinted();
  const [sel, setSel] = useState("f");
  const node = RUN.find((n) => n.id === sel)!;

  return (
    <div className="border-2 border-[#090909] bg-[#090909] text-[#eceae3]">
      <OutputHead left="run_9f3a · 6 steps recorded" right="click a step" />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="p-4 md:p-8">
          <p className="font-pixel text-[clamp(2.2rem,4.6vw,4.4rem)] leading-[0.9] tracking-[-0.07em]">
            Every step,
            <br />
            on the record.
          </p>
          <p className="mt-4 max-w-md font-sans text-base leading-7 text-[#eceae3]/70">
            Each model call, tool call and retry lands as one step with its input, output, tokens, cost and timing. Pick one.
          </p>
          <ul className="mt-7 font-mono text-[12px] sm:text-[13px]" role="listbox" aria-label="Steps in the example run">
            {RUN.map((n, i) => {
              const on = n.id === sel;
              const tone = n.status === "fail" ? "text-[#ff4d3d]" : n.status === "warn" ? "text-[#fff4b5]" : "";
              return (
                <motion.li
                  key={n.id}
                  initial={reduce ? false : { opacity: 0, x: -10 }}
                  animate={printed ? { opacity: 1, x: 0 } : undefined}
                  transition={{ delay: 0.5 + i * 0.09 }}
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => setSel(n.id)}
                    className={`flex w-full items-center gap-2.5 py-1.5 pr-2 text-left transition-colors ${on ? "bg-[#eceae3] text-[#090909]" : "hover:bg-white/10"}`}
                    style={{ paddingLeft: `${0.5 + n.depth * 1.5}rem` }}
                  >
                    <span className={on ? "" : "text-white/30"}>{n.depth ? (i === RUN.length - 1 ? "└─" : "├─") : "┌"}</span>
                    <span className={on ? "" : n.status === "ok" ? "text-[#f4d44d]" : tone}>
                      <Glyph kind={n.kind} />
                    </span>
                    <span className={`truncate ${on ? "" : tone}`}>{n.name}</span>
                    <span className={`ml-auto shrink-0 ${on ? "" : "text-white/45"}`}>{n.ms}</span>
                    {n.status !== "ok" && <Sprite kind={n.status} className={on ? "" : tone} />}
                  </button>
                </motion.li>
              );
            })}
          </ul>
        </div>

        <div className="relative min-h-[380px] overflow-hidden border-t border-white/15 lg:border-l lg:border-t-0">
          <Image src="/images/landing/span-anatomy.png" alt="" fill unoptimized sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover opacity-70 [image-rendering:pixelated]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,#090909_10%,rgba(9,9,9,0.55)_55%,rgba(9,9,9,0.2))]" />
          <AnimatePresence mode="wait">
            <motion.dl
              key={node.id}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-x-4 bottom-4 border border-white/25 bg-[#090909]/92 font-mono text-[12px] md:inset-x-8 md:bottom-8"
            >
              <div className="flex items-center justify-between border-b border-white/15 px-4 py-2.5 text-[10px] uppercase tracking-[0.16em]">
                <span className="text-[#f4d44d]">{node.kind} step</span>
                <span className="text-white/50">{node.ms}</span>
              </div>
              <p className="px-4 pt-3 font-pixel text-3xl tracking-[-0.05em]">{node.name}</p>
              <div className="grid gap-y-1.5 px-4 pb-4 pt-3">
                {node.fields.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[72px_1fr] gap-3">
                    <dt className="text-white/40">{k}</dt>
                    <dd className={`break-words ${k === "error" ? "text-[#ff4d3d]" : "text-[#eceae3]"}`}>{v}</dd>
                  </div>
                ))}
              </div>
            </motion.dl>
          </AnimatePresence>
        </div>
      </div>
      <p className="border-t border-white/15 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-white/45 md:px-8">
        sends from · TypeScript SDK · Python SDK · OpenTelemetry · plain HTTP
      </p>
    </div>
  );
}
