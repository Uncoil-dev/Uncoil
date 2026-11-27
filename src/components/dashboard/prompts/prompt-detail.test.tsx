import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PromptDetail, type PromptRow } from "./prompt-detail";

const prompt = {
  _id: "p1", name: "support-reply", description: "", versions: [
    { _id: "v1", version: 1, labels: ["latest", "development"], commitMessage: "First draft", createdAt: 0, content: "Hi", variables: [] },
  ],
} as unknown as PromptRow;

describe("PromptDetail release pipeline", () => {
  it("names each empty environment and says how to fill it", () => {
    const noop = async () => {};
    const html = renderToStaticMarkup(createElement(PromptDetail, {
      projectId: "proj", prompt, tab: "text", onTab: () => {}, usage: [], links: [],
      onNewVersion: () => {}, onClose: () => {}, onSetLabels: noop, onSaveDetails: noop,
    }));
    expect(html).toContain("No version in staging yet. Point a version here to use it.");
    expect(html).toContain("No version in production yet.");
    expect(html).not.toContain("Nothing here yet");
  });
});
