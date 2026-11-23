"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";

type LogLine = {
  text: string;
  type?: 'command' | 'system' | 'llm' | 'tool' | 'warning' | 'error' | 'final';
};

const COMMAND_TEXT = "run-agent";

const generateLogs = (): LogLine[] => {
  const base: LogLine[] = [
    { text: "initializing agent workspace...", type: 'system' },
  ];

  const actions: LogLine[] = [
    { text: "llm_call        claude-sonnet-4-5", type: 'llm' },
    { text: "tool_call       web_search", type: 'tool' },
    { text: "retry attempt   [N] (timeout)", type: 'warning' },
    { text: "context_expand  +[X] tokens", type: 'system' },
    { text: "db_query        SELECT * FROM metrics", type: 'tool' },
    { text: "llm_call        gpt-4o", type: 'llm' },
  ];

  for (let i = 0; i < 45; i++) {
    const action = actions[Math.floor(Math.random() * actions.length)];
    const text = action.text.replace('[N]', (i % 5 + 1).toString()).replace('[X]', (Math.floor(Math.random() * 5000)).toString());
    base.push({ ...action, text });
  }

  base.push({ text: "analyzing failure state...", type: 'system' });
  base.push({ text: "system_abort    triggered: threshold_exceeded", type: 'error' },
  { text: "run failed: internal_loop_detected", type: 'error' },
  { text: "wasted cost: $18.42", type: 'final' });
  
  return base;
};

const COLORS = {
  command: "#FFFFFF",
  system: "#444444",
  llm: "#60A5FA", 
  tool: "#34D399", 
  warning: "#F59E0B", 
  error: "#EF4444", 
  final: "#EF4444", 
};

export function DebugStream() {
  const [iteration, setIteration] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const [typedCommand, setTypedCommand] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const allLogs = useMemo(() => { void iteration; return generateLogs(); }, [iteration]);

  // Use requestAnimationFrame for smoother following
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleCount, typedCommand, isRunning]);

  useEffect(() => {
    const runSequence = async () => {
      setIsRunning(true);
      setVisibleCount(0);
      setTypedCommand("");
      
      await new Promise(r => setTimeout(r, 600));

      // 1. Typewriter Phase
      setIsTyping(true);
      for (let i = 1; i <= COMMAND_TEXT.length; i++) {
        setTypedCommand(COMMAND_TEXT.slice(0, i));
        await new Promise(r => setTimeout(r, 40 + Math.random() * 60));
      }
      setIsTyping(false);
      
      await new Promise(r => setTimeout(r, 400));

      // 2. Log Stream Phase
      for (let i = 1; i <= allLogs.length; i++) {
        setVisibleCount(i);
        const delay = 45;
        await new Promise(r => setTimeout(r, delay));
      }

      setIsRunning(false);
    };

    runSequence();
  }, [iteration, allLogs]);

  const displayedLogs: LogLine[] = [
    { text: `> ${typedCommand}${isTyping ? '_' : ''}`, type: 'command' },
    ...allLogs.slice(0, visibleCount)
  ];

  if (!isRunning && !isTyping) {
    displayedLogs.push({ text: ">", type: 'command' });
  }

  const handleRerun = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isRunning) {
      setIteration(prev => prev + 1);
    }
  };

  return (
    <section 
      id="workspace-terminal"
      className="relative h-screen w-full bg-[#050505] flex flex-col justify-center items-center selection:bg-yellow-300/40 overflow-hidden font-mono"
    >
      
      <div className="w-full h-[520px] flex flex-col bg-[#0A0A0A] shadow-2xl relative z-10 overflow-hidden">
        
        <div className="flex items-center justify-between px-6 py-3 bg-[#0F0F0F] border-b border-[#1A1A1A] shrink-0">
          <div className="flex gap-4 items-center">
            <div className="flex gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#1A1A1A]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#1A1A1A]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#1A1A1A]" />
            </div>
            <span className="text-[#333333] text-[11px] uppercase tracking-widest font-bold">workspace — tty1</span>
          </div>

          <button 
            onClick={handleRerun}
            disabled={isRunning}
            className={`flex items-center gap-2 px-4 py-1.5 border text-[10px] uppercase tracking-widest transition-all duration-200 rounded-none
              ${isRunning 
                ? 'bg-transparent border-[#1A1A1A] text-[#333333] cursor-not-allowed' 
                : 'bg-white/5 border-white/10 text-[#666666] hover:bg-white/10 hover:border-white/20 hover:text-white'
              }
            `}
          >
            <RotateCcw className={`w-3 h-3 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'RUNNING' : 'RERUN'}
          </button>
        </div>

        {/* 
          RESTORING HIDDEN SCROLLBAR TRICK
          We use overflow-y-scroll but hide the scrollbar with CSS.
          We remove scroll-smooth because it falls behind high-frequency updates.
        */}
        <div 
          ref={scrollRef}
          className="flex-1 p-12 overflow-y-scroll no-scrollbar flex flex-col pointer-events-none"
        >
          <div className="max-w-[800px] w-full mx-auto flex flex-col gap-1.5">
            
            {displayedLogs.map((line, i) => {
              const isFinal = line.type === 'final';
              const isPrompt = line.text === '>' && line.type === 'command' && i === displayedLogs.length - 1;

              return (
                <div 
                  key={`${iteration}-${i}-${line.text}`} 
                  className={`text-[13px] leading-relaxed flex gap-6 relative group overflow-hidden`}
                  style={{ color: COLORS[line.type || 'system'] }}
                >
                  <span className="opacity-10 shrink-0 w-4" style={{ color: COLORS.system }}>
                    {line.type === 'command' ? '' : '│'}
                  </span>
                  
                  <span className={`truncate relative z-20 ${isFinal ? 'px-1' : ''}`}>
                    {line.text}
                    {isFinal && (
                      <motion.div 
                        initial={{ left: '-100%' }}
                        animate={{ left: '0%' }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="absolute inset-0 bg-[#EF4444]/10 -z-10"
                      />
                    )}
                  </span>

                  {isPrompt && !isRunning && (
                    <motion.div 
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                      className="w-2 h-4 bg-white/20 ml-[-16px]"
                    />
                  )}
                </div>
              );
            })}

          </div>
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#FFFFFF 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
    </section>
  );
}
