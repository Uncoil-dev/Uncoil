import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckoutButton, buildPlanCards, requestCheckoutUrl } from "./billing-plan";

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
  const price = (id: string, interval: "monthly" | "annual") => buildPlanCards(interval).find((c) => c.id === id)?.price;

  it.each([
    ["free", "monthly", "$0"],
    ["free", "annual", "$0"],
    ["pro", "monthly", "$19"],
    ["pro", "annual", "$15"],
    ["team", "monthly", "$39"],
    ["team", "annual", "$31"],
  ] as const)("%s %s price is %s", (id, interval, expected) => {
    expect(price(id, interval)).toBe(expected);
  });

  it("shows no per-month note on Free and lists Prompt versions on Pro", () => {
    const cards = buildPlanCards("monthly");
    expect(cards.find((c) => c.id === "free")?.note).toBeUndefined();
    expect(cards.find((c) => c.id === "pro")?.features).toContain("Prompt versions");
  });

  it("keeps the span limit casing and Enterprise card", () => {
    const cards = buildPlanCards("monthly");
    expect(cards.find((c) => c.id === "team")?.features[0]).toBe("2M spans / month");
    expect(cards.map((c) => c.id)).toEqual(["free", "pro", "team", "enterprise"]);
  });
});
