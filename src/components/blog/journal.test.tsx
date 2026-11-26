// @vitest-environment node
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TraceArchive } from "./journal";

const posts = [{ slug: "first", title: "First post", excerpt: "e", date: "2026-01-01", label: "Jan 1", minutes: 4, categories: ["tracing"] }];

describe("TraceArchive", () => {
  it("names the article search box for screen readers", () => {
    const html = renderToStaticMarkup(createElement(TraceArchive, { posts, categories: ["tracing"] }));
    expect(html).toMatch(/<input[^>]*aria-label="Search articles"/);
  });
});
