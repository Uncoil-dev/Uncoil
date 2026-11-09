import assert from "node:assert/strict";
import test from "node:test";
import { getBingReport, getGoogleReport, parseBingDate } from "./search-integrations.ts";

test("not configured reports which keys are missing", async () => {
  assert.deepEqual(await getGoogleReport({} as NodeJS.ProcessEnv), { status: "not_configured", missing: ["UNCOIL_GSC_SERVICE_ACCOUNT_JSON", "UNCOIL_GSC_SITE"] });
  assert.deepEqual(await getBingReport({ UNCOIL_BING_SITE: "x" } as unknown as NodeJS.ProcessEnv), { status: "not_configured", missing: ["UNCOIL_BING_API_KEY"] });
});

test("Bing dates parse", () => {
  assert.equal(parseBingDate("/Date(1700000000000)/"), "2023-11-14");
  assert.equal(parseBingDate("/Date(1700000000000-0800)/"), "2023-11-14");
  assert.equal(parseBingDate("nope"), null);
});

test("Bing report is built from the four calls", async () => {
  const today = Date.now();
  const fake = (async (url: string) => {
    const m = /json\/(\w+)\?/.exec(String(url))![1];
    const d = `/Date(${today})/`;
    const data: Record<string, unknown[]> = {
      GetRankAndTrafficStats: [{ Date: d, Clicks: 3, Impressions: 40 }],
      GetQueryStats: [{ Query: "a", Clicks: 1, Impressions: 5, AvgImpressionPosition: 4 }, { Query: "b", Clicks: 2, Impressions: 9 }],
      GetPageStats: [],
      GetCrawlStats: [{ Date: d, CrawledPages: 10, InIndex: 8, CrawlErrors: 1, Code4xx: 0, Code5xx: 0, BlockedByRobotsTxt: 0 }],
    };
    return new Response(JSON.stringify({ d: data[m] }));
  }) as typeof fetch;
  const r = await getBingReport({ UNCOIL_BING_API_KEY: "k", UNCOIL_BING_SITE: "https://www.uncoil.dev/" } as unknown as NodeJS.ProcessEnv, fake);
  assert.equal(r.status, "ok");
  if (r.status !== "ok") return;
  assert.equal(r.totals.clicks, 3);
  assert.equal(r.queries[0].key, "b");
  assert.equal(r.health.find((h) => h.label === "Crawl errors")?.tone, "bad");
});

test("a bad Bing key gives a plain message", async () => {
  const r = await getBingReport({ UNCOIL_BING_API_KEY: "k", UNCOIL_BING_SITE: "s" } as unknown as NodeJS.ProcessEnv, (async () => new Response("", { status: 401 })) as typeof fetch);
  assert.equal(r.status, "error");
});
