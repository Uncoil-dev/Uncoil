import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FirstRunPanel } from "./first-run-panel";

type Run = Parameters<typeof FirstRunPanel>[0]["run"];

const render = (run: Run) =>
  renderToStaticMarkup(createElement(FirstRunPanel, { projectName: "demo", projectId: "p1", keyDisplay: "uncoil_sk_live_...abcd", elapsed: 42, run, probeAccepted: false }));

const baseRun = { runId: "run_1", spanCount: 4, totalCostUsd: 0.01, primaryModel: "gpt-4o" };

describe("FirstRunPanel", () => {
  it("points to the failure when the first run failed, with the trace button first", () => {
    const html = render({ ...baseRun, status: "failed" });
    expect(html).toContain("Your agent failed. See where.");
    expect(html).not.toContain("First run received.");
    expect(html.indexOf("Open your trace")).toBeLessThan(html.indexOf("Go to dashboard"));
  });

  it("keeps the received copy for a run that did not fail", () => {
    const html = render({ ...baseRun, status: "completed" });
    expect(html).toContain("First run received.");
    expect(html).not.toContain("Your agent failed.");
  });

  it("suggests a cost alert for the same project, marked as Pro with a 7-day trial", () => {
    const html = render({ ...baseRun, status: "completed" });
    expect(html).toContain('href="/dashboard/p1/alerts"');
    expect(html).toContain("Pro");
    expect(html).toContain("7-day free trial");
  });

  it("does not suggest alerts while still waiting", () => {
    expect(render(null)).not.toContain("/alerts");
  });
});
