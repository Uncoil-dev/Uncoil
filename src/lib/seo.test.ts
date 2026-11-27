import assert from "node:assert/strict";
import test from "node:test";
import { breadcrumbJsonLd, fitDescription, fitTitle, fitTitleText, jsonLdString, kickerForPath } from "./seo.ts";

test("short titles keep the brand suffix", () => {
  assert.equal(fitTitle("Pricing"), "Pricing");
  assert.equal(fitTitleText("Pricing"), "Pricing | Uncoil");
});

test("titles that only fit without the suffix drop it", () => {
  assert.deepEqual(fitTitle("Laminar vs Uncoil: Trace Compression vs Full Observability"), { absolute: "Laminar vs Uncoil: Trace Compression vs Full Observability" });
});

test("long titles are cut at a natural break and never pass 60 characters", () => {
  const long = "AI Observability Metrics That Matter: Latency, Cost, Quality, and Reliability";
  const fitted = fitTitle(long) as { absolute: string };
  assert.equal(fitted.absolute, "AI Observability Metrics That Matter");
  const noBreak = "Enterprise adoption of governed autonomous assistants across large regulated organizations";
  assert.ok((fitTitle(noBreak) as { absolute: string }).absolute.length <= 60);
});

test("descriptions land between 110 and 160 characters", () => {
  const short = fitDescription("Install the Python SDK.");
  assert.ok(short.length >= 110 && short.length <= 160, short);
  const long = fitDescription("A ".repeat(120));
  assert.ok(long.length <= 160);
  const sentence = fitDescription("First sentence that explains the page in plain words and goes on for a while longer. Second sentence that keeps going and going past the limit for descriptions.");
  assert.ok(sentence.endsWith("."));
  assert.ok(sentence.length <= 160 && sentence.length >= 110);
});

test("breadcrumb positions start at 1 and item URLs are absolute", () => {
  const crumbs = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
  ]);
  assert.equal(crumbs["@type"], "BreadcrumbList");
  assert.deepEqual(crumbs.itemListElement, [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.uncoil.dev/" },
    { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.uncoil.dev/blog" },
  ]);
});

test("JSON-LD output cannot close the surrounding script tag", () => {
  const out = jsonLdString({ name: "</script><script>alert(1)</script>" });
  assert.ok(!out.includes("</script"), out);
  assert.ok(!out.includes("<"), out);
  assert.deepEqual(JSON.parse(out), { name: "</script><script>alert(1)</script>" });
});

test("share-card kicker follows the route prefix", () => {
  assert.equal(kickerForPath("/blog/agent-tracing"), "Blog");
  assert.equal(kickerForPath("/docs/quickstart"), "Documentation");
  assert.equal(kickerForPath("/product/trace-viewer"), "Product");
  assert.equal(kickerForPath("/use-cases/support"), "Use case");
  assert.equal(kickerForPath("/pricing"), "Pricing");
  assert.equal(kickerForPath("/"), "AI agent observability");
  assert.equal(kickerForPath("/security"), "AI agent observability");
});

test("how-we-work statements each link to a page that exists", async () => {
  const { existsSync } = await import("node:fs");
  const { sections, notDoing } = await import("./how-we-work.ts");
  const statements = [...sections.flatMap((s) => s.items), ...notDoing];
  assert.ok(statements.length >= 8);
  for (const item of statements) {
    assert.ok(item.text.length > 0 && item.proof.label.length > 0);
    if (!item.proof.href.startsWith("/")) {
      assert.match(item.proof.href, /^https:\/\/github\.com\/Uncoil-dev\//);
      continue;
    }
    const path = item.proof.href.split("#")[0].replace(/^\//, "");
    const onDisk = path.startsWith("docs/") || existsSync(`src/app/(frontend)/${path}/page.tsx`);
    assert.ok(onDisk, `no page for ${item.proof.href}`);
  }
});

test("security page has the anchors how-we-work links to", async () => {
  const { readFileSync } = await import("node:fs");
  const page = readFileSync("src/app/(frontend)/security/page.tsx", "utf8");
  assert.match(page, /id="data"/);
  assert.match(page, /id="deletion"/);
});

test("footer and pricing page link to how-we-work", async () => {
  const { readFileSync } = await import("node:fs");
  assert.match(readFileSync("src/components/marketing/landing/landing-footer.tsx", "utf8"), /"\/how-we-work"/);
  assert.match(readFileSync("src/components/marketing/pricing/pricing-page.tsx", "utf8"), /href="\/how-we-work"/);
});
