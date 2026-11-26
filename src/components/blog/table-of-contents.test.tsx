import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TableOfContents } from "./table-of-contents";

const body = [
  { _type: "block", style: "h2", children: [{ text: "Setup" }] },
  { _type: "block", style: "h3", children: [{ text: "Install" }] },
];

describe("TableOfContents", () => {
  it("names its nav landmark so it stands apart from the site menus", () => {
    const html = renderToStaticMarkup(createElement(TableOfContents, { body }));
    expect(html).toMatch(/^<nav aria-label="On this page">/);
  });
});
