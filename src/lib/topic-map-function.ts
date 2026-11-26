import { inngest } from "./inngest";
import { buildTopicMap, type TopicMapDeps, type TopicMapJob, type TopicMapResult } from "./topic-map-builder";

/** Where the Inngest function gets its maps and connections; the web server supplies the real one. */
export type TopicMapSource = {
  /** The map saved for one project, or null when it has none. */
  mapFor: (projectId: string) => Promise<TopicMapJob | null>;
  /** Maps that refresh every day. */
  liveMaps: () => Promise<TopicMapJob[]>;
  depsFor: (job: TopicMapJob) => TopicMapDeps;
};

/** One project when `projectId` is given (a refresh request), otherwise every live map (the daily run). */
export async function refreshTopicMaps(source: TopicMapSource, projectId?: string) {
  const jobs = projectId ? [await source.mapFor(projectId)].filter((job) => job !== null) : await source.liveMaps();
  const results: Array<{ projectId: string } & TopicMapResult> = [];
  for (const job of jobs) results.push({ projectId: job.projectId, ...(await buildTopicMap(job, source.depsFor(job))) });
  return results;
}

/** No retries: a provider error pauses the map with a message, and the owner refreshes it after fixing the connection. */
export function createTopicMapFunction(getSource: () => TopicMapSource) {
  return inngest.createFunction(
    {
      id: "build-topic-map",
      name: "Build topic maps",
      retries: 0,
      triggers: [{ event: "uncoil/topic-map.refresh" }, { cron: "41 4 * * *" }],
    },
    async ({ event, step }) => {
      const requested = (event.data as { projectId?: unknown } | undefined)?.projectId;
      const projectId = typeof requested === "string" ? requested : undefined;
      return step.run("build", () => refreshTopicMaps(getSource(), projectId));
    },
  );
}
