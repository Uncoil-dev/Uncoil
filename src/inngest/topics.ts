import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";

import { getConvexClient } from "@/lib/convex";
import { inngest } from "@/lib/inngest";
import { decryptIntegrationSecret } from "@/lib/integration-crypto";
import { chatUrl, connectionKey } from "@/lib/project-llm";
import { finishedTraceRunIds, getSpansForRun } from "@/lib/tinybird";
import { parseTraceFilters } from "@/lib/trace-filters";
import { DEFAULT_FACETS, ProviderError, providerMessage, runTopicBuild, type BuildDeps } from "./topic-build";

const DAY_MS = 24 * 60 * 60 * 1000;
/** A live map looks at the last week of finished traces. */
const WINDOW_DAYS = 7;

export const TOPIC_BUILD_EVENT = "uncoil/topics.build";

function jobSecret() {
  return process.env.UNCOIL_RETENTION_SECRET ?? process.env.TRACIFY_RETENTION_SECRET ?? "";
}

/** The project's own connection only. Without one (or without the server key) the built-in rules summarize. */
async function projectModel(projectId: Id<"projects">, secret: string): Promise<BuildDeps["callModel"]> {
  const key = connectionKey();
  if (!key) return undefined;
  const connection = await getConvexClient().query(api.topics.jobGetConnection, { jobSecret: secret, projectId });
  if (!connection) return undefined;
  const apiKey = await decryptIntegrationSecret(connection.ciphertext, key);
  return async (prompt) => {
    const response = await fetch(chatUrl(connection.baseUrl), {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: connection.defaultModel ?? "gpt-4o-mini", temperature: 0, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] }),
    });
    // The provider's own error text is not kept: it can echo parts of the key.
    if (!response.ok) throw new ProviderError(providerMessage(response.status));
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content ?? "";
  };
}

/** Builds or refreshes one project's topic map. Sent by the daily job and by the "Refresh map" action. */
export const buildTopicMap = inngest.createFunction(
  {
    id: "build-topic-map",
    name: "Build topic map",
    retries: 2,
    concurrency: { limit: 1, key: "event.data.projectId" },
    triggers: [{ event: TOPIC_BUILD_EVENT }],
  },
  async ({ event, step }) => {
    const projectId = event.data.projectId as Id<"projects">;
    const secret = jobSecret();
    if (!secret) return { skipped: true, reason: "job secret is not set" };
    return step.run("build", async () => {
      const convex = getConvexClient();
      const existing = await convex.query(api.topics.jobGetMap, { jobSecret: secret, projectId });
      const filters: Record<string, string> = (event.data.filters as Record<string, string> | undefined) ?? existing?.filters ?? {};
      const now = Date.now();
      const params = new URLSearchParams(filters);
      params.set("from", String(now - WINDOW_DAYS * DAY_MS));
      params.set("to", String(now));
      const traceFilters = parseTraceFilters(params, now);
      const callModel = await projectModel(projectId, secret);
      return runTopicBuild({
        map: { filters, facets: existing?.facets ?? DEFAULT_FACETS, sampleRate: existing?.sampleRate ?? 1, live: existing?.live ?? true },
        finishedRunIds: (limit) => finishedTraceRunIds(projectId, traceFilters, limit),
        missingRunIds: (runIds) => convex.query(api.topics.jobMissingRunIds, { jobSecret: secret, projectId, runIds }),
        spans: (runId) => getSpansForRun(runId, projectId),
        callModel,
        saveSummaries: (summaries) => convex.mutation(api.topics.jobSaveSummaries, { jobSecret: secret, projectId, summaries }),
        getSummaries: (runIds) => convex.query(api.topics.jobGetSummaries, { jobSecret: secret, projectId, runIds }),
        replaceTopics: (topics) => convex.mutation(api.topics.jobReplaceTopics, { jobSecret: secret, projectId, topics }),
        saveMap: (fields) => convex.mutation(api.topics.jobSaveMap, { jobSecret: secret, projectId, ...fields }),
        now: Date.now,
      });
    });
  },
);

/** Every day, asks each live map (not paused) to rebuild. */
export const dailyTopicMaps = inngest.createFunction(
  { id: "daily-topic-maps", name: "Refresh live topic maps", retries: 1, triggers: [{ cron: "43 4 * * *" }] },
  async ({ step }) => {
    const secret = jobSecret();
    if (!secret) return { skipped: true, reason: "job secret is not set" };
    const maps = await step.run("list-live-maps", () => getConvexClient().query(api.topics.jobListLiveMaps, { jobSecret: secret }));
    if (maps.length) await step.sendEvent("queue-builds", maps.map((map) => ({ name: TOPIC_BUILD_EVENT, data: { projectId: map.projectId } })));
    return { queued: maps.length };
  },
);
