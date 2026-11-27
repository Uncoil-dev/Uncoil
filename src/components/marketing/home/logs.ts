// The example run as ordinary application logs, generated from the same spans the trace view
// draws, so "your logs" and "Uncoil" on the page show one run with the same data.

import type { ExampleSpan } from "./run-data";

export type LogLine = { time: string; level: "DEBUG" | "INFO" | "WARN" | "ERROR"; text: string };

const clock = (iso: string, plusMs = 0) => new Date(Date.parse(iso) + plusMs).toISOString().slice(11, 23);

/** One run as log lines in time order: a start line, two lines per step, and a stack on failure. */
export function logLines(run: readonly ExampleSpan[], runId: string): LogLine[] {
  const root = run.find((s) => !s.parentSpanId)!;
  const out: (LogLine & { at: number })[] = [];
  const push = (iso: string, plus: number, level: LogLine["level"], text: string) => out.push({ at: Date.parse(iso) + plus, time: clock(iso, plus), level, text });
  push(root.createdAt, 0, "INFO", `${root.name} start run=${runId}`);
  for (const s of run) {
    if (s.spanType === "llm_call") {
      push(s.createdAt, 0, "DEBUG", `openai POST /v1/chat/completions model=${s.modelId}`);
      push(s.createdAt, s.latencyMs, "DEBUG", `openai 200 OK tokens=${(s.inputTokens ?? 0) + (s.outputTokens ?? 0)} ${s.latencyMs}ms`);
    } else if (s.spanType === "tool_call") {
      push(s.createdAt, 0, "INFO", `tools ${s.name} ${s.detail.input.replace(/^[\w.]+\(|\)$/g, "")}`);
      if (s.errorType) {
        push(s.createdAt, s.latencyMs, "ERROR", `tools ${s.name} ${s.errorType}: ${s.errorMessage}`);
        push(s.createdAt, s.latencyMs, "ERROR", `    at ToolClient.call (src/tools/${s.name.split(".")[0]}.ts:41:11)`);
        push(s.createdAt, s.latencyMs, "ERROR", "    at runTool (src/agent/tools.ts:88:20)");
      } else {
        // Tools report a count or a short summary and the time, like most tool wrappers log them.
        const result = /0 results/.test(s.detail.output) ? "hits=0" : "ok";
        push(s.createdAt, s.latencyMs, "INFO", `tools ${s.name} ${result} ${s.latencyMs}ms`);
      }
    }
  }
  push(root.createdAt, root.latencyMs + 20, "WARN", `${root.name} run failed after ${(root.latencyMs / 1000).toFixed(1)}s`);
  return out.sort((a, b) => a.at - b.at).map(({ time, level, text }) => ({ time, level, text }));
}
