"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";

const USE_CASES = [
  {
    label: "DEVELOPERS",
    headline: "Debug multi-step agents without reading raw logs",
    problem: "Install the SDK, send spans, inspect the trace, copy payloads, and see exactly which model or tool call failed.",
    logs: [
      "> pip install uncoil-sdk",
      "> span accepted",
      "> trace ready",
      "> copy_payload input"
    ]
  },
  {
    label: "AI STARTUPS",
    headline: "Explain reliability and cost before customers ask",
    problem: "Track cost over time, model usage, failed runs, and expensive traces so production agents do not become a black box.",
    logs: [
      "> daily_cost: $42.18",
      "> failed_runs: 3",
      "> model_breakdown ready",
      "> reliability_report generated"
    ]
  },
  {
    label: "AI AGENCIES",
    headline: "Show clients what their workflows did in production",
    problem: "Label projects by client, collect proof of failures and fixes, and print reports that stakeholders can understand.",
    logs: [
      "> client_label: acme",
      "> report_notes saved",
      "> notable_failed_trace linked",
      "> stakeholder_report printed"
    ]
  },
  {
    label: "INTERNAL TEAMS",
    headline: "Operate shared agents with access control and alerts",
    problem: "Give product, engineering, and operations one view of runs, costs, Slack alerts, settings, and project ownership.",
    logs: [
      "> org_members synced",
      "> slack_threshold active",
      "> api_key_rotated",
      "> read_all_alerts"
    ]
  },
  {
    label: "OPERATORS",
    headline: "Catch failures before users escalate them",
    problem: "Watch failed runs, cost spikes, stalls, retries, and alert status from the same dashboard used for trace triage.",
    logs: [
      "> cost_exceeded",
      "> run_failed",
      "> alert unread",
      "> trace opened"
    ]
  },
  {
    label: "RESEARCH",
    headline: "Agents that browse, summarize, and synthesize information",
    problem: "They call multiple tools, retry queries, and generate inconsistent outputs. You don’t know which step failed or why the answer changed.",
    logs: [
      "> tool_call web_search",
      "> retry attempt 3",
      "> llm_call failed (timeout)",
      "> partial_output_streamed"
    ]
  },
  {
    label: "SUPPORT",
    headline: "Agents handling user conversations in production",
    problem: "Context grows, responses drift, and failures are unpredictable. When something breaks, you need the exact trace of what the agent saw.",
    logs: [
      "> tokens_consumed: 12,402",
      "> drift_detected (confidence: 0.12)",
      "> response_malformed_json",
      "> session_terminated_unexpectedly"
    ]
  },
  {
    label: "AUTOMATION",
    headline: "Agents executing multi-step workflows",
    problem: "Dozens of steps, retries, and edge cases. A single failure breaks the chain, and you have no visibility into where it happened.",
    logs: [
      "> executing_step: 14/32",
      "> db_lock_retry: true",
      "> chain_break: step_15_failed",
      "> rollback_initiated"
    ]
  },
  {
    label: "TOOL CALLING",
    headline: "Agents calling APIs and external tools",
    problem: "They loop, retry, and escalate costs silently. Your API bill increases, but you don’t know what caused it.",
    logs: [
      "> tool_call search_db",
      "> loop_detected: cycle_4",
      "> cost_escalation: +$1.42",
      "> run_aborted (safety_limit)"
    ]
  }
];

function UseCaseItem({ item, isLast }: { item: typeof USE_CASES[0], isLast: boolean }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { amount: 0.6 });

  const getLogColor = (log: string) => {
    if (log.toLowerCase().includes("escalation") || log.toLowerCase().includes("+$")) return "#EF4444";
    return "#444444";
  };

  return (
    <div
      ref={ref}
      className={`w-full py-12 border-t border-[#1A1A1A] transition-opacity duration-500 ${isInView ? 'opacity-100' : 'opacity-20'}`}
    >
      <div className="grid grid-cols-1 md:grid-cols-[160px_1fr_300px] gap-8 md:gap-12 items-start">
        {/* Label */}
        <div className="font-mono text-[11px] text-[#666666] uppercase tracking-[0.3em] pt-1">
          {item.label}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4">
          <h3 className="font-pixel text-[20px] md:text-[24px] text-white uppercase tracking-tighter leading-none" style={{ fontFamily: "var(--font-pixel)" }}>
            {item.headline}
          </h3>
          <p className="font-sans text-[15px] text-[#999999] leading-relaxed max-w-[600px]">
            {item.problem}
          </p>
        </div>

        {/* Visual Logs */}
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-4 flex flex-col gap-1.5 min-h-[100px]">
          {item.logs.map((log, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.2 }}
              className="font-mono text-[10px] whitespace-nowrap overflow-hidden"
              style={{ color: getLogColor(log) }}
            >
              <span className="text-[#222222] mr-2">0{i + 1}</span>
              {log}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function UseCases() {
  return (
    <section
      className="w-full py-16"
      style={{ backgroundColor: "#050505" }}
    >
      <div className="mx-auto w-full px-6 md:px-8 max-w-[1200px]">

        {/* Header */}
        <div className="mb-12">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-mono text-[12px] uppercase tracking-[0.3em] mb-6"
            style={{ color: "#666666" }}
          >
            WHO USES UNCOIL?
          </motion.div>
          <motion.h2
            initial={{ y: 12 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true }}
            className="font-pixel font-bold text-white mb-6 uppercase tracking-tighter"
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "clamp(32px, 5vw, 44px)"
            }}
          >
            Built for agent builders and operators.
          </motion.h2>
        </div>

        {/* List */}
        <div className="flex flex-col">
          {USE_CASES.map((item, i) => (
            <UseCaseItem
              key={i}
              item={item}
              isLast={i === USE_CASES.length - 1}
            />
          ))}
        </div>

      </div>
    </section>
  );
}
