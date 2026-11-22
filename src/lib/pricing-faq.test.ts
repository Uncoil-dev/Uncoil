import { describe, expect, it } from "vitest";
import { getCopy } from "@/lib/i18n";
import { faqJsonLd } from "@/lib/seo";
import { pricingFaqEntries, pricingFaqItems } from "@/lib/pricing-faq";

describe("pricing FAQ structured data", () => {
  const copy = getCopy("en").pricing;

  for (const founding of [false, true]) {
    it(`matches the visible questions and answers (founding=${founding})`, () => {
      const visible = pricingFaqEntries(copy, founding);
      const ld = faqJsonLd(pricingFaqItems(copy, founding));
      expect(ld["@type"]).toBe("FAQPage");
      expect(ld.mainEntity.map((q) => [q.name, q.acceptedAnswer.text])).toEqual(visible);
      expect(visible.length).toBeGreaterThan(0);
    });
  }

  it("adds the founding question only when founding", () => {
    expect(pricingFaqEntries(copy, true)).toHaveLength(pricingFaqEntries(copy, false).length + 1);
  });
});
