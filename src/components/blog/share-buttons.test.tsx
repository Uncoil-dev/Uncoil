import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ShareLinks } from "./share-buttons";

describe("ShareLinks", () => {
  it("names each link for screen readers and says it opens a new tab, keeping the visible text", () => {
    const html = renderToStaticMarkup(createElement(ShareLinks, { title: "A post", url: "https://www.uncoil.dev/blog/a-post" }));
    expect(html).toContain('aria-label="Share on X (opens in a new tab)"');
    expect(html).toContain('aria-label="Share on LinkedIn (opens in a new tab)"');
    expect(html).toMatch(/>X<\/a>/);
    expect(html).toMatch(/>LinkedIn<\/a>/);
  });
});
