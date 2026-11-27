import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LoadError } from "./load-error";

describe("LoadError", () => {
  it("announces the message and offers Try again", () => {
    const html = renderToStaticMarkup(createElement(LoadError, { message: "Request failed (502)", onRetry: () => {} }));
    expect(html).toContain('role="alert"');
    expect(html).toContain("Request failed (502)");
    expect(html).toMatch(/<button[^>]*type="button"[^>]*>Try again<\/button>/);
  });
});
