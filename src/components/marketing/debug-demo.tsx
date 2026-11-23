"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence, type MotionValue } from "framer-motion";

const EXECUTION_STEPS = [
  { type: 'start', name: 'AGENT_INIT', meta: 'region: us-east-1' },
  { type: 'llm', name: 'LLM_CALL (gpt-4o)', meta: 'tokens: 1,420', cost: '$0.12' },
  { type: 'tool', name: 'TOOL_CALL (web_search)', meta: 'latency: 180ms', cost: '$0.05' },
  { type: 'llm', name: 'LLM_CALL (claude-3.5)', meta: 'tokens: 2,100', cost: '$0.44' },
  { type: 'retry', name: 'RETRY_1 (stripe_api)', meta: 'timeout: 10s', cost: '$0.00' },
  { type: 'retry', name: 'RETRY_2 (stripe_api)', meta: 'timeout: 10s', cost: '$0.00' },
  { type: 'error', name: 'FAILURE (stripe_api)', meta: '402 Payment Required', cost: '$1.42', detail: {
    input: 'POST /v1/refunds { order_id: "882" }',
    output: 'Error: Account balance insufficient. Payment required.',
    retries: '3 attempts',
    total_cost: '$1.42'
  }},
];

const TYPE_COLORS: Record<string, string> = {
  start: "#FFFFFF",
  llm: "#818CF8",
  tool: "#10B981",
  retry: "#F59E0B",
  error: "#EF4444",
};

export function DebugDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Map scroll progress to steps (0 to 7)
  const stepIndex = useTransform(scrollYProgress, [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8], [0, 1, 2, 3, 4, 5, 6, 7]);
  
  // Transform for dimming previous steps on failure
  const dimOpacity = useTransform(scrollYProgress, [0.6, 0.7], [1, 0.15]);

  return (
    <div ref={containerRef} className="relative h-[350vh] bg-[#050505]">
      {/* Sticky Container */}
      <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden px-6">
        
        {/* Background Depth Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-[#111111]" />
        </div>

        <div className="z-10 w-full max-w-[800px] flex flex-col items-center">
          
          {/* Header (Top) */}
          <motion.div 
            style={{ opacity: useTransform(scrollYProgress, [0, 0.05], [0, 1]) }}
            className="mb-16 text-center"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#444444] mb-4">
              IMMERSIVE_DIAGNOSTICS
            </div>
            <h2 className="font-pixel text-[24px] md:text-[32px] text-white uppercase tracking-tighter" style={{ fontFamily: "var(--font-pixel)" }}>
              The Anatomy of a Failure
            </h2>
          </motion.div>

          {/* Execution Stack */}
          <div className="relative flex flex-col items-center w-full">
            {EXECUTION_STEPS.map((step, i) => {
              const isLast = i === EXECUTION_STEPS.length - 1;
              const isError = step.type === 'error';

              return (
                <StepItem 
                  key={i} 
                  step={step} 
                  index={i} 
                  currentIndex={stepIndex} 
                  dimOpacity={dimOpacity}
                  isLast={isLast}
                  isError={isError}
                />
              );
            })}
          </div>

          {/* Scroll Prompt (Bottom) */}
          <motion.div 
            style={{ opacity: useTransform(scrollYProgress, [0, 0.05, 0.9, 1], [0.2, 0.5, 0.5, 0]) }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
          >
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#444444]">Scroll to execute</span>
            <div className="w-[1px] h-12 bg-gradient-to-b from-[#444444] to-transparent" />
          </motion.div>

        </div>
      </div>
    </div>
  );
}

type StepItemProps = {
  step: (typeof EXECUTION_STEPS)[number];
  index: number;
  currentIndex: MotionValue<number>;
  dimOpacity: MotionValue<number>;
  isLast: boolean;
  isError: boolean;
};

function StepItem({ step, index, currentIndex, dimOpacity, isError }: StepItemProps) {
  const opacity = useTransform(currentIndex, [index, index + 0.5], [0, 1]);
  
  // Failure expansion logic
  const isFailurePhase = useTransform(currentIndex, (val: number) => val >= 7);
  const dimmedOpacity = useTransform([opacity, dimOpacity], ([o, d]: number[]) => isFailurePhase.get() ? (isError ? o : o * d) : o);
  const errorScale = useTransform(currentIndex, [6, 7], [1, 1.05]);

  return (
    <motion.div 
      style={{ 
        opacity: isError ? opacity : dimmedOpacity,
        scale: isError ? errorScale : 1,
      }}
      className={`relative w-full flex flex-col items-center ${isError ? 'z-50' : 'z-10'}`}
    >
      {/* Connector Line */}
      {index > 0 && (
        <motion.div 
          initial={{ scaleY: 0 }}
          style={{ scaleY: opacity }}
          className="w-px h-12 bg-[#222222] origin-top"
        />
      )}

      {/* Node */}
      <motion.div 
        className={`relative flex items-center gap-6 px-6 py-4 border transition-all duration-300 ${isError && isFailurePhase.get() ? 'bg-[#110000] border-[#EF4444] w-full max-w-[700px]' : 'bg-[#0A0A0A] border-[#1A1A1A] w-full max-w-[500px]'}`}
      >
        <div 
          className="w-2 h-2 shrink-0" 
          style={{ backgroundColor: TYPE_COLORS[step.type] }} 
        />
        
        <div className="flex-1 flex justify-between items-center min-w-0">
          <div className="flex flex-col gap-1 min-w-0">
            <span className="font-mono text-[9px] uppercase tracking-widest opacity-40" style={{ color: TYPE_COLORS[step.type] }}>
              {step.type}
            </span>
            <span className={`font-pixel uppercase truncate tracking-tighter ${isError ? 'text-[#EF4444]' : 'text-white'}`} style={{ fontFamily: "var(--font-pixel)", fontSize: isError ? "18px" : "14px" }}>
              {step.name}
            </span>
          </div>
          
          <div className="flex items-center gap-8 font-mono text-[11px] text-[#444444] tabular-nums ml-4 shrink-0">
            <span>{step.meta}</span>
            {step.cost && <span className={isError ? 'text-[#EF4444]' : ''}>{step.cost}</span>}
          </div>
        </div>

        {/* Details Panel for Error */}
        <AnimatePresence>
          {isError && isFailurePhase.get() && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="absolute top-full left-0 right-0 bg-[#000000] border-x border-b border-[#EF4444] p-6 z-50 overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-[#444444] uppercase text-[8px] tracking-widest mb-2 font-mono">Payload Input</div>
                  <div className="text-[#CCCCCC] bg-[#0A0A0A] p-3 border border-[#1A1A1A] text-[11px] font-mono leading-relaxed">
                    {step.detail!.input}
                  </div>
                </div>
                <div>
                  <div className="text-[#444444] uppercase text-[8px] tracking-widest mb-2 font-mono">Diagnostic Output</div>
                  <div className="text-[#EF4444] bg-[#110000] p-3 border border-[#EF4444]/20 text-[11px] font-mono leading-relaxed">
                    {step.detail!.output}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-[#EF4444]/20 font-mono text-[10px]">
                <div className="flex gap-6">
                  <span className="text-[#444444]">RETRIES: {step.detail!.retries}</span>
                  <span className="text-[#444444]">SYSTEM: stripe_gateway</span>
                </div>
                <div className="text-[#EF4444] font-bold text-[14px]">TOTAL_LEAK: {step.detail!.total_cost}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
