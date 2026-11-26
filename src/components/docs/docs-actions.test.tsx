import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DocsActions } from "./docs-actions";

describe("DocsActions", () => {
  it("hides the icons from screen readers and announces the copy result", () => {
    const html = renderToStaticMarkup(createElement(DocsActions, { markdown: "# Page", installUrl: "/docs/mcp" }));
    expect(html.match(/<svg/g)).toHaveLength(3);
    expect(html.match(/<svg[^>]*aria-hidden="true"/g)).toHaveLength(3);
    expect(html).toMatch(/<span aria-live="polite">Copy Markdown<\/span>/);
  });
});
