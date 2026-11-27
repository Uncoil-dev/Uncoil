import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ErrorGroupsPanel, groupCopyText, type ErrorGroup } from "./error-groups";

const group = (over: Partial<ErrorGroup>): ErrorGroup => ({
  id: "g1", tool: "search", errorType: "RateLimitError", message: "Rate limit hit for <id>", sample: "", count: 3, traces: 2,
  firstSeen: "2026-11-20 10:00:00", lastSeen: "2026-11-26 11:00:00", ...over,
});

describe("error group copy", () => {
  it("copies the full sample error, falling back to the grouped message", () => {
    const sample = `RateLimitError: Rate limit hit for org_123 ${"x".repeat(500)}`;
    expect(groupCopyText(group({ sample }))).toBe(sample);
    expect(groupCopyText(group({ sample: "" }))).toBe("Rate limit hit for <id>");
    expect(groupCopyText(group({ sample: "", message: "" }))).toBe("");
  });

  it("offers Copy message only for groups that have error text", () => {
    const html = renderToStaticMarkup(createElement(ErrorGroupsPanel, {
      data: { total: 2, groups: [group({ id: "a", sample: "boom" }), group({ id: "b", sample: "", message: "" })] },
      open: true, loading: false, clock: Date.parse("2026-11-26T12:00:00Z"), onToggle: () => {}, onSelect: () => {},
    }));
    expect(html.match(/>Copy message</g)).toHaveLength(1);
  });
});
