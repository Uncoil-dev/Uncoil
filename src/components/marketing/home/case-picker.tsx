"use client";

import { useRef, type KeyboardEvent } from "react";
import { CASES, type CaseId } from "./cases";
import { pickCase, useCase } from "./case-state";
import { useCell } from "./use-grid";

/** 5x5 marks for the four failures, drawn on the page grid: one mark pixel is one page cell. */
export const CASE_MARKS: Record<CaseId, readonly string[]> = {
  // A lens with nothing in it.
  empty: ["###..", "#.#..", "###..", "...#.", "....#"],
  // Round and round.
  loop: ["###.#", "#...#", "#...#", "#...#", "#.###"],
  // An hourglass that never runs out.
  timeout: ["#####", ".#.#.", "..#..", ".#.#.", "#####"],
  // A cross: the wrong one.
  wrong: ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
};

export function CaseMark({ id, cell, className }: { id: CaseId; cell: number; className?: string }) {
  let d = "";
  CASE_MARKS[id].forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === "#") d += `M${x} ${y}h1v1h-1z`;
  });
  return (
    <svg viewBox="0 0 5 5" width={5 * cell} height={5 * cell} shapeRendering="crispEdges" className={`shrink-0 ${className ?? ""}`} aria-hidden="true">
      <path d={d} fill="currentColor" />
    </svg>
  );
}

/**
 * "What broke?": the visitor picks the failure that looks like theirs, and the whole page tells
 * that one from here down. A radio group: arrow keys move and pick, like any set of options.
 */
export function CasePicker() {
  const cell = useCell();
  const c = useCase();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const next = e.key === "ArrowRight" || e.key === "ArrowDown" ? i + 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? CASES.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const n = (next + CASES.length) % CASES.length;
    pickCase(CASES[n].id);
    refs.current[n]?.focus();
  };
  return (
    <div className="mx-auto flex w-full max-w-[1360px] items-stretch gap-3 pl-5 pr-5 md:pl-10 md:pr-24 min-[1560px]:pr-10">
      <p id="case-pick-label" className="flex shrink-0 items-center py-3 text-[#eceae3]/60 max-sm:sr-only">
        What broke?<span className="hidden lg:inline">&nbsp;Pick yours</span>
      </p>
      <div role="radiogroup" aria-labelledby="case-pick-label" className="flex min-w-0 flex-1 items-stretch">
        {CASES.map((k, i) => {
          const on = k.id === c.id;
          return (
            <button
              key={k.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={k.label}
              tabIndex={on ? 0 : -1}
              onClick={() => pickCase(k.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={`flex min-h-12 min-w-12 items-center justify-center gap-2.5 px-3 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#f4d44d] sm:justify-start md:px-4 ${on ? "bg-[#f4d44d] text-black" : "text-[#eceae3]/75 hover:bg-[#eceae3]/10 hover:text-[#eceae3]"}`}
            >
              <CaseMark id={k.id} cell={cell} />
              <span className={`whitespace-nowrap ${on ? "inline" : "hidden xl:inline"}`}>{k.short}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
