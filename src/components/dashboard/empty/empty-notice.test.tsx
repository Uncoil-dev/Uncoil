import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EmptyNotice } from "./empty-notice";

describe("EmptyNotice", () => {
  it("shows art, the message and a link as the next step", () => {
    const html = renderToStaticMarkup(createElement(EmptyNotice, { title: "No spend yet", description: "Send a trace.", action: "Open quickstart", href: "/dashboard/p1/quickstart" }));
    expect(html).toContain("<svg");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('href="/dashboard/p1/quickstart"');
    expect(html).toContain("Open quickstart");
  });

  it("renders a button when the next step is an action, and none when there is no step", () => {
    const withButton = renderToStaticMarkup(createElement(EmptyNotice, { title: "t", description: "d", action: "Clear filters", onClick: () => {} }));
    expect(withButton).toContain("<button");
    expect(renderToStaticMarkup(createElement(EmptyNotice, { title: "t", description: "d" }))).not.toMatch(/<a |<button/);
  });
});
