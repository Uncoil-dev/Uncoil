import assert from "node:assert/strict";
import test from "node:test";

import { validateBlogInternalLinks } from "./blog-internal-links.ts";
import { getAllPosts } from "./markdoc-blog.ts";

type LinkPost = { slug: string; draft: boolean; body: string };

function post(slug: string, body: string, draft = false): LinkPost {
  return { slug, draft, body };
}

test("accepts two descriptive links to distinct published posts", () => {
  assert.deepEqual(
    validateBlogInternalLinks([
      post(
        "first",
        "Compare [LLM tracing](/blog/tracing) with [production evaluations](/blog/evals).",
      ),
      post("tracing", "See [production evaluations](/blog/evals) and [the first guide](/blog/first)."),
      post("evals", "Use [LLM tracing](/blog/tracing) with [the first guide](/blog/first)."),
    ]),
    [],
  );
});

test("reports fewer than two distinct internal targets", () => {
  const issues = validateBlogInternalLinks([
    post("first", "Use [LLM tracing](/blog/tracing) twice: [tracing guide](/blog/tracing)."),
    post("tracing", "Use [the first guide](/blog/first) and [evaluation practice](/blog/evals)."),
    post("evals", "Use [LLM tracing](/blog/tracing) and [the first guide](/blog/first)."),
  ]);

  assert.equal(issues.filter((issue) => issue.slug === "first" && issue.code === "too-few").length, 1);
});

test("reports self, missing, and draft targets", () => {
  const issues = validateBlogInternalLinks([
    post("first", "Read [this article](/blog/first), [missing guide](/blog/missing), and [draft guide](/blog/draft)."),
    post("second", "Use [the first guide](/blog/first) and [published target](/blog/third)."),
    post("third", "Use [the first guide](/blog/first) and [published target](/blog/second)."),
    post("draft", "Private.", true),
  ]);

  assert.deepEqual(
    issues.filter((issue) => issue.slug === "first").map((issue) => issue.code),
    ["self-link", "missing-target", "draft-target", "too-few"],
  );
});

test("reports generic and bare anchors", () => {
  const issues = validateBlogInternalLinks([
    post("first", "Use [click here](/blog/second), [read more](/blog/third), [Related guide](/blog/fourth), and [/blog/fifth](/blog/fifth)."),
    post("second", "Use [first guide](/blog/first) and [third guide](/blog/third)."),
    post("third", "Use [first guide](/blog/first) and [second guide](/blog/second)."),
    post("fourth", "Use [first guide](/blog/first) and [second guide](/blog/second)."),
    post("fifth", "Use [first guide](/blog/first) and [second guide](/blog/second)."),
  ]);

  assert.deepEqual(
    issues.filter((issue) => issue.slug === "first").map((issue) => issue.code),
    ["generic-anchor", "generic-anchor", "generic-anchor", "bare-anchor", "too-few"],
  );
});

test("the published Uncoil corpus satisfies the internal-link contract", () => {
  assert.deepEqual(validateBlogInternalLinks(getAllPosts()), []);
});
