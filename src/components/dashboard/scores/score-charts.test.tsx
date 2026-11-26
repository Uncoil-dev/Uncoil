import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Histogram, SplitBar } from "./score-charts";

describe("score chart empty states", () => {
  it("explain that scores come from evaluators or feedback", () => {
    const histogram = renderToStaticMarkup(createElement(Histogram, { buckets: [], format: String }));
    const split = renderToStaticMarkup(createElement(SplitBar, { parts: [{ label: "Pass", value: 0, color: "#000" }] }));
    for (const html of [histogram, split]) {
      expect(html).toMatch(/evaluator/i);
      expect(html).toMatch(/feedback/i);
    }
  });
});
