import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Remote, StatsData, TracesData } from "./widget-data";
import { WidgetBody } from "./widget-views";

const stats: Remote<StatsData> = { state: "ready", data: { dailyCosts: [], modelCosts: [], toolCosts: [], userCosts: [] } };
const traces: Remote<TracesData> = { state: "loading" };
const render = (id: string) => renderToStaticMarkup(createElement(WidgetBody, { id, traces, stats, scores: undefined }));

describe("WidgetBody empty rankings", () => {
  it("says how model and tool calls get into the ranking widgets", () => {
    expect(render("cost_by_model")).toContain("No model calls in this period. They show up when your agent uses a wrapped client or records a model step.");
    expect(render("cost_by_tool")).toContain("No tool calls in this period. They show up when your agent records tool steps.");
  });
});
