import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { blogMarkdocConfig, createBlogRepository, extractBlogFaqItems } from "./markdoc-blog.ts";

function withContentDirectory(files: Record<string, string>, run: (directory: string) => void) {
  const directory = mkdtempSync(path.join(tmpdir(), "uncoil-markdoc-"));
  try {
    for (const [filename, source] of Object.entries(files)) {
      writeFileSync(path.join(directory, filename), source, "utf8");
    }
    run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

const firstPost = `---
title: First post
slug: first-post
excerpt: The first excerpt.
publishedAt: 2026-01-02T12:00:00.000Z
author: Uncoil Team
draft: false
categories: [Engineering]
tags: [agents]
relatedPosts: [second-post]
heroImage:
  src: /media/first.jpg
  alt: First image
seo:
  metaTitle: First SEO title
---
# First heading
## Section heading

First paragraph.
`;

const secondPost = `---
title: Second post
slug: second-post
excerpt: The second excerpt.
publishedAt: 2026-02-03T12:00:00.000Z
author: Uncoil Team
draft: false
categories: [Observability]
tags: []
relatedPosts: []
---
# Second heading
`;

const draftPost = `---
title: Draft post
slug: draft-post
excerpt: This must stay private.
publishedAt: 2026-03-04T12:00:00.000Z
author: Uncoil Team
draft: true
categories: [Engineering]
tags: []
relatedPosts: []
---
# Draft heading
`;

test("published posts exclude drafts and sort newest first", () => {
  withContentDirectory(
    { "first.mdoc": firstPost, "second.mdoc": secondPost, "draft.mdoc": draftPost },
    (directory) => {
      const repository = createBlogRepository(directory);
      assert.deepEqual(
        repository.getPublishedPosts().map((post) => post.slug),
        ["second-post", "first-post"],
      );
      assert.equal(repository.getPublishedPost("draft-post"), null);
    },
  );
});

test("category filtering and options use frontmatter categories", () => {
  withContentDirectory({ "first.mdoc": firstPost, "second.mdoc": secondPost }, (directory) => {
    const repository = createBlogRepository(directory);
    assert.deepEqual(
      repository.getPublishedPosts("Engineering").map((post) => post.slug),
      ["first-post"],
    );
    assert.deepEqual(repository.getCategoryOptions(), [
      { label: "Engineering", value: "Engineering" },
      { label: "Observability", value: "Observability" },
    ]);
  });
});

test("category filtering accepts multiple categories with OR matching", () => {
  withContentDirectory({ "first.mdoc": firstPost, "second.mdoc": secondPost }, (directory) => {
    const repository = createBlogRepository(directory);
    assert.deepEqual(
      repository.getPublishedPosts(["Engineering", "Observability"]).map((post) => post.slug).sort(),
      ["first-post", "second-post"],
    );
    assert.deepEqual(repository.getPublishedPosts([]).map((post) => post.slug).sort(), [
      "first-post",
      "second-post",
    ]);
  });
});

test("a post exposes validated metadata and a transformed Markdoc tree", () => {
  withContentDirectory({ "first.mdoc": firstPost }, (directory) => {
    const post = createBlogRepository(directory).getPublishedPost("first-post");
    assert.ok(post);
    assert.equal(post.heroImage?.src, "/media/first.jpg");
    assert.equal(post.seo.metaTitle, "First SEO title");
    assert.deepEqual(post.headings, [{ level: 2, text: "Section heading", id: "section-heading" }]);
    assert.equal(post.content.name, "article");
    assert.equal((post.content.children[0] as { name: string }).name, "h1");
    assert.equal(post.plainText, "First heading Section heading First paragraph.");
  });
});

test("interactive blog tags declare their renderer targets", () => {
  assert.equal(blogMarkdocConfig.tags["trace-scenario"].render, "trace-scenario");
  assert.equal(blogMarkdocConfig.tags["faq-item"].render, "faq-item");
  assert.equal(blogMarkdocConfig.tags.highlight.render, "highlight");
  assert.equal(blogMarkdocConfig.tags["editorial-panel"].render, "editorial-panel");
  assert.equal(blogMarkdocConfig.tags["context-budget-calculator"].render, "context-budget-calculator");
  assert.equal(blogMarkdocConfig.tags["rollout-strategy-picker"].render, "rollout-strategy-picker");
  assert.equal(blogMarkdocConfig.tags["failure-mode-explorer"].render, "failure-mode-explorer");
  assert.equal(blogMarkdocConfig.tags["topology-picker"].render, "topology-picker");
});

test("decorative title punctuation does not change heading anchors", () => {
  withContentDirectory(
    { "slash.mdoc": firstPost.replace("## Section heading", "## Section: Evidence / action") },
    (directory) => {
      const post = createBlogRepository(directory).getPublishedPost("first-post");
      assert.equal(post?.headings[0]?.id, "section-evidence-action");
    },
  );
});

test("extractBlogFaqItems reads question and answer pairs for FAQPage schema", () => {
  const body = [
    "# Heading",
    "",
    '{% faq-item question="What is a span?" answer="A single recorded operation inside a trace." /%}',
    '{% faq-item question="What is a trace?" answer="An end to end record of one agent run." /%}',
  ].join("\n");
  const items = extractBlogFaqItems(body);
  assert.deepEqual(items, [
    { question: "What is a span?", answer: "A single recorded operation inside a trace." },
    { question: "What is a trace?", answer: "An end to end record of one agent run." },
  ]);
});

test("extractBlogFaqItems returns an empty list when a post has no FAQ tags", () => {
  assert.deepEqual(extractBlogFaqItems("# Heading\n\nJust a paragraph."), []);
});

test("invalid frontmatter fails with the source filename", () => {
  withContentDirectory({ "broken.mdoc": "---\ntitle: Missing fields\n---\nBody" }, (directory) => {
    assert.throws(
      () => createBlogRepository(directory).getAllPosts(),
      /broken\.mdoc: frontmatter field “slug” must be a non-empty string/,
    );
  });
});
