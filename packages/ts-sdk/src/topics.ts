import { errorText, keyRegion } from "./doctor";
import { UNCOIL_REGION_HOSTS, type UncoilRegion } from "./index";

export interface TopicEntry {
  name: string;
  description: string;
  count: number;
  share: number;
  sampleRunIds: string[];
}

export interface TopicsResponse {
  projectId: string;
  map: { status: string; builtAt: string } | null;
  facets: Record<string, TopicEntry[]>;
}

export interface TopicsOptions {
  apiKey?: string;
  region?: UncoilRegion;
  host?: string;
  timeoutMs?: number;
}

export type TopicsResult = { ok: true; data: TopicsResponse } | { ok: false; message: string };

/** Fetches the project's current topics with the project API key. Never throws. */
export async function runTopics(options: TopicsOptions = {}): Promise<TopicsResult> {
  const apiKey = (options.apiKey || (process.env.UNCOIL_API_KEY ?? process.env.TRACIFY_API_KEY) || "").trim();
  if (!apiKey) return { ok: false, message: "No API key found. Set UNCOIL_API_KEY, pass --key, or run `npx @uncoil.dev/sdk login`." };
  const envRegion = (process.env.UNCOIL_REGION ?? process.env.TRACIFY_REGION)?.trim().toLowerCase();
  const wanted = options.region || (envRegion === "eu" || envRegion === "us" ? envRegion : undefined);
  const host = (options.host || (process.env.UNCOIL_HOST ?? process.env.TRACIFY_HOST) || UNCOIL_REGION_HOSTS[wanted ?? keyRegion(apiKey) ?? "eu"]).replace(/\/$/, "");
  let response: Response;
  try {
    response = await fetch(`${host}/api/sdk/topics`, { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(options.timeoutMs ?? 15_000) });
  } catch (error) {
    return { ok: false, message: `Could not reach ${host} (${errorText(error).split(apiKey).join("[key]")}). Check your internet connection and the host setting.` };
  }
  if (response.status === 401) return { ok: false, message: "Uncoil rejected the API key (401). It is wrong, was revoked, or belongs to another region." };
  if (response.status === 404) return { ok: false, message: `Topics are not available on ${host} yet (404). The server may be older than this SDK version.` };
  if (!response.ok) return { ok: false, message: `Uncoil answered with HTTP ${response.status}.` };
  let data: TopicsResponse;
  try { data = (await response.json()) as TopicsResponse; } catch { return { ok: false, message: "Uncoil sent a reply that is not valid JSON." }; }
  const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
  if (!isObject(data) || !isObject(data.facets) || (data.map !== null && !isObject(data.map))) return { ok: false, message: "Uncoil sent an unexpected topics reply." };
  if (!data.map) return { ok: false, message: "No topic map has been built for this project yet. Send more traces and try again later." };
  return { ok: true, data };
}

/** Plain-text listing: one block per facet, one line per topic, with sample trace ids. */
export function formatTopics(data: TopicsResponse) {
  const lines = [`Topics for project ${data.projectId}${data.map ? ` (map ${data.map.status}, built ${data.map.builtAt})` : ""}`];
  for (const [facet, topics] of Object.entries(data.facets)) {
    lines.push("", facet);
    if (!topics.length) lines.push("  (no topics)");
    for (const topic of topics) {
      lines.push(`  ${topic.name}  ${topic.count} traces  ${Math.round(topic.share * 100)}%`);
      if (topic.description) lines.push(`    ${topic.description}`);
      if (topic.sampleRunIds.length) lines.push(`    samples: ${topic.sampleRunIds.join(", ")}`);
    }
  }
  return lines.join("\n");
}
