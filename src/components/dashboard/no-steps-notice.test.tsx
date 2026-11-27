import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NoStepsNotice } from "./no-steps-notice";

describe("NoStepsNotice", () => {
  it("says steps may take a moment and points to the connection check", () => {
    const html = renderToStaticMarkup(createElement(NoStepsNotice));
    expect(html).toContain("No steps recorded for this run");
    expect(html).not.toMatch(/span/i);
    expect(html).toMatch(/few seconds/);
    expect(html).toMatch(/connection check/);
  });
});
