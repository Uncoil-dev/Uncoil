/**
 * Builds a project's topic map: summarizes finished traces that have no summary yet, groups each facet's summaries
 * into topics and saves the result. Everything that touches a service (ClickHouse, Convex, the model connection) is
 * passed in, so the steps and the pause-on-provider-error rule can be tested without any of them.
 */
import type { AskSpan } from "../lib/ask-ai.ts";
import { summarizeTrace } from "../lib/trace-facets.ts";
import { groupTraceTopics } from "../lib/trace-topics.ts";
import { findPrice, type ModelPrice } from "../../convex/modelPricing.ts";

export const MIN_TRACES = 10;
export const MAX_TRACES = 400;
export const BATCH = 100;
/** Rough size of one summary request: the trace text plus the instructions, and the short JSON answer. */
export const AVG_INPUT_TOKENS = 2000;
export const AVG_OUTPUT_TOKENS = 100;
export const DEFAULT_FACETS = ["intent", "sentiment", "outcome", "issues"];

export type Summary = { runId: string; intent: string; sentiment: string; outcome: string; issues: string[] };
export type TopicRow = { facet: string; name: string; description: string; count: number; share: number; sampleRunIds: string[] };
export type MapFields = {
  filters: Record<string, string>; facets: string[]; sampleRate: number; builtAt: number;
  status: "building" | "ready" | "failed" | "paused"; message?: string; live?: boolean;
};

export type BuildDeps = {
  map: { filters: Record<string, string>; facets: string[]; sampleRate: number; live?: boolean };
  /** Finished traces matching the map's filters, newest first. */
  finishedRunIds(limit: number): Promise<string[]>;
  missingRunIds(runIds: string[]): Promise<string[]>;
  spans(runId: string): Promise<AskSpan[]>;
  /** The project's own model connection, or undefined to use the built-in rules. */
  callModel?: (prompt: string) => Promise<string>;
  saveSummaries(rows: Summary[]): Promise<unknown>;
  getSummaries(runIds: string[]): Promise<Summary[]>;
  replaceTopics(rows: TopicRow[]): Promise<unknown>;
  saveMap(fields: MapFields): Promise<unknown>;
  now(): number;
};

/** Thrown by the model call when the provider refuses or fails; the build pauses the map instead of retrying. */
export class ProviderError extends Error {}

export function providerMessage(status: number) {
  if (status === 401 || status === 403) return "The model connection's key was rejected. Check the key in Project settings, then refresh the map.";
  if (status === 402 || status === 429) return "The model provider reported a quota or rate limit. Check the account, then refresh the map.";
  return `The model provider returned an error (${status}). The map is paused; refresh it to try again.`;
}

const chunk = <T>(items: T[], size: number) => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));

/** A stable pick: the same trace is always in or out for a given rate, so rebuilds do not reshuffle the sample. */
export function inSample(runId: string, rate: number) {
  if (rate >= 1) return true;
  let h = 2166136261;
  for (let i = 0; i < runId.length; i++) h = Math.imul(h ^ runId.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296 < rate;
}

export function estimateBuildCost(input: { traces: number; model?: string | null; prices?: ModelPrice[] }) {
  const traces = Math.max(0, Math.min(MAX_TRACES, Math.floor(input.traces)));
  const inputTokens = traces * AVG_INPUT_TOKENS;
  const outputTokens = traces * AVG_OUTPUT_TOKENS;
  const price = findPrice(input.model ?? undefined, input.prices);
  const costUsd = price ? (inputTokens * price.inputPerM + outputTokens * price.outputPerM) / 1_000_000 : null;
  return { traces, inputTokens, outputTokens, costUsd };
}

const CATEGORICAL = new Set(["sentiment", "outcome"]);

export function buildTopicRows(summaries: Summary[], facets: string[]): TopicRow[] {
  const rows: TopicRow[] = [];
  const total = summaries.length;
  for (const facet of facets) {
    if (CATEGORICAL.has(facet)) {
      const groups = new Map<string, string[]>();
      for (const s of summaries) {
        const value = String(s[facet as "sentiment" | "outcome"]);
        groups.set(value, [...(groups.get(value) ?? []), s.runId]);
      }
      for (const [name, runIds] of [...groups].sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1))) {
        rows.push({ facet, name, description: `${runIds.length} traces with ${facet} ${name.toLowerCase()}`, count: runIds.length, share: runIds.length / total, sampleRunIds: runIds.slice(0, 5) });
      }
      continue;
    }
    const traces = summaries.flatMap((s) => (facet === "issues" ? s.issues : [s.intent]).filter(Boolean).map((input) => ({ runId: s.runId, input, hasError: false })));
    for (const topic of groupTraceTopics(traces).topics) {
      rows.push({ facet, name: topic.name, description: topic.terms.length ? `Traces about ${topic.terms.slice(0, 4).join(", ")}` : topic.name, count: topic.count, share: topic.count / total, sampleRunIds: topic.sampleRunIds });
    }
  }
  return rows;
}

/**
 * One build. Returns what happened: `ready`, `waiting` (fewer than 10 summarized traces) or `paused` (the provider failed).
 * A provider failure stops the build at once and keeps the topics from the last good build.
 */
export async function runTopicBuild(deps: BuildDeps) {
  const { map } = deps;
  const base = { filters: map.filters, facets: map.facets, sampleRate: map.sampleRate, live: map.live };
  await deps.saveMap({ ...base, status: "building", builtAt: deps.now() });

  let providerFailure: string | undefined;
  const callModel = deps.callModel && (async (prompt: string) => {
    try {
      return await deps.callModel!(prompt);
    } catch (error) {
      if (error instanceof ProviderError) providerFailure = error.message;
      throw error;
    }
  });

  try {
    const sampled = (await deps.finishedRunIds(MAX_TRACES)).filter((id) => inSample(id, map.sampleRate));
    const missing = await deps.missingRunIds(sampled);
    for (const group of chunk(missing, BATCH)) {
      const rows: Summary[] = [];
      for (const runId of group) {
        const facets = await summarizeTrace(await deps.spans(runId), { callModel });
        if (providerFailure) break;
        rows.push({ runId, intent: facets.intent, sentiment: facets.sentiment, outcome: facets.outcome, issues: facets.issue.toLowerCase() === "none" ? [] : [facets.issue] });
      }
      if (rows.length) await deps.saveSummaries(rows);
      if (providerFailure) {
        await deps.saveMap({ ...base, status: "paused", message: providerFailure, builtAt: deps.now() });
        return { status: "paused" as const, message: providerFailure };
      }
    }

    const summaries = (await Promise.all(chunk(sampled, BATCH).map((ids) => deps.getSummaries(ids)))).flat();
    if (summaries.length < MIN_TRACES) {
      const message = `Needs ${MIN_TRACES - summaries.length} more finished traces before topics can be shown.`;
      await deps.saveMap({ ...base, status: "ready", message, builtAt: deps.now() });
      return { status: "waiting" as const, message };
    }
    await deps.replaceTopics(buildTopicRows(summaries, map.facets));
    await deps.saveMap({ ...base, status: "ready", builtAt: deps.now() });
    return { status: "ready" as const, summarized: summaries.length };
  } catch (error) {
    await deps.saveMap({ ...base, status: "failed", message: "The build stopped on an unexpected error. Refresh the map to try again.", builtAt: deps.now() });
    throw error;
  }
}
