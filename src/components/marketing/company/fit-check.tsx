"use client";

import { appHref } from "@/lib/app-links";
import { useState } from "react";
import { HeaderAction } from "./blocks";

const questions = [
  "An agent of yours produced a wrong or costly result.",
  "You can describe the failure in a sentence or two.",
  "You can share sanitized staging traces or logs.",
  "Someone owns the decision about what to change.",
] as const;

/** Four checkboxes decide whether the fit call is worth booking. Deterministic, nothing is sent. */
export function FitCheck({ href }: { href: string }) {
  const [on, setOn] = useState<boolean[]>(questions.map(() => false));
  const score = on.filter(Boolean).length;
  const verdict = score === 4 ? "Strong fit. Book the call." : score >= 2 ? "Probably a fit. Bring what you have." : "Not yet. Start with the demo or the docs.";
  return (
    <div className="border border-black bg-white">
      <ul className="divide-y divide-black">
        {questions.map((q, i) => (
          <li key={q}>
            <label className="flex cursor-pointer items-center gap-4 p-5 hover:bg-[#f4d44d]/40">
              <input
                type="checkbox"
                checked={on[i]}
                onChange={() => setOn((s) => s.map((v, k) => (k === i ? !v : v)))}
                className="size-5 shrink-0 accent-black"
              />
              <span className="text-sm leading-6">{q}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-4 bg-[#090909] p-5 text-[#eceae3] sm:flex-row sm:items-center sm:justify-between">
        <p role="status" className="font-pixel text-2xl leading-none tracking-[-0.05em]">
          <span className="text-[#f4d44d]">{score}/4</span> {verdict}
        </p>
        <HeaderAction href={score >= 2 ? href : appHref("/demo/project")}>{score >= 2 ? "Book the fit call" : "Open the demo"}</HeaderAction>
      </div>
    </div>
  );
}
