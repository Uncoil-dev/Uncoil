"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Copy } from "lucide-react";
import { appHref } from "@/lib/app-links";
import { CoilArt } from "./coil-art";
import { CopyPromptButton, useCopy } from "./bits";
import { OutputHead, usePrinted } from "./turn";
import type { Phase } from "./session";

const BY_HAND = ["npm install @uncoil.dev/sdk", "npx @uncoil.dev/sdk login", "npx @uncoil.dev/sdk doctor"] as const;

function CommandRow({ cmd }: { cmd: string }) {
  const { done, copy } = useCopy();
  return (
    <li className="flex items-stretch border border-white/20">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap px-3 py-2.5 font-mono text-[12px] sm:text-[13px]">
        <span className="text-white/40">$ </span>
        {cmd}
      </code>
      <button type="button" onClick={() => copy(cmd)} aria-label={`Copy ${cmd}`} className="grid w-11 shrink-0 place-items-center border-l border-white/20 hover:bg-[#f4d44d] hover:text-black">
        {done ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
      </button>
    </li>
  );
}

export function FinalOutput() {
  const reduce = useReducedMotion();
  const inView = usePrinted();
  const [phase, setPhase] = useState<Phase>("setup");

  useEffect(() => {
    if (!inView || reduce) return;
    const a = window.setTimeout(() => setPhase("running"), 700);
    const b = window.setTimeout(() => setPhase("passed"), 2600);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [inView, reduce]);

  return (
    <div className="border-2 border-[#090909] bg-[#090909] text-[#eceae3] shadow-[10px_10px_0_0_#f4d44d] md:shadow-[14px_14px_0_0_#f4d44d]">
      <OutputHead left="ready when you are" right="free plan · no card" />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-7 p-5 md:p-10">
          <h3 className="font-pixel text-[clamp(3rem,7vw,7rem)] leading-[0.85] tracking-[-0.08em]">
            One paste.
            <br />
            <span className="text-[#f4d44d]">Then ship.</span>
          </h3>
          <p className="max-w-md font-sans text-lg leading-8 text-[#eceae3]/75">
            Paste the prompt into Claude Code, Cursor or Codex. It installs Uncoil, signs you in in the browser and sends a first trace.
          </p>
          <div className="flex flex-wrap gap-3">
            <CopyPromptButton />
            <Link href={appHref("/sign-up")} className="group inline-flex min-h-12 items-center gap-3 border border-[#eceae3]/50 px-5 font-mono text-[11px] uppercase tracking-[0.14em] hover:bg-[#eceae3] hover:text-black">
              Start free <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">or by hand</p>
            <ul className="mt-3 space-y-2">
              {BY_HAND.map((cmd) => (
                <CommandRow key={cmd} cmd={cmd} />
              ))}
            </ul>
            <p className="mt-2 font-mono text-[11px] text-white/45">
              Python: <span className="text-white/70">pip install uncoil-sdk</span> then <span className="text-white/70">python -m uncoil doctor</span>
            </p>
          </div>
        </div>
        <div className="relative flex min-h-[320px] flex-col border-t border-white/15 lg:border-l lg:border-t-0">
          <div className="relative flex-1">
            <CoilArt phase={reduce ? "passed" : phase} label="Pixel coil unwinding into the Uncoil logo" />
          </div>
          <p className="flex items-center justify-between border-t border-white/15 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
            <span>■ session saved</span>
            <span className={phase === "passed" || reduce ? "text-[#f4d44d]" : ""}>{phase === "passed" || reduce ? "0 open failures" : "tracing…"}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
