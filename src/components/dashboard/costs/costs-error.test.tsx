import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CostsError } from "./costs-error";

describe("CostsError", () => {
  it("announces the failure and offers Try again", () => {
    const html = renderToStaticMarkup(createElement(CostsError, { message: "Could not load costs", onRetry: () => {} }));
    expect(html).toContain('role="alert"');
    expect(html).toContain("Could not load costs");
    expect(html).toMatch(/<button[^>]*type="button"[^>]*>Try again<\/button>/);
  });
});
