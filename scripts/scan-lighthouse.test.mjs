import assert from "node:assert/strict";
import test from "node:test";
import { issueFor, pagePath, selectNew, summarize } from "./scan-lighthouse.mjs";

const lhr = (url, perf, seo) => ({
  finalUrl: url,
  categories: {
    performance: { score: perf, auditRefs: [{ id: "lcp", weight: 25 }, { id: "ok", weight: 10 }] },
    seo: { score: seo, auditRefs: [{ id: "meta", weight: 1 }] },
  },
  audits: { lcp: { id: "lcp", title: "Largest Contentful Paint", score: 0.4 }, ok: { id: "ok", title: "Fine", score: 1 }, meta: { id: "meta", title: "Meta", score: 1 } },
});

test("pagePath normalises URLs", () => {
  assert.equal(pagePath("https://www.uncoil.dev/"), "/");
  assert.equal(pagePath("https://www.uncoil.dev/pricing/"), "/pricing");
});

test("summarize reports failing audits only for low categories", () => {
  const s = summarize(lhr("https://www.uncoil.dev/pricing", 0.7, 0.95));
  assert.equal(s.belowThreshold, true);
  assert.deepEqual(s.failing.map((a) => a.id), ["lcp"]);
  assert.equal(summarize(lhr("https://www.uncoil.dev/", 0.95, 1)).belowThreshold, false);
});

test("selectNew opens one issue per failing page and dedupes", () => {
  const a = summarize(lhr("https://www.uncoil.dev/", 0.5, 1));
  const b = summarize(lhr("https://www.uncoil.dev/docs", 0.5, 1));
  const c = summarize(lhr("https://www.uncoil.dev/pricing", 1, 1));
  const out = selectNew([a, b, c], [issueFor(a).title]);
  assert.deepEqual(out.map((i) => i.title), ["[lighthouse-scan] /docs"]);
  assert.match(out[0].body, /\*\*Task\*\*[\s\S]*\*\*Files owned\*\*[\s\S]*\*\*Done looks like\*\*/);
});
