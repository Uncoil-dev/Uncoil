"use client";

import { motion } from "framer-motion";

export function WhatYouGet() {
  const rows = [
    {
      label: "TRACE",
      content: (
        <div className="flex items-center gap-2 md:gap-3">
          <span className="text-[#888888]">tool_call</span>
          <span className="text-[#444444]">→</span>
          <span className="text-[#888888]">llm_call</span>
          <span className="text-[#444444]">→</span>
          <span className="text-amber-500/80">retry</span>
          <span className="text-[#444444]">→</span>
          <span className="text-red-500/80">error</span>
        </div>
      ),
    },
    {
      label: "COST",
      content: (
        <div className="flex items-center gap-2 md:gap-3">
          <span className="text-[#888888]">$0.74</span>
          <span className="text-[#444444]">→</span>
          <span className="text-[#888888]">$1.12</span>
          <span className="text-[#444444]">→</span>
          <span className="text-red-500/80">$4.38</span>
        </div>
      ),
    },
    {
      label: "RETRIES",
      content: (
        <div className="flex items-center gap-2">
          <span className="text-[#888888]">web_search</span>
          <span className="text-amber-500/80">×7</span>
        </div>
      ),
    },
    {
      label: "FAILURE",
      content: (
        <div className="flex items-center gap-2">
          <span className="text-red-500/80">timeout</span>
          <span className="text-[#444444]">/</span>
          <span className="text-red-500/80">partial_output</span>
        </div>
      ),
    },
    {
      label: "NOTIFY",
      content: (
        <div className="flex items-center gap-2">
          <span className="text-white">Slack</span>
          <span className="text-[#444444]">/</span>
          <span className="text-[#888888]">Dashboard alerts</span>
        </div>
      ),
    },
    {
      label: "ANNOTATE",
      content: (
        <div className="flex items-center gap-2">
          <span className="text-[#888888]">Human-in-the-loop annotations</span>
        </div>
      ),
    },
  ];

  return (
    <section className="w-full bg-[#050505] pt-16 pb-[72px]">
      <div className="mx-auto max-w-[1200px] px-6 md:px-8 grid grid-cols-1 md:grid-cols-[380px_1fr] gap-12 md:gap-24 items-start">

        {/* Left Content */}
        <div className="flex flex-col gap-6">
          <h2 className="text-white text-3xl md:text-4xl font-bold tracking-tighter uppercase font-pixel leading-[1.1]">
            Every run becomes inspectable.
          </h2>
          <p className="text-[#888888] text-[15px] leading-relaxed max-w-[340px]">
            Uncoil turns one agent run into a trace, cost map, retry trail, and failure record.
          </p>
        </div>

        {/* Right Matrix */}
        <div className="relative border border-[#2A2A2A] bg-[#080808] overflow-hidden">
          {rows.map((row, i) => (
            <motion.div
              key={row.label}
              initial={{ opacity: 0.4 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              viewport={{ once: true }}
              className={`grid grid-cols-[100px_1fr] md:grid-cols-[140px_1fr] p-6 md:p-8 items-center font-mono text-[13px] tracking-tight ${i !== rows.length - 1 ? "border-b border-[#1A1A1A]" : ""
                }`}
            >
              <span className="text-[#444444] font-bold uppercase tracking-[0.2em] text-[10px]">
                {row.label}
              </span>
              <div className="text-white font-medium">
                {row.content}
              </div>
            </motion.div>
          ))}

          {/* Subtle focus pass animation */}
          <motion.div
            initial={{ top: "-25%", opacity: 0 }}
            whileInView={{
              top: ["-25%", "100%"],
              opacity: [0, 0.4, 0]
            }}
            viewport={{ once: true }}
            transition={{
              duration: 1.5,
              ease: "easeInOut",
              delay: 0.6
            }}
            className="absolute left-0 right-0 h-[25%] bg-gradient-to-b from-transparent via-white/10 to-transparent pointer-events-none"
          />
        </div>

      </div>
    </section>
  );
}
