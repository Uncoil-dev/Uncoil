"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Minus, Plus } from "lucide-react";

const questions = [
  ["What does Uncoil capture?", "Uncoil records runs, nested spans, model calls, tool calls, retries, cost, quality scores, sessions, and release context in one operational record."],
  ["Can I use my existing AI stack?", "Yes. Instrument with the TypeScript or Python SDK, or send OpenTelemetry traces directly. The same workspace connects the resulting evidence."],
  ["How does evaluation connect to a trace?", "A production run can become a review item or a dataset example. Compare prompts, models, and evaluator results against the behavior that prompted the change."],
  ["Will this work for more than debugging?", "Yes. Uncoil is built for the wider improvement loop: investigation, quality review, experiment comparison, promotion, and monitoring after release."],
] as const;

export function LandingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="flex min-h-[calc(100svh-60px)] items-center border-y border-white/10 bg-[#0b0b0b] px-6 py-16 md:px-10 md:py-16">
      <div className="mx-auto grid w-full max-w-[1240px] gap-10 md:grid-cols-[0.72fr_1.28fr] md:gap-16">
        <div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Questions, answered</p><h2 className="mt-5 max-w-[390px] font-pixel text-5xl font-normal leading-[0.91] tracking-[-0.065em] md:text-6xl">Built for the whole AI team.</h2><p className="mt-6 max-w-[360px] text-sm leading-7 text-zinc-500">From the first instrumented run to the next release, Uncoil keeps product, engineering, and operations in the same evidence loop.</p><Link href="/contact" className="mt-8 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-300 hover:text-white">Talk to us <ArrowUpRight className="size-3" /></Link></div>
        <div className="border-y border-white/15">
          {questions.map(([question, answer], index) => {
            const isOpen = openIndex === index;
            return <div key={question} className="border-b border-white/15 last:border-b-0"><h3><button type="button" onClick={() => setOpenIndex((current) => current === index ? null : index)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-6 px-1 py-6 text-left font-mono text-[12px] uppercase tracking-[0.1em] text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-white"><span>{question}</span>{isOpen ? <Minus className="size-4 shrink-0" /> : <Plus className="size-4 shrink-0 text-zinc-500" />}</button></h3>{isOpen ? <div className="max-w-[650px] px-1 pb-6 text-[15px] leading-7 text-zinc-400">{answer}</div> : null}</div>;
          })}
        </div>
      </div>
    </section>
  );
}
