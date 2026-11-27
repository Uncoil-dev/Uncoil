import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckoutButton, requestCheckoutUrl } from "./billing-plan";

describe("CheckoutButton", () => {
  it("labels the button with the plan name", () => {
    const html = renderToStaticMarkup(createElement(CheckoutButton, { projectId: "p1", plan: "team", interval: "monthly" }));
    expect(html).toContain("Choose Team");
    expect(html).not.toContain("Choose team");
  });
});

describe("requestCheckoutUrl", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns the checkout url on success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ url: "https://checkout.example/s" })));
    await expect(requestCheckoutUrl("p1", "pro", "monthly")).resolves.toBe("https://checkout.example/s");
  });

  it("throws the server message when checkout fails so it can be shown inline", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "Billing is not configured" }, { status: 503 })));
    await expect(requestCheckoutUrl("p1", "pro", "monthly")).rejects.toThrow("Billing is not configured");
  });
});
