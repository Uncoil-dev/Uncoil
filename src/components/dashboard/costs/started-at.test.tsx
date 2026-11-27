import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { formatTime } from "../tracing/format";
import { StartedAt } from "./started-at";

describe("StartedAt", () => {
  it("shows the relative time and the viewer's local date and time on hover", () => {
    const value = "2026-11-26 09:00:00";
    const html = renderToStaticMarkup(createElement(StartedAt, { value, clock: Date.parse("2026-11-26T12:00:00Z") }));
    expect(html).toContain('<time dateTime="2026-11-26T09:00:00.000Z"');
    expect(html).toContain(`title="${formatTime(value)}"`);
    expect(html).not.toContain(`title="${value}"`);
    expect(html).toContain("3h ago");
  });
});
