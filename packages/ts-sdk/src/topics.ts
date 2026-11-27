import { UNCOIL_REGION_HOSTS, type UncoilRegion } from "./index";

export interface TopicsOptions {
  apiKey?: string;
  region?: UncoilRegion;
  host?: string;
  /** Seconds-to-milliseconds budget for the request. Defaults to 15 seconds. */
  timeoutMs?: number;
}

export interface TopicsResult {
  total: number;
  /** True when older matching traces were left out of the grouping. */
  sampled: boolean;
  topics: Array<{ id: string; name: string; count: number; errorRate: number; sampleRunIds: string[] }>;
}

/** Reads the project's current topics with its API key. Throws an Error with a plain message on failure. */
export async function fetchTopics(options: TopicsOptions = {}): Promise<TopicsResult> {
  const apiKey = (options.apiKey || process.env.UNCOIL_API_KEY || "").trim();
  if (!apiKey) throw new Error("No API key was found. Set UNCOIL_API_KEY, run `npx @uncoil.dev/sdk login`, or pass --key.");
  const region = options.region ?? (/^uncoil_sk_live_us_/.test(apiKey) ? "us" : "eu");
  const host = (options.host || process.env.UNCOIL_HOST || UNCOIL_REGION_HOSTS[region]).replace(/\/$/, "");
  const response = await fetch(`${host}/api/sdk/topics`, { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(options.timeoutMs ?? 15_000) });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Topics request failed (HTTP ${response.status}).`);
  }
  return (await response.json()) as TopicsResult;
}

export function formatTopics(result: TopicsResult): string {
  if (result.topics.length === 0) return "No topics yet. Send some traces first.";
  const lines = result.topics.map((topic) => `${String(topic.count).padStart(5)}  ${topic.name}  (${Math.round(topic.errorRate * 100)}% errors, e.g. ${topic.sampleRunIds.slice(0, 3).join(", ")})`);
  if (result.sampled) lines.push("Only the newest traces were grouped.");
  return lines.join("\n");
}
