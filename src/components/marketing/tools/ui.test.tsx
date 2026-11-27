import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CopyButton } from "./ui";

describe("CopyButton", () => {
  it("keeps its label in a polite live region so copy results are announced", () => {
    const html = renderToStaticMarkup(createElement(CopyButton, { text: "x", label: "Copy JSON" }));
    expect(html).toMatch(/<span aria-live="polite">Copy JSON<\/span>/);
  });
});
