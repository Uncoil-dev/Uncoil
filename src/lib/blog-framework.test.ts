import assert from "node:assert/strict";
import test from "node:test";

import { validateBlogFramework } from "./blog-framework.ts";
import { getAllPosts } from "./markdoc-blog.ts";

test("the published Uncoil corpus follows the mandatory editorial framework", () => {
  assert.deepEqual(validateBlogFramework(getAllPosts()), []);
});

test("the framework reports missing shared article elements", () => {
  const issues = validateBlogFramework([
    {
      slug: "draft",
      draft: true,
      heroImage: undefined,
      body: "",
      headings: [],
    },
    {
      slug: "incomplete",
      draft: false,
      heroImage: undefined,
      body: "## One\n## Two\n## Three\n## Four\n## Five\n## Six",
      headings: [
        { level: 2, text: "One", id: "one" },
        { level: 2, text: "Two", id: "two" },
        { level: 2, text: "Three", id: "three" },
        { level: 2, text: "Four", id: "four" },
        { level: 2, text: "Five", id: "five" },
        { level: 2, text: "Six", id: "six" },
      ],
    },
  ]);

  assert.deepEqual(issues.map((issue) => issue.code), ["too-short", "missing-hero", "missing-visual", "missing-code", "missing-note", "missing-emphasis", "missing-faq", "missing-interaction", "missing-action"]);
});
