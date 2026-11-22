type Entry = readonly [string, string];
type FaqCopy = { faqs: readonly Entry[]; foundingFaq: Entry };

/** Single source for the pricing questions shown on the page and in its FAQ structured data. */
export function pricingFaqEntries(copy: FaqCopy, founding: boolean) {
  return founding ? [...copy.faqs, copy.foundingFaq] : [...copy.faqs];
}

export function pricingFaqItems(copy: FaqCopy, founding: boolean) {
  return pricingFaqEntries(copy, founding).map(([q, a]) => ({ q, a }));
}
