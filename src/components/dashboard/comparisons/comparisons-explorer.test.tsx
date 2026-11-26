import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ComparisonEmptyRow } from "./comparisons-explorer";

describe("ComparisonEmptyRow", () => {
  it("tells first-time users why the table is empty and what to do", () => {
    const html = renderToStaticMarkup(createElement("table", null, createElement("tbody", null, createElement(ComparisonEmptyRow, { loading: false }))));
    expect(html).toContain("No runs in this time range yet. Send a trace or pick a longer range.");
  });

  it("keeps the loading text while data is on its way", () => {
    const html = renderToStaticMarkup(createElement("table", null, createElement("tbody", null, createElement(ComparisonEmptyRow, { loading: true }))));
    expect(html).toContain("Loading…");
  });
});
