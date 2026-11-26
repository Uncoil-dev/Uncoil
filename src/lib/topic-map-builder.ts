import type { AskSpan } from "./ask-ai.ts";
import { summarizeTrace } from "./trace-facets.ts";
import { groupTraceTopics } from "./trace-topics.ts";

/** A trace counts as finished once it has had no new spans for this long. */
export const FINISHED_AFTER_MS = 5 * 60_000;
/** A facet needs this many summarized traces before its topics are worth showing. */
export const MIN_TRACES_PER_FACET = 10;
/** Most traces summarized in one build, so a build stays bounded. */
const MAX_TRACES = 200;

export type TopicMapJob = { projectId: string; filters: Record<string, string>; facets: string[]; sampleRate: number };
export type TraceSummaryRow = { runId: string; intent: string; sentiment: string; outcome: string; issues: string[] };
export type TopicRow = { facet: string; name: string; description: string; count: number; share: number; sampleRunIds: string[] };
export type MapSave = { status: "building" | "ready" | "failed"; builtAt: number };

/** Everything that touches a network or database, so the build itself can run without one. */
export type TopicMapDeps = {
  now: () => number;
  listFinishedRuns: (job: TopicMapJob, finishedBeforeMs: number) => Promise<string[]>;
  missingRunIds: (runIds: string[]) => Promise<string[]>;
  loadSpans: (runId: string) => Promise<AskSpan[]>;
  callModel: (prompt: string) => Promise<string>;
  saveSummaries: (rows: TraceSummaryRow[]) => Promise<void>;
  loadSummaries: (runIds: string[]) => Promise<TraceSummaryRow[]>;
  saveTopics: (rows: TopicRow[]) => Promise<void>;
  saveMap: (map: MapSave) => Promise<void>;
};

export type TopicMapResult =
  | { status: "ready"; traces: number; shortfall: Record<string, number> }
  | { status: "failed"; message: string };

// Stable per-trace position in [0, 1), so a trace is either always or never in a given sample.
function sampleSlot(runId: string) {
  let h = 2166136261;
  for (let i = 0; i < runId.length; i++) h = Math.imul(h ^ runId.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

function facetText(row: TraceSummaryRow, facet: string) {
  const value = (row as Record<string, unknown>)[facet];
  return Array.isArray(value) ? value.join("; ") : typeof value === "string" ? value : "";
}

/**
 * Builds one project's topic map: picks finished traces at the sample rate, writes the missing summaries, groups each
 * facet's summaries into topics and saves them. A model provider error stops the build and marks the map failed
 * instead of falling back to rules, so the owner sees the problem rather than a quietly weaker map.
 */
export async function buildTopicMap(job: TopicMapJob, deps: TopicMapDeps): Promise<TopicMapResult> {
  await deps.saveMap({ status: "building", builtAt: deps.now() });
  let providerFailed = false;
  const callModel = async (prompt: string) => {
    try {
      return await deps.callModel(prompt);
    } catch (error) {
      providerFailed = true;
      throw error;
    }
  };
  try {
    const finished = await deps.listFinishedRuns(job, deps.now() - FINISHED_AFTER_MS);
    const runIds = finished.filter((id) => sampleSlot(id) < job.sampleRate).slice(0, MAX_TRACES);
    const fresh: TraceSummaryRow[] = [];
    for (const runId of await deps.missingRunIds(runIds)) {
      const facets = await summarizeTrace(await deps.loadSpans(runId), { callModel });
      if (providerFailed) break;
      fresh.push({ runId, intent: facets.intent, sentiment: facets.sentiment, outcome: facets.outcome, issues: facets.issue ? [facets.issue] : [] });
    }
    if (fresh.length) await deps.saveSummaries(fresh);
    if (providerFailed) return await fail(deps, "The model connection returned an error, so this map is paused. Check the connection and refresh the map.");

    const summaries = await deps.loadSummaries(runIds);
    const topics: TopicRow[] = [];
    const shortfall: Record<string, number> = {};
    for (const facet of job.facets) {
      if (summaries.length < MIN_TRACES_PER_FACET) { shortfall[facet] = MIN_TRACES_PER_FACET - summaries.length; continue; }
      const { total, topics: grouped } = groupTraceTopics(summaries.map((row) => ({ runId: row.runId, input: facetText(row, facet), hasError: false })));
      for (const topic of grouped) {
        topics.push({ facet, name: topic.name, description: topic.terms.join(", "), count: topic.count, share: total ? topic.count / total : 0, sampleRunIds: topic.sampleRunIds });
      }
    }
    await deps.saveTopics(topics);
    await deps.saveMap({ status: "ready", builtAt: deps.now() });
    return { status: "ready", traces: summaries.length, shortfall };
  } catch (error) {
    console.error("Topic map build failed:", error instanceof Error ? error.message : "unknown error");
    return await fail(deps, "The map could not be built. Try refreshing it again in a moment.");
  }
}

async function fail(deps: TopicMapDeps, message: string): Promise<TopicMapResult> {
  await deps.saveMap({ status: "failed", builtAt: deps.now() });
  return { status: "failed", message };
}
