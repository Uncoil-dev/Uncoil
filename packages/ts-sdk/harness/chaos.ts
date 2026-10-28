/**
 * Chaos harness for TS SDK orchestration testing.
 *
 * Makes real (or realistically delayed) HTTP calls so timing and
 * cancellation behavior are tested under real network conditions.
 *
 * Usage:
 *   npx tsx packages/ts-sdk/harness/chaos.ts --iterations 20 --policy enforce
 */

import { UncoilClient, RuntimePolicy } from "../src/index";

// ─── Failure modes ────────────────────────────────────────────────
type FailureMode =
  | "success"
  | "timeout"       // sleep past latencyBudgetMs
  | "429"           // rate limit
  | "500"           // server error
  | "cost_overrun"; // fake large costUsd

interface ChaosConfig {
  iterations: number;
  failureMix: Record<FailureMode, number>; // 0-1 weights, normalized
  primaryModel: string;
  fallbackModels: string[];
  latencyBudgetMs?: number;
  maxCostPerRun?: number;
  maxCostPerDay?: number;
  baseUrl: string;  // real endpoint to hit for "success" calls
  apiKey: string;
  runId: string;
}

interface IterationResult {
  iteration: number;
  model: string;
  failureMode: FailureMode;
  success: boolean;
  latencyMs: number;
  error?: string;
  blocked?: boolean;
  fallbackReason?: string;
  failOpen?: boolean;
}

// ─── Sample config ────────────────────────────────────────────────
const DEFAULT_CONFIG: ChaosConfig = {
  iterations: 20,
  failureMix: {
    success: 0.4,
    timeout: 0.15,
    "429": 0.15,
    "500": 0.15,
    cost_overrun: 0.15,
  },
  primaryModel: "gpt-4o",
  fallbackModels: ["claude-sonnet-4-20250514", "gpt-4o-mini"],
  latencyBudgetMs: 5000,
  maxCostPerRun: 0.05,
  maxCostPerDay: 0.50,
  baseUrl: "https://api.openai.com",
  apiKey: process.env.OPENAI_API_KEY ?? "",
  runId: `chaos_${Date.now()}`,
};

// ─── Chaos call factory ───────────────────────────────────────────
function createChaosCall(config: ChaosConfig, mode: FailureMode) {
  return async (model: string, signal: AbortSignal): Promise<any> => {
    switch (mode) {
      case "success": {
        // Make a real HTTP call with abort support
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), config.latencyBudgetMs ?? 30000);

        // Link external abort to internal
        signal.addEventListener("abort", () => controller.abort());

        try {
          const res = await fetch(`${config.baseUrl}/v1/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: "Say exactly: chaos test ok" }],
              max_tokens: 10,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeout);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.json();
        } catch (e) {
          clearTimeout(timeout);
          throw e;
        }
      }

      case "timeout": {
        // Sleep longer than latencyBudgetMs to trigger abort
        const sleepMs = (config.latencyBudgetMs ?? 5000) + 2000;
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, sleepMs);
          signal.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new DOMException("The operation was aborted", "AbortError"));
          });
        });
        return { content: "should not reach here" };
      }

      case "429": {
        const err = new Error("429 Rate limit exceeded");
        (err as any).status = 429;
        throw err;
      }

      case "500": {
        const err = new Error("500 Internal Server Error");
        (err as any).status = 500;
        throw err;
      }

      case "cost_overrun": {
        // Return a large result that trips the cost ceiling
        return {
          content: "x".repeat(10000),
          _metadata: { estimatedCostUsd: 1.0 },
        };
      }

      default:
        throw new Error(`Unknown failure mode: ${mode}`);
    }
  };
}

// ─── Weighted random selection ────────────────────────────────────
function pickFailureMode(mix: Record<FailureMode, number>): FailureMode {
  const entries = Object.entries(mix) as [FailureMode, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [mode, weight] of entries) {
    r -= weight;
    if (r <= 0) return mode;
  }
  return entries[entries.length - 1][0];
}

// ─── Run harness ──────────────────────────────────────────────────
async function runChaosHarness(config: ChaosConfig): Promise<IterationResult[]> {
  const client = new UncoilClient({
    apiKey: config.apiKey,
    host: "http://localhost:3000",  // point at local dev server
  });

  const results: IterationResult[] = [];

  for (let i = 0; i < config.iterations; i++) {
    const mode = pickFailureMode(config.failureMix);
    const allModels = [config.primaryModel, ...config.fallbackModels];
    const policy: RuntimePolicy = {
      enforcementMode: "enforce",
      fallbackChain: allModels,
      maxCostPerRun: config.maxCostPerRun,
      maxCostPerDay: config.maxCostPerDay,
      latencyBudgetMs: config.latencyBudgetMs,
      retryPolicy: {
        maxAttempts: 2,
        backoffMs: 500,
        backoffMultiplier: 2,
        retryableErrors: ["429", "5xx", "rate_limit", "timeout"],
      },
    };

    const calculateCost = mode === "cost_overrun"
      ? () => 1.0
      : undefined;

    const start = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      await client.orchestrate({
        model: config.primaryModel,
        policy,
        call: createChaosCall(config, mode),
        input: { chaosIteration: i, failureMode: mode },
        calculateCost,
        runId: `${config.runId}_iter${i}`,
      });
      success = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }

    results.push({
      iteration: i,
      model: config.primaryModel,
      failureMode: mode,
      success,
      latencyMs: Date.now() - start,
      error,
      failOpen: (client as any)._lastFailOpen,
    });
  }

  return results;
}

// ─── Report ───────────────────────────────────────────────────────
function printReport(results: IterationResult[]) {
  console.log("\n" + "═".repeat(72));
  console.log("  CHAOS HARNESS REPORT");
  console.log("═".repeat(72));

  const byMode = new Map<FailureMode, IterationResult[]>();
  for (const r of results) {
    const arr = byMode.get(r.failureMode) ?? [];
    arr.push(r);
    byMode.set(r.failureMode, arr);
  }

  for (const [mode, items] of byMode) {
    const successes = items.filter((r) => r.success).length;
    const avgLatency = items.reduce((s, r) => s + r.latencyMs, 0) / items.length;
    const failOpens = items.filter((r) => r.failOpen).length;

    console.log(`\n  ${mode.toUpperCase().padEnd(16)} ${items.length} iterations`);
    console.log(`    Success:      ${successes}/${items.length}`);
    console.log(`    Avg latency:  ${avgLatency.toFixed(0)}ms`);
    if (failOpens > 0) console.log(`    Fail-open:    ${failOpens}`);
    for (const r of items.filter((r) => r.error)) {
      console.log(`    Error:        [iter ${r.iteration}] ${r.error}`);
    }
  }

  const totalSuccess = results.filter((r) => r.success).length;
  const totalFailOpen = results.filter((r) => r.failOpen).length;
  console.log(`\n  TOTAL: ${totalSuccess}/${results.length} succeeded, ${totalFailOpen} fail-open`);
  console.log("═".repeat(72) + "\n");
}

// ─── CLI entry ────────────────────────────────────────────────────
const args = process.argv.slice(2);
const config = { ...DEFAULT_CONFIG };

for (let i = 2; i < args.length; i += 2) {
  switch (args[i]) {
    case "--iterations": config.iterations = Number(args[i + 1]); break;
    case "--latency-budget": config.latencyBudgetMs = Number(args[i + 1]); break;
    case "--max-cost-run": config.maxCostPerRun = Number(args[i + 1]); break;
    case "--max-cost-day": config.maxCostPerDay = Number(args[i + 1]); break;
    case "--base-url": config.baseUrl = args[i + 1]; break;
    case "--api-key": config.apiKey = args[i + 1]; break;
    case "--run-id": config.runId = args[i + 1]; break;
  }
}

console.log(`Running ${config.iterations} chaos iterations...`);
console.log(`Policy: enforce, latency=${config.latencyBudgetMs}ms, cost/run=$${config.maxCostPerRun}, cost/day=$${config.maxCostPerDay}`);
console.log(`Failure mix:`, config.failureMix);

runChaosHarness(config).then((results) => {
  printReport(results);
  process.exit(0);
}).catch((e) => {
  console.error("Harness failed:", e);
  process.exit(1);
});
