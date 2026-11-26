import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Pagination } from "./pagination";

// Text a screen reader reads for each link: aria-hidden content and tags removed.
function linkNames(html: string) {
  return [...html.matchAll(/<a [^>]*>([\s\S]*?)<\/a>/g)].map((m) =>
    m[1].replace(/<(\w+)[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/\1>/g, "").replace(/<[^>]+>/g, "").trim()
  );
}

describe("Pagination", () => {
  it("names each link with just its words, keeping the arrows visual only", () => {
    const html = renderToStaticMarkup(createElement(Pagination, { hasOlder: true, hasNewer: true }));
    expect(linkNames(html)).toEqual(["Older posts", "Newer posts"]);
    expect(html).toContain("←");
    expect(html).toContain("→");
  });
});
