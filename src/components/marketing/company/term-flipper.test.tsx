import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TermFlipper } from "./term-flipper";

const terms = [
  { slug: "span", term: "Span", definition: "One timed step." },
  { slug: "trace", term: "Trace", definition: "A tree of spans." },
] as never;

describe("TermFlipper", () => {
  it("announces the current term, names the link and hides the icons from screen readers", () => {
    const html = renderToStaticMarkup(createElement(TermFlipper, { terms }));
    expect(html).toMatch(/<p[^>]*role="status"[^>]*>Span, 1 of 2<\/p>/);
    expect(html).toContain('Open this term<span class="sr-only">: Span</span>');
    expect(html.match(/<svg[^>]*aria-hidden="true"/g)).toHaveLength(3);
  });
});
