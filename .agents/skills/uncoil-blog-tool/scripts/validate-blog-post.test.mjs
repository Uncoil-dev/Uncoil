import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { validateBlogPost } from "./validate-blog-post.mjs";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIRECTORY, "../../../..");

test("the approved AI evaluation metrics article passes the strict quality blueprint", () => {
  const result = validateBlogPost("ai-evaluation-metrics", { repositoryRoot: REPOSITORY_ROOT });
  assert.deepEqual(result.issues, []);
  assert.ok(result.metrics.words >= 3000);
  assert.equal(result.metrics.faqItems, 5);
  assert.ok(result.metrics.lowerHalfImages >= 1);
  assert.ok(result.metrics.lowerHalfHighlights >= 2);
});

test("the strict gate rejects a short, repetitive, visually incomplete post", () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "uncoil-blog-quality-"));

  try {
    const blogDirectory = path.join(fixtureRoot, "content", "blog");
    const mediaDirectory = path.join(fixtureRoot, "public", "media");
    fs.mkdirSync(blogDirectory, { recursive: true });
    fs.mkdirSync(mediaDirectory, { recursive: true });
    fs.writeFileSync(path.join(mediaDirectory, "bad-post.png"), "fixture");

    const badPost = `---
title: Bad post
slug: bad-post
excerpt: This fixture should fail.
publishedAt: 2026-08-26T12:00:00.000Z
author: Uncoil Team
draft: true
heroImage:
  src: /media/bad-post.png
  alt: image
---

{% trace-scenario title="One" prompt="Two" outcome="Three" /%}

## Introduction

Short generic copy.

![image](/media/bad-post.png)

## Recommended next reads

This should not be here.

## Frequently asked questions

{% faq-item question="One?" answer="One." /%}
{% faq-item question="Two?" answer="Two." /%}
{% faq-item question="Three?" answer="Three." /%}
`;
    const neighboringPost = `---
title: Neighbor
slug: neighbor
excerpt: Shares the hero on purpose.
publishedAt: 2026-08-26T12:00:00.000Z
author: Uncoil Team
draft: true
heroImage:
  src: /media/bad-post.png
  alt: Another article using the same fixture hero image
---

Fixture.
`;

    const badPostPath = path.join(blogDirectory, "bad-post.mdoc");
    fs.writeFileSync(badPostPath, badPost);
    fs.writeFileSync(path.join(blogDirectory, "neighbor.mdoc"), neighboringPost);

    const result = validateBlogPost(badPostPath, { repositoryRoot: fixtureRoot });
    const issueCodes = new Set(result.issues.map((issue) => issue.code));

    assert.ok(issueCodes.has("word-count"));
    assert.ok(issueCodes.has("hero-not-unique"));
    assert.ok(issueCodes.has("body-images"));
    assert.ok(issueCodes.has("body-image-not-unique"));
    assert.ok(issueCodes.has("hero-reused-in-body"));
    assert.ok(issueCodes.has("faq-items"));
    assert.ok(issueCodes.has("recommended-reads"));
    assert.ok(issueCodes.has("action-ending"));
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
