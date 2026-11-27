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

  const render = (groups: ErrorGroup[], extra: Record<string, unknown> = {}) => renderToStaticMarkup(createElement(ErrorGroupsPanel, {
    data: { total: groups.length, groups }, open: true, loading: false, clock, onToggle: () => {}, onSelect: () => {}, ...extra,
  }));

  it("hides resolved groups until Show resolved is on, and offers Resolve only on open ones", () => {
    const groups = [{ ...group("open", "2026-11-20 01:00:00"), resolved: false }, { ...group("done", "2026-11-20 01:00:00"), resolved: true }];
    const hidden = render(groups, { onResolve: () => {}, onToggleShowResolved: () => {}, showResolved: false });
    expect(hidden).toContain("limit open");
    expect(hidden).not.toContain("limit done");
    expect(hidden).toContain("Show resolved");
    const shown = render(groups, { onResolve: () => {}, onToggleShowResolved: () => {}, showResolved: true });
    expect(shown).toContain("limit done");
    expect(rowFor(shown, "done")).not.toContain(">Resolve<");
    expect(rowFor(shown, "open")).toContain(">Resolve<");
  });

  it("tags groups that reopened as Came back", () => {
    const html = render([{ ...group("back", "2026-11-20 01:00:00"), cameBack: true }, group("plain", "2026-11-20 01:00:00")]);
    expect(rowFor(html, "back")).toContain(">Came back<");
    expect(rowFor(html, "plain")).not.toContain(">Came back<");
  });
});
