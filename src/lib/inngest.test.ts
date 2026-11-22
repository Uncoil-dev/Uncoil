import { describe, expect, it } from "vitest";
import { Inngest } from "inngest";
import { inngest } from "./inngest";
import type { OnboardingReminderEvent, SpanIngestedEvent } from "./inngest";

describe("inngest client", () => {
  it("exports an Inngest instance with the app id", () => {
    expect(inngest).toBeInstanceOf(Inngest);
    expect(inngest.id).toBe("uncoil");
  });

  it("exposes functions for creating Inngest functions", () => {
    expect(typeof inngest.createFunction).toBe("function");
    expect(typeof inngest.send).toBe("function");
  });

  it("keeps event names stable for the typed event map", () => {
    const span: SpanIngestedEvent["name"] = "uncoil/span.received";
    const reminder: OnboardingReminderEvent["name"] = "uncoil/onboarding.reminder";
    expect(span).toBe("uncoil/span.received");
    expect(reminder).toBe("uncoil/onboarding.reminder");
  });
});
