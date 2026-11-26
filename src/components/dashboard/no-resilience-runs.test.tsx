import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NoResilienceRuns } from "./no-resilience-runs";

describe("NoResilienceRuns", () => {
  it("tells a new user to start a test from the form above", () => {
    const html = renderToStaticMarkup(createElement(NoResilienceRuns));
    expect(html).toContain("No runs yet.");
    expect(html).toMatch(/Start a test above/);
  });
});
