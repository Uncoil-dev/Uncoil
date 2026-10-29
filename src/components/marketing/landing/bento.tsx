"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { motion, useInView, useReducedMotion } from "framer-motion";

const code = `import { traceAgent, span } from "uncoil-sdk";

export const answer = traceAgent(async (q) => {
  const docs = await span("docs.search",
    () => search(q), { type: "tool" });
  return span("chat",
    () => callModel(q, docs), { type: "llm" });
});`;

function TypedCode() {
  const ref = useRef<HTMLPreElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? code.length : 0);
  useEffect(() => {
    if (!inView || reduce) return;
    const id = window.setInterval(() => setN((v) => (v >= code.length ? v : v + 3)), 16);
    return () => window.clearInterval(id);
  }, [inView, reduce]);
  return (
    <pre ref={ref} className="min-h-[190px] overflow-x-auto font-mono text-[12px] leading-6 text-white/85" aria-label={code}>
      <code aria-hidden="true">
        {code.slice(0, n)}
        <span className="inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-[#f4d44d]" />
      </code>
    </pre>
  );
}

const queries = ["status:error", "cost>0.05", "-env:dev", "latency>3s", "tokens>=10k", "name:support-agent"];

function QueryChips() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % queries.length), 1600);
    return () => window.clearInterval(id);
  }, [reduce]);
  return (
    <div>
      <div className="flex items-center gap-2 border border-black bg-white px-3 py-3 font-mono text-sm">
        <span className="text-black/40">⌕</span>
        <motion.span key={i} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          {queries[i]}
        </motion.span>
        <span className="h-4 w-px animate-pulse bg-black" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {queries.map((q, k) => (
          <span key={q} className={`border border-black px-2 py-1 font-mono text-[10px] transition-colors ${k === i ? "bg-black text-[#f4d44d]" : ""}`}>
            {q}
          </span>
        ))}
      </div>
    </div>
  );
}

const tile = "relative overflow-hidden border border-white/15";

export function Bento() {
  return (
    <section className="bg-[#090909] px-5 py-24 text-[#eceae3] md:px-10 md:py-32">
      <div className="mx-auto max-w-[1320px]">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">The toolkit</p>
        <h2 className="mt-5 max-w-3xl font-pixel text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.92] tracking-[-0.07em]">Built for the 2am incident.</h2>

        <div className="mt-14 grid auto-rows-[minmax(260px,auto)] gap-4 md:grid-cols-6">
          {/* Globe: integrations */}
          <div className={`${tile} md:col-span-3 md:row-span-2`}>
            <Image src="/images/landing/globe-orbits.png" alt="" fill unoptimized sizes="50vw" className="object-cover opacity-90 [image-rendering:pixelated]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,#090909_0%,#090909_28%,rgba(9,9,9,0.6)_50%,rgba(9,9,9,0)_75%)]" />
            <div className="relative flex h-full min-h-[520px] flex-col justify-end p-7">
              <h3 className="font-pixel text-4xl leading-none tracking-[-0.06em]">Plugs into your stack.</h3>
              <p className="mt-3 max-w-md text-sm leading-6 text-white/65">TypeScript and Python SDKs, OpenTelemetry, or plain HTTP. Works next to OpenAI, Anthropic, the Vercel AI SDK, LangChain and LlamaIndex.</p>
              <Link href="/integrations" className="mt-5 inline-flex w-fit items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#f4d44d] hover:text-white">
                See integrations <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Code */}
          <div className={`${tile} bg-[#111] p-7 md:col-span-3`}>
            <div className="mb-5 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-white/45">
              <span>agent.ts</span>
              <span className="text-[#f4d44d]">About ten lines</span>
            </div>
            <TypedCode />
          </div>

          {/* Search */}
          <div className={`${tile} border-[#f4d44d] bg-[#f4d44d] p-7 text-black md:col-span-3`}>
            <h3 className="font-pixel text-3xl leading-none tracking-[-0.06em]">Search like you think.</h3>
            <p className="mt-2 mb-5 text-sm text-black/70">Filter by status, cost, latency or tokens. Exclude with a minus.</p>
            <QueryChips />
          </div>

          {[
            ["Secrets stay home", "Bearer tokens, API keys, JWTs and passwords are stripped from inputs and outputs before they're sent."],
            ["Loops make sense", "Nested steps keep their parent, so a five-turn loop reads as five turns, not fifty lines."],
            ["Runs never mix", "Concurrent runs stay in separate traces, even when they share a process."],
          ].map(([t, b], i) => (
            <motion.div
              key={t}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.08 }}
              className={`${tile} flex flex-col justify-between p-7 md:col-span-2`}
            >
              <span className="font-pixel text-6xl leading-none text-[#f4d44d]">0{i + 1}</span>
              <div>
                <h3 className="font-pixel text-2xl leading-none tracking-[-0.05em]">{t}</h3>
                <p className="mt-3 text-sm leading-6 text-white/60">{b}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
