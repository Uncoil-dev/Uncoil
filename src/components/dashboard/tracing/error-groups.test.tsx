import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ErrorGroupsPanel, type ErrorGroup } from "./error-groups";

const clock = Date.parse("2026-11-26T12:00:00Z");
const group = (id: string, firstSeen: string): ErrorGroup => ({
  id, tool: "search", errorType: "RateLimitError", message: `limit ${id}`, sample: "", count: 3, traces: 2, firstSeen, lastSeen: "2026-11-26 11:00:00",
});

function rowFor(html: string, id: string) {
  return html.split("<li").find((item) => item.includes(`limit ${id}`)) ?? "";
}

describe("ErrorGroupsPanel", () => {
  it("tags groups first seen in the last 24 hours as New", () => {
    const html = renderToStaticMarkup(createElement(ErrorGroupsPanel, {
      data: { total: 2, groups: [group("fresh", "2026-11-26 01:00:00"), group("old", "2026-11-25 11:00:00")] },
      open: true, loading: false, clock, onToggle: () => {}, onSelect: () => {},
    }));
    expect(rowFor(html, "fresh")).toContain(">New<");
    expect(rowFor(html, "old")).not.toContain(">New<");
  });
});
