/**
 * Reads the public status feeds that AI providers publish and turns them into
 * one shape. Used by the AI API status tool through a small server route, since
 * browsers cannot read these feeds directly (no CORS).
 *
 * Rule: a feed that cannot be reached or understood is "unknown", never
 * "operational". A green light must always come from a real answer.
 */

export type ProviderState = "operational" | "degraded" | "outage" | "maintenance" | "unknown";

export type ProviderDef = {
  id: string;
  name: string;
  /** What people know it for, shown under the name. */
  products: string;
  /** The human status page. */
  page: string;
  /** Feeds to try in order. The first one that answers is used. */
  feeds: readonly string[];
};

export const providerDefs: readonly ProviderDef[] = [
  { id: "openai", name: "OpenAI", products: "ChatGPT, API, Codex", page: "https://status.openai.com", feeds: ["https://status.openai.com/api/v2/summary.json"] },
  { id: "anthropic", name: "Anthropic", products: "Claude, Claude API, Claude Code", page: "https://status.claude.com", feeds: ["https://status.claude.com/api/v2/summary.json", "https://status.anthropic.com/api/v2/summary.json"] },
  { id: "google", name: "Google Gemini", products: "Gemini API, Vertex AI", page: "https://status.cloud.google.com", feeds: ["https://status.cloud.google.com/incidents.json"] },
  { id: "mistral", name: "Mistral", products: "La Plateforme, Le Chat", page: "https://status.mistral.ai", feeds: ["https://status.mistral.ai/api/v2/summary.json", "https://status.mistral.ai/summary.json"] },
  { id: "cohere", name: "Cohere", products: "Command, Embed, Rerank", page: "https://status.cohere.com", feeds: ["https://status.cohere.com/api/v2/summary.json"] },
  { id: "groq", name: "Groq", products: "GroqCloud inference", page: "https://groqstatus.com", feeds: ["https://groqstatus.com/api/v2/summary.json", "https://groqstatus.com/summary.json"] },
  { id: "together", name: "Together AI", products: "Open model inference", page: "https://status.together.ai", feeds: ["https://status.together.ai/api/v2/summary.json", "https://status.together.ai/summary.json"] },
  { id: "deepseek", name: "DeepSeek", products: "DeepSeek API", page: "https://status.deepseek.com", feeds: ["https://status.deepseek.com/api/v2/summary.json"] },
  { id: "xai", name: "xAI", products: "Grok API", page: "https://status.x.ai", feeds: ["https://status.x.ai/api/v2/summary.json", "https://status.x.ai/summary.json"] },
  { id: "huggingface", name: "Hugging Face", products: "Hub, Inference Providers", page: "https://status.huggingface.co", feeds: ["https://status.huggingface.co/summary.json", "https://status.huggingface.co/api/v2/summary.json"] },
  { id: "perplexity", name: "Perplexity", products: "Sonar API", page: "https://status.perplexity.com", feeds: ["https://status.perplexity.com/summary.json", "https://status.perplexity.com/api/v2/summary.json"] },
  { id: "openrouter", name: "OpenRouter", products: "Model routing API", page: "https://status.openrouter.ai", feeds: ["https://status.openrouter.ai/api/v2/summary.json", "https://status.openrouter.ai/summary.json"] },
];

export type StatusComponent = { name: string; state: ProviderState };
export type StatusIncident = { title: string; impact: ProviderState; startedAt?: string; latest?: string; link?: string };

export type ProviderStatus = {
  id: string;
  name: string;
  products: string;
  page: string;
  state: ProviderState;
  /** Plain description from the provider, or why we could not tell. */
  description: string;
  components: StatusComponent[];
  incidents: StatusIncident[];
  /** When the provider last updated its page, if it says. */
  updatedAt?: string;
};

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, max = 400) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : undefined);

const rank: Record<ProviderState, number> = { unknown: 0, operational: 1, maintenance: 2, degraded: 3, outage: 4 };
export const worse = (a: ProviderState, b: ProviderState) => (rank[a] >= rank[b] ? a : b);

function componentState(raw: unknown): ProviderState {
  switch (String(raw).toLowerCase()) {
    case "operational": case "up": return "operational";
    case "degraded_performance": case "degraded": case "hasissues": case "partial_outage": case "partialoutage": return "degraded";
    case "major_outage": case "majoroutage": case "full_outage": case "down": return "outage";
    case "under_maintenance": case "undermaintenance": case "maintenance": return "maintenance";
    default: return "unknown";
  }
}

function impactState(raw: unknown): ProviderState {
  switch (String(raw).toLowerCase()) {
    case "major": case "critical": case "majoroutage": return "outage";
    default: return "degraded"; // minor, none and anything else still mean an open incident
  }
}

/** Atlassian Statuspage v2 summary.json, also served by incident.io status pages. */
export function parseStatuspage(json: unknown, def: Pick<ProviderDef, "id" | "name" | "products" | "page">): ProviderStatus | null {
  if (!isObj(json) || !isObj(json.status) || typeof json.status.indicator !== "string") return null;
  const components: StatusComponent[] = (Array.isArray(json.components) ? json.components : [])
    .filter(isObj)
    .filter((c) => c.group !== true && text(c.name))
    .map((c) => ({ name: text(c.name, 120)!, state: componentState(c.status) }));
  const incidents: StatusIncident[] = (Array.isArray(json.incidents) ? json.incidents : [])
    .filter(isObj)
    .filter((i) => String(i.status ?? "").toLowerCase() !== "resolved" && String(i.status ?? "").toLowerCase() !== "postmortem")
    .map((i) => {
      const updates = Array.isArray(i.incident_updates) ? i.incident_updates.filter(isObj) : [];
      return { title: text(i.name, 200) ?? "Incident", impact: impactState(i.impact), startedAt: text(i.started_at) ?? text(i.created_at), latest: text(updates[0]?.body, 300), link: text(i.shortlink, 200) };
    })
    .slice(0, 8);
  const maintenance = (Array.isArray(json.scheduled_maintenances) ? json.scheduled_maintenances : []).filter(isObj).filter((m) => String(m.status ?? "").toLowerCase() === "in_progress");

  let state: ProviderState = ({ none: "operational", minor: "degraded", major: "outage", critical: "outage", maintenance: "maintenance" } as Record<string, ProviderState>)[json.status.indicator] ?? "unknown";
  // The headline can say "all clear" while one component is down; trust the worse signal.
  for (const c of components) if (c.state !== "unknown" && c.state !== "maintenance" && rank[c.state] > rank[state] && state !== "unknown") state = c.state;
  if (state === "operational" && incidents.length > 0) state = incidents.reduce<ProviderState>((acc, i) => worse(acc, i.impact), "operational");
  if (state === "operational" && maintenance.length > 0) state = "maintenance";
  return {
    ...pick(def),
    state,
    description: text(json.status.description, 200) ?? stateLabel(state),
    components: sortComponents(components),
    incidents,
    updatedAt: isObj(json.page) ? text(json.page.updated_at) : undefined,
  };
}

/** Instatus summary.json: `{ page: { status: "UP" | "HASISSUES" | "UNDERMAINTENANCE" }, activeIncidents, activeMaintenances }`. */
export function parseInstatus(json: unknown, def: Pick<ProviderDef, "id" | "name" | "products" | "page">): ProviderStatus | null {
  if (!isObj(json) || !isObj(json.page) || typeof json.page.status !== "string") return null;
  const incidents: StatusIncident[] = (Array.isArray(json.activeIncidents) ? json.activeIncidents : [])
    .filter(isObj)
    .map((i) => ({ title: text(i.name, 200) ?? "Incident", impact: impactState(i.impact), startedAt: text(i.started), link: text(i.url, 200) }))
    .slice(0, 8);
  const maint = Array.isArray(json.activeMaintenances) ? json.activeMaintenances.length : 0;
  let state = componentState(json.page.status);
  if (state === "operational" && incidents.length > 0) state = incidents.reduce<ProviderState>((acc, i) => worse(acc, i.impact), "operational");
  if (state === "operational" && maint > 0) state = "maintenance";
  return { ...pick(def), state, description: stateLabel(state), components: [], incidents };
}

/** Google Cloud incidents.json: a list of incidents, ongoing ones have no `end`. Filtered to AI products. */
export function parseGoogleIncidents(json: unknown, def: Pick<ProviderDef, "id" | "name" | "products" | "page">, now = Date.now()): ProviderStatus | null {
  if (!Array.isArray(json)) return null;
  const ai = /gemini|vertex ai|generative|ai platform|agent|model garden/i;
  const ongoing = json.filter(isObj).filter((i) => !i.end && ai.test(`${i.service_name ?? ""} ${i.external_desc ?? ""}`));
  const incidents: StatusIncident[] = ongoing.slice(0, 8).map((i) => {
    const sev = String(i.severity ?? "").toLowerCase();
    const impact = String(i.status_impact ?? "").toUpperCase();
    return {
      title: text(i.external_desc, 200) ?? `${text(i.service_name) ?? "Google AI"} incident`,
      impact: sev === "high" || impact === "SERVICE_OUTAGE" ? "outage" : "degraded",
      startedAt: text(i.begin),
      latest: text(isObj(i.most_recent_update) ? i.most_recent_update.text : undefined, 300),
      link: typeof i.uri === "string" ? `https://status.cloud.google.com/${i.uri.replace(/^\//, "")}` : undefined,
    };
  });
  void now;
  const state = incidents.length === 0 ? "operational" : incidents.reduce<ProviderState>((acc, i) => worse(acc, i.impact), "operational");
  return { ...pick(def), state, description: incidents.length === 0 ? "No ongoing incidents for Gemini or Vertex AI" : stateLabel(state), components: [], incidents };
}

function pick(def: Pick<ProviderDef, "id" | "name" | "products" | "page">) {
  return { id: def.id, name: def.name, products: def.products, page: def.page };
}

function sortComponents(list: StatusComponent[]) {
  return [...list].sort((a, b) => rank[b.state] - rank[a.state]);
}

export function stateLabel(state: ProviderState): string {
  return { operational: "All systems operational", degraded: "Some problems reported", outage: "Major problems reported", maintenance: "Maintenance in progress", unknown: "Status unavailable" }[state];
}

export function parseFeed(json: unknown, def: ProviderDef): ProviderStatus | null {
  return parseStatuspage(json, def) ?? parseInstatus(json, def) ?? parseGoogleIncidents(json, def);
}

export function unknownStatus(def: ProviderDef, why: string): ProviderStatus {
  return { ...pick(def), state: "unknown", description: why, components: [], incidents: [] };
}

/** Fetches one provider. Every failure becomes "unknown" with a reason. */
export async function fetchProvider(def: ProviderDef, doFetch: typeof fetch = fetch, timeoutMs = 6000): Promise<ProviderStatus> {
  let lastReason = "Could not reach the provider's status feed";
  for (const url of def.feeds) {
    try {
      const res = await doFetch(url, { headers: { accept: "application/json", "user-agent": "Mozilla/5.0 (compatible; UncoilStatusCheck/1.0; +https://www.uncoil.dev/tools/ai-api-status)" }, signal: AbortSignal.timeout(timeoutMs), redirect: "follow", next: { revalidate: 60 } } as RequestInit);
      if (!res.ok) {
        lastReason = `The status feed answered with an error (${res.status})`;
        continue;
      }
      const body = await res.text();
      if (body.length > 5_000_000) {
        lastReason = "The status feed was unexpectedly large";
        continue;
      }
      const parsed = parseFeed(JSON.parse(body), def);
      if (parsed) return parsed;
      lastReason = "The status feed was in a format we do not recognise";
    } catch (error) {
      lastReason = error instanceof Error && error.name === "TimeoutError" ? "The status feed did not answer in time" : "Could not reach the provider's status feed";
    }
  }
  return unknownStatus(def, lastReason);
}

export async function fetchAllProviders(doFetch: typeof fetch = fetch): Promise<ProviderStatus[]> {
  return Promise.all(providerDefs.map((def) => fetchProvider(def, doFetch)));
}
