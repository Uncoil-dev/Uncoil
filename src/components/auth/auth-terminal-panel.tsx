"use client";

import React, { useEffect, useState } from "react";
import { motion, steps } from "framer-motion";

type LogEntry = {
  text: string;
  type: "command" | "system" | "warning" | "error" | "success" | "spacer";
};

const LOGS: LogEntry[] = [
  { text: "> run-agent", type: "command" },
  { text: "llm_call        claude-sonnet-4-5", type: "system" },
  { text: "tool_call       web_search", type: "system" },
  { text: "retry           attempt_1", type: "warning" },
  { text: "retry           attempt_2", type: "warning" },
  { text: "fallback        gpt-4o", type: "system" },
  { text: "error           timeout", type: "error" },
  { text: "", type: "spacer" },
  { text: "[uncoil] trace captured", type: "success" },
  { text: "run_id          run_8f21a9", type: "system" },
  { text: "spans           18", type: "system" },
  { text: "wasted cost     $18.42", type: "error" },
];

/**
 * AuthTerminalPanel Component
 * 
 * Renders a quiet, looping terminal animation for the authentication sidebar.
 * Connects visually to the main DebugStream terminal but remains smaller and stable.
 */
export function AuthTerminalPanel() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev >= LOGS.length) return 0;
        return prev + 1;
      });
    }, 800);

    return () => clearInterval(timer);
  }, []);

  return (
    <div 
      className="w-full font-mono text-[12px] md:text-[13px] leading-relaxed selection:bg-yellow-300/40"
      aria-hidden="true"
    >
      <div className="flex flex-col gap-1">
        {LOGS.map((log, i) => {
          const isVisible = i < visibleCount;
          
          return (
            <div
              key={i}
              className={`min-h-[1.6em] transition-all duration-300 ease-[var(--ease-out)] ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
            >
              <span
                className={`
                  ${log.type === "command" ? "text-white" : ""}
                  ${log.type === "system" ? "text-white" : ""}
                  ${log.type === "warning" ? "text-amber-500" : ""}
                  ${log.type === "error" ? "text-red-500 font-bold" : ""}
                  ${log.type === "success" ? "text-[#34D399]" : ""}
                `}
              >
                {log.text}
              </span>
            </div>
          );
        })}
        
        {/* Cursor */}
        <motion.div
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: steps(2) }}
          className="w-2 h-4 bg-white/40 mt-1"
        />
      </div>
    </div>
  );
}
