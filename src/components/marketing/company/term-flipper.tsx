"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Shuffle } from "lucide-react";
import type { GlossaryTerm } from "./glossary-explorer";

/** A dictionary card you can flip through: previous, next or a random term. */
export function TermFlipper({ terms }: { terms: readonly GlossaryTerm[] }) {
  const [i, setI] = useState(0);
  const t = terms[i];
  const go = (next: number) => setI((next + terms.length) % terms.length);
  const button = "flex size-12 items-center justify-center border border-white/30 transition-colors hover:bg-[#f4d44d] hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4d44d]";
  return (
    <div className="grid gap-px border border-white/20 bg-white/20 lg:grid-cols-[1fr_auto]">
      <div className="bg-[#090909] p-6 md:p-10">
        <p role="status" className="sr-only">{t.term}, {i + 1} of {terms.length}</p>
        <p aria-hidden="true" className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f4d44d]">Flip through / {String(i + 1).padStart(2, "0")} of {terms.length}</p>
        <div key={t.slug} className="animate-[slide-up-fade_0.35s_ease-out]">
          <h2 className="mt-6 font-pixel text-[clamp(2.4rem,6vw,5.5rem)] leading-[0.9] tracking-[-0.06em]">{t.term}</h2>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/80">{t.definition}</p>
          <Link href={`/glossary/${t.slug}`} className="mt-6 inline-block font-mono text-[11px] uppercase tracking-[0.14em] text-[#f4d44d] underline underline-offset-4">Open this term<span className="sr-only">: {t.term}</span></Link>
        </div>
      </div>
      <div className="flex gap-px bg-[#090909] p-6 lg:flex-col lg:justify-end lg:p-10">
        <button type="button" aria-label="Previous term" className={button} onClick={() => go(i - 1)}><ArrowLeft aria-hidden="true" className="size-4" /></button>
        <button type="button" aria-label="Random term" className={button} onClick={() => go(Math.floor(Math.random() * terms.length))}><Shuffle aria-hidden="true" className="size-4" /></button>
        <button type="button" aria-label="Next term" className={button} onClick={() => go(i + 1)}><ArrowRight aria-hidden="true" className="size-4" /></button>
      </div>
    </div>
  );
}
