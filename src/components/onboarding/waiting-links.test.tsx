import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WaitingLinks } from "./waiting-links";

const render = (elapsed: number, projectId = "p1") => renderToStaticMarkup(createElement(WaitingLinks, { elapsed, projectId }));

describe("WaitingLinks", () => {
  it("opens the sample trace in a new tab so the listening page stays open", () => {
    const link = render(30).match(/<a [^>]*href="\/demo"[^>]*>/)?.[0] ?? "";
    expect(link).toContain('target="_blank"');
    expect(link).toContain('rel="noopener noreferrer"');
  });

  it("shows the sample trace and support links only after a wait", () => {
    expect(render(0)).not.toContain('href="/demo"');
    expect(render(0)).not.toContain("mailto:");
    expect(render(120)).toContain("mailto:support@uncoil.dev");
  });

  it("skips to the project's tracing page, or the dashboard without a project", () => {
    expect(render(0)).toContain('href="/dashboard/p1/tracing"');
    expect(render(0, "")).toContain('href="/dashboard"');
  });
});
