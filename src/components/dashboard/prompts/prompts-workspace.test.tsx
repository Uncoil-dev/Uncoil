import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PromptsEmptyNote } from "./prompts-workspace";

describe("PromptsEmptyNote", () => {
  it("says what saved prompts are for and how to add the first one", () => {
    const html = renderToStaticMarkup(createElement(PromptsEmptyNote));
    expect(html).toContain("Saved prompts let you version and reuse your prompts. Click New prompt to add your first one.");
  });
});
