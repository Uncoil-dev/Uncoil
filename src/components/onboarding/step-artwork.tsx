"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { onOnboardingDraft, type OnboardingDraft } from "@/components/onboarding/onboarding-draft";
import type { OnboardingStepId } from "@/components/onboarding/onboarding-progress";

const BARS = [
  { label: "agent.run", start: 0, width: 100 },
  { label: "llm.plan", start: 4, width: 22 },
  { label: "tool.search", start: 28, width: 34 },
  { label: "llm.answer", start: 64, width: 30 },
];

function Waterfall({ live }: { live: boolean }) {
  const reduce = useReducedMotion();
  return (
    <div className="space-y-2">
      {BARS.map((bar, i) => (
        <div key={bar.label} className="grid grid-cols-[88px_1fr] items-center gap-3 font-mono text-[10px] uppercase tracking-[0.08em] text-[#eceae3]/60">
          <span className="truncate">{bar.label}</span>
          <div className="relative h-3 bg-white/[0.06]">
            <motion.span
              className={`absolute inset-y-0 ${i === 0 ? "bg-[#eceae3]/35" : "bg-[#f4d44d]"}`}
              style={{ left: `${bar.start}%`, width: `${bar.width}%`, transformOrigin: "left" }}
              initial={reduce || !live ? false : { scaleX: 0 }}
              animate={{ scaleX: 1, opacity: live ? 1 : 0.35 }}
              transition={{ delay: 0.15 + i * 0.22, duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Burst() {
  const reduce = useReducedMotion();
  const cells = Array.from({ length: 28 }, (_, i) => ({
    angle: (i / 28) * Math.PI * 2,
    dist: 70 + ((i * 37) % 60),
    size: 6 + ((i * 5) % 3) * 4,
  }));
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden="true">
      {cells.map((c, i) => (
        <motion.span
          key={i}
          className={i % 3 === 0 ? "absolute bg-[#eceae3]" : "absolute bg-[#f4d44d]"}
          style={{ width: c.size, height: c.size }}
          initial={reduce ? false : { x: 0, y: 0, opacity: 1 }}
          animate={{ x: Math.cos(c.angle) * c.dist, y: Math.sin(c.angle) * c.dist, opacity: reduce ? 0 : [1, 1, 0] }}
          transition={{ duration: 1.4, ease: "easeOut", delay: 0.1 }}
        />
      ))}
    </div>
  );
}

/** Live preview that mirrors what the visitor is doing on the left. */
export function StepArtwork({ step }: { step: OnboardingStepId }) {
  const [draft, setDraft] = useState<OnboardingDraft>({});
  useEffect(() => onOnboardingDraft((next) => setDraft((prev) => ({ ...prev, ...next }))), []);
  const name = draft.name?.trim() || "your-project";

  return (
    <div className="w-full max-w-xl border border-white/20 bg-[#090909] font-mono text-[#eceae3] backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-white/15 px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-white/55">
        <span className="flex items-center gap-2"><span className="size-2 bg-[#f4d44d]" aria-hidden="true" />uncoil / {name}</span>
        <span className="text-white/35">live preview</span>
      </div>
      <div className="p-5">
        {step === "project" ? (
          <div className="space-y-3 text-[12px] leading-6">
            <p className="text-white/40"># your new home for every run</p>
            <p className="text-white/70">support-agent-prod <span className="text-white/35">214 runs</span></p>
            <p className="text-white/70">research-agent-dev <span className="text-white/35">38 runs</span></p>
            <p className="break-all text-[#f4d44d]">&gt; {name} <span className="text-white/45">0 runs</span><span className="ml-1 inline-block h-3.5 w-2 translate-y-0.5 animate-mono-pulse bg-[#f4d44d]" /></p>
          </div>
        ) : null}
        {step === "api-key" ? (
          <div className="space-y-3 text-[12px] leading-6">
            <p className="text-white/40"># .env (never commit this)</p>
            <p className="break-all text-[#f4d44d]">UNCOIL_API_KEY=uncoil_sk_live_{draft.keyCopied ? "saved ✓" : "••••••••••••"}</p>
            <p className="text-white/35">OPENAI_API_KEY=sk-••••</p>
          </div>
        ) : null}
        {step === "install" ? (
          <div className="space-y-1 text-[12px] leading-6">
            <p className="text-white/40">{draft.runtime === "typescript" ? "// agent.ts" : "# agent.py"}</p>
            {draft.runtime === "typescript" ? (
              <>
                <p className="text-white/50">import &#123; traceAgent &#125; from &quot;uncoil-sdk&quot;</p>
                <p className="text-[#f4d44d]">const agent = traceAgent(run)</p>
              </>
            ) : (
              <>
                <p className="text-white/50">from uncoil import trace_agent</p>
                <p className="text-[#f4d44d]">@trace_agent()</p>
                <p>async def agent(query): ...</p>
              </>
            )}
          </div>
        ) : null}
        {step === "waiting" ? (
          <div className="space-y-5">
            <Waterfall live={false} />
            <p className="border-t border-white/10 pt-4 text-[11px] uppercase tracking-[0.16em] text-white/45">Waiting for your first run</p>
          </div>
        ) : null}
        {step === "success" ? (
          <div className="relative space-y-5">
            <Burst />
            <p className="relative text-center font-pixel text-3xl tracking-[-0.05em] text-[#f4d44d]">first run received</p>
            <Waterfall live />
          </div>
        ) : null}
      </div>
    </div>
  );
}
