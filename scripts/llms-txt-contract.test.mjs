import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const LLMS_PATH = new URL("../public/llms.txt", import.meta.url);
const CANONICAL_ORIGIN = "https://www.uncoil.dev";

test("llms.txt is concise, canonical, and points to core public resources", async () => {
  const source = await readFile(LLMS_PATH, "utf8");
  const links = [...source.matchAll(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/g)].map((match) => match[1]);

  assert.match(source, /^# Uncoil\r?\n\r?\n> \S/m);
  assert.ok(source.length < 10_000, "llms.txt should remain a curated index, not a content dump");
  assert.ok(links.length > 0, "llms.txt should contain resource links");
  assert.equal(new Set(links).size, links.length, "llms.txt should not contain duplicate links");

  for (const link of links) {
    assert.ok(link.startsWith(`${CANONICAL_ORIGIN}/`), `non-canonical URL: ${link}`);
  }

  for (const path of ["/docs", "/blog", "/pricing", "/security", "/status"]) {
    assert.ok(links.includes(`${CANONICAL_ORIGIN}${path}`), `missing core resource: ${path}`);
  }
});
