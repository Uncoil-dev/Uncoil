import { createSign } from "node:crypto";

/**
 * Google Search Console and Bing Webmaster numbers for the admin page.
 * Server only. Keys live in the environment and never reach the browser.
 */
export type SearchRow = { key: string; clicks: number; impressions: number; position: number | null };
export type SearchDay = { day: string; clicks: number; impressions: number };
export type SearchReport =
  | { status: "not_configured"; missing: string[] }
  | { status: "error"; message: string }
  | {
      status: "ok";
      site: string;
      totals: { clicks: number; impressions: number; ctr: number; position: number | null };
      days: SearchDay[];
      queries: SearchRow[];
      pages: SearchRow[];
      health: { label: string; value: number; tone: "ok" | "warn" | "bad" }[];
    };

type Fetcher = typeof fetch;
const DAY = 24 * 3600 * 1000;
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const b64url = (v: string | Buffer) => Buffer.from(v).toString("base64url");

function summarize(days: SearchDay[], position: number | null) {
  const clicks = days.reduce((a, d) => a + d.clicks, 0);
  const impressions = days.reduce((a, d) => a + d.impressions, 0);
  return { clicks, impressions, ctr: impressions ? clicks / impressions : 0, position };
}

/* ---------- Google Search Console ---------- */

async function googleToken(json: { client_email: string; private_key: string }, doFetch: Fetcher) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: json.client_email, scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3000,
  }));
  const sig = createSign("RSA-SHA256").update(`${head}.${claim}`).sign(json.private_key);
  const res = await doFetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${claim}.${b64url(sig)}` }),
  });
  if (!res.ok) throw new Error(`Google sign-in failed (${res.status}). Check the service account key.`);
  return (await res.json()).access_token as string;
}

export async function getGoogleReport(env = process.env, doFetch: Fetcher = fetch): Promise<SearchReport> {
  const raw = env.UNCOIL_GSC_SERVICE_ACCOUNT_JSON;
  const site = env.UNCOIL_GSC_SITE;
  const missing = [!raw && "UNCOIL_GSC_SERVICE_ACCOUNT_JSON", !site && "UNCOIL_GSC_SITE"].filter(Boolean) as string[];
  if (missing.length) return { status: "not_configured", missing };
  try {
    const key = JSON.parse(raw!);
    const token = await googleToken(key, doFetch);
    const base = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site!)}`;
    const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
    // Search Console data runs about 2 days behind.
    const range = { startDate: iso(Date.now() - 30 * DAY), endDate: iso(Date.now() - 2 * DAY) };
    const query = async (dimensions: string[], rowLimit: number) => {
      const res = await doFetch(`${base}/searchAnalytics/query`, { method: "POST", headers, body: JSON.stringify({ ...range, dimensions, rowLimit }) });
      if (!res.ok) throw new Error(res.status === 403 ? "Google says this service account has no access to the site. Add its email in Search Console, Settings, Users and permissions." : `Google answered ${res.status}.`);
      return ((await res.json()).rows ?? []) as { keys: string[]; clicks: number; impressions: number; position: number }[];
    };
    const [dayRows, queryRows, pageRows] = await Promise.all([query(["date"], 60), query(["query"], 10), query(["page"], 10)]);
    const days = dayRows.map((r) => ({ day: r.keys[0], clicks: r.clicks, impressions: r.impressions })).sort((a, b) => a.day.localeCompare(b.day));
    const weighted = dayRows.reduce((a, r) => a + r.position * r.impressions, 0);
    const imp = dayRows.reduce((a, r) => a + r.impressions, 0);
    const toRows = (rows: typeof queryRows): SearchRow[] => rows.map((r) => ({ key: r.keys[0], clicks: r.clicks, impressions: r.impressions, position: r.position }));

    const health: { label: string; value: number; tone: "ok" | "warn" | "bad" }[] = [];
    const maps = await doFetch(`${base}/sitemaps`, { headers });
    if (maps.ok) {
      const list = ((await maps.json()).sitemap ?? []) as { errors?: string | number; warnings?: string | number; contents?: { submitted?: string | number; indexed?: string | number }[] }[];
      const sum = (f: (s: (typeof list)[number]) => number) => list.reduce((a, s) => a + f(s), 0);
      const errors = sum((s) => Number(s.errors ?? 0)), warnings = sum((s) => Number(s.warnings ?? 0));
      health.push({ label: "Sitemaps", value: list.length, tone: list.length ? "ok" : "warn" });
      health.push({ label: "Sitemap errors", value: errors, tone: errors ? "bad" : "ok" });
      health.push({ label: "Sitemap warnings", value: warnings, tone: warnings ? "warn" : "ok" });
      health.push({ label: "Pages sent", value: sum((s) => (s.contents ?? []).reduce((a, c) => a + Number(c.submitted ?? 0), 0)), tone: "ok" });
    }
    return { status: "ok", site: site!, totals: summarize(days, imp ? weighted / imp : null), days, queries: toRows(queryRows), pages: toRows(pageRows), health };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Google request failed." };
  }
}

/* ---------- Bing Webmaster ---------- */

/** Bing sends dates as "/Date(1700000000000)/" or "/Date(1700000000000-0800)/". */
export function parseBingDate(value: string): string | null {
  const m = /\/Date\((-?\d+)/.exec(value);
  return m ? iso(Number(m[1])) : null;
}

export async function getBingReport(env = process.env, doFetch: Fetcher = fetch): Promise<SearchReport> {
  const key = env.UNCOIL_BING_API_KEY;
  const site = env.UNCOIL_BING_SITE;
  const missing = [!key && "UNCOIL_BING_API_KEY", !site && "UNCOIL_BING_SITE"].filter(Boolean) as string[];
  if (missing.length) return { status: "not_configured", missing };
  try {
    const call = async <T,>(method: string): Promise<T[]> => {
      const url = `https://ssl.bing.com/webmaster/api.svc/json/${method}?apikey=${encodeURIComponent(key!)}&siteUrl=${encodeURIComponent(site!)}`;
      const res = await doFetch(url);
      if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? "Bing refused the API key. Generate a new one in Bing Webmaster, Settings, API access." : `Bing answered ${res.status}.`);
      return ((await res.json()).d ?? []) as T[];
    };
    type Traffic = { Date: string; Clicks: number; Impressions: number };
    type Q = { Query?: string; Clicks: number; Impressions: number; AvgClickPosition?: number; AvgImpressionPosition?: number };
    type Crawl = { Date: string; CrawledPages: number; InIndex: number; CrawlErrors: number; Code4xx: number; Code5xx: number; BlockedByRobotsTxt: number };
    const [traffic, queries, pages, crawl] = await Promise.all([
      call<Traffic>("GetRankAndTrafficStats"), call<Q & { Query: string }>("GetQueryStats"),
      call<Q & { Query: string }>("GetPageStats"), call<Crawl>("GetCrawlStats"),
    ]);
    const cutoff = iso(Date.now() - 30 * DAY);
    const days = traffic.flatMap((t) => { const day = parseBingDate(t.Date); return day && day >= cutoff ? [{ day, clicks: t.Clicks, impressions: t.Impressions }] : []; })
      .sort((a, b) => a.day.localeCompare(b.day));
    const toRows = (rows: (Q & { Query: string })[]): SearchRow[] =>
      rows.sort((a, b) => b.Clicks - a.Clicks || b.Impressions - a.Impressions).slice(0, 10)
        .map((r) => ({ key: r.Query, clicks: r.Clicks, impressions: r.Impressions, position: r.AvgImpressionPosition ?? r.AvgClickPosition ?? null }));
    const latest = [...crawl].sort((a, b) => (parseBingDate(b.Date) ?? "").localeCompare(parseBingDate(a.Date) ?? ""))[0];
    const health: { label: string; value: number; tone: "ok" | "warn" | "bad" }[] = latest ? [
      { label: "Pages in Bing index", value: latest.InIndex, tone: latest.InIndex ? "ok" : "warn" },
      { label: "Pages crawled", value: latest.CrawledPages, tone: "ok" },
      { label: "Crawl errors", value: latest.CrawlErrors, tone: latest.CrawlErrors ? "bad" : "ok" },
      { label: "404 and other 4xx", value: latest.Code4xx, tone: latest.Code4xx ? "warn" : "ok" },
      { label: "Server errors (5xx)", value: latest.Code5xx, tone: latest.Code5xx ? "bad" : "ok" },
      { label: "Blocked by robots.txt", value: latest.BlockedByRobotsTxt, tone: "ok" },
    ] : [];
    return { status: "ok", site: site!, totals: summarize(days, null), days, queries: toRows(queries), pages: toRows(pages), health };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Bing request failed." };
  }
}
