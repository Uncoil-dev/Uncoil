import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BlogImage } from "./blog-image-lightbox";

describe("BlogImage", () => {
  it("names an openable image as a button that enlarges it in a dialog", () => {
    const html = renderToStaticMarkup(createElement(BlogImage, { src: "/media/trace.png", alt: "A trace tree" }));
    expect(html).toContain('role="button"');
    expect(html).toContain('aria-label="Enlarge image: A trace tree"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('tabindex="0"');
  });

  it("leaves an image that cannot open the viewer as a plain image", () => {
    const html = renderToStaticMarkup(createElement(BlogImage, { src: "/media/trace.png" }));
    expect(html).toMatch(/^<img /);
    expect(html).not.toMatch(/role=|tabindex=|aria-haspopup=|aria-label=/);
  });
});
