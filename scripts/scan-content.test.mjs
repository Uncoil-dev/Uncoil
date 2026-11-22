import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scan, extractLinks, findMissingAlt, isInternal, issueFor, normalizeHref, parseFrontmatter, selectNew } from "./scan-content.mjs";

test("parseFrontmatter reads keys and body", () => {
  const r = parseFrontmatter('---\ntitle: "Hi"\nexcerpt: Short\n---\nBody');
  assert.equal(r.data.title, "Hi");
  assert.equal(r.data.excerpt, "Short");
  assert.equal(r.body, "Body");
  assert.deepEqual(parseFrontmatter("no front").data, {});
});

test("extractLinks skips images and keeps targets", () => {
  assert.deepEqual(extractLinks("[a](/docs/x) ![i](/media/a.png) [b](https://e.com 'T')"), ["/docs/x", "https://e.com"]);
});

test("findMissingAlt flags empty alt", () => {
  assert.deepEqual(findMissingAlt("![](/media/a.png) ![ok](/media/b.png)"), ["/media/a.png"]);
});

test("internal link helpers", () => {
  assert.equal(isInternal("/blog/x"), true);
  assert.equal(isInternal("//cdn.x"), false);
  assert.equal(normalizeHref("/blog/x/?a=1#h"), "/blog/x");
});

test("selectNew dedupes by title and caps at five", () => {
  const findings = Array.from({ length: 8 }, (_, i) => ({ key: `meta:f${i}`, problem: "p", file: `f${i}` }));
  const open = [issueFor(findings[0]).title];
  const out = selectNew(findings, open);
  assert.equal(out.length, 5);
  assert.ok(!out.some((i) => i.title === open[0]));
  assert.match(out[0].body, /\*\*Task\*\*[\s\S]*\*\*Files owned\*\*[\s\S]*\*\*Done looks like\*\*/);
});

test("scan ignores feed URLs in llms.txt but flags unknown pages", () => {
  const root = mkdtempSync(join(tmpdir(), "scan-"));
  mkdirSync(join(root, "content/blog"), { recursive: true });
  mkdirSync(join(root, "public"));
  writeFileSync(join(root, "content/blog/a.mdoc"), "---\nslug: a\nexcerpt: x\n---\nBody\n");
  writeFileSync(join(root, "public/llms.txt"), "- [Feed](https://www.uncoil.dev/blog/rss.xml)\n- [A](https://www.uncoil.dev/blog/a)\n- [B](https://www.uncoil.dev/blog/missing)\n");
  const found = scan(root).filter((f) => f.file === "public/llms.txt");
  assert.equal(found.length, 1);
  assert.match(found[0].problem, /\/blog\/missing/);
});
