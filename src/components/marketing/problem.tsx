"use client";

import { useState, useEffect, useRef } from "react";
import { useInView } from "framer-motion";

const PROBLEM_ITEMS = [
  {
    number: "01",
    title: "No visibility",
    body: "Your agent calls 12 tools and 6 LLMs in a single run. Which step cost $40? Which one failed? Right now, you have no way to know.",
  },
  {
    number: "02",
    title: "No debugging",
    body: "When something goes wrong, you stare at raw logs and try to reconstruct what happened. A failed run can take hours to diagnose.",
  },
  {
    number: "03",
    title: "No cost control",
    body: "Runaway loops. Infinite context windows. Retries. Your LLM bill arrives and you have no idea what ran up the cost.",
  },
];

const LOG_VARIANTS = [
  {
    id: "run_8fa21c",
    status: "failed",
    summary: { cost: "$4.21", duration: "12.44s" },
    lines: [
      { type: "llm_call", name: "claude-3-5-sonnet", duration: "420ms", cost: "$0.32", total: "$0.32", time: "14:32:01" },
      { type: "tool_call", name: "web_search", duration: "180ms", cost: "$0.05", total: "$0.37", time: "14:32:02" },
      { type: "decision", name: "retry_logic", duration: "12ms", cost: "$0.00", total: "$0.37", time: "14:32:03" },
      { type: "tool_call", name: "web_search (retry 1)", duration: "240ms", cost: "$0.41", total: "$0.78", time: "14:32:04" },
      { type: "tool_call", name: "web_search (retry 2)", duration: "840ms", cost: "$0.63", total: "$1.41", time: "14:32:05" },
      { type: "llm_call", name: "gpt-4o", duration: "1240ms", cost: "$0.87", total: "$2.28", time: "14:32:07" },
      { type: "decision", name: "uncertain_branch", duration: "44ms", cost: "$0.00", total: "$2.28", time: "14:32:08" },
      { type: "tool_call", name: "llm_fallback", duration: "2100ms", cost: "$1.21", total: "$3.49", time: "14:32:11" },
      { type: "error", name: "timeout_exception", duration: "0ms", cost: "$0.72", total: "$4.21", time: "14:32:13" },
      { type: "error", name: "fatal: trace incomplete", duration: "0ms", cost: "$0.00", total: "$4.21", time: "14:32:15", message: "CRITICAL: Agent loop detected. Connection terminated." },
    ]
  },
  {
    id: "run_4d22a1",
    status: "failed",
    summary: { cost: "$5.12", duration: "4.12s" },
    lines: [
      { type: "llm_call", name: "gpt-4-turbo", duration: "820ms", cost: "$1.12", total: "$1.12", time: "10:11:05" },
      { type: "decision", name: "branch_confused", duration: "120ms", cost: "$0.00", total: "$1.12", time: "10:11:06" },
      { type: "llm_call", name: "sub_agent_alpha", duration: "410ms", cost: "$0.45", total: "$1.57", time: "10:11:07" },
      { type: "llm_call", name: "sub_agent_beta", duration: "320ms", cost: "$0.45", total: "$2.02", time: "10:11:07" },
      { type: "error", name: "context_window_full", duration: "0ms", cost: "$0.00", total: "$2.02", time: "10:11:08" },
      { type: "decision", name: "compression_attempt", duration: "840ms", cost: "$0.84", total: "$2.86", time: "10:11:09" },
      { type: "llm_call", name: "gpt-4o", duration: "910ms", cost: "$0.91", total: "$3.77", time: "10:11:10" },
      { type: "error", name: "confidence: low (0.12)", duration: "0ms", cost: "$0.00", total: "$3.77", time: "10:11:10" },
      { type: "error", name: "memory_corruption", duration: "0ms", cost: "$1.35", total: "$5.12", time: "10:11:11" },
      { type: "error", name: "trace incomplete", duration: "0ms", cost: "$0.00", total: "$5.12", time: "10:11:11", message: "ERROR: Context overflow. Buffer cleared." },
    ]
  },
  {
    id: "run_f1a293",
    status: "failed",
    summary: { cost: "$3.89", duration: "8.11s" },
    lines: [
      { type: "tool_call", name: "calculator", duration: "12ms", cost: "$0.05", total: "$0.05", time: "09:01:42" },
      { type: "tool_call", name: "calculator", duration: "10ms", cost: "$0.05", total: "$0.10", time: "09:01:42" },
      { type: "tool_call", name: "calculator", duration: "15ms", cost: "$0.05", total: "$0.15", time: "09:01:43" },
      { type: "tool_call", name: "calculator", duration: "11ms", cost: "$0.05", total: "$0.20", time: "09:01:43" },
      { type: "decision", name: "loop_detected", duration: "0ms", cost: "$0.00", total: "$0.20", time: "09:01:44" },
      { type: "llm_call", name: "claude-haiku", duration: "240ms", cost: "$0.24", total: "$0.44", time: "09:01:44" },
      { type: "tool_call", name: "fallback_search", duration: "1400ms", cost: "$0.32", total: "$0.76", time: "09:01:46" },
      { type: "error", name: "fallback_failed", duration: "0ms", cost: "$0.00", total: "$0.76", time: "09:01:46" },
      { type: "llm_call", name: "gpt-4-turbo", duration: "2100ms", cost: "$3.13", total: "$3.89", time: "09:01:49" },
      { type: "error", name: "terminated: infinite loop", duration: "0ms", cost: "$0.00", total: "$3.89", time: "09:01:50", message: "SYSTEM: Resource limit exceeded." },
    ]
  }
];

const TYPE_COLORS: Record<string, string> = {
  llm_call: "#818CF8", // Indigo
  tool_call: "#10B981", // Green
  decision: "#F59E0B", // Amber
  error: "#EF4444",   // Red
  success: "#10B981", // Green
};

function TerminalPanel() {
  const [runIndex, setRunIndex] = useState(0);
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [status, setStatus] = useState<'initializing' | 'running' | 'processing' | 'terminated'>('initializing');
  const [isGlitching, setIsGlitching] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [displayCost, setDisplayCost] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.5 });
  
  const currentRun = LOG_VARIANTS[runIndex];
  
  // Ref to track current state for the async loop
  const loopStateRef = useRef({
    currentLine: 0,
    isPaused: false,
    active: false
  });

  // Keep ref in sync with state
  useEffect(() => {
    loopStateRef.current.isPaused = isPaused;
  }, [isPaused]);

  // Animate cost display smoothly towards target
  const [targetCost, setTargetCost] = useState(0);
  useEffect(() => {
    let frame: number;
    const animate = () => {
      setDisplayCost(prev => {
        const diff = targetCost - prev;
        if (Math.abs(diff) < 0.001) return targetCost;
        return prev + diff * 0.15; // Smooth approach
      });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [targetCost]);

  useEffect(() => {
    if (!isInView) return;
    
    const loopState = loopStateRef.current;
    loopState.active = true;
    const timeouts: NodeJS.Timeout[] = [];

    const run = async () => {
      const currentRun = LOG_VARIANTS[runIndex];
      
      // 1. Initializing
      setStatus('initializing');
      setVisibleLines(0);
      setTargetCost(0);
      setDisplayCost(0);
      loopState.currentLine = 0;
      
      await new Promise(r => timeouts.push(setTimeout(r, 1200)));
      if (!loopState.active) return;

      // 2. Log Streaming
      setStatus('running');
      
      while (loopState.currentLine < currentRun.lines.length) {
        if (!loopState.active) return;

        if (loopState.isPaused) {
          await new Promise(r => timeouts.push(setTimeout(r, 100)));
          continue;
        }

        const line = currentRun.lines[loopState.currentLine];
        
        // Subtle status toggle
        if (loopState.currentLine % 3 === 0) {
          setStatus(Math.random() > 0.5 ? 'processing' : 'running');
        }

        // Glitch effect on errors
        if (line.type === 'error') {
          setIsGlitching(true);
          timeouts.push(setTimeout(() => setIsGlitching(false), 80));
        }

        // Randomized printing delay
        const delay = Math.random() * 140 + 80;
        await new Promise(r => timeouts.push(setTimeout(r, delay)));
        if (!loopState.active) return;

        setVisibleLines(prev => prev + 1);
        
        // Update target cost for animation
        const lineTotal = parseFloat(line.total.replace('$', ''));
        if (!isNaN(lineTotal)) {
          setTargetCost(lineTotal);
        }

        loopState.currentLine++;
      }

      // 3. Terminated State
      setStatus('terminated');
      await new Promise(r => timeouts.push(setTimeout(r, 2500)));
      if (!loopState.active) return;

      // 4. Auto-restart
      setRunIndex((prev) => (prev + 1) % LOG_VARIANTS.length);
    };

    run();

    return () => {
      loopState.active = false;
      timeouts.forEach(clearTimeout);
    };
  }, [isInView, runIndex]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleLines]);

  return (
    <div 
      ref={containerRef}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`w-full flex flex-col overflow-hidden transition-opacity duration-75 ${isGlitching ? 'opacity-50' : 'opacity-100'}`}
      style={{ 
        backgroundColor: "#0A0A0A", 
        border: "1px solid #2A2A2A",
        height: "420px",
      }}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#2A2A2A]">
        <div className="flex gap-8">
          <span className="font-mono text-[11px] uppercase tracking-widest text-[#666666]">live trace</span>
          <span className="font-mono text-[11px] uppercase tracking-widest text-[#666666]">{currentRun.id}</span>
        </div>
        <div className="flex items-center gap-4">
          {isPaused && (
            <span className="font-mono text-[10px] uppercase text-[#F59E0B] animate-pulse">paused</span>
          )}
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${status === 'terminated' ? 'bg-[#3A3A3A]' : status === 'initializing' ? 'bg-[#F59E0B]' : 'bg-[#10B981] animate-pulse'}`} />
            <span className="font-mono text-[11px] uppercase tracking-widest text-[#999999]">
              {status}
            </span>
          </div>
        </div>
      </div>

      {/* Middle — Log Output */}
      <div 
        ref={scrollRef}
        className="flex-1 p-8 font-mono text-[12px] md:text-[13px] leading-relaxed overflow-y-auto scrollbar-hide"
      >
        <div className="flex flex-col gap-2">
          {status === 'initializing' && visibleLines === 0 && (
            <div className="text-[#3A3A3A] animate-pulse">initializing system...</div>
          )}
          
          {currentRun.lines.slice(0, visibleLines).map((line, i) => (
            <div 
              key={i} 
              className={`grid grid-cols-[80px_130px_1fr_70px_70px_100px] gap-4 items-center whitespace-nowrap opacity-100 ${isPaused && i < visibleLines - 1 ? 'opacity-40' : ''}`}
            >
              <span style={{ color: "#3A3A3A" }}>[{line.time}]</span>
              <span style={{ color: TYPE_COLORS[line.type] || "#FFFFFF" }}>
                [ {line.type.replace('_', ' ')} ]
              </span>
              <span className="overflow-hidden text-ellipsis" style={{ color: line.type === 'error' ? '#FFFFFF' : '#999999' }}>
                {line.name}
              </span>
              <span className="text-right" style={{ color: "#3A3A3A" }}>{line.duration}</span>
              <span className="text-right" style={{ color: "#3A3A3A" }}>{line.cost}</span>
              <span className="text-right" style={{ color: "#555555" }}>({line.total})</span>
              
              {line.message && (
                <div className="col-span-full mt-2 pt-2 border-t border-[#1A1A1A] text-white">
                  {line.message}
                </div>
              )}
            </div>
          ))}
          
          {status !== 'terminated' && status !== 'initializing' && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-4 bg-white animate-[pulse_0.8s_infinite]" />
            </div>
          )}
          
          {status === 'terminated' && (
            <div className="mt-4 text-[#3A3A3A]">terminating run... clearing buffer...</div>
          )}
        </div>
      </div>

      {/* Trace Timeline Bar */}
      <div className="px-8 pb-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3A3A3A] mb-2">
          Span Distribution
        </div>
        <div className="font-mono text-[14px] tracking-[-0.1em] text-[#3A3A3A] select-none break-all">
          [<span style={{ color: "#EF4444" }}>██████</span>░░<span style={{ color: "#666666" }}>████████</span>░<span style={{ color: "#666666" }}>███</span>░░]
        </div>
      </div>

      {/* Bottom Section */}
      <div className="px-5 py-4 border-t border-[#2A2A2A] flex justify-between items-center">
        <div className="flex gap-10">
          <span 
            className="font-mono text-[11px] uppercase transition-colors duration-300"
            style={{ color: status === 'terminated' ? '#EF4444' : '#666666' }}
          >
            cost: ${displayCost.toFixed(3)}
          </span>
          <span className="font-mono text-[11px] uppercase text-[#666666]">duration: {currentRun.summary.duration}</span>
        </div>
        <span className="font-mono text-[11px] uppercase" style={{ color: currentRun.status === 'failed' ? '#FFFFFF' : '#10B981' }}>
          status: {status === 'terminated' ? currentRun.status : status}
        </span>
      </div>
    </div>
  );
}

export function Problem() {
  return (
    <section
      className="w-full py-16"
      style={{ backgroundColor: "#050505" }}
      aria-labelledby="problem-headline"
    >
      <div className="mx-auto w-full px-6 md:px-8 max-w-[1200px]">
        
        {/* ── Headline Block ────────────────────────────────────────── */}
        <div className="mb-12">
          <div 
            className="font-mono text-[12px] uppercase tracking-[0.3em] mb-8"
            style={{ color: "#666666" }}
          >
            PROBLEM
          </div>
          
          <h2
            id="problem-headline"
            className="font-pixel font-bold text-white mb-6 uppercase leading-[1.1] tracking-tighter"
            style={{ 
              fontFamily: "var(--font-pixel)",
              fontSize: "clamp(32px, 5vw, 44px)",
              maxWidth: "800px"
            }}
          >
            Agents fail silently.
            <br />
            You have no idea why.
          </h2>

          <p
            className="font-sans text-[16px] leading-relaxed max-w-[600px]"
            style={{ color: "#CCCCCC" }}
          >
            When something breaks, you&apos;re left digging through logs, guessing what happened, 
            and trying to reconstruct the run step by step.
          </p>
        </div>

        {/* ── Main Visual — Terminal Panel ─────────────────────────── */}
        <div className="mb-16">
          <TerminalPanel />
        </div>

        {/* ── Structured Problem Rows ───────────────────────────────── */}
        <div className="flex flex-col">
          {PROBLEM_ITEMS.map((item) => (
            <div
              key={item.number}
              className="group py-6 md:py-8 border-t border-[#2A2A2A] transition-all duration-200 ease-out hover:bg-[#111111] active:scale-[0.995] px-4 -mx-4"
            >
              <div className="grid grid-cols-[40px_1fr] md:grid-cols-[56px_1fr] gap-4 items-start">
                {/* Number */}
                <div className="font-mono text-[14px] text-[#333333] group-hover:text-[#666666] pt-1">
                  {item.number}
                </div>

                {/* Content */}
                <div className="max-w-4xl">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <h3 className="font-mono text-[14px] md:text-[15px] font-bold text-white uppercase whitespace-nowrap">
                      {item.title.toUpperCase().replace(' ', '_')} —
                    </h3>
                    <p 
                      className="font-mono text-[14px] md:text-[15px] leading-relaxed inline"
                      style={{ color: "#999999" }}
                    >
                      {item.body}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
