import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const { OnboardingBackButton } = await import("./onboarding-back-button");

describe("OnboardingBackButton", () => {
  it("is a plain button, so it never submits a surrounding form", () => {
    const html = renderToStaticMarkup(createElement("form", null, createElement(OnboardingBackButton, { currentStep: "install" })));
    expect(html).toMatch(/<button type="button"/);
  });

  it("renders nothing on the first step", () => {
    expect(renderToStaticMarkup(createElement(OnboardingBackButton, { currentStep: "project" }))).toBe("");
  });
});
