import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const LLMS_PATH = new URL("../public/llms.txt", import.meta.url);
const DOCS_DIR = new URL("../content/docs/", import.meta.url);
const CANONICAL_ORIGIN = "https://www.uncoil.dev";

test("llms.txt is concise, canonical, and points to core public resources", async () => {
  const source = await readFile(LLMS_PATH, "utf8");
  const links = [...source.matchAll(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/g)].map((match) => match[1]);

  assert.match(source, /^# Uncoil\r?\n\r?\n> \S/m);
  // One link per public docs and integration page, mostly full canonical URLs, fits in about 12 KB.
  assert.ok(source.length < 12_000, "llms.txt should remain a curated index, not a content dump");
  assert.ok(links.length > 0, "llms.txt should contain resource links");
  assert.equal(new Set(links).size, links.length, "llms.txt should not contain duplicate links");

  for (const link of links) {
    assert.ok(link.startsWith(`${CANONICAL_ORIGIN}/`), `non-canonical URL: ${link}`);
  }

  for (const path of ["/docs", "/blog", "/pricing", "/security", "/status"]) {
    assert.ok(links.includes(`${CANONICAL_ORIGIN}${path}`), `missing core resource: ${path}`);
  }
});

test("llms.txt docs links point at existing docs pages", async () => {
  const source = await readFile(LLMS_PATH, "utf8");
  const files = (await readdir(DOCS_DIR)).filter((file) => file.endsWith(".mdoc"));
  const slugs = new Set();
  for (const file of files) {
    const frontmatter = (await readFile(new URL(file, DOCS_DIR), "utf8")).split(/^---\s*$/m)[1] ?? "";
    const slug = frontmatter.match(/^slug:\s*["']?([^"'\r\n]+?)["']?\s*$/m)?.[1];
    if (slug) slugs.add(slug);
  }
  assert.ok(slugs.size > 0, "content/docs has no docs; run git submodule update --init");

  const docLinks = [...source.matchAll(/\]\(https:\/\/www\.uncoil\.dev\/docs\/([^)#?]+)/g)].map((match) => match[1]);
  assert.ok(docLinks.length > 0, "llms.txt should link individual docs pages");
  for (const slug of docLinks) assert.ok(slugs.has(slug), `llms.txt links a missing doc: /docs/${slug}`);
});

test("llms.txt lists the start-here setup docs", async () => {
  const source = await readFile(LLMS_PATH, "utf8");
  for (const slug of ["quickstart", "cli", "data-regions"]) {
    assert.ok(source.includes(`(${CANONICAL_ORIGIN}/docs/${slug})`), `llms.txt should list /docs/${slug}`);
  }
});

test("llms.txt lists the observe, evaluate, plans and plugin docs", async () => {
  const source = await readFile(LLMS_PATH, "utf8");
  const slugs = [
    "alerts", "costs", "tool-calls", "tags-and-metadata", "redaction", "export",
    "datasets", "prompts", "playground", "release-gates", "annotation-queues", "resilience-testing",
    "plans-and-limits", "switching", "health-report", "coding-agent-plugins",
  ];
  for (const slug of slugs) {
    assert.ok(source.includes(`(${CANONICAL_ORIGIN}/docs/${slug})`), `llms.txt should list /docs/${slug}`);
  }
});

test("llms.txt says every docs page has a Markdown copy", async () => {
  const source = await readFile(LLMS_PATH, "utf8");
  assert.ok(source.includes(`${CANONICAL_ORIGIN}/docs/<slug>.md`), "llms.txt should describe the /docs/<slug>.md Markdown copies");
});
