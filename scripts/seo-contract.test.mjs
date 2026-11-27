import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";

const app = "src/app/(frontend)";
const read = (path) => readFileSync(path, "utf8");

// Utility trees must carry noindex through a layout, not only robots.txt.
for (const dir of ["onboarding", "dashboard", "(auth)", "cloud", "forgot-password", "reset-password", "accept-invitation", "auth", "pricing/checkout", "admin"]) {
  test(`${dir} is noindex`, () => {
    const layout = `${app}/${dir}/layout.tsx`;
    assert.ok(existsSync(layout), `${layout} missing`);
    assert.match(read(layout), /noIndex/);
  });
}

// Thin utility pages that are reachable but should not rank.
test("refer page is noindex", () => assert.match(read(`${app}/refer/page.tsx`), /\.\.\.noIndex\b/));

// Public pages must use the shared helper so canonical, Open Graph and X card values stay complete.
for (const file of ["changelog/page.tsx", "roadmap/page.tsx", "status/page.tsx", "privacy/page.tsx", "terms/page.tsx", "cookie-policy/page.tsx", "security/page.tsx", "contact/page.tsx", "integrations/page.tsx", "glossary/page.tsx", "blog/page.tsx", "docs/page.tsx", "pricing/layout.tsx", "product/[feature]/page.tsx", "use-cases/[slug]/page.tsx", "docs/[...slug]/page.tsx"]) {
  test(`${file} ships full social metadata`, () => assert.match(read(`${app}/${file}`), /pageMetadata\(/));
}

test("root layout does not force a homepage og:url on every page", () => {
  assert.doesNotMatch(read(`${app}/layout.tsx`), /url: "\/",\s*\n\s*locale/);
});

test("sitemap lists every public legal page", () => {
  const sitemap = read(`${app}/sitemap.ts`);
  for (const path of ["/privacy", "/terms", "/cookie-policy"]) assert.ok(sitemap.includes(path), path);
});

test("robots keeps API and private admin routes out of the crawl", () => {
  const robots = read("src/app/robots.ts");
  for (const path of ["/api/", "/admin/"]) assert.ok(robots.includes(`"${path}"`), path);
});

// A robots.txt block hides a page's noindex tag, so Google keeps the bare URL as
// "Indexed, though blocked by robots.txt". Noindex pages must stay crawlable.
test("robots does not block pages that carry noindex", () => {
  const robots = read("src/app/robots.ts");
  for (const path of ["/sign-in", "/sign-up", "/dashboard", "/onboarding", "/forgot-password", "/reset-password", "/accept-invitation", "/alternative", "/library", "/tracing-preview", "/uncoil-preview", "/operations-preview", "/health-report/r/", "/cloud/", "/dash"]) {
    assert.ok(!robots.includes(`"${path}"`) && !robots.includes(`"${path}/"`), `${path} is noindex, so robots.txt must not block it`);
  }
});

test("sitemap does not list URLs that redirect", () => {
  const sitemap = read(`${app}/sitemap.ts`);
  // /no and /de redirect to the English pages (see next.config.ts), so they must not be listed.
  assert.doesNotMatch(sitemap, /\["no", "de"\]/);
  assert.doesNotMatch(sitemap, /\/\$\{locale\}/);
});

test("copy-paste examples never point at the bare domain, which redirects", () => {
  for (const file of ["content/docs/api.mdoc", "content/docs/integrations.mdoc", "content/docs/agent-setup.mdoc", "src/components/marketing/company/code-tabs.tsx", "src/lib/seo-pages.ts", "README.md"]) {
    assert.doesNotMatch(read(file), /https?:\/\/uncoil\.dev/, `${file} uses https://uncoil.dev, which redirects; use www.uncoil.dev or eu.cloud.uncoil.dev`);
  }
});

// A stock OTLP HTTP exporter reads only the standard OTEL_* variables and uses the
// signal-specific traces endpoint exactly as given, so the snippet must name the full route.
function otlpEnv(source) {
  const block = source.match(/OTEL_EXPORTER_OTLP_[\s\S]*?(?=`)/)?.[0] ?? "";
  return Object.fromEntries(block.split("\n").map((line) => line.replace(/^export /, "").split(/=(.*)/s).slice(0, 2)).filter(([key]) => key));
}

for (const file of ["src/components/marketing/company/code-tabs.tsx", "src/lib/seo-pages.ts"]) {
  test(`${file} OpenTelemetry setup works with a stock OTLP HTTP exporter`, () => {
    const source = read(file);
    assert.doesNotMatch(source, /UNCOIL_OTLP/);
    const env = otlpEnv(source);
    assert.equal(new URL(env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT).pathname, "/api/otel");
    assert.equal(env.OTEL_EXPORTER_OTLP_PROTOCOL, "http/json");
    const [name, value] = decodeURIComponent(env.OTEL_EXPORTER_OTLP_HEADERS).split(/=(.*)/s);
    assert.equal(name, "Authorization");
    assert.match(value, /^Bearer uncoil_sk_live_/);
  });
}

test("old domain redirects keep the method for non-GET requests", () => {
  const proxy = read("src/proxy.ts");
  assert.match(proxy, /308/);
  assert.match(proxy, /cloud\\\.tracify\\\.tech/);
});
