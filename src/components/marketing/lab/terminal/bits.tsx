"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { SETUP_PROMPT } from "./setup-prompt";

/** Copies text and reports success for a moment. Falls back to a hidden textarea where the clipboard API is blocked. */
export function useCopy() {
  const [done, setDone] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setDone(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDone(false), 1800);
  }
  return { done, copy };
}

export function CopyPromptButton({ className = "" }: { className?: string }) {
  const { done, copy } = useCopy();
  return (
    <button
      type="button"
      onClick={() => copy(SETUP_PROMPT)}
      className={`group inline-flex min-h-12 items-center justify-between gap-4 bg-[#f4d44d] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-black transition-colors hover:bg-white ${className}`}
    >
      <span>{done ? "Copied. Paste it in your agent" : "Copy setup prompt"}</span>
      <span className="grid size-7 place-items-center bg-black text-[#f4d44d]">
        {done ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
      </span>
      <span className="sr-only" role="status">{done ? "Setup prompt copied" : ""}</span>
    </button>
  );
}

// 7x7 status sprites, drawn on the same pixel grid as the rest of the page.
const SPRITES = {
  ok: [".......", "......#", ".....##", "#...##.", "##.##..", ".###...", "..#...."],
  warn: ["...#...", "...#...", "...#...", "...#...", ".......", "...#...", "......."],
  fail: ["#.....#", ".#...#.", "..#.#..", "...#...", "..#.#..", ".#...#.", "#.....#"],
} as const;

export function Sprite({ kind, className = "" }: { kind: keyof typeof SPRITES; className?: string }) {
  let d = "";
  SPRITES[kind].forEach((row, y) => [...row].forEach((c, x) => c === "#" && (d += `M${x} ${y}h1v1h-1z`)));
  return (
    <svg viewBox="0 0 7 7" className={`size-[0.8em] shrink-0 ${className}`} shapeRendering="crispEdges" aria-hidden="true">
      <path d={d} fill="currentColor" />
    </svg>
  );
}

/** The Dissolve mark, assembling bar by bar from scattered pixels. Loops slowly unless reduced motion is on. */
export function DissolveMark({ className = "", loop = true }: { className?: string; loop?: boolean }) {
  const reduce = useReducedMotion();
  const bars = [
    { y: 0, w: 50 },
    { y: 14, w: 26 },
    { y: 28, w: 18 },
  ];
  const bayer = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ];
  return (
    <svg viewBox="0 0 50 38" className={className} shapeRendering="crispEdges" aria-hidden="true">
      {bars.map(({ y: y0, w }, b) => {
        let d = "";
        const x0 = 50 - w;
        for (let y = y0; y < y0 + 10; y++)
          for (let x = x0; x < 50; x++) if (bayer[y % 4][x % 4] / 16 < ((x - x0 + 0.5) / w) * 1.9 - 0.15) d += `M${x} ${y}h1v1h-1z`;
        return (
          <motion.path
            key={b}
            d={d}
            fill="#f4d44d"
            initial={reduce ? false : { opacity: 0, x: -14 }}
            animate={reduce ? undefined : loop ? { opacity: [0, 1, 1, 0], x: [-14, 0, 0, 6] } : { opacity: 1, x: 0 }}
            transition={loop ? { duration: 4.2, times: [0, 0.18, 0.86, 1], delay: b * 0.22, repeat: Infinity, repeatDelay: 0.6, ease: "easeOut" } : { duration: 0.7, delay: b * 0.18, ease: "easeOut" }}
          />
        );
      })}
    </svg>
  );
}
