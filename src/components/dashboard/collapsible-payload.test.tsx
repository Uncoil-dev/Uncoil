import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CollapsiblePayload } from "./collapsible-payload";

describe("CollapsiblePayload", () => {
  it("renders small payloads as a plain block with no toggle", () => {
    const html = renderToStaticMarkup(<CollapsiblePayload text="hello" />);
    expect(html).toContain("hello");
    expect(html).not.toContain("Show all");
  });

  it("keeps the full text out of the page until expanded", () => {
    const tail = "TAIL_MARKER";
    const text = `${"a".repeat(30_000)}${tail}`;
    const html = renderToStaticMarkup(<CollapsiblePayload text={text} />);
    expect(html).not.toContain(tail);
    expect(html).toContain("Show all");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("Preview of 29.3 KB");
  });
});
