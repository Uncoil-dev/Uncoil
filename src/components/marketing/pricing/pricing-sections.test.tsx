// @vitest-environment node
// next/image expects a browser document under the default edge-runtime environment; server rendering here runs in plain Node.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getCopy } from "@/lib/i18n";
import { PricingClose, PricingFaq } from "./pricing-sections";

const t = getCopy("en").pricing;

describe("pricing page server sections", () => {
  it("renders every FAQ question, adding the founding question only when the offer runs", () => {
    const html = renderToStaticMarkup(createElement(PricingFaq, { founding: false }));
    expect(html).toContain('id="faq-title"');
    for (const [question] of t.faqs) expect(html).toContain(question);
    expect(html).not.toContain(t.foundingFaq[0]);
    expect(renderToStaticMarkup(createElement(PricingFaq, { founding: true }))).toContain(t.foundingFaq[0]);
  });

  it("renders the closing call to action with sign-up and contact links", () => {
    const html = renderToStaticMarkup(createElement(PricingClose));
    expect(html).toContain(t.closeTitle);
    expect(html).toMatch(/href="[^"]*\/sign-up"/);
    expect(html).toContain('href="/contact"');
  });
});
