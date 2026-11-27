import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckoutButton, buildPlanCards, requestCheckoutUrl } from "./billing-plan";
import { formatPrice, monthlyPrice, planById } from "@/lib/pricing-plans";

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

describe("buildPlanCards", () => {
  it("lists every shared Pro feature and the annual price on the Pro card", () => {
    const pro = planById("pro");
    const card = buildPlanCards("annual").find((c) => c.id === "pro");
    expect(card?.features).toEqual(expect.arrayContaining([...pro.features]));
    expect(card?.price).toBe(formatPrice(monthlyPrice(pro, "annual")));
    expect(card?.price).toBe("$15");
  });

  it("keeps Enterprise as a custom-priced card", () => {
    expect(buildPlanCards("monthly").map((c) => c.id)).toEqual(["free", "pro", "team", "enterprise"]);
    expect(buildPlanCards("monthly").find((c) => c.id === "team")?.price).toBe("$39");
  });
});
